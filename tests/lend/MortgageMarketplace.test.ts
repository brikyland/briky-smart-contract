import { expect } from 'chai';
import { ethers, upgrades } from 'hardhat';
import {
    Admin,
    CommissionToken,
    Currency,
    EstateToken,
    FeeReceiver,
    IERC165Upgradeable__factory,
    IERC2981Upgradeable__factory,
    MockEstateToken,
    MockEstateForger__factory,
    MortgageToken,
    MortgageMarketplace,
    MortgageToken__factory,
    MockMortgageToken,
    MockEstateToken__factory,
    MockMortgageToken__factory,
    CommissionToken__factory,
} from '@typechain-types';
import { callTransaction, getSignatures, prepareERC20, prepareNativeToken, randomWallet, resetERC20, resetNativeToken, testReentrancy } from '@utils/blockchain';
import { Constant } from '@tests/test.constant';
import { deployAdmin } from '@utils/deployments/common/admin';
import { deployFeeReceiver } from '@utils/deployments/common/feeReceiver';
import { deployCurrency } from '@utils/deployments/common/currency';
import { deployMockEstateToken } from '@utils/deployments/mocks/mockEstateToken';
import { deployCommissionToken } from '@utils/deployments/land/commissionToken';
import { loadFixture, time } from "@nomicfoundation/hardhat-network-helpers";

import { MockContract, smock } from '@defi-wonderland/smock';

import {
    callAdmin_DeclareZones,
    callAdmin_AuthorizeManagers,
    callAdmin_AuthorizeModerators,
    callAdmin_UpdateCurrencyRegistries,
} from '@utils/callWithSignatures/admin';
import { BigNumber } from 'ethers';
import { randomInt } from 'crypto';
import { getInterfaceID, randomBigNumber } from '@utils/utils';
import { OrderedMap } from '@utils/utils';
import { deployMortgageToken } from '@utils/deployments/lend/mortgageToken';
import { deployMortgageMarketplace } from '@utils/deployments/lend/mortgageMarketplace';
import { callMortgageMarketplace_Pause } from '@utils/callWithSignatures/mortgageMarketplace';
import { Contract } from 'ethers';
import { CommissionMarketplaceOfferState, LoanState, MortgageMarketplaceOfferState } from '@utils/enums';
import { callMortgageToken_UpdateRoyaltyRate } from '@utils/callWithSignatures/mortgageToken';
import { getBalance } from '@utils/blockchain';
import { deployFailReceiver } from '@utils/deployments/mocks/failReceiver';
import { deployReentrancy } from '@utils/deployments/mocks/mockReentrancy/reentrancy';
import { Initialization as LandInitialization } from '@tests/land/test.initialization';
import { Initialization as LendInitialization } from '@tests/lend/test.initialization';

interface MortgageMarketplaceFixture {
    admin: Admin;
    feeReceiver: FeeReceiver;
    currency: Currency;
    estateToken: MockContract<MockEstateToken>;
    commissionToken: MockContract<CommissionToken>;
    mortgageToken: MockContract<MockMortgageToken>;
    mortgageMarketplace: MortgageMarketplace;

    deployer: any;
    admins: any[];
    borrower1: any;
    borrower2: any;
    seller1: any;
    seller2: any;
    buyer1: any;
    buyer2: any;
    manager: any;
    moderator: any;
    commissionReceiver: any;
    mockCurrencyExclusiveRate: BigNumber;
}

async function testReentrancy_MortgageMarketplace(
    mortgageMarketplace: MortgageMarketplace,
    reentrancyContract: Contract,
    assertion: any,
) {
    let data = [
        mortgageMarketplace.interface.encodeFunctionData("buy", [0]),
        mortgageMarketplace.interface.encodeFunctionData("safeBuy", [0, 0]),
        mortgageMarketplace.interface.encodeFunctionData("cancel", [0]),
    ];

    await testReentrancy(
        reentrancyContract,
        mortgageMarketplace,
        data,
        assertion,
    );
}

describe('15. MortgageMarketplace', async () => {
    async function mortgageMarketplaceFixture(): Promise<MortgageMarketplaceFixture> {
        const accounts = await ethers.getSigners();
        const deployer = accounts[0];
        const admins = [];
        for (let i = 1; i <= Constant.ADMIN_NUMBER; ++i) admins.push(accounts[i]);
        const borrower1 = accounts[Constant.ADMIN_NUMBER + 1];
        const borrower2 = accounts[Constant.ADMIN_NUMBER + 2];
        const seller1 = accounts[Constant.ADMIN_NUMBER + 3];
        const seller2 = accounts[Constant.ADMIN_NUMBER + 4];
        const buyer1 = accounts[Constant.ADMIN_NUMBER + 5];
        const buyer2 = accounts[Constant.ADMIN_NUMBER + 6];
        const manager = accounts[Constant.ADMIN_NUMBER + 7];
        const moderator = accounts[Constant.ADMIN_NUMBER + 8];
        const commissionReceiver = accounts[Constant.ADMIN_NUMBER + 9];

        const adminAddresses: string[] = admins.map(signer => signer.address);
        const admin = await deployAdmin(
            deployer.address,
            adminAddresses[0],
            adminAddresses[1],
            adminAddresses[2],
            adminAddresses[3],
            adminAddresses[4],
        ) as Admin;

        const feeReceiver = await deployFeeReceiver(
            deployer.address,
            admin.address
        ) as FeeReceiver;

        const currency = await deployCurrency(
            deployer.address,
            'MockCurrency',
            'MCK'
        ) as Currency;
        const mockCurrencyExclusiveRate = ethers.utils.parseEther("0.3");
        await callTransaction(currency.setExclusiveDiscount(mockCurrencyExclusiveRate, Constant.COMMON_RATE_DECIMALS));

        const SmockEstateTokenFactory = await smock.mock<MockEstateToken__factory>("MockEstateToken");
        const estateToken = await SmockEstateTokenFactory.deploy();
        await callTransaction(estateToken.initialize(
            admin.address,
            feeReceiver.address,
            LandInitialization.ESTATE_TOKEN_BaseURI,
            LandInitialization.ESTATE_TOKEN_RoyaltyRate,
        ));

        const SmockCommissionTokenFactory = await smock.mock<CommissionToken__factory>("CommissionToken");
        const commissionToken = await SmockCommissionTokenFactory.deploy();
        await callTransaction(commissionToken.initialize(
            admin.address,
            estateToken.address,
            feeReceiver.address,
            LandInitialization.COMMISSION_TOKEN_Name,
            LandInitialization.COMMISSION_TOKEN_Symbol,
            LandInitialization.COMMISSION_TOKEN_BaseURI,
            LandInitialization.COMMISSION_TOKEN_CommissionRate,
            LandInitialization.COMMISSION_TOKEN_RoyaltyRate,
        ));

        const SmockMortgageTokenFactory = await smock.mock<MockMortgageToken__factory>('MockMortgageToken');
        const mortgageToken = await SmockMortgageTokenFactory.deploy();
        await callTransaction(mortgageToken.initialize(
            admin.address,
            estateToken.address,
            commissionToken.address,
            feeReceiver.address,
            LendInitialization.MORTGAGE_TOKEN_Name,
            LendInitialization.MORTGAGE_TOKEN_Symbol,
            LendInitialization.MORTGAGE_TOKEN_BaseURI,
            LendInitialization.MORTGAGE_TOKEN_FeeRate,
            LendInitialization.MORTGAGE_TOKEN_RoyaltyRate,
        ));

        const mortgageMarketplace = await deployMortgageMarketplace(
            deployer.address,
            admin.address,
            mortgageToken.address,
            commissionToken.address,
        ) as MortgageMarketplace;

        return {
            admin,
            feeReceiver,
            currency,
            estateToken,
            commissionToken,
            mortgageToken,
            mortgageMarketplace,
            deployer,
            admins,
            borrower1,
            borrower2,
            seller1,
            seller2,
            buyer1,
            buyer2,
            manager,
            moderator,
            commissionReceiver,
            mockCurrencyExclusiveRate,
        };
    };

    async function beforeMortgageMarketplaceTest({
        listSampleCurrencies = false,
        listSampleMortgageToken = false,
        listSampleOffers = false,
        fundERC20ForBuyers = false,
        pause = false,
    } = {}): Promise<MortgageMarketplaceFixture> {
        const fixture = await loadFixture(mortgageMarketplaceFixture);
        const { admin, admins, currency, estateToken, mortgageToken, mortgageMarketplace, borrower1, borrower2, seller1, seller2, buyer1, buyer2, manager, moderator, commissionReceiver } = fixture;

        let currentTimestamp = await time.latest();

        await callAdmin_DeclareZones(
            admin,
            admins,
            [ethers.utils.formatBytes32String("TestZone")],
            true,
            await admin.nonce(),
        );
        await callAdmin_AuthorizeManagers(
            admin,
            admins,
            [manager.address],
            true,
            await admin.nonce(),
        )
        await callAdmin_AuthorizeModerators(
            admin,
            admins,
            [moderator.address],
            true,
            await admin.nonce(),
        )

        if (listSampleCurrencies) {
            await callAdmin_UpdateCurrencyRegistries(
                admin,
                admins,
                [ethers.constants.AddressZero, currency.address],
                [true, true],
                [false, true],
                await admin.nonce()
            );
        }

        if (listSampleMortgageToken) {
            await callTransaction(mortgageToken.addLoan(
                1,
                150_000,
                10e5,
                11e5,
                ethers.constants.AddressZero,
                currentTimestamp + 1000,
                LoanState.Supplied,
                borrower1.address,
                seller1.address,
            ));
            await callTransaction(mortgageToken.addLoan(
                2,
                200,
                100000,
                110000,
                ethers.constants.AddressZero,
                currentTimestamp + 1100,
                LoanState.Supplied,
                borrower2.address,
                seller2.address,
            ));

            await callTransaction(mortgageToken.mint(seller1.address, 1));
            await callTransaction(mortgageToken.mint(seller2.address, 2));
        }

        if (listSampleOffers) {
            await callTransaction(mortgageMarketplace.connect(seller1).list(1, 200000, ethers.constants.AddressZero));
            await callTransaction(mortgageMarketplace.connect(seller2).list(2, 500000, currency.address));

            await callTransaction(mortgageToken.connect(seller1).setApprovalForAll(mortgageMarketplace.address, true));
            await callTransaction(mortgageToken.connect(seller2).setApprovalForAll(mortgageMarketplace.address, true));
        }

        if (fundERC20ForBuyers) {
            await prepareERC20(currency, [buyer1, buyer2], [mortgageMarketplace], ethers.BigNumber.from(1e9));
        }

        if (pause) {
            await callMortgageMarketplace_Pause(
                mortgageMarketplace,
                admins,
                await admin.nonce()
            );
        }

        return {
            ...fixture,
        }
    }

    describe('15.1. initialize(address, address, address, address)', async () => {
        it('15.1.1. Deploy successfully', async () => {
            const { mortgageMarketplace, admin, commissionToken, mortgageToken } = await beforeMortgageMarketplaceTest();

            expect(await mortgageMarketplace.offerNumber()).to.equal(0);

            expect(await mortgageMarketplace.admin()).to.equal(admin.address);
            expect(await mortgageMarketplace.commissionToken()).to.equal(commissionToken.address);
            expect(await mortgageMarketplace.mortgageToken()).to.equal(mortgageToken.address);
        });
    });

    // TODO: Andy
    describe('15.2. pause(bytes[])', async () => {

    });

    // TODO: Andy
    describe('15.3. unpause(bytes[])', async () => {

    });

    describe('15.4. getOffer(uint256)', async () => {
        it('15.4.1. return successfully', async () => {
            const fixture = await beforeMortgageMarketplaceTest({
                listSampleCurrencies: true,
                listSampleMortgageToken: true,
                listSampleOffers: true,
            });
            const { mortgageMarketplace } = fixture;

            expect(await mortgageMarketplace.getOffer(1)).to.not.be.reverted;
            expect(await mortgageMarketplace.getOffer(2)).to.not.be.reverted;
        });

        it('15.4.2. revert with invalid offer id', async () => {
            const fixture = await beforeMortgageMarketplaceTest({
                listSampleCurrencies: true,
                listSampleMortgageToken: true,
                listSampleOffers: true,
            });
            const { mortgageMarketplace } = fixture;

            await expect(mortgageMarketplace.getOffer(0))
                .to.be.revertedWithCustomError(mortgageMarketplace, "InvalidOfferId");
            await expect(mortgageMarketplace.getOffer(3))
                .to.be.revertedWithCustomError(mortgageMarketplace, "InvalidOfferId");
        });
    });
    
    describe('15.5. list(uint256, uint256, address)', async () => {
        it('15.5.1. list token successfully', async () => {
            const { mortgageMarketplace, mortgageToken, currency, seller1, seller2 } = await beforeMortgageMarketplaceTest({
                listSampleCurrencies: true,
                listSampleMortgageToken: true,
            });
            let tx = await mortgageMarketplace.connect(seller1).list(1, 200000, ethers.constants.AddressZero);
            await tx.wait();

            expect(tx).to
                .emit(mortgageMarketplace, 'NewOffer')
                .withArgs(1, 1, seller1.address, 200000, ethers.constants.AddressZero);

            expect(await mortgageMarketplace.offerNumber()).to.equal(1);

            let offer = await mortgageMarketplace.getOffer(1);
            expect(offer.tokenId).to.equal(1);
            expect(offer.price).to.equal(200000);
            expect(offer.currency).to.equal(ethers.constants.AddressZero);
            expect(offer.state).to.equal(MortgageMarketplaceOfferState.Selling);
            expect(offer.seller).to.equal(seller1.address);

            tx = await mortgageMarketplace.connect(seller2).list(2, 500000, currency.address);
            await tx.wait();

            expect(tx).to
                .emit(mortgageMarketplace, 'NewOffer')
                .withArgs(2, 2, seller2.address, 500000, currency.address);

            expect(await mortgageMarketplace.offerNumber()).to.equal(2);

            offer = await mortgageMarketplace.getOffer(2);
            expect(offer.tokenId).to.equal(2);
            expect(offer.price).to.equal(500000);
            expect(offer.currency).to.equal(currency.address);
            expect(offer.state).to.equal(MortgageMarketplaceOfferState.Selling);
            expect(offer.seller).to.equal(seller2.address);
        });

        it('15.5.2. list token unsuccessfully when paused', async () => {
            const fixture = await beforeMortgageMarketplaceTest({
                listSampleCurrencies: true,
                listSampleMortgageToken: true,
                pause: true,
            });
            const { mortgageMarketplace, seller1 } = fixture;

            await expect(mortgageMarketplace.connect(seller1).list(1, 200000, ethers.constants.AddressZero))
                .to.be.revertedWith('Pausable: paused');
        });

        it('15.5.3. list token unsuccessfully with invalid token id', async () => {
            const fixture = await beforeMortgageMarketplaceTest({
                listSampleCurrencies: true,
                listSampleMortgageToken: true,
            });
            const { mortgageMarketplace, seller1 } = fixture;

            await expect(mortgageMarketplace.connect(seller1).list(0, 200000, ethers.constants.AddressZero))
                .to.be.revertedWith('ERC721: invalid token ID');

            await expect(mortgageMarketplace.connect(seller1).list(3, 200000, ethers.constants.AddressZero))
                .to.be.revertedWith('ERC721: invalid token ID');
        });

        it('15.5.4. list token unsuccessfully when not token owner', async () => {
            const fixture = await beforeMortgageMarketplaceTest({
                listSampleCurrencies: true,
                listSampleMortgageToken: true,
            });
            const { mortgageMarketplace, seller2 } = fixture;

            await expect(mortgageMarketplace.connect(seller2).list(1, 200000, ethers.constants.AddressZero))
                .to.be.revertedWithCustomError(mortgageMarketplace, 'InvalidTokenId');
        });

        it('15.5.5. list token unsuccessfully with zero unit price', async () => {
            const fixture = await beforeMortgageMarketplaceTest({
                listSampleCurrencies: true,
                listSampleMortgageToken: true,
            });
            const { mortgageMarketplace, seller1 } = fixture;

            await expect(mortgageMarketplace.connect(seller1).list(1, 0, ethers.constants.AddressZero))
                .to.be.revertedWithCustomError(mortgageMarketplace, 'InvalidPrice');
        });

        it('15.5.6. list token unsuccessfully with invalid currency', async () => {
            const fixture = await beforeMortgageMarketplaceTest({
                listSampleMortgageToken: true,
            });
            const { mortgageMarketplace, seller1 } = fixture;

            await expect(mortgageMarketplace.connect(seller1).list(1, 200000, ethers.constants.AddressZero))
                .to.be.revertedWithCustomError(mortgageMarketplace, 'InvalidCurrency');
        });
    });

    describe('15.6. buy(uint256)', async () => {
        async function testBuyOffer(
            fixture: MortgageMarketplaceFixture,
            mockCurrencyExclusiveRate: BigNumber,
            mortgageTokenRoyaltyRate: BigNumber,
            commissionRate: BigNumber,
            isERC20: boolean,
            isExclusive: boolean,
            price: BigNumber,
            hasCommissionReceiver: boolean,
        ) {
            const { deployer, estateToken, commissionToken, mortgageToken, mortgageMarketplace, borrower1, seller1, buyer1, feeReceiver, admins, admin, commissionReceiver } = fixture;

            await callMortgageToken_UpdateRoyaltyRate(mortgageToken, admins, mortgageTokenRoyaltyRate, await admin.nonce());
            commissionToken.setVariable("commissionRate", commissionRate);
            
            const currentEstateId = (await estateToken.estateNumber()).add(1);
            const currentTokenId = (await mortgageToken.loanNumber()).add(1);
            const currentOfferId = (await mortgageMarketplace.offerNumber()).add(1);

            let newCurrency: Currency | undefined;
            let newCurrencyAddress: string;
            if (isERC20) {
                newCurrency = await deployCurrency(
                    deployer.address,
                    `NewMockCurrency_${currentOfferId}`,
                    `NMC_${currentOfferId}`
                ) as Currency;
                newCurrencyAddress = newCurrency.address;

                await callTransaction(newCurrency.setExclusiveDiscount(mockCurrencyExclusiveRate, Constant.COMMON_RATE_DECIMALS));
            } else {
                newCurrencyAddress = ethers.constants.AddressZero;
            }

            const commissionReceiverAddress = hasCommissionReceiver ? commissionReceiver.address : ethers.constants.AddressZero;

            await callAdmin_UpdateCurrencyRegistries(
                admin,
                admins,
                [newCurrencyAddress],
                [true],
                [isExclusive],
                await admin.nonce(),
            );

            let currentTimestamp = await time.latest();

            const borrower = borrower1;
            const seller = seller1;
            const buyer = buyer1;

            if (hasCommissionReceiver) {
                await callTransaction(estateToken.call(commissionToken.address, commissionToken.interface.encodeFunctionData('mint', [commissionReceiverAddress, currentEstateId])));
                await estateToken.setVariable("estateNumber", currentEstateId);
            }

            await callTransaction(mortgageToken.addLoan(
                currentEstateId,
                150_000,
                10e5,
                11e5,
                newCurrencyAddress,
                currentTimestamp + 1000,
                LoanState.Supplied,
                borrower.address,
                seller.address,
            ));
            await callTransaction(mortgageToken.mint(seller.address, currentTokenId));

            await callTransaction(mortgageMarketplace.connect(seller).list(
                currentTokenId,
                price,
                newCurrencyAddress,
            ));
            await callTransaction(mortgageToken.connect(seller).setApprovalForAll(mortgageMarketplace.address, true));

            let royaltyReceiver = feeReceiver.address;
            let royaltyAmount = price.mul(mortgageTokenRoyaltyRate).div(Constant.COMMON_RATE_MAX_FRACTION);
            if (isExclusive) {
                royaltyAmount = royaltyAmount.sub(royaltyAmount.mul(mockCurrencyExclusiveRate).div(Constant.COMMON_RATE_MAX_FRACTION));
            }
            let commissionAmount = ethers.BigNumber.from(0);
            if (hasCommissionReceiver) {
                commissionAmount = royaltyAmount.mul(commissionRate).div(Constant.COMMON_RATE_MAX_FRACTION);
            }

            let total = price.add(royaltyAmount);

            let ethValue = ethers.BigNumber.from(0);
            await prepareNativeToken(ethers.provider, deployer, [buyer], ethers.utils.parseEther("1.0"));
            if (isERC20) {
                await prepareERC20(newCurrency!, [buyer], [mortgageMarketplace], total);
            } else {
                ethValue = total;
                await prepareNativeToken(ethers.provider, deployer, [buyer], total);
            }

            let initBuyerBalance = await getBalance(ethers.provider, buyer.address, newCurrency);
            let initSellerBalance = await getBalance(ethers.provider, seller.address, newCurrency);
            let initFeeReceiverBalance = await getBalance(ethers.provider, feeReceiver.address, newCurrency);
            let initCommissionReceiverBalance = await getBalance(ethers.provider, commissionReceiverAddress, newCurrency);

            let tx = await mortgageMarketplace.connect(buyer).buy(
                currentOfferId,
                { value: ethValue }
            );
            const receipt = await tx.wait();

            let expectedBuyerBalance = initBuyerBalance.sub(total);
            let expectedSellerBalance = initSellerBalance.add(price);
            let expectedFeeReceiverBalance = initFeeReceiverBalance.add(royaltyAmount.sub(commissionAmount));
            let expectedCommissionReceiverBalance = initCommissionReceiverBalance.add(commissionAmount);

            if (!isERC20) {
                const gasFee = receipt.gasUsed.mul(receipt.effectiveGasPrice);
                expectedBuyerBalance = expectedBuyerBalance.sub(gasFee);
            }

            await expect(tx).to
                .emit(mortgageMarketplace, 'OfferSale')
                .withArgs(currentOfferId, buyer.address, royaltyReceiver, royaltyAmount, commissionReceiverAddress, commissionAmount);

            let offer = await mortgageMarketplace.getOffer(currentOfferId);
            expect(offer.tokenId).to.equal(currentTokenId);
            expect(offer.price).to.equal(price);
            expect(offer.currency).to.equal(newCurrencyAddress);
            expect(offer.state).to.equal(MortgageMarketplaceOfferState.Sold);
            expect(offer.seller).to.equal(seller.address);

            expect(await getBalance(ethers.provider, buyer.address, newCurrency)).to.equal(expectedBuyerBalance);
            expect(await getBalance(ethers.provider, seller.address, newCurrency)).to.equal(expectedSellerBalance);
            expect(await getBalance(ethers.provider, feeReceiver.address, newCurrency)).to.equal(expectedFeeReceiverBalance);
            if (hasCommissionReceiver) {
                expect(await getBalance(ethers.provider, commissionReceiverAddress, newCurrency)).to.equal(expectedCommissionReceiverBalance);
            }
            expect(await mortgageToken.ownerOf(currentTokenId)).to.equal(buyer.address);

            let walletsToReset = [seller, buyer, feeReceiver];
            if (hasCommissionReceiver) {
                walletsToReset.push(commissionReceiver);
            }
            if (isERC20) {
                await resetERC20(newCurrency!, walletsToReset);
            } else {
                await resetNativeToken(ethers.provider, walletsToReset);
                await prepareNativeToken(ethers.provider, deployer, [seller, buyer], ethers.utils.parseEther("1.0"));
            }
        }

        it('15.6.1. buy token successfully (automatic test)', async () => {
            const fixture = await beforeMortgageMarketplaceTest({
                listSampleCurrencies: true,
                listSampleMortgageToken: true,
            });
            const { mockCurrencyExclusiveRate } = fixture;
    
            await testBuyOffer(
                fixture,
                mockCurrencyExclusiveRate,
                LendInitialization.MORTGAGE_TOKEN_RoyaltyRate,
                LandInitialization.COMMISSION_TOKEN_CommissionRate,
                false,
                false,
                ethers.BigNumber.from(200000),
                false,
            );

            await testBuyOffer(
                fixture,
                mockCurrencyExclusiveRate,
                LendInitialization.MORTGAGE_TOKEN_RoyaltyRate,
                LandInitialization.COMMISSION_TOKEN_CommissionRate,
                true,
                false,
                ethers.BigNumber.from(500000),
                true,
            );
        });

        it('15.6.2. buy token successfully (all flows)', async () => {
            const fixture = await beforeMortgageMarketplaceTest({
                listSampleCurrencies: true,
                listSampleMortgageToken: true,
            });
            const { mockCurrencyExclusiveRate } = fixture;

            for (const hasCommissionReceiver of [false, true]) {
                for (const isERC20 of [false, true]) {
                    for (const isExclusive of [false, true]) {
                        if (!isERC20 && isExclusive) {
                            continue;
                        }
                        await testBuyOffer(
                            fixture,
                            mockCurrencyExclusiveRate,
                            LendInitialization.MORTGAGE_TOKEN_RoyaltyRate,
                            LandInitialization.COMMISSION_TOKEN_CommissionRate,
                            isERC20,
                            isExclusive,
                            ethers.BigNumber.from(200000),
                            hasCommissionReceiver,
                        )
                    }
                }
            }
        });

        it('15.6.3. buy token successfully with very large amount (all flows)', async () => {
            const fixture = await beforeMortgageMarketplaceTest({
                listSampleCurrencies: true,
                listSampleMortgageToken: true,
            });

            for (const hasCommissionReceiver of [false, true]) {
                for (const isERC20 of [false, true]) {
                    for (const isExclusive of [false, true]) {
                        if (!isERC20 && isExclusive) {
                            continue;
                        }
                        const price = ethers.BigNumber.from(2).pow(255);
                        await testBuyOffer(
                            fixture,
                            ethers.utils.parseEther("0.99"),
                            ethers.utils.parseEther("0.99"),
                            ethers.utils.parseEther("0.99"),
                            isERC20,
                            isExclusive,
                            price,
                            hasCommissionReceiver,
                        )
                    }
                }
            }
        });

        it('15.6.4. buy token unsuccessfully when paused', async () => {
            const fixture = await beforeMortgageMarketplaceTest({
                listSampleCurrencies: true,
                listSampleMortgageToken: true,
                listSampleOffers: true,
                pause: true,
            });
            const { mortgageMarketplace, buyer1 } = fixture;

            await expect(mortgageMarketplace.connect(buyer1).buy(1, { value: 1e9 }))
                .to.be.revertedWith("Pausable: paused");
        });

        it('15.6.5. buy token unsuccessfully with invalid offer id', async () => {
            const fixture = await beforeMortgageMarketplaceTest({
                listSampleCurrencies: true,
                listSampleMortgageToken: true,
                listSampleOffers: true,
            });
            const { mortgageMarketplace, buyer1 } = fixture;

            await expect(mortgageMarketplace.connect(buyer1).buy(0, { value: 1e9 }))
                .to.be.revertedWithCustomError(mortgageMarketplace, "InvalidOfferId");

            await expect(mortgageMarketplace.connect(buyer1).buy(3, { value: 1e9 }))
                .to.be.revertedWithCustomError(mortgageMarketplace, "InvalidOfferId");
        });

        it('15.6.6. buy token unsuccessfully when seller buy their own token', async () => {
            const fixture = await beforeMortgageMarketplaceTest({
                listSampleCurrencies: true,
                listSampleMortgageToken: true,
                listSampleOffers: true,
            });
            const { mortgageMarketplace, seller1, seller2 } = fixture;

            await expect(mortgageMarketplace.connect(seller1).buy(1, { value: 1e9 }))
                .to.be.revertedWithCustomError(mortgageMarketplace, "InvalidBuying");

            await expect(mortgageMarketplace.connect(seller2).buy(2))
                .to.be.revertedWithCustomError(mortgageMarketplace, "InvalidBuying");
        });

        it('15.6.7. buy token unsuccessfully when offer is not selling', async () => {
            const fixture = await beforeMortgageMarketplaceTest({
                listSampleCurrencies: true,
                listSampleMortgageToken: true,
                listSampleOffers: true,
            });
            const { mortgageMarketplace, buyer1, buyer2 } = fixture;

            await callTransaction(mortgageMarketplace.connect(buyer1).buy(1, { value: 1e9 }));

            await expect(mortgageMarketplace.connect(buyer2).buy(1, { value: 1e9 }))
                .to.be.revertedWithCustomError(mortgageMarketplace, "InvalidBuying");
        });

        it('15.6.8. buy token unsuccessfully with insufficient native token', async () => {
            const fixture = await beforeMortgageMarketplaceTest({
                listSampleCurrencies: true,
                listSampleMortgageToken: true,
                listSampleOffers: true,
            });
            const { mortgageMarketplace, buyer1 } = fixture;

            await expect(mortgageMarketplace.connect(buyer1).buy(1))
                .to.be.revertedWithCustomError(mortgageMarketplace, "InsufficientValue");
        });

        it('15.6.9. buy token unsuccessfully when native token transfer to seller failed', async () => {
            const fixture = await beforeMortgageMarketplaceTest({
                listSampleCurrencies: true,
                listSampleMortgageToken: true,
            });
            const { mortgageMarketplace, seller1, buyer1, deployer, mortgageToken } = fixture;
            
            const failReceiver = await deployFailReceiver(deployer);

            await callTransaction(mortgageToken.connect(seller1).transferFrom(
                seller1.address,
                failReceiver.address,
                1,
            ));

            let data = mortgageToken.interface.encodeFunctionData("setApprovalForAll", [mortgageMarketplace.address, true]);
            await callTransaction(failReceiver.call(mortgageToken.address, data));

            data = mortgageMarketplace.interface.encodeFunctionData("list", [1, 200000, ethers.constants.AddressZero]);

            await callTransaction(failReceiver.call(mortgageMarketplace.address, data));

            await expect(mortgageMarketplace.connect(buyer1).buy(1, { value: 1e9 }))
                .to.be.revertedWithCustomError(mortgageMarketplace, "FailedTransfer");
        });

        it('15.6.10. buy token unsuccessfully when native token transfer to royalty receiver failed', async () => {
            const fixture = await beforeMortgageMarketplaceTest({
                listSampleCurrencies: true,
                listSampleMortgageToken: true,
                listSampleOffers: true,
                fundERC20ForBuyers: true,
            });
            const { mortgageMarketplace, buyer1, deployer, mortgageToken } = fixture;

            const failReceiver = await deployFailReceiver(deployer);

            mortgageToken.setVariable("feeReceiver", failReceiver.address);

            await expect(mortgageMarketplace.connect(buyer1).buy(1, { value: 1e9 }))
                .to.be.revertedWithCustomError(mortgageMarketplace, "FailedTransfer");
        });

        it('15.6.11. buy token unsuccessfully when refund to sender failed', async () => {
            const fixture = await beforeMortgageMarketplaceTest({
                listSampleCurrencies: true,
                listSampleMortgageToken: true,
                listSampleOffers: true,
                fundERC20ForBuyers: true,
            });
            const { mortgageMarketplace, deployer } = fixture;

            const failReceiver = await deployFailReceiver(deployer);

            let data = mortgageMarketplace.interface.encodeFunctionData("buy", [1]);

            await expect(failReceiver.call(mortgageMarketplace.address, data, { value: 1e9 }))
                .to.be.revertedWithCustomError(mortgageMarketplace, "FailedRefund");
        });

        it('15.6.12. buy token unsuccessfully when this contract is reentered', async () => {
            const fixture = await beforeMortgageMarketplaceTest({
                listSampleCurrencies: true,
                listSampleMortgageToken: true,
            });
            const { deployer, mortgageToken, mortgageMarketplace, buyer1, seller1 } = fixture;

            const reentrancy = await deployReentrancy(deployer);

            await callTransaction(mortgageToken.connect(seller1).transferFrom(
                seller1.address,
                reentrancy.address,
                1,
            ));

            let data = mortgageMarketplace.interface.encodeFunctionData("list", [1, 200000, ethers.constants.AddressZero]);
            await callTransaction(reentrancy.call(mortgageMarketplace.address, data));

            data = mortgageToken.interface.encodeFunctionData("setApprovalForAll", [mortgageMarketplace.address, true]);
            await callTransaction(reentrancy.call(mortgageToken.address, data));

            await testReentrancy_MortgageMarketplace(
                mortgageMarketplace,
                reentrancy,
                async () => {
                    await expect(mortgageMarketplace.connect(buyer1).buy(1, { value: 1e9 }))
                        .to.be.revertedWithCustomError(mortgageMarketplace, "FailedTransfer");
                },
            );
        });
    });

    describe('15.7. safeBuy(uint256, uint256)', async () => {
        async function testSafeBuyOffer(
            fixture: MortgageMarketplaceFixture,
            mockCurrencyExclusiveRate: BigNumber,
            mortgageTokenRoyaltyRate: BigNumber,
            commissionRate: BigNumber,
            isERC20: boolean,
            isExclusive: boolean,
            price: BigNumber,
            hasCommissionReceiver: boolean,
        ) {
            const { deployer, estateToken, commissionToken, mortgageToken, mortgageMarketplace, borrower1, seller1, buyer1, feeReceiver, admins, admin, commissionReceiver } = fixture;

            await callMortgageToken_UpdateRoyaltyRate(mortgageToken, admins, mortgageTokenRoyaltyRate, await admin.nonce());
            commissionToken.setVariable("commissionRate", commissionRate);
            
            const currentEstateId = (await estateToken.estateNumber()).add(1);
            const currentTokenId = (await mortgageToken.loanNumber()).add(1);
            const currentOfferId = (await mortgageMarketplace.offerNumber()).add(1);

            let newCurrency: Currency | undefined;
            let newCurrencyAddress: string;
            if (isERC20) {
                newCurrency = await deployCurrency(
                    deployer.address,
                    `NewMockCurrency_${currentOfferId}`,
                    `NMC_${currentOfferId}`
                ) as Currency;
                newCurrencyAddress = newCurrency.address;

                await callTransaction(newCurrency.setExclusiveDiscount(mockCurrencyExclusiveRate, Constant.COMMON_RATE_DECIMALS));
            } else {
                newCurrencyAddress = ethers.constants.AddressZero;
            }

            const commissionReceiverAddress = hasCommissionReceiver ? commissionReceiver.address : ethers.constants.AddressZero;

            await callAdmin_UpdateCurrencyRegistries(
                admin,
                admins,
                [newCurrencyAddress],
                [true],
                [isExclusive],
                await admin.nonce(),
            );

            let currentTimestamp = await time.latest();

            const borrower = borrower1;
            const seller = seller1;
            const buyer = buyer1;

            if (hasCommissionReceiver) {
                await callTransaction(estateToken.call(commissionToken.address, commissionToken.interface.encodeFunctionData('mint', [commissionReceiverAddress, currentEstateId])));
                await estateToken.setVariable("estateNumber", currentEstateId);
            }

            await callTransaction(mortgageToken.addLoan(
                currentEstateId,
                150_000,
                10e5,
                11e5,
                newCurrencyAddress,
                currentTimestamp + 1000,
                LoanState.Supplied,
                borrower.address,
                seller.address,
            ));
            await callTransaction(mortgageToken.mint(seller.address, currentTokenId));

            await callTransaction(mortgageMarketplace.connect(seller).list(
                currentTokenId,
                price,
                newCurrencyAddress,
            ));
            await callTransaction(mortgageToken.connect(seller).setApprovalForAll(mortgageMarketplace.address, true));

            let royaltyReceiver = feeReceiver.address;
            let royaltyAmount = price.mul(mortgageTokenRoyaltyRate).div(Constant.COMMON_RATE_MAX_FRACTION);
            if (isExclusive) {
                royaltyAmount = royaltyAmount.sub(royaltyAmount.mul(mockCurrencyExclusiveRate).div(Constant.COMMON_RATE_MAX_FRACTION));
            }
            let commissionAmount = ethers.BigNumber.from(0);
            if (hasCommissionReceiver) {
                commissionAmount = royaltyAmount.mul(commissionRate).div(Constant.COMMON_RATE_MAX_FRACTION);
            }

            let total = price.add(royaltyAmount);

            let ethValue = ethers.BigNumber.from(0);
            await prepareNativeToken(ethers.provider, deployer, [buyer], ethers.utils.parseEther("1.0"));
            if (isERC20) {
                await prepareERC20(newCurrency!, [buyer], [mortgageMarketplace], total);
            } else {
                ethValue = total;
                await prepareNativeToken(ethers.provider, deployer, [buyer], total);
            }

            let initBuyerBalance = await getBalance(ethers.provider, buyer.address, newCurrency);
            let initSellerBalance = await getBalance(ethers.provider, seller.address, newCurrency);
            let initFeeReceiverBalance = await getBalance(ethers.provider, feeReceiver.address, newCurrency);
            let initCommissionReceiverBalance = await getBalance(ethers.provider, commissionReceiverAddress, newCurrency);

            let tx = await mortgageMarketplace.connect(buyer).safeBuy(
                currentOfferId,
                currentTokenId,
                { value: ethValue }
            );
            const receipt = await tx.wait();

            let expectedBuyerBalance = initBuyerBalance.sub(total);
            let expectedSellerBalance = initSellerBalance.add(price);
            let expectedFeeReceiverBalance = initFeeReceiverBalance.add(royaltyAmount.sub(commissionAmount));
            let expectedCommissionReceiverBalance = initCommissionReceiverBalance.add(commissionAmount);

            if (!isERC20) {
                const gasFee = receipt.gasUsed.mul(receipt.effectiveGasPrice);
                expectedBuyerBalance = expectedBuyerBalance.sub(gasFee);
            }

            await expect(tx).to
                .emit(mortgageMarketplace, 'OfferSale')
                .withArgs(currentOfferId, buyer.address, royaltyReceiver, royaltyAmount, commissionReceiverAddress, commissionAmount);

            let offer = await mortgageMarketplace.getOffer(currentOfferId);
            expect(offer.tokenId).to.equal(currentTokenId);
            expect(offer.price).to.equal(price);
            expect(offer.currency).to.equal(newCurrencyAddress);
            expect(offer.state).to.equal(MortgageMarketplaceOfferState.Sold);
            expect(offer.seller).to.equal(seller.address);

            expect(await getBalance(ethers.provider, buyer.address, newCurrency)).to.equal(expectedBuyerBalance);
            expect(await getBalance(ethers.provider, seller.address, newCurrency)).to.equal(expectedSellerBalance);
            expect(await getBalance(ethers.provider, feeReceiver.address, newCurrency)).to.equal(expectedFeeReceiverBalance);
            if (hasCommissionReceiver) {
                expect(await getBalance(ethers.provider, commissionReceiverAddress, newCurrency)).to.equal(expectedCommissionReceiverBalance);
            }
            expect(await mortgageToken.ownerOf(currentTokenId)).to.equal(buyer.address);

            let walletsToReset = [seller, buyer, feeReceiver];
            if (hasCommissionReceiver) {
                walletsToReset.push(commissionReceiver);
            }
            if (isERC20) {
                await resetERC20(newCurrency!, walletsToReset);
            } else {
                await resetNativeToken(ethers.provider, walletsToReset);
                await prepareNativeToken(ethers.provider, deployer, [seller, buyer], ethers.utils.parseEther("1.0"));
            }
        }

        it('15.7.1. buy token successfully (automatic test)', async () => {
            const fixture = await beforeMortgageMarketplaceTest({
                listSampleCurrencies: true,
                listSampleMortgageToken: true,
            });
            const { mockCurrencyExclusiveRate } = fixture;
    
            await testSafeBuyOffer(
                fixture,
                mockCurrencyExclusiveRate,
                LendInitialization.MORTGAGE_TOKEN_RoyaltyRate,
                LandInitialization.COMMISSION_TOKEN_CommissionRate,
                false,
                false,
                ethers.BigNumber.from(200000),
                false,
            );

            await testSafeBuyOffer(
                fixture,
                mockCurrencyExclusiveRate,
                LendInitialization.MORTGAGE_TOKEN_RoyaltyRate,
                LandInitialization.COMMISSION_TOKEN_CommissionRate,
                true,
                false,
                ethers.BigNumber.from(500000),
                true,
            );
        });

        it('15.7.2. buy token successfully (all flows)', async () => {
            const fixture = await beforeMortgageMarketplaceTest({
                listSampleCurrencies: true,
                listSampleMortgageToken: true,
            });
            const { mockCurrencyExclusiveRate } = fixture;

            for (const hasCommissionReceiver of [false, true]) {
                for (const isERC20 of [false, true]) {
                    for (const isExclusive of [false, true]) {
                        if (!isERC20 && isExclusive) {
                            continue;
                        }
                        await testSafeBuyOffer(
                            fixture,
                            mockCurrencyExclusiveRate,
                            LendInitialization.MORTGAGE_TOKEN_RoyaltyRate,
                            LandInitialization.COMMISSION_TOKEN_CommissionRate,
                            isERC20,
                            isExclusive,
                            ethers.BigNumber.from(200000),
                            hasCommissionReceiver,
                        )
                    }
                }
            }
        });

        it('15.7.3. buy token successfully with very large amount (all flows)', async () => {
            const fixture = await beforeMortgageMarketplaceTest({
                listSampleCurrencies: true,
                listSampleMortgageToken: true,
            });

            for (const hasCommissionReceiver of [false, true]) {
                for (const isERC20 of [false, true]) {
                    for (const isExclusive of [false, true]) {
                        if (!isERC20 && isExclusive) {
                            continue;
                        }
                        const price = ethers.BigNumber.from(2).pow(255);
                        await testSafeBuyOffer(
                            fixture,
                            ethers.utils.parseEther("0.99"),
                            ethers.utils.parseEther("0.99"),
                            ethers.utils.parseEther("0.99"),
                            isERC20,
                            isExclusive,
                            price,
                            hasCommissionReceiver,
                        )
                    }
                }
            }
        });

        it('15.7.4. buy token unsuccessfully when paused', async () => {
            const fixture = await beforeMortgageMarketplaceTest({
                listSampleCurrencies: true,
                listSampleMortgageToken: true,
                listSampleOffers: true,
                pause: true,
            });
            const { mortgageMarketplace, buyer1 } = fixture;

            await expect(mortgageMarketplace.connect(buyer1).safeBuy(1, 1, { value: 1e9 }))
                .to.be.revertedWith("Pausable: paused");
        });

        it('15.7.5. buy token unsuccessfully with invalid offer id', async () => {
            const fixture = await beforeMortgageMarketplaceTest({
                listSampleCurrencies: true,
                listSampleMortgageToken: true,
                listSampleOffers: true,
            });
            const { mortgageMarketplace, buyer1 } = fixture;

            await expect(mortgageMarketplace.connect(buyer1).safeBuy(0, 1, { value: 1e9 }))
                .to.be.revertedWithCustomError(mortgageMarketplace, "InvalidOfferId");

            await expect(mortgageMarketplace.connect(buyer1).safeBuy(3, 1, { value: 1e9 }))
                .to.be.revertedWithCustomError(mortgageMarketplace, "InvalidOfferId");
        });

        it('15.7.6. buy token unsuccessfully when seller buy their own token', async () => {
            const fixture = await beforeMortgageMarketplaceTest({
                listSampleCurrencies: true,
                listSampleMortgageToken: true,
                listSampleOffers: true,
            });
            const { mortgageMarketplace, seller1, seller2 } = fixture;

            await expect(mortgageMarketplace.connect(seller1).safeBuy(1, 1, { value: 1e9 }))
                .to.be.revertedWithCustomError(mortgageMarketplace, "InvalidBuying");

            await expect(mortgageMarketplace.connect(seller2).safeBuy(2, 2))
                .to.be.revertedWithCustomError(mortgageMarketplace, "InvalidBuying");
        });

        it('15.7.7. buy token unsuccessfully with invalid anchor', async () => {
            const fixture = await beforeMortgageMarketplaceTest({
                listSampleCurrencies: true,
                listSampleMortgageToken: true,
                listSampleOffers: true,
            });
            const { mortgageMarketplace, buyer1, buyer2 } = fixture;

            await expect(mortgageMarketplace.connect(buyer1).safeBuy(1, 2, { value: 1e9 }))
                .to.be.revertedWithCustomError(mortgageMarketplace, "BadAnchor");

            await expect(mortgageMarketplace.connect(buyer2).safeBuy(2, 1))
                .to.be.revertedWithCustomError(mortgageMarketplace, "BadAnchor");
        });

        it('15.7.8. buy token unsuccessfully when offer is not selling', async () => {
            const fixture = await beforeMortgageMarketplaceTest({
                listSampleCurrencies: true,
                listSampleMortgageToken: true,
                listSampleOffers: true,
            });
            const { mortgageMarketplace, buyer1, buyer2 } = fixture;

            await callTransaction(mortgageMarketplace.connect(buyer1).safeBuy(1, 1, { value: 1e9 }));

            await expect(mortgageMarketplace.connect(buyer2).safeBuy(1, 1, { value: 1e9 }))
                .to.be.revertedWithCustomError(mortgageMarketplace, "InvalidBuying");
        });

        it('15.7.9. buy token unsuccessfully with insufficient native token', async () => {
            const fixture = await beforeMortgageMarketplaceTest({
                listSampleCurrencies: true,
                listSampleMortgageToken: true,
                listSampleOffers: true,
            });
            const { mortgageMarketplace, buyer1 } = fixture;

            await expect(mortgageMarketplace.connect(buyer1).safeBuy(1, 1))
                .to.be.revertedWithCustomError(mortgageMarketplace, "InsufficientValue");
        });

        it('15.7.10. buy token unsuccessfully when native token transfer to seller failed', async () => {
            const fixture = await beforeMortgageMarketplaceTest({
                listSampleCurrencies: true,
                listSampleMortgageToken: true,
            });
            const { mortgageMarketplace, seller1, buyer1, deployer, mortgageToken } = fixture;
            
            const failReceiver = await deployFailReceiver(deployer);

            await callTransaction(mortgageToken.connect(seller1).transferFrom(
                seller1.address,
                failReceiver.address,
                1,
            ));

            let data = mortgageToken.interface.encodeFunctionData("setApprovalForAll", [mortgageMarketplace.address, true]);
            await callTransaction(failReceiver.call(mortgageToken.address, data));

            data = mortgageMarketplace.interface.encodeFunctionData("list", [1, 200000, ethers.constants.AddressZero]);

            await callTransaction(failReceiver.call(mortgageMarketplace.address, data));

            await expect(mortgageMarketplace.connect(buyer1).safeBuy(1, 1, { value: 1e9 }))
                .to.be.revertedWithCustomError(mortgageMarketplace, "FailedTransfer");
        });

        it('15.7.11. buy token unsuccessfully when native token transfer to royalty receiver failed', async () => {
            const fixture = await beforeMortgageMarketplaceTest({
                listSampleCurrencies: true,
                listSampleMortgageToken: true,
                listSampleOffers: true,
                fundERC20ForBuyers: true,
            });
            const { mortgageMarketplace, buyer1, deployer, mortgageToken } = fixture;

            const failReceiver = await deployFailReceiver(deployer);

            mortgageToken.setVariable("feeReceiver", failReceiver.address);

            await expect(mortgageMarketplace.connect(buyer1).safeBuy(1, 1, { value: 1e9 }))
                .to.be.revertedWithCustomError(mortgageMarketplace, "FailedTransfer");
        });

        it('15.7.12. buy token unsuccessfully when refund to sender failed', async () => {
            const fixture = await beforeMortgageMarketplaceTest({
                listSampleCurrencies: true,
                listSampleMortgageToken: true,
                listSampleOffers: true,
                fundERC20ForBuyers: true,
            });
            const { mortgageMarketplace, deployer } = fixture;

            const failReceiver = await deployFailReceiver(deployer);

            let data = mortgageMarketplace.interface.encodeFunctionData("safeBuy", [1, 1]);

            await expect(failReceiver.call(mortgageMarketplace.address, data, { value: 1e9 }))
                .to.be.revertedWithCustomError(mortgageMarketplace, "FailedRefund");
        });

        it('15.7.13. buy token unsuccessfully when this contract is reentered', async () => {
            const fixture = await beforeMortgageMarketplaceTest({
                listSampleCurrencies: true,
                listSampleMortgageToken: true,
            });
            const { deployer, mortgageToken, mortgageMarketplace, buyer1, seller1 } = fixture;

            const reentrancy = await deployReentrancy(deployer);

            await callTransaction(mortgageToken.connect(seller1).transferFrom(
                seller1.address,
                reentrancy.address,
                1,
            ));

            let data = mortgageMarketplace.interface.encodeFunctionData("list", [1, 200000, ethers.constants.AddressZero]);
            await callTransaction(reentrancy.call(mortgageMarketplace.address, data));

            data = mortgageToken.interface.encodeFunctionData("setApprovalForAll", [mortgageMarketplace.address, true]);
            await callTransaction(reentrancy.call(mortgageToken.address, data));

            await testReentrancy_MortgageMarketplace(
                mortgageMarketplace,
                reentrancy,
                async () => {
                    await expect(mortgageMarketplace.connect(buyer1).safeBuy(1, 1, { value: 1e9 }))
                        .to.be.revertedWithCustomError(mortgageMarketplace, "FailedTransfer");
                },
            );
        });
    });

    describe('15.8. cancelOffer(uint256)', async () => {
        it('15.8.1. cancel offer successfully by seller', async () => {
            const fixture = await beforeMortgageMarketplaceTest({
                listSampleCurrencies: true,
                listSampleMortgageToken: true,
                listSampleOffers: true,
                fundERC20ForBuyers: true,
            });
            const { mortgageMarketplace, seller1 } = fixture;

            let tx = await mortgageMarketplace.connect(seller1).cancel(1);
            await tx.wait();

            const offer = await mortgageMarketplace.getOffer(1);
            expect(offer.state).to.equal(MortgageMarketplaceOfferState.Cancelled);

            await expect(tx).to
                .emit(mortgageMarketplace, "OfferCancellation")
                .withArgs(1);
        });

        it('15.8.2. cancel offer successfully by manager', async () => {
            const fixture = await beforeMortgageMarketplaceTest({
                listSampleCurrencies: true,
                listSampleMortgageToken: true,
                listSampleOffers: true,
                fundERC20ForBuyers: true,
            });
            const { mortgageMarketplace, manager } = fixture;
            let tx = await mortgageMarketplace.connect(manager).cancel(1);
            await tx.wait();

            const offer = await mortgageMarketplace.getOffer(1);
            expect(offer.state).to.equal(MortgageMarketplaceOfferState.Cancelled);

            await expect(tx).to
                .emit(mortgageMarketplace, "OfferCancellation")
                .withArgs(1);
        });

        it('15.8.3. cancel offer unsuccessfully with invalid offer id', async () => {
            const fixture = await beforeMortgageMarketplaceTest({
                listSampleCurrencies: true,
                listSampleMortgageToken: true,
                listSampleOffers: true,
                fundERC20ForBuyers: true,
            });
            const { mortgageMarketplace, manager } = fixture;

            await expect(mortgageMarketplace.connect(manager).cancel(0))
                .to.be.revertedWithCustomError(mortgageMarketplace, "InvalidOfferId");
            await expect(mortgageMarketplace.connect(manager).cancel(3))
                .to.be.revertedWithCustomError(mortgageMarketplace, "InvalidOfferId");
        });

        it('15.8.4. cancel offer unsuccessfully by unauthorized user', async () => {
            const fixture = await beforeMortgageMarketplaceTest({
                listSampleCurrencies: true,
                listSampleMortgageToken: true,
                listSampleOffers: true,
                fundERC20ForBuyers: true,
            });
            const { mortgageMarketplace, seller2, moderator } = fixture;

            await expect(mortgageMarketplace.connect(seller2).cancel(1))
                .to.be.revertedWithCustomError(mortgageMarketplace, "Unauthorized");

            await expect(mortgageMarketplace.connect(moderator).cancel(1))
                .to.be.revertedWithCustomError(mortgageMarketplace, "Unauthorized");
        });

        it('15.8.5. cancel offer unsuccessfully when offer is already cancelled', async () => {
            const fixture = await beforeMortgageMarketplaceTest({
                listSampleCurrencies: true,
                listSampleMortgageToken: true,
                listSampleOffers: true,
                fundERC20ForBuyers: true,
            });
            const { mortgageMarketplace, manager } = fixture;

            await callTransaction(mortgageMarketplace.connect(manager).cancel(1));
            await expect(mortgageMarketplace.connect(manager).cancel(1))
                .to.be.revertedWithCustomError(mortgageMarketplace, "InvalidCancelling");
        });

        it('15.8.6. cancel offer unsuccessfully when offer is sold out', async () => {
            const fixture = await beforeMortgageMarketplaceTest({
                listSampleCurrencies: true,
                listSampleMortgageToken: true,
                listSampleOffers: true,
                fundERC20ForBuyers: true,
            });
            const { mortgageMarketplace, manager, buyer1 } = fixture;

            await callTransaction(mortgageMarketplace.connect(buyer1).buy(1, { value: 1e9 }));

            await expect(mortgageMarketplace.connect(manager).cancel(1))
                .to.be.revertedWithCustomError(mortgageMarketplace, "InvalidCancelling");
        });
    });
});
