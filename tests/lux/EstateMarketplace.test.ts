import { expect } from 'chai';
import { ethers, upgrades } from 'hardhat';
import {
    Admin,
    CommissionToken,
    Currency,
    FeeReceiver,
    MockEstateToken,
    MockEstateForger__factory,
    EstateMarketplace,
    MockEstateToken__factory,
    MockEstateForger,
    CommissionToken__factory,
    PriceWatcher,
    ReserveVault,
} from '@typechain-types';
import { callTransaction, expectRevertWithModifierCustomError, getBalance, prepareERC20, prepareNativeToken, randomWallet, resetERC20, resetNativeToken, testReentrancy } from '@utils/blockchain';
import { Constant } from '@tests/test.constant';
import { deployAdmin } from '@utils/deployments/common/admin';
import { deployFeeReceiver } from '@utils/deployments/common/feeReceiver';
import { deployCurrency } from '@utils/deployments/common/currency';
import { loadFixture, time } from "@nomicfoundation/hardhat-network-helpers";
import { EstateMarketplaceOfferState } from '@utils/models/enums';
import { MockContract, smock } from '@defi-wonderland/smock';

import {
    callAdmin_ActivateIn,
    callAdmin_AuthorizeManagers,
    callAdmin_AuthorizeModerators,
    callAdmin_DeclareZone,
    callAdmin_UpdateCurrencyRegistries,
} from '@utils/callWithSignatures/admin';
import { BigNumber, Contract, Wallet } from 'ethers';
import { randomInt } from 'crypto';
import { getInterfaceID, randomArrayWithSum, randomBigNumber } from '@utils/utils';
import { OrderedMap } from '@utils/utils';
import { deployEstateMarketplace } from '@utils/deployments/lux/estateMarketplace';
import { callEstateToken_AuthorizeTokenizers, callEstateToken_UpdateCommissionToken, callEstateToken_UpdateZoneRoyaltyRate } from '@utils/callWithSignatures/estateToken';
import { callEstateMarketplace_Pause } from '@utils/callWithSignatures/estateMarketplace';
import { deployFailReceiver } from '@utils/deployments/mock/failReceiver';
import { deployReentrancyERC1155Holder } from '@utils/deployments/mock/mockReentrancy/reentrancyERC1155Holder';
import { deployReentrancy } from '@utils/deployments/mock/mockReentrancy/reentrancy';
import { Initialization as LandInitialization } from '@tests/land/test.initialization';
import { deployPriceWatcher } from '@utils/deployments/common/priceWatcher';
import { deployReserveVault } from '@utils/deployments/common/reserveVault';
import { MockValidator } from '@utils/mockValidator';
import { RegisterCustodianParams } from '@utils/models/EstateToken';
import { getCallTokenizeEstateTx, getRegisterCustodianTx } from '@utils/transaction/EstateToken';
import { getRegisterBrokerTx } from '@utils/transaction/CommissionToken';

interface EstateMarketplaceFixture {
    admin: Admin;
    feeReceiver: FeeReceiver;
    currency: Currency;
    priceWatcher: PriceWatcher;
    reserveVault: ReserveVault;
    estateForger: MockContract<MockEstateForger>;
    estateToken: MockContract<MockEstateToken>;
    commissionToken: MockContract<CommissionToken>;
    estateMarketplace: EstateMarketplace;
    validator: MockValidator;

    deployer: any;
    admins: any[];
    seller1: any;
    seller2: any;
    buyer1: any;
    buyer2: any;
    custodian1: any;
    custodian2: any;
    broker1: any;
    broker2: any;
    manager: any;
    moderator: any;
    zone1: any;
    zone2: any;
    mockCurrencyExclusiveRate: BigNumber;
}

async function testReentrancy_Marketplace(
    estateMarketplace: EstateMarketplace,
    reentrancyContract: Contract,
    assertion: any,
) {
    let data = [
        estateMarketplace.interface.encodeFunctionData("buy(uint256)", [0]),
        estateMarketplace.interface.encodeFunctionData("buy(uint256,uint256)", [0, 0]),
        estateMarketplace.interface.encodeFunctionData("safeBuy(uint256,uint256)", [0, 0]),
        estateMarketplace.interface.encodeFunctionData("safeBuy(uint256,uint256,uint256)", [0, 0, 0]),
        estateMarketplace.interface.encodeFunctionData("cancel", [0]),
    ];

    await testReentrancy(
        reentrancyContract,
        estateMarketplace,
        data,
        assertion,
    );
}

describe('6.2. EstateMarketplace', async () => {
    async function estateMarketplaceFixture(): Promise<EstateMarketplaceFixture> {
        const accounts = await ethers.getSigners();
        const deployer = accounts[0];
        const admins = [];
        for (let i = 1; i <= Constant.ADMIN_NUMBER; ++i) admins.push(accounts[i]);
        const seller1 = accounts[Constant.ADMIN_NUMBER + 1];
        const seller2 = accounts[Constant.ADMIN_NUMBER + 2];
        const buyer1 = accounts[Constant.ADMIN_NUMBER + 3];
        const buyer2 = accounts[Constant.ADMIN_NUMBER + 4];
        const broker1 = accounts[Constant.ADMIN_NUMBER + 5];
        const broker2 = accounts[Constant.ADMIN_NUMBER + 6];
        const manager = accounts[Constant.ADMIN_NUMBER + 7];
        const moderator = accounts[Constant.ADMIN_NUMBER + 8];
        const custodian1 = accounts[Constant.ADMIN_NUMBER + 9];
        const custodian2 = accounts[Constant.ADMIN_NUMBER + 10];

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
            admin.address,
        ) as PriceWatcher;

        const reserveVault = await deployReserveVault(
            deployer.address,
            admin.address,
        ) as ReserveVault;

        const validator = new MockValidator(deployer as any);

        const currency = await deployCurrency(
            deployer.address,
            'MockCurrency',
            'MCK'
        ) as Currency;

        const mockCurrencyExclusiveRate = ethers.utils.parseEther("0.3");
        await currency.setExclusiveDiscount(mockCurrencyExclusiveRate, Constant.COMMON_RATE_DECIMALS);

        const SmockEstateTokenFactory = await smock.mock<MockEstateToken__factory>('MockEstateToken');
        const estateToken = await SmockEstateTokenFactory.deploy();
        await callTransaction(estateToken.initialize(
            admin.address,
            feeReceiver.address,
            validator.getAddress(),
            LandInitialization.ESTATE_TOKEN_BaseURI,
        ));        

        const SmockCommissionTokenFactory = await smock.mock<CommissionToken__factory>('CommissionToken');
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

        const SmockEstateForgerFactory = await smock.mock<MockEstateForger__factory>('MockEstateForger');
        const estateForger = await SmockEstateForgerFactory.deploy();
        await callTransaction(estateForger.initialize(
            admin.address,
            estateToken.address,
            commissionToken.address,
            priceWatcher.address,
            feeReceiver.address,
            reserveVault.address,
            validator.getAddress(),
            LandInitialization.ESTATE_FORGER_BaseMinUnitPrice,
            LandInitialization.ESTATE_FORGER_BaseMaxUnitPrice,
        ));

        const estateMarketplace = await deployEstateMarketplace(
            deployer.address,
            admin.address,
            estateToken.address,
            commissionToken.address,
        ) as EstateMarketplace;

        const zone1 = ethers.utils.formatBytes32String("TestZone1");
        const zone2 = ethers.utils.formatBytes32String("TestZone2");

        return {
            admin,
            feeReceiver,
            currency,
            priceWatcher,
            reserveVault,
            estateForger,
            estateToken,
            commissionToken,
            estateMarketplace,
            validator,
            deployer,
            admins,
            seller1,
            seller2,
            buyer1,
            buyer2,
            custodian1,
            custodian2,
            broker1,
            broker2,
            manager,
            moderator,
            zone1,
            zone2,
            mockCurrencyExclusiveRate,
        };
    };

    async function beforeEstateMarketplaceTest({
        listSampleCurrencies = false,
        listSampleEstateToken = false,
        listSampleOffers = false,
        fundERC20ForBuyers = false,
        pause = false,
    } = {}): Promise<EstateMarketplaceFixture> {
        const fixture = await loadFixture(estateMarketplaceFixture);

        const { admin, admins, currency, estateToken, commissionToken, estateMarketplace, seller1, seller2, buyer1, buyer2, estateForger, manager, moderator, custodian1, custodian2, broker1, broker2, zone1, zone2, validator } = fixture;

        for (const zone of [zone1, zone2]) {
            await callAdmin_DeclareZone(
                admin,
                admins,
                zone,
                await admin.nonce(),
            );
        }
        await callAdmin_AuthorizeManagers(
            admin,
            admins,
            [manager.address],
            true,
            await admin.nonce(),
        );
        await callAdmin_AuthorizeModerators(
            admin,
            admins,
            [moderator.address],
            true,
            await admin.nonce(),
        );

        await callEstateToken_AuthorizeTokenizers(
            estateToken,
            admins,
            [estateForger.address],
            true,
            await admin.nonce()
        );
        await callEstateToken_UpdateCommissionToken(
            estateToken,
            admins,
            commissionToken.address,
            await admin.nonce(),
        );

        for (const zone of [zone1, zone2]) {
            await callAdmin_ActivateIn(
                admin,
                admins,
                zone,
                [manager.address, moderator.address],
                true,
                await admin.nonce(),
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

        let currentTimestamp = await time.latest();
        
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
        if (listSampleEstateToken) {
            currentTimestamp += 1000;

            await time.setNextBlockTimestamp(currentTimestamp);

            await callTransaction(getCallTokenizeEstateTx(estateToken as any, estateForger, {
                totalSupply: BigNumber.from(0),
                zone: zone1,
                tokenizationId: BigNumber.from(10),
                uri: "Token1_URI",
                expireAt: currentTimestamp + 1e8,
                custodian: custodian1.address,
                broker: broker1.address,
            }))

            await callTransaction(getCallTokenizeEstateTx(estateToken as any, estateForger, {
                totalSupply: BigNumber.from(0),
                zone: zone2,
                tokenizationId: BigNumber.from(10),
                uri: "Token2_URI",
                expireAt: currentTimestamp + 2e8,
                custodian: custodian2.address,
                broker: broker2.address,
            }))

            estateToken.isAvailable.whenCalledWith(1).returns(true);
            estateToken.isAvailable.whenCalledWith(2).returns(true);

            await estateToken.mint(seller1.address, 1, 200_000);
            await estateToken.mint(seller2.address, 1, 300_000);

            await estateToken.mint(seller1.address, 2, 200);
            await estateToken.mint(seller2.address, 2, 300);
        }

        if (listSampleOffers) {
            await callTransaction(estateMarketplace.connect(seller1).list(
                1, 150_000, ethers.utils.parseEther("100"), ethers.constants.AddressZero, true
            ));
            await callTransaction(estateMarketplace.connect(seller2).list(
                2, 200, ethers.utils.parseEther("500000"), currency.address, true
            ));

            await callTransaction(estateToken.connect(seller1).setApprovalForAll(estateMarketplace.address, true));
            await callTransaction(estateToken.connect(seller2).setApprovalForAll(estateMarketplace.address, true));
        }

        if (fundERC20ForBuyers) {
            await prepareERC20(
                currency,
                [buyer1, buyer2],
                [estateMarketplace],
                1e9,
            )
        }

        if (pause) {
            await callEstateMarketplace_Pause(estateMarketplace, admins, await admin.nonce());
        }

        return {
            ...fixture,
        }
    }

    describe('6.2.1. initialize(address, address, address)', async () => {
        it('6.2.1.1. Deploy successfully', async () => {
            const { admin, estateToken, commissionToken, estateMarketplace } = await beforeEstateMarketplaceTest();

            const paused = await estateMarketplace.paused();
            expect(paused).to.equal(false);

            const adminAddress = await estateMarketplace.admin();
            expect(adminAddress).to.equal(admin.address);

            const estateTokenAddress = await estateMarketplace.estateToken();
            expect(estateTokenAddress).to.equal(estateToken.address);

            const commissionTokenAddress = await estateMarketplace.commissionToken();
            expect(commissionTokenAddress).to.equal(commissionToken.address);

            const offerNumber = await estateMarketplace.offerNumber();
            expect(offerNumber).to.equal(0);
        });
    });

    describe('6.2.2. getOffer(uint256)', async () => {
        it('6.2.2.1. return successfully with valid offer id', async () => {
            const { estateMarketplace, estateToken, currency, seller1, seller2 } = await beforeEstateMarketplaceTest({
                listSampleCurrencies: true,
                listSampleEstateToken: true,
                listSampleOffers: true,
            });

            await expect(estateMarketplace.getOffer(1))
                .to.not.be.reverted;

            await expect(estateMarketplace.getOffer(2))
                .to.not.be.reverted;
        });

        it('6.2.2.2. revert with invalid offer id', async () => {
            const { estateMarketplace } = await beforeEstateMarketplaceTest({
                listSampleCurrencies: true,
                listSampleEstateToken: true,
                listSampleOffers: true,
            });

            await expectRevertWithModifierCustomError(
                estateMarketplace,
                estateMarketplace.getOffer(0),
                'InvalidOfferId'
            );
            await expectRevertWithModifierCustomError(
                estateMarketplace,
                estateMarketplace.getOffer(3),
                'InvalidOfferId'
            );
        });
    });

    describe('6.2.3. list(uint256, uint256, uint256, address, bool)', async () => {
        it('6.2.3.1. list token successfully', async () => {
            const { estateMarketplace, estateToken, currency, seller1, seller2 } = await beforeEstateMarketplaceTest({
                listSampleCurrencies: true,
                listSampleEstateToken: true,
            });
            let tx = await estateMarketplace.connect(seller1).list(
                1,
                150_000,
                ethers.utils.parseEther("100"),
                ethers.constants.AddressZero,
                false
            );
            await tx.wait();

            expect(tx).to
                .emit(estateMarketplace, 'NewOffer')
                .withArgs(
                    1,
                    1,
                    seller1.address,
                    150_000,
                    ethers.utils.parseEther("100"),
                    ethers.constants.AddressZero,
                    false
                );

            expect(await estateMarketplace.offerNumber()).to.equal(1);

            let offer = await estateMarketplace.getOffer(1);
            expect(offer.tokenId).to.equal(1);
            expect(offer.sellingAmount).to.equal(150_000);
            expect(offer.soldAmount).to.equal(0);
            expect(offer.unitPrice).to.equal(ethers.utils.parseEther("100"));
            expect(offer.currency).to.equal(ethers.constants.AddressZero);
            expect(offer.isDivisible).to.equal(false);
            expect(offer.state).to.equal(EstateMarketplaceOfferState.Selling);
            expect(offer.seller).to.equal(seller1.address);

            tx = await estateMarketplace.connect(seller2).list(
                2,
                200,
                ethers.utils.parseEther("500000"),
                currency.address,
                true
            );
            await tx.wait();

            expect(tx).to
                .emit(estateMarketplace, 'NewOffer')
                .withArgs(
                    2,
                    2,
                    seller2.address,
                    200,
                    ethers.utils.parseEther("500000"),
                    currency.address,
                    true
                );

            expect(await estateMarketplace.offerNumber()).to.equal(2);

            offer = await estateMarketplace.getOffer(2);
            expect(offer.tokenId).to.equal(2);
            expect(offer.sellingAmount).to.equal(200);
            expect(offer.soldAmount).to.equal(0);
            expect(offer.unitPrice).to.equal(ethers.utils.parseEther("500000"));
            expect(offer.currency).to.equal(currency.address);
            expect(offer.isDivisible).to.equal(true);
            expect(offer.state).to.equal(EstateMarketplaceOfferState.Selling);
            expect(offer.seller).to.equal(seller2.address);
        });

        it('6.2.3.2. list token unsuccessfully when paused', async () => {
            const fixture = await beforeEstateMarketplaceTest({
                listSampleCurrencies: true,
                listSampleEstateToken: true,
                pause: true,
            });
            const { estateMarketplace, seller1 } = fixture;

            await expect(estateMarketplace.connect(seller1).list(1, 100, 1000, ethers.constants.AddressZero, false))
                .to.be.revertedWith('Pausable: paused');
        });

        it('6.2.3.3. list token unsuccessfully with invalid token id', async () => {
            const fixture = await beforeEstateMarketplaceTest({
                listSampleCurrencies: true,
                listSampleEstateToken: true,
            });
            const { estateMarketplace, seller1 } = fixture;

            await expect(estateMarketplace.connect(seller1).list(0, 100, 1000, ethers.constants.AddressZero, false))
                .to.be.revertedWithCustomError(estateMarketplace, 'InvalidTokenId');

            await expect(estateMarketplace.connect(seller1).list(3, 100, 1000, ethers.constants.AddressZero, false))
                .to.be.revertedWithCustomError(estateMarketplace, 'InvalidTokenId');
        });

        it('6.2.3.4. list token unsuccessfully with zero unit price', async () => {
            const fixture = await beforeEstateMarketplaceTest({
                listSampleCurrencies: true,
                listSampleEstateToken: true,
            });
            const { estateMarketplace, seller1 } = fixture;

            await expect(estateMarketplace.connect(seller1).list(1, 100, 0, ethers.constants.AddressZero, false))
                .to.be.revertedWithCustomError(estateMarketplace, 'InvalidUnitPrice');
        });

        it('6.2.3.5. list token unsuccessfully with invalid currency', async () => {
            const fixture = await beforeEstateMarketplaceTest({
                listSampleEstateToken: true,
            });
            const { estateMarketplace, seller1 } = fixture;

            await expect(estateMarketplace.connect(seller1).list(1, 100, 1000, ethers.constants.AddressZero, false))
                .to.be.revertedWithCustomError(estateMarketplace, 'InvalidCurrency');
        });

        it('6.2.3.6. list token unsuccessfully with zero selling amount', async () => {
            const fixture = await beforeEstateMarketplaceTest({
                listSampleCurrencies: true,
                listSampleEstateToken: true,
            });
            const { estateMarketplace, seller1 } = fixture;

            await expect(estateMarketplace.connect(seller1).list(1, 0, 1000, ethers.constants.AddressZero, false))
                .to.be.revertedWithCustomError(estateMarketplace, 'InvalidSellingAmount');
        });

        it('6.2.3.7. list token unsuccessfully with selling amount exceeding owned amount', async () => {
            const fixture = await beforeEstateMarketplaceTest({
                listSampleCurrencies: true,
                listSampleEstateToken: true,
            });
            const { estateMarketplace, seller1 } = fixture;

            await expect(estateMarketplace.connect(seller1).list(1, 200_001, 1000, ethers.constants.AddressZero, false))
                .to.be.revertedWithCustomError(estateMarketplace, 'InvalidSellingAmount');
        });
    });

    async function testBuyOffer(
        fixture: EstateMarketplaceFixture,
        mockCurrencyExclusiveRate: BigNumber,
        commissionRate: BigNumber,
        estateTokenRoyaltyRate: BigNumber,
        isERC20: boolean,
        isExclusive: boolean,
        initialAmount: BigNumber,
        offerAmount: BigNumber,
        unitPrice: BigNumber,
        seller: Wallet,
        buyRecords: {
            buyer: Wallet,
            amount: BigNumber | null,
        }[],
        isDivisible: boolean,
        isSafeBuy: boolean,
    ) {
        const { deployer, estateForger, estateToken, estateMarketplace, feeReceiver, commissionToken, zone1, admins, admin, custodian1, manager } = fixture;
        const decimals = Constant.ESTATE_TOKEN_MAX_DECIMALS;

        const zone = zone1;
        const broker = randomWallet();

        await callEstateToken_UpdateZoneRoyaltyRate(
            estateToken as any,
            admins,
            zone,
            estateTokenRoyaltyRate,
            await admin.nonce()
        );

        const currentEstateId = (await estateToken.estateNumber()).add(1);
        const currentOfferId = (await estateMarketplace.offerNumber()).add(1);

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

        await callTransaction(getCallTokenizeEstateTx(estateToken as any, estateForger, {
            totalSupply: BigNumber.from(0),
            zone,
            tokenizationId: BigNumber.from(0),
            uri: `Token_${currentEstateId}`,
            expireAt: currentTimestamp + 1e8,
            custodian: custodian1.address,
            broker: broker.address,
        }));

        await callTransaction(estateToken.mint(seller.address, currentEstateId, initialAmount));

        await callTransaction(estateMarketplace.connect(seller).list(
            currentEstateId,
            offerAmount,
            unitPrice,
            newCurrencyAddress,
            isDivisible,
        ));

        let totalSold = ethers.BigNumber.from(0);
        let totalBought = new Map<string, BigNumber>();

        for (const { buyer, amount: ogAmount } of buyRecords) {
            const amount = ogAmount || offerAmount.sub(totalSold);

            let value = amount.mul(unitPrice).div(ethers.BigNumber.from(10).pow(decimals));
            let royaltyAmount = value.mul(estateTokenRoyaltyRate).div(Constant.COMMON_RATE_MAX_FRACTION);
            if (isExclusive) {
                royaltyAmount = royaltyAmount.sub(royaltyAmount.mul(mockCurrencyExclusiveRate).div(Constant.COMMON_RATE_MAX_FRACTION));
            }
            let commissionAmount = royaltyAmount.mul(commissionRate).div(Constant.COMMON_RATE_MAX_FRACTION);
            let total = value.add(royaltyAmount);

            let ethValue = ethers.BigNumber.from(0);
            await prepareNativeToken(ethers.provider, deployer, [buyer], ethers.utils.parseEther("1.0"));
            if (isERC20) {
                await prepareERC20(newCurrency!, [buyer], [estateMarketplace], total);
            } else {
                ethValue = total;
                await prepareNativeToken(ethers.provider, deployer, [buyer], total);
            }

            await callTransaction(estateToken.connect(seller).setApprovalForAll(estateMarketplace.address, true));

            let initBuyerBalance = await getBalance(ethers.provider, buyer.address, newCurrency);
            let initSellerBalance = await getBalance(ethers.provider, seller.address, newCurrency);
            let initFeeReceiverBalance = await getBalance(ethers.provider, feeReceiver.address, newCurrency);
            let initBrokerBalance = await getBalance(ethers.provider, broker.address, newCurrency);

            let tx;
            if (ogAmount === null) {
                if (isSafeBuy) {
                    tx = await estateMarketplace.connect(buyer)["safeBuy(uint256,uint256)"](
                        currentOfferId,
                        currentEstateId,
                        { value: ethValue }
                    );
                } else {
                    tx = await estateMarketplace.connect(buyer)["buy(uint256)"](
                        currentOfferId,
                        { value: ethValue }
                    );
                }
            } else {
                if (isSafeBuy) {
                    tx = await estateMarketplace.connect(buyer)["safeBuy(uint256,uint256,uint256)"](
                        currentOfferId,
                        amount,
                        currentEstateId,
                        { value: ethValue }
                    );
                } else {
                    tx = await estateMarketplace.connect(buyer)["buy(uint256,uint256)"](
                        currentOfferId,
                        amount,
                        { value: ethValue }
                    );
                }
            }
            const receipt = await tx.wait();

            let expectedBuyerBalance = initBuyerBalance.sub(total);
            let expectedSellerBalance = initSellerBalance.add(value);
            let expectedFeeReceiverBalance = initFeeReceiverBalance.add(royaltyAmount.sub(commissionAmount));
            let expectedBrokerBalance = initBrokerBalance.add(commissionAmount);

            if (!isERC20) {
                const gasFee = receipt.gasUsed.mul(receipt.effectiveGasPrice);
                expectedBuyerBalance = expectedBuyerBalance.sub(gasFee);
            }

            await expect(tx).to.emit(estateMarketplace, 'CommissionDispatch').withArgs(
                broker.address,
                commissionAmount,
                newCurrencyAddress,
            );

            await expect(tx).to.emit(estateMarketplace, 'OfferSale').withArgs(
                currentOfferId,
                buyer.address,
                amount,
                value,
            );
            
            totalSold = totalSold.add(amount);

            let totalBoughtOfBuyer = (totalBought.get(buyer.address) || ethers.BigNumber.from(0)).add(amount);
            totalBought.set(buyer.address, totalBoughtOfBuyer);

            let offer = await estateMarketplace.getOffer(currentOfferId);
            expect(offer.tokenId).to.equal(currentEstateId);
            expect(offer.sellingAmount).to.equal(offerAmount);
            expect(offer.soldAmount).to.equal(totalSold);
            expect(offer.unitPrice).to.equal(unitPrice);
            expect(offer.currency).to.equal(newCurrencyAddress);
            expect(offer.isDivisible).to.equal(isDivisible);
            expect(offer.state).to.equal(totalSold.eq(offerAmount) ? EstateMarketplaceOfferState.Sold : EstateMarketplaceOfferState.Selling);
            expect(offer.seller).to.equal(seller.address);

            expect(await getBalance(ethers.provider, buyer.address, newCurrency)).to.equal(expectedBuyerBalance);
            expect(await getBalance(ethers.provider, seller.address, newCurrency)).to.equal(expectedSellerBalance);
            expect(await getBalance(ethers.provider, feeReceiver.address, newCurrency)).to.equal(expectedFeeReceiverBalance);
            expect(await getBalance(ethers.provider, broker.address, newCurrency)).to.equal(expectedBrokerBalance);

            expect(await estateToken.balanceOf(seller.address, currentEstateId)).to.equal(initialAmount.sub(totalSold));
            expect(await estateToken.balanceOf(buyer.address, currentEstateId)).to.equal(totalBoughtOfBuyer);

            let walletsToReset = [seller, buyer, feeReceiver, broker];
            if (isERC20) {
                await resetERC20(newCurrency!, walletsToReset);
            } else {
                await resetNativeToken(ethers.provider, walletsToReset);
                await prepareNativeToken(ethers.provider, deployer, [seller, buyer], ethers.utils.parseEther("1.0"));
            }
        }
    }

    describe('6.2.4. buy(uint256)', async () => {
        it('6.2.4.1. buy token successfully in all native/erc20 and exclusive/non-exclusive combinations', async () => {
            const fixture = await beforeEstateMarketplaceTest({
                listSampleCurrencies: true,
                listSampleEstateToken: true,
            });
            const { mockCurrencyExclusiveRate, seller1, buyer1 } = fixture;

            for (const isERC20 of [false, true]) {
                for (const isExclusive of [false, true]) {
                    if (!isERC20 && isExclusive) {
                        continue;
                    }
                    await testBuyOffer(
                        fixture,
                        mockCurrencyExclusiveRate,
                        ethers.utils.parseEther("0.1"),
                        LandInitialization.ESTATE_TOKEN_RoyaltyRate,
                        isERC20,
                        isExclusive,
                        ethers.BigNumber.from(200_000),
                        ethers.BigNumber.from(100_000),
                        ethers.utils.parseEther("100"),
                        seller1,
                        [{ buyer: buyer1, amount: null }],
                        true,
                        false,
                    )
                }
            }
        });

        it('6.2.4.2. buy token successfully at very large amount', async () => {
            const fixture = await beforeEstateMarketplaceTest({
                listSampleCurrencies: true,
                listSampleEstateToken: true,
            });
            const { seller1, buyer1 } = fixture;

            for (const isERC20 of [false, true]) {
                for (const isExclusive of [false, true]) {
                    if (!isERC20 && isExclusive) {
                        continue;
                    }
                    const amount = ethers.BigNumber.from(2).pow(255);
                    const base = ethers.BigNumber.from(10).pow(18);
                    await testBuyOffer(
                        fixture,
                        ethers.utils.parseEther("0.99"),
                        ethers.utils.parseEther("0.99"),
                        ethers.utils.parseEther("0.99"),
                        isERC20,
                        isExclusive,
                        amount,
                        amount,
                        base,
                        seller1,
                        [{ buyer: buyer1, amount: null }],
                        true,
                        false,
                    )
                }
            }
        });
        
        it('6.2.4.3. buy token successfully with indivisible offer', async () => {
            const fixture = await beforeEstateMarketplaceTest({
                listSampleCurrencies: true,
                listSampleEstateToken: true,
            });
            const { mockCurrencyExclusiveRate, seller1, buyer1 } = fixture;
    
            await testBuyOffer(
                fixture,
                mockCurrencyExclusiveRate,
                ethers.utils.parseEther("0.1"),
                LandInitialization.ESTATE_TOKEN_RoyaltyRate,
                false,
                false,
                ethers.BigNumber.from(200_000),
                ethers.BigNumber.from(100_000),
                ethers.BigNumber.from("100"),
                seller1,
                [{ buyer: buyer1, amount: null }],
                false,
                false,
            )

            await testBuyOffer(
                fixture,
                mockCurrencyExclusiveRate,
                ethers.utils.parseEther("0.1"),
                LandInitialization.ESTATE_TOKEN_RoyaltyRate,
                true,
                true,
                ethers.BigNumber.from(300),
                ethers.BigNumber.from(200),
                ethers.utils.parseEther("500000"),
                seller1,
                [{ buyer: buyer1, amount: null }],
                false,
                false,
            )
        });

        it('6.2.4.4. buy token successfully in 10 random test cases', async () => {
            const fixture = await beforeEstateMarketplaceTest({
                listSampleCurrencies: true,
                listSampleEstateToken: true,
            });
            const { seller1, buyer1, buyer2 } = fixture;

            for (let testcase = 0; testcase < 10; testcase++) {
                const isERC20 = Math.random() < 0.5;
                const isExclusive = Math.random() < 0.5;
                if (!isERC20 && isExclusive) {
                    --testcase; continue;
                }

                const royaltyRate = randomBigNumber(ethers.BigNumber.from(0), ethers.utils.parseEther("1"));
                const exclusiveRate = randomBigNumber(ethers.BigNumber.from(0), ethers.utils.parseEther("1"));
                const commissionRate = randomBigNumber(ethers.BigNumber.from(0), ethers.utils.parseEther("1"));

                const randomNums = []
                for (let i = 0; i < 2; ++i) {
                    const maxSupply = ethers.BigNumber.from(2).pow(256).sub(1)
                    randomNums.push(ethers.BigNumber.from(ethers.utils.randomBytes(32)).mod(maxSupply).add(1));
                }
                randomNums.sort((a, b) => a.sub(b).lt(0) ? -1 : 1);

                const offerAmount = randomNums[0];
                const initAmount = randomNums[1];

                const unitPrice = randomBigNumber(ethers.BigNumber.from(1), ethers.BigNumber.from(2).pow(256).sub(1).div(initAmount));

                const seller = seller1;
                const buyRecords = [{
                    buyer: Math.random() < 0.5 ? buyer1 : buyer2,
                    amount: null,
                }];
                const isDivisible = Math.random() < 0.5;

                await testBuyOffer(
                    fixture,
                    exclusiveRate,
                    commissionRate,
                    royaltyRate, 
                    isERC20,
                    isExclusive,
                    initAmount,
                    offerAmount,
                    unitPrice,
                    seller,
                    buyRecords,
                    isDivisible,
                    false,
                );
            }
        });

        it('6.2.4.5. buy token unsuccessfully with invalid offer id', async () => {
            const fixture = await beforeEstateMarketplaceTest({
                listSampleCurrencies: true,
                listSampleEstateToken: true,
                listSampleOffers: true,
                fundERC20ForBuyers: true,
            });
            const { estateMarketplace, buyer1 } = fixture;

            await expect(estateMarketplace.connect(buyer1)["buy(uint256)"](0, { value: 1e9 }))
                .to.be.revertedWithCustomError(estateMarketplace, "InvalidOfferId");

            await expect(estateMarketplace.connect(buyer1)["buy(uint256)"](3, { value: 1e9 }))
                .to.be.revertedWithCustomError(estateMarketplace, "InvalidOfferId");
        });
    });

    describe('6.2.5. buy(uint256, uint256)', async () => {
        it('6.2.5.1. buy token successfully in all native/erc20 and exclusive/non-exclusive combinations', async () => {
            const fixture = await beforeEstateMarketplaceTest({
                listSampleCurrencies: true,
                listSampleEstateToken: true,
            });
            const { mockCurrencyExclusiveRate, seller1, buyer1 } = fixture;

            for (const isERC20 of [false, true]) {
                for (const isExclusive of [false, true]) {
                    if (!isERC20 && isExclusive) {
                        continue;
                    }
                    await testBuyOffer(
                        fixture,
                        mockCurrencyExclusiveRate,
                        ethers.utils.parseEther("0.1"),
                        LandInitialization.ESTATE_TOKEN_RoyaltyRate,
                        isERC20,
                        isExclusive,
                        ethers.BigNumber.from(200_000),
                        ethers.BigNumber.from(150_000),
                        ethers.BigNumber.from("120"),
                        seller1,
                        [
                            { buyer: buyer1, amount: ethers.BigNumber.from(100_000) },
                            { buyer: buyer1, amount: ethers.BigNumber.from(50_000) },
                        ],
                        true,
                        false,
                    )
                }
            }
        });

        it('6.2.5.2. buy token successfully at very large amount in all native/erc20 and exclusive/non-exclusive combinations', async () => {
            const fixture = await beforeEstateMarketplaceTest({
                listSampleCurrencies: true,
                listSampleEstateToken: true,
            });
            const { seller1, buyer1 } = fixture;

            for (const isERC20 of [false, true]) {
                for (const isExclusive of [false, true]) {
                    if (!isERC20 && isExclusive) {
                        continue;
                    }
                    const amount = ethers.BigNumber.from(2).pow(255);
                    const base = ethers.BigNumber.from(10).pow(18);
                    await testBuyOffer(
                        fixture,
                        ethers.utils.parseEther("0.99"),
                        ethers.utils.parseEther("0.99"),
                        ethers.utils.parseEther("0.99"),
                        isERC20,
                        isExclusive,
                        amount,
                        amount,
                        base,
                        seller1,
                        [
                            { buyer: buyer1, amount: ethers.BigNumber.from(150_000) },
                            { buyer: buyer1, amount: ethers.BigNumber.from(50_000) },
                        ],
                        true,
                        false,
                    )
                }
            }            
        });

        it('6.2.5.3. buy token successfully in 10 random test cases', async () => {
            const fixture = await beforeEstateMarketplaceTest({
                listSampleCurrencies: true,
                listSampleEstateToken: true,
            });
            const { seller1, buyer1, buyer2 } = fixture;

            for (let testcase = 0; testcase < 10; testcase++) {
                const isERC20 = Math.random() < 0.5;
                const isExclusive = Math.random() < 0.5;
                if (!isERC20 && isExclusive) {
                    --testcase; continue;
                }

                const royaltyRate = randomBigNumber(ethers.BigNumber.from(0), ethers.utils.parseEther("1"));
                const exclusiveRate = randomBigNumber(ethers.BigNumber.from(0), ethers.utils.parseEther("1"));
                const commissionRate = randomBigNumber(ethers.BigNumber.from(0), ethers.utils.parseEther("1"));

                const randomNums = []
                for (let i = 0; i < 2; ++i) {
                    const maxSupply = ethers.BigNumber.from(2).pow(256).sub(1)
                    randomNums.push(ethers.BigNumber.from(ethers.utils.randomBytes(32)).mod(maxSupply).add(1));
                }
                randomNums.sort((a, b) => a.sub(b).lt(0) ? -1 : 1);

                const offerAmount = randomNums[0];
                const initAmount = randomNums[1];

                const unitPrice = randomBigNumber(ethers.BigNumber.from(1), ethers.BigNumber.from(2).pow(256).sub(1).div(initAmount));

                const nTx = randomInt(2, 10 + 1);
                const amounts = randomArrayWithSum(nTx, offerAmount, ethers.BigNumber.from(1));

                const seller = seller1;
                const buyRecords = [];
                for (let i = 0; i < nTx; ++i) {
                    if (i < nTx - 1) {
                        buyRecords.push({
                            buyer: Math.random() < 0.5 ? buyer1 : buyer2,
                            amount: amounts[i],
                        });
                    } else {
                        buyRecords.push({
                            buyer: Math.random() < 0.5 ? buyer1 : buyer2,
                            amount: null,
                        });
                    }
                }

                await testBuyOffer(
                    fixture,
                    exclusiveRate,
                    commissionRate,
                    royaltyRate, 
                    isERC20,
                    isExclusive,
                    initAmount,
                    offerAmount,
                    unitPrice,
                    seller,
                    buyRecords,
                    true,
                    false,
                );
            }
        });

        it('6.2.5.4. buy token unsuccessfully when paused', async () => {
            const fixture = await beforeEstateMarketplaceTest({
                listSampleCurrencies: true,
                listSampleEstateToken: true,
                listSampleOffers: true,
                fundERC20ForBuyers: true,
                pause: true,
            });
            const { estateMarketplace, buyer1 } = fixture;

            await expect(estateMarketplace.connect(buyer1)["buy(uint256,uint256)"](1, 100_000, { value: 1e9 }))
                .to.be.revertedWith("Pausable: paused");
        });

        it('6.2.5.5. buy token unsuccessfully with invalid offer id', async () => {
            const fixture = await beforeEstateMarketplaceTest({
                listSampleCurrencies: true,
                listSampleEstateToken: true,
                listSampleOffers: true,
                fundERC20ForBuyers: true,
            });
            const { estateMarketplace, buyer1 } = fixture;

            await expect(estateMarketplace.connect(buyer1)["buy(uint256,uint256)"](0, 100_000, { value: 1e9 }))
                .to.be.revertedWithCustomError(estateMarketplace, "InvalidOfferId");

            await expect(estateMarketplace.connect(buyer1)["buy(uint256,uint256)"](3, 100_000, { value: 1e9 }))
                .to.be.revertedWithCustomError(estateMarketplace, "InvalidOfferId");
        });

        it('6.2.5.6. buy token unsuccessfully when seller buy their own token', async () => {
            const fixture = await beforeEstateMarketplaceTest({
                listSampleCurrencies: true,
                listSampleEstateToken: true,
                listSampleOffers: true,
                fundERC20ForBuyers: true,
            });
            const { estateMarketplace, seller1, seller2 } = fixture;

            await expect(estateMarketplace.connect(seller1)["buy(uint256,uint256)"](1, 100_000, { value: 1e9 }))
                .to.be.revertedWithCustomError(estateMarketplace, "InvalidBuying");

            await expect(estateMarketplace.connect(seller2)["buy(uint256,uint256)"](2, 100_000))
                .to.be.revertedWithCustomError(estateMarketplace, "InvalidBuying");
        });

        it('6.2.5.7. buy token unsuccessfully when offer is not selling', async () => {
            const fixture = await beforeEstateMarketplaceTest({
                listSampleCurrencies: true,
                listSampleEstateToken: true,
                listSampleOffers: true,
                fundERC20ForBuyers: true,
            });
            const { estateMarketplace, buyer1, buyer2 } = fixture;

            await callTransaction(estateMarketplace.connect(buyer1)["buy(uint256,uint256)"](1, 150_000, { value: 1e9 }));

            await expect(estateMarketplace.connect(buyer2)["buy(uint256,uint256)"](1, 150_000, { value: 1e9 }))
                .to.be.revertedWithCustomError(estateMarketplace, "InvalidBuying");
        });

        it('6.2.5.8. buy token unsuccessfully with indivisible offer', async () => {
            const fixture = await beforeEstateMarketplaceTest({
                listSampleCurrencies: true,
                listSampleEstateToken: true,
                listSampleOffers: true,
                fundERC20ForBuyers: true,
            });
            const { estateMarketplace, seller1, buyer1 } = fixture;
            
            await callTransaction(estateMarketplace.connect(seller1).list(
                1, 50_000, ethers.utils.parseEther("100"), ethers.constants.AddressZero, false
            ));

            const offerId = await estateMarketplace.offerNumber();

            await expect(estateMarketplace.connect(buyer1)["buy(uint256,uint256)"](offerId, 50_000, { value: 1e9 }))
                .to.be.revertedWithCustomError(estateMarketplace, "NotDivisible");
        });

        it('6.2.5.9. buy token unsuccessfully when there is not enough tokens to sell', async () => {
            const fixture = await beforeEstateMarketplaceTest({
                listSampleCurrencies: true,
                listSampleEstateToken: true,
                listSampleOffers: true,
                fundERC20ForBuyers: true,
            });
            const { estateMarketplace, buyer1, buyer2 } = fixture;

            await callTransaction(estateMarketplace.connect(buyer1)["buy(uint256,uint256)"](1, 100_000, { value: 1e9 }));

            await expect(estateMarketplace.connect(buyer2)["buy(uint256,uint256)"](1, 100_000, { value: 1e9 }))
                .to.be.revertedWithCustomError(estateMarketplace, "NotEnoughTokensToSell");
        });

        it('6.2.5.10. buy token unsuccessfully with insufficient native token', async () => {
            const fixture = await beforeEstateMarketplaceTest({
                listSampleCurrencies: true,
                listSampleEstateToken: true,
                listSampleOffers: true,
            });
            const { estateMarketplace, buyer1 } = fixture;

            await expect(estateMarketplace.connect(buyer1)["buy(uint256,uint256)"](1, 100_000))
                .to.be.revertedWithCustomError(estateMarketplace, "InsufficientValue");
        });

        it('6.2.5.11. buy token unsuccessfully when native token transfer to seller failed', async () => {
            const fixture = await beforeEstateMarketplaceTest({
                listSampleCurrencies: true,
                listSampleEstateToken: true,
            });
            const { estateMarketplace, seller1, buyer1, deployer, estateToken } = fixture;
            
            const failReceiver = await deployFailReceiver(deployer, true, false);

            await callTransaction(estateToken.connect(seller1).safeTransferFrom(
                seller1.address,
                failReceiver.address,
                1,
                200_000,
                ethers.utils.toUtf8Bytes("TestToken_1")
            ));

            let data = estateToken.interface.encodeFunctionData("setApprovalForAll", [estateMarketplace.address, true]);
            await callTransaction(failReceiver.call(estateToken.address, data));

            data = estateMarketplace.interface.encodeFunctionData("list", [1, 100_000, 1000, ethers.constants.AddressZero, true]);

            await callTransaction(failReceiver.call(estateMarketplace.address, data));

            await expect(estateMarketplace.connect(buyer1)["buy(uint256,uint256)"](1, 100_000, { value: 1e9 }))
                .to.be.revertedWithCustomError(estateMarketplace, "FailedTransfer");
        });

        it('6.2.5.12. buy token unsuccessfully when native token transfer to royalty receiver failed', async () => {
            const fixture = await beforeEstateMarketplaceTest({
                listSampleCurrencies: true,
                listSampleEstateToken: true,
                listSampleOffers: true,
                fundERC20ForBuyers: true,
            });
            const { estateMarketplace, seller1, buyer1, deployer, estateToken } = fixture;

            const failReceiver = await deployFailReceiver(deployer, true, false);

            await estateToken.updateFeeReceiver(failReceiver.address);

            await expect(estateMarketplace.connect(buyer1)["buy(uint256,uint256)"](1, 100_000, { value: 1e9 }))
                .to.be.revertedWithCustomError(estateMarketplace, "FailedTransfer");
        });

        it('6.2.5.13. buy token unsuccessfully when native token transfer to broker failed', async () => {
            const fixture = await beforeEstateMarketplaceTest({
                listSampleCurrencies: true,
                listSampleEstateToken: true,
            });
            const { estateMarketplace, seller1, buyer1, deployer, estateToken, commissionToken, broker2 } = fixture;

            const failReceiver = await deployFailReceiver(deployer, true, false);

            await callTransaction(commissionToken.connect(broker2).transferFrom(
                broker2.address,
                failReceiver.address,
                2,
            ));

            await callTransaction(estateMarketplace.connect(seller1).list(
                2,
                200,
                ethers.utils.parseEther("500000"),
                ethers.constants.AddressZero,
                true
            ));
            await callTransaction(estateToken.connect(seller1).setApprovalForAll(estateMarketplace.address, true));

            const offerId = await estateMarketplace.offerNumber();

            await expect(estateMarketplace.connect(buyer1)["buy(uint256,uint256)"](offerId, 100, { value: 1e9 }))
                .to.be.revertedWithCustomError(estateMarketplace, "FailedTransfer");
        });

        it('6.2.5.14. buy token unsuccessfully when refund to sender failed', async () => {
            const fixture = await beforeEstateMarketplaceTest({
                listSampleCurrencies: true,
                listSampleEstateToken: true,
                listSampleOffers: true,
                fundERC20ForBuyers: true,
            });
            const { estateMarketplace, deployer } = fixture;

            const failReceiver = await deployFailReceiver(deployer, true, false);

            let data = estateMarketplace.interface.encodeFunctionData("buy(uint256,uint256)", [1, 100_000]);

            await expect(failReceiver.call(estateMarketplace.address, data, { value: 1e9 }))
                .to.be.revertedWithCustomError(estateMarketplace, "FailedRefund");
        });

        it('6.2.5.15. buy token unsuccessfully when this contract is reentered', async () => {
            const fixture = await beforeEstateMarketplaceTest({
                listSampleCurrencies: true,
                listSampleEstateToken: true,
            });
            const { deployer, estateToken, estateMarketplace, buyer1 } = fixture;

            const reentrancy = await deployReentrancyERC1155Holder(deployer);

            await callTransaction(estateToken.mint(reentrancy.address, 1, 100_000));

            let data = estateMarketplace.interface.encodeFunctionData("list", [1, 100_000, 1000, ethers.constants.AddressZero, true]);
            await callTransaction(reentrancy.call(estateMarketplace.address, data));

            data = estateToken.interface.encodeFunctionData("setApprovalForAll", [estateMarketplace.address, true]);
            await callTransaction(reentrancy.call(estateToken.address, data));

            await testReentrancy_Marketplace(
                estateMarketplace,
                reentrancy,
                async () => {
                    await expect(estateMarketplace.connect(buyer1)["buy(uint256,uint256)"](1, 100_000, { value: 1e9 }))
                        .to.be.revertedWithCustomError(estateMarketplace, "FailedTransfer");
                },
            );
        });
    });

    describe('6.2.6. safeBuy(uint256, uint256)', async () => {
        it('6.2.6.1. buy token successfully in both native and ERC20', async () => {
            const fixture = await beforeEstateMarketplaceTest({
                listSampleCurrencies: true,
                listSampleEstateToken: true,
            });
            const { mockCurrencyExclusiveRate, seller1, buyer1 } = fixture;

            for (const isERC20 of [false, true]) {
                for (const isExclusive of [false, true]) {
                    if (!isERC20 && isExclusive) {
                        continue;
                    }
                    await testBuyOffer(
                        fixture,
                        mockCurrencyExclusiveRate,
                        ethers.utils.parseEther("0.1"),
                        LandInitialization.ESTATE_TOKEN_RoyaltyRate,
                        isERC20,
                        isExclusive,
                        ethers.BigNumber.from(200_000),
                        ethers.BigNumber.from(100_000),
                        ethers.utils.parseEther("100"),
                        seller1,
                        [{ buyer: buyer1, amount: null }],
                        true,
                        false,
                    )
                }
            }
        });

        it('6.2.6.2. buy token unsuccessfully with invalid offer id', async () => {
            const fixture = await beforeEstateMarketplaceTest({
                listSampleCurrencies: true,
                listSampleEstateToken: true,
                listSampleOffers: true,
                fundERC20ForBuyers: true,
            });
            const { estateMarketplace, buyer1 } = fixture;

            await expect(estateMarketplace.connect(buyer1)["safeBuy(uint256,uint256)"](0, 1, { value: 1e9 }))
                .to.be.revertedWithCustomError(estateMarketplace, "InvalidOfferId");

            await expect(estateMarketplace.connect(buyer1)["safeBuy(uint256,uint256)"](3, 1, { value: 1e9 }))
                .to.be.revertedWithCustomError(estateMarketplace, "InvalidOfferId");
        });

        it('6.2.6.3. buy token unsuccessfully with invalid anchor', async () => {
            const fixture = await beforeEstateMarketplaceTest({
                listSampleCurrencies: true,
                listSampleEstateToken: true,
                listSampleOffers: true,
                fundERC20ForBuyers: true,
            });
            const { estateMarketplace, buyer1, buyer2 } = fixture;

            await expect(estateMarketplace.connect(buyer1)["safeBuy(uint256,uint256)"](1, 2, { value: 1e9 }))
                .to.be.revertedWithCustomError(estateMarketplace, "BadAnchor");

            await expect(estateMarketplace.connect(buyer2)["safeBuy(uint256,uint256)"](2, 1))
                .to.be.revertedWithCustomError(estateMarketplace, "BadAnchor");
        });
    });

    describe('6.2.7. safeBuy(uint256, uint256, uint256)', async () => {
        it('6.2.7.1. buy token successfully in both native and ERC20', async () => {
            const fixture = await beforeEstateMarketplaceTest({
                listSampleCurrencies: true,
                listSampleEstateToken: true,
            });
            const { mockCurrencyExclusiveRate, seller1, buyer1 } = fixture;

            for (const isERC20 of [false, true]) {
                for (const isExclusive of [false, true]) {
                    if (!isERC20 && isExclusive) {
                        continue;
                    }
                    await testBuyOffer(
                        fixture,
                        mockCurrencyExclusiveRate,
                        ethers.utils.parseEther("0.1"),
                        LandInitialization.ESTATE_TOKEN_RoyaltyRate,
                        isERC20,
                        isExclusive,
                        ethers.BigNumber.from(200_000),
                        ethers.BigNumber.from(150_000),
                        ethers.BigNumber.from("120"),
                        seller1,
                        [
                            { buyer: buyer1, amount: ethers.BigNumber.from(100_000) },
                            { buyer: buyer1, amount: ethers.BigNumber.from(50_000) },
                        ],
                        true,
                        true,
                    )
                }
            }
        });

        it('6.2.7.2. buy token unsuccessfully with invalid offer id', async () => {
            const fixture = await beforeEstateMarketplaceTest({
                listSampleCurrencies: true,
                listSampleEstateToken: true,
                listSampleOffers: true,
                fundERC20ForBuyers: true,
            });
            const { estateMarketplace, buyer1 } = fixture;

            await expect(estateMarketplace.connect(buyer1)["safeBuy(uint256,uint256,uint256)"](0, 100_000, 1, { value: 1e9 }))
                .to.be.revertedWithCustomError(estateMarketplace, "InvalidOfferId");

            await expect(estateMarketplace.connect(buyer1)["safeBuy(uint256,uint256,uint256)"](3, 100_000, 1, { value: 1e9 }))
                .to.be.revertedWithCustomError(estateMarketplace, "InvalidOfferId");
        });

        it('6.2.7.3. buy token unsuccessfully with invalid anchor', async () => {
            const fixture = await beforeEstateMarketplaceTest({
                listSampleCurrencies: true,
                listSampleEstateToken: true,
                listSampleOffers: true,
                fundERC20ForBuyers: true,
            });
            const { estateMarketplace, buyer1, buyer2 } = fixture;

            await expect(estateMarketplace.connect(buyer1)["safeBuy(uint256,uint256,uint256)"](1, 100_000, 2, { value: 1e9 }))
                .to.be.revertedWithCustomError(estateMarketplace, "BadAnchor");

            await expect(estateMarketplace.connect(buyer2)["safeBuy(uint256,uint256,uint256)"](2, 100_000, 1))
                .to.be.revertedWithCustomError(estateMarketplace, "BadAnchor");
        });
    });

    describe('6.2.8. cancelOffer(uint256)', async () => {
        it('6.2.8.1. cancel offer successfully by seller', async () => {
            const fixture = await beforeEstateMarketplaceTest({
                listSampleCurrencies: true,
                listSampleEstateToken: true,
                listSampleOffers: true,
                fundERC20ForBuyers: true,
            });
            const { estateMarketplace, seller1 } = fixture;

            let tx = await estateMarketplace.connect(seller1).cancel(1);
            await tx.wait();

            const offer = await estateMarketplace.getOffer(1);
            expect(offer.state).to.equal(EstateMarketplaceOfferState.Cancelled);

            await expect(tx).to
                .emit(estateMarketplace, "OfferCancellation")
                .withArgs(1);
        });

        it('6.2.8.2. cancel offer successfully by manager', async () => {
            const fixture = await beforeEstateMarketplaceTest({
                listSampleCurrencies: true,
                listSampleEstateToken: true,
                listSampleOffers: true,
                fundERC20ForBuyers: true,
            });
            const { estateMarketplace, manager } = fixture;
            let tx = await estateMarketplace.connect(manager).cancel(1);
            await tx.wait();

            const offer = await estateMarketplace.getOffer(1);
            expect(offer.state).to.equal(EstateMarketplaceOfferState.Cancelled);

            await expect(tx).to
                .emit(estateMarketplace, "OfferCancellation")
                .withArgs(1);
        });

        it('6.2.8.3. cancel offer unsuccessfully with invalid offer id', async () => {
            const fixture = await beforeEstateMarketplaceTest({
                listSampleCurrencies: true,
                listSampleEstateToken: true,
                listSampleOffers: true,
                fundERC20ForBuyers: true,
            });
            const { estateMarketplace, manager } = fixture;

            await expect(estateMarketplace.connect(manager).cancel(0))
                .to.be.revertedWithCustomError(estateMarketplace, "InvalidOfferId");
            await expect(estateMarketplace.connect(manager).cancel(3))
                .to.be.revertedWithCustomError(estateMarketplace, "InvalidOfferId");
        });

        it('6.2.8.4. cancel offer unsuccessfully by unauthorized user', async () => {
            const fixture = await beforeEstateMarketplaceTest({
                listSampleCurrencies: true,
                listSampleEstateToken: true,
                listSampleOffers: true,
                fundERC20ForBuyers: true,
            });
            const { estateMarketplace, seller2, moderator } = fixture;

            await expect(estateMarketplace.connect(seller2).cancel(1))
                .to.be.revertedWithCustomError(estateMarketplace, "Unauthorized");

            await expect(estateMarketplace.connect(moderator).cancel(1))
                .to.be.revertedWithCustomError(estateMarketplace, "Unauthorized");
        });

        it('6.2.8.5. cancel offer unsuccessfully when offer is already cancelled', async () => {
            const fixture = await beforeEstateMarketplaceTest({
                listSampleCurrencies: true,
                listSampleEstateToken: true,
                listSampleOffers: true,
                fundERC20ForBuyers: true,
            });
            const { estateMarketplace, manager } = fixture;

            await callTransaction(estateMarketplace.connect(manager).cancel(1));
            await expect(estateMarketplace.connect(manager).cancel(1))
                .to.be.revertedWithCustomError(estateMarketplace, "InvalidCancelling");
        });

        it('6.2.8.6. cancel offer unsuccessfully when offer is sold out', async () => {
            const fixture = await beforeEstateMarketplaceTest({
                listSampleCurrencies: true,
                listSampleEstateToken: true,
                listSampleOffers: true,
                fundERC20ForBuyers: true,
            });
            const { estateMarketplace, manager,buyer1 } = fixture;

            await callTransaction(estateMarketplace.connect(buyer1)["safeBuy(uint256,uint256)"](1, 1, { value: 1e9 }));

            await expect(estateMarketplace.connect(manager).cancel(1))
                .to.be.revertedWithCustomError(estateMarketplace, "InvalidCancelling");
        });
    });
});

