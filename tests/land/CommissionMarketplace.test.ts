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
    CommissionMarketplace,
    MockEstateToken__factory,
    CommissionToken__factory,
} from '@typechain-types';
import { callTransaction, getBalance, getSignatures, prepareERC20, prepareNativeToken, randomWallet, resetERC20, resetNativeToken, testReentrancy } from '@utils/blockchain';
import { Constant } from '@tests/test.constant';
import { deployAdmin } from '@utils/deployments/common/admin';
import { deployFeeReceiver } from '@utils/deployments/common/feeReceiver';
import { deployCurrency } from '@utils/deployments/common/currency';
import { loadFixture, time } from "@nomicfoundation/hardhat-network-helpers";

import { MockContract, smock } from '@defi-wonderland/smock';

import {
    callAdmin_AuthorizeManagers,
    callAdmin_AuthorizeModerators,
    callAdmin_DeclareZones,
    callAdmin_UpdateCurrencyRegistries,
} from '@utils/callWithSignatures/admin';
import { BigNumber, Contract } from 'ethers';
import { deployCommissionMarketplace } from '@utils/deployments/land/commissionMarketplace';
import { CommissionMarketplaceOfferState, EstateMarketplaceOfferState } from '@utils/enums';
import { callCommissionToken_UpdateRoyaltyRate } from '@utils/callWithSignatures/commissionToken';
import { callCommissionMarketplace_Pause } from '@utils/callWithSignatures/commissionMarketplace';
import { deployFailReceiver } from '@utils/deployments/mocks/failReceiver';
import { deployReentrancy } from '@utils/deployments/mocks/mockReentrancy/reentrancy';
import { Initialization as LandInitialization } from '@tests/land/test.initialization';

interface CommissionMarketplaceFixture {
    admin: Admin;
    feeReceiver: FeeReceiver;
    currency: Currency;
    estateToken: MockContract<MockEstateToken>;
    commissionToken: MockContract<CommissionToken>;
    commissionMarketplace: CommissionMarketplace;

    deployer: any;
    admins: any[];
    seller1: any;
    seller2: any;
    buyer1: any;
    buyer2: any;
    manager: any;
    moderator: any;
    mockCurrencyExclusiveRate: BigNumber;
}

async function testReentrancy_CommissionMarketplace(
    commissionMarketplace: CommissionMarketplace,
    reentrancyContract: Contract,
    assertion: any,
) {
    let data = [
        commissionMarketplace.interface.encodeFunctionData("buy", [0]),
        commissionMarketplace.interface.encodeFunctionData("safeBuy", [0, 0]),
        commissionMarketplace.interface.encodeFunctionData("cancel", [0]),
    ];

    await testReentrancy(
        reentrancyContract,
        commissionMarketplace,
        data,
        assertion,
    );
}

describe('7. CommissionMarketplace', async () => {
    async function commissionMarketplaceFixture(): Promise<CommissionMarketplaceFixture> {
        const accounts = await ethers.getSigners();
        const deployer = accounts[0];
        const admins = [];
        for (let i = 1; i <= Constant.ADMIN_NUMBER; ++i) admins.push(accounts[i]);
        const seller1 = accounts[Constant.ADMIN_NUMBER + 1];
        const seller2 = accounts[Constant.ADMIN_NUMBER + 2];
        const buyer1 = accounts[Constant.ADMIN_NUMBER + 3];
        const buyer2 = accounts[Constant.ADMIN_NUMBER + 4];
        const manager = accounts[Constant.ADMIN_NUMBER + 5];
        const moderator = accounts[Constant.ADMIN_NUMBER + 6];

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

        const commissionMarketplace = await deployCommissionMarketplace(
            deployer.address,
            admin.address,
            commissionToken.address,
        ) as CommissionMarketplace;

        return {
            admin,
            feeReceiver,
            currency,
            estateToken,
            commissionToken,
            commissionMarketplace,
            deployer,
            admins,
            seller1,
            seller2,
            buyer1,
            buyer2,
            manager,
            moderator,
            mockCurrencyExclusiveRate,
        };
    };

    async function beforeCommissionMarketplaceTest({
        listSampleCurrencies = false,
        listSampleCommissionToken = false,
        listSampleOffers = false,
        fundERC20ForBuyers = false,
        pause = false,
    } = {}): Promise<CommissionMarketplaceFixture> {
        const fixture = await loadFixture(commissionMarketplaceFixture);

        const { admin, admins, currency, estateToken, commissionToken, commissionMarketplace, seller1, seller2, buyer1, buyer2, manager, moderator } = fixture;

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
                await admin.nonce(),
            );
        }

        if (listSampleCommissionToken) {
            await callTransaction(estateToken.call(commissionToken.address, commissionToken.interface.encodeFunctionData('mint', [seller1.address, 1])));
            await callTransaction(estateToken.call(commissionToken.address, commissionToken.interface.encodeFunctionData('mint', [seller2.address, 2])));

            await callTransaction(commissionToken.connect(seller1).setApprovalForAll(commissionMarketplace.address, true));
            await callTransaction(commissionToken.connect(seller2).setApprovalForAll(commissionMarketplace.address, true));

            await estateToken.setVariable("estateNumber", 2);
        }

        if (listSampleOffers) {
            await callTransaction(commissionMarketplace.connect(seller1).list(1, 200000, ethers.constants.AddressZero));
            await callTransaction(commissionMarketplace.connect(seller2).list(2, 500000, currency.address));

            await callTransaction(commissionToken.connect(seller1).setApprovalForAll(commissionMarketplace.address, true));
            await callTransaction(commissionToken.connect(seller2).setApprovalForAll(commissionMarketplace.address, true));
        }

        if (fundERC20ForBuyers) {
            await prepareERC20(currency, [buyer1, buyer2], [commissionMarketplace], ethers.BigNumber.from(1e9));
        }

        if (pause) {
            await callCommissionMarketplace_Pause(
                commissionMarketplace,
                admins,
                await admin.nonce()
            );
        }

        return {
            ...fixture,
        }
    }

    describe('7.1. initialize(address, address, address)', async () => {
        it('7.1.1. Deploy successfully', async () => {
            const fixture = await commissionMarketplaceFixture();
            const { admin, commissionToken, commissionMarketplace } = fixture;

            expect(await commissionMarketplace.offerNumber()).to.equal(0);

            expect(await commissionMarketplace.admin()).to.equal(admin.address);
            expect(await commissionMarketplace.commissionToken()).to.equal(commissionToken.address);
        });
    });

    // TODO: Andy
    describe('7.2. pause(bytes[])', async () => {

    });

    // TODO: Andy
    describe('7.3. unpause(bytes[])', async () => {

    });

    describe('7.4. getOffer(uint256)', async () => {
        it('7.4.1. return successfully', async () => {
            const fixture = await beforeCommissionMarketplaceTest({
                listSampleCurrencies: true,
                listSampleCommissionToken: true,
                listSampleOffers: true,
            });
            const { commissionMarketplace } = fixture;

            expect(await commissionMarketplace.getOffer(1)).to.not.be.reverted;
            expect(await commissionMarketplace.getOffer(2)).to.not.be.reverted;
        });

        it('7.4.2. revert with invalid offer id', async () => {
            const fixture = await beforeCommissionMarketplaceTest({
                listSampleCurrencies: true,
                listSampleCommissionToken: true,
                listSampleOffers: true,
            });
            const { commissionMarketplace } = fixture;

            await expect(commissionMarketplace.getOffer(0))
                .to.be.revertedWithCustomError(commissionMarketplace, "InvalidOfferId");
            await expect(commissionMarketplace.getOffer(3))
                .to.be.revertedWithCustomError(commissionMarketplace, "InvalidOfferId");
        });
    });

    describe('7.5. list(uint256, uint256, address)', async () => {
        it('7.5.1. list token successfully', async () => {
            const { commissionMarketplace, commissionToken, currency, seller1, seller2 } = await beforeCommissionMarketplaceTest({
                listSampleCurrencies: true,
                listSampleCommissionToken: true,
            });
            let tx = await commissionMarketplace.connect(seller1).list(1, 200000, ethers.constants.AddressZero);
            await tx.wait();

            expect(tx).to
                .emit(commissionMarketplace, 'NewOffer')
                .withArgs(1, 1, seller1.address, 200000, ethers.constants.AddressZero);

            expect(await commissionMarketplace.offerNumber()).to.equal(1);

            let offer = await commissionMarketplace.getOffer(1);
            expect(offer.tokenId).to.equal(1);
            expect(offer.price).to.equal(200000);
            expect(offer.currency).to.equal(ethers.constants.AddressZero);
            expect(offer.state).to.equal(CommissionMarketplaceOfferState.Selling);
            expect(offer.seller).to.equal(seller1.address);

            tx = await commissionMarketplace.connect(seller2).list(2, 500000, currency.address);
            await tx.wait();

            expect(tx).to
                .emit(commissionMarketplace, 'NewOffer')
                .withArgs(2, 2, seller2.address, 500000, currency.address);

            expect(await commissionMarketplace.offerNumber()).to.equal(2);

            offer = await commissionMarketplace.getOffer(2);
            expect(offer.tokenId).to.equal(2);
            expect(offer.price).to.equal(500000);
            expect(offer.currency).to.equal(currency.address);
            expect(offer.state).to.equal(CommissionMarketplaceOfferState.Selling);
            expect(offer.seller).to.equal(seller2.address);
        });

        it('7.5.2. list token unsuccessfully when paused', async () => {
            const fixture = await beforeCommissionMarketplaceTest({
                listSampleCurrencies: true,
                listSampleCommissionToken: true,
                pause: true,
            });
            const { commissionMarketplace, seller1 } = fixture;

            await expect(commissionMarketplace.connect(seller1).list(1, 200000, ethers.constants.AddressZero))
                .to.be.revertedWith('Pausable: paused');
        });

        it('7.5.3. list token unsuccessfully with invalid token id', async () => {
            const fixture = await beforeCommissionMarketplaceTest({
                listSampleCurrencies: true,
                listSampleCommissionToken: true,
            });
            const { commissionMarketplace, seller1 } = fixture;

            await expect(commissionMarketplace.connect(seller1).list(0, 200000, ethers.constants.AddressZero))
                .to.be.revertedWith('ERC721: invalid token ID');

            await expect(commissionMarketplace.connect(seller1).list(3, 200000, ethers.constants.AddressZero))
                .to.be.revertedWith('ERC721: invalid token ID');
        });

        it('7.5.4. list token unsuccessfully when not token owner', async () => {
            const fixture = await beforeCommissionMarketplaceTest({
                listSampleCurrencies: true,
                listSampleCommissionToken: true,
            });
            const { commissionMarketplace, seller2 } = fixture;

            await expect(commissionMarketplace.connect(seller2).list(1, 200000, ethers.constants.AddressZero))
                .to.be.revertedWithCustomError(commissionMarketplace, 'InvalidTokenId');
        });

        it('7.5.5. list token unsuccessfully with zero unit price', async () => {
            const fixture = await beforeCommissionMarketplaceTest({
                listSampleCurrencies: true,
                listSampleCommissionToken: true,
            });
            const { commissionMarketplace, seller1 } = fixture;

            await expect(commissionMarketplace.connect(seller1).list(1, 0, ethers.constants.AddressZero))
                .to.be.revertedWithCustomError(commissionMarketplace, 'InvalidPrice');
        });

        it('7.5.6. list token unsuccessfully with invalid currency', async () => {
            const fixture = await beforeCommissionMarketplaceTest({
                listSampleCommissionToken: true,
            });
            const { commissionMarketplace, seller1 } = fixture;

            await expect(commissionMarketplace.connect(seller1).list(1, 200000, ethers.constants.AddressZero))
                .to.be.revertedWithCustomError(commissionMarketplace, 'InvalidCurrency');
        });
    });

    describe('7.6. buy(uint256)', async () => {
        async function testBuyOffer(
            fixture: CommissionMarketplaceFixture,
            mockCurrencyExclusiveRate: BigNumber,
            commissionTokenRoyaltyRate: BigNumber,
            isERC20: boolean,
            isExclusive: boolean,
            price: BigNumber,
        ) {
            const { deployer, estateToken,commissionToken, commissionMarketplace, seller1, buyer1, feeReceiver, admins, admin } = fixture;

            await callCommissionToken_UpdateRoyaltyRate(commissionToken, admins, commissionTokenRoyaltyRate, await admin.nonce());

            const currentTokenId = (await estateToken.estateNumber()).add(1);
            const currentOfferId = (await commissionMarketplace.offerNumber()).add(1);

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

            await callAdmin_UpdateCurrencyRegistries(
                admin,
                admins,
                [newCurrencyAddress],
                [true],
                [isExclusive],
                await admin.nonce(),
            );

            const seller = seller1;
            const buyer = buyer1;

            await callTransaction(estateToken.call(commissionToken.address, commissionToken.interface.encodeFunctionData('mint', [seller.address, currentTokenId])));
            await callTransaction(commissionToken.connect(seller).setApprovalForAll(commissionMarketplace.address, true));
            await estateToken.setVariable("estateNumber", currentTokenId);

            await callTransaction(commissionMarketplace.connect(seller).list(
                currentTokenId,
                price,
                newCurrencyAddress,
            ));

            let royaltyReceiver = feeReceiver.address;
            let royaltyAmount = price.mul(commissionTokenRoyaltyRate).div(Constant.COMMON_RATE_MAX_FRACTION);
            if (isExclusive) {
                royaltyAmount = royaltyAmount.sub(royaltyAmount.mul(mockCurrencyExclusiveRate).div(Constant.COMMON_RATE_MAX_FRACTION));
            }
            let commissionAmount = ethers.BigNumber.from(0);
            let total = price.add(royaltyAmount);

            let ethValue = ethers.BigNumber.from(0);
            await prepareNativeToken(ethers.provider, deployer, [buyer], ethers.utils.parseEther("1.0"));
            if (isERC20) {
                await prepareERC20(newCurrency!, [buyer], [commissionMarketplace], total);
            } else {
                ethValue = total;
                await prepareNativeToken(ethers.provider, deployer, [buyer], total);
            }

            await callTransaction(estateToken.connect(seller).setApprovalForAll(commissionMarketplace.address, true));

            let initBuyerBalance = await getBalance(ethers.provider, buyer.address, newCurrency);
            let initSellerBalance = await getBalance(ethers.provider, seller.address, newCurrency);
            let initFeeReceiverBalance = await getBalance(ethers.provider, feeReceiver.address, newCurrency);

            let tx = await commissionMarketplace.connect(buyer).buy(currentOfferId, { value: ethValue });
            const receipt = await tx.wait();

            let expectedBuyerBalance = initBuyerBalance.sub(total);
            let expectedSellerBalance = initSellerBalance.add(price);
            let expectedFeeReceiverBalance = initFeeReceiverBalance.add(royaltyAmount.sub(commissionAmount));

            if (!isERC20) {
                const gasFee = receipt.gasUsed.mul(receipt.effectiveGasPrice);
                expectedBuyerBalance = expectedBuyerBalance.sub(gasFee);
            }

            await expect(tx).to
                .emit(commissionMarketplace, 'OfferSale')
                .withArgs(currentOfferId, buyer.address, royaltyReceiver, royaltyAmount);

            let offer = await commissionMarketplace.getOffer(currentOfferId);
            expect(offer.tokenId).to.equal(currentTokenId);
            expect(offer.price).to.equal(price);
            expect(offer.currency).to.equal(newCurrencyAddress);
            expect(offer.state).to.equal(CommissionMarketplaceOfferState.Sold);
            expect(offer.seller).to.equal(seller.address);

            expect(await getBalance(ethers.provider, buyer.address, newCurrency)).to.equal(expectedBuyerBalance);
            expect(await getBalance(ethers.provider, seller.address, newCurrency)).to.equal(expectedSellerBalance);
            expect(await getBalance(ethers.provider, feeReceiver.address, newCurrency)).to.equal(expectedFeeReceiverBalance);

            expect(await commissionToken.ownerOf(currentTokenId)).to.equal(buyer.address);

            let walletsToReset = [seller, buyer, feeReceiver];
            if (isERC20) {
                await resetERC20(newCurrency!, walletsToReset);
            } else {
                await resetNativeToken(ethers.provider, walletsToReset);
                await prepareNativeToken(ethers.provider, deployer, [seller, buyer], ethers.utils.parseEther("1.0"));
            }
        }

        it('7.6.1. buy token successfully (automatic test)', async () => {
            const fixture = await beforeCommissionMarketplaceTest({
                listSampleCurrencies: true,
                listSampleCommissionToken: true,
            });
            const { mockCurrencyExclusiveRate } = fixture;
    
            await testBuyOffer(
                fixture,
                mockCurrencyExclusiveRate,
                LandInitialization.COMMISSION_TOKEN_RoyaltyRate,
                false,
                false,
                ethers.BigNumber.from(200000),
            );

            await testBuyOffer(
                fixture,
                mockCurrencyExclusiveRate,
                LandInitialization.COMMISSION_TOKEN_RoyaltyRate,
                true,
                true,
                ethers.BigNumber.from(500000),
            );
        });

        it('7.6.2. buy token successfully (all flows)', async () => {
            const fixture = await beforeCommissionMarketplaceTest({
                listSampleCurrencies: true,
                listSampleCommissionToken: true,
            });
            const { mockCurrencyExclusiveRate } = fixture;

            for (const isERC20 of [false, true]) {
                for (const isExclusive of [false, true]) {
                    if (!isERC20 && isExclusive) {
                        continue;
                    }
                    await testBuyOffer(
                        fixture,
                        mockCurrencyExclusiveRate,
                        LandInitialization.COMMISSION_TOKEN_RoyaltyRate,
                        isERC20,
                        isExclusive,
                        ethers.BigNumber.from(200000),
                    )
                }
            }
        });

        it('7.6.3. buy token successfully with very large amount (all flows)', async () => {
            const fixture = await beforeCommissionMarketplaceTest({
                listSampleCurrencies: true,
                listSampleCommissionToken: true,
            });

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
                        isERC20,
                        isExclusive,
                        price,
                    )
                }
            }            
        });

        it('7.6.4. buy token unsuccessfully when paused', async () => {
            const fixture = await beforeCommissionMarketplaceTest({
                listSampleCurrencies: true,
                listSampleCommissionToken: true,
                listSampleOffers: true,
                pause: true,
            });
            const { commissionMarketplace, buyer1 } = fixture;

            await expect(commissionMarketplace.connect(buyer1).buy(1, { value: 1e9 }))
                .to.be.revertedWith("Pausable: paused");
        });

        it('7.6.5. buy token unsuccessfully with invalid offer id', async () => {
            const fixture = await beforeCommissionMarketplaceTest({
                listSampleCurrencies: true,
                listSampleCommissionToken: true,
                listSampleOffers: true,
            });
            const { commissionMarketplace, buyer1 } = fixture;

            await expect(commissionMarketplace.connect(buyer1).buy(0, { value: 1e9 }))
                .to.be.revertedWithCustomError(commissionMarketplace, "InvalidOfferId");

            await expect(commissionMarketplace.connect(buyer1).buy(3, { value: 1e9 }))
                .to.be.revertedWithCustomError(commissionMarketplace, "InvalidOfferId");
        });

        it('7.6.6. buy token unsuccessfully when seller buy their own token', async () => {
            const fixture = await beforeCommissionMarketplaceTest({
                listSampleCurrencies: true,
                listSampleCommissionToken: true,
                listSampleOffers: true,
            });
            const { commissionMarketplace, seller1, seller2 } = fixture;

            await expect(commissionMarketplace.connect(seller1).buy(1, { value: 1e9 }))
                .to.be.revertedWithCustomError(commissionMarketplace, "InvalidBuying");

            await expect(commissionMarketplace.connect(seller2).buy(2))
                .to.be.revertedWithCustomError(commissionMarketplace, "InvalidBuying");
        });

        it('7.6.7. buy token unsuccessfully when offer is not selling', async () => {
            const fixture = await beforeCommissionMarketplaceTest({
                listSampleCurrencies: true,
                listSampleCommissionToken: true,
                listSampleOffers: true,
            });
            const { commissionMarketplace, buyer1, buyer2 } = fixture;

            await callTransaction(commissionMarketplace.connect(buyer1).buy(1, { value: 1e9 }));

            await expect(commissionMarketplace.connect(buyer2).buy(1, { value: 1e9 }))
                .to.be.revertedWithCustomError(commissionMarketplace, "InvalidBuying");
        });

        it('7.6.8. buy token unsuccessfully with insufficient native token', async () => {
            const fixture = await beforeCommissionMarketplaceTest({
                listSampleCurrencies: true,
                listSampleCommissionToken: true,
                listSampleOffers: true,
            });
            const { commissionMarketplace, buyer1 } = fixture;

            await expect(commissionMarketplace.connect(buyer1).buy(1))
                .to.be.revertedWithCustomError(commissionMarketplace, "InsufficientValue");
        });

        it('7.6.9. buy token unsuccessfully when native token transfer to seller failed', async () => {
            const fixture = await beforeCommissionMarketplaceTest({
                listSampleCurrencies: true,
                listSampleCommissionToken: true,
            });
            const { commissionMarketplace, seller1, buyer1, deployer, commissionToken } = fixture;
            
            const failReceiver = await deployFailReceiver(deployer);

            await callTransaction(commissionToken.connect(seller1).transferFrom(
                seller1.address,
                failReceiver.address,
                1,
            ));

            let data = commissionToken.interface.encodeFunctionData("setApprovalForAll", [commissionMarketplace.address, true]);
            await callTransaction(failReceiver.call(commissionToken.address, data));

            data = commissionMarketplace.interface.encodeFunctionData("list", [1, 200000, ethers.constants.AddressZero]);

            await callTransaction(failReceiver.call(commissionMarketplace.address, data));

            await expect(commissionMarketplace.connect(buyer1).buy(1, { value: 1e9 }))
                .to.be.revertedWithCustomError(commissionMarketplace, "FailedTransfer");
        });

        it('7.6.10. buy token unsuccessfully when native token transfer to royalty receiver failed', async () => {
            const fixture = await beforeCommissionMarketplaceTest({
                listSampleCurrencies: true,
                listSampleCommissionToken: true,
                listSampleOffers: true,
                fundERC20ForBuyers: true,
            });
            const { commissionMarketplace, buyer1, deployer, commissionToken } = fixture;

            const failReceiver = await deployFailReceiver(deployer);

            commissionToken.setVariable("feeReceiver", failReceiver.address);

            await expect(commissionMarketplace.connect(buyer1).buy(1, { value: 1e9 }))
                .to.be.revertedWithCustomError(commissionMarketplace, "FailedTransfer");
        });

        it('7.6.11. buy token unsuccessfully when refund to sender failed', async () => {
            const fixture = await beforeCommissionMarketplaceTest({
                listSampleCurrencies: true,
                listSampleCommissionToken: true,
                listSampleOffers: true,
                fundERC20ForBuyers: true,
            });
            const { commissionMarketplace, deployer } = fixture;

            const failReceiver = await deployFailReceiver(deployer);

            let data = commissionMarketplace.interface.encodeFunctionData("buy", [1]);

            await expect(failReceiver.call(commissionMarketplace.address, data, { value: 1e9 }))
                .to.be.revertedWithCustomError(commissionMarketplace, "FailedRefund");
        });

        it('7.6.12. buy token unsuccessfully when this contract is reentered', async () => {
            const fixture = await beforeCommissionMarketplaceTest({
                listSampleCurrencies: true,
            });
            const { deployer, estateToken, commissionToken, commissionMarketplace, buyer1 } = fixture;

            const reentrancy = await deployReentrancy(deployer);

            await callTransaction(estateToken.call(
                commissionToken.address,
                commissionToken.interface.encodeFunctionData('mint', [reentrancy.address, 1])
            ));

            let data = commissionMarketplace.interface.encodeFunctionData("list", [1, 200000, ethers.constants.AddressZero]);
            await callTransaction(reentrancy.call(commissionMarketplace.address, data));

            data = commissionToken.interface.encodeFunctionData("setApprovalForAll", [commissionMarketplace.address, true]);
            await callTransaction(reentrancy.call(commissionToken.address, data));

            await testReentrancy_CommissionMarketplace(
                commissionMarketplace,
                reentrancy,
                expect(commissionMarketplace.connect(buyer1).buy(1, { value: 1e9 })).to.be.revertedWithCustomError(commissionMarketplace, "FailedTransfer"),
            );
        });
    });

    describe('7.7. safeBuy(uint256, uint256)', async () => {
        async function testSafeBuyOffer(
            fixture: CommissionMarketplaceFixture,
            mockCurrencyExclusiveRate: BigNumber,
            commissionTokenRoyaltyRate: BigNumber,
            isERC20: boolean,
            isExclusive: boolean,
            price: BigNumber,
        ) {
            const { deployer, estateToken,commissionToken, commissionMarketplace, seller1, buyer1, feeReceiver, admins, admin } = fixture;

            await callCommissionToken_UpdateRoyaltyRate(commissionToken, admins, commissionTokenRoyaltyRate, await admin.nonce());

            const currentTokenId = (await estateToken.estateNumber()).add(1);
            const currentOfferId = (await commissionMarketplace.offerNumber()).add(1);

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

            await callAdmin_UpdateCurrencyRegistries(
                admin,
                admins,
                [newCurrencyAddress],
                [true],
                [isExclusive],
                await admin.nonce(),
            );

            const seller = seller1;
            const buyer = buyer1;

            await callTransaction(estateToken.call(commissionToken.address, commissionToken.interface.encodeFunctionData('mint', [seller.address, currentTokenId])));
            await callTransaction(commissionToken.connect(seller).setApprovalForAll(commissionMarketplace.address, true));
            await estateToken.setVariable("estateNumber", currentTokenId);

            await callTransaction(commissionMarketplace.connect(seller).list(
                currentTokenId,
                price,
                newCurrencyAddress,
            ));

            let royaltyReceiver = feeReceiver.address;
            let royaltyAmount = price.mul(commissionTokenRoyaltyRate).div(Constant.COMMON_RATE_MAX_FRACTION);
            if (isExclusive) {
                royaltyAmount = royaltyAmount.sub(royaltyAmount.mul(mockCurrencyExclusiveRate).div(Constant.COMMON_RATE_MAX_FRACTION));
            }
            let commissionAmount = ethers.BigNumber.from(0);
            let total = price.add(royaltyAmount);

            let ethValue = ethers.BigNumber.from(0);
            await prepareNativeToken(ethers.provider, deployer, [buyer], ethers.utils.parseEther("1.0"));
            if (isERC20) {
                await prepareERC20(newCurrency!, [buyer], [commissionMarketplace], total);
            } else {
                ethValue = total;
                await prepareNativeToken(ethers.provider, deployer, [buyer], total);
            }

            await callTransaction(estateToken.connect(seller).setApprovalForAll(commissionMarketplace.address, true));

            let initBuyerBalance = await getBalance(ethers.provider, buyer.address, newCurrency);
            let initSellerBalance = await getBalance(ethers.provider, seller.address, newCurrency);
            let initFeeReceiverBalance = await getBalance(ethers.provider, feeReceiver.address, newCurrency);

            let tx = await commissionMarketplace.connect(buyer).safeBuy(
                currentOfferId,
                currentTokenId,
                { value: ethValue }
            );
            const receipt = await tx.wait();

            let expectedBuyerBalance = initBuyerBalance.sub(total);
            let expectedSellerBalance = initSellerBalance.add(price);
            let expectedFeeReceiverBalance = initFeeReceiverBalance.add(royaltyAmount.sub(commissionAmount));

            if (!isERC20) {
                const gasFee = receipt.gasUsed.mul(receipt.effectiveGasPrice);
                expectedBuyerBalance = expectedBuyerBalance.sub(gasFee);
            }

            await expect(tx).to
                .emit(commissionMarketplace, 'OfferSale')
                .withArgs(currentOfferId, buyer.address, royaltyReceiver, royaltyAmount);

            let offer = await commissionMarketplace.getOffer(currentOfferId);
            expect(offer.tokenId).to.equal(currentTokenId);
            expect(offer.price).to.equal(price);
            expect(offer.currency).to.equal(newCurrencyAddress);
            expect(offer.state).to.equal(CommissionMarketplaceOfferState.Sold);
            expect(offer.seller).to.equal(seller.address);

            expect(await getBalance(ethers.provider, buyer.address, newCurrency)).to.equal(expectedBuyerBalance);
            expect(await getBalance(ethers.provider, seller.address, newCurrency)).to.equal(expectedSellerBalance);
            expect(await getBalance(ethers.provider, feeReceiver.address, newCurrency)).to.equal(expectedFeeReceiverBalance);

            expect(await commissionToken.ownerOf(currentTokenId)).to.equal(buyer.address);

            let walletsToReset = [seller, buyer, feeReceiver];
            if (isERC20) {
                await resetERC20(newCurrency!, walletsToReset);
            } else {
                await resetNativeToken(ethers.provider, walletsToReset);
                await prepareNativeToken(ethers.provider, deployer, [seller, buyer], ethers.utils.parseEther("1.0"));
            }
        }

        it('7.7.1. buy token successfully (automatic test)', async () => {
            const fixture = await beforeCommissionMarketplaceTest({
                listSampleCurrencies: true,
                listSampleCommissionToken: true,
            });
            const { mockCurrencyExclusiveRate } = fixture;
    
            await testSafeBuyOffer(
                fixture,
                mockCurrencyExclusiveRate,
                LandInitialization.COMMISSION_TOKEN_RoyaltyRate,
                false,
                false,
                ethers.BigNumber.from(200000),
            );

            await testSafeBuyOffer(
                fixture,
                mockCurrencyExclusiveRate,
                LandInitialization.COMMISSION_TOKEN_RoyaltyRate,
                true,
                true,
                ethers.BigNumber.from(500000),
            );
        });

        it('7.7.2. buy token successfully (all flows)', async () => {
            const fixture = await beforeCommissionMarketplaceTest({
                listSampleCurrencies: true,
                listSampleCommissionToken: true,
            });
            const { mockCurrencyExclusiveRate } = fixture;

            for (const isERC20 of [false, true]) {
                for (const isExclusive of [false, true]) {
                    if (!isERC20 && isExclusive) {
                        continue;
                    }
                    await testSafeBuyOffer(
                        fixture,
                        mockCurrencyExclusiveRate,
                        LandInitialization.COMMISSION_TOKEN_RoyaltyRate,
                        isERC20,
                        isExclusive,
                        ethers.BigNumber.from(200000),
                    )
                }
            }
        });

        it('7.7.3. buy token successfully with very large amount (all flows)', async () => {
            const fixture = await beforeCommissionMarketplaceTest({
                listSampleCurrencies: true,
                listSampleCommissionToken: true,
            });

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
                        isERC20,
                        isExclusive,
                        price,
                    )
                }
            }            
        });

        it('7.7.4. buy token unsuccessfully when paused', async () => {
            const fixture = await beforeCommissionMarketplaceTest({
                listSampleCurrencies: true,
                listSampleCommissionToken: true,
                listSampleOffers: true,
                pause: true,
            });
            const { commissionMarketplace, buyer1 } = fixture;

            await expect(commissionMarketplace.connect(buyer1).safeBuy(1, 1, { value: 1e9 }))
                .to.be.revertedWith("Pausable: paused");
        });

        it('7.7.5. buy token unsuccessfully with invalid offer id', async () => {
            const fixture = await beforeCommissionMarketplaceTest({
                listSampleCurrencies: true,
                listSampleCommissionToken: true,
                listSampleOffers: true,
            });
            const { commissionMarketplace, buyer1 } = fixture;

            await expect(commissionMarketplace.connect(buyer1).safeBuy(0, 1, { value: 1e9 }))
                .to.be.revertedWithCustomError(commissionMarketplace, "InvalidOfferId");

            await expect(commissionMarketplace.connect(buyer1).safeBuy(3, 1, { value: 1e9 }))
                .to.be.revertedWithCustomError(commissionMarketplace, "InvalidOfferId");
        });

        it('7.7.6. buy token unsuccessfully when seller buy their own token', async () => {
            const fixture = await beforeCommissionMarketplaceTest({
                listSampleCurrencies: true,
                listSampleCommissionToken: true,
                listSampleOffers: true,
            });
            const { commissionMarketplace, seller1, seller2 } = fixture;

            await expect(commissionMarketplace.connect(seller1).safeBuy(1, 1, { value: 1e9 }))
                .to.be.revertedWithCustomError(commissionMarketplace, "InvalidBuying");

            await expect(commissionMarketplace.connect(seller2).safeBuy(2, 2))
                .to.be.revertedWithCustomError(commissionMarketplace, "InvalidBuying");
        });

        it('7.7.7. buy token unsuccessfully with invalid anchor', async () => {
            const fixture = await beforeCommissionMarketplaceTest({
                listSampleCurrencies: true,
                listSampleCommissionToken: true,
                listSampleOffers: true,
            });
            const { commissionMarketplace, buyer1, buyer2 } = fixture;

            await expect(commissionMarketplace.connect(buyer1).safeBuy(1, 2, { value: 1e9 }))
                .to.be.revertedWithCustomError(commissionMarketplace, "BadAnchor");

            await expect(commissionMarketplace.connect(buyer2).safeBuy(2, 1))
                .to.be.revertedWithCustomError(commissionMarketplace, "BadAnchor");
        });

        it('7.7.8. buy token unsuccessfully when offer is not selling', async () => {
            const fixture = await beforeCommissionMarketplaceTest({
                listSampleCurrencies: true,
                listSampleCommissionToken: true,
                listSampleOffers: true,
            });
            const { commissionMarketplace, buyer1, buyer2 } = fixture;

            await callTransaction(commissionMarketplace.connect(buyer1).safeBuy(1, 1, { value: 1e9 }));

            await expect(commissionMarketplace.connect(buyer2).safeBuy(1, 1, { value: 1e9 }))
                .to.be.revertedWithCustomError(commissionMarketplace, "InvalidBuying");
        });

        it('7.7.9. buy token unsuccessfully with insufficient native token', async () => {
            const fixture = await beforeCommissionMarketplaceTest({
                listSampleCurrencies: true,
                listSampleCommissionToken: true,
                listSampleOffers: true,
            });
            const { commissionMarketplace, buyer1 } = fixture;

            await expect(commissionMarketplace.connect(buyer1).safeBuy(1, 1))
                .to.be.revertedWithCustomError(commissionMarketplace, "InsufficientValue");
        });

        it('7.7.10. buy token unsuccessfully when native token transfer to seller failed', async () => {
            const fixture = await beforeCommissionMarketplaceTest({
                listSampleCurrencies: true,
                listSampleCommissionToken: true,
            });
            const { commissionMarketplace, seller1, buyer1, deployer, commissionToken } = fixture;
            
            const failReceiver = await deployFailReceiver(deployer);

            await callTransaction(commissionToken.connect(seller1).transferFrom(
                seller1.address,
                failReceiver.address,
                1,
            ));

            let data = commissionToken.interface.encodeFunctionData("setApprovalForAll", [commissionMarketplace.address, true]);
            await callTransaction(failReceiver.call(commissionToken.address, data));

            data = commissionMarketplace.interface.encodeFunctionData("list", [1, 200000, ethers.constants.AddressZero]);

            await callTransaction(failReceiver.call(commissionMarketplace.address, data));

            await expect(commissionMarketplace.connect(buyer1).safeBuy(1, 1, { value: 1e9 }))
                .to.be.revertedWithCustomError(commissionMarketplace, "FailedTransfer");
        });

        it('7.7.11. buy token unsuccessfully when native token transfer to royalty receiver failed', async () => {
            const fixture = await beforeCommissionMarketplaceTest({
                listSampleCurrencies: true,
                listSampleCommissionToken: true,
                listSampleOffers: true,
                fundERC20ForBuyers: true,
            });
            const { commissionMarketplace, buyer1, deployer, commissionToken } = fixture;

            const failReceiver = await deployFailReceiver(deployer);

            commissionToken.setVariable("feeReceiver", failReceiver.address);

            await expect(commissionMarketplace.connect(buyer1).safeBuy(1, 1, { value: 1e9 }))
                .to.be.revertedWithCustomError(commissionMarketplace, "FailedTransfer");
        });

        it('7.7.12. buy token unsuccessfully when refund to sender failed', async () => {
            const fixture = await beforeCommissionMarketplaceTest({
                listSampleCurrencies: true,
                listSampleCommissionToken: true,
                listSampleOffers: true,
                fundERC20ForBuyers: true,
            });
            const { commissionMarketplace, deployer } = fixture;

            const failReceiver = await deployFailReceiver(deployer);

            let data = commissionMarketplace.interface.encodeFunctionData("buy", [1]);

            await expect(failReceiver.call(commissionMarketplace.address, data, { value: 1e9 }))
                .to.be.revertedWithCustomError(commissionMarketplace, "FailedRefund");
        });

        it('7.7.13. buy token unsuccessfully when this contract is reentered', async () => {
            const fixture = await beforeCommissionMarketplaceTest({
                listSampleCurrencies: true,
            });
            const { deployer, estateToken, commissionToken, commissionMarketplace, buyer1 } = fixture;

            const reentrancy = await deployReentrancy(deployer);

            await callTransaction(estateToken.call(
                commissionToken.address,
                commissionToken.interface.encodeFunctionData('mint', [reentrancy.address, 1])
            ));

            let data = commissionMarketplace.interface.encodeFunctionData("list", [1, 200000, ethers.constants.AddressZero]);
            await callTransaction(reentrancy.call(commissionMarketplace.address, data));

            data = commissionToken.interface.encodeFunctionData("setApprovalForAll", [commissionMarketplace.address, true]);
            await callTransaction(reentrancy.call(commissionToken.address, data));

            await testReentrancy_CommissionMarketplace(
                commissionMarketplace,
                reentrancy,
                expect(commissionMarketplace.connect(buyer1).safeBuy(1, 1, { value: 1e9 })).to.be.revertedWithCustomError(commissionMarketplace, "FailedTransfer"),
            );
        });
    });

    describe('7.8. cancelOffer(uint256)', async () => {
        it('7.8.1. cancel offer successfully by seller', async () => {
            const fixture = await beforeCommissionMarketplaceTest({
                listSampleCurrencies: true,
                listSampleCommissionToken: true,
                listSampleOffers: true,
                fundERC20ForBuyers: true,
            });
            const { commissionMarketplace, seller1 } = fixture;

            let tx = await commissionMarketplace.connect(seller1).cancel(1);
            await tx.wait();

            const offer = await commissionMarketplace.getOffer(1);
            expect(offer.state).to.equal(CommissionMarketplaceOfferState.Cancelled);

            await expect(tx).to
                .emit(commissionMarketplace, "OfferCancellation")
                .withArgs(1);
        });

        it('7.8.2. cancel offer successfully by manager', async () => {
            const fixture = await beforeCommissionMarketplaceTest({
                listSampleCurrencies: true,
                listSampleCommissionToken: true,
                listSampleOffers: true,
                fundERC20ForBuyers: true,
            });
            const { commissionMarketplace, manager } = fixture;
            let tx = await commissionMarketplace.connect(manager).cancel(1);
            await tx.wait();

            const offer = await commissionMarketplace.getOffer(1);
            expect(offer.state).to.equal(CommissionMarketplaceOfferState.Cancelled);

            await expect(tx).to
                .emit(commissionMarketplace, "OfferCancellation")
                .withArgs(1);
        });

        it('7.8.3. cancel offer unsuccessfully with invalid offer id', async () => {
            const fixture = await beforeCommissionMarketplaceTest({
                listSampleCurrencies: true,
                listSampleCommissionToken: true,
                listSampleOffers: true,
                fundERC20ForBuyers: true,
            });
            const { commissionMarketplace, manager } = fixture;

            await expect(commissionMarketplace.connect(manager).cancel(0))
                .to.be.revertedWithCustomError(commissionMarketplace, "InvalidOfferId");
            await expect(commissionMarketplace.connect(manager).cancel(3))
                .to.be.revertedWithCustomError(commissionMarketplace, "InvalidOfferId");
        });

        it('7.8.4. cancel offer unsuccessfully by unauthorized user', async () => {
            const fixture = await beforeCommissionMarketplaceTest({
                listSampleCurrencies: true,
                listSampleCommissionToken: true,
                listSampleOffers: true,
                fundERC20ForBuyers: true,
            });
            const { commissionMarketplace, seller2, moderator } = fixture;

            await expect(commissionMarketplace.connect(seller2).cancel(1))
                .to.be.revertedWithCustomError(commissionMarketplace, "Unauthorized");

            await expect(commissionMarketplace.connect(moderator).cancel(1))
                .to.be.revertedWithCustomError(commissionMarketplace, "Unauthorized");
        });

        it('7.8.5. cancel offer unsuccessfully when offer is already cancelled', async () => {
            const fixture = await beforeCommissionMarketplaceTest({
                listSampleCurrencies: true,
                listSampleCommissionToken: true,
                listSampleOffers: true,
                fundERC20ForBuyers: true,
            });
            const { commissionMarketplace, manager } = fixture;

            await callTransaction(commissionMarketplace.connect(manager).cancel(1));
            await expect(commissionMarketplace.connect(manager).cancel(1))
                .to.be.revertedWithCustomError(commissionMarketplace, "InvalidCancelling");
        });

        it('7.8.6. cancel offer unsuccessfully when offer is sold out', async () => {
            const fixture = await beforeCommissionMarketplaceTest({
                listSampleCurrencies: true,
                listSampleCommissionToken: true,
                listSampleOffers: true,
                fundERC20ForBuyers: true,
            });
            const { commissionMarketplace, manager, buyer1 } = fixture;

            await callTransaction(commissionMarketplace.connect(buyer1).safeBuy(1, 1, { value: 1e9 }));

            await expect(commissionMarketplace.connect(manager).cancel(1))
                .to.be.revertedWithCustomError(commissionMarketplace, "InvalidCancelling");
        });
    });
});
