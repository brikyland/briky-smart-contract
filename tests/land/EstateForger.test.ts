import chai, {expect} from 'chai';
import {BigNumber, Contract} from 'ethers';
import {ethers} from 'hardhat';

// @defi-wonderland/smock
import {MockContract, smock} from '@defi-wonderland/smock';

// @nomicfoundation/hardhat-network-helpers
import {loadFixture, time} from '@nomicfoundation/hardhat-network-helpers';

// @tests
import {
    IERC165UpgradeableInterfaceId,
    IEstateTokenizerInterfaceId,
    IEstateTokenReceiverInterfaceId,
} from '@tests/interfaces';
import {Constant, DAY} from '@tests/test.constant';

// @tests/land
import {Initialization as LandInitialization} from '@tests/land/test.initialization';

// @typechain-types
import {
    Admin,
    CommissionToken,
    Currency,
    EstateForger,
    EstateToken,
    FeeReceiver,
    MockEstateForger,
    PriceFeed,
    PriceWatcher,
    ReserveVault,
} from '@typechain-types';

// @utils
import {
    callTransaction,
    callTransactionAtTimestamp,
    getBalance,
    prepareERC20,
    prepareNativeToken,
    randomWallet,
    resetERC20,
    resetNativeToken,
    testReentrancy,
} from '@utils/blockchain';
import {getCashbackBaseDenomination, scaleRate} from '@utils/formula';
import {MockValidator} from '@utils/mockValidator';
import {getBytes4Hex, OrderedMap, randomBigNumber, structToObject} from '@utils/utils';

// @utils/deployments/common
import {deployAdmin} from '@utils/deployments/common/admin';
import {deployCurrency} from '@utils/deployments/common/currency';
import {deployFeeReceiver} from '@utils/deployments/common/feeReceiver';
import {deployPriceWatcher} from '@utils/deployments/common/priceWatcher';

// @utils/deployments/mock
import {deployFailReceiver} from '@utils/deployments/mock/utilities/failReceiver';
import {deployGovernor} from '@utils/deployments/common/governor';
import {deployMockEstateForger} from '@utils/deployments/mock/land/mockEstateForger';
import {deployPriceFeed} from '@utils/deployments/mock/utilities/priceFeed';
import {deployReentrancyReceiver} from '@utils/deployments/mock/reentrancy/reentrancyReceiver';

// @utils/models/land
import {
    ConfirmParams,
    DepositParams,
    RequestAgenda,
    RequestEstate,
    RequestQuota,
    RequestQuote,
    RequestTokenizationParams,
    RequestTokenizationParamsInput,
    UpdateBaseUnitPriceRangeParams,
    UpdateBaseUnitPriceRangeParamsInput,
    UpdateRequestAgendaParams,
    UpdateRequestEstateURIParams,
    UpdateRequestEstateURIParamsInput,
    WhitelistForParams,
    WhitelistParams,
    WhitelistParamsInput,
} from '@utils/models/land/estateForger';

// @utils/signatures/land
import {getUpdateBaseUnitPriceRangeSignatures, getWhitelistSignatures} from '@utils/signatures/land/estateForger';

// @utils/validation/land
import {
    getRequestTokenizationValidation,
    getUpdateRequestEstateURIValidation,
} from '@utils/validation/land/estateForger';

// @utils/transaction/common
import {
    getAdminTxByInput_ActivateIn,
    getAdminTxByInput_AuthorizeManagers,
    getAdminTxByInput_AuthorizeModerators,
    getAdminTxByInput_DeclareZone,
    getAdminTxByInput_UpdateCurrencyRegistries,
} from '@utils/transaction/common/admin';
import {getReserveVaultTxByInput_AuthorizeProvider} from '@utils/transaction/common/reserveVault';
import {getPausableTxByInput_Pause} from '@utils/transaction/common/pausable';
import {
    getPriceWatcherTxByInput_UpdateDefaultRates,
    getPriceWatcherTxByInput_UpdatePriceFeeds,
} from '@utils/transaction/common/priceWatcher';

// @utils/transaction/land
import {
    getCommissionTokenTx_ActivateBroker,
    getCommissionTokenTx_RegisterBroker,
} from '@utils/transaction/land/commissionToken';
import {
    getCallEstateForgerTx_Deposit,
    getEstateForgerTx_Cancel,
    getEstateForgerTx_Deposit,
    getEstateForgerTx_RequestTokenization,
    getEstateForgerTx_SafeConfirm,
    getEstateForgerTx_SafeDeposit,
    getEstateForgerTx_UpdateBaseUnitPriceRange,
    getEstateForgerTx_UpdateRequestAgenda,
    getEstateForgerTx_UpdateRequestEstateURI,
    getEstateForgerTx_Whitelist,
    getEstateForgerTx_WhitelistFor,
    getEstateForgerTx_WithdrawDeposit,
    getEstateForgerTx_WithdrawEstateToken,
    getEstateForgerTxByInput_RequestTokenization,
    getEstateForgerTxByInput_UpdateBaseUnitPriceRange,
    getEstateForgerTxByInput_UpdateRequestEstateURI,
    getEstateForgerTxByInput_Whitelist,
    getEstateForgerTxByParams_SafeConfirm,
    getEstateForgerTxByParams_SafeDeposit,
} from '@utils/transaction/land/estateForger';
import {
    getEstateTokenTxByInput_AuthorizeTokenizers,
    getEstateTokenTxByInput_RegisterCustodian,
    getEstateTokenTxByInput_UpdateCommissionToken,
} from '@utils/transaction/land/estateToken';

chai.use(smock.matchers);

export interface EstateForgerFixture {
    deployer: any;
    admins: any[];
    manager: any;
    moderator: any;
    user: any;
    custodian1: any;
    custodian2: any;
    custodian3: any;
    depositor1: any;
    depositor2: any;
    depositor3: any;
    depositors: any[];
    broker1: any;
    broker2: any;
    validator: MockValidator;

    admin: Admin;
    currencies: Currency[];
    nativePriceFeed: PriceFeed;
    currencyPriceFeed: PriceFeed;
    feeReceiver: FeeReceiver;
    estateToken: MockContract<EstateToken>;
    commissionToken: MockContract<CommissionToken>;
    reserveVault: MockContract<ReserveVault>;
    priceWatcher: PriceWatcher;
    estateForger: MockEstateForger;

    failReceiver: any;
    reentrancy: any;
    zone1: string;
    zone2: string;
}

async function testReentrancy_estateForger(estateForger: EstateForger, reentrancyContract: Contract, assertion: any) {
    let data = [
        estateForger.interface.encodeFunctionData('deposit', [0, 0]),
        estateForger.interface.encodeFunctionData('safeConfirm', [
            0,
            ethers.utils.keccak256(ethers.utils.toUtf8Bytes('')),
        ]),
        estateForger.interface.encodeFunctionData('withdrawDeposit', [0]),
    ];

    await testReentrancy(reentrancyContract, estateForger, data, assertion);
}

export async function getCommissionDenomination(
    commissionToken: CommissionToken,
    feeDenomination: BigNumber,
    zone: string,
    broker: string
) {
    return scaleRate(feeDenomination, await commissionToken.getBrokerCommissionRate(zone, broker));
}

describe('2.2. EstateForger', async () => {
    async function estateForgerFixture(): Promise<EstateForgerFixture> {
        const [
            deployer,
            admin1,
            admin2,
            admin3,
            admin4,
            admin5,
            user,
            manager,
            moderator,
            custodian1,
            custodian2,
            custodian3,
            depositor1,
            depositor2,
            depositor3,
            broker1,
            broker2,
        ] = await ethers.getSigners();
        const admins = [admin1, admin2, admin3, admin4, admin5];

        const depositors = [depositor1, depositor2, depositor3];

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

        const SmockCurrencyFactory = (await smock.mock('Currency')) as any;
        const currency1 = await SmockCurrencyFactory.deploy();
        const currency2 = await SmockCurrencyFactory.deploy();
        const currency3 = await SmockCurrencyFactory.deploy();
        await callTransaction(currency1.initialize('MockCurrency1', 'MCK1'));
        await callTransaction(currency2.initialize('MockCurrency2', 'MCK2'));
        await callTransaction(currency3.initialize('MockCurrency3', 'MCK3'));

        await callTransaction(
            currency1.setExclusiveDiscount(ethers.utils.parseEther('0.3'), Constant.COMMON_RATE_DECIMALS)
        );
        await callTransaction(
            currency2.setExclusiveDiscount(ethers.utils.parseEther('0.4'), Constant.COMMON_RATE_DECIMALS)
        );
        await callTransaction(
            currency3.setExclusiveDiscount(ethers.utils.parseEther('0.5'), Constant.COMMON_RATE_DECIMALS)
        );

        const currencies = [currency1, currency2, currency3];

        const nativePriceFeed = (await deployPriceFeed(deployer.address, 0, 0)) as PriceFeed;
        const currencyPriceFeed = (await deployPriceFeed(deployer.address, 0, 0)) as PriceFeed;

        const feeReceiver = (await deployFeeReceiver(deployer.address, admin.address)) as FeeReceiver;

        const MockEstateTokenFactory = (await smock.mock('EstateToken')) as any;
        const estateToken = (await MockEstateTokenFactory.deploy()) as MockContract<EstateToken>;
        await callTransaction(
            estateToken.initialize(
                admin.address,
                feeReceiver.address,
                validator.getAddress(),
                LandInitialization.ESTATE_TOKEN_BaseURI
            )
        );

        const SmockCommissionTokenFactory = (await smock.mock('CommissionToken')) as any;
        const commissionToken = (await SmockCommissionTokenFactory.deploy()) as MockContract<CommissionToken>;
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

        await callTransaction(
            getEstateTokenTxByInput_UpdateCommissionToken(
                estateToken as any,
                deployer,
                { commissionToken: commissionToken.address },
                admin,
                admins
            )
        );

        const SmockReserveVaultFactory = (await smock.mock('ReserveVault')) as any;
        const reserveVault = (await SmockReserveVaultFactory.deploy()) as MockContract<ReserveVault>;
        await callTransaction(reserveVault.initialize(admin.address));

        const priceWatcher = (await deployPriceWatcher(deployer.address, admin.address)) as PriceWatcher;

        const estateForger = (await deployMockEstateForger(
            deployer,
            admin.address,
            estateToken.address,
            commissionToken.address,
            priceWatcher.address,
            feeReceiver.address,
            reserveVault.address,
            validator.getAddress(),
            LandInitialization.ESTATE_FORGER_BaseMinUnitPrice,
            LandInitialization.ESTATE_FORGER_BaseMaxUnitPrice
        )) as MockEstateForger;

        const failReceiver = await deployFailReceiver(deployer, false, false);
        const reentrancy = await deployReentrancyReceiver(deployer, true, true);

        const zone1 = ethers.utils.formatBytes32String('TestZone1');
        const zone2 = ethers.utils.formatBytes32String('TestZone2');

        return {
            deployer,
            admins,
            manager,
            moderator,
            user,
            custodian1,
            custodian2,
            custodian3,
            depositor1,
            depositor2,
            depositor3,
            depositors,
            broker1,
            broker2,
            validator,
            admin,
            currencies,
            nativePriceFeed,
            currencyPriceFeed,
            feeReceiver,
            estateToken,
            commissionToken,
            reserveVault,
            priceWatcher,
            estateForger,
            zone1,
            zone2,
            failReceiver,
            reentrancy,
        };
    }

    async function beforeEstateForgerTest({
        skipDeclareZone = false,
        skipRegisterBrokers = false,
        skipListSampleCurrencies = false,
        skipFundERC20ForDepositors = false,
        skipFundERC20ForManagers = false,
        skipAddZoneForExecutive = false,
        skipAddEstateForgerToVault = false,
        skipListSampleCustodians = false,
        whitelistDepositors = false,
        addSampleRequests = false,
        whitelistDepositorsForRequests = false,
        addDepositions = false,
        confirmRequests = false,
        useNoCashback = false,
        useFailReceiverAsBroker = false,
        useFailReceiverAsCustodian = false,
        useReentrancyAsBroker = false,
        pause = false,
    } = {}): Promise<EstateForgerFixture> {
        const fixture = await loadFixture(estateForgerFixture);
        const {
            deployer,
            admins,
            manager,
            moderator,
            broker2,
            custodian2,
            custodian3,
            depositor1,
            depositor2,
            depositor3,
            depositors,
            validator,
            admin,
            currencies,
            nativePriceFeed,
            currencyPriceFeed,
            estateToken,
            commissionToken,
            priceWatcher,
            reserveVault,
            estateForger,
            failReceiver,
            reentrancy,
            zone1,
            zone2,
        } = fixture;

        let broker1 = fixture.broker1;
        if (useFailReceiverAsBroker) {
            broker1 = failReceiver;
        }
        if (useReentrancyAsBroker) {
            broker1 = reentrancy;
        }

        let custodian1 = fixture.custodian1;
        if (useFailReceiverAsCustodian) {
            custodian1 = failReceiver;
        }

        await callTransaction(
            getAdminTxByInput_AuthorizeManagers(
                admin,
                deployer,
                { accounts: [manager.address], isManager: true },
                admins
            )
        );

        await callTransaction(
            getAdminTxByInput_AuthorizeModerators(
                admin,
                deployer,
                { accounts: [moderator.address], isModerator: true },
                admins
            )
        );

        if (!skipListSampleCurrencies) {
            await nativePriceFeed.updateData(1000_00000000, 8);
            await currencyPriceFeed.updateData(5_00000000, 8);

            await callTransaction(
                getAdminTxByInput_UpdateCurrencyRegistries(
                    admin,
                    deployer,
                    {
                        currencies: [ethers.constants.AddressZero, currencies[0].address],
                        isAvailable: [true, true],
                        isExclusive: [false, true],
                    },
                    admins
                )
            );

            await callTransaction(
                getPriceWatcherTxByInput_UpdatePriceFeeds(
                    priceWatcher,
                    deployer,
                    {
                        currencies: [ethers.constants.AddressZero, currencies[0].address],
                        feeds: [nativePriceFeed.address, currencyPriceFeed.address],
                        heartbeats: [3600, 24 * 3600],
                    },
                    admin,
                    admins
                )
            );

            await callTransaction(
                getAdminTxByInput_UpdateCurrencyRegistries(
                    admin,
                    deployer,
                    {
                        currencies: [currencies[1].address, currencies[2].address],
                        isAvailable: [true, true],
                        isExclusive: [false, false],
                    },
                    admins
                )
            );
        }

        if (!skipFundERC20ForDepositors) {
            await prepareERC20(
                currencies[0],
                [depositor1, depositor2, depositor3],
                [estateForger],
                ethers.utils.parseEther('1000000000')
            );
        }

        if (!skipDeclareZone) {
            for (const zone of [zone1, zone2]) {
                await callTransaction(getAdminTxByInput_DeclareZone(admin, deployer, { zone }, admins));
            }
        }

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

        let timestamp = (await time.latest()) + 1000;

        if (!skipAddZoneForExecutive) {
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
        }

        if (!skipAddEstateForgerToVault) {
            await callTransaction(
                getReserveVaultTxByInput_AuthorizeProvider(
                    reserveVault as any,
                    deployer,
                    {
                        accounts: [estateForger.address],
                        isProvider: true,
                    },
                    admin,
                    admins
                )
            );
        }

        if (!skipRegisterBrokers) {
            await callTransaction(
                getCommissionTokenTx_RegisterBroker(commissionToken as any, manager, {
                    zone: zone1,
                    broker: broker1.address,
                    commissionRate: ethers.utils.parseEther('0.01'),
                })
            );
            await callTransaction(
                getCommissionTokenTx_RegisterBroker(commissionToken as any, manager, {
                    zone: zone2,
                    broker: broker2.address,
                    commissionRate: ethers.utils.parseEther('0.02'),
                })
            );
        }

        if (!skipListSampleCustodians) {
            for (const [zoneIndex, zone] of [zone1, zone2].entries()) {
                for (const [custodianIndex, custodian] of [custodian1, custodian2, custodian3].entries()) {
                    await callTransaction(
                        getEstateTokenTxByInput_RegisterCustodian(
                            estateToken as any,
                            manager,
                            {
                                zone,
                                custodian: custodian.address,
                                uri: `custodian${custodianIndex + 1}_zone${zoneIndex + 1}_uri`,
                            },
                            validator
                        )
                    );
                }
            }
        }

        if (!skipFundERC20ForManagers) {
            for (const currency of currencies) {
                await prepareERC20(currency, [manager], [estateForger], ethers.utils.parseEther('10000'));
            }
        }

        if (whitelistDepositors) {
            await callTransaction(
                getEstateForgerTxByInput_Whitelist(
                    estateForger,
                    deployer,
                    {
                        accounts: [depositor1.address, depositor2.address, depositor3.address],
                        isWhitelisted: true,
                    },
                    admin,
                    admins
                )
            );
        }

        if (addSampleRequests) {
            let params1: RequestTokenizationParamsInput = {
                requester: custodian1.address,
                estate: {
                    zone: zone1,
                    uri: 'TestingURI1',
                    expireAt: timestamp + 1e9,
                },
                quota: {
                    totalQuantity: BigNumber.from('70'),
                    minSellingQuantity: BigNumber.from('10'),
                    maxSellingQuantity: BigNumber.from('30'),
                },
                quote: {
                    unitPrice: ethers.utils.parseEther('0.2'),
                    currency: ethers.constants.AddressZero,
                    cashbackThreshold: BigNumber.from('5'),
                    cashbackBaseRate: ethers.utils.parseEther('0.1'),
                    cashbackCurrencies: [currencies[0].address, currencies[1].address],
                    cashbackDenominations: [ethers.utils.parseEther('0.01'), ethers.utils.parseEther('0.02')],
                    feeDenomination: ethers.utils.parseEther('0.03'),
                    broker: broker1.address,
                },
                agenda: {
                    saleStartsAt: timestamp + 10,
                    privateSaleDuration: 20 * DAY,
                    publicSaleDuration: 40 * DAY,
                },
            };
            if (useNoCashback) {
                params1.quote.cashbackBaseRate = BigNumber.from(0);
                params1.quote.cashbackCurrencies = [];
                params1.quote.cashbackDenominations = [];
                params1.quote.cashbackThreshold = BigNumber.from(0);
            }

            await callTransaction(
                getEstateForgerTxByInput_RequestTokenization(estateForger, manager, params1, validator)
            );

            const params2: RequestTokenizationParamsInput = {
                requester: custodian2.address,
                estate: {
                    zone: zone2,
                    uri: 'TestingURI2',
                    expireAt: timestamp + 1e9,
                },
                quota: {
                    totalQuantity: BigNumber.from('1000'),
                    minSellingQuantity: BigNumber.from('200'),
                    maxSellingQuantity: BigNumber.from('1000'),
                },
                quote: {
                    unitPrice: ethers.utils.parseEther('100'),
                    currency: currencies[0].address,
                    cashbackThreshold: BigNumber.from('50'),
                    cashbackBaseRate: ethers.utils.parseEther('0.2'),
                    cashbackCurrencies: [currencies[1].address, ethers.constants.AddressZero],
                    cashbackDenominations: [ethers.utils.parseEther('0.01'), ethers.utils.parseEther('0.02')],
                    feeDenomination: ethers.utils.parseEther('20'),
                    broker: broker2.address,
                },
                agenda: {
                    saleStartsAt: timestamp + 20,
                    privateSaleDuration: 30 * DAY,
                    publicSaleDuration: 60 * DAY,
                },
            };
            if (useNoCashback) {
                params2.quote.cashbackBaseRate = BigNumber.from(0);
                params2.quote.cashbackCurrencies = [];
                params2.quote.cashbackDenominations = [];
                params2.quote.cashbackThreshold = BigNumber.from(0);
            }

            await callTransaction(
                getEstateForgerTxByInput_RequestTokenization(estateForger, manager, params2, validator)
            );
        }

        if (whitelistDepositorsForRequests) {
            for (const requestId of [1, 2]) {
                await callTransaction(
                    getEstateForgerTx_WhitelistFor(estateForger, manager, {
                        requestId: BigNumber.from(requestId),
                        accounts: depositors.map((x) => x.address),
                        isWhitelisted: true,
                    })
                );
            }
        }

        if (addDepositions) {
            timestamp = Math.max(
                (await estateForger.getRequest(1)).agenda.privateSaleEndsAt,
                (await estateForger.getRequest(2)).agenda.privateSaleEndsAt
            );
            await time.setNextBlockTimestamp(timestamp);

            await callTransaction(
                getEstateForgerTx_Deposit(
                    estateForger,
                    depositor1,
                    {
                        requestId: BigNumber.from(1),
                        quantity: BigNumber.from(2),
                    },
                    { value: ethers.utils.parseEther('10') }
                )
            );
            await callTransaction(
                getEstateForgerTx_Deposit(
                    estateForger,
                    depositor2,
                    {
                        requestId: BigNumber.from(1),
                        quantity: BigNumber.from(5),
                    },
                    { value: ethers.utils.parseEther('10') }
                )
            );
            await callTransaction(
                getEstateForgerTx_Deposit(
                    estateForger,
                    depositor3,
                    {
                        requestId: BigNumber.from(1),
                        quantity: BigNumber.from(10),
                    },
                    { value: ethers.utils.parseEther('10') }
                )
            );

            await callTransaction(
                getEstateForgerTx_Deposit(estateForger, depositor1, {
                    requestId: BigNumber.from(2),
                    quantity: BigNumber.from(200),
                })
            );
            await callTransaction(
                getEstateForgerTx_Deposit(estateForger, depositor2, {
                    requestId: BigNumber.from(2),
                    quantity: BigNumber.from(300),
                })
            );
            await callTransaction(
                getEstateForgerTx_Deposit(estateForger, depositor3, {
                    requestId: BigNumber.from(2),
                    quantity: BigNumber.from(500),
                })
            );
        }

        if (confirmRequests) {
            await callTransaction(
                getEstateForgerTxByParams_SafeConfirm(
                    estateForger,
                    manager,
                    { requestId: BigNumber.from(1) },
                    { value: ethers.utils.parseEther('1000') }
                )
            );

            await callTransaction(
                getEstateForgerTxByParams_SafeConfirm(
                    estateForger,
                    manager,
                    { requestId: BigNumber.from(2) },
                    { value: ethers.utils.parseEther('1000') }
                )
            );
        }

        if (pause) {
            await callTransaction(getPausableTxByInput_Pause(estateForger, deployer, admin, admins));
        }

        return fixture;
    }

    /* --- Initialization --- */
    describe('2.2.1. initialize(address,address,address,address,address,address,address,uint256,uint256)', async () => {
        it('2.2.1.1. Deploy successfully', async () => {
            const {
                admin,
                estateForger,
                estateToken,
                feeReceiver,
                commissionToken,
                priceWatcher,
                reserveVault,
                validator,
            } = await beforeEstateForgerTest();

            expect(await estateForger.paused()).to.equal(false);

            expect(await estateForger.admin()).to.equal(admin.address);
            expect(await estateForger.estateToken()).to.equal(estateToken.address);
            expect(await estateForger.commissionToken()).to.equal(commissionToken.address);
            expect(await estateForger.feeReceiver()).to.equal(feeReceiver.address);
            expect(await estateForger.priceWatcher()).to.equal(priceWatcher.address);
            expect(await estateForger.reserveVault()).to.equal(reserveVault.address);

            expect(await estateForger.baseMinUnitPrice()).to.equal(LandInitialization.ESTATE_FORGER_BaseMinUnitPrice);
            expect(await estateForger.baseMaxUnitPrice()).to.equal(LandInitialization.ESTATE_FORGER_BaseMaxUnitPrice);

            expect(await estateForger.validator()).to.equal(validator.getAddress());

            expect(await estateForger.requestNumber()).to.equal(0);
        });
    });

    /* --- Administration --- */
    describe('2.2.2. updateBaseUnitPriceRange(uint256,uint256,bytes[])', async () => {
        it('2.2.2.1. Update base unit price range successfully with valid signatures', async () => {
            const { deployer, admin, admins, estateForger } = await beforeEstateForgerTest();

            const paramsInput: UpdateBaseUnitPriceRangeParamsInput = {
                baseMinUnitPrice: BigNumber.from(20),
                baseMaxUnitPrice: BigNumber.from(100),
            };
            const tx = await getEstateForgerTxByInput_UpdateBaseUnitPriceRange(
                estateForger,
                deployer,
                paramsInput,
                admin,
                admins
            );
            await tx.wait();

            await expect(tx)
                .to.emit(estateForger, 'BaseUnitPriceRangeUpdate')
                .withArgs(paramsInput.baseMinUnitPrice, paramsInput.baseMaxUnitPrice);

            expect(await estateForger.baseMinUnitPrice()).to.equal(paramsInput.baseMinUnitPrice);
            expect(await estateForger.baseMaxUnitPrice()).to.equal(paramsInput.baseMaxUnitPrice);
        });

        it('2.2.2.2. Update base unit price range unsuccessfully with invalid signatures', async () => {
            const { deployer, admin, admins, estateForger } = await beforeEstateForgerTest();

            const paramsInput: UpdateBaseUnitPriceRangeParamsInput = {
                baseMinUnitPrice: BigNumber.from(20),
                baseMaxUnitPrice: BigNumber.from(100),
            };
            const params: UpdateBaseUnitPriceRangeParams = {
                ...paramsInput,
                signatures: await getUpdateBaseUnitPriceRangeSignatures(
                    estateForger,
                    paramsInput,
                    admin,
                    admins,
                    false
                ),
            };
            await expect(
                getEstateForgerTx_UpdateBaseUnitPriceRange(estateForger, deployer, params)
            ).to.be.revertedWithCustomError(admin, 'FailedVerification');
        });

        it('2.2.2.3. Update base unit price range unsuccessfully with invalid price range', async () => {
            const { deployer, admin, admins, estateForger } = await beforeEstateForgerTest();

            await expect(
                getEstateForgerTxByInput_UpdateBaseUnitPriceRange(
                    estateForger,
                    deployer,
                    {
                        baseMinUnitPrice: BigNumber.from(101),
                        baseMaxUnitPrice: BigNumber.from(100),
                    },
                    admin,
                    admins
                )
            ).to.be.revertedWithCustomError(estateForger, 'InvalidInput');
        });
    });

    describe('2.2.3. whitelist(address[],bool,bytes[])', async () => {
        it('2.2.3.1. Whitelist user successfully', async () => {
            const fixture = await beforeEstateForgerTest();
            const { deployer, admins, admin, estateForger, depositor1, depositor2, depositor3 } = fixture;

            const depositors = [depositor1, depositor2, depositor3];

            const paramsInput: WhitelistParamsInput = {
                accounts: depositors.map((x) => x.address),
                isWhitelisted: true,
            };
            const tx = await getEstateForgerTxByInput_Whitelist(estateForger, deployer, paramsInput, admin, admins);
            await tx.wait();

            for (const depositor of depositors) {
                await expect(tx).to.emit(estateForger, 'Whitelist').withArgs(depositor.address);
            }

            for (let i = 0; i < depositors.length; ++i) {
                const isWhitelisted = await estateForger.isWhitelisted(depositors[i].address);
                expect(isWhitelisted).to.be.true;
            }
        });

        it('2.2.3.2. Whitelist unsuccessfully with invalid signatures', async () => {
            const fixture = await beforeEstateForgerTest();
            const { deployer, admins, admin, estateForger, depositor1, depositor2, depositor3 } = fixture;

            const depositors = [depositor1, depositor2, depositor3];

            const paramsInput: WhitelistParamsInput = {
                accounts: depositors.map((x) => x.address),
                isWhitelisted: true,
            };
            const params: WhitelistParams = {
                ...paramsInput,
                signatures: await getWhitelistSignatures(estateForger, paramsInput, admin, admins, false),
            };
            await expect(getEstateForgerTx_Whitelist(estateForger, deployer, params)).to.be.revertedWithCustomError(
                admin,
                'FailedVerification'
            );
        });

        it('2.2.3.3. Whitelist unsuccessfully when whitelisting the same account twice on the same tx', async () => {
            const fixture = await beforeEstateForgerTest();
            const { deployer, admins, admin, estateForger, depositor1, depositor2, depositor3 } = fixture;

            const depositors = [depositor1, depositor2, depositor3, depositor1];

            await expect(
                getEstateForgerTxByInput_Whitelist(
                    estateForger,
                    deployer,
                    {
                        accounts: depositors.map((x) => x.address),
                        isWhitelisted: true,
                    },
                    admin,
                    admins
                )
            ).to.be.revertedWithCustomError(estateForger, 'WhitelistedAccount');
        });

        it('2.2.3.4. Whitelist unsuccessfully when whitelisting the same account twice on different txs', async () => {
            const fixture = await beforeEstateForgerTest();
            const { deployer, admins, admin, estateForger, depositor1, depositor2, depositor3 } = fixture;

            let depositors = [depositor1, depositor3];
            await getEstateForgerTxByInput_Whitelist(
                estateForger,
                deployer,
                {
                    accounts: depositors.map((x) => x.address),
                    isWhitelisted: true,
                },
                admin,
                admins
            );

            depositors = [depositor2, depositor3];
            await expect(
                getEstateForgerTxByInput_Whitelist(
                    estateForger,
                    deployer,
                    {
                        accounts: depositors.map((x) => x.address),
                        isWhitelisted: true,
                    },
                    admin,
                    admins
                )
            ).to.be.revertedWithCustomError(estateForger, 'WhitelistedAccount');
        });

        it('2.2.3.5. Unwhitelist account successfully', async () => {
            const fixture = await beforeEstateForgerTest({
                whitelistDepositors: true,
            });
            const { deployer, admins, admin, estateForger, depositor1, depositor2, depositor3 } = fixture;

            const depositors = [depositor1, depositor2, depositor3];
            const toUnwhitelistDepositors = [depositor1, depositor3];

            const tx = await getEstateForgerTxByInput_Whitelist(
                estateForger,
                deployer,
                {
                    accounts: toUnwhitelistDepositors.map((x) => x.address),
                    isWhitelisted: false,
                },
                admin,
                admins
            );
            await tx.wait();

            for (const depositor of toUnwhitelistDepositors) {
                await expect(tx).to.emit(estateForger, 'Unwhitelist').withArgs(depositor.address);
            }

            for (const depositor of depositors) {
                if (toUnwhitelistDepositors.includes(depositor)) {
                    expect(await estateForger.isWhitelisted(depositor.address)).to.be.false;
                } else {
                    expect(await estateForger.isWhitelisted(depositor.address)).to.be.true;
                }
            }
        });

        it('2.2.3.6. Unwhitelist account unsuccessfully with not whitelisted account', async () => {
            const fixture = await beforeEstateForgerTest();
            const { deployer, admins, admin, estateForger, depositor1, depositor2, depositor3 } = fixture;

            const toUnwhitelistDepositors = [depositor1, depositor2, depositor3];
            await expect(
                getEstateForgerTxByInput_Whitelist(
                    estateForger,
                    deployer,
                    {
                        accounts: toUnwhitelistDepositors.map((x) => x.address),
                        isWhitelisted: false,
                    },
                    admin,
                    admins
                )
            ).to.be.revertedWithCustomError(estateForger, 'NotWhitelistedAccount');
        });

        it('2.2.3.7. Unwhitelist account unsuccessfully when unwhitelisting the same account twice on the same tx', async () => {
            const fixture = await beforeEstateForgerTest({
                whitelistDepositors: true,
            });
            const { deployer, admins, admin, estateForger, depositor1, depositor2, depositor3 } = fixture;

            const toUnwhitelistDepositors = [depositor1, depositor2, depositor3, depositor1];
            await expect(
                getEstateForgerTxByInput_Whitelist(
                    estateForger,
                    deployer,
                    {
                        accounts: toUnwhitelistDepositors.map((x) => x.address),
                        isWhitelisted: false,
                    },
                    admin,
                    admins
                )
            ).to.be.revertedWithCustomError(estateForger, 'NotWhitelistedAccount');
        });

        it('2.2.3.8. Unwhitelist account unsuccessfully when unwhitelisting the same account twice on different txs', async () => {
            const fixture = await beforeEstateForgerTest({
                whitelistDepositors: true,
            });
            const { deployer, admins, admin, estateForger, depositor1, depositor2, depositor3 } = fixture;

            const tx1_depositors = [depositor1, depositor2];
            await getEstateForgerTxByInput_Whitelist(
                estateForger,
                deployer,
                {
                    accounts: tx1_depositors.map((x) => x.address),
                    isWhitelisted: false,
                },
                admin,
                admins
            );

            const tx2_depositors = [depositor3, depositor2];
            await expect(
                getEstateForgerTxByInput_Whitelist(
                    estateForger,
                    deployer,
                    {
                        accounts: tx2_depositors.map((x) => x.address),
                        isWhitelisted: false,
                    },
                    admin,
                    admins
                )
            ).to.be.revertedWithCustomError(estateForger, 'NotWhitelistedAccount');
        });
    });

    /* --- Query --- */
    describe('2.2.4. getRequest(uint256)', async () => {
        it('2.2.4.1. Return successfully', async () => {
            const fixture = await beforeEstateForgerTest({
                addSampleRequests: true,
            });
            const { estateForger } = fixture;

            await expect(estateForger.getRequest(1)).to.not.be.reverted;
            await expect(estateForger.getRequest(2)).to.not.be.reverted;
        });

        it('2.2.4.2. Revert with invalid request id', async () => {
            const fixture = await beforeEstateForgerTest({
                addSampleRequests: true,
            });
            const { estateForger } = fixture;

            await expect(estateForger.getRequest(0)).to.be.revertedWithCustomError(estateForger, 'InvalidRequestId');
            await expect(estateForger.getRequest(3)).to.be.revertedWithCustomError(estateForger, 'InvalidRequestId');
        });
    });

    describe('2.2.5. isTokenized(uint256)', () => {
        it('2.2.5.1. Return true for tokenized estate', async () => {
            const fixture = await beforeEstateForgerTest({
                addSampleRequests: true,
                addDepositions: true,
                confirmRequests: true,
            });

            const { estateForger } = fixture;

            expect(await estateForger.isTokenized(1)).to.be.equal(true);
            expect(await estateForger.isTokenized(2)).to.be.equal(true);
        });

        it('2.2.5.2. Return false for not tokenized estate', async () => {
            const fixture = await beforeEstateForgerTest({
                addSampleRequests: true,
                addDepositions: true,
            });

            const { estateForger } = fixture;

            expect(await estateForger.isTokenized(1)).to.be.equal(false);
            expect(await estateForger.isTokenized(2)).to.be.equal(false);

            expect(await estateForger.isTokenized(0)).to.be.equal(false);
            expect(await estateForger.isTokenized(100)).to.be.equal(false);
        });
    });

    describe('2.2.6. allocationOfAt(address,uint256,uint256)', () => {
        it('2.2.6.1. Succeed with existing estate id', async () => {
            const fixture = await beforeEstateForgerTest({
                addSampleRequests: true,
                addDepositions: true,
                confirmRequests: true,
            });

            const { estateForger, depositor1, estateToken } = fixture;

            const requestId = 1;
            const depositor = depositor1;

            const units = BigNumber.from(10).pow(await estateToken.decimals());

            const expectedAllocations = new OrderedMap<number, BigNumber>(ethers.BigNumber.from(0));
            expectedAllocations.set(0, BigNumber.from(0));

            const timePivots = new Set<number>();
            function addTimePivot(timestamp: number) {
                if (timestamp > 0) {
                    timePivots.add(timestamp - 1);
                }
                timePivots.add(timestamp);
                timePivots.add(timestamp + 1);
            }

            async function assertCorrectAllocation(currentTimestamp: number) {
                for (const timestamp of timePivots) {
                    if (timestamp > currentTimestamp) {
                        break;
                    }
                    expect(await estateForger.allocationOfAt(depositor.address, requestId, timestamp)).to.equal(
                        expectedAllocations.get(timestamp)
                    );
                }
            }

            const deposit = await estateForger.deposits(requestId, depositor.address);
            const confirmAt = (await estateForger.getRequest(requestId)).agenda.confirmAt;

            expectedAllocations.set(confirmAt, deposit.mul(units));

            addTimePivot(0);
            addTimePivot(confirmAt);

            await time.setNextBlockTimestamp(confirmAt + 5);
            await assertCorrectAllocation(0);

            let timestamp = confirmAt + 10;
            await callTransactionAtTimestamp(
                getEstateForgerTx_WithdrawEstateToken(estateForger, depositor, {
                    requestId: BigNumber.from(requestId),
                }),
                timestamp
            );

            expectedAllocations.set(timestamp, BigNumber.from(0));

            addTimePivot(timestamp);

            await time.setNextBlockTimestamp(timestamp + 5);
            await assertCorrectAllocation(timestamp);
        });

        it('2.2.6.2. Revert with unconfirmed request', async () => {
            const fixture = await beforeEstateForgerTest({
                addSampleRequests: true,
                addDepositions: true,
            });

            const { estateForger, depositor1, depositor2 } = fixture;

            const publicSaleEndsAt1 = (await estateForger.getRequest(1)).agenda.publicSaleEndsAt;

            await expect(
                estateForger.allocationOfAt(depositor1.address, 1, publicSaleEndsAt1 - 1)
            ).to.be.revertedWithCustomError(estateForger, 'InvalidTimestamp');
            await expect(
                estateForger.allocationOfAt(depositor1.address, 1, publicSaleEndsAt1)
            ).to.be.revertedWithCustomError(estateForger, 'InvalidTimestamp');
            await expect(
                estateForger.allocationOfAt(depositor1.address, 1, publicSaleEndsAt1 + 1)
            ).to.be.revertedWithCustomError(estateForger, 'InvalidTimestamp');

            await expect(
                estateForger.allocationOfAt(depositor2.address, 1, publicSaleEndsAt1 - 1)
            ).to.be.revertedWithCustomError(estateForger, 'InvalidTimestamp');
            await expect(
                estateForger.allocationOfAt(depositor2.address, 1, publicSaleEndsAt1)
            ).to.be.revertedWithCustomError(estateForger, 'InvalidTimestamp');
            await expect(
                estateForger.allocationOfAt(depositor2.address, 1, publicSaleEndsAt1 + 1)
            ).to.be.revertedWithCustomError(estateForger, 'InvalidTimestamp');

            const publicSaleEndsAt2 = (await estateForger.getRequest(2)).agenda.publicSaleEndsAt;

            await expect(
                estateForger.allocationOfAt(depositor1.address, 2, publicSaleEndsAt2 - 1)
            ).to.be.revertedWithCustomError(estateForger, 'InvalidTimestamp');
            await expect(
                estateForger.allocationOfAt(depositor1.address, 2, publicSaleEndsAt2)
            ).to.be.revertedWithCustomError(estateForger, 'InvalidTimestamp');
            await expect(
                estateForger.allocationOfAt(depositor1.address, 2, publicSaleEndsAt2 + 1)
            ).to.be.revertedWithCustomError(estateForger, 'InvalidTimestamp');

            await expect(
                estateForger.allocationOfAt(depositor2.address, 2, publicSaleEndsAt2 - 1)
            ).to.be.revertedWithCustomError(estateForger, 'InvalidTimestamp');
            await expect(
                estateForger.allocationOfAt(depositor2.address, 2, publicSaleEndsAt2)
            ).to.be.revertedWithCustomError(estateForger, 'InvalidTimestamp');
            await expect(
                estateForger.allocationOfAt(depositor2.address, 2, publicSaleEndsAt2 + 1)
            ).to.be.revertedWithCustomError(estateForger, 'InvalidTimestamp');
        });

        it('2.2.6.3. Revert with non-existing estate id', async () => {
            const fixture = await beforeEstateForgerTest({
                addSampleRequests: true,
                addDepositions: true,
                confirmRequests: true,
            });
            const { estateForger, depositor1 } = fixture;

            await expect(estateForger.allocationOfAt(depositor1.address, 0, 0)).to.be.revertedWithCustomError(
                estateForger,
                'InvalidRequestId'
            );
            await expect(estateForger.allocationOfAt(depositor1.address, 3, 0)).to.be.revertedWithCustomError(
                estateForger,
                'InvalidRequestId'
            );
            await expect(estateForger.allocationOfAt(depositor1.address, 100, 0)).to.be.revertedWithCustomError(
                estateForger,
                'InvalidRequestId'
            );
        });

        it('2.2.6.4. Revert with timestamp after current block timestamp', async () => {
            const fixture = await beforeEstateForgerTest({
                addSampleRequests: true,
                addDepositions: true,
                confirmRequests: true,
            });

            const { estateForger, depositor1 } = fixture;

            let timestamp = await time.latest();

            await expect(estateForger.allocationOfAt(depositor1.address, 1, timestamp - 1)).to.not.be.reverted;
            await expect(estateForger.allocationOfAt(depositor1.address, 1, timestamp)).to.not.be.reverted;
            await expect(
                estateForger.allocationOfAt(depositor1.address, 1, timestamp + 1)
            ).to.be.revertedWithCustomError(estateForger, 'InvalidTimestamp');
        });
    });

    describe('2.2.7. supportsInterface(bytes4)', () => {
        it('2.2.7.1. Return true for appropriate interface', async () => {
            const fixture = await beforeEstateForgerTest();
            const { estateForger } = fixture;

            expect(await estateForger.supportsInterface(getBytes4Hex(IEstateTokenReceiverInterfaceId))).to.equal(true);
            expect(await estateForger.supportsInterface(getBytes4Hex(IEstateTokenizerInterfaceId))).to.equal(true);
            expect(await estateForger.supportsInterface(getBytes4Hex(IERC165UpgradeableInterfaceId))).to.equal(true);
        });
    });

    describe('2.2.8. onERC1155Received(address,address,uint256,uint256,bytes)', async () => {
        it('2.2.8.1. Successfully receive estate token', async () => {
            const fixture = await beforeEstateForgerTest({
                addSampleRequests: true,
                addDepositions: true,
                confirmRequests: true,
            });
            const { depositor1, estateForger, estateToken } = fixture;

            await callTransaction(estateForger.connect(depositor1).withdrawEstateToken(1));

            await expect(
                estateToken.connect(depositor1).safeTransferFrom(depositor1.address, estateForger.address, 1, 50, '0x')
            ).to.not.be.reverted;
        });

        it('2.2.8.2. Revert when receiving unknown ERC1155 token', async () => {
            const fixture = await beforeEstateForgerTest();
            const { deployer, depositor1, estateForger, admin } = fixture;

            const unknownERC1155Token = await deployGovernor(deployer, admin.address);

            await callTransaction(unknownERC1155Token.connect(depositor1).mint(1, 50));

            await expect(
                unknownERC1155Token
                    .connect(depositor1)
                    .safeTransferFrom(depositor1.address, estateForger.address, 1, 50, '0x')
            ).to.be.revertedWith('ERC1155: ERC1155Receiver rejected tokens');
        });
    });

    describe('2.2.9. onERC1155BatchReceived(address,address,uint256[],uint256[],bytes)', async () => {
        it('2.2.9.1. Successfully receive estate tokens batch', async () => {
            const fixture = await beforeEstateForgerTest({
                addSampleRequests: true,
                addDepositions: true,
                confirmRequests: true,
            });
            const { depositor1, estateForger, estateToken } = fixture;

            await callTransaction(estateForger.connect(depositor1).withdrawEstateToken(1));
            await callTransaction(estateForger.connect(depositor1).withdrawEstateToken(2));

            await callTransaction(
                estateToken
                    .connect(depositor1)
                    .safeBatchTransferFrom(depositor1.address, estateForger.address, [1, 2], [10, 5], '0x')
            );
        });

        it('2.2.9.2. Revert when receiving unknown ERC1155 tokens batch', async () => {
            const fixture = await beforeEstateForgerTest();
            const { deployer, depositor1, admin, estateForger } = fixture;

            const unknownERC1155Token = await deployGovernor(deployer, admin.address);

            await callTransaction(unknownERC1155Token.connect(depositor1).mint(1, 50));
            await callTransaction(unknownERC1155Token.connect(depositor1).mint(2, 50));

            await expect(
                unknownERC1155Token
                    .connect(depositor1)
                    .safeBatchTransferFrom(depositor1.address, estateForger.address, [1, 2], [10, 5], '0x')
            ).to.be.revertedWith('ERC1155: ERC1155Receiver rejected tokens');
        });
    });

    /* --- Command --- */
    describe('2.2.10. requestTokenization(address,(bytes32,string,uint40),(uint256,uint256,uint256),(uint256,address,uint256,uint256,address[],uint256[],uint256,address),(uint40,uint40,uint40),(uint256,uint256,bytes))', async () => {
        async function getDefaultParams(fixture: EstateForgerFixture): Promise<RequestTokenizationParamsInput> {
            const { custodian1, zone1, currencies, broker1 } = fixture;
            let timestamp = (await time.latest()) + 1000;

            return {
                requester: custodian1.address,
                estate: {
                    zone: zone1,
                    uri: 'TestingURI1',
                    expireAt: timestamp + 1e9,
                },
                quota: {
                    totalQuantity: BigNumber.from('70'),
                    minSellingQuantity: BigNumber.from('10'),
                    maxSellingQuantity: BigNumber.from('30'),
                },
                quote: {
                    unitPrice: ethers.utils.parseEther('0.2'),
                    currency: ethers.constants.AddressZero,
                    cashbackThreshold: BigNumber.from(5),
                    cashbackBaseRate: ethers.utils.parseEther('0.1'),
                    cashbackCurrencies: [currencies[0].address, currencies[1].address],
                    cashbackDenominations: [ethers.utils.parseEther('0.01'), ethers.utils.parseEther('0.02')],
                    feeDenomination: ethers.utils.parseEther('0.03'),
                    broker: broker1.address,
                },
                agenda: {
                    saleStartsAt: timestamp + 10,
                    privateSaleDuration: 20 * DAY,
                    publicSaleDuration: 40 * DAY,
                },
            };
        }

        it('2.2.10.1. RequestTokenization successfully by manager', async () => {
            const fixture = await beforeEstateForgerTest();
            const { manager, estateForger, reserveVault, commissionToken, validator } = fixture;

            const data = await getDefaultParams(fixture);

            // By manager
            const tx = await getEstateForgerTxByInput_RequestTokenization(estateForger, manager, data, validator);
            const receipt = await tx.wait();

            const fundId = await reserveVault.fundNumber();

            const commissionDenomination = await getCommissionDenomination(
                commissionToken as any,
                data.quote.feeDenomination,
                data.estate.zone,
                data.quote.broker
            );
            const mainDenomination = await getCashbackBaseDenomination(
                data.quote.feeDenomination,
                commissionDenomination,
                {
                    value: data.quote.cashbackBaseRate,
                    decimals: 18,
                }
            );

            const fund = await reserveVault.getFund(fundId);
            expect(fund.mainCurrency).to.equal(data.quote.currency);
            expect(fund.mainDenomination).to.equal(mainDenomination);
            expect(fund.extraCurrencies).to.deep.equal(data.quote.cashbackCurrencies);
            expect(fund.extraDenominations).to.deep.equal(data.quote.cashbackDenominations);

            const requestEstate: RequestEstate = {
                ...data.estate,
                estateId: ethers.BigNumber.from(0),
            };
            const requestQuota: RequestQuota = {
                ...data.quota,
                soldQuantity: ethers.BigNumber.from(0),
            };
            const requestQuote: RequestQuote = {
                unitPrice: data.quote.unitPrice,
                currency: data.quote.currency,
                cashbackThreshold: data.quote.cashbackThreshold,
                cashbackFundId: fundId,
                feeDenomination: data.quote.feeDenomination,
                commissionDenomination: commissionDenomination,
                broker: data.quote.broker,
            };
            const requestAgenda: RequestAgenda = {
                saleStartsAt: data.agenda.saleStartsAt,
                privateSaleEndsAt: data.agenda.saleStartsAt + data.agenda.privateSaleDuration,
                publicSaleEndsAt:
                    data.agenda.saleStartsAt + data.agenda.privateSaleDuration + data.agenda.publicSaleDuration,
                confirmAt: 0,
            };

            const newRequestEvent = receipt.events!.find((e) => e.event === 'NewRequest')!;
            expect(newRequestEvent.args![0]).to.equal(1);
            expect(newRequestEvent.args![1]).to.equal(fundId);
            expect(newRequestEvent.args![2]).to.equal(data.requester);
            expect(structToObject(newRequestEvent.args![3])).to.deep.equal(data.estate);
            expect(structToObject(newRequestEvent.args![4])).to.deep.equal(data.quota);
            expect(structToObject(newRequestEvent.args![5])).to.deep.equal(data.quote);
            expect(structToObject(newRequestEvent.args![6])).to.deep.equal(data.agenda);

            const tokenizationRequestNumber = await estateForger.requestNumber();
            expect(tokenizationRequestNumber).to.equal(1);

            const tokenizationRequest = await estateForger.getRequest(tokenizationRequestNumber);
            expect(structToObject(tokenizationRequest.estate)).to.deep.equal(requestEstate);
            expect(structToObject(tokenizationRequest.quota)).to.deep.equal(requestQuota);
            expect(structToObject(tokenizationRequest.quote)).to.deep.equal(requestQuote);
            expect(structToObject(tokenizationRequest.agenda)).to.deep.equal(requestAgenda);
        });

        it('2.2.10.2. RequestTokenization successfully by moderator and without cashback', async () => {
            const fixture = await beforeEstateForgerTest();
            const { manager, estateForger, reserveVault, commissionToken, validator, broker1 } = fixture;

            const defaultParams = await getDefaultParams(fixture);

            const data: RequestTokenizationParamsInput = {
                ...defaultParams,
                quote: {
                    ...defaultParams.quote,
                    cashbackBaseRate: BigNumber.from(0),
                    cashbackCurrencies: [],
                    cashbackDenominations: [],
                    cashbackThreshold: BigNumber.from(0),
                },
            };
            const tx = await getEstateForgerTxByInput_RequestTokenization(estateForger, manager, data, validator);
            const receipt = await tx.wait();

            const fundId = ethers.BigNumber.from(0);
            expect(await reserveVault.fundNumber()).to.equal(0);

            const commissionDenomination = await getCommissionDenomination(
                commissionToken as any,
                data.quote.feeDenomination,
                data.estate.zone,
                data.quote.broker
            );

            const requestEstate: RequestEstate = {
                ...data.estate,
                estateId: ethers.BigNumber.from(0),
            };
            const requestQuota: RequestQuota = {
                ...data.quota,
                soldQuantity: ethers.BigNumber.from(0),
            };
            const requestQuote: RequestQuote = {
                unitPrice: data.quote.unitPrice,
                currency: data.quote.currency,
                cashbackThreshold: data.quote.cashbackThreshold,
                cashbackFundId: fundId,
                feeDenomination: data.quote.feeDenomination,
                commissionDenomination: commissionDenomination,
                broker: broker1.address,
            };
            const requestAgenda: RequestAgenda = {
                saleStartsAt: data.agenda.saleStartsAt,
                privateSaleEndsAt: data.agenda.saleStartsAt + data.agenda.privateSaleDuration,
                publicSaleEndsAt:
                    data.agenda.saleStartsAt + data.agenda.privateSaleDuration + data.agenda.publicSaleDuration,
                confirmAt: 0,
            };

            const newRequestEvent = receipt.events!.find((e) => e.event === 'NewRequest')!;
            expect(newRequestEvent.args![0]).to.equal(1);
            expect(newRequestEvent.args![1]).to.equal(fundId);
            expect(newRequestEvent.args![2]).to.equal(data.requester);
            expect(structToObject(newRequestEvent.args![3])).to.deep.equal(data.estate);
            expect(structToObject(newRequestEvent.args![4])).to.deep.equal(data.quota);
            expect(structToObject(newRequestEvent.args![5])).to.deep.equal(data.quote);
            expect(structToObject(newRequestEvent.args![6])).to.deep.equal(data.agenda);

            const tokenizationRequestNumber = await estateForger.requestNumber();
            expect(tokenizationRequestNumber).to.equal(1);

            const tokenizationRequest = await estateForger.getRequest(tokenizationRequestNumber);
            expect(structToObject(tokenizationRequest.estate)).to.deep.equal(requestEstate);
            expect(structToObject(tokenizationRequest.quota)).to.deep.equal(requestQuota);
            expect(structToObject(tokenizationRequest.quote)).to.deep.equal(requestQuote);
            expect(structToObject(tokenizationRequest.agenda)).to.deep.equal(requestAgenda);
        });

        it('2.2.10.3. RequestTokenization unsuccessfully with invalid validation', async () => {
            const fixture = await beforeEstateForgerTest();

            const { manager, estateForger, validator } = fixture;

            const defaultParams = await getDefaultParams(fixture);
            const params: RequestTokenizationParams = {
                ...defaultParams,
                validation: await getRequestTokenizationValidation(estateForger, defaultParams, validator, false),
            };
            await expect(
                getEstateForgerTx_RequestTokenization(estateForger, manager, params)
            ).to.be.revertedWithCustomError(estateForger, 'InvalidSignature');
        });

        it('2.2.10.4. RequestTokenization unsuccessfully by non-executive', async () => {
            const fixture = await beforeEstateForgerTest();

            const { user, estateForger, validator } = fixture;

            const defaultParams = await getDefaultParams(fixture);

            await expect(
                getEstateForgerTxByInput_RequestTokenization(estateForger, user, defaultParams, validator)
            ).to.be.revertedWithCustomError(estateForger, 'Unauthorized');
        });

        it('2.2.10.5. RequestTokenization unsuccessfully when paused', async () => {
            const fixture = await beforeEstateForgerTest({
                pause: true,
            });

            const { manager, estateForger, validator } = fixture;

            const defaultParams = await getDefaultParams(fixture);

            await expect(
                getEstateForgerTxByInput_RequestTokenization(estateForger, manager, defaultParams, validator)
            ).to.be.revertedWith('Pausable: paused');
        });

        it('2.2.10.6. RequestTokenization unsuccessfully by inactive zone', async () => {
            const fixture = await beforeEstateForgerTest();

            const { moderator, manager, estateForger, validator } = fixture;

            const defaultParams = await getDefaultParams(fixture);
            const invalidZone = ethers.utils.formatBytes32String('InvalidZone');

            const params: RequestTokenizationParamsInput = {
                ...defaultParams,
                estate: {
                    ...defaultParams.estate,
                    zone: invalidZone,
                },
            };

            await expect(
                getEstateForgerTxByInput_RequestTokenization(estateForger, moderator, params, validator)
            ).to.be.revertedWithCustomError(estateForger, 'Unauthorized');
            await expect(
                getEstateForgerTxByInput_RequestTokenization(estateForger, manager, params, validator)
            ).to.be.revertedWithCustomError(estateForger, 'Unauthorized');
        });

        it('2.2.10.7. RequestTokenization unsuccessfully by inactive executive in zone', async () => {
            const fixture = await beforeEstateForgerTest();

            const { deployer, admin, admins, moderator, manager, zone1, estateForger, validator } = fixture;

            await callTransaction(
                getAdminTxByInput_ActivateIn(
                    admin,
                    deployer,
                    {
                        zone: zone1,
                        accounts: [moderator.address, manager.address],
                        isActive: false,
                    },
                    admins
                )
            );

            const defaultParams = await getDefaultParams(fixture);

            await expect(
                getEstateForgerTxByInput_RequestTokenization(estateForger, moderator, defaultParams, validator)
            ).to.be.revertedWithCustomError(estateForger, 'Unauthorized');
            await expect(
                getEstateForgerTxByInput_RequestTokenization(estateForger, manager, defaultParams, validator)
            ).to.be.revertedWithCustomError(estateForger, 'Unauthorized');
        });

        it('2.2.10.8. RequestTokenization unsuccessfully with unit price out of base range', async () => {
            const fixture = await beforeEstateForgerTest();

            const { manager, currencies, estateForger, validator } = fixture;

            const currency = currencies[0];

            const defaultParams = await getDefaultParams(fixture);

            await expect(
                getEstateForgerTxByInput_RequestTokenization(
                    estateForger,
                    manager,
                    {
                        ...defaultParams,
                        quote: {
                            ...defaultParams.quote,
                            currency: currency.address,
                            unitPrice: ethers.utils.parseEther('19'),
                        },
                    },
                    validator
                )
            ).to.be.revertedWithCustomError(estateForger, 'InvalidUnitPrice');

            await expect(
                getEstateForgerTxByInput_RequestTokenization(
                    estateForger,
                    manager,
                    {
                        ...defaultParams,
                        quote: {
                            ...defaultParams.quote,
                            currency: currency.address,
                            unitPrice: ethers.utils.parseEther('201'),
                        },
                    },
                    validator
                )
            ).to.be.revertedWithCustomError(estateForger, 'InvalidUnitPrice');
        });

        it('2.2.10.9. RequestTokenization unsuccessfully with inactive custodian in zone', async () => {
            const fixture = await beforeEstateForgerTest({
                skipListSampleCustodians: true,
            });

            const { manager, estateForger, validator } = fixture;

            const defaultParams = await getDefaultParams(fixture);
            await expect(
                getEstateForgerTxByInput_RequestTokenization(
                    estateForger,
                    manager,
                    {
                        ...defaultParams,
                        requester: ethers.constants.AddressZero,
                    },
                    validator
                )
            ).to.be.revertedWithCustomError(estateForger, 'NotRegisteredCustodian');
        });

        it('2.2.10.10. RequestTokenization unsuccessfully with expired estate', async () => {
            const fixture = await beforeEstateForgerTest();

            const { manager, estateForger, validator } = fixture;

            const timestamp = (await time.latest()) + 1000;
            await time.setNextBlockTimestamp(timestamp);

            const defaultParams = await getDefaultParams(fixture);
            await expect(
                getEstateForgerTxByInput_RequestTokenization(
                    estateForger,
                    manager,
                    {
                        ...defaultParams,
                        estate: {
                            ...defaultParams.estate,
                            expireAt: timestamp - 1,
                        },
                    },
                    validator
                )
            ).to.be.revertedWithCustomError(estateForger, 'InvalidTimestamp');
        });

        it('2.2.10.11. RequestTokenization unsuccessfully when minimum selling amount exceeds maximum', async () => {
            const fixture = await beforeEstateForgerTest();

            const { manager, estateForger, validator } = fixture;

            const defaultParams = await getDefaultParams(fixture);
            await expect(
                getEstateForgerTxByInput_RequestTokenization(
                    estateForger,
                    manager,
                    {
                        ...defaultParams,
                        quota: {
                            ...defaultParams.quota,
                            minSellingQuantity: defaultParams.quota.maxSellingQuantity.add(1),
                        },
                    },
                    validator
                )
            ).to.be.revertedWithCustomError(estateForger, 'InvalidInput');
        });

        it('2.2.10.12. RequestTokenization unsuccessfully when maximum selling amount exceeds total supply', async () => {
            const fixture = await beforeEstateForgerTest();

            const { manager, estateForger, validator } = fixture;

            const defaultParams = await getDefaultParams(fixture);
            await expect(
                getEstateForgerTxByInput_RequestTokenization(
                    estateForger,
                    manager,
                    {
                        ...defaultParams,
                        quota: {
                            ...defaultParams.quota,
                            maxSellingQuantity: defaultParams.quota.totalQuantity.add(1),
                        },
                    },
                    validator
                )
            ).to.be.revertedWithCustomError(estateForger, 'InvalidInput');
        });

        it('2.2.10.13. RequestTokenization unsuccessfully with invalid cashback threshold', async () => {
            const fixture = await beforeEstateForgerTest();

            const { manager, estateForger, validator } = fixture;

            const defaultParams = await getDefaultParams(fixture);
            await expect(
                getEstateForgerTxByInput_RequestTokenization(
                    estateForger,
                    manager,
                    {
                        ...defaultParams,
                        quote: {
                            ...defaultParams.quote,
                            cashbackThreshold: defaultParams.quota.totalQuantity.add(1),
                        },
                    },
                    validator
                )
            ).to.be.revertedWithCustomError(estateForger, 'InvalidInput');
        });

        it('2.2.10.14. RequestTokenization unsuccessfully with invalid cashback base rate', async () => {
            const fixture = await beforeEstateForgerTest();

            const { manager, estateForger, validator } = fixture;

            const defaultParams = await getDefaultParams(fixture);
            await expect(
                getEstateForgerTxByInput_RequestTokenization(
                    estateForger,
                    manager,
                    {
                        ...defaultParams,
                        quote: {
                            ...defaultParams.quote,
                            cashbackBaseRate: Constant.COMMON_RATE_MAX_FRACTION.add(1),
                        },
                    },
                    validator
                )
            ).to.be.revertedWithCustomError(estateForger, 'InvalidInput');
        });

        it('2.2.10.15. RequestTokenization unsuccessfully with invalid cashback params length', async () => {
            const fixture = await beforeEstateForgerTest();

            const { manager, estateForger, validator } = fixture;

            const defaultParams = await getDefaultParams(fixture);
            await expect(
                getEstateForgerTxByInput_RequestTokenization(
                    estateForger,
                    manager,
                    {
                        ...defaultParams,
                        quote: {
                            ...defaultParams.quote,
                            cashbackCurrencies: defaultParams.quote.cashbackCurrencies.slice(0, -2),
                        },
                    },
                    validator
                )
            ).to.be.revertedWithCustomError(estateForger, 'InvalidInput');
        });

        it('2.2.10.16. RequestTokenization unsuccessfully with invalid sale start time', async () => {
            const fixture = await beforeEstateForgerTest();

            const { manager, estateForger, validator } = fixture;

            let timestamp = (await time.latest()) + 1000;
            await time.setNextBlockTimestamp(timestamp);

            const defaultParams = await getDefaultParams(fixture);

            await expect(
                getEstateForgerTxByInput_RequestTokenization(
                    estateForger,
                    manager,
                    {
                        ...defaultParams,
                        agenda: {
                            ...defaultParams.agenda,
                            saleStartsAt: timestamp - 1,
                        },
                    },
                    validator
                )
            ).to.be.revertedWithCustomError(estateForger, 'InvalidInput');

            timestamp += 10;
            await time.setNextBlockTimestamp(timestamp);

            await expect(
                getEstateForgerTxByInput_RequestTokenization(
                    estateForger,
                    manager,
                    {
                        ...defaultParams,
                        agenda: {
                            ...defaultParams.agenda,
                            saleStartsAt: timestamp,
                        },
                    },
                    validator
                )
            ).to.be.revertedWithCustomError(estateForger, 'InvalidInput');
        });

        it('2.2.10.17. RequestTokenization unsuccessfully with invalid sale durations', async () => {
            const fixture = await beforeEstateForgerTest();

            const { manager, estateForger, validator } = fixture;

            const defaultParams = await getDefaultParams(fixture);
            // Not enough minimum sale duration (7 days)
            await expect(
                getEstateForgerTxByInput_RequestTokenization(
                    estateForger,
                    manager,
                    {
                        ...defaultParams,
                        agenda: {
                            ...defaultParams.agenda,
                            privateSaleDuration: 3 * DAY,
                            publicSaleDuration: 4 * DAY - 1,
                        },
                    },
                    validator
                )
            ).to.be.revertedWithCustomError(estateForger, 'InvalidInput');

            // Zero sale duration
            await expect(
                getEstateForgerTxByInput_RequestTokenization(
                    estateForger,
                    manager,
                    {
                        ...defaultParams,
                        agenda: {
                            ...defaultParams.agenda,
                            privateSaleDuration: 0,
                            publicSaleDuration: 0,
                        },
                    },
                    validator
                )
            ).to.be.revertedWithCustomError(estateForger, 'InvalidInput');

            // Zero private sale duration is allowed
            await expect(
                getEstateForgerTxByInput_RequestTokenization(
                    estateForger,
                    manager,
                    {
                        ...defaultParams,
                        agenda: {
                            ...defaultParams.agenda,
                            privateSaleDuration: Constant.ESTATE_FORGER_MINIMUM_SALE_DURATION,
                            publicSaleDuration: 0,
                        },
                    },
                    validator
                )
            ).to.not.be.reverted;

            // Zero public sale duration is allowed
            await expect(
                getEstateForgerTxByInput_RequestTokenization(
                    estateForger,
                    manager,
                    {
                        ...defaultParams,
                        agenda: {
                            ...defaultParams.agenda,
                            privateSaleDuration: 0,
                            publicSaleDuration: Constant.ESTATE_FORGER_MINIMUM_SALE_DURATION,
                        },
                    },
                    validator
                )
            ).to.not.be.reverted;
        });

        it('2.2.10.18. RequestTokenization unsuccessfully with unregistered broker', async () => {
            const fixture = await beforeEstateForgerTest({
                skipRegisterBrokers: true,
            });

            const { manager, estateForger, validator } = fixture;

            const defaultParams = await getDefaultParams(fixture);

            await expect(
                getEstateForgerTxByInput_RequestTokenization(estateForger, manager, defaultParams, validator)
            ).to.be.revertedWithCustomError(estateForger, 'InvalidBroker');
        });

        it('2.2.10.19. RequestTokenization unsuccessfully with inactive broker', async () => {
            const fixture = await beforeEstateForgerTest({
                skipRegisterBrokers: true,
            });

            const { manager, estateForger, validator, commissionToken } = fixture;

            const params = await getDefaultParams(fixture);

            await callTransaction(
                getCommissionTokenTx_RegisterBroker(commissionToken as any, manager, {
                    zone: params.estate.zone,
                    broker: params.quote.broker,
                    commissionRate: ethers.utils.parseEther('0.01'),
                })
            );
            await callTransaction(
                getCommissionTokenTx_ActivateBroker(commissionToken as any, manager, {
                    zone: params.estate.zone,
                    broker: params.quote.broker,
                    isActive: false,
                })
            );

            await expect(
                getEstateForgerTxByInput_RequestTokenization(estateForger, manager, params, validator)
            ).to.be.revertedWithCustomError(estateForger, 'InvalidBroker');
        });

        it('2.2.10.20. RequestTokenization unsuccessfully when estate forger is not vault initiator', async () => {
            const fixture = await beforeEstateForgerTest({
                skipAddEstateForgerToVault: true,
            });

            const { manager, estateForger, validator } = fixture;

            const defaultParams = await getDefaultParams(fixture);
            await expect(
                getEstateForgerTxByInput_RequestTokenization(estateForger, manager, defaultParams, validator)
            ).to.be.revertedWithCustomError(estateForger, 'Unauthorized');
        });

        it('2.2.10.21. RequestTokenization unsuccessfully without cashback params but with cashback threshold', async () => {
            const fixture = await beforeEstateForgerTest();

            const { manager, estateForger, validator } = fixture;

            const defaultParams = await getDefaultParams(fixture);

            await expect(
                getEstateForgerTxByInput_RequestTokenization(
                    estateForger,
                    manager,
                    {
                        ...defaultParams,
                        quote: {
                            ...defaultParams.quote,
                            cashbackCurrencies: [],
                            cashbackBaseRate: BigNumber.from(0),
                        },
                    },
                    validator
                )
            ).to.be.revertedWithCustomError(estateForger, 'InvalidInput');
        });

        it('2.2.10.22. RequestTokenization unsuccessfully with cashback params but without cashback threshold', async () => {
            const fixture = await beforeEstateForgerTest();

            const { manager, estateForger, validator } = fixture;

            const defaultParams = await getDefaultParams(fixture);
            await expect(
                getEstateForgerTxByInput_RequestTokenization(
                    estateForger,
                    manager,
                    {
                        ...defaultParams,
                        quote: {
                            ...defaultParams.quote,
                            cashbackThreshold: BigNumber.from(0),
                        },
                    },
                    validator
                )
            ).to.be.revertedWithCustomError(estateForger, 'InvalidInput');
        });
    });

    describe('2.2.11. whitelistFor(uint256,address[],bool)', async () => {
        it('2.2.11.1. Whitelist user for request successfully', async () => {
            const fixture = await beforeEstateForgerTest({
                addSampleRequests: true,
            });
            const { estateForger, manager, moderator, depositor1, depositor2, depositor3 } = fixture;

            // By manager
            const depositors_tx1 = [depositor1, depositor2, depositor3];
            const tx1 = await getEstateForgerTx_WhitelistFor(estateForger, manager, {
                requestId: BigNumber.from(1),
                accounts: depositors_tx1.map((x) => x.address),
                isWhitelisted: true,
            });
            await tx1.wait();

            for (const depositor of depositors_tx1) {
                await expect(tx1).to.emit(estateForger, 'RequestWhitelist').withArgs(1, depositor.address);
            }

            expect(await estateForger.isWhitelistedFor(1, depositor1.address)).to.be.true;
            expect(await estateForger.isWhitelistedFor(1, depositor2.address)).to.be.true;
            expect(await estateForger.isWhitelistedFor(1, depositor3.address)).to.be.true;
            expect(await estateForger.isWhitelistedFor(2, depositor1.address)).to.be.false;
            expect(await estateForger.isWhitelistedFor(2, depositor2.address)).to.be.false;
            expect(await estateForger.isWhitelistedFor(2, depositor3.address)).to.be.false;

            // By moderator
            const depositors_tx2 = [depositor1];
            const tx2 = await getEstateForgerTx_WhitelistFor(estateForger, moderator, {
                requestId: BigNumber.from(2),
                accounts: depositors_tx2.map((x) => x.address),
                isWhitelisted: true,
            });
            await tx2.wait();

            for (const depositor of depositors_tx2) {
                await expect(tx2).to.emit(estateForger, 'RequestWhitelist').withArgs(2, depositor.address);
            }

            expect(await estateForger.isWhitelistedFor(1, depositor1.address)).to.be.true;
            expect(await estateForger.isWhitelistedFor(1, depositor2.address)).to.be.true;
            expect(await estateForger.isWhitelistedFor(1, depositor3.address)).to.be.true;
            expect(await estateForger.isWhitelistedFor(2, depositor1.address)).to.be.true;
            expect(await estateForger.isWhitelistedFor(2, depositor2.address)).to.be.false;
            expect(await estateForger.isWhitelistedFor(2, depositor3.address)).to.be.false;
        });

        it('2.2.11.2. Whitelist user for request unsuccessfully with invalid request id', async () => {
            const fixture = await beforeEstateForgerTest();
            const { manager, estateForger, depositor1, depositor2 } = fixture;

            await expect(
                getEstateForgerTx_WhitelistFor(estateForger, manager, {
                    requestId: BigNumber.from(0),
                    accounts: [depositor1.address, depositor2.address],
                    isWhitelisted: true,
                })
            ).to.be.revertedWithCustomError(estateForger, 'InvalidRequestId');

            await expect(
                getEstateForgerTx_WhitelistFor(estateForger, manager, {
                    requestId: BigNumber.from(100),
                    accounts: [depositor1.address, depositor2.address],
                    isWhitelisted: true,
                })
            ).to.be.revertedWithCustomError(estateForger, 'InvalidRequestId');
        });

        it('2.2.11.3. Whitelist user for request unsuccessfully by non-executive', async () => {
            const fixture = await beforeEstateForgerTest({
                addSampleRequests: true,
            });
            const { admins, manager, user, depositor1, depositor2, admin, estateForger, zone1 } = fixture;

            await getAdminTxByInput_ActivateIn(
                admin,
                manager,
                {
                    zone: zone1,
                    accounts: [user.address],
                    isActive: true,
                },
                admins
            );

            await expect(
                getEstateForgerTx_WhitelistFor(estateForger, user, {
                    requestId: BigNumber.from(1),
                    accounts: [depositor1.address, depositor2.address],
                    isWhitelisted: true,
                })
            ).to.be.revertedWithCustomError(estateForger, 'Unauthorized');
        });

        it('2.2.11.4. Whitelist user for request unsuccessfully with inactive executive in zone', async () => {
            const fixture = await beforeEstateForgerTest({
                addSampleRequests: true,
            });
            const { admins, manager, moderator, depositor1, depositor2, admin, estateForger, zone1 } = fixture;

            await getAdminTxByInput_ActivateIn(
                admin,
                manager,
                {
                    zone: zone1,
                    accounts: [manager.address, moderator.address],
                    isActive: false,
                },
                admins
            );

            const params: WhitelistForParams = {
                requestId: BigNumber.from(1),
                accounts: [depositor1.address, depositor2.address],
                isWhitelisted: true,
            };
            await expect(getEstateForgerTx_WhitelistFor(estateForger, manager, params)).to.be.revertedWithCustomError(
                estateForger,
                'Unauthorized'
            );
            await expect(getEstateForgerTx_WhitelistFor(estateForger, moderator, params)).to.be.revertedWithCustomError(
                estateForger,
                'Unauthorized'
            );
        });

        it('2.2.11.5. Whitelist user for request unsuccessfully when whitelisting the same account twice on the same tx', async () => {
            const fixture = await beforeEstateForgerTest({
                addSampleRequests: true,
            });
            const { estateForger, manager, depositor1, depositor2, depositor3 } = fixture;

            const depositors = [depositor1, depositor2, depositor3, depositor1];
            await expect(
                getEstateForgerTx_WhitelistFor(estateForger, manager, {
                    requestId: BigNumber.from(1),
                    accounts: depositors.map((x) => x.address),
                    isWhitelisted: true,
                })
            ).to.be.revertedWithCustomError(estateForger, 'WhitelistedAccount');
        });

        it('2.2.11.6. Whitelist user for request unsuccessfully when whitelisting the same account twice on different txs', async () => {
            const fixture = await beforeEstateForgerTest({
                addSampleRequests: true,
            });
            const { estateForger, manager, depositor1, depositor2, depositor3 } = fixture;

            await callTransaction(
                getEstateForgerTx_WhitelistFor(estateForger, manager, {
                    requestId: BigNumber.from(1),
                    accounts: [depositor1.address, depositor3.address],
                    isWhitelisted: true,
                })
            );

            await expect(
                getEstateForgerTx_WhitelistFor(estateForger, manager, {
                    requestId: BigNumber.from(1),
                    accounts: [depositor2.address, depositor3.address],
                    isWhitelisted: true,
                })
            ).to.be.revertedWithCustomError(estateForger, 'WhitelistedAccount');
        });

        it('2.2.11.7. Unwhitelist user for request successfully', async () => {
            const fixture = await beforeEstateForgerTest({
                addSampleRequests: true,
            });
            const { estateForger, manager, moderator, depositor1, depositor2, depositor3, depositors } = fixture;

            await callTransaction(
                getEstateForgerTx_WhitelistFor(estateForger, manager, {
                    requestId: BigNumber.from(1),
                    accounts: depositors.map((x) => x.address),
                    isWhitelisted: true,
                })
            );
            await callTransaction(
                getEstateForgerTx_WhitelistFor(estateForger, manager, {
                    requestId: BigNumber.from(2),
                    accounts: depositors.map((x) => x.address),
                    isWhitelisted: true,
                })
            );

            // By manager
            const tx1 = await getEstateForgerTx_WhitelistFor(estateForger, manager, {
                requestId: BigNumber.from(1),
                accounts: [depositor1.address, depositor2.address],
                isWhitelisted: false,
            });
            await tx1.wait();

            for (const depositor of [depositor1, depositor2]) {
                await expect(tx1).to.emit(estateForger, 'RequestUnwhitelist').withArgs(1, depositor.address);
            }

            expect(await estateForger.isWhitelistedFor(1, depositor1.address)).to.be.false;
            expect(await estateForger.isWhitelistedFor(1, depositor2.address)).to.be.false;
            expect(await estateForger.isWhitelistedFor(1, depositor3.address)).to.be.true;
            expect(await estateForger.isWhitelistedFor(2, depositor1.address)).to.be.true;
            expect(await estateForger.isWhitelistedFor(2, depositor2.address)).to.be.true;
            expect(await estateForger.isWhitelistedFor(2, depositor3.address)).to.be.true;

            // By moderator
            const tx2 = await getEstateForgerTx_WhitelistFor(estateForger, moderator, {
                requestId: BigNumber.from(2),
                accounts: [depositor1.address, depositor3.address],
                isWhitelisted: false,
            });
            await tx2.wait();

            for (const depositor of [depositor1, depositor3]) {
                await expect(tx2).to.emit(estateForger, 'RequestUnwhitelist').withArgs(2, depositor.address);
            }

            expect(await estateForger.isWhitelistedFor(1, depositor1.address)).to.be.false;
            expect(await estateForger.isWhitelistedFor(1, depositor2.address)).to.be.false;
            expect(await estateForger.isWhitelistedFor(1, depositor3.address)).to.be.true;
            expect(await estateForger.isWhitelistedFor(2, depositor1.address)).to.be.false;
            expect(await estateForger.isWhitelistedFor(2, depositor2.address)).to.be.true;
            expect(await estateForger.isWhitelistedFor(2, depositor3.address)).to.be.false;
        });

        it('2.2.11.8. Unwhitelist user for request unsuccessfully with not whitelisted account', async () => {
            const fixture = await beforeEstateForgerTest({
                addSampleRequests: true,
            });
            const { manager, depositor1, depositor2, estateForger } = fixture;

            await expect(
                getEstateForgerTx_WhitelistFor(estateForger, manager, {
                    requestId: BigNumber.from(1),
                    accounts: [depositor1.address, depositor2.address],
                    isWhitelisted: false,
                })
            ).to.be.revertedWithCustomError(estateForger, 'NotWhitelistedAccount');
        });

        it('2.2.11.9. Unwhitelist user for request unsuccessfully when unwhitelisting the same account twice on the same tx', async () => {
            const fixture = await beforeEstateForgerTest({
                addSampleRequests: true,
            });
            const { manager, depositor1, depositor2, depositor3, depositors, estateForger } = fixture;

            await callTransaction(
                getEstateForgerTx_WhitelistFor(estateForger, manager, {
                    requestId: BigNumber.from(1),
                    accounts: depositors.map((x) => x.address),
                    isWhitelisted: true,
                })
            );

            await expect(
                getEstateForgerTx_WhitelistFor(estateForger, manager, {
                    requestId: BigNumber.from(1),
                    accounts: [depositor1.address, depositor2.address, depositor3.address, depositor1.address],
                    isWhitelisted: false,
                })
            ).to.be.revertedWithCustomError(estateForger, 'NotWhitelistedAccount');
        });

        it('2.2.11.10. Unwhitelist user for request unsuccessfully when unwhitelisting the same account twice on different txs', async () => {
            const fixture = await beforeEstateForgerTest({
                addSampleRequests: true,
            });
            const { manager, depositor1, depositor2, depositor3, depositors, estateForger } = fixture;

            await callTransaction(
                getEstateForgerTx_WhitelistFor(estateForger, manager, {
                    requestId: BigNumber.from(1),
                    accounts: depositors.map((x) => x.address),
                    isWhitelisted: true,
                })
            );

            await callTransaction(
                getEstateForgerTx_WhitelistFor(estateForger, manager, {
                    requestId: BigNumber.from(1),
                    accounts: [depositor1.address, depositor3.address],
                    isWhitelisted: false,
                })
            );

            await expect(
                getEstateForgerTx_WhitelistFor(estateForger, manager, {
                    requestId: BigNumber.from(1),
                    accounts: [depositor2.address, depositor3.address],
                    isWhitelisted: false,
                })
            ).to.be.revertedWithCustomError(estateForger, 'NotWhitelistedAccount');
        });
    });

    describe('2.2.12. updateRequestEstateURI(uint256,string,(uint256,uint256,bytes))', async () => {
        async function beforeUpdateRequestEstateURI(
            fixture: EstateForgerFixture
        ): Promise<{ defaultParamsInput: UpdateRequestEstateURIParamsInput }> {
            return {
                defaultParamsInput: {
                    requestId: BigNumber.from(1),
                    uri: 'NewTestingURI',
                },
            };
        }

        it('2.2.12.1. Update tokenization request URI successfully', async () => {
            const fixture = await beforeEstateForgerTest({
                addSampleRequests: true,
            });
            const { moderator, manager, estateForger, validator } = fixture;

            // Tx1: by manager
            const paramsInput1: UpdateRequestEstateURIParamsInput = {
                requestId: BigNumber.from(1),
                uri: 'new_uri_1',
            };

            const tx1 = await getEstateForgerTxByInput_UpdateRequestEstateURI(
                estateForger,
                manager,
                paramsInput1,
                validator
            );
            await tx1.wait();

            await expect(tx1)
                .to.emit(estateForger, 'RequestEstateURIUpdate')
                .withArgs(paramsInput1.requestId, paramsInput1.uri);

            const request1 = await estateForger.getRequest(paramsInput1.requestId);
            expect(request1.estate.uri).to.equal(paramsInput1.uri);

            // Tx2: by moderator
            const paramsInput2: UpdateRequestEstateURIParamsInput = {
                requestId: BigNumber.from(1),
                uri: 'new_uri_2',
            };

            const tx2 = await getEstateForgerTxByInput_UpdateRequestEstateURI(
                estateForger,
                moderator,
                paramsInput2,
                validator
            );
            await tx2.wait();

            await expect(tx2)
                .to.emit(estateForger, 'RequestEstateURIUpdate')
                .withArgs(paramsInput2.requestId, paramsInput2.uri);

            const request2 = await estateForger.getRequest(paramsInput2.requestId);
            expect(request2.estate.uri).to.equal(paramsInput2.uri);
        });

        it('2.2.12.2. Update tokenization request URI unsuccessfully with invalid signatures', async () => {
            const fixture = await beforeEstateForgerTest({
                addSampleRequests: true,
            });
            const { manager, estateForger, validator } = fixture;

            const { defaultParamsInput } = await beforeUpdateRequestEstateURI(fixture);
            const params: UpdateRequestEstateURIParams = {
                ...defaultParamsInput,
                validation: await getUpdateRequestEstateURIValidation(
                    estateForger,
                    defaultParamsInput,
                    validator,
                    false
                ),
            };
            await expect(
                getEstateForgerTx_UpdateRequestEstateURI(estateForger, manager, params)
            ).to.be.revertedWithCustomError(estateForger, 'InvalidSignature');
        });

        it('2.2.12.3. Update tokenization request URI unsuccessfully by non-executive', async () => {
            const fixture = await beforeEstateForgerTest({
                addSampleRequests: true,
            });
            const { user, estateForger, validator } = fixture;

            const { defaultParamsInput } = await beforeUpdateRequestEstateURI(fixture);
            await expect(
                getEstateForgerTxByInput_UpdateRequestEstateURI(estateForger, user, defaultParamsInput, validator)
            ).to.be.revertedWithCustomError(estateForger, 'Unauthorized');
        });

        it('2.2.12.4. Update tokenization request URI unsuccessfully with invalid request id', async () => {
            const fixture = await beforeEstateForgerTest({
                addSampleRequests: true,
            });
            const { manager, estateForger, validator } = fixture;
            const { defaultParamsInput } = await beforeUpdateRequestEstateURI(fixture);

            await expect(
                getEstateForgerTxByInput_UpdateRequestEstateURI(
                    estateForger,
                    manager,
                    {
                        ...defaultParamsInput,
                        requestId: BigNumber.from(0),
                    },
                    validator
                )
            ).to.be.revertedWithCustomError(estateForger, 'InvalidRequestId');

            await expect(
                getEstateForgerTxByInput_UpdateRequestEstateURI(
                    estateForger,
                    manager,
                    {
                        ...defaultParamsInput,
                        requestId: BigNumber.from(100),
                    },
                    validator
                )
            ).to.be.revertedWithCustomError(estateForger, 'InvalidRequestId');
        });

        it('2.2.12.5. Update tokenization request URI unsuccessfully with cancelled request', async () => {
            const fixture = await beforeEstateForgerTest({
                addSampleRequests: true,
            });
            const { manager, estateForger, validator } = fixture;
            const { defaultParamsInput } = await beforeUpdateRequestEstateURI(fixture);

            await callTransaction(
                getEstateForgerTx_Cancel(estateForger, manager, {
                    requestId: defaultParamsInput.requestId,
                })
            );

            await expect(
                getEstateForgerTxByInput_UpdateRequestEstateURI(estateForger, manager, defaultParamsInput, validator)
            ).to.be.revertedWithCustomError(estateForger, 'AlreadyCancelled');
        });

        it('2.2.12.6. Update tokenization request URI unsuccessfully with confirmed request', async () => {
            const fixture = await beforeEstateForgerTest({
                addSampleRequests: true,
                addDepositions: true,
                confirmRequests: true,
            });
            const { manager, estateForger, validator } = fixture;
            const { defaultParamsInput } = await beforeUpdateRequestEstateURI(fixture);

            await expect(
                getEstateForgerTxByInput_UpdateRequestEstateURI(estateForger, manager, defaultParamsInput, validator)
            ).to.be.revertedWithCustomError(estateForger, 'AlreadyConfirmed');
        });

        it('2.2.12.7. Update tokenization request URI unsuccessfully by inactive manager in zone', async () => {
            const fixture = await beforeEstateForgerTest({
                addSampleRequests: true,
            });
            const { manager, estateForger, admin, admins, validator } = fixture;
            const { defaultParamsInput } = await beforeUpdateRequestEstateURI(fixture);

            const zone = (await estateForger.getRequest(defaultParamsInput.requestId)).estate.zone;

            await callTransaction(
                getAdminTxByInput_ActivateIn(
                    admin,
                    manager,
                    {
                        zone: zone,
                        accounts: [manager.address],
                        isActive: false,
                    },
                    admins
                )
            );

            await expect(
                getEstateForgerTxByInput_UpdateRequestEstateURI(estateForger, manager, defaultParamsInput, validator)
            ).to.be.revertedWithCustomError(estateForger, 'Unauthorized');
        });
    });

    describe('2.2.13. updateRequestAgenda(uint256,(uint40,uint40,uint40))', async () => {
        async function getDefaultParams(fixture: EstateForgerFixture): Promise<UpdateRequestAgendaParams> {
            return {
                requestId: BigNumber.from(1),
                agenda: {
                    saleStartsAt: 0,
                    privateSaleDuration: 100 * DAY,
                    publicSaleDuration: 200 * DAY,
                },
            };
        }

        it('2.2.13.1. Update tokenization request agenda successfully without updating start time', async () => {
            const fixture = await beforeEstateForgerTest({
                addSampleRequests: true,
            });
            const { manager, estateForger } = fixture;

            const defaultParams = await getDefaultParams(fixture);

            const tx = await getEstateForgerTx_UpdateRequestAgenda(estateForger, manager, defaultParams);
            const receipt = await tx.wait();

            const currentSaleStartsAt = (await estateForger.getRequest(defaultParams.requestId)).agenda.saleStartsAt;

            const event = receipt.events!.find((e) => e.event === 'RequestAgendaUpdate')!;
            const agenda: RequestAgenda = {
                saleStartsAt: currentSaleStartsAt,
                privateSaleEndsAt: currentSaleStartsAt + defaultParams.agenda.privateSaleDuration,
                publicSaleEndsAt:
                    currentSaleStartsAt +
                    defaultParams.agenda.privateSaleDuration +
                    defaultParams.agenda.publicSaleDuration,
                confirmAt: 0,
            };
            expect(event.args!.requestId).to.equal(defaultParams.requestId);
            expect(structToObject(event.args!.agenda)).to.deep.equal(defaultParams.agenda);

            const request = await estateForger.getRequest(defaultParams.requestId);
            expect(request.agenda.saleStartsAt).to.equal(currentSaleStartsAt);
            expect(request.agenda.privateSaleEndsAt).to.equal(agenda.privateSaleEndsAt);
            expect(request.agenda.publicSaleEndsAt).to.equal(agenda.publicSaleEndsAt);
        });

        it('2.2.13.2. Update tokenization request agenda successfully with updating start time', async () => {
            const fixture = await beforeEstateForgerTest({
                addSampleRequests: true,
            });
            const { manager, estateForger } = fixture;

            const defaultParams = await getDefaultParams(fixture);

            let timestamp = (await time.latest()) + 5;
            const params1 = {
                ...defaultParams,
                agenda: {
                    ...defaultParams.agenda,
                    saleStartsAt: timestamp + 1000,
                },
            };

            await time.setNextBlockTimestamp(timestamp);
            const tx1 = await getEstateForgerTx_UpdateRequestAgenda(estateForger, manager, params1);
            const receipt1 = await tx1.wait();

            const event1 = receipt1.events!.find((e) => e.event === 'RequestAgendaUpdate')!;
            const agenda1: RequestAgenda = {
                saleStartsAt: params1.agenda.saleStartsAt,
                privateSaleEndsAt: params1.agenda.saleStartsAt + params1.agenda.privateSaleDuration,
                publicSaleEndsAt:
                    params1.agenda.saleStartsAt +
                    params1.agenda.privateSaleDuration +
                    params1.agenda.publicSaleDuration,
                confirmAt: 0,
            };
            expect(event1.args!.requestId).to.equal(params1.requestId);
            expect(structToObject(event1.args!.agenda)).to.deep.equal(params1.agenda);

            const request1 = await estateForger.getRequest(params1.requestId);
            expect(request1.agenda.saleStartsAt).to.equal(params1.agenda.saleStartsAt);
            expect(request1.agenda.privateSaleEndsAt).to.equal(agenda1.privateSaleEndsAt);
            expect(request1.agenda.publicSaleEndsAt).to.equal(agenda1.publicSaleEndsAt);
        });

        it('2.2.13.3. Update tokenization request agenda unsuccessfully when paused', async () => {
            const fixture = await beforeEstateForgerTest({
                addSampleRequests: true,
                pause: true,
            });
            const { manager, estateForger } = fixture;
            const defaultParams = await getDefaultParams(fixture);

            await expect(
                getEstateForgerTx_UpdateRequestAgenda(estateForger, manager, defaultParams)
            ).to.be.revertedWith('Pausable: paused');
        });

        it('2.2.13.4. Update tokenization request agenda unsuccessfully by non-executive', async () => {
            const fixture = await beforeEstateForgerTest({
                addSampleRequests: true,
            });
            const { user, estateForger } = fixture;
            const defaultParams = await getDefaultParams(fixture);

            let currentTimestamp = (await time.latest()) + 1000;
            await time.setNextBlockTimestamp(currentTimestamp);

            await expect(
                getEstateForgerTx_UpdateRequestAgenda(estateForger, user, defaultParams)
            ).to.be.revertedWithCustomError(estateForger, 'Unauthorized');
        });

        it('2.2.13.5. Update tokenization request agenda unsuccessfully with invalid request id', async () => {
            const fixture = await beforeEstateForgerTest({
                addSampleRequests: true,
            });
            const { manager, estateForger } = fixture;
            const defaultParams = await getDefaultParams(fixture);

            const params1: UpdateRequestAgendaParams = {
                ...defaultParams,
                requestId: BigNumber.from(0),
            };
            await expect(
                getEstateForgerTx_UpdateRequestAgenda(estateForger, manager, params1)
            ).to.be.revertedWithCustomError(estateForger, 'InvalidRequestId');

            const params2: UpdateRequestAgendaParams = {
                ...defaultParams,
                requestId: BigNumber.from(100),
            };
            await expect(
                getEstateForgerTx_UpdateRequestAgenda(estateForger, manager, params2)
            ).to.be.revertedWithCustomError(estateForger, 'InvalidRequestId');
        });

        it('2.2.13.6. Update tokenization request agenda unsuccessfully with cancelled request', async () => {
            const fixture = await beforeEstateForgerTest({
                addSampleRequests: true,
            });
            const { manager, estateForger } = fixture;
            const defaultParams = await getDefaultParams(fixture);

            await getEstateForgerTx_Cancel(estateForger, manager, {
                requestId: BigNumber.from(defaultParams.requestId),
            });

            await expect(
                getEstateForgerTx_UpdateRequestAgenda(estateForger, manager, defaultParams)
            ).to.be.revertedWithCustomError(estateForger, 'AlreadyCancelled');
        });

        it('2.2.13.7. Update tokenization request agenda unsuccessfully with confirmed request', async () => {
            const fixture = await beforeEstateForgerTest({
                addSampleRequests: true,
                addDepositions: true,
                confirmRequests: true,
            });
            const { manager, estateForger } = fixture;
            const defaultParams = await getDefaultParams(fixture);

            await expect(
                getEstateForgerTx_UpdateRequestAgenda(estateForger, manager, defaultParams)
            ).to.be.revertedWithCustomError(estateForger, 'AlreadyConfirmed');
        });

        it('2.2.13.8. Update tokenization request agenda unsuccessfully when request is deposited', async () => {
            const fixture = await beforeEstateForgerTest({
                addSampleRequests: true,
                addDepositions: true,
            });
            const { manager, estateForger } = fixture;
            const defaultParams = await getDefaultParams(fixture);

            await expect(
                getEstateForgerTx_UpdateRequestAgenda(estateForger, manager, defaultParams)
            ).to.be.revertedWithCustomError(estateForger, 'AlreadyHadDeposit');
        });

        it('2.2.13.9. Update tokenization request agenda unsuccessfully by inactive executive in zone', async () => {
            const fixture = await beforeEstateForgerTest({
                addSampleRequests: true,
            });
            const { admin, admins, moderator, manager, estateForger } = fixture;
            const defaultParams = await getDefaultParams(fixture);

            const zone = (await estateForger.getRequest(defaultParams.requestId)).estate.zone;
            await callTransaction(
                getAdminTxByInput_ActivateIn(
                    admin,
                    manager,
                    {
                        zone: zone,
                        accounts: [moderator.address, manager.address],
                        isActive: false,
                    },
                    admins
                )
            );

            await expect(
                getEstateForgerTx_UpdateRequestAgenda(estateForger, moderator, defaultParams)
            ).to.be.revertedWithCustomError(estateForger, 'Unauthorized');
            await expect(
                getEstateForgerTx_UpdateRequestAgenda(estateForger, manager, defaultParams)
            ).to.be.revertedWithCustomError(estateForger, 'Unauthorized');
        });

        it('2.2.13.10. Update tokenization request agenda unsuccessfully with invalid sale durations', async () => {
            const fixture = await beforeEstateForgerTest({
                addSampleRequests: true,
            });

            const { manager, estateForger } = fixture;

            const defaultParams = await getDefaultParams(fixture);
            // Not enough minimum sale duration (7 days)
            const data1 = {
                ...defaultParams,
                agenda: {
                    ...defaultParams.agenda,
                    privateSaleDuration: 3 * DAY,
                    publicSaleDuration: 4 * DAY - 1,
                },
            };
            await expect(
                getEstateForgerTx_UpdateRequestAgenda(estateForger, manager, data1)
            ).to.be.revertedWithCustomError(estateForger, 'InvalidInput');

            // Zero sale duration
            const data2 = {
                ...defaultParams,
                agenda: {
                    ...defaultParams.agenda,
                    privateSaleDuration: 0,
                    publicSaleDuration: 0,
                },
            };
            await expect(
                getEstateForgerTx_UpdateRequestAgenda(estateForger, manager, data2)
            ).to.be.revertedWithCustomError(estateForger, 'InvalidInput');

            // Zero private sale duration is allowed
            const data3 = {
                ...defaultParams,
                agenda: {
                    ...defaultParams.agenda,
                    privateSaleDuration: Constant.ESTATE_FORGER_MINIMUM_SALE_DURATION,
                    publicSaleDuration: 0,
                },
            };
            await expect(getEstateForgerTx_UpdateRequestAgenda(estateForger, manager, data3)).to.not.be.reverted;

            // Zero public sale duration is allowed
            const data4 = {
                ...defaultParams,
                agenda: {
                    ...defaultParams.agenda,
                    privateSaleDuration: 0,
                    publicSaleDuration: Constant.ESTATE_FORGER_MINIMUM_SALE_DURATION,
                },
            };
            await expect(getEstateForgerTx_UpdateRequestAgenda(estateForger, manager, data4)).to.not.be.reverted;
        });

        it('2.2.13.11. Update tokenization request agenda unsuccessfully when updating start time of already started request', async () => {
            const fixture = await beforeEstateForgerTest({
                addSampleRequests: true,
            });

            const { manager, estateForger } = fixture;

            const defaultParams = await getDefaultParams(fixture);

            const saleStartsAt = (await estateForger.getRequest(defaultParams.requestId)).agenda.saleStartsAt;
            const params = {
                ...defaultParams,
                agenda: {
                    ...defaultParams.agenda,
                    saleStartsAt: saleStartsAt + 1000,
                },
            };

            await time.setNextBlockTimestamp(saleStartsAt);

            await expect(
                getEstateForgerTx_UpdateRequestAgenda(estateForger, manager, params)
            ).to.be.revertedWithCustomError(estateForger, 'InvalidInput');
        });

        it('2.2.13.12. Update tokenization request agenda unsuccessfully with invalid sale start time', async () => {
            const fixture = await beforeEstateForgerTest({
                addSampleRequests: true,
            });
            const { manager, estateForger } = fixture;

            let timestamp = (await time.latest()) + 5;

            const defaultParams = await getDefaultParams(fixture);

            const params1 = {
                ...defaultParams,
                agenda: {
                    ...defaultParams.agenda,
                    saleStartsAt: timestamp - 1,
                },
            };

            await time.setNextBlockTimestamp(timestamp);
            await expect(
                getEstateForgerTx_UpdateRequestAgenda(estateForger, manager, params1)
            ).to.be.revertedWithCustomError(estateForger, 'InvalidTimestamp');

            timestamp += 3;
            const params2 = {
                ...defaultParams,
                agenda: {
                    ...defaultParams.agenda,
                    saleStartsAt: timestamp,
                },
            };

            await time.setNextBlockTimestamp(timestamp);
            await expect(
                getEstateForgerTx_UpdateRequestAgenda(estateForger, manager, params2)
            ).to.be.revertedWithCustomError(estateForger, 'InvalidTimestamp');
        });
    });

    describe('2.2.14. cancel(uint256)', async () => {
        it('2.2.14.1. Cancel tokenization successfully', async () => {
            const fixture = await beforeEstateForgerTest({
                addSampleRequests: true,
            });
            const { manager, estateForger } = fixture;

            for (let requestId = 1; requestId <= 2; requestId++) {
                const tx = await getEstateForgerTx_Cancel(estateForger, manager, {
                    requestId: BigNumber.from(requestId),
                });
                await tx.wait();

                await expect(tx).to.emit(estateForger, 'RequestCancellation').withArgs(requestId);

                const request = await estateForger.getRequest(requestId);
                expect(request.estate.estateId).to.equal(0);
                expect(request.quota.totalQuantity).to.equal(0);
            }
        });

        it('2.2.14.2. Cancel tokenization unsuccessfully by non-manager', async () => {
            const fixture = await beforeEstateForgerTest({
                addSampleRequests: true,
            });
            const { user, moderator, estateForger } = fixture;

            await expect(
                getEstateForgerTx_Cancel(estateForger, user, {
                    requestId: BigNumber.from(1),
                })
            ).to.be.revertedWithCustomError(estateForger, 'Unauthorized');

            await expect(
                getEstateForgerTx_Cancel(estateForger, moderator, {
                    requestId: BigNumber.from(2),
                })
            ).to.be.revertedWithCustomError(estateForger, 'Unauthorized');
        });

        it('2.2.14.3. Cancel tokenization unsuccessfully with invalid request id', async () => {
            const fixture = await beforeEstateForgerTest({
                addSampleRequests: true,
            });
            const { manager, estateForger } = fixture;

            await expect(
                getEstateForgerTx_Cancel(estateForger, manager, {
                    requestId: BigNumber.from(0),
                })
            ).to.be.revertedWithCustomError(estateForger, 'InvalidRequestId');

            await expect(
                getEstateForgerTx_Cancel(estateForger, manager, {
                    requestId: BigNumber.from(100),
                })
            ).to.be.revertedWithCustomError(estateForger, 'InvalidRequestId');
        });

        it('2.2.14.4. Cancel tokenization unsuccessfully when paused', async () => {
            const fixture = await beforeEstateForgerTest({
                addSampleRequests: true,
                pause: true,
            });
            const { manager, estateForger } = fixture;

            await expect(
                getEstateForgerTx_Cancel(estateForger, manager, {
                    requestId: BigNumber.from(1),
                })
            ).to.be.revertedWith('Pausable: paused');

            await expect(
                getEstateForgerTx_Cancel(estateForger, manager, {
                    requestId: BigNumber.from(2),
                })
            ).to.be.revertedWith('Pausable: paused');
        });

        it('2.2.14.5. Cancel tokenization unsuccessfully by inactive manager in zone', async () => {
            const fixture = await beforeEstateForgerTest({
                addSampleRequests: true,
            });
            const { manager, estateForger, admin, admins } = fixture;

            const zone = (await estateForger.getRequest(1)).estate.zone;
            await callTransaction(
                getAdminTxByInput_ActivateIn(
                    admin,
                    manager,
                    {
                        zone,
                        accounts: [manager.address],
                        isActive: false,
                    },
                    admins
                )
            );

            await expect(
                getEstateForgerTx_Cancel(estateForger, manager, {
                    requestId: BigNumber.from(1),
                })
            ).to.be.revertedWithCustomError(estateForger, 'Unauthorized');
        });

        it('2.2.14.6. Cancel tokenization unsuccessfully with cancelled request', async () => {
            const fixture = await beforeEstateForgerTest({
                addSampleRequests: true,
            });
            const { manager, estateForger } = fixture;

            await getEstateForgerTx_Cancel(estateForger, manager, {
                requestId: BigNumber.from(1),
            });
            await expect(
                getEstateForgerTx_Cancel(estateForger, manager, {
                    requestId: BigNumber.from(1),
                })
            ).to.be.revertedWithCustomError(estateForger, 'AlreadyCancelled');

            await getEstateForgerTx_Cancel(estateForger, manager, {
                requestId: BigNumber.from(2),
            });
            await expect(
                getEstateForgerTx_Cancel(estateForger, manager, {
                    requestId: BigNumber.from(2),
                })
            ).to.be.revertedWithCustomError(estateForger, 'AlreadyCancelled');
        });

        it('2.2.14.7. Cancel tokenization unsuccessfully with confirmed request', async () => {
            const fixture = await beforeEstateForgerTest({
                addSampleRequests: true,
                addDepositions: true,
                confirmRequests: true,
            });
            const { manager, estateForger } = fixture;

            await expect(
                getEstateForgerTx_Cancel(estateForger, manager, {
                    requestId: BigNumber.from(1),
                })
            ).to.be.revertedWithCustomError(estateForger, 'AlreadyConfirmed');
        });
    });

    describe('2.2.15. deposit(uint256,uint256)', async () => {
        it('2.2.15.1. Deposit tokenization successfully and correctly refund native currency', async () => {
            const fixture = await beforeEstateForgerTest({
                addSampleRequests: true,
                whitelistDepositors: true,
                whitelistDepositorsForRequests: true,
            });
            const { depositor1, depositor2, reserveVault, estateForger } = fixture;

            let initBalance1 = await ethers.provider.getBalance(depositor1.address);

            // During private sale
            // Fund is not expanded

            const requestId = 1;
            const quantity1 = 2;
            let value1 = (await estateForger.getRequest(requestId)).quote.unitPrice.mul(quantity1);

            let saleStartsAt = (await estateForger.getRequest(requestId)).agenda.saleStartsAt;
            await time.setNextBlockTimestamp(saleStartsAt);

            let tx = await getEstateForgerTx_Deposit(
                estateForger,
                depositor1,
                {
                    requestId: BigNumber.from(requestId),
                    quantity: BigNumber.from(quantity1),
                },
                { value: value1.mul(10) }
            );
            await tx.wait();

            await expect(tx)
                .to.emit(estateForger, 'Deposit')
                .withArgs(requestId, depositor1.address, quantity1, value1);

            let receipt = await tx.wait();
            const gasFee1 = receipt.effectiveGasPrice.mul(receipt.gasUsed);

            expect(await ethers.provider.getBalance(depositor1.address)).to.equal(
                initBalance1.sub(gasFee1).sub(value1)
            );
            expect(await ethers.provider.getBalance(estateForger.address)).to.equal(value1);

            let request = await estateForger.getRequest(requestId);
            expect(request.quota.soldQuantity).to.equal(quantity1);
            expect(await estateForger.deposits(requestId, depositor1.address)).to.equal(quantity1);

            expect((await reserveVault.getFund(1)).quantity).to.equal(0);

            // During the public sale
            // Another user deposit
            let initBalance2 = await ethers.provider.getBalance(depositor2.address);

            const timestamp = (await estateForger.getRequest(requestId)).agenda.privateSaleEndsAt;
            await time.setNextBlockTimestamp(timestamp);

            const quantity2 = 4;
            let value2 = (await estateForger.getRequest(requestId)).quote.unitPrice.mul(quantity2);

            tx = await getEstateForgerTx_Deposit(
                estateForger,
                depositor2,
                {
                    requestId: BigNumber.from(requestId),
                    quantity: BigNumber.from(quantity2),
                },
                { value: value2.mul(10) }
            );
            receipt = await tx.wait();
            const gasFee2 = receipt.effectiveGasPrice.mul(receipt.gasUsed);

            await expect(tx)
                .to.emit(estateForger, 'Deposit')
                .withArgs(requestId, depositor2.address, quantity2, value2);

            expect(await ethers.provider.getBalance(depositor2.address)).to.equal(
                initBalance2.sub(gasFee2).sub(value2)
            );
            expect(await ethers.provider.getBalance(estateForger.address)).to.equal(value1.add(value2));

            request = await estateForger.getRequest(requestId);
            expect(request.quota.soldQuantity).to.equal(quantity1 + quantity2);
            expect(await estateForger.deposits(requestId, depositor2.address)).to.equal(quantity2);

            expect((await reserveVault.getFund(1)).quantity).to.equal(0);

            // Fund expanded to total quantity (2 + 5 = 7)
            initBalance1 = await ethers.provider.getBalance(depositor1.address);

            const quantity3 = 5;
            let value3 = (await estateForger.getRequest(requestId)).quote.unitPrice.mul(quantity3);

            tx = await getEstateForgerTx_Deposit(
                estateForger,
                depositor1,
                {
                    requestId: BigNumber.from(requestId),
                    quantity: BigNumber.from(quantity3),
                },
                { value: value3.mul(10) }
            );
            receipt = await tx.wait();
            const gasFee3 = receipt.effectiveGasPrice.mul(receipt.gasUsed);

            await expect(tx)
                .to.emit(estateForger, 'Deposit')
                .withArgs(requestId, depositor1.address, quantity3, value3);

            expect(await ethers.provider.getBalance(depositor1.address)).to.equal(
                initBalance1.sub(gasFee3).sub(value3)
            );
            expect(await ethers.provider.getBalance(estateForger.address)).to.equal(value1.add(value2).add(value3));

            request = await estateForger.getRequest(requestId);
            expect(request.quota.soldQuantity).to.equal(quantity1 + quantity2 + quantity3);
            expect(await estateForger.deposits(requestId, depositor1.address)).to.equal(quantity1 + quantity3);

            expect((await reserveVault.getFund(1)).quantity).to.equal(quantity1 + quantity3);

            // Fund expanded by quantity4
            initBalance1 = await ethers.provider.getBalance(depositor1.address);

            const quantity4 = 8;
            let value4 = (await estateForger.getRequest(requestId)).quote.unitPrice.mul(quantity4);

            tx = await getEstateForgerTx_Deposit(
                estateForger,
                depositor1,
                {
                    requestId: BigNumber.from(requestId),
                    quantity: BigNumber.from(quantity4),
                },
                { value: value4.mul(10) }
            );
            receipt = await tx.wait();
            const gasFee4 = receipt.effectiveGasPrice.mul(receipt.gasUsed);

            await expect(tx)
                .to.emit(estateForger, 'Deposit')
                .withArgs(requestId, depositor1.address, quantity4, value4);

            expect(await ethers.provider.getBalance(depositor1.address)).to.equal(
                initBalance1.sub(gasFee4).sub(value4)
            );
            expect(await ethers.provider.getBalance(estateForger.address)).to.equal(
                value1.add(value2).add(value3).add(value4)
            );

            request = await estateForger.getRequest(requestId);
            expect(request.quota.soldQuantity).to.equal(quantity1 + quantity2 + quantity3 + quantity4);
            expect(await estateForger.deposits(requestId, depositor1.address)).to.equal(
                quantity1 + quantity3 + quantity4
            );

            expect((await reserveVault.getFund(1)).quantity).to.equal(quantity1 + quantity3 + quantity4);
        });

        it('2.2.15.2. Deposit tokenization successfully with ERC20 currency', async () => {
            const fixture = await beforeEstateForgerTest({
                addSampleRequests: true,
                whitelistDepositors: true,
                whitelistDepositorsForRequests: true,
            });
            const { estateForger, depositor1, depositor2, currencies } = fixture;
            const currency = currencies[0];
            const initBalance1 = await currency.balanceOf(depositor1.address);
            const initBalance2 = await currency.balanceOf(depositor2.address);
            const initNativeBalance1 = await ethers.provider.getBalance(depositor1.address);
            const initNativeBalance2 = await ethers.provider.getBalance(depositor2.address);
            const requestId = 2;

            // During the private sale
            let value1 = (await estateForger.getRequest(requestId)).quote.unitPrice.mul(100);

            let saleStartsAt = (await estateForger.getRequest(requestId)).agenda.saleStartsAt;
            await time.setNextBlockTimestamp(saleStartsAt + 1);

            let tx = await getEstateForgerTx_Deposit(estateForger, depositor1, {
                requestId: BigNumber.from(requestId),
                quantity: BigNumber.from(100),
            });
            await tx.wait();

            await expect(tx).to.emit(estateForger, 'Deposit').withArgs(requestId, depositor1.address, 100, value1);

            expect(await currency.balanceOf(depositor1.address)).to.equal(initBalance1.sub(value1));
            expect(await currency.balanceOf(estateForger.address)).to.equal(value1);

            let receipt = await tx.wait();
            expect(await ethers.provider.getBalance(depositor1.address)).to.equal(
                initNativeBalance1.sub(receipt.effectiveGasPrice.mul(receipt.gasUsed))
            );
            expect(await ethers.provider.getBalance(estateForger.address)).to.equal(0);

            let tokenizationRequest = await estateForger.getRequest(requestId);
            expect(tokenizationRequest.quota.soldQuantity).to.equal(100);
            expect(await estateForger.deposits(requestId, depositor1.address)).to.equal(100);

            // During public sale
            const timestamp = (await estateForger.getRequest(requestId)).agenda.privateSaleEndsAt;
            await time.setNextBlockTimestamp(timestamp);

            let value2 = (await estateForger.getRequest(requestId)).quote.unitPrice.mul(200);

            tx = await getEstateForgerTx_Deposit(estateForger, depositor2, {
                requestId: BigNumber.from(requestId),
                quantity: BigNumber.from(200),
            });
            await tx.wait();

            await expect(tx).to.emit(estateForger, 'Deposit').withArgs(requestId, depositor2.address, 200, value2);

            expect(await currency.balanceOf(depositor2.address)).to.equal(initBalance2.sub(value2));
            expect(await currency.balanceOf(estateForger.address)).to.equal(value1.add(value2));

            receipt = await tx.wait();
            expect(await ethers.provider.getBalance(depositor2.address)).to.equal(
                initNativeBalance2.sub(receipt.effectiveGasPrice.mul(receipt.gasUsed))
            );
            expect(await ethers.provider.getBalance(estateForger.address)).to.equal(0);

            tokenizationRequest = await estateForger.getRequest(requestId);
            expect(tokenizationRequest.quota.soldQuantity).to.equal(300);
            expect(await estateForger.deposits(requestId, depositor2.address)).to.equal(200);
        });

        it('2.2.15.3. Deposit tokenization successfully when no cashback', async () => {
            const fixture = await beforeEstateForgerTest({
                addSampleRequests: true,
                whitelistDepositors: true,
                whitelistDepositorsForRequests: true,
            });
            const { estateForger, depositor1, depositor2 } = fixture;

            let initBalance1 = await ethers.provider.getBalance(depositor1.address);

            // During the private sale
            const requestId = 1;
            const quantity1 = 2;
            let value1 = (await estateForger.getRequest(requestId)).quote.unitPrice.mul(quantity1);

            let saleStartsAt = (await estateForger.getRequest(requestId)).agenda.saleStartsAt;
            await time.setNextBlockTimestamp(saleStartsAt);

            let tx = await getEstateForgerTx_Deposit(
                estateForger,
                depositor1,
                {
                    requestId: BigNumber.from(requestId),
                    quantity: BigNumber.from(quantity1),
                },
                { value: value1.mul(10) }
            );
            await tx.wait();

            await expect(tx)
                .to.emit(estateForger, 'Deposit')
                .withArgs(requestId, depositor1.address, quantity1, value1);

            let receipt = await tx.wait();
            const gasFee1 = receipt.effectiveGasPrice.mul(receipt.gasUsed);

            expect(await ethers.provider.getBalance(depositor1.address)).to.equal(
                initBalance1.sub(gasFee1).sub(value1)
            );
            expect(await ethers.provider.getBalance(estateForger.address)).to.equal(value1);

            let request = await estateForger.getRequest(requestId);
            expect(request.quota.soldQuantity).to.equal(quantity1);
            expect(await estateForger.deposits(requestId, depositor1.address)).to.equal(quantity1);

            // During the public sale
            // Another user deposit
            let initBalance2 = await ethers.provider.getBalance(depositor2.address);

            const timestamp = (await estateForger.getRequest(requestId)).agenda.privateSaleEndsAt;
            await time.setNextBlockTimestamp(timestamp);

            const quantity2 = 4;
            let value2 = (await estateForger.getRequest(requestId)).quote.unitPrice.mul(quantity2);

            tx = await getEstateForgerTx_Deposit(
                estateForger,
                depositor2,
                {
                    requestId: BigNumber.from(requestId),
                    quantity: BigNumber.from(quantity2),
                },
                { value: value2.mul(10) }
            );
            receipt = await tx.wait();
            const gasFee2 = receipt.effectiveGasPrice.mul(receipt.gasUsed);

            await expect(tx)
                .to.emit(estateForger, 'Deposit')
                .withArgs(requestId, depositor2.address, quantity2, value2);

            expect(await ethers.provider.getBalance(depositor2.address)).to.equal(
                initBalance2.sub(gasFee2).sub(value2)
            );
            expect(await ethers.provider.getBalance(estateForger.address)).to.equal(value1.add(value2));

            request = await estateForger.getRequest(requestId);
            expect(request.quota.soldQuantity).to.equal(quantity1 + quantity2);
            expect(await estateForger.deposits(requestId, depositor2.address)).to.equal(quantity2);
        });

        it('2.2.15.4. Deposit tokenization unsuccessfully when paused', async () => {
            const fixture = await beforeEstateForgerTest({
                whitelistDepositors: true,
                whitelistDepositorsForRequests: true,
                addSampleRequests: true,
                pause: true,
            });
            const { estateForger, depositor1 } = fixture;

            let saleStartsAt = Math.max(
                (await estateForger.getRequest(1)).agenda.saleStartsAt,
                (await estateForger.getRequest(2)).agenda.saleStartsAt
            );
            await time.setNextBlockTimestamp(saleStartsAt);

            await expect(
                getEstateForgerTx_Deposit(
                    estateForger,
                    depositor1,
                    {
                        requestId: BigNumber.from(1),
                        quantity: BigNumber.from(2),
                    },
                    { value: ethers.utils.parseEther('100') }
                )
            ).to.be.revertedWith('Pausable: paused');

            await expect(
                getEstateForgerTx_Deposit(
                    estateForger,
                    depositor1,
                    {
                        requestId: BigNumber.from(2),
                        quantity: BigNumber.from(100),
                    },
                    { value: ethers.utils.parseEther('100') }
                )
            ).to.be.revertedWith('Pausable: paused');
        });

        it('2.2.15.5. Deposit tokenization unsuccessfully with invalid request id', async () => {
            const fixture = await beforeEstateForgerTest({
                addSampleRequests: true,
                whitelistDepositors: true,
                whitelistDepositorsForRequests: true,
            });
            const { estateForger, depositor1 } = fixture;

            await expect(
                getEstateForgerTx_Deposit(
                    estateForger,
                    depositor1,
                    {
                        requestId: BigNumber.from(0),
                        quantity: BigNumber.from(2),
                    },
                    { value: ethers.utils.parseEther('100') }
                )
            ).to.be.revertedWithCustomError(estateForger, 'InvalidRequestId');

            await expect(
                getEstateForgerTx_Deposit(
                    estateForger,
                    depositor1,
                    {
                        requestId: BigNumber.from(100),
                        quantity: BigNumber.from(2),
                    },
                    { value: ethers.utils.parseEther('100') }
                )
            ).to.be.revertedWithCustomError(estateForger, 'InvalidRequestId');
        });

        it('2.2.15.6. Deposit tokenization unsuccessfully with cancelled request', async () => {
            const fixture = await beforeEstateForgerTest({
                addSampleRequests: true,
                whitelistDepositors: true,
                whitelistDepositorsForRequests: true,
            });
            const { manager, estateForger, depositor1 } = fixture;

            await callTransaction(
                getEstateForgerTx_Cancel(estateForger, manager, {
                    requestId: BigNumber.from(1),
                })
            );

            let saleStartsAt = Math.max(
                (await estateForger.getRequest(1)).agenda.saleStartsAt,
                (await estateForger.getRequest(2)).agenda.saleStartsAt
            );
            await time.setNextBlockTimestamp(saleStartsAt);

            const params1: DepositParams = {
                requestId: BigNumber.from(1),
                quantity: BigNumber.from(2),
            };
            const params2: DepositParams = {
                requestId: BigNumber.from(2),
                quantity: BigNumber.from(100),
            };

            await expect(
                getEstateForgerTx_Deposit(estateForger, depositor1, params1, {
                    value: ethers.utils.parseEther('100'),
                })
            ).to.be.revertedWithCustomError(estateForger, 'AlreadyCancelled');

            await callTransaction(
                getEstateForgerTx_Deposit(estateForger, depositor1, params2, {
                    value: ethers.utils.parseEther('100'),
                })
            );

            await callTransaction(
                getEstateForgerTx_Cancel(estateForger, manager, {
                    requestId: BigNumber.from(2),
                })
            );

            await expect(
                getEstateForgerTx_Deposit(estateForger, depositor1, params1, {
                    value: ethers.utils.parseEther('100'),
                })
            ).to.be.revertedWithCustomError(estateForger, 'AlreadyCancelled');

            await expect(
                getEstateForgerTx_Deposit(estateForger, depositor1, params2, {
                    value: ethers.utils.parseEther('100'),
                })
            ).to.be.revertedWithCustomError(estateForger, 'AlreadyCancelled');
        });

        it('2.2.15.7. Deposit tokenization unsuccessfully with confirmed request', async () => {
            const fixture = await beforeEstateForgerTest({
                addSampleRequests: true,
                whitelistDepositors: true,
                whitelistDepositorsForRequests: true,
                addDepositions: true,
                confirmRequests: true,
            });
            const { estateForger, depositor1 } = fixture;

            await expect(
                getEstateForgerTx_Deposit(
                    estateForger,
                    depositor1,
                    {
                        requestId: BigNumber.from(1),
                        quantity: BigNumber.from(2),
                    },
                    { value: ethers.utils.parseEther('100') }
                )
            ).to.be.revertedWithCustomError(estateForger, 'AlreadyConfirmed');

            await expect(
                getEstateForgerTx_Deposit(
                    estateForger,
                    depositor1,
                    {
                        requestId: BigNumber.from(2),
                        quantity: BigNumber.from(100),
                    },
                    { value: ethers.utils.parseEther('100') }
                )
            ).to.be.revertedWithCustomError(estateForger, 'AlreadyConfirmed');
        });

        it('2.2.15.8. Deposit tokenization unsuccessfully when depositing before private sale starts', async () => {
            const fixture = await beforeEstateForgerTest({
                addSampleRequests: true,
                whitelistDepositors: true,
            });
            const { estateForger, depositor1 } = fixture;

            await expect(
                getEstateForgerTx_Deposit(
                    estateForger,
                    depositor1,
                    {
                        requestId: BigNumber.from(1),
                        quantity: BigNumber.from(2),
                    },
                    { value: ethers.utils.parseEther('100') }
                )
            ).to.be.revertedWithCustomError(estateForger, 'InvalidDepositing');

            let saleStartsAt = (await estateForger.getRequest(1)).agenda.saleStartsAt;
            await time.setNextBlockTimestamp(saleStartsAt - 1);

            await expect(
                getEstateForgerTx_Deposit(
                    estateForger,
                    depositor1,
                    {
                        requestId: BigNumber.from(1),
                        quantity: BigNumber.from(2),
                    },
                    { value: ethers.utils.parseEther('100') }
                )
            ).to.be.revertedWithCustomError(estateForger, 'InvalidDepositing');
        });

        it('2.2.15.9. Deposit tokenization successfully by only whitelisted for request account before public sale start', async () => {
            const fixture = await beforeEstateForgerTest({
                addSampleRequests: true,
                whitelistDepositorsForRequests: true,
            });
            const { estateForger, depositor1 } = fixture;

            let saleStartsAt = (await estateForger.getRequest(1)).agenda.saleStartsAt;
            await time.setNextBlockTimestamp(saleStartsAt);

            await expect(
                getEstateForgerTx_Deposit(
                    estateForger,
                    depositor1,
                    {
                        requestId: BigNumber.from(1),
                        quantity: BigNumber.from(2),
                    },
                    { value: ethers.utils.parseEther('100') }
                )
            ).to.not.be.reverted;

            const privateSaleEndsAt = (await estateForger.getRequest(1)).agenda.privateSaleEndsAt;
            await time.setNextBlockTimestamp(privateSaleEndsAt - 1);

            await expect(
                getEstateForgerTx_Deposit(
                    estateForger,
                    depositor1,
                    {
                        requestId: BigNumber.from(1),
                        quantity: BigNumber.from(2),
                    },
                    { value: ethers.utils.parseEther('100') }
                )
            ).to.not.be.reverted;
        });

        it('2.2.15.10. Deposit tokenization successfully by only whitelisted account before public sale start', async () => {
            const fixture = await beforeEstateForgerTest({
                addSampleRequests: true,
                whitelistDepositors: true,
            });
            const { estateForger, depositor1 } = fixture;

            let saleStartsAt = (await estateForger.getRequest(1)).agenda.saleStartsAt;
            await time.setNextBlockTimestamp(saleStartsAt);

            await expect(
                getEstateForgerTx_Deposit(
                    estateForger,
                    depositor1,
                    {
                        requestId: BigNumber.from(1),
                        quantity: BigNumber.from(2),
                    },
                    { value: ethers.utils.parseEther('100') }
                )
            ).to.not.be.reverted;

            const privateSaleEndsAt = (await estateForger.getRequest(1)).agenda.privateSaleEndsAt;
            await time.setNextBlockTimestamp(privateSaleEndsAt - 1);

            await expect(
                getEstateForgerTx_Deposit(
                    estateForger,
                    depositor1,
                    {
                        requestId: BigNumber.from(1),
                        quantity: BigNumber.from(2),
                    },
                    { value: ethers.utils.parseEther('100') }
                )
            ).to.not.be.reverted;
        });

        it('2.2.15.11. Deposit tokenization unsuccessfully by accounts neither whitelisted nor whitelisted for request before public sale start', async () => {
            const fixture = await beforeEstateForgerTest({
                addSampleRequests: true,
            });
            const { estateForger, depositor1 } = fixture;

            let saleStartsAt = (await estateForger.getRequest(1)).agenda.saleStartsAt;
            await time.setNextBlockTimestamp(saleStartsAt);

            await expect(
                getEstateForgerTx_Deposit(
                    estateForger,
                    depositor1,
                    {
                        requestId: BigNumber.from(1),
                        quantity: BigNumber.from(2),
                    },
                    { value: ethers.utils.parseEther('100') }
                )
            ).to.be.revertedWithCustomError(estateForger, 'InvalidDepositing');

            const privateSaleEndsAt = (await estateForger.getRequest(1)).agenda.privateSaleEndsAt;
            await time.setNextBlockTimestamp(privateSaleEndsAt - 1);

            await expect(
                getEstateForgerTx_Deposit(
                    estateForger,
                    depositor1,
                    {
                        requestId: BigNumber.from(1),
                        quantity: BigNumber.from(2),
                    },
                    { value: ethers.utils.parseEther('100') }
                )
            ).to.be.revertedWithCustomError(estateForger, 'InvalidDepositing');
        });

        it('2.2.15.12. Deposit tokenization unsuccessfully after public sale ended', async () => {
            const fixture = await beforeEstateForgerTest({
                addSampleRequests: true,
                whitelistDepositors: true,
                whitelistDepositorsForRequests: true,
            });
            const { estateForger, depositor1 } = fixture;

            const publicSaleEndsAt1 = (await estateForger.getRequest(1)).agenda.publicSaleEndsAt;
            await time.setNextBlockTimestamp(publicSaleEndsAt1);

            await expect(
                getEstateForgerTx_Deposit(
                    estateForger,
                    depositor1,
                    {
                        requestId: BigNumber.from(1),
                        quantity: BigNumber.from(2),
                    },
                    { value: ethers.utils.parseEther('100') }
                )
            ).to.be.revertedWithCustomError(estateForger, 'InvalidDepositing');

            await callTransaction(
                getEstateForgerTx_Deposit(
                    estateForger,
                    depositor1,
                    {
                        requestId: BigNumber.from(2),
                        quantity: BigNumber.from(100),
                    },
                    { value: ethers.utils.parseEther('100') }
                )
            );

            const publicSaleEndsAt2 = (await estateForger.getRequest(2)).agenda.publicSaleEndsAt;
            await time.setNextBlockTimestamp(publicSaleEndsAt2);

            await expect(
                getEstateForgerTx_Deposit(
                    estateForger,
                    depositor1,
                    {
                        requestId: BigNumber.from(1),
                        quantity: BigNumber.from(2),
                    },
                    { value: ethers.utils.parseEther('100') }
                )
            ).to.be.revertedWithCustomError(estateForger, 'InvalidDepositing');

            await expect(
                getEstateForgerTx_Deposit(
                    estateForger,
                    depositor1,
                    {
                        requestId: BigNumber.from(2),
                        quantity: BigNumber.from(100),
                    },
                    { value: ethers.utils.parseEther('100') }
                )
            ).to.be.revertedWithCustomError(estateForger, 'InvalidDepositing');
        });

        it('2.2.15.13. Deposit tokenization unsuccessfully with max selling amount exceeded', async () => {
            const fixture = await beforeEstateForgerTest({
                addSampleRequests: true,
                whitelistDepositors: true,
                whitelistDepositorsForRequests: true,
            });
            const { estateForger, depositor1, depositor2 } = fixture;

            let saleStartsAt = Math.max(
                (await estateForger.getRequest(1)).agenda.saleStartsAt,
                (await estateForger.getRequest(2)).agenda.saleStartsAt
            );
            await time.setNextBlockTimestamp(saleStartsAt);

            await callTransaction(
                getEstateForgerTx_Deposit(
                    estateForger,
                    depositor1,
                    {
                        requestId: BigNumber.from(1),
                        quantity: BigNumber.from(10),
                    },
                    { value: ethers.utils.parseEther('100') }
                )
            );
            await callTransaction(
                getEstateForgerTx_Deposit(
                    estateForger,
                    depositor2,
                    {
                        requestId: BigNumber.from(2),
                        quantity: BigNumber.from(100),
                    },
                    { value: ethers.utils.parseEther('100') }
                )
            );

            await expect(
                getEstateForgerTx_Deposit(
                    estateForger,
                    depositor1,
                    {
                        requestId: BigNumber.from(1),
                        quantity: BigNumber.from(41),
                    },
                    { value: ethers.utils.parseEther('100') }
                )
            ).to.be.revertedWithCustomError(estateForger, 'MaxSellingQuantityExceeded');

            await expect(
                getEstateForgerTx_Deposit(
                    estateForger,
                    depositor1,
                    {
                        requestId: BigNumber.from(2),
                        quantity: BigNumber.from(901),
                    },
                    { value: ethers.utils.parseEther('100') }
                )
            ).to.be.revertedWithCustomError(estateForger, 'MaxSellingQuantityExceeded');
        });

        it('2.2.15.14. Deposit tokenization request unsuccessfully with insufficient native token', async () => {
            const fixture = await beforeEstateForgerTest({
                whitelistDepositors: true,
                whitelistDepositorsForRequests: true,
                addSampleRequests: true,
            });
            const { estateForger, depositor1 } = fixture;

            let saleStartsAt = (await estateForger.getRequest(1)).agenda.saleStartsAt;
            await time.setNextBlockTimestamp(saleStartsAt);

            await expect(
                getEstateForgerTx_Deposit(estateForger, depositor1, {
                    requestId: BigNumber.from(1),
                    quantity: BigNumber.from(2),
                })
            ).to.be.reverted;
        });

        it('2.2.15.15. Deposit tokenization request unsuccessfully with insufficient ERC20 token allowance', async () => {
            const fixture = await beforeEstateForgerTest({
                skipFundERC20ForDepositors: true,
                whitelistDepositors: true,
                whitelistDepositorsForRequests: true,
                addSampleRequests: true,
            });
            const { estateForger, depositor1 } = fixture;

            let saleStartsAt = (await estateForger.getRequest(2)).agenda.saleStartsAt;
            await time.setNextBlockTimestamp(saleStartsAt);

            await expect(
                getEstateForgerTx_Deposit(
                    estateForger,
                    depositor1,
                    {
                        requestId: BigNumber.from(2),
                        quantity: BigNumber.from(100),
                    },
                    { value: ethers.utils.parseEther('100') }
                )
            ).to.be.revertedWith('ERC20: insufficient allowance');
        });

        it('2.2.15.16. Deposit tokenization request unsuccessfully when refunding failed', async () => {
            const fixture = await beforeEstateForgerTest({
                whitelistDepositors: true,
                whitelistDepositorsForRequests: true,
                addSampleRequests: true,
            });
            const { deployer, estateForger } = fixture;

            const failReceiver = await deployFailReceiver(deployer, true, false);

            const privateSaleEndsAt = (await estateForger.getRequest(1)).agenda.privateSaleEndsAt;
            await time.setNextBlockTimestamp(privateSaleEndsAt);

            await expect(
                getCallEstateForgerTx_Deposit(
                    estateForger,
                    failReceiver as any,
                    {
                        requestId: BigNumber.from(1),
                        quantity: BigNumber.from(2),
                    },
                    { value: ethers.utils.parseEther('100') }
                )
            ).to.be.revertedWithCustomError(estateForger, 'FailedRefund');
        });

        it('2.2.15.17. Deposit tokenization request unsuccessfully when the contract is reentered', async () => {
            const fixture = await beforeEstateForgerTest({
                addSampleRequests: true,
            });
            const { deployer, estateForger } = fixture;

            let reentrancy = await deployReentrancyReceiver(deployer, true, false);
            await callTransaction(
                reentrancy.updateReentrancyPlan(
                    estateForger.address,
                    estateForger.interface.encodeFunctionData('deposit', [1, 2])
                )
            );

            const privateSaleEndsAt = (await estateForger.getRequest(1)).agenda.privateSaleEndsAt;
            await time.setNextBlockTimestamp(privateSaleEndsAt);

            await testReentrancy_estateForger(estateForger, reentrancy, async () => {
                await expect(
                    getCallEstateForgerTx_Deposit(
                        estateForger,
                        reentrancy as any,
                        {
                            requestId: BigNumber.from(1),
                            quantity: BigNumber.from(2),
                        },
                        { value: ethers.utils.parseEther('100') }
                    )
                ).to.be.revertedWithCustomError(estateForger, 'FailedRefund');
            });
        });
    });

    describe('2.2.16. safeDeposit(uint256,uint256,bytes32)', async () => {
        it('2.2.16.1. Deposit tokenization successfully and correctly refund native currency', async () => {
            const fixture = await beforeEstateForgerTest({
                addSampleRequests: true,
                whitelistDepositors: true,
                whitelistDepositorsForRequests: true,
            });
            const { estateForger, depositor1 } = fixture;

            // During the private sale
            const initBalance1 = await ethers.provider.getBalance(depositor1.address);

            const params: DepositParams = {
                requestId: BigNumber.from(1),
                quantity: BigNumber.from(2),
            };
            let value1 = (await estateForger.getRequest(params.requestId)).quote.unitPrice.mul(params.quantity);

            let saleStartsAt = (await estateForger.getRequest(params.requestId)).agenda.saleStartsAt;
            await time.setNextBlockTimestamp(saleStartsAt);

            let tx = await getEstateForgerTxByParams_SafeDeposit(estateForger, depositor1, params, {
                value: value1.mul(10),
            });
            await tx.wait();

            await expect(tx)
                .to.emit(estateForger, 'Deposit')
                .withArgs(params.requestId, depositor1.address, params.quantity, value1);

            let receipt = await tx.wait();

            expect(await ethers.provider.getBalance(depositor1.address)).to.equal(
                initBalance1.sub(receipt.effectiveGasPrice.mul(receipt.gasUsed)).sub(value1)
            );
            expect(await ethers.provider.getBalance(estateForger.address)).to.equal(value1);

            let tokenizationRequest = await estateForger.getRequest(params.requestId);
            expect(tokenizationRequest.quota.soldQuantity).to.equal(params.quantity);
            expect(await estateForger.deposits(params.requestId, depositor1.address)).to.equal(params.quantity);
        });

        it('2.2.16.2. Deposit tokenization unsuccessfully with invalid request id', async () => {
            const fixture = await beforeEstateForgerTest({
                addSampleRequests: true,
                whitelistDepositors: true,
            });
            const { estateForger, depositor1 } = fixture;

            const params1: DepositParams = {
                requestId: BigNumber.from(0),
                quantity: BigNumber.from(2),
            };
            await expect(
                getEstateForgerTxByParams_SafeDeposit(estateForger, depositor1, params1, {
                    value: ethers.utils.parseEther('100'),
                })
            ).to.be.revertedWithCustomError(estateForger, 'InvalidRequestId');

            const params2: DepositParams = {
                requestId: BigNumber.from(100),
                quantity: BigNumber.from(2),
            };
            await expect(
                getEstateForgerTxByParams_SafeDeposit(estateForger, depositor1, params2, {
                    value: ethers.utils.parseEther('100'),
                })
            ).to.be.revertedWithCustomError(estateForger, 'InvalidRequestId');
        });

        it('2.2.16.3. Deposit tokenization unsuccessfully with invalid anchor', async () => {
            const fixture = await beforeEstateForgerTest({
                addSampleRequests: true,
                whitelistDepositors: true,
            });
            const { estateForger, depositor1 } = fixture;

            await expect(
                getEstateForgerTx_SafeDeposit(
                    estateForger,
                    depositor1,
                    {
                        requestId: BigNumber.from(1),
                        quantity: BigNumber.from(2),
                        anchor: ethers.utils.solidityKeccak256(['string'], ['invalid anchor']),
                    },
                    { value: ethers.utils.parseEther('100') }
                )
            ).to.be.revertedWithCustomError(estateForger, 'BadAnchor');

            await expect(
                getEstateForgerTx_SafeDeposit(
                    estateForger,
                    depositor1,
                    {
                        requestId: BigNumber.from(2),
                        quantity: BigNumber.from(2),
                        anchor: ethers.utils.solidityKeccak256(['string'], ['invalid anchor']),
                    },
                    { value: ethers.utils.parseEther('100') }
                )
            ).to.be.revertedWithCustomError(estateForger, 'BadAnchor');
        });

        it('2.2.16.4. Deposit tokenization unsuccessfully when paused', async () => {
            const fixture = await beforeEstateForgerTest({
                addSampleRequests: true,
                whitelistDepositors: true,
                whitelistDepositorsForRequests: true,
                pause: true,
            });
            const { estateForger, depositor1 } = fixture;

            await expect(
                getEstateForgerTxByParams_SafeDeposit(
                    estateForger,
                    depositor1,
                    {
                        requestId: BigNumber.from(1),
                        quantity: BigNumber.from(2),
                    },
                    { value: ethers.utils.parseEther('100') }
                )
            ).to.be.revertedWith('Pausable: paused');
        });
    });

    describe('2.2.17. safeConfirm(uint256,bytes32)', async () => {
        async function testConfirmTokenization(
            currentRequestId: number,
            fixture: EstateForgerFixture,
            feeDenomination: BigNumber,
            exclusiveRate: BigNumber,
            currency: Currency | null,
            isERC20: boolean,
            isExclusive: boolean,
            minSellingQuantity: BigNumber,
            maxSellingQuantity: BigNumber,
            totalSupply: BigNumber,
            unitPrice: BigNumber,
            cashbackThreshold: BigNumber,
            cashbackBaseRate: BigNumber,
            cashbackCurrencies: string[],
            cashbackDenominations: BigNumber[],
            deposits: any[],
            broker: any,
            brokerCommissionRate: BigNumber
        ) {
            const {
                deployer,
                admin,
                admins,
                zone1,
                manager,
                estateForger,
                currencies: _currencies,
                custodian1,
                estateToken,
                feeReceiver,
                commissionToken,
                priceWatcher,
                reserveVault,
                validator,
            } = fixture;
            const decimals = Constant.ESTATE_TOKEN_TOKEN_DECIMALS;
            const currencies = _currencies.slice();

            let timestamp = (await time.latest()) + 1000;

            const zone = zone1;
            const custodian = custodian1;

            let newCurrency: Currency | undefined;
            let newCurrencyAddress: string;

            if (currency) {
                newCurrency = currency;
                newCurrencyAddress = currency.address;
            } else {
                if (isERC20) {
                    newCurrency = (await deployCurrency(
                        deployer.address,
                        `NewMockCurrency_${currentRequestId}`,
                        `NMC_${currentRequestId}`
                    )) as Currency;
                    await callTransaction(
                        newCurrency.setExclusiveDiscount(exclusiveRate, Constant.COMMON_RATE_DECIMALS)
                    );
                    currencies.push(newCurrency);
                    newCurrencyAddress = newCurrency.address;
                } else {
                    newCurrencyAddress = ethers.constants.AddressZero;
                }
            }

            const currentEstateId = currentRequestId;

            const allCashbackCurrencies = [newCurrencyAddress, ...cashbackCurrencies];

            await callTransaction(
                getAdminTxByInput_UpdateCurrencyRegistries(
                    admin,
                    deployer,
                    {
                        currencies: allCashbackCurrencies,
                        isAvailable: [true, ...cashbackCurrencies.map((_) => true)],
                        isExclusive: [isExclusive, ...cashbackCurrencies.map((_) => false)],
                    },
                    admins
                )
            );

            await callTransaction(
                getPriceWatcherTxByInput_UpdateDefaultRates(
                    priceWatcher,
                    deployer,
                    {
                        currencies: [newCurrencyAddress],
                        rates: [{ value: BigNumber.from(100), decimals: 0 }],
                    },
                    admin,
                    admins
                )
            );

            await callTransaction(
                getCommissionTokenTx_RegisterBroker(commissionToken as any, manager, {
                    zone: zone,
                    broker: broker.address,
                    commissionRate: brokerCommissionRate,
                })
            );

            await time.setNextBlockTimestamp(timestamp);

            const requestParams = {
                requester: custodian.address,
                estate: {
                    zone: zone,
                    uri: `Token_${currentRequestId}`,
                    expireAt: timestamp + 1e9,
                },
                quota: {
                    totalQuantity: totalSupply,
                    minSellingQuantity: minSellingQuantity,
                    maxSellingQuantity: maxSellingQuantity,
                },
                quote: {
                    currency: newCurrencyAddress,
                    unitPrice: unitPrice,
                    cashbackThreshold: cashbackThreshold,
                    cashbackBaseRate: cashbackBaseRate,
                    cashbackCurrencies: cashbackCurrencies,
                    cashbackDenominations: cashbackDenominations,
                    feeDenomination: feeDenomination,
                    broker: broker.address,
                },
                agenda: {
                    saleStartsAt: timestamp + 10,
                    privateSaleDuration: 20 * DAY,
                    publicSaleDuration: 40 * DAY,
                },
            };

            await callTransaction(
                getEstateForgerTxByInput_RequestTokenization(estateForger, manager, requestParams, validator)
            );

            timestamp += 10 + 20 * DAY;
            await time.setNextBlockTimestamp(timestamp);

            for (const record of deposits) {
                const value = record.depositedValue.mul(unitPrice);
                let ethValue = ethers.BigNumber.from(0);
                await prepareNativeToken(ethers.provider, deployer, [record.depositor], ethers.utils.parseEther('1.0'));
                if (isERC20) {
                    await prepareERC20(newCurrency!, [record.depositor], [estateForger], value);
                } else {
                    ethValue = value;
                    await prepareNativeToken(ethers.provider, deployer, [record.depositor], value);
                }

                await callTransaction(
                    estateForger.connect(record.depositor).deposit(currentRequestId, record.depositedValue, {
                        value: ethValue,
                    })
                );
            }

            const walletToReset = [custodian, feeReceiver, broker];

            if (isERC20) {
                await resetERC20(newCurrency!, walletToReset);
            } else {
                await resetNativeToken(ethers.provider, walletToReset);
            }

            let cashbackBaseAmount = ethers.BigNumber.from(0);
            let confirmValue = ethers.utils.parseEther('1');

            const fundId = (await estateForger.getRequest(currentRequestId)).quote.cashbackFundId;

            const expectedVaultReceives = new Map<string, BigNumber>();
            const expectedManagerSends = new Map<string, BigNumber>();

            if (!fundId.eq(ethers.constants.Zero)) {
                const fund = await reserveVault.getFund(fundId);

                cashbackBaseAmount = fund.mainDenomination.mul(fund.quantity);

                expectedVaultReceives.set(fund.mainCurrency, cashbackBaseAmount);
                for (let i = 0; i < fund.extraCurrencies.length; ++i) {
                    const current = expectedVaultReceives.get(fund.extraCurrencies[i]) || ethers.BigNumber.from(0);
                    expectedVaultReceives.set(
                        fund.extraCurrencies[i],
                        current.add(fund.extraDenominations[i].mul(fund.quantity))
                    );
                }

                for (let i = 0; i < fund.extraCurrencies.length; ++i) {
                    const current = expectedManagerSends.get(fund.extraCurrencies[i]) || ethers.BigNumber.from(0);
                    expectedManagerSends.set(
                        fund.extraCurrencies[i],
                        current.add(fund.extraDenominations[i].mul(fund.quantity))
                    );
                }
                for (let i = 0; i < allCashbackCurrencies.length; ++i) {
                    const currencyAddress = allCashbackCurrencies[i];
                    const currencyContract = currencies.find((c) => c.address === currencyAddress);
                    if (currencyContract) {
                        await prepareERC20(
                            currencyContract,
                            [manager],
                            [estateForger],
                            expectedManagerSends.get(currencyAddress) || ethers.BigNumber.from(0)
                        );
                    } else {
                        confirmValue = confirmValue.add(
                            expectedManagerSends.get(currencyAddress) || ethers.BigNumber.from(0)
                        );
                    }
                }
            }

            await prepareNativeToken(ethers.provider, deployer, [manager], confirmValue);

            const initManagerBalances = new Map<string, BigNumber>();
            const initVaultBalances = new Map<string, BigNumber>();
            const initEstateForgerBalances = new Map<string, BigNumber>();

            for (let i = 0; i < allCashbackCurrencies.length; ++i) {
                const currencyAddress = allCashbackCurrencies[i];
                const currencyContract = currencies.find((c) => c.address === currencyAddress) || null;
                initManagerBalances.set(
                    currencyAddress,
                    await getBalance(ethers.provider, manager.address, currencyContract)
                );
                initVaultBalances.set(
                    currencyAddress,
                    await getBalance(ethers.provider, reserveVault.address, currencyContract)
                );
                initEstateForgerBalances.set(
                    currencyAddress,
                    await getBalance(ethers.provider, estateForger.address, currencyContract)
                );
            }

            timestamp += 100;
            await time.setNextBlockTimestamp(timestamp);

            const confirmParams: ConfirmParams = {
                requestId: BigNumber.from(currentRequestId),
            };
            const tx = await getEstateForgerTxByParams_SafeConfirm(estateForger, manager, confirmParams, {
                value: confirmValue,
            });
            const receipt = await tx.wait();
            const gasFee = receipt.gasUsed.mul(receipt.effectiveGasPrice);

            const request = await estateForger.getRequest(currentRequestId);
            expect(request.estate.estateId).to.equal(currentEstateId);

            const soldQuantity = request.quota.soldQuantity;

            let value = ethers.BigNumber.from(soldQuantity).mul(unitPrice);
            let fee = ethers.BigNumber.from(soldQuantity).mul(request.quote.feeDenomination);
            let commissionAmount = ethers.BigNumber.from(soldQuantity).mul(request.quote.commissionDenomination);

            await expect(tx)
                .to.emit(estateForger, 'CommissionDispatch')
                .withArgs(broker.address, commissionAmount, request.quote.currency);

            await expect(tx)
                .to.emit(estateForger, 'RequestConfirmation')
                .withArgs(currentRequestId, currentEstateId, soldQuantity, value, fee, cashbackBaseAmount);

            const requestAfter = await estateForger.getRequest(currentRequestId);
            expect(requestAfter.agenda.publicSaleEndsAt).to.equal(timestamp);
            expect(requestAfter.agenda.confirmAt).to.equal(timestamp);

            if (!fundId.eq(ethers.constants.Zero)) {
                const fundAfter = await reserveVault.getFund(fundId);
                expect(fundAfter.isSufficient).to.equal(true);
            }

            expect(estateToken.tokenizeEstate).to.have.been.calledWith(
                request.quota.totalQuantity.mul(ethers.BigNumber.from(10).pow(decimals)),
                request.estate.zone,
                currentRequestId,
                request.estate.uri,
                request.estate.expireAt,
                custodian.address,
                request.quote.broker
            );

            for (let i = 0; i < allCashbackCurrencies.length; ++i) {
                const currencyAddress = allCashbackCurrencies[i];
                const currencyContract = currencies.find((c) => c.address === currencyAddress) || null;

                const vaultReceives = expectedVaultReceives.get(currencyAddress) || ethers.BigNumber.from(0);
                expect(await getBalance(ethers.provider, reserveVault.address, currencyContract)).to.equal(
                    initVaultBalances.get(currencyAddress)!.add(vaultReceives)
                );

                let managerSends = expectedManagerSends.get(currencyAddress) || ethers.BigNumber.from(0);
                if (currencyAddress == ethers.constants.AddressZero) {
                    managerSends = managerSends.add(gasFee);
                }
                expect(await getBalance(ethers.provider, manager.address, currencyContract)).to.equal(
                    initManagerBalances.get(currencyAddress)!.sub(managerSends)
                );

                let valueInCurrency = currencyAddress == request.quote.currency ? value : ethers.BigNumber.from(0);
                expect(await getBalance(ethers.provider, estateForger.address, currencyContract)).to.equal(
                    initEstateForgerBalances.get(currencyAddress)!.sub(valueInCurrency)
                );
            }

            if (isERC20) {
                expect(await newCurrency!.balanceOf(custodian.address)).to.equal(value.sub(fee));
                expect(await newCurrency!.balanceOf(feeReceiver.address)).to.equal(
                    fee.sub(commissionAmount).sub(cashbackBaseAmount)
                );
                expect(await newCurrency!.balanceOf(broker.address)).to.equal(commissionAmount);
            } else {
                expect(await ethers.provider.getBalance(custodian.address)).to.equal(value.sub(fee));
                expect(await ethers.provider.getBalance(feeReceiver.address)).to.equal(
                    fee.sub(commissionAmount).sub(cashbackBaseAmount)
                );
                expect(await ethers.provider.getBalance(broker.address)).to.equal(commissionAmount);
            }

            expect(await estateToken.balanceOf(custodian.address, currentEstateId)).to.equal(
                totalSupply.sub(soldQuantity).mul(ethers.BigNumber.from(10).pow(decimals))
            );
            expect(await estateToken.balanceOf(estateForger.address, currentEstateId)).to.equal(
                soldQuantity.mul(ethers.BigNumber.from(10).pow(decimals))
            );

            expect(await commissionToken.ownerOf(currentEstateId)).to.equal(broker.address);
        }

        it('2.2.17.1. Confirm tokenization successfully (small test)', async () => {
            const fixture = await beforeEstateForgerTest({
                skipRegisterBrokers: true,
                skipListSampleCurrencies: true,
                skipFundERC20ForDepositors: true,
                skipFundERC20ForManagers: true,
            });
            const {
                deployer,
                admins,
                depositor1,
                depositor2,
                depositor3,
                broker1,
                broker2,
                currencies,
                admin,
                estateForger,
            } = fixture;

            await callTransaction(
                getEstateForgerTxByInput_UpdateBaseUnitPriceRange(
                    estateForger,
                    deployer,
                    {
                        baseMinUnitPrice: ethers.BigNumber.from(0),
                        baseMaxUnitPrice: ethers.constants.MaxUint256,
                    },
                    admin,
                    admins
                )
            );

            // Native token as the main currency, ERC20 as an extra currency
            await testConfirmTokenization(
                1,
                fixture,
                ethers.utils.parseEther('0.02'),
                ethers.utils.parseEther('0.3'),
                null,
                false,
                false,
                ethers.BigNumber.from(10),
                ethers.BigNumber.from(30),
                ethers.BigNumber.from(70),
                ethers.utils.parseEther('0.2'),
                ethers.BigNumber.from(5),
                ethers.utils.parseEther('0.001'),
                [currencies[0].address, currencies[1].address],
                [ethers.utils.parseEther('0.01'), ethers.utils.parseEther('0.02')],
                [
                    {
                        depositor: depositor1,
                        depositedValue: ethers.BigNumber.from(1),
                    },
                    {
                        depositor: depositor2,
                        depositedValue: ethers.BigNumber.from(2),
                    },
                    {
                        depositor: depositor2,
                        depositedValue: ethers.BigNumber.from(4),
                    },
                    {
                        depositor: depositor3,
                        depositedValue: ethers.BigNumber.from(8),
                    },
                ],
                broker1,
                ethers.utils.parseEther('0.1')
            );

            // ERC20 as the main currency, native token as an extra currency
            await testConfirmTokenization(
                2,
                fixture,
                ethers.utils.parseEther('0.002'),
                ethers.utils.parseEther('0.3'),
                currencies[1],
                true,
                true,
                ethers.BigNumber.from(200),
                ethers.BigNumber.from(1000),
                ethers.BigNumber.from(1000),
                ethers.utils.parseEther('0.02'),
                ethers.BigNumber.from(50),
                ethers.utils.parseEther('0.00001'),
                [currencies[1].address, ethers.constants.AddressZero],
                [ethers.utils.parseEther('0.01'), ethers.utils.parseEther('0.02')],
                [
                    {
                        depositor: depositor1,
                        depositedValue: ethers.BigNumber.from(1000),
                    },
                ],
                broker2,
                ethers.utils.parseEther('0.2')
            );
        });

        it('2.2.17.2. Confirm tokenization successfully with duplicated currency', async () => {
            const fixture = await beforeEstateForgerTest({
                skipRegisterBrokers: true,
                skipListSampleCurrencies: true,
                skipFundERC20ForDepositors: true,
                skipFundERC20ForManagers: true,
            });
            const {
                deployer,
                admins,
                depositor1,
                depositor2,
                depositor3,
                currencies,
                broker1,
                broker2,
                admin,
                estateForger,
            } = fixture;

            await callTransaction(
                getEstateForgerTxByInput_UpdateBaseUnitPriceRange(
                    estateForger,
                    deployer,
                    {
                        baseMinUnitPrice: ethers.BigNumber.from(0),
                        baseMaxUnitPrice: ethers.constants.MaxUint256,
                    },
                    admin,
                    admins
                )
            );

            // Native token as the main currency and as an extra currency
            await testConfirmTokenization(
                1,
                fixture,
                ethers.utils.parseEther('0.02'),
                ethers.utils.parseEther('0.3'),
                null,
                false,
                false,
                ethers.BigNumber.from(10),
                ethers.BigNumber.from(30),
                ethers.BigNumber.from(70),
                ethers.utils.parseEther('0.2'),
                ethers.BigNumber.from(5),
                ethers.utils.parseEther('0.001'),
                [currencies[0].address, ethers.constants.AddressZero],
                [ethers.utils.parseEther('0.01'), ethers.utils.parseEther('0.02')],
                [
                    {
                        depositor: depositor1,
                        depositedValue: ethers.BigNumber.from(1),
                    },
                    {
                        depositor: depositor2,
                        depositedValue: ethers.BigNumber.from(2),
                    },
                    {
                        depositor: depositor2,
                        depositedValue: ethers.BigNumber.from(4),
                    },
                    {
                        depositor: depositor3,
                        depositedValue: ethers.BigNumber.from(8),
                    },
                ],
                broker1,
                ethers.utils.parseEther('0.1')
            );

            // ERC20 as the main currency and as an extra currency
            await testConfirmTokenization(
                2,
                fixture,
                ethers.utils.parseEther('0.006'),
                ethers.utils.parseEther('0.3'),
                currencies[0],
                true,
                true,
                ethers.BigNumber.from(200),
                ethers.BigNumber.from(1000),
                ethers.BigNumber.from(1000),
                ethers.utils.parseEther('0.02'),
                ethers.BigNumber.from(50),
                ethers.utils.parseEther('0.00001'),
                [ethers.constants.AddressZero, currencies[0].address],
                [ethers.utils.parseEther('0.01'), ethers.utils.parseEther('0.02')],
                [
                    {
                        depositor: fixture.depositor1,
                        depositedValue: ethers.BigNumber.from(1000),
                    },
                ],
                broker2,
                ethers.utils.parseEther('0.2')
            );
        });

        it('2.2.17.3. Confirm tokenization successfully with no cashback currency', async () => {
            const fixture = await beforeEstateForgerTest({
                skipRegisterBrokers: true,
                skipListSampleCurrencies: true,
                skipFundERC20ForDepositors: true,
                skipFundERC20ForManagers: true,
            });
            const {
                deployer,
                admins,
                depositor1,
                depositor2,
                depositor3,
                currencies,
                broker1,
                broker2,
                admin,
                estateForger,
            } = fixture;

            await callTransaction(
                getEstateForgerTxByInput_UpdateBaseUnitPriceRange(
                    estateForger,
                    deployer,
                    {
                        baseMinUnitPrice: ethers.BigNumber.from(0),
                        baseMaxUnitPrice: ethers.constants.MaxUint256,
                    },
                    admin,
                    admins
                )
            );

            // Native token as the main currency
            await testConfirmTokenization(
                1,
                fixture,
                ethers.utils.parseEther('0.02'),
                ethers.utils.parseEther('0.3'),
                null,
                false,
                false,
                ethers.BigNumber.from(10),
                ethers.BigNumber.from(30),
                ethers.BigNumber.from(70),
                ethers.utils.parseEther('0.2'),
                ethers.BigNumber.from(0),
                ethers.utils.parseEther('0'),
                [],
                [],
                [
                    {
                        depositor: depositor1,
                        depositedValue: ethers.BigNumber.from(1),
                    },
                    {
                        depositor: depositor2,
                        depositedValue: ethers.BigNumber.from(2),
                    },
                    {
                        depositor: depositor2,
                        depositedValue: ethers.BigNumber.from(4),
                    },
                    {
                        depositor: depositor3,
                        depositedValue: ethers.BigNumber.from(8),
                    },
                ],
                broker1,
                ethers.utils.parseEther('0.1')
            );

            // ERC20 as the main currency, native token as an extra currency
            await testConfirmTokenization(
                2,
                fixture,
                ethers.utils.parseEther('0.006'),
                ethers.utils.parseEther('0.3'),
                currencies[0],
                true,
                true,
                ethers.BigNumber.from(200),
                ethers.BigNumber.from(1000),
                ethers.BigNumber.from(1000),
                ethers.utils.parseEther('0.02'),
                ethers.BigNumber.from(0),
                ethers.utils.parseEther('0'),
                [],
                [],
                [
                    {
                        depositor: fixture.depositor1,
                        depositedValue: ethers.BigNumber.from(1000),
                    },
                ],
                broker2,
                ethers.utils.parseEther('0.2')
            );
        });

        it('2.2.17.4. Confirm tokenization successfully with different native/erc20 and exclusive/non-exclusive combinations', async () => {
            const fixture = await beforeEstateForgerTest({
                skipRegisterBrokers: true,
                skipListSampleCurrencies: true,
                skipFundERC20ForDepositors: true,
                skipFundERC20ForManagers: true,
            });
            const { deployer, admins, depositor1, depositor2, depositor3, currencies, admin, estateForger } = fixture;

            await callTransaction(
                getEstateForgerTxByInput_UpdateBaseUnitPriceRange(
                    estateForger,
                    deployer,
                    {
                        baseMinUnitPrice: ethers.BigNumber.from(0),
                        baseMaxUnitPrice: ethers.constants.MaxUint256,
                    },
                    admin,
                    admins
                )
            );

            let currentRequestId = 0;
            for (const isERC20 of [false, true]) {
                for (const isExclusive of [false, true]) {
                    if (isExclusive && !isERC20) continue;
                    const broker = randomWallet();
                    await testConfirmTokenization(
                        ++currentRequestId,
                        fixture,
                        ethers.utils.parseEther('0.02'),
                        ethers.utils.parseEther('0.3'),
                        null,
                        isERC20,
                        isExclusive,
                        ethers.BigNumber.from(10),
                        ethers.BigNumber.from(30),
                        ethers.BigNumber.from(70),
                        ethers.utils.parseEther('0.1'),
                        ethers.BigNumber.from(5),
                        ethers.utils.parseEther('0.001'),
                        [currencies[1].address, ethers.constants.AddressZero],
                        [ethers.utils.parseEther('0.01'), ethers.utils.parseEther('0.02')],
                        [
                            {
                                depositor: depositor1,
                                depositedValue: ethers.BigNumber.from(1),
                            },
                            {
                                depositor: depositor2,
                                depositedValue: ethers.BigNumber.from(2),
                            },
                            {
                                depositor: depositor2,
                                depositedValue: ethers.BigNumber.from(4),
                            },
                            {
                                depositor: depositor3,
                                depositedValue: ethers.BigNumber.from(8),
                            },
                        ],
                        broker,
                        ethers.utils.parseEther('0.1')
                    );
                }
            }
        });

        it('2.2.17.5. Confirm tokenization successfully with very large deposition', async () => {
            const fixture = await beforeEstateForgerTest({
                skipRegisterBrokers: true,
                skipListSampleCurrencies: true,
                skipFundERC20ForDepositors: true,
                skipFundERC20ForManagers: true,
            });
            const { deployer, admins, depositor1, currencies, admin, estateForger } = fixture;

            await callTransaction(
                getEstateForgerTxByInput_UpdateBaseUnitPriceRange(
                    estateForger,
                    deployer,
                    {
                        baseMinUnitPrice: ethers.BigNumber.from(0),
                        baseMaxUnitPrice: ethers.constants.MaxUint256,
                    },
                    admin,
                    admins
                )
            );

            let currentRequestId = 0;
            for (const isERC20 of [false, true]) {
                for (const isExclusive of [false, true]) {
                    if (isExclusive && !isERC20) continue;

                    const broker = randomWallet();
                    await testConfirmTokenization(
                        ++currentRequestId,
                        fixture,
                        ethers.BigNumber.from(0),
                        ethers.utils.parseEther('0.9'),
                        null,
                        isERC20,
                        isExclusive,
                        ethers.BigNumber.from(2).pow(255).div(Constant.COMMON_RATE_MAX_FRACTION),
                        ethers.BigNumber.from(2).pow(256).sub(1).div(Constant.COMMON_RATE_MAX_FRACTION),
                        ethers.BigNumber.from(2).pow(256).sub(1).div(Constant.COMMON_RATE_MAX_FRACTION),
                        ethers.BigNumber.from(1),
                        ethers.BigNumber.from(1000),
                        ethers.utils.parseEther('0.99'),
                        [currencies[0].address, ethers.constants.AddressZero],
                        [ethers.utils.parseEther('0.01'), ethers.utils.parseEther('0.02')],
                        [
                            {
                                depositor: depositor1,
                                depositedValue: ethers.BigNumber.from(2)
                                    .pow(255)
                                    .div(Constant.COMMON_RATE_MAX_FRACTION),
                            },
                        ],
                        broker,
                        ethers.utils.parseEther('0.9')
                    );
                }
            }
        });

        it('2.2.17.6. Confirm tokenization successfully in 100 random test cases', async () => {
            const fixture = await beforeEstateForgerTest({
                skipRegisterBrokers: true,
                skipListSampleCurrencies: true,
                skipFundERC20ForDepositors: true,
                skipFundERC20ForManagers: true,
            });
            const { deployer, admins, depositor1, currencies, admin, estateForger } = fixture;

            await callTransaction(
                getEstateForgerTxByInput_UpdateBaseUnitPriceRange(
                    estateForger,
                    deployer,
                    {
                        baseMinUnitPrice: ethers.BigNumber.from(0),
                        baseMaxUnitPrice: ethers.constants.MaxUint256,
                    },
                    admin,
                    admins
                )
            );

            let currentRequestId = 0;
            for (let testcase = 0; testcase < 100; testcase++) {
                const isERC20 = Math.random() < 0.5;
                const isExclusive = Math.random() < 0.5;
                if (isExclusive && !isERC20) {
                    --testcase;
                    continue;
                }

                const feeRate = randomBigNumber(ethers.BigNumber.from(0), Constant.COMMON_RATE_MAX_FRACTION);
                const exclusiveRate = randomBigNumber(ethers.BigNumber.from(0), Constant.COMMON_RATE_MAX_FRACTION);
                const commissionRate = randomBigNumber(ethers.BigNumber.from(0), Constant.COMMON_RATE_MAX_FRACTION);
                const decimals = Constant.ESTATE_TOKEN_TOKEN_DECIMALS;

                const randomNums = [];
                for (let i = 0; i < 3; ++i) {
                    const maxSupply = ethers.BigNumber.from(2)
                        .pow(256)
                        .sub(1)
                        .div(ethers.BigNumber.from(10).pow(decimals))
                        .div(Constant.COMMON_RATE_MAX_FRACTION);
                    randomNums.push(ethers.BigNumber.from(ethers.utils.randomBytes(32)).mod(maxSupply).add(1));
                }
                randomNums.sort((a, b) => (a.sub(b).lt(0) ? -1 : 1));

                const minSellingAmount = randomNums[0];
                const maxSellingAmount = randomNums[1];
                const totalSupply = randomNums[2];

                const unitPrice = randomBigNumber(
                    ethers.BigNumber.from(1),
                    ethers.BigNumber.from(2).pow(256).sub(1).div(Constant.COMMON_RATE_MAX_FRACTION).div(totalSupply)
                );
                const deposits = [
                    {
                        depositor: depositor1,
                        depositedValue: randomBigNumber(minSellingAmount, maxSellingAmount),
                    },
                ];

                const broker = randomWallet();

                await testConfirmTokenization(
                    ++currentRequestId,
                    fixture,
                    unitPrice.mul(feeRate).div(Constant.COMMON_RATE_MAX_FRACTION),
                    exclusiveRate,
                    null,
                    isERC20,
                    isExclusive,
                    minSellingAmount,
                    maxSellingAmount,
                    totalSupply,
                    unitPrice,
                    ethers.BigNumber.from(1000),
                    ethers.utils.parseEther('0.001'),
                    [currencies[0].address, currencies[1].address, ethers.constants.AddressZero],
                    [ethers.utils.parseEther('0.01'), ethers.utils.parseEther('0.02'), ethers.utils.parseEther('0.04')],
                    deposits,
                    broker,
                    commissionRate
                );
            }
        });

        it('2.2.17.7. Confirm tokenization unsuccessfully with invalid anchor', async () => {
            const fixture = await beforeEstateForgerTest({
                addSampleRequests: true,
                addDepositions: true,
            });
            const { estateForger, manager } = fixture;

            await expect(
                getEstateForgerTx_SafeConfirm(estateForger, manager, {
                    requestId: BigNumber.from(1),
                    anchor: ethers.utils.keccak256(ethers.utils.toUtf8Bytes('invalid anchor')),
                })
            ).to.be.revertedWithCustomError(estateForger, 'BadAnchor');
        });

        it('2.2.17.8. Confirm tokenization unsuccessfully by unauthorized account', async () => {
            const fixture = await beforeEstateForgerTest({
                addSampleRequests: true,
                addDepositions: true,
            });

            const { deployer, admins, user, moderator, currencies, admin, estateForger } = fixture;

            const zone1 = (await estateForger.getRequest(1)).estate.zone;
            await callTransaction(
                getAdminTxByInput_ActivateIn(
                    admin,
                    deployer,
                    {
                        zone: zone1,
                        accounts: [user.address],
                        isActive: true,
                    },
                    admins
                )
            );

            for (const currency of currencies) {
                await prepareERC20(currency, [user, moderator], [estateForger], ethers.utils.parseEther(String(1e9)));
            }

            const params1: ConfirmParams = {
                requestId: BigNumber.from(1),
            };
            await expect(
                getEstateForgerTxByParams_SafeConfirm(estateForger, user, params1, {
                    value: ethers.utils.parseEther('1000'),
                })
            ).to.be.revertedWithCustomError(estateForger, 'Unauthorized');

            const params2: ConfirmParams = {
                requestId: BigNumber.from(2),
            };
            await expect(
                getEstateForgerTxByParams_SafeConfirm(estateForger, moderator, params2, {
                    value: ethers.utils.parseEther('1000'),
                })
            ).to.be.revertedWithCustomError(estateForger, 'Unauthorized');
        });

        it('2.2.17.9. Confirm tokenization unsuccessfully with invalid request id', async () => {
            const fixture = await beforeEstateForgerTest({
                addSampleRequests: true,
                addDepositions: true,
            });
            const { estateForger, manager } = fixture;

            const params1: ConfirmParams = {
                requestId: BigNumber.from(0),
            };
            await expect(
                getEstateForgerTxByParams_SafeConfirm(estateForger, manager, params1, {
                    value: ethers.utils.parseEther('1000'),
                })
            ).to.be.revertedWithCustomError(estateForger, 'InvalidRequestId');

            const params2: ConfirmParams = {
                requestId: BigNumber.from(100),
            };
            await expect(
                getEstateForgerTxByParams_SafeConfirm(estateForger, manager, params2, {
                    value: ethers.utils.parseEther('1000'),
                })
            ).to.be.revertedWithCustomError(estateForger, 'InvalidRequestId');
        });

        it('2.2.17.10. Confirm tokenization unsuccessfully with invalid anchor', async () => {
            const fixture = await beforeEstateForgerTest({
                addSampleRequests: true,
                addDepositions: true,
            });
            const { estateForger, manager } = fixture;

            await expect(
                getEstateForgerTx_SafeConfirm(
                    estateForger,
                    manager,
                    {
                        requestId: BigNumber.from(1),
                        anchor: ethers.utils.keccak256(ethers.utils.toUtf8Bytes('invalid anchor')),
                    },
                    { value: ethers.utils.parseEther('1000') }
                )
            ).to.be.revertedWithCustomError(estateForger, 'BadAnchor');
        });

        it('2.2.17.11. Confirm tokenization unsuccessfully when paused', async () => {
            const fixture = await beforeEstateForgerTest({
                addSampleRequests: true,
                addDepositions: true,
                pause: true,
            });
            const { estateForger, manager } = fixture;

            const params1: ConfirmParams = {
                requestId: BigNumber.from(1),
            };
            await expect(
                getEstateForgerTxByParams_SafeConfirm(estateForger, manager, params1, {
                    value: ethers.utils.parseEther('1000'),
                })
            ).to.be.revertedWith('Pausable: paused');

            const params2: ConfirmParams = {
                requestId: BigNumber.from(2),
            };
            await expect(
                getEstateForgerTxByParams_SafeConfirm(estateForger, manager, params2, {
                    value: ethers.utils.parseEther('1000'),
                })
            ).to.be.revertedWith('Pausable: paused');
        });

        it('2.2.17.12. Confirm tokenization unsuccessfully with inactive manager in zone', async () => {
            const fixture = await beforeEstateForgerTest({
                addSampleRequests: true,
                addDepositions: true,
            });
            const { deployer, manager, admin, admins, estateForger } = fixture;

            const zone = (await estateForger.getRequest(1)).estate.zone;
            await callTransaction(
                getAdminTxByInput_ActivateIn(
                    admin,
                    deployer,
                    {
                        zone,
                        accounts: [manager.address],
                        isActive: false,
                    },
                    admins
                )
            );

            const params1: ConfirmParams = {
                requestId: BigNumber.from(1),
            };
            await expect(
                getEstateForgerTxByParams_SafeConfirm(estateForger, manager, params1, {
                    value: ethers.utils.parseEther('1000'),
                })
            ).to.be.revertedWithCustomError(estateForger, 'Unauthorized');
        });

        it('2.2.17.13. Confirm tokenization unsuccessfully when confirm before sale starts', async () => {
            const fixture = await beforeEstateForgerTest({
                addSampleRequests: true,
            });
            const { estateForger, manager } = fixture;

            const params1: ConfirmParams = {
                requestId: BigNumber.from(1),
            };
            await expect(
                getEstateForgerTxByParams_SafeConfirm(estateForger, manager, params1, {
                    value: ethers.utils.parseEther('1000'),
                })
            ).to.be.revertedWithCustomError(estateForger, 'InvalidConfirming');
        });

        it('2.2.17.14. Confirm tokenization unsuccessfully with cancelled request id', async () => {
            const fixture = await beforeEstateForgerTest({
                addSampleRequests: true,
            });
            const { estateForger, manager } = fixture;

            await callTransaction(
                getEstateForgerTx_Cancel(estateForger, manager, {
                    requestId: BigNumber.from(1),
                })
            );
            await callTransaction(
                getEstateForgerTx_Cancel(estateForger, manager, {
                    requestId: BigNumber.from(2),
                })
            );

            const saleStartsAt1 = (await estateForger.getRequest(1)).agenda.saleStartsAt;
            await time.setNextBlockTimestamp(saleStartsAt1);

            const params1: ConfirmParams = {
                requestId: BigNumber.from(1),
            };
            await expect(
                getEstateForgerTxByParams_SafeConfirm(estateForger, manager, params1, {
                    value: ethers.utils.parseEther('1000'),
                })
            ).to.be.revertedWithCustomError(estateForger, 'AlreadyCancelled');

            const saleStartsAt2 = (await estateForger.getRequest(2)).agenda.saleStartsAt;
            await time.setNextBlockTimestamp(saleStartsAt2);

            const params2: ConfirmParams = {
                requestId: BigNumber.from(2),
            };
            await expect(
                getEstateForgerTxByParams_SafeConfirm(estateForger, manager, params2, {
                    value: ethers.utils.parseEther('1000'),
                })
            ).to.be.revertedWithCustomError(estateForger, 'AlreadyCancelled');
        });

        it('2.2.17.15. Confirm tokenization unsuccessfully with confirmed request id', async () => {
            const fixture = await beforeEstateForgerTest({
                addSampleRequests: true,
                addDepositions: true,
                confirmRequests: true,
            });
            const { estateForger, manager } = fixture;

            const params1: ConfirmParams = {
                requestId: BigNumber.from(1),
            };
            await expect(
                getEstateForgerTxByParams_SafeConfirm(estateForger, manager, params1, {
                    value: ethers.utils.parseEther('1000'),
                })
            ).to.be.revertedWithCustomError(estateForger, 'AlreadyConfirmed');

            const params2: ConfirmParams = {
                requestId: BigNumber.from(2),
            };
            await expect(
                getEstateForgerTxByParams_SafeConfirm(estateForger, manager, params2, {
                    value: ethers.utils.parseEther('1000'),
                })
            ).to.be.revertedWithCustomError(estateForger, 'AlreadyConfirmed');
        });

        it('2.2.17.16. Confirm tokenization successfully within 30 days after public sale ends', async () => {
            const fixture = await beforeEstateForgerTest({
                addSampleRequests: true,
                addDepositions: true,
            });
            const { estateForger, manager } = fixture;

            const confirmationTimeLimit = Constant.ESTATE_TOKEN_CONFIRMATION_TIME_LIMIT;

            const request = await estateForger.getRequest(1);
            const publicSaleEndsAt = request.agenda.publicSaleEndsAt;
            await time.setNextBlockTimestamp(publicSaleEndsAt + confirmationTimeLimit - 1);

            const params1: ConfirmParams = {
                requestId: BigNumber.from(1),
            };
            await callTransaction(
                getEstateForgerTxByParams_SafeConfirm(estateForger, manager, params1, {
                    value: ethers.utils.parseEther('1000'),
                })
            );

            expect((await estateForger.getRequest(1)).agenda.publicSaleEndsAt).to.equal(publicSaleEndsAt);
        });

        it('2.2.17.17. Confirm tokenization unsuccessfully after 30 days after public sale ends', async () => {
            const fixture = await beforeEstateForgerTest({
                addSampleRequests: true,
                addDepositions: true,
            });
            const { estateForger, manager } = fixture;

            const confirmationTimeLimit = Constant.ESTATE_TOKEN_CONFIRMATION_TIME_LIMIT;

            const request = await estateForger.getRequest(1);
            const publicSaleEndsAt = request.agenda.publicSaleEndsAt;
            await time.setNextBlockTimestamp(publicSaleEndsAt + confirmationTimeLimit);

            const params1: ConfirmParams = {
                requestId: BigNumber.from(1),
            };
            await expect(
                getEstateForgerTxByParams_SafeConfirm(estateForger, manager, params1, {
                    value: ethers.utils.parseEther('1000'),
                })
            ).to.be.revertedWithCustomError(estateForger, 'Timeout');
        });

        it('2.2.17.18. Confirm tokenization unsuccessfully when sold amount is less than min selling amount', async () => {
            const fixture = await beforeEstateForgerTest({
                addSampleRequests: true,
            });
            const { estateForger, manager, depositor1 } = fixture;

            const privateSaleEndsAt1 = (await estateForger.getRequest(1)).agenda.privateSaleEndsAt;
            await time.setNextBlockTimestamp(privateSaleEndsAt1);
            await callTransaction(
                estateForger.connect(depositor1).deposit(1, 9, { value: ethers.utils.parseEther('100') })
            );

            const privateSaleEndsAt2 = (await estateForger.getRequest(2)).agenda.privateSaleEndsAt;
            await time.setNextBlockTimestamp(privateSaleEndsAt2);
            await callTransaction(estateForger.connect(depositor1).deposit(2, 199));

            const params1: ConfirmParams = {
                requestId: BigNumber.from(1),
            };
            await expect(
                getEstateForgerTxByParams_SafeConfirm(estateForger, manager, params1, {
                    value: ethers.utils.parseEther('1000'),
                })
            ).to.be.revertedWithCustomError(estateForger, 'NotEnoughSoldQuantity');
        });

        it('2.2.17.19. Confirm tokenization unsuccessfully with insufficient native token', async () => {
            const fixture = await beforeEstateForgerTest({
                addSampleRequests: true,
                addDepositions: true,
            });
            const { estateForger, manager } = fixture;

            const params2: ConfirmParams = {
                requestId: BigNumber.from(2),
            };
            await expect(
                getEstateForgerTxByParams_SafeConfirm(estateForger, manager, params2)
            ).to.be.revertedWithCustomError(estateForger, 'InsufficientValue');
        });

        it('2.2.17.20. Confirm tokenization unsuccessfully with insufficient erc20 allowance or balance', async () => {
            const fixture = await beforeEstateForgerTest({
                skipFundERC20ForManagers: true,
                addSampleRequests: true,
                addDepositions: true,
            });
            const { estateForger, manager } = fixture;

            const params1: ConfirmParams = {
                requestId: BigNumber.from(1),
            };
            await expect(
                getEstateForgerTxByParams_SafeConfirm(estateForger, manager, params1, {
                    value: ethers.utils.parseEther('1000'),
                })
            ).to.be.revertedWith('ERC20: insufficient allowance');
        });

        it('2.2.17.21. Confirm tokenization unsuccessfully when transferring native token to requester failed', async () => {
            const fixture = await beforeEstateForgerTest({
                useFailReceiverAsCustodian: true,
                addSampleRequests: true,
                addDepositions: true,
            });
            const { estateForger, failReceiver, manager } = fixture;

            await callTransaction(failReceiver.activate(true));

            await expect(
                getEstateForgerTxByParams_SafeConfirm(
                    estateForger,
                    manager,
                    {
                        requestId: BigNumber.from(1),
                    },
                    { value: ethers.utils.parseEther('1000') }
                )
            ).to.be.revertedWithCustomError(estateForger, 'FailedTransfer');
        });

        it('2.2.17.22. Confirm tokenization unsuccessfully when transferring native token to fee receiver failed', async () => {
            const fixture = await beforeEstateForgerTest({
                addSampleRequests: true,
                addDepositions: true,
            });
            const { estateForger, manager, deployer } = fixture;

            const failReceiver = await deployFailReceiver(deployer, true, false);

            await callTransaction(estateForger.setFeeReceiver(failReceiver.address));

            const params1: ConfirmParams = {
                requestId: BigNumber.from(1),
            };
            await expect(
                getEstateForgerTxByParams_SafeConfirm(estateForger, manager, params1, {
                    value: ethers.utils.parseEther('1000'),
                })
            ).to.be.revertedWithCustomError(estateForger, 'FailedTransfer');
        });

        it('2.2.17.23. Confirm tokenization unsuccessfully when transferring native token to broker failed', async () => {
            const fixture = await beforeEstateForgerTest({
                addSampleRequests: true,
                addDepositions: true,
                useFailReceiverAsBroker: true,
            });
            const { estateForger, manager, failReceiver } = fixture;

            await callTransaction(failReceiver.activate(true));

            const params1: ConfirmParams = {
                requestId: BigNumber.from(1),
            };
            await expect(
                getEstateForgerTxByParams_SafeConfirm(estateForger, manager, params1, {
                    value: ethers.utils.parseEther('1000'),
                })
            ).to.be.revertedWithCustomError(estateForger, 'FailedTransfer');
        });

        it('2.2.17.24. Confirm tokenization unsuccessfully when the contract is reentered', async () => {
            const fixture = await beforeEstateForgerTest({
                addSampleRequests: true,
                addDepositions: true,
                useReentrancyAsBroker: true,
            });
            const { estateForger, reentrancy, manager } = fixture;

            await testReentrancy_estateForger(estateForger, reentrancy, async () => {
                const params1: ConfirmParams = {
                    requestId: BigNumber.from(1),
                };
                await expect(
                    getEstateForgerTxByParams_SafeConfirm(estateForger, manager, params1, {
                        value: ethers.utils.parseEther('1000'),
                    })
                ).to.be.revertedWithCustomError(estateForger, 'FailedTransfer');
            });
        });
    });

    describe('2.2.18. withdrawDeposit(uint256)', () => {
        it('2.2.18.1. Withdraw deposit successfully when request is cancelled', async () => {
            const fixture = await beforeEstateForgerTest({
                addSampleRequests: true,
                addDepositions: true,
            });
            const { estateForger, manager, depositor1, depositor2, currencies } = fixture;

            const currency = currencies[0];

            await callTransaction(
                getEstateForgerTx_Cancel(estateForger, manager, {
                    requestId: BigNumber.from(1),
                })
            );
            await callTransaction(
                getEstateForgerTx_Cancel(estateForger, manager, {
                    requestId: BigNumber.from(2),
                })
            );

            let depositAmount = await estateForger.deposits(1, depositor1.address);
            let request = await estateForger.getRequest(1);

            const depositor1InitBalance = await ethers.provider.getBalance(depositor1.address);
            const depositor2InitCurrencyBalance = await currency.balanceOf(depositor2.address);

            let tx = await getEstateForgerTx_WithdrawDeposit(estateForger, depositor1, {
                requestId: BigNumber.from(1),
            });
            let receipt = await tx.wait();

            let value = depositAmount.mul(request.quote.unitPrice);
            await expect(tx)
                .emit(estateForger, 'DepositWithdrawal')
                .withArgs(1, depositor1.address, depositAmount, value);

            expect(await estateForger.deposits(1, depositor1.address)).to.be.equal(0);

            expect(await ethers.provider.getBalance(depositor1.address)).to.be.equal(
                depositor1InitBalance.sub(receipt.gasUsed.mul(receipt.effectiveGasPrice)).add(value)
            );

            depositAmount = await estateForger.deposits(2, depositor2.address);
            request = await estateForger.getRequest(2);

            tx = await getEstateForgerTx_WithdrawDeposit(estateForger, depositor2, {
                requestId: BigNumber.from(2),
            });
            await tx.wait();

            value = depositAmount.mul(request.quote.unitPrice);
            await expect(tx)
                .emit(estateForger, 'DepositWithdrawal')
                .withArgs(2, depositor2.address, depositAmount, value);

            expect(await estateForger.deposits(2, depositor2.address)).to.be.equal(0);

            expect(await currency.balanceOf(depositor2.address)).to.be.equal(depositor2InitCurrencyBalance.add(value));
        });

        it('2.2.18.2. Withdraw deposit successfully when request is not confirmable (sold amount is less than minimum selling amount', async () => {
            const fixture = await beforeEstateForgerTest({
                addSampleRequests: true,
            });
            const { estateForger, depositor1, depositor2 } = fixture;

            let timestamp = Math.max(
                (await estateForger.getRequest(1)).agenda.privateSaleEndsAt,
                (await estateForger.getRequest(2)).agenda.privateSaleEndsAt
            );
            await time.setNextBlockTimestamp(timestamp);

            const minSellingQuantity1 = (await estateForger.getRequest(1)).quota.minSellingQuantity;
            const minSellingQuantity2 = (await estateForger.getRequest(2)).quota.minSellingQuantity;

            await callTransaction(
                getEstateForgerTx_Deposit(
                    estateForger,
                    depositor1,
                    {
                        requestId: BigNumber.from(1),
                        quantity: minSellingQuantity1.sub(1),
                    },
                    { value: ethers.utils.parseEther('10') }
                )
            );
            await callTransaction(
                getEstateForgerTx_Deposit(
                    estateForger,
                    depositor2,
                    {
                        requestId: BigNumber.from(2),
                        quantity: minSellingQuantity2.sub(1),
                    },
                    { value: ethers.utils.parseEther('10') }
                )
            );

            const request1 = await estateForger.getRequest(1);
            await time.setNextBlockTimestamp(request1.agenda.publicSaleEndsAt + 1);
            await callTransaction(
                getEstateForgerTx_WithdrawDeposit(estateForger, depositor1, {
                    requestId: BigNumber.from(1),
                })
            );

            const request2 = await estateForger.getRequest(2);
            await time.setNextBlockTimestamp(request2.agenda.publicSaleEndsAt + 1);
            await callTransaction(
                getEstateForgerTx_WithdrawDeposit(estateForger, depositor2, {
                    requestId: BigNumber.from(2),
                })
            );
        });

        it('2.2.18.3. Withdraw deposit successfully after request is no longer confirmable (30 days after public sale ended', async () => {
            const fixture = await beforeEstateForgerTest({
                addSampleRequests: true,
                addDepositions: true,
            });
            const { estateForger, depositor1, depositor2 } = fixture;

            const request1 = await estateForger.getRequest(1);
            const request2 = await estateForger.getRequest(2);

            const days_60 = 60 * 24 * 60 * 60;

            await time.setNextBlockTimestamp(request1.agenda.publicSaleEndsAt + days_60 + 1);
            await callTransaction(
                getEstateForgerTx_WithdrawDeposit(estateForger, depositor1, {
                    requestId: BigNumber.from(1),
                })
            );

            await time.setNextBlockTimestamp(request2.agenda.publicSaleEndsAt + days_60 + 1);
            await callTransaction(
                getEstateForgerTx_WithdrawDeposit(estateForger, depositor2, {
                    requestId: BigNumber.from(2),
                })
            );
        });

        it('2.2.18.4. Withdraw deposit unsuccessfully when paused', async () => {
            const fixture = await beforeEstateForgerTest({
                addSampleRequests: true,
                addDepositions: true,
                pause: true,
            });
            const { estateForger, depositor1, depositor2 } = fixture;

            await expect(
                getEstateForgerTx_WithdrawDeposit(estateForger, depositor1, {
                    requestId: BigNumber.from(1),
                })
            ).to.be.revertedWith('Pausable: paused');
            await expect(
                getEstateForgerTx_WithdrawDeposit(estateForger, depositor2, {
                    requestId: BigNumber.from(2),
                })
            ).to.be.revertedWith('Pausable: paused');
        });

        it('2.2.18.5. Withdraw deposit unsuccessfully with invalid request id', async () => {
            const fixture = await beforeEstateForgerTest({
                addSampleRequests: true,
                addDepositions: true,
            });
            const { estateForger, manager, depositor1, depositor2 } = fixture;

            await callTransaction(
                getEstateForgerTx_Cancel(estateForger, manager, {
                    requestId: BigNumber.from(1),
                })
            );
            await callTransaction(
                getEstateForgerTx_Cancel(estateForger, manager, {
                    requestId: BigNumber.from(2),
                })
            );

            await expect(
                getEstateForgerTx_WithdrawDeposit(estateForger, depositor1, {
                    requestId: BigNumber.from(0),
                })
            ).to.be.revertedWithCustomError(estateForger, 'InvalidRequestId');
            await expect(
                getEstateForgerTx_WithdrawDeposit(estateForger, depositor2, {
                    requestId: BigNumber.from(100),
                })
            ).to.be.revertedWithCustomError(estateForger, 'InvalidRequestId');
        });

        it('2.2.18.6. Withdraw deposit unsuccessfully with confirmed request', async () => {
            const fixture = await beforeEstateForgerTest({
                addSampleRequests: true,
                addDepositions: true,
                confirmRequests: true,
            });
            const { estateForger, depositor1, depositor2 } = fixture;

            await expect(
                getEstateForgerTx_WithdrawDeposit(estateForger, depositor1, {
                    requestId: BigNumber.from(1),
                })
            ).to.be.revertedWithCustomError(estateForger, 'AlreadyConfirmed');
            await expect(
                getEstateForgerTx_WithdrawDeposit(estateForger, depositor2, {
                    requestId: BigNumber.from(2),
                })
            ).to.be.revertedWithCustomError(estateForger, 'AlreadyConfirmed');
        });

        it('2.2.18.7. Withdraw deposit unsuccessfully when public sale not ended', async () => {
            const fixture = await beforeEstateForgerTest({
                addSampleRequests: true,
                addDepositions: true,
            });
            const { estateForger, depositor1, depositor2 } = fixture;

            await expect(
                getEstateForgerTx_WithdrawDeposit(estateForger, depositor1, {
                    requestId: BigNumber.from(1),
                })
            ).to.be.revertedWithCustomError(estateForger, 'StillSelling');
            await expect(
                getEstateForgerTx_WithdrawDeposit(estateForger, depositor2, {
                    requestId: BigNumber.from(2),
                })
            ).to.be.revertedWithCustomError(estateForger, 'StillSelling');
        });

        it('2.2.18.8. Withdraw deposit unsuccessfully with confirmable request', async () => {
            const fixture = await beforeEstateForgerTest({
                addSampleRequests: true,
                addDepositions: true,
            });
            const { estateForger, depositor1, depositor2 } = fixture;

            const request1 = await estateForger.getRequest(1);
            const request2 = await estateForger.getRequest(2);

            await time.setNextBlockTimestamp(request1.agenda.publicSaleEndsAt + 1);
            await expect(
                getEstateForgerTx_WithdrawDeposit(estateForger, depositor1, {
                    requestId: BigNumber.from(1),
                })
            ).to.be.revertedWithCustomError(estateForger, 'InvalidWithdrawing');

            await time.setNextBlockTimestamp(request2.agenda.publicSaleEndsAt + 1);
            await expect(
                getEstateForgerTx_WithdrawDeposit(estateForger, depositor2, {
                    requestId: BigNumber.from(2),
                })
            ).to.be.revertedWithCustomError(estateForger, 'InvalidWithdrawing');
        });

        it('2.2.18.9. Withdraw deposit unsuccessfully with already withdrawn deposits', async () => {
            const fixture = await beforeEstateForgerTest({
                addSampleRequests: true,
                addDepositions: true,
            });
            const { estateForger, manager, depositor1, depositor2 } = fixture;

            await callTransaction(
                getEstateForgerTx_Cancel(estateForger, manager, {
                    requestId: BigNumber.from(1),
                })
            );
            await callTransaction(
                getEstateForgerTx_Cancel(estateForger, manager, {
                    requestId: BigNumber.from(2),
                })
            );

            await callTransaction(
                getEstateForgerTx_WithdrawDeposit(estateForger, depositor1, {
                    requestId: BigNumber.from(1),
                })
            );
            await callTransaction(
                getEstateForgerTx_WithdrawDeposit(estateForger, depositor1, {
                    requestId: BigNumber.from(2),
                })
            );
            await callTransaction(
                getEstateForgerTx_WithdrawDeposit(estateForger, depositor2, {
                    requestId: BigNumber.from(1),
                })
            );
            await callTransaction(
                getEstateForgerTx_WithdrawDeposit(estateForger, depositor2, {
                    requestId: BigNumber.from(2),
                })
            );

            await expect(
                getEstateForgerTx_WithdrawDeposit(estateForger, depositor1, {
                    requestId: BigNumber.from(1),
                })
            ).to.be.revertedWithCustomError(estateForger, 'NothingToWithdraw');
            await expect(
                getEstateForgerTx_WithdrawDeposit(estateForger, depositor1, {
                    requestId: BigNumber.from(2),
                })
            ).to.be.revertedWithCustomError(estateForger, 'NothingToWithdraw');
            await expect(
                getEstateForgerTx_WithdrawDeposit(estateForger, depositor2, {
                    requestId: BigNumber.from(1),
                })
            ).to.be.revertedWithCustomError(estateForger, 'NothingToWithdraw');
            await expect(
                getEstateForgerTx_WithdrawDeposit(estateForger, depositor2, {
                    requestId: BigNumber.from(2),
                })
            ).to.be.revertedWithCustomError(estateForger, 'NothingToWithdraw');
        });

        it('2.2.18.10. Withdraw deposit unsuccessfully when native transfer to sender failed', async () => {
            const fixture = await beforeEstateForgerTest({
                addSampleRequests: true,
                addDepositions: true,
            });
            const { estateForger, deployer, manager } = fixture;

            const request = await estateForger.getRequest(1);

            const failedReceiver = await deployFailReceiver(deployer, true, false);

            let message = estateForger.interface.encodeFunctionData('deposit', [1, 5]);

            await callTransaction(
                failedReceiver.call(estateForger.address, message, {
                    value: request.quote.unitPrice.mul(5),
                })
            );

            await callTransaction(
                getEstateForgerTx_Cancel(estateForger, manager, {
                    requestId: BigNumber.from(1),
                })
            );

            message = estateForger.interface.encodeFunctionData('withdrawDeposit', [1]);

            await expect(failedReceiver.call(estateForger.address, message)).to.be.revertedWithCustomError(
                estateForger,
                'FailedTransfer'
            );
        });

        it('2.2.18.11. Withdraw deposit unsuccessfully when the contract is reentered', async () => {
            const fixture = await beforeEstateForgerTest({
                addSampleRequests: true,
                addDepositions: true,
            });
            const { estateForger, deployer, manager } = fixture;

            const reentrancy = await deployReentrancyReceiver(deployer, true, false);

            let message = estateForger.interface.encodeFunctionData('deposit', [1, 10]);

            await callTransaction(
                reentrancy.call(estateForger.address, message, {
                    value: ethers.utils.parseEther('100'),
                })
            );

            await callTransaction(
                getEstateForgerTx_Cancel(estateForger, manager, {
                    requestId: BigNumber.from(1),
                })
            );

            message = estateForger.interface.encodeFunctionData('withdrawDeposit', [1]);
            await callTransaction(reentrancy.updateReentrancyPlan(estateForger.address, message));

            await testReentrancy_estateForger(estateForger, reentrancy, async () => {
                await expect(reentrancy.call(estateForger.address, message)).to.be.revertedWithCustomError(
                    estateForger,
                    'FailedTransfer'
                );
            });
        });
    });

    describe('2.2.19. withdrawEstateToken(uint256)', () => {
        it('2.2.19.1. Withdraw token successfully after request is confirmed', async () => {
            const fixture = await beforeEstateForgerTest({
                addSampleRequests: true,
                addDepositions: true,
                confirmRequests: true,
            });
            const { estateForger, estateToken, depositor1, depositor2, depositor3, reserveVault, currencies } = fixture;

            let timestamp = (await time.latest()) + 100;

            const request1 = await estateForger.getRequest(1);
            const request2 = await estateForger.getRequest(2);
            const fund1 = await reserveVault.getFund(request1.quote.cashbackFundId);
            const fund2 = await reserveVault.getFund(request2.quote.cashbackFundId);

            const unit = BigNumber.from(10).pow(Constant.ESTATE_TOKEN_TOKEN_DECIMALS);

            const request1TotalQuantity = request1.quota.soldQuantity;
            const request1TotalAmount = request1TotalQuantity.mul(unit);
            const request2TotalQuantity = request2.quota.soldQuantity;
            const request2TotalAmount = request2TotalQuantity.mul(unit);

            // Depositor 1 on request 1
            let depositor1InitNativeBalance = await ethers.provider.getBalance(depositor1.address);
            let depositor1InitCurrency0Balance = await currencies[0].balanceOf(depositor1.address);
            let depositor1InitCurrency1Balance = await currencies[1].balanceOf(depositor1.address);
            const quantity1 = 2;
            const amount1 = unit.mul(quantity1);

            await time.setNextBlockTimestamp(timestamp);

            const estate1deposit1 = await estateForger.deposits(1, depositor1.address);

            const tx1 = await getEstateForgerTx_WithdrawEstateToken(estateForger, depositor1, {
                requestId: BigNumber.from(1),
            });
            const receipt1 = await tx1.wait();
            const gasFee1 = receipt1.gasUsed.mul(receipt1.effectiveGasPrice);
            await expect(tx1).emit(estateForger, 'EstateTokenWithdrawal').withArgs(1, depositor1.address, amount1);

            expect(await estateForger.deposits(1, depositor1.address)).to.be.equal(estate1deposit1);
            expect(await estateToken.balanceOf(depositor1.address, 1)).to.be.equal(amount1);
            expect(await estateToken.balanceOf(estateForger.address, 1)).to.be.equal(request1TotalAmount.sub(amount1));
            expect(await estateToken.balanceOf(estateForger.address, 2)).to.be.equal(request2TotalAmount);

            expect(await ethers.provider.getBalance(depositor1.address)).to.be.equal(
                depositor1InitNativeBalance.sub(gasFee1)
            );
            expect(await currencies[0].balanceOf(depositor1.address)).to.be.equal(depositor1InitCurrency0Balance);
            expect(await currencies[1].balanceOf(depositor1.address)).to.be.equal(depositor1InitCurrency1Balance);

            expect(await estateForger.withdrawAt(1, depositor1.address)).to.be.equal(timestamp);

            // Depositor 2 on request 1
            let depositor2InitNativeBalance = await ethers.provider.getBalance(depositor2.address);
            let depositor2InitCurrency0Balance = await currencies[0].balanceOf(depositor2.address);
            let depositor2InitCurrency1Balance = await currencies[1].balanceOf(depositor2.address);
            const quantity2 = 5;
            const amount2 = unit.mul(quantity2);

            timestamp += 10;
            await time.setNextBlockTimestamp(timestamp);

            const estate1deposit2 = await estateForger.deposits(1, depositor2.address);

            const tx2 = await getEstateForgerTx_WithdrawEstateToken(estateForger, depositor2, {
                requestId: BigNumber.from(1),
            });
            const receipt2 = await tx2.wait();
            const gasFee2 = receipt2.gasUsed.mul(receipt2.effectiveGasPrice);
            await expect(tx2).emit(estateForger, 'EstateTokenWithdrawal').withArgs(1, depositor2.address, amount2);
            expect(await estateForger.deposits(1, depositor2.address)).to.be.equal(estate1deposit2);
            expect(await estateToken.balanceOf(depositor2.address, 1)).to.be.equal(amount2);
            expect(await estateToken.balanceOf(estateForger.address, 1)).to.be.equal(
                request1TotalAmount.sub(amount1).sub(amount2)
            );
            expect(await estateToken.balanceOf(estateForger.address, 2)).to.be.equal(request2TotalAmount);

            const expectedNativeCashback2 = fund1.mainDenomination.mul(quantity2);
            const expectedCurrency0Cashback2 = fund1.extraDenominations[0].mul(quantity2);
            const expectedCurrency1Cashback2 = fund1.extraDenominations[1].mul(quantity2);
            expect(await ethers.provider.getBalance(depositor2.address)).to.be.equal(
                depositor2InitNativeBalance.add(expectedNativeCashback2).sub(gasFee2)
            );
            expect(await currencies[0].balanceOf(depositor2.address)).to.be.equal(
                depositor2InitCurrency0Balance.add(expectedCurrency0Cashback2)
            );
            expect(await currencies[1].balanceOf(depositor2.address)).to.be.equal(
                depositor2InitCurrency1Balance.add(expectedCurrency1Cashback2)
            );

            expect(await estateForger.withdrawAt(1, depositor2.address)).to.be.equal(timestamp);

            // Depositor 3 on request 1
            let depositor3InitNativeBalance = await ethers.provider.getBalance(depositor3.address);
            let depositor3InitCurrency0Balance = await currencies[0].balanceOf(depositor3.address);
            let depositor3InitCurrency1Balance = await currencies[1].balanceOf(depositor3.address);
            const quantity3 = 10;
            const amount3 = unit.mul(quantity3);

            timestamp += 10;
            await time.setNextBlockTimestamp(timestamp);

            const estate1deposit3 = await estateForger.deposits(1, depositor3.address);

            const tx3 = await getEstateForgerTx_WithdrawEstateToken(estateForger, depositor3, {
                requestId: BigNumber.from(1),
            });
            const receipt3 = await tx3.wait();
            const gasFee3 = receipt3.gasUsed.mul(receipt3.effectiveGasPrice);
            await expect(tx3).emit(estateForger, 'EstateTokenWithdrawal').withArgs(1, depositor3.address, amount3);
            expect(await estateForger.deposits(1, depositor3.address)).to.be.equal(estate1deposit3);
            expect(await estateToken.balanceOf(depositor3.address, 1)).to.be.equal(amount3);
            expect(await estateToken.balanceOf(estateForger.address, 1)).to.be.equal(0);
            expect(await estateToken.balanceOf(estateForger.address, 2)).to.be.equal(request2TotalAmount);

            const expectedNativeCashback3 = fund1.mainDenomination.mul(quantity3);
            const expectedCurrency0Cashback3 = fund1.extraDenominations[0].mul(quantity3);
            const expectedCurrency1Cashback3 = fund1.extraDenominations[1].mul(quantity3);
            expect(await ethers.provider.getBalance(depositor3.address)).to.be.equal(
                depositor3InitNativeBalance.add(expectedNativeCashback3).sub(gasFee3)
            );
            expect(await currencies[0].balanceOf(depositor3.address)).to.be.equal(
                depositor3InitCurrency0Balance.add(expectedCurrency0Cashback3)
            );
            expect(await currencies[1].balanceOf(depositor3.address)).to.be.equal(
                depositor3InitCurrency1Balance.add(expectedCurrency1Cashback3)
            );

            expect(await estateForger.withdrawAt(1, depositor3.address)).to.be.equal(timestamp);

            // Depositor 1 on request 2
            depositor1InitNativeBalance = await ethers.provider.getBalance(depositor1.address);
            depositor1InitCurrency0Balance = await currencies[0].balanceOf(depositor1.address);
            depositor1InitCurrency1Balance = await currencies[1].balanceOf(depositor1.address);
            const quantity4 = 200;
            const amount4 = unit.mul(quantity4);

            timestamp += 10;
            await time.setNextBlockTimestamp(timestamp);

            const estate2deposit1 = await estateForger.deposits(2, depositor1.address);

            const tx4 = await getEstateForgerTx_WithdrawEstateToken(estateForger, depositor1, {
                requestId: BigNumber.from(2),
            });
            const receipt4 = await tx4.wait();
            const gasFee4 = receipt4.gasUsed.mul(receipt4.effectiveGasPrice);
            await expect(tx4).emit(estateForger, 'EstateTokenWithdrawal').withArgs(2, depositor1.address, amount4);
            expect(await estateForger.deposits(2, depositor1.address)).to.be.equal(estate2deposit1);
            expect(await estateToken.balanceOf(depositor1.address, 2)).to.be.equal(amount4);
            expect(await estateToken.balanceOf(estateForger.address, 1)).to.be.equal(0);
            expect(await estateToken.balanceOf(estateForger.address, 2)).to.be.equal(request2TotalAmount.sub(amount4));

            const expectedCurrency0Cashback4 = fund2.mainDenomination.mul(quantity4);
            const expectedCurrency1Cashback4 = fund2.extraDenominations[0].mul(quantity4);
            const expectedNativeCashback4 = fund2.extraDenominations[1].mul(quantity4);
            expect(await ethers.provider.getBalance(depositor1.address)).to.be.equal(
                depositor1InitNativeBalance.add(expectedNativeCashback4).sub(gasFee4)
            );
            expect(await currencies[0].balanceOf(depositor1.address)).to.be.equal(
                depositor1InitCurrency0Balance.add(expectedCurrency0Cashback4)
            );
            expect(await currencies[1].balanceOf(depositor1.address)).to.be.equal(
                depositor1InitCurrency1Balance.add(expectedCurrency1Cashback4)
            );

            expect(await estateForger.withdrawAt(2, depositor1.address)).to.be.equal(timestamp);

            // Depositor 2 on request 2
            depositor2InitNativeBalance = await ethers.provider.getBalance(depositor2.address);
            depositor2InitCurrency0Balance = await currencies[0].balanceOf(depositor2.address);
            depositor2InitCurrency1Balance = await currencies[1].balanceOf(depositor2.address);
            const quantity5 = 300;
            const amount5 = unit.mul(quantity5);

            timestamp += 10;
            await time.setNextBlockTimestamp(timestamp);

            const estate2deposit2 = await estateForger.deposits(2, depositor2.address);

            const tx5 = await getEstateForgerTx_WithdrawEstateToken(estateForger, depositor2, {
                requestId: BigNumber.from(2),
            });
            const receipt5 = await tx5.wait();
            const gasFee5 = receipt5.gasUsed.mul(receipt5.effectiveGasPrice);
            await expect(tx5).emit(estateForger, 'EstateTokenWithdrawal').withArgs(2, depositor2.address, amount5);
            expect(await estateForger.deposits(2, depositor2.address)).to.be.equal(estate2deposit2);
            expect(await estateToken.balanceOf(depositor2.address, 2)).to.be.equal(amount5);
            expect(await estateToken.balanceOf(estateForger.address, 1)).to.be.equal(0);
            expect(await estateToken.balanceOf(estateForger.address, 2)).to.be.equal(
                request2TotalAmount.sub(amount4).sub(amount5)
            );

            const expectedCurrency0Cashback5 = fund2.mainDenomination.mul(quantity5);
            const expectedCurrency1Cashback5 = fund2.extraDenominations[0].mul(quantity5);
            const expectedNativeCashback5 = fund2.extraDenominations[1].mul(quantity5);
            expect(await ethers.provider.getBalance(depositor2.address)).to.be.equal(
                depositor2InitNativeBalance.add(expectedNativeCashback5).sub(gasFee5)
            );
            expect(await currencies[0].balanceOf(depositor2.address)).to.be.equal(
                depositor2InitCurrency0Balance.add(expectedCurrency0Cashback5)
            );
            expect(await currencies[1].balanceOf(depositor2.address)).to.be.equal(
                depositor2InitCurrency1Balance.add(expectedCurrency1Cashback5)
            );

            expect(await estateForger.withdrawAt(2, depositor2.address)).to.be.equal(timestamp);

            // Depositor 3 on request 2
            depositor3InitNativeBalance = await ethers.provider.getBalance(depositor3.address);
            depositor3InitCurrency0Balance = await currencies[0].balanceOf(depositor3.address);
            depositor3InitCurrency1Balance = await currencies[1].balanceOf(depositor3.address);
            const quantity6 = 500;
            const amount6 = unit.mul(quantity6);

            timestamp += 10;
            await time.setNextBlockTimestamp(timestamp);

            const estate2deposit3 = await estateForger.deposits(2, depositor3.address);

            const tx6 = await getEstateForgerTx_WithdrawEstateToken(estateForger, depositor3, {
                requestId: BigNumber.from(2),
            });
            const receipt6 = await tx6.wait();
            const gasFee6 = receipt6.gasUsed.mul(receipt6.effectiveGasPrice);
            await expect(tx6).emit(estateForger, 'EstateTokenWithdrawal').withArgs(2, depositor3.address, amount6);
            expect(await estateForger.deposits(2, depositor3.address)).to.be.equal(estate2deposit3);
            expect(await estateToken.balanceOf(depositor3.address, 2)).to.be.equal(amount6);
            expect(await estateToken.balanceOf(estateForger.address, 1)).to.be.equal(0);
            expect(await estateToken.balanceOf(estateForger.address, 2)).to.be.equal(0);

            const expectedCurrency0Cashback6 = fund2.mainDenomination.mul(quantity6);
            const expectedCurrency1Cashback6 = fund2.extraDenominations[0].mul(quantity6);
            const expectedNativeCashback6 = fund2.extraDenominations[1].mul(quantity6);
            expect(await ethers.provider.getBalance(depositor3.address)).to.be.equal(
                depositor3InitNativeBalance.add(expectedNativeCashback6).sub(gasFee6)
            );
            expect(await currencies[0].balanceOf(depositor3.address)).to.be.equal(
                depositor3InitCurrency0Balance.add(expectedCurrency0Cashback6)
            );
            expect(await currencies[1].balanceOf(depositor3.address)).to.be.equal(
                depositor3InitCurrency1Balance.add(expectedCurrency1Cashback6)
            );

            expect(await estateForger.withdrawAt(2, depositor3.address)).to.be.equal(timestamp);
        });

        it('2.2.19.2. Withdraw token successfully when request has no cashback', async () => {
            const fixture = await beforeEstateForgerTest({
                addSampleRequests: true,
                addDepositions: true,
                confirmRequests: true,
                useNoCashback: true,
            });
            const { estateForger, estateToken, depositor1, currencies } = fixture;

            let timestamp = (await time.latest()) + 100;

            const request1 = await estateForger.getRequest(1);
            const request2 = await estateForger.getRequest(2);

            const unit = BigNumber.from(10).pow(Constant.ESTATE_TOKEN_TOKEN_DECIMALS);

            const request1TotalQuantity = request1.quota.soldQuantity;
            const request1TotalAmount = request1TotalQuantity.mul(unit);
            const request2TotalQuantity = request2.quota.soldQuantity;
            const request2TotalAmount = request2TotalQuantity.mul(unit);

            // Depositor 1 on request 1
            let depositor1InitNativeBalance = await ethers.provider.getBalance(depositor1.address);
            let depositor1InitCurrency0Balance = await currencies[0].balanceOf(depositor1.address);
            const quantity1 = 2;
            const amount1 = unit.mul(quantity1);

            await time.setNextBlockTimestamp(timestamp);

            const estate1deposit1 = await estateForger.deposits(1, depositor1.address);

            const tx1 = await getEstateForgerTx_WithdrawEstateToken(estateForger, depositor1, {
                requestId: BigNumber.from(1),
            });
            const receipt1 = await tx1.wait();
            const gasFee1 = receipt1.gasUsed.mul(receipt1.effectiveGasPrice);
            await expect(tx1).emit(estateForger, 'EstateTokenWithdrawal').withArgs(1, depositor1.address, amount1);
            expect(await estateForger.deposits(1, depositor1.address)).to.be.equal(estate1deposit1);
            expect(await estateToken.balanceOf(depositor1.address, 1)).to.be.equal(amount1);
            expect(await estateToken.balanceOf(estateForger.address, 1)).to.be.equal(request1TotalAmount.sub(amount1));
            expect(await estateToken.balanceOf(estateForger.address, 2)).to.be.equal(request2TotalAmount);

            expect(await ethers.provider.getBalance(depositor1.address)).to.be.equal(
                depositor1InitNativeBalance.sub(gasFee1)
            );
            expect(await currencies[0].balanceOf(depositor1.address)).to.be.equal(depositor1InitCurrency0Balance);

            expect(await estateForger.withdrawAt(1, depositor1.address)).to.be.equal(timestamp);

            // Depositor 1 on request 2
            depositor1InitNativeBalance = await ethers.provider.getBalance(depositor1.address);
            depositor1InitCurrency0Balance = await currencies[0].balanceOf(depositor1.address);
            const quantity2 = 200;
            const amount2 = unit.mul(quantity2);

            timestamp += 10;
            await time.setNextBlockTimestamp(timestamp);

            const estate2deposit1 = await estateForger.deposits(2, depositor1.address);

            const tx2 = await getEstateForgerTx_WithdrawEstateToken(estateForger, depositor1, {
                requestId: BigNumber.from(2),
            });
            const receipt2 = await tx2.wait();
            const gasFee2 = receipt2.gasUsed.mul(receipt2.effectiveGasPrice);
            await expect(tx2).emit(estateForger, 'EstateTokenWithdrawal').withArgs(2, depositor1.address, amount2);
            expect(await estateForger.deposits(2, depositor1.address)).to.be.equal(estate2deposit1);
            expect(await estateToken.balanceOf(depositor1.address, 2)).to.be.equal(amount2);
            expect(await estateToken.balanceOf(estateForger.address, 1)).to.be.equal(request1TotalAmount.sub(amount1));
            expect(await estateToken.balanceOf(estateForger.address, 2)).to.be.equal(request2TotalAmount.sub(amount2));

            expect(await ethers.provider.getBalance(depositor1.address)).to.be.equal(
                depositor1InitNativeBalance.sub(gasFee2)
            );
            expect(await currencies[0].balanceOf(depositor1.address)).to.be.equal(depositor1InitCurrency0Balance);

            expect(await estateForger.withdrawAt(2, depositor1.address)).to.be.equal(timestamp);
        });

        it('2.2.19.3. Withdraw token unsuccessfully when paused', async () => {
            const fixture = await beforeEstateForgerTest({
                addSampleRequests: true,
                addDepositions: true,
                confirmRequests: true,
                pause: true,
            });

            const { estateForger, depositor1, depositor2 } = fixture;

            await expect(
                getEstateForgerTx_WithdrawEstateToken(estateForger, depositor1, {
                    requestId: BigNumber.from(1),
                })
            ).to.be.revertedWith('Pausable: paused');
            await expect(
                getEstateForgerTx_WithdrawEstateToken(estateForger, depositor2, {
                    requestId: BigNumber.from(2),
                })
            ).to.be.revertedWith('Pausable: paused');
        });

        it('2.2.19.4. Withdraw token unsuccessfully with invalid request id', async () => {
            const fixture = await beforeEstateForgerTest({
                addSampleRequests: true,
                addDepositions: true,
                confirmRequests: true,
            });
            const { estateForger, depositor1, depositor2 } = fixture;

            await expect(
                getEstateForgerTx_WithdrawEstateToken(estateForger, depositor1, {
                    requestId: BigNumber.from(0),
                })
            ).to.be.revertedWithCustomError(estateForger, 'InvalidRequestId');
            await expect(
                getEstateForgerTx_WithdrawEstateToken(estateForger, depositor2, {
                    requestId: BigNumber.from(100),
                })
            ).to.be.revertedWithCustomError(estateForger, 'InvalidRequestId');
        });

        it('2.2.19.5. Withdraw token unsuccessfully with untokenized request', async () => {
            const fixture = await beforeEstateForgerTest({
                addSampleRequests: true,
                addDepositions: true,
            });
            const { estateForger, depositor1 } = fixture;

            await expect(
                getEstateForgerTx_WithdrawEstateToken(estateForger, depositor1, {
                    requestId: BigNumber.from(1),
                })
            ).to.be.revertedWithCustomError(estateForger, 'NotTokenized');
        });

        it('2.2.19.6. Withdraw token unsuccessfully when sender has already withdrawn token', async () => {
            const fixture = await beforeEstateForgerTest({
                addSampleRequests: true,
                addDepositions: true,
                confirmRequests: true,
            });

            const { estateForger, depositor1, depositor2 } = fixture;

            await callTransaction(
                getEstateForgerTx_WithdrawEstateToken(estateForger, depositor1, {
                    requestId: BigNumber.from(1),
                })
            );
            await callTransaction(
                getEstateForgerTx_WithdrawEstateToken(estateForger, depositor1, {
                    requestId: BigNumber.from(2),
                })
            );
            await callTransaction(
                getEstateForgerTx_WithdrawEstateToken(estateForger, depositor2, {
                    requestId: BigNumber.from(1),
                })
            );
            await callTransaction(
                getEstateForgerTx_WithdrawEstateToken(estateForger, depositor2, {
                    requestId: BigNumber.from(2),
                })
            );

            await expect(
                getEstateForgerTx_WithdrawEstateToken(estateForger, depositor1, {
                    requestId: BigNumber.from(1),
                })
            ).to.be.revertedWithCustomError(estateForger, 'AlreadyWithdrawn');
            await expect(
                getEstateForgerTx_WithdrawEstateToken(estateForger, depositor1, {
                    requestId: BigNumber.from(2),
                })
            ).to.be.revertedWithCustomError(estateForger, 'AlreadyWithdrawn');
            await expect(
                getEstateForgerTx_WithdrawEstateToken(estateForger, depositor2, {
                    requestId: BigNumber.from(1),
                })
            ).to.be.revertedWithCustomError(estateForger, 'AlreadyWithdrawn');
            await expect(
                getEstateForgerTx_WithdrawEstateToken(estateForger, depositor2, {
                    requestId: BigNumber.from(2),
                })
            ).to.be.revertedWithCustomError(estateForger, 'AlreadyWithdrawn');
        });
    });
});
