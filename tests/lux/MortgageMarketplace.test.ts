import { expect } from 'chai';
import { ethers } from 'hardhat';
import {
    Admin,
    CommissionToken,
    Currency,
    FeeReceiver,
    MockEstateToken,
    MortgageMarketplace,
    MockMortgageToken,
    MockEstateToken__factory,
    MockMortgageToken__factory,
    CommissionToken__factory,
    EstateForger,
    ReserveVault,
    PriceWatcher,
    MockEstateForger,
} from '@typechain-types';
import { callTransaction, prepareERC20, prepareNativeToken, randomWallet, resetERC20, resetNativeToken, testReentrancy } from '@utils/blockchain';
import { Constant } from '@tests/test.constant';
import { deployAdmin } from '@utils/deployments/common/admin';
import { deployFeeReceiver } from '@utils/deployments/common/feeReceiver';
import { deployCurrency } from '@utils/deployments/common/currency';
import { loadFixture, time } from "@nomicfoundation/hardhat-network-helpers";

import { MockContract, smock } from '@defi-wonderland/smock';

import {
    callAdmin_DeclareZones,
    callAdmin_AuthorizeManagers,
    callAdmin_AuthorizeModerators,
    callAdmin_UpdateCurrencyRegistries,
    callAdmin_ActivateIn,
} from '@utils/callWithSignatures/admin';
import { BigNumber } from 'ethers';
import { randomInt } from 'crypto';
import { getInterfaceID, randomBigNumber } from '@utils/utils';
import { OrderedMap } from '@utils/utils';
import { deployEstateMortgageToken } from '@utils/deployments/lend/estateMortgageToken';
import { deployMortgageMarketplace } from '@utils/deployments/lux/mortgageMarketplace';
import { callMortgageMarketplace_Pause } from '@utils/callWithSignatures/mortgageMarketplace';
import { Contract } from 'ethers';
import { MortgageState, MortgageMarketplaceOfferState } from '@utils/models/enums';
import { getBalance } from '@utils/blockchain';
import { deployFailReceiver } from '@utils/deployments/mock/failReceiver';
import { deployReentrancy } from '@utils/deployments/mock/mockReentrancy/reentrancy';
import { Initialization as LandInitialization } from '@tests/land/test.initialization';
import { Initialization as LendInitialization } from '@tests/lend/test.initialization';
import { MockValidator } from '@utils/mockValidator';
import { getRegisterBrokerTx } from '@utils/transaction/CommissionToken';
import { getCallTokenizeEstateTx, getRegisterCustodianTx } from '@utils/transaction/EstateToken';
import { deployEstateForger } from '@utils/deployments/land/estateForger';
import { deployPriceWatcher } from '@utils/deployments/common/priceWatcher';
import { deployReserveVault } from '@utils/deployments/common/reserveVault';
import { RegisterCustodianParams } from '@utils/models/EstateToken';
import { deployMockEstateForger } from '@utils/deployments/mock/mockEstateForger';
import { callEstateToken_AuthorizeTokenizers, callEstateToken_UpdateCommissionToken, callEstateToken_UpdateZoneRoyaltyRate } from '@utils/callWithSignatures/estateToken';

interface MortgageMarketplaceFixture {
    admin: Admin;
    feeReceiver: FeeReceiver;
    currency: Currency;
    estateForger: MockEstateForger;
    estateToken: MockContract<MockEstateToken>;
    commissionToken: MockContract<CommissionToken>;
    mortgageToken: MockContract<MockMortgageToken>;
    mortgageMarketplace: MortgageMarketplace;
    validator: MockValidator;

    deployer: any;
    admins: any[];
    borrower1: any;
    borrower2: any;
    seller1: any;
    seller2: any;
    buyer1: any;
    buyer2: any;
    broker1: any;
    broker2: any;
    custodian1: any;
    custodian2: any;
    manager: any;
    moderator: any;
    mockCurrencyExclusiveRate: BigNumber;

    zone1: string;
    zone2: string;
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

describe('6.3. MortgageMarketplace', async () => {
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
        const broker1 = accounts[Constant.ADMIN_NUMBER + 7];
        const broker2 = accounts[Constant.ADMIN_NUMBER + 8];
        const custodian1 = accounts[Constant.ADMIN_NUMBER + 9];
        const custodian2 = accounts[Constant.ADMIN_NUMBER + 10];
        const manager = accounts[Constant.ADMIN_NUMBER + 11];
        const moderator = accounts[Constant.ADMIN_NUMBER + 12];

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

        const priceWatcher = await deployPriceWatcher(
            deployer.address,
            admin.address
        ) as PriceWatcher;

        const reserveVault = await deployReserveVault(
            deployer.address,
            admin.address
        ) as ReserveVault;

        const validator = new MockValidator(deployer as any);

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
            validator.getAddress(),
            LandInitialization.ESTATE_TOKEN_BaseURI,
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
            LandInitialization.COMMISSION_TOKEN_RoyaltyRate,
        ));

        const estateForger = await deployMockEstateForger(
            deployer,
            admin.address,
            estateToken.address,
            commissionToken.address,
            priceWatcher.address,
            feeReceiver.address,
            reserveVault.address,
            validator.getAddress(),
            LandInitialization.ESTATE_FORGER_BaseMinUnitPrice,
            LandInitialization.ESTATE_FORGER_BaseMaxUnitPrice,
        ) as MockEstateForger;

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
        ));

        const mortgageMarketplace = await deployMortgageMarketplace(
            deployer.address,
            admin.address,
            mortgageToken.address,
            commissionToken.address,
        ) as MortgageMarketplace;

        await callEstateToken_UpdateCommissionToken(
            estateToken,
            admins,
            commissionToken.address,
            await admin.nonce()
        );

        const zone1 = ethers.utils.formatBytes32String("TestZone1");
        const zone2 = ethers.utils.formatBytes32String("TestZone2");

        return {
            admin,
            feeReceiver,
            currency,
            estateForger,
            estateToken,
            commissionToken,
            mortgageToken,
            mortgageMarketplace,
            validator,
            deployer,
            admins,
            borrower1,
            borrower2,
            seller1,
            seller2,
            buyer1,
            buyer2,
            broker1,
            broker2,
            custodian1,
            custodian2,
            manager,
            moderator,
            mockCurrencyExclusiveRate,
            zone1,
            zone2,
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
        const {
            admin,
            admins,
            currency,
            estateForger,
            estateToken,
            commissionToken,
            mortgageToken,
            mortgageMarketplace,
            borrower1,
            borrower2,
            seller1,
            seller2,
            buyer1,
            buyer2,
            broker1,
            broker2,
            custodian1,
            custodian2,
            manager,
            moderator,
            validator,
            zone1,
            zone2
        } = fixture;

        let currentTimestamp = await time.latest();

        await callAdmin_DeclareZones(
            admin,
            admins,
            [zone1, zone2],
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

        for(const zone of [zone1, zone2]) {
            await callAdmin_ActivateIn(
                admin,
                admins,
                zone,
                [manager.address, moderator.address],
                true,
                await admin.nonce(),
            );
        }

        await callEstateToken_AuthorizeTokenizers(
            estateToken,
            admins,
            [estateForger.address],
            true,
            await admin.nonce()
        );

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

        for (const zone of [zone1, zone2]) {
            for (const custodian of [custodian1, custodian2]) {
                const params: RegisterCustodianParams = {
                    zone,
                    custodian: custodian.address,
                    uri: "TestURI",
                };
                await callTransaction(getRegisterCustodianTx(estateToken as any, validator, manager, params))
            }
        }

        await callTransaction(getRegisterBrokerTx(commissionToken as any, manager, {
            zone: zone1,
            broker: broker1.address,
            commissionRate: ethers.utils.parseEther("0.1"),
        }));
        await callTransaction(getRegisterBrokerTx(commissionToken as any, manager, {
            zone: zone2,
            broker: broker2.address,
            commissionRate: ethers.utils.parseEther("0.2"),
        }));

        if (listSampleMortgageToken) {
            await callTransaction(getCallTokenizeEstateTx(estateToken as any, estateForger, {
                totalSupply: BigNumber.from(10_000),
                zone: zone1,
                tokenizationId: BigNumber.from(10),
                uri: "Token1_URI",
                expireAt: currentTimestamp + 1e8,
                custodian: custodian1.address,
                broker: broker1.address,
            }));
            await callTransaction(getCallTokenizeEstateTx(estateToken as any, estateForger, {
                totalSupply: BigNumber.from(10_000),
                zone: zone2,
                tokenizationId: BigNumber.from(10),
                uri: "Token2_URI",
                expireAt: currentTimestamp + 2e8,
                custodian: custodian2.address,
                broker: broker2.address,
            }));

            await callTransaction(mortgageToken.addMortgage(
                1,
                150_000,
                10e5,
                11e5,
                ethers.constants.AddressZero,
                currentTimestamp + 1000,
                MortgageState.Supplied,
                borrower1.address,
                seller1.address,
            ));
            await callTransaction(mortgageToken.addMortgage(
                2,
                200,
                100000,
                110000,
                ethers.constants.AddressZero,
                currentTimestamp + 1100,
                MortgageState.Supplied,
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

    describe('6.3.1. initialize(address, address, address, address)', async () => {
        it('6.3.1.1. Deploy successfully', async () => {
            const { mortgageMarketplace, admin, commissionToken, mortgageToken } = await beforeMortgageMarketplaceTest();

            expect(await mortgageMarketplace.offerNumber()).to.equal(0);

            expect(await mortgageMarketplace.admin()).to.equal(admin.address);
            expect(await mortgageMarketplace.commissionToken()).to.equal(commissionToken.address);
            expect(await mortgageMarketplace.mortgageToken()).to.equal(mortgageToken.address);
        });
    });

    describe('6.3.2. getOffer(uint256)', async () => {
        it('6.3.2.1. return successfully', async () => {
            const fixture = await beforeMortgageMarketplaceTest({
                listSampleCurrencies: true,
                listSampleMortgageToken: true,
                listSampleOffers: true,
            });
            const { mortgageMarketplace } = fixture;

            expect(await mortgageMarketplace.getOffer(1)).to.not.be.reverted;
            expect(await mortgageMarketplace.getOffer(2)).to.not.be.reverted;
        });

        it('6.3.2.2. revert with invalid offer id', async () => {
            const fixture = await beforeMortgageMarketplaceTest({
                listSampleCurrencies: true,
                listSampleMortgageToken: true,
                listSampleOffers: true,
            });
            const { mortgageMarketplace } = fixture;

            // TODO: Why it doesn't revert with InvalidOfferId custom error?

            await expect(mortgageMarketplace.getOffer(0))
                .to.be.revertedWithoutReason();
            await expect(mortgageMarketplace.getOffer(3))
                .to.be.revertedWithoutReason();
        });
    });
    
    describe('6.3.3. list(uint256, uint256, address)', async () => {
        it('6.3.3.1. list token successfully', async () => {
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

        it('6.3.3.2. list token unsuccessfully when paused', async () => {
            const fixture = await beforeMortgageMarketplaceTest({
                listSampleCurrencies: true,
                listSampleMortgageToken: true,
                pause: true,
            });
            const { mortgageMarketplace, seller1 } = fixture;

            await expect(mortgageMarketplace.connect(seller1).list(1, 200000, ethers.constants.AddressZero))
                .to.be.revertedWith('Pausable: paused');
        });

        it('6.3.3.3. list token unsuccessfully with invalid token id', async () => {
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

        it('6.3.3.4. list token unsuccessfully when not token owner', async () => {
            const fixture = await beforeMortgageMarketplaceTest({
                listSampleCurrencies: true,
                listSampleMortgageToken: true,
            });
            const { mortgageMarketplace, seller2 } = fixture;

            await expect(mortgageMarketplace.connect(seller2).list(1, 200000, ethers.constants.AddressZero))
                .to.be.revertedWithCustomError(mortgageMarketplace, 'InvalidTokenId');
        });

        it('6.3.3.5. list token unsuccessfully with zero unit price', async () => {
            const fixture = await beforeMortgageMarketplaceTest({
                listSampleCurrencies: true,
                listSampleMortgageToken: true,
            });
            const { mortgageMarketplace, seller1 } = fixture;

            await expect(mortgageMarketplace.connect(seller1).list(1, 0, ethers.constants.AddressZero))
                .to.be.revertedWithCustomError(mortgageMarketplace, 'InvalidPrice');
        });

        it('6.3.3.6. list token unsuccessfully with invalid currency', async () => {
            const fixture = await beforeMortgageMarketplaceTest({
                listSampleMortgageToken: true,
            });
            const { mortgageMarketplace, seller1 } = fixture;

            await expect(mortgageMarketplace.connect(seller1).list(1, 200000, ethers.constants.AddressZero))
                .to.be.revertedWithCustomError(mortgageMarketplace, 'InvalidCurrency');
        });
    });

    async function testBuyOffer(
        fixture: MortgageMarketplaceFixture,
        mockCurrencyExclusiveRate: BigNumber,
        mortgageTokenRoyaltyRate: BigNumber,
        commissionRate: BigNumber,
        isERC20: boolean,
        isExclusive: boolean,
        price: BigNumber,
        isSafeBuy: boolean,
    ) {
        const { deployer, estateToken, commissionToken, mortgageToken, mortgageMarketplace, borrower1, seller1, buyer1, feeReceiver, admins, admin, zone1, custodian1, manager, estateForger } = fixture;
        
        const broker = randomWallet();
        const zone = zone1;
        const currentEstateId = (await estateToken.estateNumber()).add(1);
        const currentTokenId = (await mortgageToken.mortgageNumber()).add(1);
        const currentOfferId = (await mortgageMarketplace.offerNumber()).add(1);

        await callEstateToken_UpdateZoneRoyaltyRate(
            estateToken,
            admins,
            zone,
            mortgageTokenRoyaltyRate,
            await admin.nonce()
        );

        await callTransaction(getRegisterBrokerTx(commissionToken as any, manager, {
            zone,
            broker: broker.address,
            commissionRate,
        }));

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

        let currentTimestamp = await time.latest();

        const borrower = borrower1;
        const seller = seller1;
        const buyer = buyer1;

        await callTransaction(getCallTokenizeEstateTx(estateToken as any, estateForger, {
            totalSupply: BigNumber.from(10_000),
            zone,
            tokenizationId: BigNumber.from(10),
            uri: "Token1_URI",
            expireAt: currentTimestamp + 1e8,
            custodian: custodian1.address,
            broker: broker.address,
        }));


        await callTransaction(mortgageToken.addMortgage(
            currentEstateId,
            150_000,
            10e5,
            11e5,
            newCurrencyAddress,
            currentTimestamp + 1000,
            MortgageState.Supplied,
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
        let commissionAmount = royaltyAmount.mul(commissionRate).div(Constant.COMMON_RATE_MAX_FRACTION);

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
        let initBrokerBalance = await getBalance(ethers.provider, broker.address, newCurrency);

        let tx;
        if (isSafeBuy) {
            tx = await mortgageMarketplace.connect(buyer).safeBuy(
                currentOfferId,
                currentEstateId,
                { value: ethValue }
            );
        } else {
            tx = await mortgageMarketplace.connect(buyer).buy(
                currentOfferId,
                { value: ethValue }
            );
        }
        const receipt = await tx.wait();

        let expectedBuyerBalance = initBuyerBalance.sub(total);
        let expectedSellerBalance = initSellerBalance.add(price);
        let expectedFeeReceiverBalance = initFeeReceiverBalance.add(royaltyAmount.sub(commissionAmount));
        let expectedBrokerBalance = initBrokerBalance.add(commissionAmount);

        if (!isERC20) {
            const gasFee = receipt.gasUsed.mul(receipt.effectiveGasPrice);
            expectedBuyerBalance = expectedBuyerBalance.sub(gasFee);
        }

        await expect(tx).to.emit(mortgageMarketplace, 'CommissionDispatch').withArgs(
            broker.address,
            commissionAmount,
            newCurrencyAddress,
        );
        await expect(tx).to.emit(mortgageMarketplace, 'OfferSale').withArgs(
            currentOfferId,
            buyer.address,
            royaltyReceiver,
            royaltyAmount,
        );

        let offer = await mortgageMarketplace.getOffer(currentOfferId);
        expect(offer.tokenId).to.equal(currentTokenId);
        expect(offer.price).to.equal(price);
        expect(offer.currency).to.equal(newCurrencyAddress);
        expect(offer.state).to.equal(MortgageMarketplaceOfferState.Sold);
        expect(offer.seller).to.equal(seller.address);

        expect(await getBalance(ethers.provider, buyer.address, newCurrency)).to.equal(expectedBuyerBalance);
        expect(await getBalance(ethers.provider, seller.address, newCurrency)).to.equal(expectedSellerBalance);
        expect(await getBalance(ethers.provider, feeReceiver.address, newCurrency)).to.equal(expectedFeeReceiverBalance);
        expect(await getBalance(ethers.provider, broker.address, newCurrency)).to.equal(expectedBrokerBalance);

        expect(await mortgageToken.ownerOf(currentTokenId)).to.equal(buyer.address);

        let walletsToReset = [seller, buyer, feeReceiver, broker];
        if (isERC20) {
            await resetERC20(newCurrency!, walletsToReset);
        } else {
            await resetNativeToken(ethers.provider, walletsToReset);
            await prepareNativeToken(ethers.provider, deployer, [seller, buyer], ethers.utils.parseEther("1.0"));
        }
    }

    describe('6.3.4. buy(uint256)', async () => {
        it('6.3.4.1. buy token successfully in native and erc20 token', async () => {
            const fixture = await beforeMortgageMarketplaceTest({
                listSampleCurrencies: true,
                listSampleMortgageToken: true,
            });
            const { mockCurrencyExclusiveRate } = fixture;
    
            await testBuyOffer(
                fixture,
                mockCurrencyExclusiveRate,
                LendInitialization.MORTGAGE_TOKEN_RoyaltyRate,
                ethers.utils.parseEther("0.1"),
                false,
                false,
                ethers.BigNumber.from(200000),
                false,
            );

            await testBuyOffer(
                fixture,
                mockCurrencyExclusiveRate,
                LendInitialization.MORTGAGE_TOKEN_RoyaltyRate,
                ethers.utils.parseEther("0.1"),
                true,
                false,
                ethers.BigNumber.from(500000),
                false,
            );
        });

        it('6.3.4.2. buy token successfully in all native/erc20 and exclusive/non-exclusive combinations', async () => {
            const fixture = await beforeMortgageMarketplaceTest({
                listSampleCurrencies: true,
                listSampleMortgageToken: true,
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
                        LendInitialization.MORTGAGE_TOKEN_RoyaltyRate,
                        ethers.utils.parseEther("0.1"),
                        isERC20,
                        isExclusive,
                        ethers.BigNumber.from(200000),
                        false,
                    )
                }
            }
        });

        it('6.3.4.3. buy token successfully with very large amount in all native/erc20 and exclusive/non-exclusive combinations', async () => {
            const fixture = await beforeMortgageMarketplaceTest({
                listSampleCurrencies: true,
                listSampleMortgageToken: true,
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
                        ethers.utils.parseEther("0.99"),
                        isERC20,
                        isExclusive,
                        price,
                        false,
                    )
                }
            }
        });

        it('6.3.4.4. buy token unsuccessfully when paused', async () => {
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

        it('6.3.4.5. buy token unsuccessfully with invalid offer id', async () => {
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

        it('6.3.4.6. buy token unsuccessfully when seller buy their own token', async () => {
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

        it('6.3.4.7. buy token unsuccessfully when offer is not selling', async () => {
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

        it('6.3.4.8. buy token unsuccessfully with insufficient native token', async () => {
            const fixture = await beforeMortgageMarketplaceTest({
                listSampleCurrencies: true,
                listSampleMortgageToken: true,
                listSampleOffers: true,
            });
            const { mortgageMarketplace, buyer1 } = fixture;

            await expect(mortgageMarketplace.connect(buyer1).buy(1))
                .to.be.revertedWithCustomError(mortgageMarketplace, "InsufficientValue");
        });

        it('6.3.4.9. buy token unsuccessfully when native token transfer to seller failed', async () => {
            const fixture = await beforeMortgageMarketplaceTest({
                listSampleCurrencies: true,
                listSampleMortgageToken: true,
            });
            const { mortgageMarketplace, seller1, buyer1, deployer, mortgageToken } = fixture;
            
            const failReceiver = await deployFailReceiver(deployer, true, false);

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

        it('6.3.4.10. buy token unsuccessfully when native token transfer to royalty receiver failed', async () => {
            const fixture = await beforeMortgageMarketplaceTest({
                listSampleCurrencies: true,
                listSampleMortgageToken: true,
                listSampleOffers: true,
                fundERC20ForBuyers: true,
            });
            const { mortgageMarketplace, buyer1, deployer, mortgageToken } = fixture;

            const failReceiver = await deployFailReceiver(deployer, true, false);

            mortgageToken.setVariable("feeReceiver", failReceiver.address);

            await expect(mortgageMarketplace.connect(buyer1).buy(1, { value: 1e9 }))
                .to.be.revertedWithCustomError(mortgageMarketplace, "FailedTransfer");
        });

        it('6.3.4.11. buy token unsuccessfully when refund to sender failed', async () => {
            const fixture = await beforeMortgageMarketplaceTest({
                listSampleCurrencies: true,
                listSampleMortgageToken: true,
                listSampleOffers: true,
                fundERC20ForBuyers: true,
            });
            const { mortgageMarketplace, deployer } = fixture;

            const failReceiver = await deployFailReceiver(deployer, true, false);

            let data = mortgageMarketplace.interface.encodeFunctionData("buy", [1]);

            await expect(failReceiver.call(mortgageMarketplace.address, data, { value: 1e9 }))
                .to.be.revertedWithCustomError(mortgageMarketplace, "FailedRefund");
        });

        it('6.3.4.12. buy token unsuccessfully when this contract is reentered', async () => {
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

    describe('6.3.5. safeBuy(uint256, uint256)', async () => {
        it('6.3.5.1. buy token successfully', async () => {
            const fixture = await beforeMortgageMarketplaceTest({
                listSampleCurrencies: true,
                listSampleMortgageToken: true,
            });
            const { mockCurrencyExclusiveRate } = fixture;
    
            await testBuyOffer(
                fixture,
                mockCurrencyExclusiveRate,
                LendInitialization.MORTGAGE_TOKEN_RoyaltyRate,
                ethers.utils.parseEther("0.1"),
                false,
                false,
                ethers.BigNumber.from(200000),
                true,
            );

            await testBuyOffer(
                fixture,
                mockCurrencyExclusiveRate,
                LendInitialization.MORTGAGE_TOKEN_RoyaltyRate,
                ethers.utils.parseEther("0.1"),
                true,
                false,
                ethers.BigNumber.from(500000),
                true,
            );
        });

        it('6.3.5.2. buy token unsuccessfully with invalid offer id', async () => {
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

        it('6.3.5.3. buy token unsuccessfully with invalid anchor', async () => {
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
    });

    describe('6.3.6. cancelOffer(uint256)', async () => {
        it('6.3.6.1. cancel offer successfully by seller', async () => {
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

        it('6.3.6.2. cancel offer successfully by manager', async () => {
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

        it('6.3.6.3. cancel offer unsuccessfully with invalid offer id', async () => {
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

        it('6.3.6.4. cancel offer unsuccessfully by unauthorized user', async () => {
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

        it('6.3.6.5. cancel offer unsuccessfully when offer is already cancelled', async () => {
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

        it('6.3.6.6. cancel offer unsuccessfully when offer is sold out', async () => {
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
