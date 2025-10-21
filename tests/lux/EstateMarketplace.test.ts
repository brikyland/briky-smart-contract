import { expect } from 'chai';
import { randomInt } from 'crypto';
import { BigNumber, Contract, Wallet } from 'ethers';
import { ethers } from 'hardhat';

// @defi-wonderland/smock
import { MockContract, smock } from '@defi-wonderland/smock';

// @nomicfoundation/hardhat-network-helpers
import { loadFixture, time } from '@nomicfoundation/hardhat-network-helpers';

// @tests
import { Constant } from '@tests/test.constant';

// @tests/land
import { Initialization as LandInitialization } from '@tests/land/test.initialization';

// @typechain-types
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
    FailReceiver,
} from '@typechain-types';

// @utils
import {
    callTransaction,
    expectRevertWithModifierCustomError,
    getBalance,
    prepareERC20,
    prepareNativeToken,
    randomWallet,
    resetERC20,
    resetNativeToken,
    testReentrancy,
} from '@utils/blockchain';
import { applyDiscount } from '@utils/formula';
import { MockValidator } from '@utils/mockValidator';
import { randomArrayWithSum, randomBigNumber } from '@utils/utils';

// @utils/deployments/common
import { deployAdmin } from '@utils/deployments/common/admin';
import { deployCurrency } from '@utils/deployments/common/currency';
import { deployFeeReceiver } from '@utils/deployments/common/feeReceiver';
import { deployPriceWatcher } from '@utils/deployments/common/priceWatcher';
import { deployReserveVault } from '@utils/deployments/common/reserveVault';

// @utils/deployments/mock
import { deployFailReceiver } from '@utils/deployments/mock/utilities/failReceiver';
import { deployReentrancyReceiver } from '@utils/deployments/mock/reentrancy/reentrancyReceiver';

// @utils/deployments/lux
import { deployEstateMarketplace } from '@utils/deployments/lux/estateMarketplace';

// @utils/models/lux
import { BuyParams, BuyPartParams, ListParams } from '@utils/models/lux/assetMarketplace';
import { OfferState } from '@utils/models/lux/offerState';

// @utils/transaction/common
import {
    getAdminTxByInput_ActivateIn,
    getAdminTxByInput_AuthorizeManagers,
    getAdminTxByInput_AuthorizeModerators,
    getAdminTxByInput_DeclareZone,
    getAdminTxByInput_UpdateCurrencyRegistries,
} from '@utils/transaction/common/admin';
import { getPausableTxByInput_Pause } from '@utils/transaction/common/pausable';

// @utils/transaction/land
import { getCommissionTokenTx_RegisterBroker } from '@utils/transaction/land/commissionToken';
import {
    getEstateTokenTxByInput_AuthorizeTokenizers,
    getCallEstateTokenTx_TokenizeEstate,
    getEstateTokenTxByInput_UpdateCommissionToken,
    getEstateTokenTxByInput_RegisterCustodian,
    getEstateTokenTxByInput_UpdateZoneRoyaltyRate,
} from '@utils/transaction/land/estateToken';

// @utils/transaction/lux
import {
    getAssetMarketplaceTx_BuyPart,
    getAssetMarketplaceTx_Buy,
    getAssetMarketplaceTx_List,
    getAssetMarketplaceTx_SafeBuyPart,
    getAssetMarketplaceTx_SafeBuy,
    getAssetMarketplaceTxByParams_SafeBuy,
    getAssetMarketplaceTxByParams_SafeBuyPart,
    getAssetMarketplaceTx_Cancel,
} from '@utils/transaction/lux/assetMarketplace';

interface EstateMarketplaceFixture {
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
    validator: MockValidator;

    admin: Admin;
    currency: Currency;
    feeReceiver: FeeReceiver;
    priceWatcher: PriceWatcher;
    reserveVault: ReserveVault;
    estateForger: MockContract<MockEstateForger>;
    estateToken: MockContract<MockEstateToken>;
    commissionToken: MockContract<CommissionToken>;
    estateMarketplace: EstateMarketplace;

    zone1: any;
    zone2: any;
    failReceiver: any;
}

async function testReentrancy_Marketplace(
    estateMarketplace: EstateMarketplace,
    reentrancyContract: Contract,
    assertion: any
) {
    let data = [
        estateMarketplace.interface.encodeFunctionData('buy(uint256)', [0]),
        estateMarketplace.interface.encodeFunctionData('buy(uint256,uint256)', [0, 0]),
        estateMarketplace.interface.encodeFunctionData('safeBuy(uint256,bytes32)', [0, ethers.constants.HashZero]),
        estateMarketplace.interface.encodeFunctionData('safeBuy(uint256,uint256,bytes32)', [
            0,
            0,
            ethers.constants.HashZero,
        ]),
        estateMarketplace.interface.encodeFunctionData('cancel', [0]),
    ];

    await testReentrancy(reentrancyContract, estateMarketplace, data, assertion);
}

describe('6.2. EstateMarketplace', async () => {
    afterEach(async () => {
        const fixture = await loadFixture(estateMarketplaceFixture);
        const { estateToken } = fixture;
        estateToken.isAvailable.reset();
    });

    async function estateMarketplaceFixture(): Promise<EstateMarketplaceFixture> {
        const [
            deployer,
            admin1,
            admin2,
            admin3,
            admin4,
            admin5,
            seller1,
            seller2,
            buyer1,
            buyer2,
            broker1,
            broker2,
            manager,
            moderator,
            custodian1,
            custodian2,
        ] = await ethers.getSigners();
        const admins = [admin1, admin2, admin3, admin4, admin5];

        const validator = new MockValidator(deployer as any);

        const adminAddresses: string[] = admins.map((signer) => signer.address);
        const admin = (await deployAdmin(
            deployer.address,
            adminAddresses[0],
            adminAddresses[1],
            adminAddresses[2],
            adminAddresses[3],
            adminAddresses[4]
        )) as Admin;

        const currency = (await deployCurrency(deployer.address, 'MockCurrency', 'MCK')) as Currency;

        const feeReceiver = (await deployFeeReceiver(deployer.address, admin.address)) as FeeReceiver;

        const priceWatcher = (await deployPriceWatcher(deployer.address, admin.address)) as PriceWatcher;

        const reserveVault = (await deployReserveVault(deployer.address, admin.address)) as ReserveVault;

        await callTransaction(
            currency.setExclusiveDiscount(ethers.utils.parseEther('0.3'), Constant.COMMON_RATE_DECIMALS)
        );

        const SmockEstateTokenFactory = await smock.mock<MockEstateToken__factory>('MockEstateToken');
        const estateToken = await SmockEstateTokenFactory.deploy();
        await callTransaction(
            estateToken.initialize(
                admin.address,
                feeReceiver.address,
                validator.getAddress(),
                LandInitialization.ESTATE_TOKEN_BaseURI
            )
        );

        const SmockCommissionTokenFactory = await smock.mock<CommissionToken__factory>('CommissionToken');
        const commissionToken = await SmockCommissionTokenFactory.deploy();
        await callTransaction(
            commissionToken.initialize(
                admin.address,
                estateToken.address,
                feeReceiver.address,
                LandInitialization.COMMISSION_TOKEN_Name,
                LandInitialization.COMMISSION_TOKEN_Symbol,
                LandInitialization.COMMISSION_TOKEN_BaseURI,
                LandInitialization.COMMISSION_TOKEN_RoyaltyRate
            )
        );

        const SmockEstateForgerFactory = await smock.mock<MockEstateForger__factory>('MockEstateForger');
        const estateForger = await SmockEstateForgerFactory.deploy();
        await callTransaction(
            estateForger.initialize(
                admin.address,
                estateToken.address,
                commissionToken.address,
                priceWatcher.address,
                feeReceiver.address,
                reserveVault.address,
                validator.getAddress(),
                LandInitialization.ESTATE_FORGER_BaseMinUnitPrice,
                LandInitialization.ESTATE_FORGER_BaseMaxUnitPrice
            )
        );

        const estateMarketplace = (await deployEstateMarketplace(
            deployer.address,
            admin.address,
            estateToken.address,
            commissionToken.address
        )) as EstateMarketplace;

        const zone1 = ethers.utils.formatBytes32String('TestZone1');
        const zone2 = ethers.utils.formatBytes32String('TestZone2');

        const failReceiver = (await deployFailReceiver(deployer.address, false, false)) as FailReceiver;

        return {
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
            validator,
            admin,
            currency,
            feeReceiver,
            priceWatcher,
            reserveVault,
            estateForger,
            estateToken,
            commissionToken,
            estateMarketplace,
            zone1,
            zone2,
            failReceiver,
        };
    }

    async function beforeEstateMarketplaceTest({
        skipListSampleCurrencies = false,
        skipListSampleEstateToken = false,
        skipFundERC20ForBuyers = false,
        listSampleOffers = false,
        useFailRoyaltyReceiver = false,
        pause = false,
    } = {}): Promise<EstateMarketplaceFixture> {
        const fixture = await loadFixture(estateMarketplaceFixture);

        const {
            deployer,
            admin,
            admins,
            currency,
            estateToken,
            commissionToken,
            estateMarketplace,
            seller1,
            seller2,
            buyer1,
            buyer2,
            estateForger,
            manager,
            moderator,
            custodian1,
            custodian2,
            broker1,
            broker2,
            zone1,
            zone2,
            validator,
            failReceiver,
        } = fixture;

        for (const zone of [zone1, zone2]) {
            await callTransaction(getAdminTxByInput_DeclareZone(admin, deployer, { zone }, admins));
        }

        await callTransaction(
            getAdminTxByInput_AuthorizeManagers(
                admin,
                deployer,
                {
                    accounts: [manager.address],
                    isManager: true,
                },
                admins
            )
        );

        await callTransaction(
            getAdminTxByInput_AuthorizeModerators(
                admin,
                deployer,
                {
                    accounts: [moderator.address],
                    isModerator: true,
                },
                admins
            )
        );

        await callTransaction(
            getEstateTokenTxByInput_AuthorizeTokenizers(
                estateToken as any,
                deployer,
                {
                    accounts: [estateForger.address],
                    isTokenizer: true,
                },
                admin,
                admins
            )
        );

        await callTransaction(
            getEstateTokenTxByInput_UpdateCommissionToken(
                estateToken as any,
                deployer,
                { commissionToken: commissionToken.address },
                admin,
                admins
            )
        );

        for (const zone of [zone1, zone2]) {
            await callTransaction(
                getAdminTxByInput_ActivateIn(
                    admin,
                    deployer,
                    {
                        zone,
                        accounts: [manager.address, moderator.address],
                        isActive: true,
                    },
                    admins
                )
            );
        }

        for (const zone of [zone1, zone2]) {
            for (const custodian of [custodian1, custodian2]) {
                await callTransaction(
                    getEstateTokenTxByInput_RegisterCustodian(
                        estateToken as any,
                        manager,
                        {
                            zone,
                            custodian: custodian.address,
                            uri: 'TestURI',
                        },
                        validator
                    )
                );
            }
        }

        await callTransaction(
            getCommissionTokenTx_RegisterBroker(commissionToken as any, manager, {
                zone: zone1,
                broker: broker1.address,
                commissionRate: ethers.utils.parseEther('0.1'),
            })
        );

        await callTransaction(
            getCommissionTokenTx_RegisterBroker(commissionToken as any, manager, {
                zone: zone2,
                broker: broker2.address,
                commissionRate: ethers.utils.parseEther('0.2'),
            })
        );

        let currentTimestamp = await time.latest();

        if (!skipListSampleCurrencies) {
            await callTransaction(
                getAdminTxByInput_UpdateCurrencyRegistries(
                    admin,
                    deployer,
                    {
                        currencies: [ethers.constants.AddressZero, currency.address],
                        isAvailable: [true, true],
                        isExclusive: [false, true],
                    },
                    admins
                )
            );
        }

        if (useFailRoyaltyReceiver) {
            await callTransaction(estateToken.updateFeeReceiver(failReceiver.address));
        }

        if (!skipListSampleEstateToken) {
            currentTimestamp += 1000;

            await time.setNextBlockTimestamp(currentTimestamp);

            await callTransaction(
                getCallEstateTokenTx_TokenizeEstate(estateToken as any, estateForger, {
                    totalSupply: BigNumber.from(0),
                    zone: zone1,
                    tokenizationId: BigNumber.from(10),
                    uri: 'Token1_URI',
                    expireAt: currentTimestamp + 1e8,
                    custodian: custodian1.address,
                    broker: broker1.address,
                })
            );

            await callTransaction(
                getCallEstateTokenTx_TokenizeEstate(estateToken as any, estateForger, {
                    totalSupply: BigNumber.from(0),
                    zone: zone2,
                    tokenizationId: BigNumber.from(10),
                    uri: 'Token2_URI',
                    expireAt: currentTimestamp + 2e8,
                    custodian: custodian2.address,
                    broker: broker2.address,
                })
            );

            estateToken.isAvailable.whenCalledWith(1).returns(true);
            estateToken.isAvailable.whenCalledWith(2).returns(true);

            await estateToken.mint(seller1.address, 1, 200_000);
            await estateToken.mint(seller2.address, 1, 300_000);

            await estateToken.mint(seller1.address, 2, 200);
            await estateToken.mint(seller2.address, 2, 300);
        }

        if (listSampleOffers) {
            const params1: ListParams = {
                tokenId: BigNumber.from(1),
                sellingAmount: BigNumber.from(150_000),
                unitPrice: ethers.utils.parseEther('100'),
                currency: ethers.constants.AddressZero,
                isDivisible: true,
            };
            await callTransaction(getAssetMarketplaceTx_List(estateMarketplace as any, seller1, params1));

            const params2: ListParams = {
                tokenId: BigNumber.from(2),
                sellingAmount: BigNumber.from(200),
                unitPrice: ethers.utils.parseEther('500000'),
                currency: currency.address,
                isDivisible: true,
            };
            await callTransaction(getAssetMarketplaceTx_List(estateMarketplace as any, seller2, params2));

            await callTransaction(estateToken.connect(seller1).setApprovalForAll(estateMarketplace.address, true));
            await callTransaction(estateToken.connect(seller2).setApprovalForAll(estateMarketplace.address, true));
        }

        if (!skipFundERC20ForBuyers) {
            await prepareERC20(currency, [buyer1, buyer2], [estateMarketplace], 1e9);
        }

        if (pause) {
            await callTransaction(getPausableTxByInput_Pause(estateMarketplace, deployer, admin, admins));
        }

        return {
            ...fixture,
        };
    }

    /* --- Initialization --- */
    describe('6.2.1. initialize(address,address,address)', async () => {
        it('6.2.1.1. Deploy successfully', async () => {
            const { admin, estateToken, commissionToken, estateMarketplace } = await beforeEstateMarketplaceTest();

            const paused = await estateMarketplace.paused();
            expect(paused).to.equal(false);

            const adminAddress = await estateMarketplace.admin();
            expect(adminAddress).to.equal(admin.address);

            const estateTokenAddress = await estateMarketplace.collection();
            expect(estateTokenAddress).to.equal(estateToken.address);

            const commissionTokenAddress = await estateMarketplace.commissionToken();
            expect(commissionTokenAddress).to.equal(commissionToken.address);

            const offerNumber = await estateMarketplace.offerNumber();
            expect(offerNumber).to.equal(0);
        });
    });

    /* --- Query --- */
    describe('6.2.2. getOffer(uint256)', async () => {
        it('6.2.2.1. Return successfully with valid offer id', async () => {
            const { estateMarketplace } = await beforeEstateMarketplaceTest({
                listSampleOffers: true,
            });

            await expect(estateMarketplace.getOffer(1)).to.not.be.reverted;

            await expect(estateMarketplace.getOffer(2)).to.not.be.reverted;
        });

        it('6.2.2.2. Revert with invalid offer id', async () => {
            const { estateMarketplace } = await beforeEstateMarketplaceTest({
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

    /* --- Command --- */
    describe('6.2.3. list(uint256,uint256,uint256,address,bool)', async () => {
        async function beforeListTest(fixture: EstateMarketplaceFixture): Promise<{
            defaultParams: ListParams;
        }> {
            const defaultParams = {
                tokenId: BigNumber.from(1),
                sellingAmount: BigNumber.from(150_000),
                unitPrice: ethers.utils.parseEther('100'),
                currency: ethers.constants.AddressZero,
                isDivisible: false,
            };
            return { defaultParams };
        }

        it('6.2.3.1. List token successfully', async () => {
            const { estateMarketplace, currency, seller1, seller2, estateToken, feeReceiver } =
                await beforeEstateMarketplaceTest();

            const params1: ListParams = {
                tokenId: BigNumber.from(1),
                sellingAmount: BigNumber.from(150_000),
                unitPrice: ethers.utils.parseEther('100'),
                currency: ethers.constants.AddressZero,
                isDivisible: false,
            };
            const tx1 = await getAssetMarketplaceTx_List(estateMarketplace as any, seller1, params1);
            await tx1.wait();

            const royaltyDenomination1 = (await estateToken.royaltyInfo(params1.tokenId, params1.unitPrice))[1];

            expect(tx1)
                .to.emit(estateMarketplace, 'NewOffer')
                .withArgs(
                    1,
                    params1.tokenId,
                    seller1.address,
                    params1.sellingAmount,
                    params1.unitPrice,
                    params1.currency,
                    params1.isDivisible,
                    royaltyDenomination1,
                    feeReceiver.address
                );

            expect(await estateMarketplace.offerNumber()).to.equal(1);

            const offer1 = await estateMarketplace.getOffer(1);
            expect(offer1.tokenId).to.equal(params1.tokenId);
            expect(offer1.sellingAmount).to.equal(params1.sellingAmount);
            expect(offer1.soldAmount).to.equal(0);
            expect(offer1.unitPrice).to.equal(params1.unitPrice);
            expect(offer1.royaltyDenomination).to.equal(royaltyDenomination1);
            expect(offer1.currency).to.equal(params1.currency);
            expect(offer1.isDivisible).to.equal(params1.isDivisible);
            expect(offer1.state).to.equal(OfferState.Selling);
            expect(offer1.seller).to.equal(seller1.address);
            expect(offer1.royaltyReceiver).to.equal(feeReceiver.address);

            const params2: ListParams = {
                tokenId: BigNumber.from(2),
                sellingAmount: BigNumber.from(200),
                unitPrice: ethers.utils.parseEther('500000'),
                currency: currency.address,
                isDivisible: true,
            };
            const tx2 = await getAssetMarketplaceTx_List(estateMarketplace as any, seller2, params2);
            await tx2.wait();

            const royaltyDenomination2 = (await estateToken.royaltyInfo(params2.tokenId, params2.unitPrice))[1];

            expect(tx2)
                .to.emit(estateMarketplace, 'NewOffer')
                .withArgs(
                    2,
                    params2.tokenId,
                    seller2.address,
                    params2.sellingAmount,
                    params2.unitPrice,
                    params2.currency,
                    params2.isDivisible,
                    royaltyDenomination2,
                    feeReceiver.address
                );
            await tx2.wait();

            expect(await estateMarketplace.offerNumber()).to.equal(2);

            const offer2 = await estateMarketplace.getOffer(2);
            expect(offer2.tokenId).to.equal(params2.tokenId);
            expect(offer2.sellingAmount).to.equal(params2.sellingAmount);
            expect(offer2.soldAmount).to.equal(0);
            expect(offer2.unitPrice).to.equal(params2.unitPrice);
            expect(offer2.royaltyDenomination).to.equal(royaltyDenomination2);
            expect(offer2.currency).to.equal(params2.currency);
            expect(offer2.isDivisible).to.equal(params2.isDivisible);
            expect(offer2.state).to.equal(OfferState.Selling);
            expect(offer2.seller).to.equal(seller2.address);
            expect(offer2.royaltyReceiver).to.equal(feeReceiver.address);
        });

        it('6.2.3.2. List token unsuccessfully when paused', async () => {
            const fixture = await beforeEstateMarketplaceTest({
                pause: true,
            });
            const { estateMarketplace, seller1 } = fixture;

            const { defaultParams } = await beforeListTest(fixture);

            await expect(
                getAssetMarketplaceTx_List(estateMarketplace as any, seller1, defaultParams)
            ).to.be.revertedWith('Pausable: paused');
        });

        it('6.2.3.3. List token unsuccessfully with invalid token id', async () => {
            const fixture = await beforeEstateMarketplaceTest();
            const { estateMarketplace, seller1 } = fixture;

            const { defaultParams } = await beforeListTest(fixture);

            await expect(
                getAssetMarketplaceTx_List(estateMarketplace as any, seller1, {
                    ...defaultParams,
                    tokenId: BigNumber.from(0),
                })
            ).to.be.revertedWithCustomError(estateMarketplace, 'InvalidTokenId');

            await expect(
                getAssetMarketplaceTx_List(estateMarketplace as any, seller1, {
                    ...defaultParams,
                    tokenId: BigNumber.from(3),
                })
            ).to.be.revertedWithCustomError(estateMarketplace, 'InvalidTokenId');
        });

        it('6.2.3.4. List token unsuccessfully with non available token', async () => {
            const fixture = await beforeEstateMarketplaceTest();
            const { estateMarketplace, seller2, estateToken } = fixture;

            const { defaultParams } = await beforeListTest(fixture);

            estateToken.isAvailable.whenCalledWith(1).returns(false);

            await expect(
                getAssetMarketplaceTx_List(estateMarketplace as any, seller2, defaultParams)
            ).to.be.revertedWithCustomError(estateMarketplace, 'InvalidTokenId');
        });

        it('6.2.3.5. List token unsuccessfully with zero unit price', async () => {
            const fixture = await beforeEstateMarketplaceTest();
            const { estateMarketplace, seller1 } = fixture;

            const { defaultParams } = await beforeListTest(fixture);

            await expect(
                getAssetMarketplaceTx_List(estateMarketplace as any, seller1, {
                    ...defaultParams,
                    unitPrice: BigNumber.from(0),
                })
            ).to.be.revertedWithCustomError(estateMarketplace, 'InvalidUnitPrice');
        });

        it('6.2.3.6. List token unsuccessfully with invalid currency', async () => {
            const fixture = await beforeEstateMarketplaceTest({
                skipListSampleCurrencies: true,
            });
            const { estateMarketplace, seller1 } = fixture;

            const { defaultParams } = await beforeListTest(fixture);

            await expect(
                getAssetMarketplaceTx_List(estateMarketplace as any, seller1, defaultParams)
            ).to.be.revertedWithCustomError(estateMarketplace, 'InvalidCurrency');
        });

        it('6.2.3.7. List token unsuccessfully with zero selling amount', async () => {
            const fixture = await beforeEstateMarketplaceTest();
            const { estateMarketplace, seller1 } = fixture;

            const { defaultParams } = await beforeListTest(fixture);

            await expect(
                getAssetMarketplaceTx_List(estateMarketplace as any, seller1, {
                    ...defaultParams,
                    sellingAmount: BigNumber.from(0),
                })
            ).to.be.revertedWithCustomError(estateMarketplace, 'InvalidSellingAmount');
        });

        it('6.2.3.8. List token unsuccessfully with selling amount exceeding owned amount', async () => {
            const fixture = await beforeEstateMarketplaceTest();
            const { estateMarketplace, seller1 } = fixture;

            const { defaultParams } = await beforeListTest(fixture);

            await expect(
                getAssetMarketplaceTx_List(estateMarketplace as any, seller1, {
                    ...defaultParams,
                    sellingAmount: BigNumber.from(200_001),
                })
            ).to.be.revertedWithCustomError(estateMarketplace, 'InvalidSellingAmount');
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
            buyer: Wallet;
            amount: BigNumber | null;
        }[],
        isDivisible: boolean,
        isSafeBuy: boolean
    ) {
        const {
            deployer,
            estateForger,
            estateToken,
            estateMarketplace,
            feeReceiver,
            commissionToken,
            zone1,
            admins,
            admin,
            custodian1,
            manager,
        } = fixture;
        const decimals = Constant.ESTATE_TOKEN_TOKEN_DECIMALS;

        const zone = zone1;
        const broker = randomWallet();

        await callTransaction(
            getEstateTokenTxByInput_UpdateZoneRoyaltyRate(
                estateToken as any,
                deployer,
                {
                    zone,
                    royaltyRate: estateTokenRoyaltyRate,
                },
                admin,
                admins
            )
        );

        const currentEstateId = (await estateToken.estateNumber()).add(1);
        const currentOfferId = (await estateMarketplace.offerNumber()).add(1);

        await callTransaction(
            getCommissionTokenTx_RegisterBroker(commissionToken as any, manager, {
                zone,
                broker: broker.address,
                commissionRate,
            })
        );

        let newCurrency: Currency | null = null;
        let newCurrencyAddress: string;
        if (isERC20) {
            newCurrency = (await deployCurrency(
                deployer.address,
                `NewMockCurrency_${currentOfferId}`,
                `NMC_${currentOfferId}`
            )) as Currency;
            newCurrencyAddress = newCurrency.address;

            await callTransaction(
                newCurrency.setExclusiveDiscount(mockCurrencyExclusiveRate, Constant.COMMON_RATE_DECIMALS)
            );
        } else {
            newCurrencyAddress = ethers.constants.AddressZero;
        }

        await callTransaction(
            getAdminTxByInput_UpdateCurrencyRegistries(
                admin,
                deployer,
                {
                    currencies: [newCurrencyAddress],
                    isAvailable: [true],
                    isExclusive: [isExclusive],
                },
                admins
            )
        );

        let currentTimestamp = await time.latest();

        await callTransaction(
            getCallEstateTokenTx_TokenizeEstate(estateToken as any, estateForger, {
                totalSupply: BigNumber.from(0),
                zone,
                tokenizationId: BigNumber.from(0),
                uri: `Token_${currentEstateId}`,
                expireAt: currentTimestamp + 1e8,
                custodian: custodian1.address,
                broker: broker.address,
            })
        );

        await callTransaction(estateToken.mint(seller.address, currentEstateId, initialAmount));

        const params: ListParams = {
            tokenId: currentEstateId,
            sellingAmount: offerAmount,
            unitPrice: unitPrice,
            currency: newCurrencyAddress,
            isDivisible: isDivisible,
        };
        await callTransaction(getAssetMarketplaceTx_List(estateMarketplace as any, seller as any, params));

        let totalSold = ethers.BigNumber.from(0);
        let totalBought = new Map<string, BigNumber>();

        for (const { buyer, amount: ogAmount } of buyRecords) {
            const amount = ogAmount || offerAmount.sub(totalSold);

            let value = amount.mul(unitPrice).div(ethers.BigNumber.from(10).pow(decimals));
            let [royaltyReceiver, royaltyDenomination] = await estateToken.royaltyInfo(currentEstateId, unitPrice);
            royaltyDenomination = await applyDiscount(admin, royaltyDenomination, newCurrency);

            const royaltyAmount = royaltyDenomination.mul(amount).div(ethers.BigNumber.from(10).pow(decimals));
            let commissionAmount = royaltyAmount.mul(commissionRate).div(Constant.COMMON_RATE_MAX_FRACTION);
            let total = value.add(royaltyAmount);

            let ethValue = ethers.BigNumber.from(0);
            await prepareNativeToken(ethers.provider, deployer, [buyer], ethers.utils.parseEther('1.0'));
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
                const buyParams: BuyParams = {
                    offerId: currentOfferId,
                };
                if (isSafeBuy) {
                    tx = await getAssetMarketplaceTxByParams_SafeBuy(estateMarketplace, buyer as any, buyParams, {
                        value: ethValue,
                    });
                } else {
                    tx = await getAssetMarketplaceTx_Buy(estateMarketplace, buyer as any, buyParams, {
                        value: ethValue,
                    });
                }
            } else {
                const buyPartParams: BuyPartParams = {
                    offerId: currentOfferId,
                    amount: amount,
                };
                if (isSafeBuy) {
                    tx = await getAssetMarketplaceTxByParams_SafeBuyPart(
                        estateMarketplace,
                        buyer as any,
                        buyPartParams,
                        { value: ethValue }
                    );
                } else {
                    tx = await getAssetMarketplaceTx_BuyPart(estateMarketplace, buyer as any, buyPartParams, {
                        value: ethValue,
                    });
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

            await expect(tx)
                .to.emit(estateMarketplace, 'CommissionDispatch')
                .withArgs(broker.address, commissionAmount, newCurrencyAddress);

            await expect(tx)
                .to.emit(estateMarketplace, 'OfferSale')
                .withArgs(currentOfferId, buyer.address, amount, value, royaltyAmount, royaltyReceiver);

            totalSold = totalSold.add(amount);

            let totalBoughtOfBuyer = (totalBought.get(buyer.address) || ethers.BigNumber.from(0)).add(amount);
            totalBought.set(buyer.address, totalBoughtOfBuyer);

            const offer = await estateMarketplace.getOffer(currentOfferId);
            expect(offer.tokenId).to.equal(currentEstateId);
            expect(offer.sellingAmount).to.equal(offerAmount);
            expect(offer.soldAmount).to.equal(totalSold);
            expect(offer.unitPrice).to.equal(unitPrice);
            expect(offer.currency).to.equal(newCurrencyAddress);
            expect(offer.isDivisible).to.equal(isDivisible);
            expect(offer.state).to.equal(totalSold.eq(offerAmount) ? OfferState.Sold : OfferState.Selling);
            expect(offer.seller).to.equal(seller.address);

            expect(await getBalance(ethers.provider, buyer.address, newCurrency)).to.equal(expectedBuyerBalance);
            expect(await getBalance(ethers.provider, seller.address, newCurrency)).to.equal(expectedSellerBalance);
            expect(await getBalance(ethers.provider, feeReceiver.address, newCurrency)).to.equal(
                expectedFeeReceiverBalance
            );
            expect(await getBalance(ethers.provider, broker.address, newCurrency)).to.equal(expectedBrokerBalance);

            expect(await estateToken.balanceOf(seller.address, currentEstateId)).to.equal(initialAmount.sub(totalSold));
            expect(await estateToken.balanceOf(buyer.address, currentEstateId)).to.equal(totalBoughtOfBuyer);

            let walletsToReset = [seller, buyer, feeReceiver, broker];
            if (isERC20) {
                await resetERC20(newCurrency!, walletsToReset);
            } else {
                await resetNativeToken(ethers.provider, walletsToReset);
                await prepareNativeToken(ethers.provider, deployer, [seller, buyer], ethers.utils.parseEther('1.0'));
            }
        }
    }

    describe('6.2.4. buy(uint256)', async () => {
        it('6.2.4.1. Buy token successfully in all native/erc20 and exclusive/non-exclusive combinations', async () => {
            const fixture = await beforeEstateMarketplaceTest();
            const { seller1, buyer1 } = fixture;

            for (const isERC20 of [false, true]) {
                for (const isExclusive of [false, true]) {
                    if (!isERC20 && isExclusive) {
                        continue;
                    }
                    await testBuyOffer(
                        fixture,
                        ethers.utils.parseEther('0.3'),
                        ethers.utils.parseEther('0.1'),
                        ethers.utils.parseEther('0.2'),
                        isERC20,
                        isExclusive,
                        ethers.BigNumber.from(200_000),
                        ethers.BigNumber.from(100_000),
                        ethers.utils.parseEther('100'),
                        seller1,
                        [{ buyer: buyer1, amount: null }],
                        true,
                        false
                    );
                }
            }
        });

        it('6.2.4.2. Buy token successfully at very large amount', async () => {
            const fixture = await beforeEstateMarketplaceTest();
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
                        ethers.utils.parseEther('0.99'),
                        ethers.utils.parseEther('0.99'),
                        ethers.utils.parseEther('0.99'),
                        isERC20,
                        isExclusive,
                        amount,
                        amount,
                        base,
                        seller1,
                        [{ buyer: buyer1, amount: null }],
                        true,
                        false
                    );
                }
            }
        });

        it('6.2.4.3. Buy token successfully with indivisible offer', async () => {
            const fixture = await beforeEstateMarketplaceTest();
            const { seller1, buyer1 } = fixture;

            await testBuyOffer(
                fixture,
                ethers.utils.parseEther('0.3'),
                ethers.utils.parseEther('0.1'),
                ethers.utils.parseEther('0.2'),
                false,
                false,
                ethers.BigNumber.from(200_000),
                ethers.BigNumber.from(100_000),
                ethers.BigNumber.from('100'),
                seller1,
                [{ buyer: buyer1, amount: null }],
                false,
                false
            );

            await testBuyOffer(
                fixture,
                ethers.utils.parseEther('0.3'),
                ethers.utils.parseEther('0.1'),
                ethers.utils.parseEther('0.2'),
                true,
                true,
                ethers.BigNumber.from(300),
                ethers.BigNumber.from(200),
                ethers.utils.parseEther('500000'),
                seller1,
                [{ buyer: buyer1, amount: null }],
                false,
                false
            );
        });

        it('6.2.4.4. Buy token successfully in 10 random test cases', async () => {
            const fixture = await beforeEstateMarketplaceTest();
            const { seller1, buyer1, buyer2 } = fixture;

            for (let testcase = 0; testcase < 10; testcase++) {
                const isERC20 = Math.random() < 0.5;
                const isExclusive = Math.random() < 0.5;
                if (!isERC20 && isExclusive) {
                    --testcase;
                    continue;
                }

                const royaltyRate = randomBigNumber(ethers.BigNumber.from(0), ethers.utils.parseEther('1'));
                const exclusiveRate = randomBigNumber(ethers.BigNumber.from(0), ethers.utils.parseEther('1'));
                const commissionRate = randomBigNumber(ethers.BigNumber.from(0), ethers.utils.parseEther('1'));

                const randomNums = [];
                for (let i = 0; i < 2; ++i) {
                    const maxSupply = ethers.BigNumber.from(2).pow(256).sub(1);
                    randomNums.push(ethers.BigNumber.from(ethers.utils.randomBytes(32)).mod(maxSupply).add(1));
                }
                randomNums.sort((a, b) => (a.sub(b).lt(0) ? -1 : 1));

                const offerAmount = randomNums[0];
                const initAmount = randomNums[1];

                const unitPrice = randomBigNumber(
                    ethers.BigNumber.from(1),
                    ethers.BigNumber.from(2).pow(256).sub(1).div(initAmount)
                );

                const seller = seller1;
                const buyRecords = [
                    {
                        buyer: Math.random() < 0.5 ? buyer1 : buyer2,
                        amount: null,
                    },
                ];
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
                    false
                );
            }
        });

        it('6.2.4.5. Buy token unsuccessfully with invalid offer id', async () => {
            const fixture = await beforeEstateMarketplaceTest({
                listSampleOffers: true,
            });
            const { estateMarketplace, buyer1 } = fixture;

            await expect(
                getAssetMarketplaceTx_Buy(
                    estateMarketplace,
                    buyer1,
                    {
                        offerId: BigNumber.from(0),
                    },
                    { value: 1e9 }
                )
            ).to.be.revertedWithCustomError(estateMarketplace, 'InvalidOfferId');

            await expect(
                getAssetMarketplaceTx_Buy(
                    estateMarketplace,
                    buyer1,
                    {
                        offerId: BigNumber.from(3),
                    },
                    { value: 1e9 }
                )
            ).to.be.revertedWithCustomError(estateMarketplace, 'InvalidOfferId');
        });
    });

    describe('6.2.5. buy(uint256,uint256)', async () => {
        it('6.2.5.1. Buy token successfully in all native/erc20 and exclusive/non-exclusive combinations', async () => {
            const fixture = await beforeEstateMarketplaceTest();
            const { seller1, buyer1 } = fixture;

            for (const isERC20 of [false, true]) {
                for (const isExclusive of [false, true]) {
                    if (!isERC20 && isExclusive) {
                        continue;
                    }
                    await testBuyOffer(
                        fixture,
                        ethers.utils.parseEther('0.3'),
                        ethers.utils.parseEther('0.1'),
                        ethers.utils.parseEther('0.2'),
                        isERC20,
                        isExclusive,
                        ethers.BigNumber.from(200_000),
                        ethers.BigNumber.from(150_000),
                        ethers.BigNumber.from('120'),
                        seller1,
                        [
                            {
                                buyer: buyer1,
                                amount: ethers.BigNumber.from(100_000),
                            },
                            {
                                buyer: buyer1,
                                amount: ethers.BigNumber.from(50_000),
                            },
                        ],
                        true,
                        false
                    );
                }
            }
        });

        it('6.2.5.2. Buy token successfully at very large amount in all native/erc20 and exclusive/non-exclusive combinations', async () => {
            const fixture = await beforeEstateMarketplaceTest();
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
                        ethers.utils.parseEther('0.99'),
                        ethers.utils.parseEther('0.99'),
                        ethers.utils.parseEther('0.99'),
                        isERC20,
                        isExclusive,
                        amount,
                        amount,
                        base,
                        seller1,
                        [
                            {
                                buyer: buyer1,
                                amount: ethers.BigNumber.from(150_000),
                            },
                            {
                                buyer: buyer1,
                                amount: ethers.BigNumber.from(50_000),
                            },
                        ],
                        true,
                        false
                    );
                }
            }
        });

        it('6.2.5.3. Buy token successfully in 10 random test cases', async () => {
            const fixture = await beforeEstateMarketplaceTest();
            const { seller1, buyer1, buyer2 } = fixture;

            for (let testcase = 0; testcase < 10; testcase++) {
                const isERC20 = Math.random() < 0.5;
                const isExclusive = Math.random() < 0.5;
                if (!isERC20 && isExclusive) {
                    --testcase;
                    continue;
                }

                const royaltyRate = randomBigNumber(ethers.BigNumber.from(0), ethers.utils.parseEther('1'));
                const exclusiveRate = randomBigNumber(ethers.BigNumber.from(0), ethers.utils.parseEther('1'));
                const commissionRate = randomBigNumber(ethers.BigNumber.from(0), ethers.utils.parseEther('1'));

                const randomNums = [];
                for (let i = 0; i < 2; ++i) {
                    const maxSupply = ethers.BigNumber.from(2).pow(256).sub(1);
                    randomNums.push(ethers.BigNumber.from(ethers.utils.randomBytes(32)).mod(maxSupply).add(1));
                }
                randomNums.sort((a, b) => (a.sub(b).lt(0) ? -1 : 1));

                const offerAmount = randomNums[0];
                const initAmount = randomNums[1];

                const unitPrice = randomBigNumber(
                    ethers.BigNumber.from(1),
                    ethers.BigNumber.from(2).pow(256).sub(1).div(initAmount)
                );

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
                    false
                );
            }
        });

        it('6.2.5.4. Buy token unsuccessfully when paused', async () => {
            const fixture = await beforeEstateMarketplaceTest({
                listSampleOffers: true,
                pause: true,
            });
            const { estateMarketplace, buyer1 } = fixture;

            await expect(
                getAssetMarketplaceTx_BuyPart(
                    estateMarketplace,
                    buyer1,
                    {
                        offerId: BigNumber.from(1),
                        amount: BigNumber.from(100_000),
                    },
                    { value: 1e9 }
                )
            ).to.be.revertedWith('Pausable: paused');
        });

        it('6.2.5.5. Buy token unsuccessfully with invalid offer id', async () => {
            const fixture = await beforeEstateMarketplaceTest({
                listSampleOffers: true,
            });
            const { estateMarketplace, buyer1 } = fixture;

            await expect(
                getAssetMarketplaceTx_BuyPart(
                    estateMarketplace,
                    buyer1,
                    {
                        offerId: BigNumber.from(0),
                        amount: BigNumber.from(100_000),
                    },
                    { value: 1e9 }
                )
            ).to.be.revertedWithCustomError(estateMarketplace, 'InvalidOfferId');

            await expect(
                getAssetMarketplaceTx_BuyPart(
                    estateMarketplace,
                    buyer1,
                    {
                        offerId: BigNumber.from(3),
                        amount: BigNumber.from(100_000),
                    },
                    { value: 1e9 }
                )
            ).to.be.revertedWithCustomError(estateMarketplace, 'InvalidOfferId');
        });

        it('6.2.5.6. Buy token unsuccessfully when token is not available', async () => {
            const fixture = await beforeEstateMarketplaceTest({
                listSampleOffers: true,
            });
            const { estateMarketplace, buyer1, estateToken } = fixture;

            estateToken.isAvailable.whenCalledWith(1).returns(false);

            await expect(
                getAssetMarketplaceTx_BuyPart(
                    estateMarketplace,
                    buyer1,
                    {
                        offerId: BigNumber.from(1),
                        amount: BigNumber.from(100_000),
                    },
                    { value: 1e9 }
                )
            ).to.be.revertedWithCustomError(estateMarketplace, 'InvalidTokenId');
        });

        it('6.2.5.7. Buy token unsuccessfully when seller buy their own token', async () => {
            const fixture = await beforeEstateMarketplaceTest({
                listSampleOffers: true,
            });
            const { estateMarketplace, seller1, seller2 } = fixture;

            await expect(
                getAssetMarketplaceTx_BuyPart(
                    estateMarketplace,
                    seller1,
                    {
                        offerId: BigNumber.from(1),
                        amount: BigNumber.from(100_000),
                    },
                    { value: 1e9 }
                )
            ).to.be.revertedWithCustomError(estateMarketplace, 'InvalidBuying');

            await expect(
                getAssetMarketplaceTx_BuyPart(
                    estateMarketplace,
                    seller2,
                    {
                        offerId: BigNumber.from(2),
                        amount: BigNumber.from(100_000),
                    },
                    { value: 1e9 }
                )
            ).to.be.revertedWithCustomError(estateMarketplace, 'InvalidBuying');
        });

        it('6.2.5.8. Buy token unsuccessfully when offer is not selling', async () => {
            const fixture = await beforeEstateMarketplaceTest({
                listSampleOffers: true,
            });
            const { estateMarketplace, buyer1, buyer2 } = fixture;

            await callTransaction(
                getAssetMarketplaceTx_BuyPart(
                    estateMarketplace,
                    buyer1,
                    {
                        offerId: BigNumber.from(1),
                        amount: BigNumber.from(150_000),
                    },
                    { value: 1e9 }
                )
            );

            await expect(
                getAssetMarketplaceTx_BuyPart(
                    estateMarketplace,
                    buyer2,
                    {
                        offerId: BigNumber.from(1),
                        amount: BigNumber.from(150_000),
                    },
                    { value: 1e9 }
                )
            ).to.be.revertedWithCustomError(estateMarketplace, 'InvalidBuying');
        });

        it('6.2.5.9. Buy token unsuccessfully with indivisible offer', async () => {
            const fixture = await beforeEstateMarketplaceTest({
                listSampleOffers: true,
            });
            const { estateMarketplace, seller1, buyer1 } = fixture;

            await callTransaction(
                getAssetMarketplaceTx_List(estateMarketplace, seller1, {
                    tokenId: BigNumber.from(1),
                    sellingAmount: BigNumber.from(50_000),
                    unitPrice: ethers.utils.parseEther('100'),
                    currency: ethers.constants.AddressZero,
                    isDivisible: false,
                })
            );

            const offerId = await estateMarketplace.offerNumber();

            await expect(
                getAssetMarketplaceTx_BuyPart(
                    estateMarketplace,
                    buyer1,
                    {
                        offerId: BigNumber.from(offerId),
                        amount: BigNumber.from(50_000),
                    },
                    { value: 1e9 }
                )
            ).to.be.revertedWithCustomError(estateMarketplace, 'NotDivisible');
        });

        it('6.2.5.10. Buy token unsuccessfully when there is not enough tokens to sell', async () => {
            const fixture = await beforeEstateMarketplaceTest({
                listSampleOffers: true,
            });
            const { estateMarketplace, buyer1, buyer2 } = fixture;

            await callTransaction(
                getAssetMarketplaceTx_BuyPart(
                    estateMarketplace,
                    buyer1,
                    {
                        offerId: BigNumber.from(1),
                        amount: BigNumber.from(100_000),
                    },
                    { value: 1e9 }
                )
            );

            await expect(
                getAssetMarketplaceTx_BuyPart(
                    estateMarketplace,
                    buyer2,
                    {
                        offerId: BigNumber.from(1),
                        amount: BigNumber.from(100_000),
                    },
                    { value: 1e9 }
                )
            ).to.be.revertedWithCustomError(estateMarketplace, 'NotEnoughTokensToSell');
        });

        it('6.2.5.11. Buy token unsuccessfully with insufficient native token', async () => {
            const fixture = await beforeEstateMarketplaceTest({
                listSampleOffers: true,
            });
            const { estateMarketplace, buyer1 } = fixture;

            await expect(
                getAssetMarketplaceTx_BuyPart(estateMarketplace, buyer1, {
                    offerId: BigNumber.from(1),
                    amount: BigNumber.from(100_000),
                })
            ).to.be.revertedWithCustomError(estateMarketplace, 'InsufficientValue');
        });

        it('6.2.5.12. Buy token unsuccessfully when transferring native token to seller failed', async () => {
            const fixture = await beforeEstateMarketplaceTest();
            const { estateMarketplace, seller1, buyer1, deployer, estateToken } = fixture;

            const failReceiver = await deployFailReceiver(deployer, true, false);

            await callTransaction(
                estateToken
                    .connect(seller1)
                    .safeTransferFrom(
                        seller1.address,
                        failReceiver.address,
                        1,
                        200_000,
                        ethers.utils.toUtf8Bytes('TestToken_1')
                    )
            );

            await callTransaction(
                failReceiver.call(
                    estateToken.address,
                    estateToken.interface.encodeFunctionData('setApprovalForAll', [estateMarketplace.address, true])
                )
            );

            await callTransaction(
                failReceiver.call(
                    estateMarketplace.address,
                    estateMarketplace.interface.encodeFunctionData('list', [
                        1,
                        100_000,
                        1000,
                        ethers.constants.AddressZero,
                        true,
                    ])
                )
            );

            await expect(
                getAssetMarketplaceTx_BuyPart(
                    estateMarketplace,
                    buyer1,
                    {
                        offerId: BigNumber.from(1),
                        amount: BigNumber.from(100_000),
                    },
                    { value: 1e9 }
                )
            ).to.be.revertedWithCustomError(estateMarketplace, 'FailedTransfer');
        });

        it('6.2.5.13. Buy token unsuccessfully when transferring native token to royalty receiver failed', async () => {
            const fixture = await beforeEstateMarketplaceTest({
                listSampleOffers: true,
                useFailRoyaltyReceiver: true,
            });
            const { estateMarketplace, buyer1, estateToken, failReceiver } = fixture;

            await callTransaction(failReceiver.activate(true));

            await estateToken.updateFeeReceiver(failReceiver.address);

            await expect(
                getAssetMarketplaceTx_BuyPart(
                    estateMarketplace,
                    buyer1,
                    {
                        offerId: BigNumber.from(1),
                        amount: BigNumber.from(100_000),
                    },
                    { value: 1e9 }
                )
            ).to.be.revertedWithCustomError(estateMarketplace, 'FailedTransfer');
        });

        it('6.2.5.14. Buy token unsuccessfully when transferring native token to broker failed', async () => {
            const fixture = await beforeEstateMarketplaceTest();
            const { estateMarketplace, seller1, buyer1, deployer, estateToken, commissionToken, broker2 } = fixture;

            const failReceiver = await deployFailReceiver(deployer, true, false);

            await callTransaction(
                commissionToken.connect(broker2).transferFrom(broker2.address, failReceiver.address, 2)
            );

            await callTransaction(
                getAssetMarketplaceTx_List(estateMarketplace as any, seller1 as any, {
                    tokenId: BigNumber.from(2),
                    sellingAmount: BigNumber.from(200),
                    unitPrice: ethers.utils.parseEther('500000'),
                    currency: ethers.constants.AddressZero,
                    isDivisible: true,
                })
            );
            await callTransaction(estateToken.connect(seller1).setApprovalForAll(estateMarketplace.address, true));

            const offerId = await estateMarketplace.offerNumber();

            await expect(
                getAssetMarketplaceTx_BuyPart(
                    estateMarketplace,
                    buyer1,
                    {
                        offerId: BigNumber.from(offerId),
                        amount: BigNumber.from(100),
                    },
                    { value: 1e9 }
                )
            ).to.be.revertedWithCustomError(estateMarketplace, 'FailedTransfer');
        });

        it('6.2.5.15. Buy token unsuccessfully when refunding to sender failed', async () => {
            const fixture = await beforeEstateMarketplaceTest({
                listSampleOffers: true,
            });
            const { estateMarketplace, deployer } = fixture;

            const failReceiver = await deployFailReceiver(deployer, true, false);

            await expect(
                failReceiver.call(
                    estateMarketplace.address,
                    estateMarketplace.interface.encodeFunctionData('buy(uint256,uint256)', [1, 100_000]),
                    { value: 1e9 }
                )
            ).to.be.revertedWithCustomError(estateMarketplace, 'FailedRefund');
        });

        it('6.2.5.16. Buy token unsuccessfully when the contract is reentered', async () => {
            const fixture = await beforeEstateMarketplaceTest();
            const { deployer, estateToken, estateMarketplace, buyer1 } = fixture;

            const reentrancy = await deployReentrancyReceiver(deployer, true, false);

            await callTransaction(estateToken.mint(reentrancy.address, 1, 100_000));

            await callTransaction(
                reentrancy.call(
                    estateMarketplace.address,
                    estateMarketplace.interface.encodeFunctionData('list', [
                        1,
                        100_000,
                        1000,
                        ethers.constants.AddressZero,
                        true,
                    ])
                )
            );

            await callTransaction(
                reentrancy.call(
                    estateToken.address,
                    estateToken.interface.encodeFunctionData('setApprovalForAll', [estateMarketplace.address, true])
                )
            );

            await testReentrancy_Marketplace(estateMarketplace, reentrancy, async () => {
                await expect(
                    getAssetMarketplaceTx_BuyPart(
                        estateMarketplace,
                        buyer1,
                        {
                            offerId: BigNumber.from(1),
                            amount: BigNumber.from(100_000),
                        },
                        { value: 1e9 }
                    )
                ).to.be.revertedWithCustomError(estateMarketplace, 'FailedTransfer');
            });
        });
    });

    describe('6.2.6. cancel(uint256)', async () => {
        it('6.2.6.1. Cancel offer successfully by seller', async () => {
            const fixture = await beforeEstateMarketplaceTest({
                listSampleOffers: true,
            });
            const { estateMarketplace, seller1 } = fixture;

            let tx = await getAssetMarketplaceTx_Cancel(estateMarketplace, seller1, {
                offerId: BigNumber.from(1),
            });
            await tx.wait();

            const offer = await estateMarketplace.getOffer(1);
            expect(offer.state).to.equal(OfferState.Cancelled);

            await expect(tx).to.emit(estateMarketplace, 'OfferCancellation').withArgs(1);
        });

        it('6.2.6.2. Cancel offer successfully by manager', async () => {
            const fixture = await beforeEstateMarketplaceTest({
                listSampleOffers: true,
            });
            const { estateMarketplace, manager } = fixture;

            let tx = await getAssetMarketplaceTx_Cancel(estateMarketplace, manager, {
                offerId: BigNumber.from(1),
            });
            await tx.wait();

            const offer = await estateMarketplace.getOffer(1);
            expect(offer.state).to.equal(OfferState.Cancelled);

            await expect(tx).to.emit(estateMarketplace, 'OfferCancellation').withArgs(1);
        });

        it('6.2.6.3. Cancel offer unsuccessfully with invalid offer id', async () => {
            const fixture = await beforeEstateMarketplaceTest({
                listSampleOffers: true,
            });
            const { estateMarketplace, manager } = fixture;

            await expect(
                getAssetMarketplaceTx_Cancel(estateMarketplace, manager, {
                    offerId: BigNumber.from(0),
                })
            ).to.be.revertedWithCustomError(estateMarketplace, 'InvalidOfferId');
            await expect(
                getAssetMarketplaceTx_Cancel(estateMarketplace, manager, {
                    offerId: BigNumber.from(3),
                })
            ).to.be.revertedWithCustomError(estateMarketplace, 'InvalidOfferId');
        });

        it('6.2.6.4. Cancel offer unsuccessfully by unauthorized user', async () => {
            const fixture = await beforeEstateMarketplaceTest({
                listSampleOffers: true,
            });
            const { estateMarketplace, seller2, moderator } = fixture;

            await expect(
                getAssetMarketplaceTx_Cancel(estateMarketplace, seller2, {
                    offerId: BigNumber.from(1),
                })
            ).to.be.revertedWithCustomError(estateMarketplace, 'Unauthorized');

            await expect(
                getAssetMarketplaceTx_Cancel(estateMarketplace, moderator, {
                    offerId: BigNumber.from(1),
                })
            ).to.be.revertedWithCustomError(estateMarketplace, 'Unauthorized');
        });

        it('6.2.6.5. Cancel offer unsuccessfully with already cancelled offer', async () => {
            const fixture = await beforeEstateMarketplaceTest({
                listSampleOffers: true,
            });
            const { estateMarketplace, manager } = fixture;

            await callTransaction(
                getAssetMarketplaceTx_Cancel(estateMarketplace, manager, {
                    offerId: BigNumber.from(1),
                })
            );
            await expect(
                getAssetMarketplaceTx_Cancel(estateMarketplace, manager, {
                    offerId: BigNumber.from(1),
                })
            ).to.be.revertedWithCustomError(estateMarketplace, 'InvalidCancelling');
        });

        it('6.2.6.6. Cancel offer unsuccessfully when offer is sold out', async () => {
            const fixture = await beforeEstateMarketplaceTest({
                listSampleOffers: true,
            });
            const { estateMarketplace, manager, buyer1 } = fixture;

            await callTransaction(
                getAssetMarketplaceTx_Buy(estateMarketplace, buyer1, { offerId: BigNumber.from(1) }, { value: 1e9 })
            );

            await expect(
                getAssetMarketplaceTx_Cancel(estateMarketplace, manager, {
                    offerId: BigNumber.from(1),
                })
            ).to.be.revertedWithCustomError(estateMarketplace, 'InvalidCancelling');
        });
    });

    describe('6.2.7. safeBuy(uint256,bytes32)', async () => {
        it('6.2.7.1. Buy token successfully in both native and ERC20', async () => {
            const fixture = await beforeEstateMarketplaceTest();
            const { seller1, buyer1 } = fixture;

            for (const isERC20 of [false, true]) {
                for (const isExclusive of [false, true]) {
                    if (!isERC20 && isExclusive) {
                        continue;
                    }
                    await testBuyOffer(
                        fixture,
                        ethers.utils.parseEther('0.3'),
                        ethers.utils.parseEther('0.1'),
                        ethers.utils.parseEther('0.2'),
                        isERC20,
                        isExclusive,
                        ethers.BigNumber.from(200_000),
                        ethers.BigNumber.from(100_000),
                        ethers.utils.parseEther('100'),
                        seller1,
                        [{ buyer: buyer1, amount: null }],
                        true,
                        true
                    );
                }
            }
        });

        it('6.2.7.2. Buy token unsuccessfully with invalid offer id', async () => {
            const fixture = await beforeEstateMarketplaceTest({
                listSampleOffers: true,
            });
            const { estateMarketplace, buyer1 } = fixture;

            await expect(
                getAssetMarketplaceTx_SafeBuy(
                    estateMarketplace,
                    buyer1,
                    {
                        offerId: BigNumber.from(0),
                        anchor: ethers.constants.HashZero,
                    },
                    { value: 1e9 }
                )
            ).to.be.revertedWithCustomError(estateMarketplace, 'InvalidOfferId');

            await expect(
                getAssetMarketplaceTx_SafeBuy(
                    estateMarketplace,
                    buyer1,
                    {
                        offerId: BigNumber.from(3),
                        anchor: ethers.constants.HashZero,
                    },
                    { value: 1e9 }
                )
            ).to.be.revertedWithCustomError(estateMarketplace, 'InvalidOfferId');
        });

        it('6.2.7.3. Buy token unsuccessfully with invalid anchor', async () => {
            const fixture = await beforeEstateMarketplaceTest({
                listSampleOffers: true,
            });
            const { estateMarketplace, buyer1, buyer2 } = fixture;

            await expect(
                getAssetMarketplaceTx_SafeBuy(
                    estateMarketplace,
                    buyer1,
                    {
                        offerId: BigNumber.from(1),
                        anchor: ethers.constants.HashZero,
                    },
                    { value: 1e9 }
                )
            ).to.be.revertedWithCustomError(estateMarketplace, 'BadAnchor');

            await expect(
                getAssetMarketplaceTx_SafeBuy(
                    estateMarketplace,
                    buyer2,
                    {
                        offerId: BigNumber.from(2),
                        anchor: ethers.constants.HashZero,
                    },
                    { value: 1e9 }
                )
            ).to.be.revertedWithCustomError(estateMarketplace, 'BadAnchor');
        });
    });

    describe('6.2.8. safeBuy(uint256,uint256,bytes32)', async () => {
        it('6.2.8.1. Buy token successfully in both native and ERC20', async () => {
            const fixture = await beforeEstateMarketplaceTest();
            const { seller1, buyer1 } = fixture;

            for (const isERC20 of [false, true]) {
                for (const isExclusive of [false, true]) {
                    if (!isERC20 && isExclusive) {
                        continue;
                    }
                    await testBuyOffer(
                        fixture,
                        ethers.utils.parseEther('0.3'),
                        ethers.utils.parseEther('0.1'),
                        ethers.utils.parseEther('0.2'),
                        isERC20,
                        isExclusive,
                        ethers.BigNumber.from(200_000),
                        ethers.BigNumber.from(150_000),
                        ethers.BigNumber.from('120'),
                        seller1,
                        [
                            {
                                buyer: buyer1,
                                amount: ethers.BigNumber.from(100_000),
                            },
                            {
                                buyer: buyer1,
                                amount: ethers.BigNumber.from(50_000),
                            },
                        ],
                        true,
                        true
                    );
                }
            }
        });

        it('6.2.8.2. Buy token unsuccessfully with invalid offer id', async () => {
            const fixture = await beforeEstateMarketplaceTest({
                listSampleOffers: true,
            });
            const { estateMarketplace, buyer1 } = fixture;

            await expect(
                getAssetMarketplaceTx_SafeBuyPart(
                    estateMarketplace,
                    buyer1,
                    {
                        offerId: BigNumber.from(0),
                        amount: BigNumber.from(100_000),
                        anchor: ethers.constants.HashZero,
                    },
                    { value: 1e9 }
                )
            ).to.be.revertedWithCustomError(estateMarketplace, 'InvalidOfferId');

            await expect(
                getAssetMarketplaceTx_SafeBuyPart(
                    estateMarketplace,
                    buyer1,
                    {
                        offerId: BigNumber.from(3),
                        amount: BigNumber.from(100_000),
                        anchor: ethers.constants.HashZero,
                    },
                    { value: 1e9 }
                )
            ).to.be.revertedWithCustomError(estateMarketplace, 'InvalidOfferId');
        });

        it('6.2.8.3. Buy token unsuccessfully with invalid anchor', async () => {
            const fixture = await beforeEstateMarketplaceTest({
                listSampleOffers: true,
            });
            const { estateMarketplace, buyer1, buyer2 } = fixture;

            await expect(
                getAssetMarketplaceTx_SafeBuyPart(
                    estateMarketplace,
                    buyer1,
                    {
                        offerId: BigNumber.from(1),
                        amount: BigNumber.from(100_000),
                        anchor: ethers.constants.HashZero,
                    },
                    { value: 1e9 }
                )
            ).to.be.revertedWithCustomError(estateMarketplace, 'BadAnchor');

            await expect(
                getAssetMarketplaceTx_SafeBuyPart(
                    estateMarketplace,
                    buyer2,
                    {
                        offerId: BigNumber.from(2),
                        amount: BigNumber.from(100_000),
                        anchor: ethers.constants.HashZero,
                    },
                    { value: 1e9 }
                )
            ).to.be.revertedWithCustomError(estateMarketplace, 'BadAnchor');
        });
    });
});
