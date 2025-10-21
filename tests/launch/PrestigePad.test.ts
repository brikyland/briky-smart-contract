import chai from 'chai';
import { expect } from 'chai';
import { BigNumber, Contract } from 'ethers';
import { ethers } from 'hardhat';

// @defi-wonderland/smock
import { MockContract, smock } from '@defi-wonderland/smock';

// @nomicfoundation/hardhat-network-helpers
import { loadFixture, time } from '@nomicfoundation/hardhat-network-helpers';

// @tests
import { Constant } from '@tests/test.constant';
import {
    IERC165UpgradeableInterfaceId,
    IProjectLaunchpadInterfaceId,
    IProjectTokenReceiverInterfaceId,
} from '@tests/interfaces';

// @tests/land
import { Initialization as LandInitialization } from '@tests/land/test.initialization';

// @tests/launch
import { Initialization as LaunchInitialization } from '@tests/launch/test.initialization';

// @typechain-types
import {
    Admin,
    Currency,
    EstateToken,
    FeeReceiver,
    PriceFeed,
    ReserveVault,
    PriceWatcher,
    ProjectToken,
    MockPrestigePad,
    ReentrancyERC20,
    FailReceiver,
} from '@typechain-types';

// @utils
import { callTransaction, callTransactionAtTimestamp, prepareERC20, prepareNativeToken } from '@utils/blockchain';
import { applyDiscount, scaleRate } from '@utils/formula';
import { MockValidator } from '@utils/mockValidator';
import { getBytes4Hex, structToObject, OrderedMap } from '@utils/utils';

// @utils/deployments/common
import { deployAdmin } from '@utils/deployments/common/admin';
import { deployFeeReceiver } from '@utils/deployments/common/feeReceiver';
import { deployGovernor } from '@utils/deployments/common/governor';
import { deployPriceWatcher } from '@utils/deployments/common/priceWatcher';

// @utils/deployments/mock
import { deployFailReceiver } from '@utils/deployments/mock/utilities/failReceiver';
import { deployMockPrestigePad } from '@utils/deployments/mock/launch/mockPrestigePad';
import { deployPriceFeed } from '@utils/deployments/mock/utilities/priceFeed';
import { deployReentrancyReceiver } from '@utils/deployments/mock/reentrancy/reentrancyReceiver';
import { deployReentrancyERC20 } from '@utils/deployments/mock/reentrancy/reentrancyERC20';

// @utils/models/common
import { Rate } from '@utils/models/common/common';

// @utils/models/land
import { UpdateBaseUnitPriceRangeParamsInput, UpdateBaseUnitPriceRangeParams } from '@utils/models/land/estateForger';

// @utils/models/launch
import {
    InitiateLaunchParams,
    InitiateLaunchParamsInput,
    SafeConfirmCurrentRoundParams,
    ScheduleNextRoundParams,
    UpdateLaunchURIParams,
    UpdateLaunchURIParamsInput,
    UpdateRoundParams,
    UpdateRoundParamsInput,
    UpdateRoundsParamsInput,
    WithdrawProjectTokenParams,
} from '@utils/models/launch/prestigePad';

// @utils/signatures/launch
import { getUpdateBaseUnitPriceRangeSignatures } from '@utils/signatures/launch/prestigePad';

// @utils/transaction/common
import {
    getAdminTxByInput_ActivateIn,
    getAdminTxByInput_AuthorizeManagers,
    getAdminTxByInput_AuthorizeModerators,
    getAdminTxByInput_DeclareZone,
    getAdminTxByInput_UpdateCurrencyRegistries,
} from '@utils/transaction/common/admin';
import { getPausableTxByInput_Pause } from '@utils/transaction/common/pausable';
import { getReserveVaultTxByInput_AuthorizeProvider } from '@utils/transaction/common/reserveVault';
import { getPriceWatcherTxByInput_UpdatePriceFeeds } from '@utils/transaction/common/priceWatcher';

// @utils/transaction/launch
import {
    getCallTxByParams_SafeConfirmCurrentRound,
    getCallPrestigePadTx_ScheduleNextRound,
    getPrestigePadTxByInput_CallUpdateRounds,
    getPrestigePadTx_CancelCurrentRound,
    getPrestigePadTx_ContributeCurrentRound,
    getPrestigePadTx_InitiateLaunch,
    getPrestigePadTxByInput_InitiateLaunch,
    getPrestigePadTx_SafeConfirmCurrentRound,
    getPrestigePadTxByParams_SafeConfirmCurrentRound,
    getPrestigePadTx_SafeContributeCurrentRound,
    getPrestigePadTxByParams_SafeContributeCurrentRound,
    getPrestigePadTx_SafeFinalize,
    getPrestigePadTxByParams_SafeFinalize,
    getPrestigePadTx_ScheduleNextRound,
    getPrestigePadTxByInput_UpdateBaseUnitPriceRange,
    getPrestigePadTx_UpdateLaunchURI,
    getPrestigePadTxByInput_UpdateLaunchURI,
    getPrestigePadTx_UpdateRounds,
    getPrestigePadTxByInput_UpdateRounds,
    getPrestigePadTx_UpdateRound,
    getPrestigePadTxByInput_UpdateRound,
    getPrestigePadTx_WithdrawContribution,
    getPrestigePadTx_WithdrawProjectToken,
    getPrestigePadTx_UpdateBaseUnitPriceRange,
} from '@utils/transaction/launch/prestigePad';
import {
    getProjectTokenTxByInput_AuthorizeLaunchpad,
    getProjectTokenTxByInput_RegisterInitiator,
} from '@utils/transaction/launch/projectToken';

// @utils/validation/launch
import {
    getInitiateLaunchValidation,
    getUpdateLaunchURIValidation,
    getUpdateRoundsValidation,
    getUpdateRoundValidation,
} from '@utils/validation/launch/prestigePad';

chai.use(smock.matchers);

export interface PrestigePadFixture {
    deployer: any;
    admins: any[];
    manager: any;
    moderator: any;
    user: any;
    initiator1: any;
    initiator2: any;
    initiators: any[];
    depositor1: any;
    depositor2: any;
    depositor3: any;
    depositors: any[];
    validator: MockValidator;

    admin: Admin;
    currencies: Currency[];
    nativePriceFeed: PriceFeed;
    currencyPriceFeed: PriceFeed;
    feeReceiver: FeeReceiver;
    estateToken: MockContract<EstateToken>;
    projectToken: MockContract<ProjectToken>;
    reserveVault: MockContract<ReserveVault>;
    priceWatcher: PriceWatcher;
    prestigePad: MockPrestigePad;

    reentrancyExclusiveERC20: ReentrancyERC20;
    reentrancyERC20: ReentrancyERC20;
    failReceiver: FailReceiver;
    zone1: string;
    zone2: string;
}

async function testReentrancy_prestigePad(fixture: PrestigePadFixture, reentrancyContract: Contract, assertion: any) {
    const { prestigePad, validator, zone1, initiator1 } = fixture;

    let timestamp = await time.latest();

    // initiateLaunch
    const initiateLaunchParams = {
        initiator: initiator1.address,
        zone: zone1,
        projectURI: 'project_uri_test_1',
        launchURI: 'launch_uri_test_1',
        initialQuantity: BigNumber.from(1000),
        feeRate: ethers.utils.parseEther('0.1'),
    };

    const initiateLaunchValidation = await getInitiateLaunchValidation(prestigePad, initiateLaunchParams, validator);

    await callTransaction(
        reentrancyContract.updateReentrancyPlan(
            prestigePad.address,
            prestigePad.interface.encodeFunctionData('initiateLaunch', [
                initiateLaunchParams.initiator,
                initiateLaunchParams.zone,
                initiateLaunchParams.projectURI,
                initiateLaunchParams.launchURI,
                initiateLaunchParams.initialQuantity,
                initiateLaunchParams.feeRate,
                initiateLaunchValidation,
            ])
        )
    );

    await assertion(timestamp);

    // scheduleNextRound
    timestamp += 10;

    await callTransaction(
        reentrancyContract.updateReentrancyPlan(
            prestigePad.address,
            prestigePad.interface.encodeFunctionData('scheduleNextRound', [
                1,
                BigNumber.from(1),
                ethers.utils.parseEther('0.1'),
                [],
                [],
                timestamp + 1000,
                Constant.PRESTIGE_PAD_RAISE_MINIMUM_DURATION,
            ])
        )
    );

    await assertion(timestamp);

    // scheduleNextRound
    timestamp += 10;

    const safeConfirmCurrentRoundParams: SafeConfirmCurrentRoundParams = {
        launchId: BigNumber.from(1),
        anchor: ethers.utils.keccak256(ethers.utils.toUtf8Bytes('invalid anchor')),
    };
    await callTransaction(
        reentrancyContract.updateReentrancyPlan(
            prestigePad.address,
            prestigePad.interface.encodeFunctionData('safeConfirmCurrentRound', [
                safeConfirmCurrentRoundParams.launchId,
                safeConfirmCurrentRoundParams.anchor,
            ])
        )
    );

    await assertion(timestamp);

    // withdrawContribution
    timestamp += 10;

    await callTransaction(
        reentrancyContract.updateReentrancyPlan(
            prestigePad.address,
            prestigePad.interface.encodeFunctionData('withdrawContribution', [1])
        )
    );

    await assertion(timestamp);

    // withdrawProjectToken
    timestamp += 10;

    await callTransaction(
        reentrancyContract.updateReentrancyPlan(
            prestigePad.address,
            prestigePad.interface.encodeFunctionData('withdrawProjectToken', [1, 1])
        )
    );

    await assertion(timestamp);

    // contributeCurrentRound
    timestamp += 10;

    await callTransaction(
        reentrancyContract.updateReentrancyPlan(
            prestigePad.address,
            prestigePad.interface.encodeFunctionData('contributeCurrentRound', [1, BigNumber.from(100)])
        )
    );

    await assertion(timestamp);

    // safeContributeCurrentRound
    timestamp += 10;

    const anchor = ethers.utils.keccak256(ethers.utils.toUtf8Bytes('launch_uri_1'));
    await callTransaction(
        reentrancyContract.updateReentrancyPlan(
            prestigePad.address,
            prestigePad.interface.encodeFunctionData('safeContributeCurrentRound', [1, BigNumber.from(100), anchor])
        )
    );

    await assertion(timestamp);
}

export async function getFeeDenomination(
    prestigePad: MockPrestigePad,
    admin: Admin,
    launchId: BigNumber,
    _unitPrice: BigNumber,
    currency: Contract | null
) {
    return applyDiscount(admin, scaleRate(_unitPrice, (await prestigePad.getLaunch(launchId)).feeRate), currency);
}

describe('7.1. PrestigePad', async () => {
    async function prestigePadFixture(): Promise<PrestigePadFixture> {
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
            initiator1,
            initiator2,
            depositor1,
            depositor2,
            depositor3,
        ] = await ethers.getSigners();
        const admins = [admin1, admin2, admin3, admin4, admin5];
        const initiators = [initiator1, initiator2];
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

        const currencyPriceFeed = (await deployPriceFeed(deployer.address, 0, 0)) as PriceFeed;
        const nativePriceFeed = (await deployPriceFeed(deployer.address, 0, 0)) as PriceFeed;

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

        const MockProjectTokenFactory = (await smock.mock('ProjectToken')) as any;
        const projectToken = (await MockProjectTokenFactory.deploy()) as MockContract<ProjectToken>;
        await callTransaction(
            projectToken.initialize(
                admin.address,
                estateToken.address,
                feeReceiver.address,
                validator.getAddress(),
                LaunchInitialization.PROJECT_TOKEN_BaseURI
            )
        );

        const SmockReserveVaultFactory = (await smock.mock('ReserveVault')) as any;
        const reserveVault = (await SmockReserveVaultFactory.deploy()) as MockContract<ReserveVault>;
        await callTransaction(reserveVault.initialize(admin.address));

        const priceWatcher = (await deployPriceWatcher(deployer.address, admin.address)) as PriceWatcher;

        const prestigePad = (await deployMockPrestigePad(
            deployer,
            admin.address,
            projectToken.address,
            priceWatcher.address,
            feeReceiver.address,
            reserveVault.address,
            validator.getAddress(),
            LaunchInitialization.PRESTIGE_PAD_BaseMinUnitPrice,
            LaunchInitialization.PRESTIGE_PAD_BaseMaxUnitPrice
        )) as MockPrestigePad;

        const zone1 = ethers.utils.formatBytes32String('TestZone1');
        const zone2 = ethers.utils.formatBytes32String('TestZone2');

        const reentrancyExclusiveERC20 = (await deployReentrancyERC20(deployer, true, true)) as ReentrancyERC20;
        const reentrancyERC20 = (await deployReentrancyERC20(deployer, true, false)) as ReentrancyERC20;

        const failReceiver = (await deployFailReceiver(deployer, false, false)) as FailReceiver;

        return {
            deployer,
            admins,
            manager,
            moderator,
            user,
            initiator1,
            initiator2,
            initiators,
            depositor1,
            depositor2,
            depositor3,
            depositors,
            validator,
            admin,
            currencies,
            nativePriceFeed,
            currencyPriceFeed,
            feeReceiver,
            estateToken,
            projectToken,
            reserveVault,
            priceWatcher,
            prestigePad,
            reentrancyExclusiveERC20,
            reentrancyERC20,
            failReceiver,
            zone1,
            zone2,
        };
    }

    async function beforePrestigePadTest({
        skipListSampleCurrencies = false,
        skipAuthorizeLaunchpad = false,
        skipAuthorizeInitiators = false,
        skipAuthorizeProviders = false,
        skipAddZoneForExecutive = false,
        skipFundERC20ForDepositors = false,
        skipFundERC20ForInitiators = false,
        skipDeclareZone = false,
        useExclusiveReentrantCurrency = false,
        useReentrancyERC20 = false,
        useFailReceiverAsInitiator = false,
        addSampleLaunch = false,
        addSampleRounds = false,
        raiseFirstRound = false,
        depositFirstRound = false,
        confirmFirstRound = false,
        doAllFirstFound = false,
        raiseSecondRound = false,
        depositSecondRound = false,
        confirmSecondRound = false,
        doAllSecondFound = false,
        finalizeLaunch = false,
        cancelFirstRound = false,
        pause = false,
    } = {}): Promise<PrestigePadFixture> {
        const fixture = await loadFixture(prestigePadFixture);
        const {
            deployer,
            admin,
            admins,
            manager,
            moderator,
            projectToken,
            prestigePad,
            priceWatcher,
            nativePriceFeed,
            currencyPriceFeed,
            zone1,
            zone2,
            depositor1,
            depositor2,
            depositor3,
            reserveVault,
            validator,
            reentrancyExclusiveERC20,
            reentrancyERC20,
            failReceiver,
        } = fixture;

        let currencies = fixture.currencies;
        let initiators = fixture.initiators;
        let initiator1 = initiators[0];
        let initiator2 = initiators[1];
        if (useExclusiveReentrantCurrency) {
            currencies = [reentrancyExclusiveERC20 as any, ...currencies];
        }
        if (useReentrancyERC20) {
            currencies = [reentrancyERC20 as any, ...currencies];
        }
        if (useFailReceiverAsInitiator) {
            initiators = [failReceiver as any, ...initiators.slice(1)];
            initiator1 = failReceiver;
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

        if (!skipListSampleCurrencies) {
            await nativePriceFeed.updateData(1000_00000000, 8);
            await currencyPriceFeed.updateData(5_00000000, 8);

            await callTransaction(
                getAdminTxByInput_UpdateCurrencyRegistries(
                    admin,
                    deployer,
                    {
                        currencies: [
                            ethers.constants.AddressZero,
                            currencies[0].address,
                            currencies[1].address,
                            currencies[2].address,
                        ],
                        isAvailable: [true, true, true, true],
                        isExclusive: [false, true, false, false],
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
        }

        if (!skipFundERC20ForInitiators) {
            await prepareERC20(currencies[0], initiators, [prestigePad], ethers.utils.parseEther('1000000000'));
            await prepareERC20(currencies[1], initiators, [prestigePad], ethers.utils.parseEther('1000000000'));
        }

        if (!skipFundERC20ForDepositors) {
            await prepareERC20(
                currencies[0],
                [depositor1, depositor2, depositor3],
                [prestigePad],
                ethers.utils.parseEther('1000000000')
            );
        }

        if (!skipDeclareZone) {
            for (const zone of [zone1, zone2]) {
                await callTransaction(getAdminTxByInput_DeclareZone(admin, deployer, { zone }, admins));
            }

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
        }

        let timestamp = (await time.latest()) + 1000;

        if (!skipAuthorizeLaunchpad) {
            await callTransaction(
                getProjectTokenTxByInput_AuthorizeLaunchpad(
                    projectToken as any,
                    deployer,
                    {
                        accounts: [prestigePad.address],
                        isLaunchpad: true,
                    },
                    admin,
                    admins
                )
            );
        }

        if (!skipAuthorizeProviders) {
            await callTransaction(
                getReserveVaultTxByInput_AuthorizeProvider(
                    reserveVault as any,
                    deployer,
                    {
                        accounts: [prestigePad.address],
                        isProvider: true,
                    },
                    admin,
                    admins
                )
            );
        }

        if (!skipAuthorizeInitiators) {
            for (const zone of [zone1, zone2]) {
                for (const [index, initiator] of initiators.entries()) {
                    await callTransaction(
                        getProjectTokenTxByInput_RegisterInitiator(
                            projectToken as any,
                            manager,
                            {
                                zone: zone,
                                initiator: initiator.address,
                                uri: `initiator_uri_${index + 1}`,
                            },
                            validator
                        )
                    );
                }
            }
        }

        if (addSampleLaunch) {
            await callTransaction(
                getPrestigePadTxByInput_InitiateLaunch(
                    prestigePad,
                    manager,
                    {
                        initiator: initiator1.address,
                        zone: zone1,
                        projectURI: 'project_uri_1',
                        launchURI: 'launch_uri_1',
                        initialQuantity: BigNumber.from(1000),
                        feeRate: ethers.utils.parseEther('0.1'),
                    },
                    validator
                )
            );

            await callTransaction(
                getPrestigePadTxByInput_InitiateLaunch(
                    prestigePad,
                    manager,
                    {
                        initiator: initiator2.address,
                        zone: zone2,
                        projectURI: 'project_uri_2',
                        launchURI: 'launch_uri_2',
                        initialQuantity: BigNumber.from(100),
                        feeRate: ethers.utils.parseEther('0.2'),
                    },
                    validator
                )
            );
        }

        if (addSampleRounds) {
            const params1: UpdateRoundsParamsInput = {
                launchId: BigNumber.from(1),
                removedRoundNumber: BigNumber.from(0),
                addedRounds: [
                    {
                        uri: 'round_uri_1',
                        quota: {
                            totalQuantity: BigNumber.from(70),
                            minRaisingQuantity: BigNumber.from(10),
                            maxRaisingQuantity: BigNumber.from(30),
                        },
                        quote: {
                            unitPrice: ethers.utils.parseEther('0.2'),
                            currency: ethers.constants.AddressZero,
                        },
                    },
                    {
                        uri: 'round_uri_2',
                        quota: {
                            totalQuantity: BigNumber.from(1000),
                            minRaisingQuantity: BigNumber.from(200),
                            maxRaisingQuantity: BigNumber.from(1000),
                        },
                        quote: {
                            unitPrice: ethers.utils.parseEther('100'),
                            currency: currencies[0].address,
                        },
                    },
                ],
            };

            if (useFailReceiverAsInitiator) {
                await callTransaction(
                    getPrestigePadTxByInput_CallUpdateRounds(prestigePad, failReceiver, params1, validator)
                );
            } else {
                await callTransaction(
                    getPrestigePadTxByInput_UpdateRounds(prestigePad, initiator1, params1, validator)
                );
            }

            const params2: UpdateRoundsParamsInput = {
                launchId: BigNumber.from(2),
                removedRoundNumber: BigNumber.from(0),
                addedRounds: [
                    {
                        uri: 'round_uri_4',
                        quota: {
                            totalQuantity: BigNumber.from(3000),
                            minRaisingQuantity: BigNumber.from(300),
                            maxRaisingQuantity: BigNumber.from(3000),
                        },
                        quote: {
                            unitPrice: ethers.utils.parseEther('150'),
                            currency: currencies[0].address,
                        },
                    },
                    {
                        uri: 'round_uri_3',
                        quota: {
                            totalQuantity: BigNumber.from(300),
                            minRaisingQuantity: BigNumber.from(30),
                            maxRaisingQuantity: BigNumber.from(300),
                        },
                        quote: {
                            unitPrice: ethers.utils.parseEther('0.2'),
                            currency: ethers.constants.AddressZero,
                        },
                    },
                ],
            };
            await callTransaction(getPrestigePadTxByInput_UpdateRounds(prestigePad, initiator2, params2, validator));
        }

        if (raiseFirstRound || doAllFirstFound) {
            const params1 = {
                launchId: BigNumber.from(1),
                cashbackThreshold: BigNumber.from('5'),
                cashbackBaseRate: ethers.utils.parseEther('0.1'),
                cashbackCurrencies: [currencies[0].address, currencies[1].address],
                cashbackDenominations: [ethers.utils.parseEther('0.01'), ethers.utils.parseEther('0.02')],
                raiseStartsAt: timestamp + 10,
                raiseDuration: Constant.PRESTIGE_PAD_RAISE_MINIMUM_DURATION + 10,
            };

            if (useFailReceiverAsInitiator) {
                await callTransaction(getCallPrestigePadTx_ScheduleNextRound(prestigePad, failReceiver, params1));
            } else {
                await callTransaction(getPrestigePadTx_ScheduleNextRound(prestigePad, initiator1, params1));
            }

            const params2 = {
                launchId: BigNumber.from(2),
                cashbackThreshold: BigNumber.from('0'),
                cashbackBaseRate: ethers.utils.parseEther('0'),
                cashbackCurrencies: [],
                cashbackDenominations: [],
                raiseStartsAt: timestamp + 20,
                raiseDuration: Constant.PRESTIGE_PAD_RAISE_MINIMUM_DURATION + 20,
            };
            await callTransaction(getPrestigePadTx_ScheduleNextRound(prestigePad, initiator2, params2));
        }

        if (depositFirstRound || doAllFirstFound) {
            const roundId1 = (await prestigePad.getLaunch(1)).roundIds[1];
            timestamp = (await prestigePad.getRound(roundId1)).agenda.raiseStartsAt;
            await time.setNextBlockTimestamp(timestamp);

            await callTransaction(
                getPrestigePadTx_ContributeCurrentRound(
                    prestigePad,
                    depositor1,
                    {
                        launchId: BigNumber.from(1),
                        quantity: BigNumber.from(2),
                    },
                    { value: ethers.utils.parseEther('10') }
                )
            );
            await callTransaction(
                getPrestigePadTx_ContributeCurrentRound(
                    prestigePad,
                    depositor2,
                    {
                        launchId: BigNumber.from(1),
                        quantity: BigNumber.from(3),
                    },
                    { value: ethers.utils.parseEther('10') }
                )
            );
            await callTransaction(
                getPrestigePadTx_ContributeCurrentRound(
                    prestigePad,
                    depositor3,
                    {
                        launchId: BigNumber.from(1),
                        quantity: BigNumber.from(5),
                    },
                    { value: ethers.utils.parseEther('10') }
                )
            );

            const roundId2 = (await prestigePad.getLaunch(2)).roundIds[1];
            timestamp = (await prestigePad.getRound(roundId2)).agenda.raiseStartsAt;
            await time.setNextBlockTimestamp(timestamp);

            await callTransaction(
                getPrestigePadTx_ContributeCurrentRound(prestigePad, depositor1, {
                    launchId: BigNumber.from(2),
                    quantity: BigNumber.from(400),
                })
            );
            await callTransaction(
                getPrestigePadTx_ContributeCurrentRound(prestigePad, depositor2, {
                    launchId: BigNumber.from(2),
                    quantity: BigNumber.from(600),
                })
            );
            await callTransaction(
                getPrestigePadTx_ContributeCurrentRound(prestigePad, depositor3, {
                    launchId: BigNumber.from(2),
                    quantity: BigNumber.from(1000),
                })
            );
        }

        if (confirmFirstRound || doAllFirstFound) {
            await callTransaction(
                getPrestigePadTxByParams_SafeConfirmCurrentRound(
                    prestigePad,
                    initiator1,
                    { launchId: BigNumber.from(1) },
                    { value: ethers.utils.parseEther('10') }
                )
            );

            await callTransaction(
                getPrestigePadTxByParams_SafeConfirmCurrentRound(prestigePad, initiator2, {
                    launchId: BigNumber.from(2),
                })
            );
        }

        if (cancelFirstRound) {
            await callTransaction(
                getPrestigePadTx_CancelCurrentRound(prestigePad, initiator1, {
                    launchId: BigNumber.from(1),
                })
            );
            await callTransaction(
                getPrestigePadTx_CancelCurrentRound(prestigePad, initiator2, {
                    launchId: BigNumber.from(2),
                })
            );
        }

        if (raiseSecondRound || doAllSecondFound) {
            const params1 = {
                launchId: BigNumber.from(1),
                cashbackThreshold: BigNumber.from('50'),
                cashbackBaseRate: ethers.utils.parseEther('0.2'),
                cashbackCurrencies: [currencies[1].address, ethers.constants.AddressZero],
                cashbackDenominations: [ethers.utils.parseEther('0.01'), ethers.utils.parseEther('0.02')],
                raiseStartsAt: timestamp + 30,
                raiseDuration: Constant.PRESTIGE_PAD_RAISE_MINIMUM_DURATION + 30,
            };
            await callTransaction(getPrestigePadTx_ScheduleNextRound(prestigePad, initiator1, params1));

            const params2 = {
                launchId: BigNumber.from(2),
                cashbackThreshold: BigNumber.from('0'),
                cashbackBaseRate: ethers.utils.parseEther('0'),
                cashbackCurrencies: [],
                cashbackDenominations: [],
                raiseStartsAt: timestamp + 40,
                raiseDuration: Constant.PRESTIGE_PAD_RAISE_MINIMUM_DURATION + 40,
            };
            await callTransaction(getPrestigePadTx_ScheduleNextRound(prestigePad, initiator2, params2));
        }

        if (depositSecondRound || doAllSecondFound) {
            const roundId1 = (await prestigePad.getLaunch(1)).roundIds[2];
            timestamp = (await prestigePad.getRound(roundId1)).agenda.raiseStartsAt;
            await time.setNextBlockTimestamp(timestamp);

            await callTransaction(
                getPrestigePadTx_ContributeCurrentRound(prestigePad, depositor1, {
                    launchId: BigNumber.from(1),
                    quantity: BigNumber.from(200),
                })
            );
            await callTransaction(
                getPrestigePadTx_ContributeCurrentRound(prestigePad, depositor2, {
                    launchId: BigNumber.from(1),
                    quantity: BigNumber.from(300),
                })
            );
            await callTransaction(
                getPrestigePadTx_ContributeCurrentRound(prestigePad, depositor3, {
                    launchId: BigNumber.from(1),
                    quantity: BigNumber.from(500),
                })
            );

            const roundId2 = (await prestigePad.getLaunch(2)).roundIds[2];
            timestamp = (await prestigePad.getRound(roundId2)).agenda.raiseStartsAt;
            await time.setNextBlockTimestamp(timestamp);

            await callTransaction(
                getPrestigePadTx_ContributeCurrentRound(
                    prestigePad,
                    depositor1,
                    {
                        launchId: BigNumber.from(2),
                        quantity: BigNumber.from(40),
                    },
                    { value: ethers.utils.parseEther('100') }
                )
            );
            await callTransaction(
                getPrestigePadTx_ContributeCurrentRound(
                    prestigePad,
                    depositor2,
                    {
                        launchId: BigNumber.from(2),
                        quantity: BigNumber.from(60),
                    },
                    { value: ethers.utils.parseEther('100') }
                )
            );
            await callTransaction(
                getPrestigePadTx_ContributeCurrentRound(
                    prestigePad,
                    depositor3,
                    {
                        launchId: BigNumber.from(2),
                        quantity: BigNumber.from(100),
                    },
                    { value: ethers.utils.parseEther('100') }
                )
            );
        }

        if (confirmSecondRound || doAllSecondFound) {
            await callTransaction(
                getPrestigePadTxByParams_SafeConfirmCurrentRound(
                    prestigePad,
                    initiator1,
                    { launchId: BigNumber.from(1) },
                    { value: ethers.utils.parseEther('100') }
                )
            );

            await callTransaction(
                getPrestigePadTxByParams_SafeConfirmCurrentRound(prestigePad, initiator2, {
                    launchId: BigNumber.from(2),
                })
            );
        }

        if (finalizeLaunch) {
            await callTransaction(
                getPrestigePadTxByParams_SafeFinalize(prestigePad, initiator1, {
                    launchId: BigNumber.from(1),
                })
            );

            await callTransaction(
                getPrestigePadTxByParams_SafeFinalize(prestigePad, initiator2, {
                    launchId: BigNumber.from(2),
                })
            );
        }

        if (pause) {
            await callTransaction(getPausableTxByInput_Pause(prestigePad, deployer, admin, admins));
        }

        return {
            ...fixture,
            currencies,
        };
    }

    /* --- Initialization --- */
    describe('7.1.1. initialize(address,address,address,address,address,address,uint256,uint256)', async () => {
        it('7.1.1.1. Deploy successfully', async () => {
            const { admin, prestigePad, projectToken, feeReceiver, priceWatcher, reserveVault, validator } =
                await beforePrestigePadTest({});

            const tx = prestigePad.deployTransaction;
            await expect(tx)
                .to.emit(prestigePad, 'BaseUnitPriceRangeUpdate')
                .withArgs(
                    LaunchInitialization.PRESTIGE_PAD_BaseMinUnitPrice,
                    LaunchInitialization.PRESTIGE_PAD_BaseMaxUnitPrice
                );

            expect(await prestigePad.baseMinUnitPrice()).to.equal(LaunchInitialization.PRESTIGE_PAD_BaseMinUnitPrice);
            expect(await prestigePad.baseMaxUnitPrice()).to.equal(LaunchInitialization.PRESTIGE_PAD_BaseMaxUnitPrice);

            expect(await prestigePad.launchNumber()).to.equal(0);
            expect(await prestigePad.roundNumber()).to.equal(0);

            expect(await prestigePad.paused()).to.equal(false);

            expect(await prestigePad.admin()).to.equal(admin.address);
            expect(await prestigePad.feeReceiver()).to.equal(feeReceiver.address);
            expect(await prestigePad.projectToken()).to.equal(projectToken.address);
            expect(await prestigePad.priceWatcher()).to.equal(priceWatcher.address);
            expect(await prestigePad.reserveVault()).to.equal(reserveVault.address);
            expect(await prestigePad.validator()).to.equal(validator.getAddress());
        });
    });

    /* --- Administration --- */
    describe('7.1.2. updateBaseUnitPriceRange(uint256,uint256,bytes[])', async () => {
        it('7.1.2.1. Update base unit price range successfully with valid signatures', async () => {
            const { deployer, admin, admins, prestigePad } = await beforePrestigePadTest({});

            const paramsInput: UpdateBaseUnitPriceRangeParamsInput = {
                baseMinUnitPrice: BigNumber.from(20),
                baseMaxUnitPrice: BigNumber.from(100),
            };
            const tx = await getPrestigePadTxByInput_UpdateBaseUnitPriceRange(
                prestigePad,
                deployer,
                paramsInput,
                admin,
                admins
            );
            await tx.wait();

            await expect(tx)
                .to.emit(prestigePad, 'BaseUnitPriceRangeUpdate')
                .withArgs(paramsInput.baseMinUnitPrice, paramsInput.baseMaxUnitPrice);

            expect(await prestigePad.baseMinUnitPrice()).to.equal(paramsInput.baseMinUnitPrice);
            expect(await prestigePad.baseMaxUnitPrice()).to.equal(paramsInput.baseMaxUnitPrice);
        });

        it('7.1.2.2. Update base unit price range unsuccessfully with invalid signatures', async () => {
            const { deployer, admin, admins, prestigePad } = await beforePrestigePadTest({});

            const paramsInput: UpdateBaseUnitPriceRangeParamsInput = {
                baseMinUnitPrice: BigNumber.from(20),
                baseMaxUnitPrice: BigNumber.from(100),
            };
            const params: UpdateBaseUnitPriceRangeParams = {
                ...paramsInput,
                signatures: await getUpdateBaseUnitPriceRangeSignatures(prestigePad, paramsInput, admin, admins, false),
            };
            await expect(
                getPrestigePadTx_UpdateBaseUnitPriceRange(prestigePad, deployer, params)
            ).to.be.revertedWithCustomError(admin, 'FailedVerification');
        });

        it('7.1.2.3. Update base unit price range unsuccessfully with invalid price range', async () => {
            const { deployer, admin, admins, prestigePad } = await beforePrestigePadTest({});

            await expect(
                getPrestigePadTxByInput_UpdateBaseUnitPriceRange(
                    prestigePad,
                    deployer,
                    {
                        baseMinUnitPrice: BigNumber.from(101),
                        baseMaxUnitPrice: BigNumber.from(100),
                    },
                    admin,
                    admins
                )
            ).to.be.revertedWithCustomError(prestigePad, 'InvalidInput');
        });
    });

    /* --- Query --- */
    describe('7.1.3. getLaunch(uint256)', async () => {
        it('7.1.3.1. Return correct launch with valid launch id', async () => {
            const fixture = await beforePrestigePadTest({
                addSampleLaunch: true,
            });

            const { prestigePad } = fixture;

            await expect(prestigePad.getLaunch(1)).to.not.be.reverted;
            await expect(prestigePad.getLaunch(2)).to.not.be.reverted;
        });

        it('7.1.3.2. Revert with invalid launch id', async () => {
            const fixture = await beforePrestigePadTest();

            const { prestigePad } = fixture;

            await expect(prestigePad.getLaunch(0)).to.be.revertedWithCustomError(prestigePad, 'InvalidLaunchId');
            await expect(prestigePad.getLaunch(100)).to.be.revertedWithCustomError(prestigePad, 'InvalidLaunchId');
        });
    });

    describe('7.1.4. getRound(uint256)', async () => {
        it('7.1.4.1. Return correct round with valid round id', async () => {
            const fixture = await beforePrestigePadTest({
                addSampleLaunch: true,
                addSampleRounds: true,
            });

            const { prestigePad } = fixture;

            const roundId1 = (await prestigePad.getLaunch(1)).roundIds[1];
            await expect(prestigePad.getRound(roundId1)).to.not.be.reverted;

            const roundId2 = (await prestigePad.getLaunch(2)).roundIds[1];
            await expect(prestigePad.getRound(roundId2)).to.not.be.reverted;
        });

        it('7.1.4.2. Revert with invalid round id', async () => {
            const fixture = await beforePrestigePadTest();

            const { prestigePad } = fixture;

            await expect(prestigePad.getRound(0)).to.be.revertedWithCustomError(prestigePad, 'InvalidRoundId');
            await expect(prestigePad.getRound(100)).to.be.revertedWithCustomError(prestigePad, 'InvalidRoundId');
        });
    });

    describe('7.1.5. allocationOfAt(address,uint256,uint256)', async () => {
        it('7.1.5.1. Return correct allocation', async () => {
            const fixture = await beforePrestigePadTest({
                addSampleLaunch: true,
                addSampleRounds: true,
            });

            const { prestigePad, depositor1, initiator1, projectToken } = fixture;

            const launchId = 1;
            const depositor = depositor1;

            const depositRound1Turn1 = 5;
            const depositRound1Turn2 = 10;
            const depositRound1 = depositRound1Turn1 + depositRound1Turn2;
            const depositRound2 = 200;

            const units = BigNumber.from(10).pow(await projectToken.decimals());

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

            let timestamp = (await time.latest()) + 100;

            async function assertCorrectAllocation(currentTimestamp: number) {
                for (const timestamp of timePivots) {
                    if (timestamp > currentTimestamp) {
                        break;
                    }
                    expect(await prestigePad.allocationOfAt(depositor.address, launchId, timestamp)).to.equal(
                        expectedAllocations.get(timestamp)
                    );
                }
            }

            // Test after round 1 start
            await callTransactionAtTimestamp(
                getPrestigePadTx_ScheduleNextRound(prestigePad, initiator1, {
                    launchId: BigNumber.from(launchId),
                    cashbackThreshold: BigNumber.from(0),
                    cashbackBaseRate: BigNumber.from(0),
                    cashbackCurrencies: [],
                    cashbackDenominations: [],
                    raiseStartsAt: timestamp,
                    raiseDuration: Constant.PRESTIGE_PAD_RAISE_MINIMUM_DURATION,
                }),
                timestamp
            );

            addTimePivot(0);
            addTimePivot(timestamp);
            await time.increaseTo(timestamp + 5);
            await assertCorrectAllocation(timestamp + 5);

            // Test after round 1 first deposit
            timestamp += 10;
            await callTransactionAtTimestamp(
                getPrestigePadTx_ContributeCurrentRound(
                    prestigePad,
                    depositor,
                    {
                        launchId: BigNumber.from(launchId),
                        quantity: BigNumber.from(depositRound1Turn1),
                    },
                    { value: ethers.utils.parseEther('10') }
                ),
                timestamp
            );

            addTimePivot(timestamp);
            await time.increaseTo(timestamp + 5);
            await assertCorrectAllocation(timestamp + 5);

            // Test after round 1 second deposit
            timestamp += 10;
            await callTransactionAtTimestamp(
                getPrestigePadTx_ContributeCurrentRound(
                    prestigePad,
                    depositor,
                    {
                        launchId: BigNumber.from(launchId),
                        quantity: BigNumber.from(depositRound1Turn2),
                    },
                    { value: ethers.utils.parseEther('10') }
                ),
                timestamp
            );

            addTimePivot(timestamp);
            await time.increaseTo(timestamp + 5);
            await assertCorrectAllocation(timestamp + 5);

            // Test after round 1 confirm
            timestamp += 10;
            await callTransactionAtTimestamp(
                getPrestigePadTxByParams_SafeConfirmCurrentRound(prestigePad, initiator1, {
                    launchId: BigNumber.from(launchId),
                }),
                timestamp
            );

            expectedAllocations.set(timestamp, BigNumber.from(depositRound1).mul(units));

            addTimePivot(timestamp);
            await time.increaseTo(timestamp + 5);
            await assertCorrectAllocation(timestamp + 5);

            // Test after round 2 start
            timestamp += 10;
            await callTransactionAtTimestamp(
                getPrestigePadTx_ScheduleNextRound(prestigePad, initiator1, {
                    launchId: BigNumber.from(launchId),
                    cashbackThreshold: BigNumber.from(0),
                    cashbackBaseRate: BigNumber.from(0),
                    cashbackCurrencies: [],
                    cashbackDenominations: [],
                    raiseStartsAt: timestamp,
                    raiseDuration: Constant.PRESTIGE_PAD_RAISE_MINIMUM_DURATION,
                }),
                timestamp
            );

            addTimePivot(timestamp);
            await time.increaseTo(timestamp + 5);
            await assertCorrectAllocation(timestamp + 5);

            // Test after round 2 deposit
            timestamp += 10;
            await callTransactionAtTimestamp(
                getPrestigePadTx_ContributeCurrentRound(
                    prestigePad,
                    depositor,
                    {
                        launchId: BigNumber.from(launchId),
                        quantity: BigNumber.from(depositRound2),
                    },
                    { value: ethers.utils.parseEther('10') }
                ),
                timestamp
            );

            addTimePivot(timestamp);
            await time.increaseTo(timestamp + 5);
            await assertCorrectAllocation(timestamp + 5);

            // Test after round 2 confirm
            timestamp += 10;
            await callTransactionAtTimestamp(
                getPrestigePadTxByParams_SafeConfirmCurrentRound(prestigePad, initiator1, {
                    launchId: BigNumber.from(launchId),
                }),
                timestamp
            );

            expectedAllocations.set(timestamp, BigNumber.from(depositRound1 + depositRound2).mul(units));

            addTimePivot(timestamp);
            await time.increaseTo(timestamp + 5);
            await assertCorrectAllocation(timestamp + 5);

            // Test after finalizing launch
            timestamp += 10;
            await callTransactionAtTimestamp(
                getPrestigePadTxByParams_SafeFinalize(prestigePad, initiator1, {
                    launchId: BigNumber.from(launchId),
                }),
                timestamp
            );

            addTimePivot(timestamp);
            await time.increaseTo(timestamp + 5);
            await assertCorrectAllocation(timestamp + 5);

            // Test after withdrawing project token of first round
            timestamp += 10;
            await callTransactionAtTimestamp(
                getPrestigePadTx_WithdrawProjectToken(prestigePad, depositor, {
                    launchId: BigNumber.from(launchId),
                    index: BigNumber.from(1),
                }),
                timestamp
            );

            expectedAllocations.set(timestamp, BigNumber.from(depositRound2).mul(units));

            addTimePivot(timestamp);
            await time.increaseTo(timestamp + 5);
            await assertCorrectAllocation(timestamp + 5);

            // Test after withdrawing project token of second round
            timestamp += 10;
            await callTransactionAtTimestamp(
                getPrestigePadTx_WithdrawProjectToken(prestigePad, depositor, {
                    launchId: BigNumber.from(launchId),
                    index: BigNumber.from(2),
                }),
                timestamp
            );

            expectedAllocations.set(timestamp, BigNumber.from(0));

            addTimePivot(timestamp);
            await time.increaseTo(timestamp + 5);
            await assertCorrectAllocation(timestamp + 5);
        });

        it('7.1.5.2. Revert with invalid launch id', async () => {
            const fixture = await beforePrestigePadTest();

            const { prestigePad, depositor1 } = fixture;

            await expect(prestigePad.allocationOfAt(depositor1.address, 0, 0)).to.be.revertedWithCustomError(
                prestigePad,
                'InvalidLaunchId'
            );
            await expect(prestigePad.allocationOfAt(depositor1.address, 0, 100)).to.be.revertedWithCustomError(
                prestigePad,
                'InvalidLaunchId'
            );
        });

        it('7.1.5.3. Revert with timestamp after current timestamp', async () => {
            const fixture = await beforePrestigePadTest({
                addSampleLaunch: true,
                addSampleRounds: true,
            });

            const { prestigePad, depositor1 } = fixture;

            let timestamp = await time.latest();

            await expect(prestigePad.allocationOfAt(depositor1.address, 1, timestamp - 1)).to.not.be.reverted;
            await expect(prestigePad.allocationOfAt(depositor1.address, 1, timestamp)).to.not.be.reverted;
            await expect(
                prestigePad.allocationOfAt(depositor1.address, 1, timestamp + 1)
            ).to.be.revertedWithCustomError(prestigePad, 'InvalidTimestamp');
        });
    });

    describe('7.1.6. supportsInterface(bytes4)', () => {
        it('7.1.6.1. Return true for appropriate interface', async () => {
            const fixture = await beforePrestigePadTest();
            const { prestigePad } = fixture;

            expect(await prestigePad.supportsInterface(getBytes4Hex(IProjectTokenReceiverInterfaceId))).to.equal(true);
            expect(await prestigePad.supportsInterface(getBytes4Hex(IProjectLaunchpadInterfaceId))).to.equal(true);
            expect(await prestigePad.supportsInterface(getBytes4Hex(IERC165UpgradeableInterfaceId))).to.equal(true);
        });
    });

    describe('7.1.7. onERC1155Received(address,address,uint256,uint256,bytes)', async () => {
        it('7.1.7.1. Successfully receive project token', async () => {
            const fixture = await beforePrestigePadTest({
                addSampleLaunch: true,
                addSampleRounds: true,
                doAllFirstFound: true,
            });
            const { depositor1, prestigePad, projectToken } = fixture;

            await callTransaction(prestigePad.connect(depositor1).withdrawProjectToken(1, 1));

            await expect(
                projectToken.connect(depositor1).safeTransferFrom(depositor1.address, prestigePad.address, 1, 50, '0x')
            ).to.not.be.reverted;
        });

        it('7.1.7.2. Revert when receiving unknown ERC1155 token', async () => {
            const fixture = await beforePrestigePadTest();
            const { deployer, depositor1, prestigePad, admin } = fixture;

            const unknownERC1155Token = await deployGovernor(deployer, admin.address);

            await callTransaction(unknownERC1155Token.connect(depositor1).mint(1, 50));

            await expect(
                unknownERC1155Token
                    .connect(depositor1)
                    .safeTransferFrom(depositor1.address, prestigePad.address, 1, 50, '0x')
            ).to.be.revertedWith('ERC1155: ERC1155Receiver rejected tokens');
        });
    });

    describe('7.1.8. onERC1155BatchReceived(address,address,uint256[],uint256[],bytes)', async () => {
        it('7.1.8.1. Successfully receive project tokens batch', async () => {
            const fixture = await beforePrestigePadTest({
                addSampleLaunch: true,
                addSampleRounds: true,
                doAllFirstFound: true,
            });
            const { depositor1, prestigePad, projectToken } = fixture;

            await callTransaction(prestigePad.connect(depositor1).withdrawProjectToken(1, 1));
            await callTransaction(prestigePad.connect(depositor1).withdrawProjectToken(2, 1));

            await callTransaction(
                projectToken
                    .connect(depositor1)
                    .safeBatchTransferFrom(depositor1.address, prestigePad.address, [1, 2], [10, 5], '0x')
            );
        });

        it('7.1.8.2. Revert when receiving ERC1155 tokens batch from unknown ERC1155 token', async () => {
            const fixture = await beforePrestigePadTest();
            const { deployer, depositor1, admin, projectToken } = fixture;

            const unknownERC1155Token = await deployGovernor(deployer, admin.address);

            await callTransaction(unknownERC1155Token.connect(depositor1).mint(1, 50));
            await callTransaction(unknownERC1155Token.connect(depositor1).mint(2, 50));

            await expect(
                unknownERC1155Token
                    .connect(depositor1)
                    .safeBatchTransferFrom(depositor1.address, projectToken.address, [1, 2], [10, 5], '0x')
            ).to.be.revertedWith('ERC1155: ERC1155Receiver rejected tokens');
        });
    });

    /* --- Command --- */
    describe('7.1.9. initiateLaunch(address,bytes32,string,string,uint256,uint256,(uint256,uint256,bytes))', async () => {
        async function beforeInitiateLaunchTest(fixture: PrestigePadFixture): Promise<{
            defaultParamsInput: InitiateLaunchParamsInput;
        }> {
            const { initiator1, zone1 } = fixture;

            const defaultParamsInput: InitiateLaunchParamsInput = {
                initiator: initiator1.address,
                zone: zone1,
                projectURI: 'project_uri_1',
                launchURI: 'launch_uri_1',
                initialQuantity: BigNumber.from(1000),
                feeRate: BigNumber.from(1000),
            };

            return { defaultParamsInput };
        }

        it('7.1.9.1. Initiate launch successfully', async () => {
            const fixture = await beforePrestigePadTest({});

            const { prestigePad, validator, projectToken, manager, moderator, initiator1, zone1, initiator2, zone2 } =
                fixture;

            // Tx1: By manager, with initial quantity
            const paramsInput1: InitiateLaunchParamsInput = {
                initiator: initiator1.address,
                zone: zone1,
                projectURI: 'project_uri_1',
                launchURI: 'launch_uri_1',
                initialQuantity: BigNumber.from(1000),
                feeRate: ethers.utils.parseEther('0.1'),
            };

            let timestamp = (await time.latest()) + 1000;

            await time.setNextBlockTimestamp(timestamp);

            const launchId1 = 1;
            const projectId1 = 1;
            const roundId1 = 1;

            let prestigePadInitBalance1 = await projectToken.balanceOf(prestigePad.address, projectId1);
            let initiatorInitBalance1 = await projectToken.balanceOf(paramsInput1.initiator, projectId1);

            const tx1 = await getPrestigePadTxByInput_InitiateLaunch(prestigePad, manager, paramsInput1, validator);
            await tx1.wait();

            await expect(tx1)
                .to.emit(prestigePad, 'NewLaunch')
                .withArgs(
                    projectId1,
                    launchId1,
                    paramsInput1.initiator,
                    paramsInput1.launchURI,
                    paramsInput1.initialQuantity,
                    (rate: Rate) => {
                        expect(structToObject(rate)).to.deep.equal({
                            value: paramsInput1.feeRate,
                            decimals: Constant.COMMON_RATE_DECIMALS,
                        });
                        return true;
                    }
                );

            expect(await projectToken.projectNumber()).to.equal(1);
            const project1 = await projectToken.getProject(projectId1);
            expect(project1.zone).to.equal(paramsInput1.zone);
            expect(project1.estateId).to.equal(0);
            expect(project1.launchId).to.equal(launchId1);
            expect(project1.launchpad).to.equal(prestigePad.address);
            expect(project1.tokenizeAt).to.equal(timestamp);
            expect(project1.deprecateAt).to.equal(Constant.COMMON_INFINITE_TIMESTAMP);
            expect(project1.initiator).to.equal(paramsInput1.initiator);

            expect(await prestigePad.launchNumber()).to.equal(1);

            const launch1 = await prestigePad.getLaunch(launchId1);
            expect(launch1.projectId).to.equal(projectId1);
            expect(launch1.roundIds.length).to.equal(1);
            expect(launch1.roundIds[0]).to.equal(roundId1);
            expect(launch1.uri).to.equal(paramsInput1.launchURI);
            expect(launch1.initiator).to.equal(paramsInput1.initiator);
            expect(launch1.isFinalized).to.equal(false);
            expect(launch1.currentIndex).to.equal(0);
            expect(structToObject(launch1.feeRate)).to.deep.equal({
                value: paramsInput1.feeRate,
                decimals: Constant.COMMON_RATE_DECIMALS,
            });

            expect(await prestigePad.roundNumber()).to.equal(1);

            const round1 = await prestigePad.getRound(roundId1);
            expect(round1.quota.totalQuantity).to.equal(paramsInput1.initialQuantity);
            expect(round1.agenda.raiseStartsAt).to.equal(timestamp);
            expect(round1.agenda.confirmAt).to.equal(timestamp);

            const initialAmount1 = paramsInput1.initialQuantity.mul(
                BigNumber.from(10).pow(Constant.PROJECT_TOKEN_MAX_DECIMALS)
            );
            expect(await projectToken.balanceOf(prestigePad.address, projectId1)).to.equal(prestigePadInitBalance1);
            expect(await projectToken.balanceOf(paramsInput1.initiator, projectId1)).to.equal(
                initiatorInitBalance1.add(initialAmount1)
            );

            // Tx2: By moderator
            const paramsInput2: InitiateLaunchParamsInput = {
                initiator: initiator2.address,
                zone: zone2,
                projectURI: 'project_uri_2',
                launchURI: 'launch_uri_2',
                initialQuantity: BigNumber.from(0),
                feeRate: ethers.utils.parseEther('0.2'),
            };

            timestamp += 10;

            await time.setNextBlockTimestamp(timestamp);

            const launchId2 = 2;
            const projectId2 = 2;
            const roundId2 = 2;

            const initialAmount2 = paramsInput2.initialQuantity.mul(
                BigNumber.from(10).pow(Constant.PROJECT_TOKEN_MAX_DECIMALS)
            );
            let prestigePadInitBalance2 = await projectToken.balanceOf(prestigePad.address, projectId2);
            let initiatorInitBalance2 = await projectToken.balanceOf(paramsInput2.initiator, projectId2);

            const tx2 = await getPrestigePadTxByInput_InitiateLaunch(prestigePad, moderator, paramsInput2, validator);
            await tx2.wait();

            await expect(tx2)
                .to.emit(prestigePad, 'NewLaunch')
                .withArgs(
                    projectId2,
                    launchId2,
                    paramsInput2.initiator,
                    paramsInput2.launchURI,
                    paramsInput2.initialQuantity,
                    (rate: Rate) => {
                        expect(structToObject(rate)).to.deep.equal({
                            value: paramsInput2.feeRate,
                            decimals: Constant.COMMON_RATE_DECIMALS,
                        });
                        return true;
                    }
                );

            expect(await projectToken.projectNumber()).to.equal(2);
            const project2 = await projectToken.getProject(projectId2);
            expect(project2.zone).to.equal(paramsInput2.zone);
            expect(project2.estateId).to.equal(0);
            expect(project2.launchId).to.equal(launchId2);
            expect(project2.launchpad).to.equal(prestigePad.address);
            expect(project2.tokenizeAt).to.equal(timestamp);
            expect(project2.deprecateAt).to.equal(Constant.COMMON_INFINITE_TIMESTAMP);
            expect(project2.initiator).to.equal(paramsInput2.initiator);

            expect(await prestigePad.launchNumber()).to.equal(2);

            const launch2 = await prestigePad.getLaunch(launchId2);
            expect(launch2.projectId).to.equal(projectId2);
            expect(launch2.roundIds.length).to.equal(1);
            expect(launch2.roundIds[0]).to.equal(roundId2);
            expect(launch2.uri).to.equal(paramsInput2.launchURI);
            expect(launch2.initiator).to.equal(paramsInput2.initiator);
            expect(launch2.isFinalized).to.equal(false);
            expect(launch2.currentIndex).to.equal(0);
            expect(structToObject(launch2.feeRate)).to.deep.equal({
                value: paramsInput2.feeRate,
                decimals: Constant.COMMON_RATE_DECIMALS,
            });

            expect(await prestigePad.roundNumber()).to.equal(2);

            const round2 = await prestigePad.getRound(roundId2);
            expect(round2.quota.totalQuantity).to.equal(paramsInput2.initialQuantity);
            expect(round2.agenda.raiseStartsAt).to.equal(timestamp);
            expect(round2.agenda.confirmAt).to.equal(timestamp);

            expect(await projectToken.balanceOf(prestigePad.address, projectId2)).to.equal(prestigePadInitBalance2);
            expect(await projectToken.balanceOf(paramsInput2.initiator, projectId2)).to.equal(
                initiatorInitBalance2.add(initialAmount2)
            );
        });

        it('7.1.9.2. Initiate launch unsuccessfully when the contract is reentered', async () => {
            const fixture = await beforePrestigePadTest();

            const { prestigePad, validator, manager, zone1, deployer, projectToken } = fixture;

            const reentrancy = await deployReentrancyReceiver(deployer, true, true);

            await callTransaction(
                getProjectTokenTxByInput_RegisterInitiator(
                    projectToken as any,
                    manager,
                    {
                        zone: zone1,
                        initiator: reentrancy.address,
                        uri: 'initiator_uri_1',
                    },
                    validator
                )
            );

            await testReentrancy_prestigePad(fixture, reentrancy, async (timestamp: number) => {
                await expect(
                    getPrestigePadTxByInput_InitiateLaunch(
                        prestigePad,
                        manager,
                        {
                            initiator: reentrancy.address,
                            zone: zone1,
                            projectURI: 'project_uri_1',
                            launchURI: 'launch_uri_1',
                            initialQuantity: BigNumber.from(1000),
                            feeRate: ethers.utils.parseEther('0.1'),
                        },
                        validator
                    )
                ).to.be.revertedWith('ReentrancyGuard: reentrant call');
            });
        });

        it('7.1.9.3. Initiate launch unsuccessfully by non-executive account', async () => {
            const fixture = await beforePrestigePadTest();

            const { prestigePad, user, validator } = fixture;

            const { defaultParamsInput } = await beforeInitiateLaunchTest(fixture);

            await expect(
                getPrestigePadTxByInput_InitiateLaunch(prestigePad, user, defaultParamsInput, validator)
            ).to.be.revertedWithCustomError(prestigePad, 'Unauthorized');
        });

        it('7.1.9.4. Initiate launch unsuccessfully when paused', async () => {
            const fixture = await beforePrestigePadTest({
                pause: true,
            });
            const { prestigePad, manager, validator } = fixture;

            const { defaultParamsInput } = await beforeInitiateLaunchTest(fixture);

            await expect(
                getPrestigePadTxByInput_InitiateLaunch(prestigePad, manager, defaultParamsInput, validator)
            ).to.be.revertedWith('Pausable: paused');
        });

        it('7.1.9.5. Initiate launch unsuccessfully with invalid validation', async () => {
            const fixture = await beforePrestigePadTest();

            const { prestigePad, manager, validator } = fixture;

            const { defaultParamsInput } = await beforeInitiateLaunchTest(fixture);

            const params: InitiateLaunchParams = {
                ...defaultParamsInput,
                validation: await getInitiateLaunchValidation(prestigePad, defaultParamsInput, validator, false),
            };
            await expect(getPrestigePadTx_InitiateLaunch(prestigePad, manager, params)).to.be.revertedWithCustomError(
                prestigePad,
                'InvalidSignature'
            );
        });

        it('7.1.9.6. Initiate launch unsuccessfully with inactive zone', async () => {
            const fixture = await beforePrestigePadTest();

            const { prestigePad, manager, validator } = fixture;

            const { defaultParamsInput } = await beforeInitiateLaunchTest(fixture);

            await expect(
                getPrestigePadTxByInput_InitiateLaunch(
                    prestigePad,
                    manager,
                    {
                        ...defaultParamsInput,
                        zone: ethers.utils.formatBytes32String('invalid zone'),
                    },
                    validator
                )
            ).to.be.revertedWithCustomError(prestigePad, 'Unauthorized');
        });

        it('7.1.9.7. Initiate launch unsuccessfully when sender is not authorized in zone', async () => {
            const fixture = await beforePrestigePadTest();

            const { deployer, admin, admins, prestigePad, manager, validator } = fixture;

            const { defaultParamsInput } = await beforeInitiateLaunchTest(fixture);

            await callTransaction(
                getAdminTxByInput_ActivateIn(
                    admin,
                    deployer,
                    {
                        zone: defaultParamsInput.zone,
                        accounts: [manager.address],
                        isActive: false,
                    },
                    admins
                )
            );

            await expect(
                getPrestigePadTxByInput_InitiateLaunch(prestigePad, manager, defaultParamsInput, validator)
            ).to.be.revertedWithCustomError(prestigePad, 'Unauthorized');
        });

        it('7.1.9.8. Initiate launch unsuccessfully when initiator is not registered in zone', async () => {
            const fixture = await beforePrestigePadTest({
                skipAuthorizeInitiators: true,
            });

            const { prestigePad, manager, validator } = fixture;

            const { defaultParamsInput } = await beforeInitiateLaunchTest(fixture);

            await expect(
                getPrestigePadTxByInput_InitiateLaunch(prestigePad, manager, defaultParamsInput, validator)
            ).to.be.revertedWithCustomError(prestigePad, 'NotRegisteredInitiator');
        });

        it('7.1.9.9. Initiate launch unsuccessfully when launching project failed', async () => {
            const fixture = await beforePrestigePadTest();

            const { deployer, admin, manager, projectToken, admins, validator, prestigePad } = fixture;

            const { defaultParamsInput } = await beforeInitiateLaunchTest(fixture);

            await callTransaction(getPausableTxByInput_Pause(projectToken as any, deployer, admin, admins));

            await expect(
                getPrestigePadTxByInput_InitiateLaunch(prestigePad, manager, defaultParamsInput, validator)
            ).to.be.revertedWith('Pausable: paused');
        });

        it('7.1.9.10. Initiate launch unsuccessfully when initiator cannot receive ERC1155 token', async () => {
            const fixture = await beforePrestigePadTest();

            const { prestigePad, manager, deployer, projectToken, validator, zone1 } = fixture;

            const { defaultParamsInput } = await beforeInitiateLaunchTest(fixture);

            const failReceiver = await deployFailReceiver(deployer, false, true);

            await callTransaction(
                getProjectTokenTxByInput_RegisterInitiator(
                    projectToken as any,
                    manager,
                    {
                        zone: zone1,
                        initiator: failReceiver.address,
                        uri: 'initiator_uri_1',
                    },
                    validator
                )
            );

            await expect(
                getPrestigePadTxByInput_InitiateLaunch(
                    prestigePad,
                    manager,
                    {
                        ...defaultParamsInput,
                        initiator: failReceiver.address,
                    },
                    validator
                )
            ).to.be.revertedWith('Fail');
        });
    });

    describe('7.1.10. updateLaunchURI(uint256,string,(uint256,uint256,bytes))', async () => {
        async function beforeUpdateLaunchURITest(fixture: PrestigePadFixture): Promise<{
            defaultParamsInput: UpdateLaunchURIParamsInput;
        }> {
            const defaultParamsInput: UpdateLaunchURIParamsInput = {
                launchId: BigNumber.from(1),
                uri: 'new_launch_uri_1',
            };

            return { defaultParamsInput };
        }

        it('7.1.10.1. Update launch uri successfully', async () => {
            const fixture = await beforePrestigePadTest({
                addSampleLaunch: true,
            });

            const { prestigePad, initiator1, initiator2, validator } = fixture;

            const paramsInput1: UpdateLaunchURIParamsInput = {
                launchId: BigNumber.from(1),
                uri: 'new_launch_uri_1',
            };
            const tx1 = await getPrestigePadTxByInput_UpdateLaunchURI(prestigePad, initiator1, paramsInput1, validator);
            await tx1.wait();

            const launch1 = await prestigePad.getLaunch(paramsInput1.launchId);
            expect(launch1.uri).to.equal(paramsInput1.uri);

            const paramsInput2: UpdateLaunchURIParamsInput = {
                launchId: BigNumber.from(2),
                uri: 'new_launch_uri_2',
            };
            const tx2 = await getPrestigePadTxByInput_UpdateLaunchURI(prestigePad, initiator2, paramsInput2, validator);
            await tx2.wait();

            const launch2 = await prestigePad.getLaunch(paramsInput2.launchId);
            expect(launch2.uri).to.equal(paramsInput2.uri);
        });

        it('7.1.10.2. Update launch uri unsuccessfully with invalid launch id', async () => {
            const fixture = await beforePrestigePadTest();

            const { prestigePad, manager, validator } = fixture;

            const { defaultParamsInput } = await beforeUpdateLaunchURITest(fixture);
            await expect(
                getPrestigePadTxByInput_UpdateLaunchURI(
                    prestigePad,
                    manager,
                    {
                        ...defaultParamsInput,
                        launchId: BigNumber.from(0),
                    },
                    validator
                )
            ).to.be.revertedWithCustomError(prestigePad, 'InvalidLaunchId');

            const paramsInput2 = {
                ...defaultParamsInput,
                launchId: BigNumber.from(100),
            };
            await expect(
                getPrestigePadTxByInput_UpdateLaunchURI(prestigePad, manager, paramsInput2, validator)
            ).to.be.revertedWithCustomError(prestigePad, 'InvalidLaunchId');
        });

        it('7.1.10.3. Update launch uri unsuccessfully when sender is not launch initiator', async () => {
            const fixture = await beforePrestigePadTest({
                addSampleLaunch: true,
            });

            const { prestigePad, manager, validator, initiator2 } = fixture;

            const { defaultParamsInput } = await beforeUpdateLaunchURITest(fixture);

            // By manager
            await expect(
                getPrestigePadTxByInput_UpdateLaunchURI(prestigePad, manager, defaultParamsInput, validator)
            ).to.be.revertedWithCustomError(prestigePad, 'Unauthorized');

            // By wrong initiator
            await expect(
                getPrestigePadTxByInput_UpdateLaunchURI(prestigePad, initiator2, defaultParamsInput, validator)
            ).to.be.revertedWithCustomError(prestigePad, 'Unauthorized');
        });

        it('7.1.10.4. Update launch uri unsuccessfully when paused', async () => {
            const fixture = await beforePrestigePadTest({
                addSampleLaunch: true,
                pause: true,
            });

            const { prestigePad, initiator1, validator } = fixture;

            const { defaultParamsInput } = await beforeUpdateLaunchURITest(fixture);

            await expect(
                getPrestigePadTxByInput_UpdateLaunchURI(prestigePad, initiator1, defaultParamsInput, validator)
            ).to.be.revertedWith('Pausable: paused');
        });

        it('7.1.10.5. Update launch uri unsuccessfully with invalid validation', async () => {
            const fixture = await beforePrestigePadTest({
                addSampleLaunch: true,
            });

            const { prestigePad, initiator1, validator } = fixture;

            const { defaultParamsInput } = await beforeUpdateLaunchURITest(fixture);
            const params: UpdateLaunchURIParams = {
                ...defaultParamsInput,
                validation: await getUpdateLaunchURIValidation(prestigePad, defaultParamsInput, validator, false),
            };

            await expect(
                getPrestigePadTx_UpdateLaunchURI(prestigePad, initiator1, params)
            ).to.be.revertedWithCustomError(prestigePad, 'InvalidSignature');
        });

        it('7.1.10.6. Update launch uri unsuccessfully with finalized launch', async () => {
            const fixture = await beforePrestigePadTest({
                addSampleLaunch: true,
                addSampleRounds: true,
                doAllFirstFound: true,
                doAllSecondFound: true,
                finalizeLaunch: true,
            });

            const { prestigePad, initiator1, validator } = fixture;

            const { defaultParamsInput } = await beforeUpdateLaunchURITest(fixture);

            await expect(
                getPrestigePadTxByInput_UpdateLaunchURI(prestigePad, initiator1, defaultParamsInput, validator)
            ).to.be.revertedWithCustomError(prestigePad, 'AlreadyFinalized');
        });
    });

    describe('7.1.11. updateRound(uint256,uint256,(string,(uint256,uint256,uint256),(uint256,address), (uint256,uint256,bytes)))', async () => {
        async function beforeUpdateRoundTest(fixture: PrestigePadFixture): Promise<{
            defaultParamsInput: UpdateRoundParamsInput;
        }> {
            const { currencies } = fixture;

            const defaultParamsInput: UpdateRoundParamsInput = {
                launchId: BigNumber.from(1),
                index: BigNumber.from(1),
                round: {
                    uri: 'new_round_uri_1',
                    quota: {
                        totalQuantity: BigNumber.from(1001),
                        minRaisingQuantity: BigNumber.from(101),
                        maxRaisingQuantity: BigNumber.from(701),
                    },
                    quote: {
                        unitPrice: ethers.utils.parseEther('150.1'),
                        currency: currencies[0].address,
                    },
                },
            };

            return { defaultParamsInput };
        }

        it('7.1.11.1. Update round successfully', async () => {
            const fixture = await beforePrestigePadTest({
                addSampleLaunch: true,
                addSampleRounds: true,
            });

            const { prestigePad, validator, initiator1 } = fixture;

            const { defaultParamsInput: params } = await beforeUpdateRoundTest(fixture);

            const validation = await getUpdateRoundValidation(prestigePad, params, validator);
            const roundWithValidation = {
                ...params.round,
                validation,
            };

            const currentRoundNumber = await prestigePad.roundNumber();
            const currentRoundIds = (await prestigePad.getLaunch(params.launchId)).roundIds;

            const tx = await prestigePad
                .connect(initiator1)
                .updateRound(params.launchId, params.index, roundWithValidation);

            const roundId = currentRoundNumber.add(1);

            await expect(tx)
                .to.emit(prestigePad, 'NewRound')
                .withArgs(
                    roundId,
                    params.launchId,
                    params.round.uri,
                    (quota: any) => {
                        expect(structToObject(quota)).to.deep.equal(params.round.quota);
                        return true;
                    },
                    (quote: any) => {
                        expect(structToObject(quote)).to.deep.equal(params.round.quote);
                        return true;
                    }
                );

            await expect(tx).to.emit(prestigePad, 'LaunchRoundUpdate').withArgs(params.launchId, roundId, params.index);

            const launch = await prestigePad.getLaunch(params.launchId);

            expect(launch.roundIds.length).to.equal(currentRoundIds.length);
            const expectedUpdatedRoundIds = [...currentRoundIds];
            expectedUpdatedRoundIds[params.index.toNumber()] = roundId;
            expect(expectedUpdatedRoundIds).to.deep.equal(launch.roundIds);

            expect(await prestigePad.roundNumber()).to.equal(currentRoundNumber.add(1));
            const round = await prestigePad.getRound(roundId);
            expect(round.uri).to.equal(params.round.uri);
            expect(round.quota.totalQuantity).to.equal(params.round.quota.totalQuantity);
            expect(round.quota.minRaisingQuantity).to.equal(params.round.quota.minRaisingQuantity);
            expect(round.quota.maxRaisingQuantity).to.equal(params.round.quota.maxRaisingQuantity);
            expect(round.quote.unitPrice).to.equal(params.round.quote.unitPrice);
            expect(round.quote.currency).to.equal(params.round.quote.currency);
        });

        it('7.1.11.2. Update round unsuccessfully with invalid launch id', async () => {
            const fixture = await beforePrestigePadTest();

            const { prestigePad, initiator1, validator } = fixture;

            const { defaultParamsInput } = await beforeUpdateRoundTest(fixture);

            await expect(
                getPrestigePadTxByInput_UpdateRound(
                    prestigePad,
                    initiator1,
                    { ...defaultParamsInput, launchId: BigNumber.from(0) },
                    validator
                )
            ).to.be.revertedWithCustomError(prestigePad, 'InvalidLaunchId');

            await expect(
                getPrestigePadTxByInput_UpdateRound(
                    prestigePad,
                    initiator1,
                    { ...defaultParamsInput, launchId: BigNumber.from(100) },
                    validator
                )
            ).to.be.revertedWithCustomError(prestigePad, 'InvalidLaunchId');
        });

        it('7.1.11.3. Update round unsuccessfully when sender is not launch initiator', async () => {
            const fixture = await beforePrestigePadTest({
                addSampleLaunch: true,
                addSampleRounds: true,
            });

            const { prestigePad, manager, initiator1, validator } = fixture;

            const { defaultParamsInput } = await beforeUpdateRoundTest(fixture);

            // By manager
            await expect(
                getPrestigePadTxByInput_UpdateRound(
                    prestigePad,
                    manager,
                    { ...defaultParamsInput, launchId: BigNumber.from(1) },
                    validator
                )
            ).to.be.revertedWithCustomError(prestigePad, 'Unauthorized');

            // By wrong initiator
            await expect(
                getPrestigePadTxByInput_UpdateRound(
                    prestigePad,
                    initiator1,
                    { ...defaultParamsInput, launchId: BigNumber.from(2) },
                    validator
                )
            ).to.be.revertedWithCustomError(prestigePad, 'Unauthorized');
        });

        it('7.1.11.4. Update round unsuccessfully when paused', async () => {
            const fixture = await beforePrestigePadTest({
                addSampleLaunch: true,
                addSampleRounds: true,
                pause: true,
            });

            const { prestigePad, initiator1, validator } = fixture;

            const { defaultParamsInput } = await beforeUpdateRoundTest(fixture);

            await expect(
                getPrestigePadTxByInput_UpdateRound(
                    prestigePad,
                    initiator1,
                    { ...defaultParamsInput, launchId: BigNumber.from(1) },
                    validator
                )
            ).to.be.revertedWith('Pausable: paused');
        });

        it('7.1.11.5. Update round unsuccessfully with invalid round validation', async () => {
            const fixture = await beforePrestigePadTest({
                addSampleLaunch: true,
                addSampleRounds: true,
            });

            const { prestigePad, validator, initiator1 } = fixture;

            const { defaultParamsInput } = await beforeUpdateRoundTest(fixture);

            const params: UpdateRoundParams = {
                ...defaultParamsInput,
                round: {
                    ...defaultParamsInput.round,
                    validation: await getUpdateRoundValidation(prestigePad, defaultParamsInput, validator, false),
                },
            };
            await expect(getPrestigePadTx_UpdateRound(prestigePad, initiator1, params)).to.be.revertedWithCustomError(
                prestigePad,
                'InvalidSignature'
            );
        });

        it('7.1.11.6. Update round unsuccessfully with finalized launch', async () => {
            const fixture = await beforePrestigePadTest({
                addSampleLaunch: true,
                addSampleRounds: true,
                doAllFirstFound: true,
                doAllSecondFound: true,
                finalizeLaunch: true,
            });

            const { prestigePad, initiator1, validator } = fixture;

            const { defaultParamsInput } = await beforeUpdateRoundTest(fixture);

            await expect(
                getPrestigePadTxByInput_UpdateRound(prestigePad, initiator1, defaultParamsInput, validator)
            ).to.be.revertedWithCustomError(prestigePad, 'AlreadyFinalized');
        });

        it('7.1.11.7. Update round unsuccessfully with invalid index', async () => {
            const fixture = await beforePrestigePadTest({
                addSampleLaunch: true,
                addSampleRounds: true,
            });

            const { prestigePad, initiator1, validator } = fixture;

            const { defaultParamsInput } = await beforeUpdateRoundTest(fixture);
            const roundIdsLength = (await prestigePad.getLaunch(defaultParamsInput.launchId)).roundIds.length;

            await expect(
                getPrestigePadTxByInput_UpdateRound(
                    prestigePad,
                    initiator1,
                    {
                        ...defaultParamsInput,
                        index: BigNumber.from(roundIdsLength),
                    },
                    validator
                )
            ).to.be.revertedWithCustomError(prestigePad, 'InvalidInput');

            await expect(
                getPrestigePadTxByInput_UpdateRound(
                    prestigePad,
                    initiator1,
                    {
                        ...defaultParamsInput,
                        index: BigNumber.from(roundIdsLength + 1),
                    },
                    validator
                )
            ).to.be.revertedWithCustomError(prestigePad, 'InvalidInput');
        });

        it('7.1.11.8. Update round unsuccessfully with already initiated round', async () => {
            const fixture = await beforePrestigePadTest({
                addSampleLaunch: true,
                addSampleRounds: true,
            });

            const { prestigePad, initiator1, validator } = fixture;

            const { defaultParamsInput } = await beforeUpdateRoundTest(fixture);

            await expect(
                getPrestigePadTxByInput_UpdateRound(
                    prestigePad,
                    initiator1,
                    { ...defaultParamsInput, index: BigNumber.from(0) },
                    validator
                )
            ).to.be.revertedWithCustomError(prestigePad, 'InvalidUpdating');
        });

        it('7.1.11.9. Update round unsuccessfully when currency price is not in range', async () => {
            const fixture = await beforePrestigePadTest({
                addSampleLaunch: true,
                addSampleRounds: true,
            });

            const { prestigePad, initiator1, validator } = fixture;

            const { defaultParamsInput } = await beforeUpdateRoundTest(fixture);

            // Above max
            const paramsInput1 = {
                ...defaultParamsInput,
                round: {
                    ...defaultParamsInput.round,
                    quote: {
                        ...defaultParamsInput.round.quote,
                        unitPrice: ethers.utils.parseEther('1000000000'),
                    },
                },
            };
            await expect(
                getPrestigePadTxByInput_UpdateRound(prestigePad, initiator1, paramsInput1, validator)
            ).to.be.revertedWithCustomError(prestigePad, 'InvalidUnitPrice');

            // Below min
            const paramsInput2 = {
                ...defaultParamsInput,
                round: {
                    ...defaultParamsInput.round,
                    quote: {
                        ...defaultParamsInput.round.quote,
                        unitPrice: ethers.utils.parseEther('0.00001'),
                    },
                },
            };
            await expect(
                getPrestigePadTxByInput_UpdateRound(prestigePad, initiator1, paramsInput2, validator)
            ).to.be.revertedWithCustomError(prestigePad, 'InvalidUnitPrice');
        });

        it('7.1.11.10. Update round unsuccessfully when min selling quantity exceed max selling quantity', async () => {
            const fixture = await beforePrestigePadTest({
                addSampleLaunch: true,
                addSampleRounds: true,
            });

            const { prestigePad, initiator1, validator } = fixture;

            const { defaultParamsInput } = await beforeUpdateRoundTest(fixture);
            const paramsInput1 = {
                ...defaultParamsInput,
                round: {
                    ...defaultParamsInput.round,
                    quota: {
                        ...defaultParamsInput.round.quota,
                        minRaisingQuantity: defaultParamsInput.round.quota.maxRaisingQuantity.add(1),
                    },
                },
            };

            await expect(
                getPrestigePadTxByInput_UpdateRound(prestigePad, initiator1, paramsInput1, validator)
            ).to.be.revertedWithCustomError(prestigePad, 'InvalidInput');

            const paramsInput2 = {
                ...defaultParamsInput,
                round: {
                    ...defaultParamsInput.round,
                    quota: {
                        ...defaultParamsInput.round.quota,
                        minRaisingQuantity: defaultParamsInput.round.quota.maxRaisingQuantity,
                    },
                },
            };
            await expect(getPrestigePadTxByInput_UpdateRound(prestigePad, initiator1, paramsInput2, validator)).to.not
                .be.reverted;
        });

        it('7.1.11.11. Update round unsuccessfully when max selling quantity exceed total quantity', async () => {
            const fixture = await beforePrestigePadTest({
                addSampleLaunch: true,
                addSampleRounds: true,
            });

            const { prestigePad, initiator1, validator } = fixture;

            const { defaultParamsInput } = await beforeUpdateRoundTest(fixture);
            const paramsInput1 = {
                ...defaultParamsInput,
                round: {
                    ...defaultParamsInput.round,
                    quota: {
                        ...defaultParamsInput.round.quota,
                        maxRaisingQuantity: defaultParamsInput.round.quota.totalQuantity.add(1),
                    },
                },
            };
            await expect(
                getPrestigePadTxByInput_UpdateRound(prestigePad, initiator1, paramsInput1, validator)
            ).to.be.revertedWithCustomError(prestigePad, 'InvalidInput');

            const paramsInput2 = {
                ...defaultParamsInput,
                round: {
                    ...defaultParamsInput.round,
                    quota: {
                        ...defaultParamsInput.round.quota,
                        maxRaisingQuantity: defaultParamsInput.round.quota.totalQuantity,
                    },
                },
            };
            await expect(getPrestigePadTxByInput_UpdateRound(prestigePad, initiator1, paramsInput2, validator)).to.not
                .be.reverted;
        });
    });

    describe('7.1.12. updateRounds(uint256,uint256,(string,(uint256,uint256,uint256),(uint256,address),(uint256,uint256,bytes))[])', async () => {
        async function beforeUpdateRoundsTest(fixture: PrestigePadFixture): Promise<{
            defaultParamsInput: UpdateRoundsParamsInput;
        }> {
            const { currencies } = fixture;

            const defaultParamsInput: UpdateRoundsParamsInput = {
                launchId: BigNumber.from(1),
                removedRoundNumber: BigNumber.from(0),
                addedRounds: [
                    {
                        uri: 'new_round_uri_1',
                        quota: {
                            totalQuantity: BigNumber.from(1001),
                            minRaisingQuantity: BigNumber.from(101),
                            maxRaisingQuantity: BigNumber.from(701),
                        },
                        quote: {
                            unitPrice: ethers.utils.parseEther('0.19'),
                            currency: ethers.constants.AddressZero,
                        },
                    },
                    {
                        uri: 'new+round_uri_2',
                        quota: {
                            totalQuantity: BigNumber.from(201),
                            minRaisingQuantity: BigNumber.from(11),
                            maxRaisingQuantity: BigNumber.from(151),
                        },
                        quote: {
                            unitPrice: ethers.utils.parseEther('101'),
                            currency: currencies[0].address,
                        },
                    },
                ],
            };

            return { defaultParamsInput };
        }

        it('7.1.12.1. Update rounds successfully', async () => {
            const fixture = await beforePrestigePadTest({
                addSampleLaunch: true,
                addSampleRounds: true,
            });

            const { prestigePad, validator, initiator1, initiator2 } = fixture;

            const { defaultParamsInput } = await beforeUpdateRoundsTest(fixture);
            const paramsInput1 = {
                ...defaultParamsInput,
                removedRoundNumber: BigNumber.from(0),
            };

            const currentIndex1 = (await prestigePad.getLaunch(paramsInput1.launchId)).currentIndex;
            const currentRoundNumber1 = await prestigePad.roundNumber();
            const currentRoundIds1 = (await prestigePad.getLaunch(paramsInput1.launchId)).roundIds;
            const startIndex1 = currentRoundIds1.length;

            // Tx1: No round removal
            const tx1 = await getPrestigePadTxByInput_UpdateRounds(prestigePad, initiator1, paramsInput1, validator);
            await tx1.wait();

            await expect(tx1)
                .to.emit(prestigePad, 'LaunchRoundsRemoval')
                .withArgs(paramsInput1.launchId, paramsInput1.removedRoundNumber, startIndex1);

            for (let i = 0; i < paramsInput1.addedRounds.length; i++) {
                await expect(tx1)
                    .to.emit(prestigePad, 'LaunchRoundAppendage')
                    .withArgs(paramsInput1.launchId, currentRoundNumber1.add(i + 1));
            }

            const launch1 = await prestigePad.getLaunch(paramsInput1.launchId);
            expect(launch1.currentIndex).to.equal(currentIndex1);

            const expectedNewRoundIds1 = [...currentRoundIds1];
            for (let i = 0; i < paramsInput1.addedRounds.length; i++) {
                expectedNewRoundIds1.push(currentRoundNumber1.add(i + 1));
            }
            expect(launch1.roundIds).to.deep.equal(expectedNewRoundIds1);

            for (let i = 0; i < paramsInput1.addedRounds.length; i++) {
                const roundId = currentRoundNumber1.add(i + 1);
                const round = await prestigePad.getRound(roundId);
                expect(round.uri).to.equal(paramsInput1.addedRounds[i].uri);
                expect(round.quota.totalQuantity).to.equal(paramsInput1.addedRounds[i].quota.totalQuantity);
                expect(round.quota.minRaisingQuantity).to.equal(paramsInput1.addedRounds[i].quota.minRaisingQuantity);
                expect(round.quota.maxRaisingQuantity).to.equal(paramsInput1.addedRounds[i].quota.maxRaisingQuantity);
                expect(round.quote.unitPrice).to.equal(paramsInput1.addedRounds[i].quote.unitPrice);
                expect(round.quote.currency).to.equal(paramsInput1.addedRounds[i].quote.currency);
            }

            // Tx2: With round removal
            const paramsInput2 = {
                ...defaultParamsInput,
                launchId: BigNumber.from(2),
                removedRoundNumber: BigNumber.from(2),
            };

            const currentIndex2 = (await prestigePad.getLaunch(paramsInput2.launchId)).currentIndex;
            const currentRoundNumber2 = await prestigePad.roundNumber();
            const currentRoundIds2 = (await prestigePad.getLaunch(paramsInput2.launchId)).roundIds;
            const startIndex2 = currentRoundIds2.length - paramsInput2.removedRoundNumber.toNumber();

            const tx2 = await getPrestigePadTxByInput_UpdateRounds(prestigePad, initiator2, paramsInput2, validator);
            await tx2.wait();

            const launch2 = await prestigePad.getLaunch(paramsInput2.launchId);
            expect(launch2.currentIndex).to.equal(currentIndex2);

            const expectedNewRoundIds2 = [...currentRoundIds2].slice(0, -paramsInput2.removedRoundNumber.toNumber());
            for (let i = 0; i < paramsInput2.addedRounds.length; i++) {
                expectedNewRoundIds2.push(currentRoundNumber2.add(i + 1));
            }
            expect(launch2.roundIds).to.deep.equal(expectedNewRoundIds2);

            await expect(tx2)
                .to.emit(prestigePad, 'LaunchRoundsRemoval')
                .withArgs(paramsInput2.launchId, paramsInput2.removedRoundNumber, startIndex2);

            for (let i = 0; i < paramsInput2.addedRounds.length; i++) {
                await expect(tx2)
                    .to.emit(prestigePad, 'LaunchRoundAppendage')
                    .withArgs(paramsInput2.launchId, currentRoundNumber2.add(i + 1));
            }
        });

        it('7.1.12.2. Update round unsuccessfully with invalid launch id', async () => {
            const fixture = await beforePrestigePadTest();

            const { prestigePad, validator, initiator1 } = fixture;

            const { defaultParamsInput } = await beforeUpdateRoundsTest(fixture);

            await expect(
                getPrestigePadTxByInput_UpdateRounds(
                    prestigePad,
                    initiator1,
                    { ...defaultParamsInput, launchId: BigNumber.from(0) },
                    validator
                )
            ).to.be.revertedWithCustomError(prestigePad, 'InvalidLaunchId');

            await expect(
                getPrestigePadTxByInput_UpdateRounds(
                    prestigePad,
                    initiator1,
                    { ...defaultParamsInput, launchId: BigNumber.from(100) },
                    validator
                )
            ).to.be.revertedWithCustomError(prestigePad, 'InvalidLaunchId');
        });

        it('7.1.12.3. Update round unsuccessfully when sender is not launch initiator', async () => {
            const fixture = await beforePrestigePadTest({
                addSampleLaunch: true,
                addSampleRounds: true,
            });

            const { prestigePad, validator, manager, initiator2 } = fixture;

            const { defaultParamsInput } = await beforeUpdateRoundsTest(fixture);

            // By manager
            await expect(
                getPrestigePadTxByInput_UpdateRounds(prestigePad, manager, defaultParamsInput, validator)
            ).to.be.revertedWithCustomError(prestigePad, 'Unauthorized');

            // By wrong initiator
            await expect(
                getPrestigePadTxByInput_UpdateRounds(prestigePad, initiator2, defaultParamsInput, validator)
            ).to.be.revertedWithCustomError(prestigePad, 'Unauthorized');
        });

        it('7.1.12.4. Update round unsuccessfully when paused', async () => {
            const fixture = await beforePrestigePadTest({
                addSampleLaunch: true,
                addSampleRounds: true,
                pause: true,
            });

            const { prestigePad, validator, initiator1 } = fixture;

            const { defaultParamsInput } = await beforeUpdateRoundsTest(fixture);

            await expect(
                getPrestigePadTxByInput_UpdateRounds(prestigePad, initiator1, defaultParamsInput, validator)
            ).to.be.revertedWith('Pausable: paused');
        });

        it('7.1.12.5. Update round unsuccessfully with finalized launch', async () => {
            const fixture = await beforePrestigePadTest({
                addSampleLaunch: true,
                addSampleRounds: true,
                doAllFirstFound: true,
                doAllSecondFound: true,
                finalizeLaunch: true,
            });

            const { prestigePad, validator, initiator1 } = fixture;

            const { defaultParamsInput } = await beforeUpdateRoundsTest(fixture);

            await expect(
                getPrestigePadTxByInput_UpdateRounds(prestigePad, initiator1, defaultParamsInput, validator)
            ).to.be.revertedWithCustomError(prestigePad, 'AlreadyFinalized');
        });

        it('7.1.12.6. Update round unsuccessfully when removing round number is greater than launch total round number', async () => {
            const fixture = await beforePrestigePadTest({
                addSampleLaunch: true,
                addSampleRounds: true,
            });

            const { prestigePad, validator, initiator1 } = fixture;

            const { defaultParamsInput } = await beforeUpdateRoundsTest(fixture);

            const currentLaunchRoundNumber = (await prestigePad.getLaunch(defaultParamsInput.launchId)).roundIds.length;

            await expect(
                getPrestigePadTxByInput_UpdateRounds(
                    prestigePad,
                    initiator1,
                    {
                        ...defaultParamsInput,
                        removedRoundNumber: BigNumber.from(currentLaunchRoundNumber),
                    },
                    validator
                )
            ).to.be.revertedWithCustomError(prestigePad, 'InvalidRemoving');

            await expect(
                getPrestigePadTxByInput_UpdateRounds(
                    prestigePad,
                    initiator1,
                    {
                        ...defaultParamsInput,
                        removedRoundNumber: BigNumber.from(currentLaunchRoundNumber + 1),
                    },
                    validator
                )
            ).to.be.revertedWithCustomError(prestigePad, 'InvalidRemoving');
        });

        it('7.1.12.7. Update round unsuccessfully when current round is removed', async () => {
            const fixture = await beforePrestigePadTest({
                addSampleLaunch: true,
                addSampleRounds: true,
                raiseFirstRound: true,
            });

            const { prestigePad, validator, initiator1 } = fixture;

            const { defaultParamsInput } = await beforeUpdateRoundsTest(fixture);

            await expect(
                getPrestigePadTxByInput_UpdateRounds(
                    prestigePad,
                    initiator1,
                    {
                        ...defaultParamsInput,
                        removedRoundNumber: BigNumber.from(2),
                    },
                    validator
                )
            ).to.be.revertedWithCustomError(prestigePad, 'InvalidRemoving');

            await expect(
                getPrestigePadTxByInput_UpdateRounds(
                    prestigePad,
                    initiator1,
                    {
                        ...defaultParamsInput,
                        removedRoundNumber: BigNumber.from(3),
                    },
                    validator
                )
            ).to.be.revertedWithCustomError(prestigePad, 'InvalidRemoving');

            await expect(
                getPrestigePadTxByInput_UpdateRounds(
                    prestigePad,
                    initiator1,
                    {
                        ...defaultParamsInput,
                        removedRoundNumber: BigNumber.from(1),
                    },
                    validator
                )
            ).to.not.be.reverted;
        });

        it('7.1.12.8. Update round unsuccessfully with invalid round validation', async () => {
            const fixture = await beforePrestigePadTest({
                addSampleLaunch: true,
                addSampleRounds: true,
            });

            const { prestigePad, validator, initiator1 } = fixture;

            const { defaultParamsInput } = await beforeUpdateRoundsTest(fixture);

            const validations = await getUpdateRoundsValidation(prestigePad, defaultParamsInput, validator);
            const invalidValidations = await getUpdateRoundsValidation(
                prestigePad,
                defaultParamsInput,
                validator,
                false
            );

            const roundsWithInvalidValidations = defaultParamsInput.addedRounds.map((round, index) => ({
                ...round,
                validation: validations[index],
            }));
            roundsWithInvalidValidations[0].validation = invalidValidations[0];

            await expect(
                getPrestigePadTx_UpdateRounds(
                    prestigePad,
                    initiator1,
                    {
                        ...defaultParamsInput,
                        addedRounds: roundsWithInvalidValidations,
                    },
                )
            ).to.be.revertedWithCustomError(prestigePad, 'InvalidSignature');
        });

        it('7.1.12.9. Update round unsuccessfully when currency price is not in range', async () => {
            const fixture = await beforePrestigePadTest({
                addSampleLaunch: true,
                addSampleRounds: true,
            });

            const { prestigePad, validator, initiator1 } = fixture;

            const { defaultParamsInput } = await beforeUpdateRoundsTest(fixture);

            // Above max
            const paramsInput1 = {
                ...defaultParamsInput,
                addedRounds: [
                    {
                        ...defaultParamsInput.addedRounds[0],
                        quote: {
                            ...defaultParamsInput.addedRounds[0].quote,
                            unitPrice: ethers.utils.parseEther('1000000000'),
                        },
                    },
                    ...defaultParamsInput.addedRounds.slice(1),
                ],
            };
            await expect(
                getPrestigePadTxByInput_UpdateRounds(prestigePad, initiator1, paramsInput1, validator)
            ).to.be.revertedWithCustomError(prestigePad, 'InvalidUnitPrice');

            // Below min
            const paramsInput2 = {
                ...defaultParamsInput,
                addedRounds: [
                    {
                        ...defaultParamsInput.addedRounds[0],
                        quote: {
                            ...defaultParamsInput.addedRounds[0].quote,
                            unitPrice: ethers.utils.parseEther('0.00001'),
                        },
                    },
                ],
            };
            await expect(
                getPrestigePadTxByInput_UpdateRounds(prestigePad, initiator1, paramsInput2, validator)
            ).to.be.revertedWithCustomError(prestigePad, 'InvalidUnitPrice');
        });

        it('7.1.12.10. Update round unsuccessfully when min selling quantity exceed max selling quantity', async () => {
            const fixture = await beforePrestigePadTest({
                addSampleLaunch: true,
                addSampleRounds: true,
            });

            const { prestigePad, validator, initiator1 } = fixture;

            const { defaultParamsInput } = await beforeUpdateRoundsTest(fixture);

            const paramsInput1 = {
                ...defaultParamsInput,
                addedRounds: [
                    {
                        ...defaultParamsInput.addedRounds[0],
                        quota: {
                            ...defaultParamsInput.addedRounds[0].quota,
                            minRaisingQuantity: defaultParamsInput.addedRounds[0].quota.maxRaisingQuantity.add(1),
                        },
                    },
                    ...defaultParamsInput.addedRounds.slice(1),
                ],
            };
            await expect(
                getPrestigePadTxByInput_UpdateRounds(prestigePad, initiator1, paramsInput1, validator)
            ).to.be.revertedWithCustomError(prestigePad, 'InvalidInput');

            const paramsInput2 = {
                ...defaultParamsInput,
                addedRounds: [
                    {
                        ...defaultParamsInput.addedRounds[0],
                        quota: {
                            ...defaultParamsInput.addedRounds[0].quota,
                            minRaisingQuantity: defaultParamsInput.addedRounds[0].quota.maxRaisingQuantity,
                        },
                    },
                ],
            };
            await expect(getPrestigePadTxByInput_UpdateRounds(prestigePad, initiator1, paramsInput2, validator)).to.not
                .be.reverted;
        });

        it('7.1.12.11. Update round unsuccessfully when max selling quantity exceed total quantity', async () => {
            const fixture = await beforePrestigePadTest({
                addSampleLaunch: true,
                addSampleRounds: true,
            });

            const { prestigePad, validator, initiator1 } = fixture;

            const { defaultParamsInput } = await beforeUpdateRoundsTest(fixture);

            const paramsInput1 = {
                ...defaultParamsInput,
                addedRounds: [
                    {
                        ...defaultParamsInput.addedRounds[0],
                        quota: {
                            ...defaultParamsInput.addedRounds[0].quota,
                            maxRaisingQuantity: defaultParamsInput.addedRounds[0].quota.totalQuantity.add(1),
                        },
                    },
                    ...defaultParamsInput.addedRounds.slice(1),
                ],
            };
            await expect(
                getPrestigePadTxByInput_UpdateRounds(prestigePad, initiator1, paramsInput1, validator)
            ).to.be.revertedWithCustomError(prestigePad, 'InvalidInput');

            const paramsInput2 = {
                ...defaultParamsInput,
                addedRounds: [
                    {
                        ...defaultParamsInput.addedRounds[0],
                        quota: {
                            ...defaultParamsInput.addedRounds[0].quota,
                            maxRaisingQuantity: defaultParamsInput.addedRounds[0].quota.totalQuantity,
                        },
                    },
                ],
            };
            await expect(getPrestigePadTxByInput_UpdateRounds(prestigePad, initiator1, paramsInput2, validator)).to.not
                .be.reverted;
        });
    });

    describe('7.1.13. scheduleNextRound(uint256,uint256,uint256,address[],uint256[],uint40,uint40)', async () => {
        async function beforeScheduleNextRoundTest(fixture: PrestigePadFixture): Promise<{
            defaultParams: ScheduleNextRoundParams;
        }> {
            const { currencies } = fixture;

            let timestamp = (await time.latest()) + 100;

            const defaultParams = {
                launchId: BigNumber.from(1),
                cashbackThreshold: BigNumber.from('5'),
                cashbackBaseRate: ethers.utils.parseEther('0.1'),
                cashbackCurrencies: [currencies[0].address, currencies[1].address],
                cashbackDenominations: [ethers.utils.parseEther('0.01'), ethers.utils.parseEther('0.02')],
                raiseStartsAt: timestamp + 10,
                raiseDuration: Constant.PRESTIGE_PAD_RAISE_MINIMUM_DURATION + 10,
            };

            return { defaultParams };
        }

        it('7.1.13.1. Raise next round successfully', async () => {
            const fixture = await beforePrestigePadTest({
                addSampleLaunch: true,
                addSampleRounds: true,
            });

            const { prestigePad, initiator1, initiator2, currencies, admin, reserveVault } = fixture;

            // Tx1: launch 1 with cashback
            let timestamp = (await time.latest()) + 100;

            const params1 = {
                launchId: BigNumber.from(1),
                cashbackThreshold: BigNumber.from('5'),
                cashbackBaseRate: ethers.utils.parseEther('0.1'),
                cashbackCurrencies: [currencies[0].address, currencies[1].address],
                cashbackDenominations: [ethers.utils.parseEther('0.01'), ethers.utils.parseEther('0.02')],
                raiseStartsAt: timestamp + 10,
                raiseDuration: Constant.PRESTIGE_PAD_RAISE_MINIMUM_DURATION + 10,
            };

            const roundId1 = (await prestigePad.getLaunch(params1.launchId)).roundIds[1];
            const unitPrice = (await prestigePad.getRound(roundId1)).quote.unitPrice;
            const feeDenomination = await getFeeDenomination(prestigePad, admin, params1.launchId, unitPrice, null);

            const initFundNumber = await reserveVault.fundNumber();

            const tx1 = await getPrestigePadTx_ScheduleNextRound(prestigePad, initiator1, params1);
            await tx1.wait();

            const cashbackFundId1 = initFundNumber.add(1);
            const mainDenomination = feeDenomination
                .mul(params1.cashbackBaseRate)
                .div(Constant.COMMON_RATE_MAX_FRACTION);

            await expect(tx1)
                .to.emit(prestigePad, 'LaunchNextRoundSchedule')
                .withArgs(params1.launchId, roundId1, cashbackFundId1, params1.raiseStartsAt, params1.raiseDuration);
            await expect(tx1)
                .to.emit(reserveVault, 'NewFund')
                .withArgs(
                    cashbackFundId1,
                    prestigePad.address,
                    ethers.constants.AddressZero,
                    mainDenomination,
                    params1.cashbackCurrencies,
                    params1.cashbackDenominations
                );

            expect(await reserveVault.fundNumber()).to.equal(initFundNumber.add(1));

            const fund1 = await reserveVault.getFund(cashbackFundId1);
            expect(fund1.mainCurrency).to.equal(ethers.constants.AddressZero);
            expect(fund1.mainDenomination).to.equal(mainDenomination);
            expect(fund1.extraCurrencies).to.deep.equal(params1.cashbackCurrencies);
            expect(fund1.extraDenominations).to.deep.equal(params1.cashbackDenominations);

            // Tx2: launch 2 with cashback
            const params2 = {
                launchId: BigNumber.from(2),
                cashbackThreshold: BigNumber.from('50'),
                cashbackBaseRate: ethers.utils.parseEther('0.2'),
                cashbackCurrencies: [currencies[1].address, ethers.constants.AddressZero],
                cashbackDenominations: [ethers.utils.parseEther('0.01'), ethers.utils.parseEther('0.02')],
                raiseStartsAt: timestamp + 20,
                raiseDuration: Constant.PRESTIGE_PAD_RAISE_MINIMUM_DURATION + 20,
            };

            const roundId2 = (await prestigePad.getLaunch(params2.launchId)).roundIds[1];
            const unitPrice2 = (await prestigePad.getRound(roundId2)).quote.unitPrice;
            const feeDenomination2 = await getFeeDenomination(
                prestigePad,
                admin,
                params2.launchId,
                unitPrice2,
                currencies[0]
            );

            const tx2 = await getPrestigePadTx_ScheduleNextRound(prestigePad, initiator2, params2);
            await tx2.wait();

            const cashbackFundId2 = initFundNumber.add(2);
            const mainDenomination2 = feeDenomination2
                .mul(params2.cashbackBaseRate)
                .div(Constant.COMMON_RATE_MAX_FRACTION);

            await expect(tx2)
                .to.emit(prestigePad, 'LaunchNextRoundSchedule')
                .withArgs(params2.launchId, roundId2, cashbackFundId2, params2.raiseStartsAt, params2.raiseDuration);
            await expect(tx2)
                .to.emit(reserveVault, 'NewFund')
                .withArgs(
                    cashbackFundId2,
                    prestigePad.address,
                    currencies[0].address,
                    mainDenomination2,
                    params2.cashbackCurrencies,
                    params2.cashbackDenominations
                );

            expect(await reserveVault.fundNumber()).to.equal(initFundNumber.add(2));

            const fund2 = await reserveVault.getFund(cashbackFundId2);
            expect(fund2.mainCurrency).to.equal(currencies[0].address);
            expect(fund2.mainDenomination).to.equal(mainDenomination2);
            expect(fund2.extraCurrencies).to.deep.equal(params2.cashbackCurrencies);
            expect(fund2.extraDenominations).to.deep.equal(params2.cashbackDenominations);
        });

        it('7.1.13.2. Raise next round successfully without cashback', async () => {
            const fixture = await beforePrestigePadTest({
                addSampleLaunch: true,
                addSampleRounds: true,
            });

            const { prestigePad, initiator1, reserveVault, admin } = fixture;

            const { defaultParams } = await beforeScheduleNextRoundTest(fixture);

            let timestamp = (await time.latest()) + 100;

            const roundId = (await prestigePad.getLaunch(defaultParams.launchId)).roundIds[1];
            const unitPrice = (await prestigePad.getRound(roundId)).quote.unitPrice;
            const initFundNumber = await reserveVault.fundNumber();
            const feeDenomination = await getFeeDenomination(
                prestigePad,
                admin,
                defaultParams.launchId,
                unitPrice,
                null
            );

            const params = {
                launchId: BigNumber.from(1),
                cashbackThreshold: ethers.constants.Zero,
                cashbackBaseRate: ethers.constants.Zero,
                cashbackCurrencies: [],
                cashbackDenominations: [],
                raiseStartsAt: timestamp + 10,
                raiseDuration: Constant.PRESTIGE_PAD_RAISE_MINIMUM_DURATION + 10,
            };

            const tx = await getPrestigePadTx_ScheduleNextRound(prestigePad, initiator1, params);
            await tx.wait();

            const cashbackFundId = BigNumber.from(0);
            await expect(tx)
                .to.emit(prestigePad, 'LaunchNextRoundSchedule')
                .withArgs(params.launchId, roundId, cashbackFundId, params.raiseStartsAt, params.raiseDuration);

            expect(await reserveVault.fundNumber()).to.equal(initFundNumber);

            const round = await prestigePad.getRound(roundId);
            expect(round.quote.cashbackThreshold).to.equal(params.cashbackThreshold);
            expect(round.quote.cashbackFundId).to.equal(cashbackFundId);
            expect(round.quote.feeDenomination).to.equal(feeDenomination);

            expect(round.agenda.raiseStartsAt).to.equal(params.raiseStartsAt);
            expect(round.agenda.raiseEndsAt).to.equal(params.raiseStartsAt + params.raiseDuration);
        });

        it('7.1.13.3. Raise next round unsuccessfully when the contract is reentered', async () => {
            const fixture = await beforePrestigePadTest({
                addSampleLaunch: true,
                addSampleRounds: true,
                useExclusiveReentrantCurrency: true,
            });

            const { prestigePad, initiator2, currencies } = fixture;
            const reentrancy = currencies[0];

            const { defaultParams } = await beforeScheduleNextRoundTest(fixture);

            await testReentrancy_prestigePad(fixture, reentrancy, async (timestamp: number) => {
                await expect(
                    getPrestigePadTx_ScheduleNextRound(prestigePad, initiator2, {
                        ...defaultParams,
                        launchId: BigNumber.from(2),
                    })
                ).to.be.revertedWith('ReentrancyGuard: reentrant call');
            });
        });

        it('7.1.13.4. Raise next round unsuccessfully with invalid launch id', async () => {
            const fixture = await beforePrestigePadTest();

            const { prestigePad, initiator1 } = fixture;

            const { defaultParams } = await beforeScheduleNextRoundTest(fixture);

            await expect(
                getPrestigePadTx_ScheduleNextRound(prestigePad, initiator1, {
                    ...defaultParams,
                    launchId: BigNumber.from(0),
                })
            ).to.be.revertedWithCustomError(prestigePad, 'InvalidLaunchId');

            await expect(
                getPrestigePadTx_ScheduleNextRound(prestigePad, initiator1, {
                    ...defaultParams,
                    launchId: BigNumber.from(100),
                })
            ).to.be.revertedWithCustomError(prestigePad, 'InvalidLaunchId');
        });

        it('7.1.13.5. Raise next round unsuccessfully when sender is not launch initiator', async () => {
            const fixture = await beforePrestigePadTest({
                addSampleLaunch: true,
                addSampleRounds: true,
            });

            const { prestigePad, manager, initiator2 } = fixture;

            const { defaultParams } = await beforeScheduleNextRoundTest(fixture);

            // By manager
            await expect(
                getPrestigePadTx_ScheduleNextRound(prestigePad, manager, defaultParams)
            ).to.be.revertedWithCustomError(prestigePad, 'Unauthorized');

            // By wrong initiator
            await expect(
                getPrestigePadTx_ScheduleNextRound(prestigePad, initiator2, defaultParams)
            ).to.be.revertedWithCustomError(prestigePad, 'Unauthorized');
        });

        it('7.1.13.6. Raise next round unsuccessfully when paused', async () => {
            const fixture = await beforePrestigePadTest({
                addSampleLaunch: true,
                addSampleRounds: true,
                pause: true,
            });

            const { prestigePad, initiator1 } = fixture;

            const { defaultParams } = await beforeScheduleNextRoundTest(fixture);

            await expect(getPrestigePadTx_ScheduleNextRound(prestigePad, initiator1, defaultParams)).to.be.revertedWith(
                'Pausable: paused'
            );
        });

        it('7.1.13.7. Raise next round unsuccessfully with invalid cashback base rate', async () => {
            const fixture = await beforePrestigePadTest({
                addSampleLaunch: true,
                addSampleRounds: true,
            });

            const { prestigePad, initiator1 } = fixture;

            const { defaultParams } = await beforeScheduleNextRoundTest(fixture);

            await expect(
                getPrestigePadTx_ScheduleNextRound(prestigePad, initiator1, {
                    ...defaultParams,
                    cashbackBaseRate: Constant.COMMON_RATE_MAX_FRACTION.add(1),
                })
            ).to.be.revertedWithCustomError(prestigePad, 'InvalidInput');

            await expect(
                getPrestigePadTx_ScheduleNextRound(prestigePad, initiator1, {
                    ...defaultParams,
                    cashbackBaseRate: Constant.COMMON_RATE_MAX_FRACTION,
                })
            ).to.not.be.reverted;
        });

        it('7.1.13.8. Raise next round unsuccessfully with mismatched params length', async () => {
            const fixture = await beforePrestigePadTest({
                addSampleLaunch: true,
                addSampleRounds: true,
            });

            const { prestigePad, initiator1, currencies } = fixture;

            const { defaultParams } = await beforeScheduleNextRoundTest(fixture);

            await expect(
                getPrestigePadTx_ScheduleNextRound(prestigePad, initiator1, {
                    ...defaultParams,
                    cashbackCurrencies: [currencies[0].address, currencies[1].address],
                    cashbackDenominations: [ethers.utils.parseEther('0.01')],
                })
            ).to.be.revertedWithCustomError(prestigePad, 'InvalidInput');

            await expect(
                getPrestigePadTx_ScheduleNextRound(prestigePad, initiator1, {
                    ...defaultParams,
                    cashbackCurrencies: [currencies[0].address, currencies[1].address],
                    cashbackDenominations: [
                        ethers.utils.parseEther('0.01'),
                        ethers.utils.parseEther('0.02'),
                        ethers.utils.parseEther('0.03'),
                    ],
                })
            ).to.be.revertedWithCustomError(prestigePad, 'InvalidInput');
        });

        it('7.1.13.9. Raise next round unsuccessfully with raise start time before current timestamp', async () => {
            const fixture = await beforePrestigePadTest({
                addSampleLaunch: true,
                addSampleRounds: true,
            });

            const { prestigePad, initiator1 } = fixture;

            const { defaultParams } = await beforeScheduleNextRoundTest(fixture);

            let timestamp = (await time.latest()) + 100;
            await time.setNextBlockTimestamp(timestamp);

            await expect(
                getPrestigePadTx_ScheduleNextRound(prestigePad, initiator1, {
                    ...defaultParams,
                    raiseStartsAt: timestamp - 1,
                })
            ).to.be.revertedWithCustomError(prestigePad, 'InvalidInput');

            timestamp += 10;
            await time.setNextBlockTimestamp(timestamp);

            await expect(
                getPrestigePadTx_ScheduleNextRound(prestigePad, initiator1, {
                    ...defaultParams,
                    raiseStartsAt: timestamp,
                })
            ).to.not.be.reverted;
        });

        it('7.1.13.10. Raise next round unsuccessfully with raise duration less than minimum requirement', async () => {
            const fixture = await beforePrestigePadTest({
                addSampleLaunch: true,
                addSampleRounds: true,
            });

            const { prestigePad, initiator1 } = fixture;

            const { defaultParams } = await beforeScheduleNextRoundTest(fixture);

            await expect(
                getPrestigePadTx_ScheduleNextRound(prestigePad, initiator1, {
                    ...defaultParams,
                    raiseDuration: Constant.PRESTIGE_PAD_RAISE_MINIMUM_DURATION - 1,
                })
            ).to.be.revertedWithCustomError(prestigePad, 'InvalidInput');

            await expect(
                getPrestigePadTx_ScheduleNextRound(prestigePad, initiator1, {
                    ...defaultParams,
                    raiseDuration: Constant.PRESTIGE_PAD_RAISE_MINIMUM_DURATION,
                })
            ).to.not.be.reverted;
        });

        it('7.1.13.11. Raise next round unsuccessfully with finalized launch', async () => {
            const fixture = await beforePrestigePadTest({
                addSampleLaunch: true,
                addSampleRounds: true,
                doAllFirstFound: true,
                doAllSecondFound: true,
                finalizeLaunch: true,
            });

            const { prestigePad, initiator1 } = fixture;

            const { defaultParams } = await beforeScheduleNextRoundTest(fixture);

            await expect(
                getPrestigePadTx_ScheduleNextRound(prestigePad, initiator1, defaultParams)
            ).to.be.revertedWithCustomError(prestigePad, 'AlreadyFinalized');
        });

        it('7.1.13.12. Raise next round unsuccessfully when current round is not confirmed', async () => {
            const fixture = await beforePrestigePadTest({
                addSampleLaunch: true,
                addSampleRounds: true,
                raiseFirstRound: true,
            });

            const { prestigePad, initiator1 } = fixture;

            const { defaultParams } = await beforeScheduleNextRoundTest(fixture);

            await expect(
                getPrestigePadTx_ScheduleNextRound(prestigePad, initiator1, defaultParams)
            ).to.be.revertedWithCustomError(prestigePad, 'InvalidScheduling');
        });

        it('7.1.13.13. Raise next round unsuccessfully when there is no new round', async () => {
            const fixture = await beforePrestigePadTest({
                addSampleLaunch: true,
            });

            const { prestigePad, initiator1 } = fixture;

            const { defaultParams } = await beforeScheduleNextRoundTest(fixture);

            await expect(
                getPrestigePadTx_ScheduleNextRound(prestigePad, initiator1, defaultParams)
            ).to.be.revertedWithCustomError(prestigePad, 'NoRoundToInitiate');
        });

        it('7.1.13.14. Raise next round unsuccessfully when cashback threshold exceed total quantity', async () => {
            const fixture = await beforePrestigePadTest({
                addSampleLaunch: true,
                addSampleRounds: true,
            });

            const { prestigePad, initiator1 } = fixture;

            const { defaultParams } = await beforeScheduleNextRoundTest(fixture);

            const roundId = (await prestigePad.getLaunch(defaultParams.launchId)).roundIds[1];
            const totalQuantity = (await prestigePad.getRound(roundId)).quota.totalQuantity;
            await expect(
                getPrestigePadTx_ScheduleNextRound(prestigePad, initiator1, {
                    ...defaultParams,
                    cashbackThreshold: totalQuantity.add(1),
                })
            ).to.be.revertedWithCustomError(prestigePad, 'InvalidInput');

            await expect(
                getPrestigePadTx_ScheduleNextRound(prestigePad, initiator1, {
                    ...defaultParams,
                    cashbackThreshold: totalQuantity,
                })
            ).to.not.be.reverted;
        });

        it('7.1.13.15. Raise next round unsuccessfully without cashback currencies and rate, but with cashback threshold', async () => {
            const fixture = await beforePrestigePadTest({
                addSampleLaunch: true,
                addSampleRounds: true,
            });

            const { prestigePad, initiator1 } = fixture;

            const { defaultParams } = await beforeScheduleNextRoundTest(fixture);

            await expect(
                getPrestigePadTx_ScheduleNextRound(prestigePad, initiator1, {
                    ...defaultParams,
                    cashbackBaseRate: ethers.utils.parseEther('0'),
                    cashbackThreshold: BigNumber.from(10),
                    cashbackCurrencies: [],
                    cashbackDenominations: [],
                })
            ).to.be.revertedWithCustomError(prestigePad, 'InvalidInput');
        });

        it('7.1.13.16. Raise next round unsuccessfully with cashback currencies and rate, but without cashback threshold', async () => {
            const fixture = await beforePrestigePadTest({
                addSampleLaunch: true,
                addSampleRounds: true,
            });

            const { prestigePad, initiator1, currencies } = fixture;

            const { defaultParams } = await beforeScheduleNextRoundTest(fixture);

            await expect(
                getPrestigePadTx_ScheduleNextRound(prestigePad, initiator1, {
                    ...defaultParams,
                    cashbackBaseRate: ethers.utils.parseEther('0.1'),
                    cashbackThreshold: BigNumber.from(0),
                    cashbackCurrencies: [currencies[0].address, currencies[1].address],
                    cashbackDenominations: [ethers.utils.parseEther('0.01'), ethers.utils.parseEther('0.02')],
                })
            ).to.be.revertedWithCustomError(prestigePad, 'InvalidInput');
        });

        it('7.1.13.17. Raise next round unsuccessfully when open fund failed', async () => {
            const fixture = await beforePrestigePadTest({
                addSampleLaunch: true,
                addSampleRounds: true,
                skipAuthorizeProviders: true,
            });

            const { prestigePad, initiator1 } = fixture;

            const { defaultParams } = await beforeScheduleNextRoundTest(fixture);

            await expect(
                getPrestigePadTx_ScheduleNextRound(prestigePad, initiator1, defaultParams)
            ).to.be.revertedWithCustomError(prestigePad, 'Unauthorized');
        });
    });

    describe('7.1.14. cancelCurrentRound(uint256)', async () => {
        it('7.1.14.1. Cancel current round successfully', async () => {
            const fixture = await beforePrestigePadTest({
                addSampleLaunch: true,
                addSampleRounds: true,
                raiseFirstRound: true,
            });

            const { prestigePad, initiator1 } = fixture;

            const currentRoundNumber = await prestigePad.roundNumber();

            const launchId1 = 1;
            const currentRoundIds1 = (await prestigePad.getLaunch(launchId1)).roundIds;
            const currentIndex1 = (await prestigePad.getLaunch(launchId1)).currentIndex;

            const oldRoundId1 = currentRoundIds1[currentIndex1.toNumber()];
            const oldRound1Before = await prestigePad.getRound(oldRoundId1);

            const tx1 = await getPrestigePadTx_CancelCurrentRound(prestigePad, initiator1, {
                launchId: BigNumber.from(launchId1),
            });

            const newRoundId1 = currentRoundNumber.add(1);
            await expect(tx1).to.emit(prestigePad, 'LaunchCurrentRoundCancellation').withArgs(launchId1, newRoundId1);

            const expectedNewRoundIds1 = [currentRoundIds1[0], newRoundId1, ...currentRoundIds1.slice(2)];
            const launch1After = await prestigePad.getLaunch(launchId1);
            expect(launch1After.roundIds).to.deep.equal(expectedNewRoundIds1);
            expect(launch1After.currentIndex).to.equal(currentIndex1.sub(1));
            expect(launch1After.isFinalized).to.equal(false);

            const round1After = await prestigePad.getRound(newRoundId1);
            expect(round1After.quota.totalQuantity).to.equal(oldRound1Before.quota.totalQuantity);
            expect(round1After.quota.minRaisingQuantity).to.equal(oldRound1Before.quota.minRaisingQuantity);
            expect(round1After.quota.maxRaisingQuantity).to.equal(oldRound1Before.quota.maxRaisingQuantity);
            expect(round1After.quote.unitPrice).to.equal(oldRound1Before.quote.unitPrice);
            expect(round1After.quote.currency).to.equal(oldRound1Before.quote.currency);
            expect(round1After.uri).to.equal(oldRound1Before.uri);

            const oldRound1After = await prestigePad.getRound(oldRoundId1);
            expect(oldRound1After.quota.totalQuantity).to.equal(0);
        });

        it('7.1.14.2. Cancel current round unsuccessfully with invalid launch id', async () => {
            const fixture = await beforePrestigePadTest();

            const { prestigePad, initiator1 } = fixture;

            await expect(
                getPrestigePadTx_CancelCurrentRound(prestigePad, initiator1, {
                    launchId: BigNumber.from(1),
                })
            ).to.be.revertedWithCustomError(prestigePad, 'InvalidLaunchId');
        });

        it('7.1.14.3. Cancel current round unsuccessfully when sender is not launch initiator', async () => {
            const fixture = await beforePrestigePadTest({
                addSampleLaunch: true,
                addSampleRounds: true,
                raiseFirstRound: true,
            });

            const { prestigePad, manager, initiator1 } = fixture;

            // By manager
            await expect(
                getPrestigePadTx_CancelCurrentRound(prestigePad, manager, {
                    launchId: BigNumber.from(1),
                })
            ).to.be.revertedWithCustomError(prestigePad, 'Unauthorized');

            // By wrong initiator
            await expect(
                getPrestigePadTx_CancelCurrentRound(prestigePad, initiator1, {
                    launchId: BigNumber.from(2),
                })
            ).to.be.revertedWithCustomError(prestigePad, 'Unauthorized');
        });

        it('7.1.14.4. Cancel current round unsuccessfully when paused', async () => {
            const fixture = await beforePrestigePadTest({
                addSampleLaunch: true,
                addSampleRounds: true,
                raiseFirstRound: true,
                pause: true,
            });

            const { prestigePad, initiator1 } = fixture;

            await expect(
                getPrestigePadTx_CancelCurrentRound(prestigePad, initiator1, {
                    launchId: BigNumber.from(1),
                })
            ).to.be.revertedWith('Pausable: paused');
        });

        it('7.1.14.5. Cancel current round unsuccessfully with finalized launch', async () => {
            const fixture = await beforePrestigePadTest({
                addSampleLaunch: true,
                addSampleRounds: true,
                doAllFirstFound: true,
                doAllSecondFound: true,
                finalizeLaunch: true,
            });

            const { prestigePad, initiator1 } = fixture;

            await expect(
                getPrestigePadTx_CancelCurrentRound(prestigePad, initiator1, {
                    launchId: BigNumber.from(1),
                })
            ).to.be.revertedWithCustomError(prestigePad, 'AlreadyFinalized');
        });

        it('7.1.14.6. Cancel current round unsuccessfully when current round is confirmed', async () => {
            const fixture = await beforePrestigePadTest({
                addSampleLaunch: true,
                addSampleRounds: true,
                raiseFirstRound: true,
                depositFirstRound: true,
                confirmFirstRound: true,
            });

            const { prestigePad, initiator1 } = fixture;

            await expect(
                getPrestigePadTx_CancelCurrentRound(prestigePad, initiator1, {
                    launchId: BigNumber.from(1),
                })
            ).to.be.revertedWithCustomError(prestigePad, 'AlreadyConfirmed');
        });
    });

    describe('7.1.15. safeConfirmCurrentRound(uint256,bytes32)', async () => {
        it('7.1.15.1. Safe confirm current round successfully with native currency', async () => {
            const fixture = await beforePrestigePadTest({
                addSampleLaunch: true,
                addSampleRounds: true,
                raiseFirstRound: true,
                depositFirstRound: true,
            });

            const { prestigePad, initiator1, projectToken, feeReceiver, reserveVault, currencies } = fixture;

            const launchId = 1;
            const roundId = (await prestigePad.getLaunch(launchId)).roundIds[1];
            const round = await prestigePad.getRound(roundId);
            const value = round.quote.unitPrice.mul(round.quota.raisedQuantity);
            const feeAmount = round.quote.feeDenomination.mul(round.quota.raisedQuantity);

            const fundId = round.quote.cashbackFundId;
            const fund = await reserveVault.getFund(fundId);
            const cashbackBaseAmount = fund.mainDenomination.mul(fund.quantity);
            const cashbackCurrency0Value = fund.extraDenominations[0].mul(fund.quantity);
            const cashbackCurrency1Value = fund.extraDenominations[1].mul(fund.quantity);

            const initPrestigePadProjectBalance = await projectToken.balanceOf(prestigePad.address, launchId);
            const initInitiator1ProjectBalance = await projectToken.balanceOf(initiator1.address, launchId);

            const initPrestigePadNativeBalance = await ethers.provider.getBalance(prestigePad.address);
            const initInitiator1NativeBalance = await ethers.provider.getBalance(initiator1.address);
            const initFeeReceiverNativeBalance = await ethers.provider.getBalance(feeReceiver.address);
            const initReserveVaultNativeBalance = await ethers.provider.getBalance(reserveVault.address);

            const initPrestigePadCurrency0Balance = await currencies[0].balanceOf(prestigePad.address);
            const initInitiator1Currency0Balance = await currencies[0].balanceOf(initiator1.address);
            const initReserveVaultCurrency0Balance = await currencies[0].balanceOf(reserveVault.address);
            const initFeeReceiverCurrency0Balance = await currencies[0].balanceOf(feeReceiver.address);

            const initPrestigePadCurrency1Balance = await currencies[1].balanceOf(prestigePad.address);
            const initInitiator1Currency1Balance = await currencies[1].balanceOf(initiator1.address);
            const initReserveVaultCurrency1Balance = await currencies[1].balanceOf(reserveVault.address);
            const initFeeReceiverCurrency1Balance = await currencies[1].balanceOf(feeReceiver.address);

            let timestamp = (await time.latest()) + 100;
            await time.setNextBlockTimestamp(timestamp);

            const tx = await getPrestigePadTxByParams_SafeConfirmCurrentRound(
                prestigePad,
                initiator1,
                { launchId: BigNumber.from(launchId) },
                { value: ethers.utils.parseEther('100') }
            );
            const receipt = await tx.wait();
            const gasFee = receipt.effectiveGasPrice.mul(receipt.gasUsed);

            await expect(tx)
                .to.emit(prestigePad, 'LaunchCurrentRoundConfirmation')
                .withArgs(launchId, roundId, round.quota.raisedQuantity, value, feeAmount, cashbackBaseAmount);
            await expect(tx).to.emit(reserveVault, 'FundProvision').withArgs(fundId);

            const roundAfter = await prestigePad.getRound(roundId);
            expect(roundAfter.agenda.confirmAt).to.equal(timestamp);
            expect(roundAfter.agenda.raiseEndsAt).to.equal(timestamp);

            const remainingQuantity = round.quota.totalQuantity.sub(round.quota.raisedQuantity);
            const unit = BigNumber.from(10).pow(await projectToken.decimals());

            expect(await projectToken.balanceOf(prestigePad.address, launchId)).to.equal(
                initPrestigePadProjectBalance.add(round.quota.raisedQuantity.mul(unit))
            );
            expect(await projectToken.balanceOf(initiator1.address, launchId)).to.equal(
                initInitiator1ProjectBalance.add(remainingQuantity.mul(unit))
            );

            expect(await ethers.provider.getBalance(prestigePad.address)).to.equal(
                initPrestigePadNativeBalance.sub(value)
            );
            expect(await ethers.provider.getBalance(initiator1.address)).to.equal(
                initInitiator1NativeBalance.sub(gasFee).add(value.sub(feeAmount))
            );
            expect(await ethers.provider.getBalance(feeReceiver.address)).to.equal(
                initFeeReceiverNativeBalance.add(feeAmount.sub(cashbackBaseAmount))
            );
            expect(await ethers.provider.getBalance(reserveVault.address)).to.equal(
                initReserveVaultNativeBalance.add(cashbackBaseAmount)
            );

            expect(await currencies[0].balanceOf(prestigePad.address)).to.equal(initPrestigePadCurrency0Balance);
            expect(await currencies[0].balanceOf(initiator1.address)).to.equal(
                initInitiator1Currency0Balance.sub(cashbackCurrency0Value)
            );
            expect(await currencies[0].balanceOf(reserveVault.address)).to.equal(
                initReserveVaultCurrency0Balance.add(cashbackCurrency0Value)
            );
            expect(await currencies[0].balanceOf(feeReceiver.address)).to.equal(initFeeReceiverCurrency0Balance);

            expect(await currencies[1].balanceOf(prestigePad.address)).to.equal(initPrestigePadCurrency1Balance);
            expect(await currencies[1].balanceOf(initiator1.address)).to.equal(
                initInitiator1Currency1Balance.sub(cashbackCurrency1Value)
            );
            expect(await currencies[1].balanceOf(reserveVault.address)).to.equal(
                initReserveVaultCurrency1Balance.add(cashbackCurrency1Value)
            );
            expect(await currencies[1].balanceOf(feeReceiver.address)).to.equal(initFeeReceiverCurrency1Balance);
        });

        it('7.1.15.2. Safe confirm current round successfully with erc20 after raise ended', async () => {
            const fixture = await beforePrestigePadTest({
                addSampleLaunch: true,
                addSampleRounds: true,
                doAllFirstFound: true,
                raiseSecondRound: true,
                depositSecondRound: true,
            });

            const { prestigePad, initiator1, projectToken, feeReceiver, reserveVault, currencies } = fixture;

            const launchId = 1;
            const roundId = (await prestigePad.getLaunch(launchId)).roundIds[2];
            const round = await prestigePad.getRound(roundId);
            const value = round.quote.unitPrice.mul(round.quota.raisedQuantity);
            const feeAmount = round.quote.feeDenomination.mul(round.quota.raisedQuantity);

            const fundId = round.quote.cashbackFundId;
            const fund = await reserveVault.getFund(fundId);
            const cashbackBaseAmount = fund.mainDenomination.mul(fund.quantity);
            const cashbackCurrency1Value = fund.extraDenominations[0].mul(fund.quantity);
            const cashbackNativeValue = fund.extraDenominations[1].mul(fund.quantity);

            const initPrestigePadProjectBalance = await projectToken.balanceOf(prestigePad.address, launchId);
            const initInitiator1ProjectBalance = await projectToken.balanceOf(initiator1.address, launchId);

            const initPrestigePadCurrency0Balance = await currencies[0].balanceOf(prestigePad.address);
            const initInitiator1Currency0Balance = await currencies[0].balanceOf(initiator1.address);
            const initReserveVaultCurrency0Balance = await currencies[0].balanceOf(reserveVault.address);
            const initFeeReceiverCurrency0Balance = await currencies[0].balanceOf(feeReceiver.address);

            const initPrestigePadNativeBalance = await ethers.provider.getBalance(prestigePad.address);
            const initInitiator1NativeBalance = await ethers.provider.getBalance(initiator1.address);
            const initFeeReceiverNativeBalance = await ethers.provider.getBalance(feeReceiver.address);
            const initReserveVaultNativeBalance = await ethers.provider.getBalance(reserveVault.address);

            const initPrestigePadCurrency1Balance = await currencies[1].balanceOf(prestigePad.address);
            const initInitiator1Currency1Balance = await currencies[1].balanceOf(initiator1.address);
            const initReserveVaultCurrency1Balance = await currencies[1].balanceOf(reserveVault.address);
            const initFeeReceiverCurrency1Balance = await currencies[1].balanceOf(feeReceiver.address);

            const initRaiseEndsAt = round.agenda.raiseEndsAt;

            let timestamp = initRaiseEndsAt + 1000;
            await time.setNextBlockTimestamp(timestamp);

            const tx = await getPrestigePadTxByParams_SafeConfirmCurrentRound(
                prestigePad,
                initiator1,
                { launchId: BigNumber.from(launchId) },
                { value: ethers.utils.parseEther('100') }
            );
            const receipt = await tx.wait();
            const gasFee = receipt.effectiveGasPrice.mul(receipt.gasUsed);

            await expect(tx)
                .to.emit(prestigePad, 'LaunchCurrentRoundConfirmation')
                .withArgs(launchId, roundId, round.quota.raisedQuantity, value, feeAmount, cashbackBaseAmount);
            await expect(tx).to.emit(reserveVault, 'FundProvision').withArgs(fundId);

            const roundAfter = await prestigePad.getRound(roundId);
            expect(roundAfter.agenda.confirmAt).to.equal(timestamp);
            expect(roundAfter.agenda.raiseEndsAt).to.equal(initRaiseEndsAt);

            const remainingQuantity = round.quota.totalQuantity.sub(round.quota.raisedQuantity);
            const unit = BigNumber.from(10).pow(await projectToken.decimals());

            expect(await projectToken.balanceOf(prestigePad.address, launchId)).to.equal(
                initPrestigePadProjectBalance.add(round.quota.raisedQuantity.mul(unit))
            );
            expect(await projectToken.balanceOf(initiator1.address, launchId)).to.equal(
                initInitiator1ProjectBalance.add(remainingQuantity.mul(unit))
            );

            expect(await currencies[0].balanceOf(prestigePad.address)).to.equal(
                initPrestigePadCurrency0Balance.sub(value)
            );
            expect(await currencies[0].balanceOf(initiator1.address)).to.equal(
                initInitiator1Currency0Balance.add(value.sub(feeAmount))
            );
            expect(await currencies[0].balanceOf(feeReceiver.address)).to.equal(
                initFeeReceiverCurrency0Balance.add(feeAmount.sub(cashbackBaseAmount))
            );
            expect(await currencies[0].balanceOf(reserveVault.address)).to.equal(
                initReserveVaultCurrency0Balance.add(cashbackBaseAmount)
            );

            expect(await ethers.provider.getBalance(prestigePad.address)).to.equal(initPrestigePadNativeBalance);
            expect(await ethers.provider.getBalance(initiator1.address)).to.equal(
                initInitiator1NativeBalance.sub(gasFee).sub(cashbackNativeValue)
            );
            expect(await ethers.provider.getBalance(reserveVault.address)).to.equal(
                initReserveVaultNativeBalance.add(cashbackNativeValue)
            );
            expect(await ethers.provider.getBalance(feeReceiver.address)).to.equal(initFeeReceiverNativeBalance);

            expect(await currencies[1].balanceOf(prestigePad.address)).to.equal(initPrestigePadCurrency1Balance);
            expect(await currencies[1].balanceOf(initiator1.address)).to.equal(
                initInitiator1Currency1Balance.sub(cashbackCurrency1Value)
            );
            expect(await currencies[1].balanceOf(reserveVault.address)).to.equal(
                initReserveVaultCurrency1Balance.add(cashbackCurrency1Value)
            );
            expect(await currencies[1].balanceOf(feeReceiver.address)).to.equal(initFeeReceiverCurrency1Balance);
        });

        it('7.1.15.3. Safe confirm current round successfully with erc20 without cashback', async () => {
            const fixture = await beforePrestigePadTest({
                addSampleLaunch: true,
                addSampleRounds: true,
                raiseFirstRound: true,
                depositFirstRound: true,
            });

            const { prestigePad, initiator2, projectToken, feeReceiver, reserveVault, currencies } = fixture;

            const launchId = 2;
            const roundId = (await prestigePad.getLaunch(launchId)).roundIds[1];
            const round = await prestigePad.getRound(roundId);
            const value = round.quote.unitPrice.mul(round.quota.raisedQuantity);
            const feeAmount = round.quote.feeDenomination.mul(round.quota.raisedQuantity);

            const initPrestigePadProjectBalance = await projectToken.balanceOf(prestigePad.address, launchId);
            const initInitiator2ProjectBalance = await projectToken.balanceOf(initiator2.address, launchId);

            const initPrestigePadCurrency0Balance = await currencies[0].balanceOf(prestigePad.address);
            const initInitiator2Currency0Balance = await currencies[0].balanceOf(initiator2.address);
            const initReserveVaultCurrency0Balance = await currencies[0].balanceOf(reserveVault.address);
            const initFeeReceiverCurrency0Balance = await currencies[0].balanceOf(feeReceiver.address);

            const initPrestigePadNativeBalance = await ethers.provider.getBalance(prestigePad.address);
            const initInitiator2NativeBalance = await ethers.provider.getBalance(initiator2.address);

            let timestamp = (await time.latest()) + 100;
            await time.setNextBlockTimestamp(timestamp);

            const tx = await getPrestigePadTxByParams_SafeConfirmCurrentRound(
                prestigePad,
                initiator2,
                { launchId: BigNumber.from(launchId) },
                { value: ethers.utils.parseEther('100') }
            );
            const receipt = await tx.wait();
            const gasFee = receipt.effectiveGasPrice.mul(receipt.gasUsed);

            await expect(tx)
                .to.emit(prestigePad, 'LaunchCurrentRoundConfirmation')
                .withArgs(launchId, roundId, round.quota.raisedQuantity, value, feeAmount, 0);
            await expect(tx).to.not.emit(reserveVault, 'FundProvision');

            const roundAfter = await prestigePad.getRound(roundId);
            expect(roundAfter.agenda.confirmAt).to.equal(timestamp);
            expect(roundAfter.agenda.raiseEndsAt).to.equal(timestamp);

            const remainingQuantity = round.quota.totalQuantity.sub(round.quota.raisedQuantity);
            const unit = BigNumber.from(10).pow(await projectToken.decimals());

            expect(await projectToken.balanceOf(prestigePad.address, launchId)).to.equal(
                initPrestigePadProjectBalance.add(round.quota.raisedQuantity.mul(unit))
            );
            expect(await projectToken.balanceOf(initiator2.address, launchId)).to.equal(
                initInitiator2ProjectBalance.add(remainingQuantity.mul(unit))
            );

            expect(await currencies[0].balanceOf(prestigePad.address)).to.equal(
                initPrestigePadCurrency0Balance.sub(value)
            );
            expect(await currencies[0].balanceOf(initiator2.address)).to.equal(
                initInitiator2Currency0Balance.add(value.sub(feeAmount))
            );
            expect(await currencies[0].balanceOf(feeReceiver.address)).to.equal(
                initFeeReceiverCurrency0Balance.add(feeAmount)
            );
            expect(await currencies[0].balanceOf(reserveVault.address)).to.equal(initReserveVaultCurrency0Balance);

            expect(await ethers.provider.getBalance(prestigePad.address)).to.equal(initPrestigePadNativeBalance);
            expect(await ethers.provider.getBalance(initiator2.address)).to.equal(
                initInitiator2NativeBalance.sub(gasFee)
            );
        });

        it('7.1.15.4. Safe confirm current round successfully with native currency without cashback', async () => {
            const fixture = await beforePrestigePadTest({
                addSampleLaunch: true,
                addSampleRounds: true,
                doAllFirstFound: true,
                raiseSecondRound: true,
                depositSecondRound: true,
            });

            const { prestigePad, initiator2, projectToken, feeReceiver, reserveVault } = fixture;

            const launchId = 2;
            const roundId = (await prestigePad.getLaunch(launchId)).roundIds[2];
            const round = await prestigePad.getRound(roundId);
            const value = round.quote.unitPrice.mul(round.quota.raisedQuantity);
            const feeAmount = round.quote.feeDenomination.mul(round.quota.raisedQuantity);

            const initPrestigePadProjectBalance = await projectToken.balanceOf(prestigePad.address, launchId);
            const initInitiator2ProjectBalance = await projectToken.balanceOf(initiator2.address, launchId);

            const initPrestigePadNativeBalance = await ethers.provider.getBalance(prestigePad.address);
            const initInitiator2NativeBalance = await ethers.provider.getBalance(initiator2.address);
            const initFeeReceiverNativeBalance = await ethers.provider.getBalance(feeReceiver.address);
            const initReserveVaultNativeBalance = await ethers.provider.getBalance(reserveVault.address);

            let timestamp = (await time.latest()) + 100;
            await time.setNextBlockTimestamp(timestamp);

            const tx = await getPrestigePadTxByParams_SafeConfirmCurrentRound(
                prestigePad,
                initiator2,
                { launchId: BigNumber.from(launchId) },
                { value: ethers.utils.parseEther('100') }
            );
            const receipt = await tx.wait();
            const gasFee = receipt.effectiveGasPrice.mul(receipt.gasUsed);

            await expect(tx)
                .to.emit(prestigePad, 'LaunchCurrentRoundConfirmation')
                .withArgs(launchId, roundId, round.quota.raisedQuantity, value, feeAmount, 0);
            await expect(tx).to.not.emit(reserveVault, 'FundProvision');

            const roundAfter = await prestigePad.getRound(roundId);
            expect(roundAfter.agenda.confirmAt).to.equal(timestamp);
            expect(roundAfter.agenda.raiseEndsAt).to.equal(timestamp);

            const remainingQuantity = round.quota.totalQuantity.sub(round.quota.raisedQuantity);
            const unit = BigNumber.from(10).pow(await projectToken.decimals());

            expect(await projectToken.balanceOf(prestigePad.address, launchId)).to.equal(
                initPrestigePadProjectBalance.add(round.quota.raisedQuantity.mul(unit))
            );
            expect(await projectToken.balanceOf(initiator2.address, launchId)).to.equal(
                initInitiator2ProjectBalance.add(remainingQuantity.mul(unit))
            );

            expect(await ethers.provider.getBalance(prestigePad.address)).to.equal(
                initPrestigePadNativeBalance.sub(value)
            );
            expect(await ethers.provider.getBalance(initiator2.address)).to.equal(
                initInitiator2NativeBalance.sub(gasFee).add(value.sub(feeAmount))
            );
            expect(await ethers.provider.getBalance(feeReceiver.address)).to.equal(
                initFeeReceiverNativeBalance.add(feeAmount)
            );
            expect(await ethers.provider.getBalance(reserveVault.address)).to.equal(initReserveVaultNativeBalance);
        });

        it('7.1.15.5. Safe confirm current round successfully with native currency in both main and extra currencies', async () => {
            const fixture = await beforePrestigePadTest({
                addSampleLaunch: true,
                addSampleRounds: true,
            });

            const { prestigePad, initiator1, depositor1, projectToken, feeReceiver, reserveVault } =
                fixture;

            let timestamp = (await time.latest()) + 100;
            await time.setNextBlockTimestamp(timestamp);

            const launchId = 1;

            await callTransaction(
                getPrestigePadTx_ScheduleNextRound(prestigePad, initiator1, {
                    launchId: BigNumber.from(launchId),
                    cashbackThreshold: BigNumber.from('5'),
                    cashbackBaseRate: ethers.utils.parseEther('0.1'),
                    cashbackCurrencies: [ethers.constants.AddressZero],
                    cashbackDenominations: [ethers.utils.parseEther('0.01')],
                    raiseStartsAt: timestamp + 10,
                    raiseDuration: Constant.PRESTIGE_PAD_RAISE_MINIMUM_DURATION + 10,
                })
            );

            const roundId = (await prestigePad.getLaunch(launchId)).roundIds[1];
            timestamp = (await prestigePad.getRound(roundId)).agenda.raiseStartsAt;
            await time.setNextBlockTimestamp(timestamp);

            await callTransaction(
                getPrestigePadTx_ContributeCurrentRound(
                    prestigePad,
                    depositor1,
                    {
                        launchId: BigNumber.from(launchId),
                        quantity: BigNumber.from(10),
                    },
                    { value: ethers.utils.parseEther('10') }
                )
            );

            const round = await prestigePad.getRound(roundId);
            const value = round.quote.unitPrice.mul(round.quota.raisedQuantity);
            const feeAmount = round.quote.feeDenomination.mul(round.quota.raisedQuantity);

            const fundId = round.quote.cashbackFundId;
            const fund = await reserveVault.getFund(fundId);
            const cashbackBaseAmount = fund.mainDenomination.mul(round.quota.raisedQuantity);
            const cashbackExtraAmount = fund.extraDenominations[0].mul(round.quota.raisedQuantity);

            const initPrestigePadProjectBalance = await projectToken.balanceOf(prestigePad.address, launchId);
            const initInitiator1ProjectBalance = await projectToken.balanceOf(initiator1.address, launchId);

            let initPrestigePadNativeBalance = await ethers.provider.getBalance(prestigePad.address);
            let initInitiator1NativeBalance = await ethers.provider.getBalance(initiator1.address);
            let initFeeReceiverNativeBalance = await ethers.provider.getBalance(feeReceiver.address);
            let initReserveVaultNativeBalance = await ethers.provider.getBalance(reserveVault.address);

            timestamp += 10;
            await time.setNextBlockTimestamp(timestamp);

            const tx = await getPrestigePadTxByParams_SafeConfirmCurrentRound(
                prestigePad,
                initiator1,
                { launchId: BigNumber.from(launchId) },
                { value: ethers.utils.parseEther('100') }
            );
            const receipt = await tx.wait();
            const gasFee = receipt.effectiveGasPrice.mul(receipt.gasUsed);

            await expect(tx)
                .to.emit(prestigePad, 'LaunchCurrentRoundConfirmation')
                .withArgs(launchId, roundId, round.quota.raisedQuantity, value, feeAmount, cashbackBaseAmount);
            await expect(tx).to.emit(reserveVault, 'FundProvision').withArgs(fundId);

            const roundAfter = await prestigePad.getRound(roundId);
            expect(roundAfter.agenda.confirmAt).to.equal(timestamp);
            expect(roundAfter.agenda.raiseEndsAt).to.equal(timestamp);

            const remainingQuantity = round.quota.totalQuantity.sub(round.quota.raisedQuantity);
            const unit = BigNumber.from(10).pow(await projectToken.decimals());

            expect(await projectToken.balanceOf(prestigePad.address, launchId)).to.equal(
                initPrestigePadProjectBalance.add(round.quota.raisedQuantity.mul(unit))
            );
            expect(await projectToken.balanceOf(initiator1.address, launchId)).to.equal(
                initInitiator1ProjectBalance.add(remainingQuantity.mul(unit))
            );

            expect(await ethers.provider.getBalance(prestigePad.address)).to.equal(
                initPrestigePadNativeBalance.sub(value)
            );
            expect(await ethers.provider.getBalance(initiator1.address)).to.equal(
                initInitiator1NativeBalance.sub(gasFee).add(value.sub(feeAmount)).sub(cashbackExtraAmount)
            );
            expect(await ethers.provider.getBalance(feeReceiver.address)).to.equal(
                initFeeReceiverNativeBalance.add(feeAmount.sub(cashbackBaseAmount))
            );
            expect(await ethers.provider.getBalance(reserveVault.address)).to.equal(
                initReserveVaultNativeBalance.add(cashbackBaseAmount).add(cashbackExtraAmount)
            );
        });

        it('7.1.15.6. Safe confirm current round successfully with erc20 currency in both main and extra currencies', async () => {
            const fixture = await beforePrestigePadTest({
                addSampleLaunch: true,
                addSampleRounds: true,
            });

            const { prestigePad, initiator2, depositor1, currencies, projectToken, feeReceiver, reserveVault } =
                fixture;

            let timestamp = (await time.latest()) + 100;
            await time.setNextBlockTimestamp(timestamp);

            const launchId = 2;

            await callTransaction(
                getPrestigePadTx_ScheduleNextRound(prestigePad, initiator2, {
                    launchId: BigNumber.from(launchId),
                    cashbackThreshold: BigNumber.from('5'),
                    cashbackBaseRate: ethers.utils.parseEther('0.1'),
                    cashbackCurrencies: [currencies[0].address],
                    cashbackDenominations: [ethers.utils.parseEther('0.01')],
                    raiseStartsAt: timestamp + 10,
                    raiseDuration: Constant.PRESTIGE_PAD_RAISE_MINIMUM_DURATION + 10,
                })
            );

            const roundId = (await prestigePad.getLaunch(launchId)).roundIds[1];
            timestamp = (await prestigePad.getRound(roundId)).agenda.raiseStartsAt;
            await time.setNextBlockTimestamp(timestamp);

            await callTransaction(
                getPrestigePadTx_ContributeCurrentRound(
                    prestigePad,
                    depositor1,
                    {
                        launchId: BigNumber.from(launchId),
                        quantity: BigNumber.from(500),
                    },
                    { value: ethers.utils.parseEther('10') }
                )
            );

            const round = await prestigePad.getRound(roundId);
            const value = round.quote.unitPrice.mul(round.quota.raisedQuantity);
            const feeAmount = round.quote.feeDenomination.mul(round.quota.raisedQuantity);

            const fundId = round.quote.cashbackFundId;
            const fund = await reserveVault.getFund(fundId);
            const cashbackBaseAmount = fund.mainDenomination.mul(round.quota.raisedQuantity);
            const cashbackExtraAmount = fund.extraDenominations[0].mul(round.quota.raisedQuantity);

            const initPrestigePadProjectBalance = await projectToken.balanceOf(prestigePad.address, launchId);
            const initInitiator2ProjectBalance = await projectToken.balanceOf(initiator2.address, launchId);

            let initPrestigePadNativeBalance = await ethers.provider.getBalance(prestigePad.address);
            let initInitiator2NativeBalance = await ethers.provider.getBalance(initiator2.address);
            let initFeeReceiverNativeBalance = await ethers.provider.getBalance(feeReceiver.address);
            let initReserveVaultNativeBalance = await ethers.provider.getBalance(reserveVault.address);

            let initPrestigePadCurrency0Balance = await currencies[0].balanceOf(prestigePad.address);
            let initInitiator2Currency0Balance = await currencies[0].balanceOf(initiator2.address);
            let initFeeReceiverCurrency0Balance = await currencies[0].balanceOf(feeReceiver.address);
            let initReserveVaultCurrency0Balance = await currencies[0].balanceOf(reserveVault.address);

            timestamp += 10;
            await time.setNextBlockTimestamp(timestamp);

            const tx = await getPrestigePadTxByParams_SafeConfirmCurrentRound(
                prestigePad,
                initiator2,
                { launchId: BigNumber.from(launchId) },
                { value: ethers.utils.parseEther('100') }
            );
            const receipt = await tx.wait();
            const gasFee = receipt.effectiveGasPrice.mul(receipt.gasUsed);

            await expect(tx)
                .to.emit(prestigePad, 'LaunchCurrentRoundConfirmation')
                .withArgs(launchId, roundId, round.quota.raisedQuantity, value, feeAmount, cashbackBaseAmount);
            await expect(tx).to.emit(reserveVault, 'FundProvision').withArgs(fundId);

            const roundAfter = await prestigePad.getRound(roundId);
            expect(roundAfter.agenda.confirmAt).to.equal(timestamp);
            expect(roundAfter.agenda.raiseEndsAt).to.equal(timestamp);

            const remainingQuantity = round.quota.totalQuantity.sub(round.quota.raisedQuantity);
            const unit = BigNumber.from(10).pow(await projectToken.decimals());

            expect(await projectToken.balanceOf(prestigePad.address, launchId)).to.equal(
                initPrestigePadProjectBalance.add(round.quota.raisedQuantity.mul(unit))
            );
            expect(await projectToken.balanceOf(initiator2.address, launchId)).to.equal(
                initInitiator2ProjectBalance.add(remainingQuantity.mul(unit))
            );

            expect(await currencies[0].balanceOf(prestigePad.address)).to.equal(
                initPrestigePadCurrency0Balance.sub(value)
            );
            expect(await currencies[0].balanceOf(initiator2.address)).to.equal(
                initInitiator2Currency0Balance.add(value.sub(feeAmount)).sub(cashbackExtraAmount)
            );
            expect(await currencies[0].balanceOf(feeReceiver.address)).to.equal(
                initFeeReceiverCurrency0Balance.add(feeAmount.sub(cashbackBaseAmount))
            );
            expect(await currencies[0].balanceOf(reserveVault.address)).to.equal(
                initReserveVaultCurrency0Balance.add(cashbackBaseAmount).add(cashbackExtraAmount)
            );

            expect(await ethers.provider.getBalance(prestigePad.address)).to.equal(initPrestigePadNativeBalance);
            expect(await ethers.provider.getBalance(initiator2.address)).to.equal(
                initInitiator2NativeBalance.sub(gasFee)
            );
            expect(await ethers.provider.getBalance(feeReceiver.address)).to.equal(initFeeReceiverNativeBalance);
            expect(await ethers.provider.getBalance(reserveVault.address)).to.equal(initReserveVaultNativeBalance);
        });

        it('7.1.15.7. Safe confirm current round unsuccessfully when the contract is reentered', async () => {
            const fixture = await beforePrestigePadTest({
                addSampleLaunch: true,
                addSampleRounds: true,
                raiseFirstRound: true,
                depositFirstRound: true,
                useReentrancyERC20: true,
            });

            const { prestigePad, initiator2, reentrancyERC20 } = fixture;

            const launchId = 2;

            await testReentrancy_prestigePad(fixture, reentrancyERC20, async (timestamp: number) => {
                await expect(
                    getPrestigePadTxByParams_SafeConfirmCurrentRound(
                        prestigePad,
                        initiator2,
                        { launchId: BigNumber.from(launchId) },
                        { value: ethers.utils.parseEther('100') }
                    )
                ).to.be.revertedWith('ReentrancyGuard: reentrant call');
            });
        });

        it('7.1.15.8. Safe confirm current round unsuccessfully with invalid launch id', async () => {
            const fixture = await beforePrestigePadTest();

            const { prestigePad, initiator1 } = fixture;

            const params1 = {
                launchId: BigNumber.from(0),
                anchor: ethers.utils.keccak256(ethers.utils.toUtf8Bytes('invalid anchor')),
            };
            await expect(
                getPrestigePadTx_SafeConfirmCurrentRound(prestigePad, initiator1, params1, {
                    value: ethers.utils.parseEther('100'),
                })
            ).to.be.revertedWithCustomError(prestigePad, 'InvalidLaunchId');

            const params2 = {
                launchId: BigNumber.from(100),
                anchor: ethers.utils.keccak256(ethers.utils.toUtf8Bytes('invalid anchor')),
            };
            await expect(
                getPrestigePadTx_SafeConfirmCurrentRound(prestigePad, initiator1, params2, {
                    value: ethers.utils.parseEther('100'),
                })
            ).to.be.revertedWithCustomError(prestigePad, 'InvalidLaunchId');
        });

        it('7.1.15.9. Safe confirm current round unsuccessfully with invalid anchor', async () => {
            const fixture = await beforePrestigePadTest({
                addSampleLaunch: true,
                addSampleRounds: true,
                raiseFirstRound: true,
                depositFirstRound: true,
            });

            const { prestigePad, initiator1 } = fixture;

            await expect(
                getPrestigePadTx_SafeConfirmCurrentRound(
                    prestigePad,
                    initiator1,
                    {
                        launchId: BigNumber.from(1),
                        anchor: ethers.utils.keccak256(ethers.utils.toUtf8Bytes('invalid anchor')),
                    },
                    { value: ethers.utils.parseEther('100') }
                )
            ).to.be.revertedWithCustomError(prestigePad, 'BadAnchor');
        });

        it('7.1.15.10. Safe confirm current round unsuccessfully when sender is not launch initiator', async () => {
            const fixture = await beforePrestigePadTest({
                addSampleLaunch: true,
                addSampleRounds: true,
                raiseFirstRound: true,
                depositFirstRound: true,
            });

            const { prestigePad, manager, initiator1 } = fixture;

            await expect(
                getPrestigePadTxByParams_SafeConfirmCurrentRound(
                    prestigePad,
                    manager,
                    { launchId: BigNumber.from(1) },
                    { value: ethers.utils.parseEther('100') }
                )
            ).to.be.revertedWithCustomError(prestigePad, 'Unauthorized');

            await expect(
                getPrestigePadTxByParams_SafeConfirmCurrentRound(
                    prestigePad,
                    initiator1,
                    { launchId: BigNumber.from(2) },
                    { value: ethers.utils.parseEther('100') }
                )
            ).to.be.revertedWithCustomError(prestigePad, 'Unauthorized');
        });

        it('7.1.15.11. Safe confirm current round unsuccessfully when paused', async () => {
            const fixture = await beforePrestigePadTest({
                addSampleLaunch: true,
                addSampleRounds: true,
                raiseFirstRound: true,
                depositFirstRound: true,
                pause: true,
            });

            const { prestigePad, initiator1 } = fixture;

            await expect(
                getPrestigePadTxByParams_SafeConfirmCurrentRound(
                    prestigePad,
                    initiator1,
                    { launchId: BigNumber.from(1) },
                    { value: ethers.utils.parseEther('100') }
                )
            ).to.be.revertedWith('Pausable: paused');
        });

        it('7.1.15.12. Safe confirm current round unsuccessfully with finalized launch', async () => {
            const fixture = await beforePrestigePadTest({
                addSampleLaunch: true,
                addSampleRounds: true,
                doAllFirstFound: true,
                doAllSecondFound: true,
                finalizeLaunch: true,
            });

            const { prestigePad, initiator1 } = fixture;

            await expect(
                getPrestigePadTxByParams_SafeConfirmCurrentRound(
                    prestigePad,
                    initiator1,
                    { launchId: BigNumber.from(1) },
                    { value: ethers.utils.parseEther('100') }
                )
            ).to.be.revertedWithCustomError(prestigePad, 'AlreadyFinalized');
        });

        it('7.1.15.13. Safe confirm current round unsuccessfully with confirmed round', async () => {
            const fixture = await beforePrestigePadTest({
                addSampleLaunch: true,
                addSampleRounds: true,
                raiseFirstRound: true,
                depositFirstRound: true,
                confirmFirstRound: true,
            });

            const { prestigePad, initiator1 } = fixture;

            await expect(
                getPrestigePadTxByParams_SafeConfirmCurrentRound(
                    prestigePad,
                    initiator1,
                    { launchId: BigNumber.from(1) },
                    { value: ethers.utils.parseEther('100') }
                )
            ).to.be.revertedWithCustomError(prestigePad, 'AlreadyConfirmed');
        });

        it('7.1.15.14. Safe confirm current round unsuccessfully when confirm time limit is overdue', async () => {
            const fixture = await beforePrestigePadTest({
                addSampleLaunch: true,
                addSampleRounds: true,
                raiseFirstRound: true,
                depositFirstRound: true,
            });

            const { prestigePad, initiator1 } = fixture;

            const launchId = 1;
            const roundId = (await prestigePad.getLaunch(launchId)).roundIds[1];

            let confirmDue =
                (await prestigePad.getRound(roundId)).agenda.raiseEndsAt +
                Constant.PRESTIGE_PAD_RAISE_CONFIRMATION_TIME_LIMIT;

            await time.setNextBlockTimestamp(confirmDue);

            await expect(
                getPrestigePadTxByParams_SafeConfirmCurrentRound(
                    prestigePad,
                    initiator1,
                    { launchId: BigNumber.from(launchId) },
                    { value: ethers.utils.parseEther('100') }
                )
            ).to.be.revertedWithCustomError(prestigePad, 'Timeout');

            await time.setNextBlockTimestamp(confirmDue + 5);

            await expect(
                getPrestigePadTxByParams_SafeConfirmCurrentRound(
                    prestigePad,
                    initiator1,
                    { launchId: BigNumber.from(launchId) },
                    { value: ethers.utils.parseEther('100') }
                )
            ).to.be.revertedWithCustomError(prestigePad, 'Timeout');
        });

        it('7.1.15.15. Safe confirm current round unsuccessfully when sold quantity is not enough', async () => {
            const fixture = await beforePrestigePadTest({
                addSampleLaunch: true,
                addSampleRounds: true,
                raiseFirstRound: true,
            });

            const { prestigePad, initiator1, depositor1 } = fixture;

            const launchId = 1;
            const roundId = (await prestigePad.getLaunch(launchId)).roundIds[1];
            const round = await prestigePad.getRound(roundId);
            const minRaisingQuantity = round.quota.minRaisingQuantity;
            const raiseStartsAt = round.agenda.raiseStartsAt;

            // Not enough sold quantity
            await time.setNextBlockTimestamp(raiseStartsAt);

            await expect(
                getPrestigePadTxByParams_SafeConfirmCurrentRound(
                    prestigePad,
                    initiator1,
                    { launchId: BigNumber.from(launchId) },
                    { value: ethers.utils.parseEther('100') }
                )
            ).to.be.revertedWithCustomError(prestigePad, 'NotEnoughSoldQuantity');

            // Just enough sold quantity
            await callTransaction(
                getPrestigePadTx_ContributeCurrentRound(
                    prestigePad,
                    depositor1,
                    {
                        launchId: BigNumber.from(1),
                        quantity: BigNumber.from(minRaisingQuantity),
                    },
                    { value: ethers.utils.parseEther('100') }
                )
            );

            await expect(
                getPrestigePadTxByParams_SafeConfirmCurrentRound(
                    prestigePad,
                    initiator1,
                    { launchId: BigNumber.from(launchId) },
                    { value: ethers.utils.parseEther('100') }
                )
            ).to.be.not.reverted;
        });

        it('7.1.15.16. Safe confirm current round unsuccessfully when sending native token to initiator failed', async () => {
            const fixture = await beforePrestigePadTest({
                addSampleLaunch: true,
                addSampleRounds: true,
                raiseFirstRound: true,
                depositFirstRound: true,
                useFailReceiverAsInitiator: true,
            });

            const { prestigePad, failReceiver } = fixture;

            await callTransaction(failReceiver.activate(true));

            await expect(
                getCallTxByParams_SafeConfirmCurrentRound(
                    prestigePad,
                    failReceiver,
                    { launchId: BigNumber.from(1) },
                    { value: ethers.utils.parseEther('100') }
                )
            ).to.be.revertedWithCustomError(prestigePad, 'FailedTransfer');
        });

        it('7.1.15.17. Safe confirm current round unsuccessfully when providing fund failed', async () => {
            const fixture = await beforePrestigePadTest({
                addSampleLaunch: true,
                addSampleRounds: true,
                raiseFirstRound: true,
                depositFirstRound: true,
            });

            const { deployer, prestigePad, initiator1, reserveVault, admin, admins } = fixture;

            await callTransaction(getPausableTxByInput_Pause(reserveVault as any, deployer, admin, admins));

            await expect(
                getPrestigePadTxByParams_SafeConfirmCurrentRound(
                    prestigePad,
                    initiator1,
                    { launchId: BigNumber.from(1) },
                    { value: ethers.utils.parseEther('100') }
                )
            ).to.be.revertedWith('Pausable: paused');
        });
    });

    describe('7.1.16. safeFinalize(uint256,bytes32)', async () => {
        it('7.1.16.1. Finalize launch successfully', async () => {
            const fixture = await beforePrestigePadTest({
                addSampleLaunch: true,
                addSampleRounds: true,
                doAllFirstFound: true,
                doAllSecondFound: true,
            });

            const { prestigePad, initiator1 } = fixture;

            const launchId = 1;

            const tx = await getPrestigePadTxByParams_SafeFinalize(prestigePad, initiator1, {
                launchId: BigNumber.from(launchId),
            });
            await expect(tx).to.emit(prestigePad, 'LaunchFinalization').withArgs(launchId);

            const launchAfter = await prestigePad.getLaunch(launchId);
            expect(launchAfter.isFinalized).to.be.true;
        });

        it('7.1.16.2. Finalize launch unsuccessfully with invalid launch id', async () => {
            const fixture = await beforePrestigePadTest();

            const { prestigePad, initiator1 } = fixture;

            const params1 = {
                launchId: BigNumber.from(0),
                anchor: ethers.utils.keccak256(ethers.utils.toUtf8Bytes('invalid anchor')),
            };
            await expect(getPrestigePadTx_SafeFinalize(prestigePad, initiator1, params1)).to.be.revertedWithCustomError(
                prestigePad,
                'InvalidLaunchId'
            );

            const params2 = {
                launchId: BigNumber.from(100),
                anchor: ethers.utils.keccak256(ethers.utils.toUtf8Bytes('invalid anchor')),
            };
            await expect(getPrestigePadTx_SafeFinalize(prestigePad, initiator1, params2)).to.be.revertedWithCustomError(
                prestigePad,
                'InvalidLaunchId'
            );
        });

        it('7.1.16.3. Finalize launch unsuccessfully when sender is not launch initiator', async () => {
            const fixture = await beforePrestigePadTest({
                addSampleLaunch: true,
                addSampleRounds: true,
                doAllFirstFound: true,
                doAllSecondFound: true,
            });

            const { prestigePad, manager, initiator1 } = fixture;

            // By manager
            await expect(
                getPrestigePadTxByParams_SafeFinalize(prestigePad, manager, {
                    launchId: BigNumber.from(1),
                })
            ).to.be.revertedWithCustomError(prestigePad, 'Unauthorized');

            // By wrong initiator
            await expect(
                getPrestigePadTxByParams_SafeFinalize(prestigePad, initiator1, {
                    launchId: BigNumber.from(2),
                })
            ).to.be.revertedWithCustomError(prestigePad, 'Unauthorized');
        });

        it('7.1.16.4. Finalize launch unsuccessfully when paused', async () => {
            const fixture = await beforePrestigePadTest({
                addSampleLaunch: true,
                addSampleRounds: true,
                doAllFirstFound: true,
                doAllSecondFound: true,
                pause: true,
            });

            const { prestigePad, initiator1 } = fixture;

            await expect(
                getPrestigePadTxByParams_SafeFinalize(prestigePad, initiator1, {
                    launchId: BigNumber.from(1),
                })
            ).to.be.revertedWith('Pausable: paused');
        });

        it('7.1.16.5. Finalize launch unsuccessfully with invalid anchor', async () => {
            const fixture = await beforePrestigePadTest({
                addSampleLaunch: true,
                addSampleRounds: true,
                doAllFirstFound: true,
                doAllSecondFound: true,
            });

            const { prestigePad, initiator1 } = fixture;

            await expect(
                getPrestigePadTx_SafeFinalize(prestigePad, initiator1, {
                    launchId: BigNumber.from(1),
                    anchor: ethers.utils.keccak256(ethers.utils.toUtf8Bytes('invalid anchor')),
                })
            ).to.be.revertedWithCustomError(prestigePad, 'BadAnchor');
        });

        it('7.1.16.6. Finalize launch unsuccessfully with already finalized launch', async () => {
            const fixture = await beforePrestigePadTest({
                addSampleLaunch: true,
                addSampleRounds: true,
                doAllFirstFound: true,
                doAllSecondFound: true,
                finalizeLaunch: true,
            });

            const { prestigePad, initiator1 } = fixture;

            await expect(
                getPrestigePadTxByParams_SafeFinalize(prestigePad, initiator1, {
                    launchId: BigNumber.from(1),
                })
            ).to.be.revertedWithCustomError(prestigePad, 'AlreadyFinalized');
        });

        it('7.1.16.7. Finalize launch unsuccessfully when there are more round to raise', async () => {
            const fixture = await beforePrestigePadTest({
                addSampleLaunch: true,
                addSampleRounds: true,
                doAllFirstFound: true,
            });

            const { prestigePad, initiator1 } = fixture;

            await expect(
                getPrestigePadTxByParams_SafeFinalize(prestigePad, initiator1, {
                    launchId: BigNumber.from(1),
                })
            ).to.be.revertedWithCustomError(prestigePad, 'InvalidFinalizing');
        });

        it('7.1.16.8. Finalize launch unsuccessfully when current round is not confirmed', async () => {
            const fixture = await beforePrestigePadTest({
                addSampleLaunch: true,
                addSampleRounds: true,
                doAllFirstFound: true,
                raiseSecondRound: true,
            });

            const { prestigePad, initiator1 } = fixture;

            await expect(
                getPrestigePadTxByParams_SafeFinalize(prestigePad, initiator1, {
                    launchId: BigNumber.from(1),
                })
            ).to.be.revertedWithCustomError(prestigePad, 'InvalidFinalizing');
        });
    });

    describe('7.1.17. contributeCurrentRound(uint256,uint256)', async () => {
        it('7.1.17.1. Deposit current round successfully with native currency', async () => {
            const fixture = await beforePrestigePadTest({
                addSampleLaunch: true,
                addSampleRounds: true,
                raiseFirstRound: true,
            });

            const { prestigePad, depositor1, depositor2, depositor3, reserveVault } = fixture;

            const launchId = 1;
            const roundId = (await prestigePad.getLaunch(launchId)).roundIds[1];
            const roundBefore = await prestigePad.getRound(roundId);
            const fundId = roundBefore.quote.cashbackFundId;

            // Tx1: Fund not expanded

            let timestamp = roundBefore.agenda.raiseStartsAt;
            await time.setNextBlockTimestamp(timestamp);

            let initDepositor1NativeBalance = await ethers.provider.getBalance(depositor1.address);
            let initPrestigePadNativeBalance = await ethers.provider.getBalance(prestigePad.address);

            const quantity1 = 2;
            const value1 = roundBefore.quote.unitPrice.mul(quantity1);

            const tx1 = await getPrestigePadTx_ContributeCurrentRound(
                prestigePad,
                depositor1,
                {
                    launchId: BigNumber.from(launchId),
                    quantity: BigNumber.from(quantity1),
                },
                { value: value1 }
            );
            const receipt1 = await tx1.wait();
            const gasFee1 = receipt1.effectiveGasPrice.mul(receipt1.gasUsed);

            await expect(tx1)
                .to.emit(prestigePad, 'Contribution')
                .withArgs(launchId, roundId, depositor1.address, quantity1, value1);
            await expect(tx1).to.not.emit(reserveVault, 'FundExpansion');

            expect(await ethers.provider.getBalance(depositor1.address)).to.equal(
                initDepositor1NativeBalance.sub(gasFee1).sub(value1)
            );
            expect(await ethers.provider.getBalance(prestigePad.address)).to.equal(
                initPrestigePadNativeBalance.add(value1)
            );

            const roundAfter1 = await prestigePad.getRound(roundId);
            expect(roundAfter1.quota.raisedQuantity).to.equal(roundBefore.quota.raisedQuantity.add(quantity1));

            expect(await prestigePad.contributions(roundId, depositor1.address)).to.equal(quantity1);

            expect((await reserveVault.getFund(fundId)).quantity).to.equal(0);

            // Tx2: Another user deposit
            let initDepositor2NativeBalance = await ethers.provider.getBalance(depositor2.address);
            initPrestigePadNativeBalance = await ethers.provider.getBalance(prestigePad.address);

            const quantity2 = 4;
            const value2 = roundBefore.quote.unitPrice.mul(quantity2);

            const tx2 = await getPrestigePadTx_ContributeCurrentRound(
                prestigePad,
                depositor2,
                {
                    launchId: BigNumber.from(launchId),
                    quantity: BigNumber.from(quantity2),
                },
                { value: value2.add(ethers.utils.parseEther('1')) }
            );
            const receipt2 = await tx2.wait();
            const gasFee2 = receipt2.effectiveGasPrice.mul(receipt2.gasUsed);

            await expect(tx2)
                .to.emit(prestigePad, 'Contribution')
                .withArgs(launchId, roundId, depositor2.address, quantity2, value2);
            await expect(tx2).to.not.emit(reserveVault, 'FundExpansion');

            expect(await ethers.provider.getBalance(depositor2.address)).to.equal(
                initDepositor2NativeBalance.sub(gasFee2).sub(value2)
            );
            expect(await ethers.provider.getBalance(prestigePad.address)).to.equal(
                initPrestigePadNativeBalance.add(value2)
            );

            const roundAfter2 = await prestigePad.getRound(roundId);
            expect(roundAfter2.quota.raisedQuantity).to.equal(
                roundBefore.quota.raisedQuantity.add(quantity1 + quantity2)
            );

            expect(await prestigePad.contributions(roundId, depositor2.address)).to.equal(quantity2);

            expect((await reserveVault.getFund(fundId)).quantity).to.equal(0);

            // Tx3: Depositor 1, fund expanded (2 + 5 = 7)

            const quantity3 = 5;
            const value3 = roundBefore.quote.unitPrice.mul(quantity3);

            initDepositor1NativeBalance = await ethers.provider.getBalance(depositor1.address);
            initPrestigePadNativeBalance = await ethers.provider.getBalance(prestigePad.address);

            const tx3 = await getPrestigePadTx_ContributeCurrentRound(
                prestigePad,
                depositor1,
                {
                    launchId: BigNumber.from(launchId),
                    quantity: BigNumber.from(quantity3),
                },
                { value: value3 }
            );
            const receipt3 = await tx3.wait();
            const gasFee3 = receipt3.effectiveGasPrice.mul(receipt3.gasUsed);

            await expect(tx3)
                .to.emit(prestigePad, 'Contribution')
                .withArgs(launchId, roundId, depositor1.address, quantity3, value3);
            await expect(tx3)
                .to.emit(reserveVault, 'FundExpansion')
                .withArgs(fundId, quantity1 + quantity3);

            expect(await ethers.provider.getBalance(depositor1.address)).to.equal(
                initDepositor1NativeBalance.sub(gasFee3).sub(value3)
            );
            expect(await ethers.provider.getBalance(prestigePad.address)).to.equal(
                initPrestigePadNativeBalance.add(value3)
            );

            const roundAfter3 = await prestigePad.getRound(roundId);
            expect(roundAfter3.quota.raisedQuantity).to.equal(
                roundBefore.quota.raisedQuantity.add(quantity1 + quantity2 + quantity3)
            );

            expect(await prestigePad.contributions(roundId, depositor1.address)).to.equal(quantity1 + quantity3);

            expect((await reserveVault.getFund(fundId)).quantity).to.equal(quantity1 + quantity3);

            // Tx4: Depositor 1 again. Fund expanded (7 + 8 = 15)

            const quantity4 = 8;
            const value4 = roundBefore.quote.unitPrice.mul(quantity4);

            initDepositor1NativeBalance = await ethers.provider.getBalance(depositor1.address);
            initPrestigePadNativeBalance = await ethers.provider.getBalance(prestigePad.address);

            const tx4 = await getPrestigePadTx_ContributeCurrentRound(
                prestigePad,
                depositor1,
                {
                    launchId: BigNumber.from(launchId),
                    quantity: BigNumber.from(quantity4),
                },
                { value: value4 }
            );
            const receipt4 = await tx4.wait();
            const gasFee4 = receipt4.effectiveGasPrice.mul(receipt4.gasUsed);

            await expect(tx4)
                .to.emit(prestigePad, 'Contribution')
                .withArgs(launchId, roundId, depositor1.address, quantity4, value4);
            await expect(tx4).to.emit(reserveVault, 'FundExpansion').withArgs(fundId, quantity4);

            expect(await ethers.provider.getBalance(depositor1.address)).to.equal(
                initDepositor1NativeBalance.sub(gasFee4).sub(value4)
            );
            expect(await ethers.provider.getBalance(prestigePad.address)).to.equal(
                initPrestigePadNativeBalance.add(value4)
            );

            const roundAfter4 = await prestigePad.getRound(roundId);
            expect(roundAfter4.quota.raisedQuantity).to.equal(
                roundBefore.quota.raisedQuantity.add(quantity1 + quantity2 + quantity3 + quantity4)
            );

            expect(await prestigePad.contributions(roundId, depositor1.address)).to.equal(
                quantity1 + quantity3 + quantity4
            );

            expect((await reserveVault.getFund(fundId)).quantity).to.equal(quantity1 + quantity3 + quantity4);

            // Tx5: Depositor 3, exceed the cashback threshold right from first deposit
            const quantity5 = 6;
            const value5 = roundBefore.quote.unitPrice.mul(quantity5);

            let initDepositor3NativeBalance = await ethers.provider.getBalance(depositor3.address);
            initPrestigePadNativeBalance = await ethers.provider.getBalance(prestigePad.address);

            const tx5 = await getPrestigePadTx_ContributeCurrentRound(
                prestigePad,
                depositor3,
                {
                    launchId: BigNumber.from(launchId),
                    quantity: BigNumber.from(quantity5),
                },
                { value: value5 }
            );
            const receipt5 = await tx5.wait();
            const gasFee5 = receipt5.effectiveGasPrice.mul(receipt5.gasUsed);

            await expect(tx5)
                .to.emit(prestigePad, 'Contribution')
                .withArgs(launchId, roundId, depositor3.address, quantity5, value5);
            await expect(tx5).to.emit(reserveVault, 'FundExpansion').withArgs(fundId, quantity5);

            expect(await ethers.provider.getBalance(depositor3.address)).to.equal(
                initDepositor3NativeBalance.sub(gasFee5).sub(value5)
            );
            expect(await ethers.provider.getBalance(prestigePad.address)).to.equal(
                initPrestigePadNativeBalance.add(value5)
            );

            const roundAfter5 = await prestigePad.getRound(roundId);
            expect(roundAfter5.quota.raisedQuantity).to.equal(
                roundBefore.quota.raisedQuantity.add(quantity1 + quantity2 + quantity3 + quantity4 + quantity5)
            );

            expect(await prestigePad.contributions(roundId, depositor3.address)).to.equal(quantity5);

            expect((await reserveVault.getFund(fundId)).quantity).to.equal(
                quantity1 + quantity3 + quantity4 + quantity5
            );
        });

        it('7.1.17.2. Deposit current round successfully with erc20 currency and no cashback', async () => {
            const fixture = await beforePrestigePadTest({
                addSampleLaunch: true,
                addSampleRounds: true,
                raiseFirstRound: true,
            });

            const { prestigePad, depositor1, currencies } = fixture;

            const launchId = 2;
            const roundId = (await prestigePad.getLaunch(launchId)).roundIds[1];
            const roundBefore = await prestigePad.getRound(roundId);
            const currency = currencies[0];

            let timestamp = roundBefore.agenda.raiseStartsAt;
            await time.setNextBlockTimestamp(timestamp);

            const initDepositor1ERC20Balance = await currency.balanceOf(depositor1.address);
            const initPrestigePadERC20Balance = await currency.balanceOf(prestigePad.address);

            const quantity = 3000;
            const value = roundBefore.quote.unitPrice.mul(quantity);

            const tx = await getPrestigePadTx_ContributeCurrentRound(prestigePad, depositor1, {
                launchId: BigNumber.from(launchId),
                quantity: BigNumber.from(quantity),
            });

            await expect(tx)
                .to.emit(prestigePad, 'Contribution')
                .withArgs(launchId, roundId, depositor1.address, quantity, value);

            expect(await currency.balanceOf(depositor1.address)).to.equal(initDepositor1ERC20Balance.sub(value));
            expect(await currency.balanceOf(prestigePad.address)).to.equal(initPrestigePadERC20Balance.add(value));

            const roundAfter = await prestigePad.getRound(roundId);
            expect(roundAfter.quota.raisedQuantity).to.equal(roundBefore.quota.raisedQuantity.add(quantity));

            expect(await prestigePad.contributions(roundId, depositor1.address)).to.equal(quantity);
        });

        it('7.1.17.3. Deposit current round unsuccessfully with invalid launch id', async () => {
            const fixture = await beforePrestigePadTest();

            const { prestigePad, depositor1 } = fixture;

            await expect(
                getPrestigePadTx_ContributeCurrentRound(prestigePad, depositor1, {
                    launchId: BigNumber.from(0),
                    quantity: BigNumber.from(5),
                })
            ).to.be.revertedWithCustomError(prestigePad, 'InvalidLaunchId');

            await expect(
                getPrestigePadTx_ContributeCurrentRound(prestigePad, depositor1, {
                    launchId: BigNumber.from(100),
                    quantity: BigNumber.from(5),
                })
            ).to.be.revertedWithCustomError(prestigePad, 'InvalidLaunchId');
        });

        it('7.1.17.4. Deposit current round unsuccessfully when the contract is reentered', async () => {
            const fixture = await beforePrestigePadTest({
                addSampleLaunch: true,
                addSampleRounds: true,
                raiseFirstRound: true,
                useReentrancyERC20: true,
            });

            const { prestigePad, depositor1, reentrancyERC20 } = fixture;

            const roundId = (await prestigePad.getLaunch(2)).roundIds[1];
            let timestamp = (await prestigePad.getRound(roundId)).agenda.raiseStartsAt;
            await time.setNextBlockTimestamp(timestamp);

            await testReentrancy_prestigePad(fixture, reentrancyERC20, async (timestamp: number) => {
                await expect(
                    getPrestigePadTx_ContributeCurrentRound(prestigePad, depositor1, {
                        launchId: BigNumber.from(2),
                        quantity: BigNumber.from(5),
                    })
                ).to.be.revertedWith('ReentrancyGuard: reentrant call');
            });
        });

        it('7.1.17.5. Deposit current round unsuccessfully when paused', async () => {
            const fixture = await beforePrestigePadTest({
                addSampleLaunch: true,
                addSampleRounds: true,
                raiseFirstRound: true,
                pause: true,
            });

            const { prestigePad, depositor1 } = fixture;

            const roundId = (await prestigePad.getLaunch(1)).roundIds[1];
            let timestamp = (await prestigePad.getRound(roundId)).agenda.raiseStartsAt;
            await time.setNextBlockTimestamp(timestamp);

            await expect(
                getPrestigePadTx_ContributeCurrentRound(
                    prestigePad,
                    depositor1,
                    {
                        launchId: BigNumber.from(1),
                        quantity: BigNumber.from(5),
                    },
                    { value: ethers.utils.parseEther('100') }
                )
            ).to.be.revertedWith('Pausable: paused');
        });

        it('7.1.17.6. Deposit current round unsuccessfully with finalized launch', async () => {
            const fixture = await beforePrestigePadTest({
                addSampleLaunch: true,
                addSampleRounds: true,
                doAllFirstFound: true,
                doAllSecondFound: true,
                finalizeLaunch: true,
            });

            const { prestigePad, depositor1 } = fixture;

            await expect(
                getPrestigePadTx_ContributeCurrentRound(
                    prestigePad,
                    depositor1,
                    {
                        launchId: BigNumber.from(1),
                        quantity: BigNumber.from(5),
                    },
                    { value: ethers.utils.parseEther('100') }
                )
            ).to.be.revertedWithCustomError(prestigePad, 'AlreadyFinalized');
        });

        it('7.1.17.7. Deposit current round unsuccessfully when current round is confirmed', async () => {
            const fixture = await beforePrestigePadTest({
                addSampleLaunch: true,
                addSampleRounds: true,
                raiseFirstRound: true,
                depositFirstRound: true,
                confirmFirstRound: true,
            });

            const { prestigePad, depositor1 } = fixture;

            await expect(
                getPrestigePadTx_ContributeCurrentRound(
                    prestigePad,
                    depositor1,
                    {
                        launchId: BigNumber.from(1),
                        quantity: BigNumber.from(5),
                    },
                    { value: ethers.utils.parseEther('100') }
                )
            ).to.be.revertedWithCustomError(prestigePad, 'AlreadyConfirmed');
        });

        it('7.1.17.8. Deposit current round unsuccessfully before raise starts', async () => {
            const fixture = await beforePrestigePadTest({
                addSampleLaunch: true,
                addSampleRounds: true,
                raiseFirstRound: true,
            });

            const { prestigePad, depositor1 } = fixture;

            const roundId = (await prestigePad.getLaunch(1)).roundIds[1];
            let timestamp = (await prestigePad.getRound(roundId)).agenda.raiseStartsAt;
            await time.setNextBlockTimestamp(timestamp - 5);

            await expect(
                getPrestigePadTx_ContributeCurrentRound(
                    prestigePad,
                    depositor1,
                    {
                        launchId: BigNumber.from(1),
                        quantity: BigNumber.from(5),
                    },
                    { value: ethers.utils.parseEther('100') }
                )
            ).to.be.revertedWithCustomError(prestigePad, 'InvalidContributing');

            await time.setNextBlockTimestamp(timestamp);

            await expect(
                getPrestigePadTx_ContributeCurrentRound(
                    prestigePad,
                    depositor1,
                    {
                        launchId: BigNumber.from(1),
                        quantity: BigNumber.from(5),
                    },
                    { value: ethers.utils.parseEther('100') }
                )
            ).to.not.be.reverted;
        });

        it('7.1.17.9. Deposit current round unsuccessfully after raise ends', async () => {
            const fixture = await beforePrestigePadTest({
                addSampleLaunch: true,
                addSampleRounds: true,
                raiseFirstRound: true,
            });

            const { prestigePad, depositor1 } = fixture;

            const roundId = (await prestigePad.getLaunch(1)).roundIds[1];
            let timestamp = (await prestigePad.getRound(roundId)).agenda.raiseEndsAt;
            await time.setNextBlockTimestamp(timestamp);

            await expect(
                getPrestigePadTx_ContributeCurrentRound(
                    prestigePad,
                    depositor1,
                    {
                        launchId: BigNumber.from(1),
                        quantity: BigNumber.from(5),
                    },
                    { value: ethers.utils.parseEther('100') }
                )
            ).to.be.revertedWithCustomError(prestigePad, 'InvalidContributing');

            await time.setNextBlockTimestamp(timestamp + 5);

            await expect(
                getPrestigePadTx_ContributeCurrentRound(
                    prestigePad,
                    depositor1,
                    {
                        launchId: BigNumber.from(1),
                        quantity: BigNumber.from(5),
                    },
                    { value: ethers.utils.parseEther('100') }
                )
            ).to.be.revertedWithCustomError(prestigePad, 'InvalidContributing');
        });

        it('7.1.17.10. Deposit current round unsuccessfully when deposit quantity exceed remaining quantity', async () => {
            const fixture = await beforePrestigePadTest({
                addSampleLaunch: true,
                addSampleRounds: true,
                raiseFirstRound: true,
            });

            const { prestigePad, depositor1 } = fixture;

            const roundId = (await prestigePad.getLaunch(1)).roundIds[1];
            const round = await prestigePad.getRound(roundId);
            let timestamp = round.agenda.raiseStartsAt;
            await time.setNextBlockTimestamp(timestamp);

            await expect(
                getPrestigePadTx_ContributeCurrentRound(
                    prestigePad,
                    depositor1,
                    {
                        launchId: BigNumber.from(1),
                        quantity: round.quota.maxRaisingQuantity.add(1),
                    },
                    { value: ethers.utils.parseEther('100') }
                )
            ).to.be.revertedWithCustomError(prestigePad, 'MaxRaisingQuantityExceeded');

            await expect(
                getPrestigePadTx_ContributeCurrentRound(
                    prestigePad,
                    depositor1,
                    {
                        launchId: BigNumber.from(1),
                        quantity: round.quota.maxRaisingQuantity,
                    },
                    { value: ethers.utils.parseEther('100') }
                )
            ).to.not.be.reverted;
        });

        it('7.1.17.11. Deposit current round unsuccessfully when expand fund failed', async () => {
            const fixture = await beforePrestigePadTest({
                addSampleLaunch: true,
                addSampleRounds: true,
                raiseFirstRound: true,
            });

            const { deployer, prestigePad, depositor1, admin, admins, reserveVault } = fixture;

            await callTransaction(getPausableTxByInput_Pause(reserveVault as any, deployer, admin, admins));

            const roundId = (await prestigePad.getLaunch(1)).roundIds[1];
            const round = await prestigePad.getRound(roundId);
            let timestamp = round.agenda.raiseStartsAt;
            await time.setNextBlockTimestamp(timestamp);

            await expect(
                getPrestigePadTx_ContributeCurrentRound(
                    prestigePad,
                    depositor1,
                    {
                        launchId: BigNumber.from(1),
                        quantity: BigNumber.from(10),
                    },
                    { value: ethers.utils.parseEther('100') }
                )
            ).to.be.revertedWith('Pausable: paused');
        });
    });

    describe('7.1.18. safeContributeCurrentRound(uint256,uint256,bytes32)', async () => {
        it('7.1.18.1. Safe deposit current round successfully', async () => {
            const fixture = await beforePrestigePadTest({
                addSampleLaunch: true,
                addSampleRounds: true,
                raiseFirstRound: true,
            });

            const { prestigePad, depositor1, currencies } = fixture;

            const launchId = 2;
            const roundId = (await prestigePad.getLaunch(launchId)).roundIds[1];
            const roundBefore = await prestigePad.getRound(roundId);
            const currency = currencies[0];

            let timestamp = roundBefore.agenda.raiseStartsAt;
            await time.setNextBlockTimestamp(timestamp);

            const initDepositor1ERC20Balance = await currency.balanceOf(depositor1.address);
            const initPrestigePadERC20Balance = await currency.balanceOf(prestigePad.address);

            const quantity = 3000;
            const value = roundBefore.quote.unitPrice.mul(quantity);

            const tx = await getPrestigePadTxByParams_SafeContributeCurrentRound(prestigePad, depositor1, {
                launchId: BigNumber.from(launchId),
                quantity: BigNumber.from(quantity),
            });
            await tx.wait();

            await expect(tx)
                .to.emit(prestigePad, 'Contribution')
                .withArgs(launchId, roundId, depositor1.address, quantity, value);

            expect(await currency.balanceOf(depositor1.address)).to.equal(initDepositor1ERC20Balance.sub(value));
            expect(await currency.balanceOf(prestigePad.address)).to.equal(initPrestigePadERC20Balance.add(value));

            const roundAfter = await prestigePad.getRound(roundId);
            expect(roundAfter.quota.raisedQuantity).to.equal(roundBefore.quota.raisedQuantity.add(quantity));

            expect(await prestigePad.contributions(roundId, depositor1.address)).to.equal(quantity);
        });

        it('7.1.18.2. Safe deposit current round unsuccessfully with invalid launch id', async () => {
            const fixture = await beforePrestigePadTest();

            const { prestigePad, depositor1 } = fixture;

            await expect(
                getPrestigePadTx_SafeContributeCurrentRound(prestigePad, depositor1, {
                    launchId: BigNumber.from(0),
                    quantity: BigNumber.from(5),
                    anchor: ethers.utils.keccak256(ethers.utils.toUtf8Bytes('')),
                })
            ).to.be.revertedWithCustomError(prestigePad, 'InvalidLaunchId');

            await expect(
                getPrestigePadTx_SafeContributeCurrentRound(prestigePad, depositor1, {
                    launchId: BigNumber.from(100),
                    quantity: BigNumber.from(5),
                    anchor: ethers.utils.keccak256(ethers.utils.toUtf8Bytes('')),
                })
            ).to.be.revertedWithCustomError(prestigePad, 'InvalidLaunchId');
        });

        it('7.1.18.3. Safe deposit current round unsuccessfully with invalid anchor', async () => {
            const fixture = await beforePrestigePadTest({
                addSampleLaunch: true,
                addSampleRounds: true,
                raiseFirstRound: true,
            });

            const { prestigePad, depositor1 } = fixture;

            const launchId = 2;
            const roundId = (await prestigePad.getLaunch(launchId)).roundIds[1];
            const round = await prestigePad.getRound(roundId);
            let timestamp = round.agenda.raiseStartsAt;
            await time.setNextBlockTimestamp(timestamp);

            await expect(
                getPrestigePadTx_SafeContributeCurrentRound(prestigePad, depositor1, {
                    launchId: BigNumber.from(launchId),
                    quantity: BigNumber.from(5),
                    anchor: ethers.utils.keccak256(ethers.utils.toUtf8Bytes('invalid')),
                })
            ).to.be.revertedWithCustomError(prestigePad, 'BadAnchor');
        });
    });

    describe('7.1.19. withdrawContribution(uint256)', async () => {
        it('7.1.19.1. Withdraw deposit successfully', async () => {
            const fixture = await beforePrestigePadTest({
                addSampleLaunch: true,
                addSampleRounds: true,
                raiseFirstRound: true,
                depositFirstRound: true,
            });

            const { prestigePad, depositor1, depositor2, currencies, initiator1, initiator2 } = fixture;

            const oldRoundId1 = (await prestigePad.getLaunch(1)).roundIds[1];
            const oldRound1 = await prestigePad.getRound(oldRoundId1);

            const oldRoundId2 = (await prestigePad.getLaunch(2)).roundIds[1];
            const oldRound2 = await prestigePad.getRound(oldRoundId2);

            await callTransaction(
                getPrestigePadTx_CancelCurrentRound(prestigePad, initiator1, {
                    launchId: BigNumber.from(1),
                })
            );
            await callTransaction(
                getPrestigePadTx_CancelCurrentRound(prestigePad, initiator2, {
                    launchId: BigNumber.from(2),
                })
            );

            // Tx1: Depositor1 withdraw deposit from launch 1 (native token)
            const quantity1 = await prestigePad.contributions(oldRoundId1, depositor1.address);
            const value1 = oldRound1.quote.unitPrice.mul(quantity1);

            const initDepositor1NativeBalance = await ethers.provider.getBalance(depositor1.address);
            const initPrestigePadNativeBalance = await ethers.provider.getBalance(prestigePad.address);

            const tx1 = await getPrestigePadTx_WithdrawContribution(prestigePad, depositor1, {
                roundId: BigNumber.from(oldRoundId1),
            });
            const receipt1 = await tx1.wait();
            const gasFee1 = receipt1.gasUsed.mul(receipt1.effectiveGasPrice);

            await expect(tx1)
                .to.emit(prestigePad, 'ContributionWithdrawal')
                .withArgs(oldRoundId1, depositor1.address, quantity1, value1);

            expect(await prestigePad.contributions(oldRoundId1, depositor1.address)).to.equal(0);

            expect(await ethers.provider.getBalance(depositor1.address)).to.equal(
                initDepositor1NativeBalance.sub(gasFee1).add(value1)
            );
            expect(await ethers.provider.getBalance(prestigePad.address)).to.equal(
                initPrestigePadNativeBalance.sub(value1)
            );

            // Tx2: Depositor2 withdraw deposit from launch 2 (erc20 token)
            const currency = currencies[0];

            const initDepositor2ERC20Balance = await currency.balanceOf(depositor2.address);
            const initPrestigePadERC20Balance = await currency.balanceOf(prestigePad.address);

            const quantity2 = await prestigePad.contributions(oldRoundId2, depositor2.address);
            const value2 = oldRound2.quote.unitPrice.mul(quantity2);

            const tx2 = await getPrestigePadTx_WithdrawContribution(prestigePad, depositor2, {
                roundId: BigNumber.from(oldRoundId2),
            });

            await expect(tx2)
                .to.emit(prestigePad, 'ContributionWithdrawal')
                .withArgs(oldRoundId2, depositor2.address, quantity2, value2);

            expect(await prestigePad.contributions(oldRoundId2, depositor2.address)).to.equal(0);

            expect(await currency.balanceOf(depositor2.address)).to.equal(initDepositor2ERC20Balance.add(value2));
            expect(await currency.balanceOf(prestigePad.address)).to.equal(initPrestigePadERC20Balance.sub(value2));
        });

        it('7.1.19.2. Withdraw deposit unsuccessfully when the contract is reentered', async () => {
            const fixture = await beforePrestigePadTest({
                addSampleLaunch: true,
                addSampleRounds: true,
                raiseFirstRound: true,
                depositFirstRound: true,
                useReentrancyERC20: true,
            });

            const { prestigePad, reentrancyERC20, depositor1, initiator2 } = fixture;

            const launchId = 2;
            const oldRoundId2 = (await prestigePad.getLaunch(launchId)).roundIds[1];

            await callTransaction(
                getPrestigePadTx_CancelCurrentRound(prestigePad, initiator2, {
                    launchId: BigNumber.from(launchId),
                })
            );

            await testReentrancy_prestigePad(fixture, reentrancyERC20, async (timestamp: number) => {
                await expect(
                    getPrestigePadTx_WithdrawContribution(prestigePad, depositor1, {
                        roundId: BigNumber.from(oldRoundId2),
                    })
                ).to.be.revertedWith('ReentrancyGuard: reentrant call');
            });
        });

        it('7.1.19.3. Withdraw deposit unsuccessfully with invalid round id', async () => {
            const fixture = await beforePrestigePadTest();

            const { prestigePad, depositor1 } = fixture;

            await expect(
                getPrestigePadTx_WithdrawContribution(prestigePad, depositor1, {
                    roundId: BigNumber.from(0),
                })
            ).to.be.revertedWithCustomError(prestigePad, 'InvalidRoundId');

            await expect(
                getPrestigePadTx_WithdrawContribution(prestigePad, depositor1, {
                    roundId: BigNumber.from(100),
                })
            ).to.be.revertedWithCustomError(prestigePad, 'InvalidRoundId');
        });

        it('7.1.19.4. Withdraw deposit unsuccessfully when paused', async () => {
            const fixture = await beforePrestigePadTest({
                addSampleLaunch: true,
                addSampleRounds: true,
                raiseFirstRound: true,
                depositFirstRound: true,
            });

            const { deployer, prestigePad, depositor1, initiator1, admin, admins } = fixture;

            const oldRoundId = (await prestigePad.getLaunch(1)).roundIds[1];

            await callTransaction(
                getPrestigePadTx_CancelCurrentRound(prestigePad, initiator1, {
                    launchId: BigNumber.from(1),
                })
            );

            await callTransaction(getPausableTxByInput_Pause(prestigePad, deployer, admin, admins));

            await expect(
                getPrestigePadTx_WithdrawContribution(prestigePad, depositor1, {
                    roundId: BigNumber.from(oldRoundId),
                })
            ).to.be.revertedWith('Pausable: paused');
        });

        it('7.1.19.5. Withdraw deposit unsuccessfully with confirmed round', async () => {
            const fixture = await beforePrestigePadTest({
                addSampleLaunch: true,
                addSampleRounds: true,
                raiseFirstRound: true,
                depositFirstRound: true,
                confirmFirstRound: true,
            });

            const { prestigePad, depositor1 } = fixture;

            const roundId = (await prestigePad.getLaunch(1)).roundIds[1];

            await expect(
                getPrestigePadTx_WithdrawContribution(prestigePad, depositor1, {
                    roundId: BigNumber.from(roundId),
                })
            ).to.be.revertedWithCustomError(prestigePad, 'AlreadyConfirmed');
        });

        it('7.1.19.6. Withdraw deposit unsuccessfully when raising is not ended', async () => {
            const fixture = await beforePrestigePadTest({
                addSampleLaunch: true,
                addSampleRounds: true,
                raiseFirstRound: true,
                depositFirstRound: true,
            });

            const { prestigePad, depositor1 } = fixture;

            const roundId = (await prestigePad.getLaunch(1)).roundIds[1];
            const round = await prestigePad.getRound(roundId);
            let timestamp = round.agenda.raiseEndsAt;

            await time.setNextBlockTimestamp(timestamp - 1);
            await expect(
                getPrestigePadTx_WithdrawContribution(prestigePad, depositor1, {
                    roundId: BigNumber.from(roundId),
                })
            ).to.be.revertedWithCustomError(prestigePad, 'StillRaising');
        });

        it('7.1.19.7. Withdraw deposit unsuccessfully when sold quantity is enough and confirm time limit is not overdue', async () => {
            const fixture = await beforePrestigePadTest({
                addSampleLaunch: true,
                addSampleRounds: true,
                raiseFirstRound: true,
                depositFirstRound: true,
            });

            const { prestigePad, depositor1 } = fixture;

            const roundId = (await prestigePad.getLaunch(1)).roundIds[1];
            const round = await prestigePad.getRound(roundId);
            const confirmDue = round.agenda.raiseEndsAt + Constant.PRESTIGE_PAD_RAISE_CONFIRMATION_TIME_LIMIT;

            await time.setNextBlockTimestamp(confirmDue - 5);
            await expect(
                getPrestigePadTx_WithdrawContribution(prestigePad, depositor1, {
                    roundId: BigNumber.from(roundId),
                })
            ).to.be.revertedWithCustomError(prestigePad, 'InvalidWithdrawing');
        });

        it('7.1.19.8. Withdraw deposit successfully when confirm time limit is overdue', async () => {
            const fixture = await beforePrestigePadTest({
                addSampleLaunch: true,
                addSampleRounds: true,
                raiseFirstRound: true,
                depositFirstRound: true,
            });

            const { prestigePad, depositor1 } = fixture;

            const roundId = (await prestigePad.getLaunch(1)).roundIds[1];
            const round = await prestigePad.getRound(roundId);
            const confirmDue = round.agenda.raiseEndsAt + Constant.PRESTIGE_PAD_RAISE_CONFIRMATION_TIME_LIMIT;

            await time.setNextBlockTimestamp(confirmDue);
            await expect(
                getPrestigePadTx_WithdrawContribution(prestigePad, depositor1, {
                    roundId: BigNumber.from(roundId),
                })
            ).to.not.be.reverted;
        });

        it('7.1.19.9. Withdraw deposit successfully when sold quantity is not enough', async () => {
            const fixture = await beforePrestigePadTest({
                addSampleLaunch: true,
                addSampleRounds: true,
                raiseFirstRound: true,
            });

            const { prestigePad, depositor1 } = fixture;

            const launchId = 1;
            const roundId = (await prestigePad.getLaunch(launchId)).roundIds[1];
            const round = await prestigePad.getRound(roundId);
            let timestamp = round.agenda.raiseStartsAt;
            await time.setNextBlockTimestamp(timestamp);

            const quantity = round.quota.minRaisingQuantity.sub(1);

            await callTransaction(
                getPrestigePadTx_ContributeCurrentRound(
                    prestigePad,
                    depositor1,
                    {
                        launchId: BigNumber.from(launchId),
                        quantity: BigNumber.from(quantity),
                    },
                    { value: round.quote.unitPrice.mul(quantity) }
                )
            );

            await time.setNextBlockTimestamp(round.agenda.raiseEndsAt);

            await expect(
                getPrestigePadTx_WithdrawContribution(prestigePad, depositor1, {
                    roundId: BigNumber.from(roundId),
                })
            ).to.not.be.reverted;
        });

        it('7.1.19.10. Withdraw deposit unsuccessfully when not deposited', async () => {
            const fixture = await beforePrestigePadTest({
                addSampleLaunch: true,
                addSampleRounds: true,
                raiseFirstRound: true,
            });

            const { prestigePad, depositor1, initiator1 } = fixture;

            const roundId = (await prestigePad.getLaunch(1)).roundIds[1];

            await callTransaction(
                getPrestigePadTx_CancelCurrentRound(prestigePad, initiator1, {
                    launchId: BigNumber.from(1),
                })
            );

            await expect(
                getPrestigePadTx_WithdrawContribution(prestigePad, depositor1, {
                    roundId: BigNumber.from(roundId),
                })
            ).to.be.revertedWithCustomError(prestigePad, 'NothingToWithdraw');
        });

        it('7.1.19.11. Withdraw deposit unsuccessfully with already withdrawn deposits', async () => {
            const fixture = await beforePrestigePadTest({
                addSampleLaunch: true,
                addSampleRounds: true,
                raiseFirstRound: true,
                depositFirstRound: true,
            });

            const { prestigePad, depositor1, initiator1 } = fixture;

            const roundId = (await prestigePad.getLaunch(1)).roundIds[1];

            await callTransaction(
                getPrestigePadTx_CancelCurrentRound(prestigePad, initiator1, {
                    launchId: BigNumber.from(1),
                })
            );

            await callTransaction(
                getPrestigePadTx_WithdrawContribution(prestigePad, depositor1, {
                    roundId: BigNumber.from(roundId),
                })
            );

            await expect(
                getPrestigePadTx_WithdrawContribution(prestigePad, depositor1, {
                    roundId: BigNumber.from(roundId),
                })
            ).to.be.revertedWithCustomError(prestigePad, 'NothingToWithdraw');
        });

        it('7.1.19.12. Withdraw deposit unsuccessfully when sending native token to user failed', async () => {
            const fixture = await beforePrestigePadTest({
                addSampleLaunch: true,
                addSampleRounds: true,
                raiseFirstRound: true,
            });

            const { prestigePad, initiator1, failReceiver, deployer } = fixture;

            await prepareNativeToken(ethers.provider, deployer, [failReceiver], ethers.utils.parseEther('1000'));

            const launchId = 1;
            const roundId = (await prestigePad.getLaunch(launchId)).roundIds[1];
            const round = await prestigePad.getRound(roundId);
            let timestamp = round.agenda.raiseStartsAt;
            await time.setNextBlockTimestamp(timestamp);

            const quantity = 10;

            await callTransaction(
                failReceiver.call(
                    prestigePad.address,
                    prestigePad.interface.encodeFunctionData('contributeCurrentRound', [launchId, quantity]),
                    { value: round.quote.unitPrice.mul(quantity) }
                )
            );

            await callTransaction(
                getPrestigePadTx_CancelCurrentRound(prestigePad, initiator1, {
                    launchId: BigNumber.from(1),
                })
            );

            await callTransaction(failReceiver.activate(true));

            await expect(
                failReceiver.call(
                    prestigePad.address,
                    prestigePad.interface.encodeFunctionData('withdrawContribution', [roundId])
                )
            ).to.be.revertedWithCustomError(prestigePad, 'FailedTransfer');
        });
    });

    describe('7.1.20. withdrawProjectToken(uint256,uint256)', async () => {
        it('7.1.20.1. Withdraw project token successfully with native token when qualified for cashback', async () => {
            const fixture = await beforePrestigePadTest({
                addSampleLaunch: true,
                addSampleRounds: true,
                doAllFirstFound: true,
                doAllSecondFound: true,
            });

            const { prestigePad, depositor3, projectToken, reserveVault, currencies } = fixture;

            const launchId = 1;
            const index = 1;
            const roundId = (await prestigePad.getLaunch(launchId)).roundIds[index];
            const fundId = (await prestigePad.getRound(roundId)).quote.cashbackFundId;
            const fund = await reserveVault.getFund(fundId);

            let timestamp = (await time.latest()) + 100;
            await time.setNextBlockTimestamp(timestamp);

            const quantity = await prestigePad.contributions(roundId, depositor3.address);
            const unit = BigNumber.from(10).pow(await projectToken.decimals());
            const amount = quantity.mul(unit);

            const mainCashback = fund.mainDenomination.mul(quantity);
            const currency0Cashback = fund.extraDenominations[0].mul(quantity);
            const currency1Cashback = fund.extraDenominations[1].mul(quantity);

            const initDepositor3ProjectBalance = await projectToken.balanceOf(depositor3.address, launchId);
            const initPrestigePadProjectBalance = await projectToken.balanceOf(prestigePad.address, launchId);

            const initDepositor3NativeBalance = await ethers.provider.getBalance(depositor3.address);
            const initPrestigePadNativeBalance = await ethers.provider.getBalance(prestigePad.address);
            const initReserveVaultNativeBalance = await ethers.provider.getBalance(reserveVault.address);

            const initDepositor3Currency0Balance = await currencies[0].balanceOf(depositor3.address);
            const initPrestigePadCurrency0Balance = await currencies[0].balanceOf(prestigePad.address);
            const initReserveVaultCurrency0Balance = await currencies[0].balanceOf(reserveVault.address);

            const initDepositor3Currency1Balance = await currencies[1].balanceOf(depositor3.address);
            const initPrestigePadCurrency1Balance = await currencies[1].balanceOf(prestigePad.address);
            const initReserveVaultCurrency1Balance = await currencies[1].balanceOf(reserveVault.address);

            const tx = await getPrestigePadTx_WithdrawProjectToken(prestigePad, depositor3, {
                launchId: BigNumber.from(launchId),
                index: BigNumber.from(index),
            });
            const receipt = await tx.wait();
            const gasFee = receipt.gasUsed.mul(receipt.effectiveGasPrice);

            await expect(tx)
                .to.emit(prestigePad, 'ProjectTokenWithdrawal')
                .withArgs(launchId, roundId, depositor3.address, amount);
            await expect(tx).to.emit(reserveVault, 'FundWithdrawal').withArgs(fundId, depositor3.address, quantity);

            expect(await prestigePad.contributions(roundId, depositor3.address)).to.equal(quantity);
            expect(await prestigePad.withdrawAt(roundId, depositor3.address)).to.equal(timestamp);

            expect(await projectToken.balanceOf(depositor3.address, launchId)).to.equal(
                initDepositor3ProjectBalance.add(amount)
            );
            expect(await projectToken.balanceOf(prestigePad.address, launchId)).to.equal(
                initPrestigePadProjectBalance.sub(amount)
            );

            expect(await ethers.provider.getBalance(depositor3.address)).to.equal(
                initDepositor3NativeBalance.sub(gasFee).add(mainCashback)
            );
            expect(await ethers.provider.getBalance(prestigePad.address)).to.equal(initPrestigePadNativeBalance);
            expect(await ethers.provider.getBalance(reserveVault.address)).to.equal(
                initReserveVaultNativeBalance.sub(mainCashback)
            );

            expect(await currencies[0].balanceOf(depositor3.address)).to.equal(
                initDepositor3Currency0Balance.add(currency0Cashback)
            );
            expect(await currencies[0].balanceOf(prestigePad.address)).to.equal(initPrestigePadCurrency0Balance);
            expect(await currencies[0].balanceOf(reserveVault.address)).to.equal(
                initReserveVaultCurrency0Balance.sub(currency0Cashback)
            );

            expect(await currencies[1].balanceOf(depositor3.address)).to.equal(
                initDepositor3Currency1Balance.add(currency1Cashback)
            );
            expect(await currencies[1].balanceOf(prestigePad.address)).to.equal(initPrestigePadCurrency1Balance);
            expect(await currencies[1].balanceOf(reserveVault.address)).to.equal(
                initReserveVaultCurrency1Balance.sub(currency1Cashback)
            );
        });

        it('7.1.20.2. Withdraw project token successfully with native token when not qualified for cashback', async () => {
            const fixture = await beforePrestigePadTest({
                addSampleLaunch: true,
                addSampleRounds: true,
                doAllFirstFound: true,
                doAllSecondFound: true,
            });

            const { prestigePad, depositor1, projectToken, reserveVault, currencies } = fixture;

            const launchId = 1;
            const index = 1;
            const roundId = (await prestigePad.getLaunch(launchId)).roundIds[index];

            let timestamp = (await time.latest()) + 100;
            await time.setNextBlockTimestamp(timestamp);

            const quantity = await prestigePad.contributions(roundId, depositor1.address);
            const unit = BigNumber.from(10).pow(await projectToken.decimals());
            const amount = quantity.mul(unit);

            const initDepositor1ProjectBalance = await projectToken.balanceOf(depositor1.address, launchId);
            const initPrestigePadProjectBalance = await projectToken.balanceOf(prestigePad.address, launchId);

            const initDepositor1NativeBalance = await ethers.provider.getBalance(depositor1.address);
            const initPrestigePadNativeBalance = await ethers.provider.getBalance(prestigePad.address);
            const initReserveVaultNativeBalance = await ethers.provider.getBalance(reserveVault.address);

            const initDepositor1Currency0Balance = await currencies[0].balanceOf(depositor1.address);
            const initPrestigePadCurrency0Balance = await currencies[0].balanceOf(prestigePad.address);
            const initReserveVaultCurrency0Balance = await currencies[0].balanceOf(reserveVault.address);

            const initDepositor1Currency1Balance = await currencies[1].balanceOf(depositor1.address);
            const initPrestigePadCurrency1Balance = await currencies[1].balanceOf(prestigePad.address);
            const initReserveVaultCurrency1Balance = await currencies[1].balanceOf(reserveVault.address);

            const tx = await getPrestigePadTx_WithdrawProjectToken(prestigePad, depositor1, {
                launchId: BigNumber.from(launchId),
                index: BigNumber.from(index),
            });
            const receipt = await tx.wait();
            const gasFee = receipt.gasUsed.mul(receipt.effectiveGasPrice);

            await expect(tx)
                .to.emit(prestigePad, 'ProjectTokenWithdrawal')
                .withArgs(launchId, roundId, depositor1.address, amount);
            await expect(tx).to.not.emit(reserveVault, 'FundWithdrawal');

            expect(await prestigePad.contributions(roundId, depositor1.address)).to.equal(quantity);
            expect(await prestigePad.withdrawAt(roundId, depositor1.address)).to.equal(timestamp);

            expect(await projectToken.balanceOf(depositor1.address, launchId)).to.equal(
                initDepositor1ProjectBalance.add(amount)
            );
            expect(await projectToken.balanceOf(prestigePad.address, launchId)).to.equal(
                initPrestigePadProjectBalance.sub(amount)
            );

            expect(await ethers.provider.getBalance(depositor1.address)).to.equal(
                initDepositor1NativeBalance.sub(gasFee)
            );
            expect(await ethers.provider.getBalance(prestigePad.address)).to.equal(initPrestigePadNativeBalance);
            expect(await ethers.provider.getBalance(reserveVault.address)).to.equal(initReserveVaultNativeBalance);

            expect(await currencies[0].balanceOf(depositor1.address)).to.equal(initDepositor1Currency0Balance);
            expect(await currencies[0].balanceOf(prestigePad.address)).to.equal(initPrestigePadCurrency0Balance);
            expect(await currencies[0].balanceOf(reserveVault.address)).to.equal(initReserveVaultCurrency0Balance);

            expect(await currencies[1].balanceOf(depositor1.address)).to.equal(initDepositor1Currency1Balance);
            expect(await currencies[1].balanceOf(prestigePad.address)).to.equal(initPrestigePadCurrency1Balance);
            expect(await currencies[1].balanceOf(reserveVault.address)).to.equal(initReserveVaultCurrency1Balance);
        });

        it('7.1.20.3. Withdraw project token successfully with erc20 without cashback', async () => {
            const fixture = await beforePrestigePadTest({
                addSampleLaunch: true,
                addSampleRounds: true,
                doAllFirstFound: true,
                doAllSecondFound: true,
            });

            const { prestigePad, depositor1, projectToken, reserveVault, currencies } = fixture;

            const launchId = 2;
            const index = 1;
            const roundId = (await prestigePad.getLaunch(launchId)).roundIds[index];

            let timestamp = (await time.latest()) + 100;
            await time.setNextBlockTimestamp(timestamp);

            const quantity = await prestigePad.contributions(roundId, depositor1.address);
            const unit = BigNumber.from(10).pow(await projectToken.decimals());
            const amount = quantity.mul(unit);

            const initDepositor1ProjectBalance = await projectToken.balanceOf(depositor1.address, launchId);
            const initPrestigePadProjectBalance = await projectToken.balanceOf(prestigePad.address, launchId);

            const initDepositor1NativeBalance = await ethers.provider.getBalance(depositor1.address);
            const initPrestigePadNativeBalance = await ethers.provider.getBalance(prestigePad.address);
            const initReserveVaultNativeBalance = await ethers.provider.getBalance(reserveVault.address);

            const initDepositor1Currency0Balance = await currencies[0].balanceOf(depositor1.address);
            const initPrestigePadCurrency0Balance = await currencies[0].balanceOf(prestigePad.address);
            const initReserveVaultCurrency0Balance = await currencies[0].balanceOf(reserveVault.address);

            const tx = await getPrestigePadTx_WithdrawProjectToken(prestigePad, depositor1, {
                launchId: BigNumber.from(launchId),
                index: BigNumber.from(index),
            });
            const receipt = await tx.wait();
            const gasFee = receipt.gasUsed.mul(receipt.effectiveGasPrice);

            await expect(tx)
                .to.emit(prestigePad, 'ProjectTokenWithdrawal')
                .withArgs(launchId, roundId, depositor1.address, amount);
            await expect(tx).to.not.emit(reserveVault, 'FundWithdrawal');

            expect(await prestigePad.contributions(roundId, depositor1.address)).to.equal(quantity);
            expect(await prestigePad.withdrawAt(roundId, depositor1.address)).to.equal(timestamp);

            expect(await projectToken.balanceOf(depositor1.address, launchId)).to.equal(
                initDepositor1ProjectBalance.add(amount)
            );
            expect(await projectToken.balanceOf(prestigePad.address, launchId)).to.equal(
                initPrestigePadProjectBalance.sub(amount)
            );

            expect(await ethers.provider.getBalance(depositor1.address)).to.equal(
                initDepositor1NativeBalance.sub(gasFee)
            );
            expect(await ethers.provider.getBalance(prestigePad.address)).to.equal(initPrestigePadNativeBalance);
            expect(await ethers.provider.getBalance(reserveVault.address)).to.equal(initReserveVaultNativeBalance);

            expect(await currencies[0].balanceOf(depositor1.address)).to.equal(initDepositor1Currency0Balance);
            expect(await currencies[0].balanceOf(prestigePad.address)).to.equal(initPrestigePadCurrency0Balance);
            expect(await currencies[0].balanceOf(reserveVault.address)).to.equal(initReserveVaultCurrency0Balance);
        });

        it('7.1.20.4. Withdraw zero project token when user has not deposited', async () => {
            const fixture = await beforePrestigePadTest({
                addSampleLaunch: true,
                addSampleRounds: true,
                doAllFirstFound: true,
            });

            const { prestigePad, initiator2, projectToken, reserveVault } = fixture;

            const launchId = 1;
            const index = 1;

            let timestamp = (await time.latest()) + 100;
            await time.setNextBlockTimestamp(timestamp);

            const roundId = (await prestigePad.getLaunch(launchId)).roundIds[index];

            const initInitiator2ProjectBalance = await projectToken.balanceOf(initiator2.address, launchId);
            const initPrestigePadProjectBalance = await projectToken.balanceOf(prestigePad.address, launchId);

            const initInitiator2NativeBalance = await ethers.provider.getBalance(initiator2.address);
            const initPrestigePadNativeBalance = await ethers.provider.getBalance(prestigePad.address);
            const initReserveVaultNativeBalance = await ethers.provider.getBalance(reserveVault.address);

            const tx = await getPrestigePadTx_WithdrawProjectToken(prestigePad, initiator2, {
                launchId: BigNumber.from(launchId),
                index: BigNumber.from(index),
            });
            const receipt = await tx.wait();
            const gasFee = receipt.gasUsed.mul(receipt.effectiveGasPrice);

            await expect(tx)
                .to.emit(prestigePad, 'ProjectTokenWithdrawal')
                .withArgs(launchId, roundId, initiator2.address, 0);
            await expect(tx).to.not.emit(reserveVault, 'FundWithdrawal');

            expect(await prestigePad.contributions(roundId, initiator2.address)).to.equal(0);
            expect(await prestigePad.withdrawAt(roundId, initiator2.address)).to.equal(timestamp);

            expect(await projectToken.balanceOf(initiator2.address, launchId)).to.equal(initInitiator2ProjectBalance);
            expect(await projectToken.balanceOf(prestigePad.address, launchId)).to.equal(initPrestigePadProjectBalance);

            expect(await ethers.provider.getBalance(initiator2.address)).to.equal(
                initInitiator2NativeBalance.sub(gasFee)
            );
            expect(await ethers.provider.getBalance(prestigePad.address)).to.equal(initPrestigePadNativeBalance);
            expect(await ethers.provider.getBalance(reserveVault.address)).to.equal(initReserveVaultNativeBalance);
        });

        it('7.1.20.5. Withdraw project token unsuccessfully when the contract is reentered', async () => {
            const fixture = await beforePrestigePadTest({
                addSampleLaunch: true,
                addSampleRounds: true,
                doAllFirstFound: true,
                useReentrancyERC20: true,
            });

            const { prestigePad, depositor3, reentrancyERC20 } = fixture;

            const launchId = 1;
            const index = 1;

            await testReentrancy_prestigePad(fixture, reentrancyERC20, async (timestamp: number) => {
                await expect(
                    getPrestigePadTx_WithdrawProjectToken(prestigePad, depositor3, {
                        launchId: BigNumber.from(launchId),
                        index: BigNumber.from(index),
                    })
                ).to.be.revertedWith('ReentrancyGuard: reentrant call');
            });
        });

        it('7.1.20.6. Withdraw project token unsuccessfully with invalid launch id', async () => {
            const fixture = await beforePrestigePadTest();

            const { prestigePad, depositor1 } = fixture;

            await expect(
                getPrestigePadTx_WithdrawProjectToken(prestigePad, depositor1, {
                    launchId: BigNumber.from(0),
                    index: BigNumber.from(1),
                })
            ).to.be.revertedWithCustomError(prestigePad, 'InvalidLaunchId');

            await expect(
                getPrestigePadTx_WithdrawProjectToken(prestigePad, depositor1, {
                    launchId: BigNumber.from(100),
                    index: BigNumber.from(1),
                })
            ).to.be.revertedWithCustomError(prestigePad, 'InvalidLaunchId');
        });

        it('7.1.20.7. Withdraw project token unsuccessfully when paused', async () => {
            const fixture = await beforePrestigePadTest({
                addSampleLaunch: true,
                addSampleRounds: true,
                doAllFirstFound: true,
                pause: true,
            });

            const { prestigePad, depositor1 } = fixture;

            await expect(
                getPrestigePadTx_WithdrawProjectToken(prestigePad, depositor1, {
                    launchId: BigNumber.from(1),
                    index: BigNumber.from(1),
                })
            ).to.be.revertedWith('Pausable: paused');
        });

        it('7.1.20.8. Withdraw project token unsuccessfully with invalid round index', async () => {
            const fixture = await beforePrestigePadTest({
                addSampleLaunch: true,
                addSampleRounds: true,
                doAllFirstFound: true,
            });

            const { prestigePad, depositor1 } = fixture;

            const currentIndex = (await prestigePad.getLaunch(1)).currentIndex;

            await expect(
                getPrestigePadTx_WithdrawProjectToken(prestigePad, depositor1, {
                    launchId: BigNumber.from(1),
                    index: currentIndex.add(1),
                })
            ).to.be.revertedWithCustomError(prestigePad, 'InvalidInput');
        });

        it('7.1.20.9. Withdraw project token unsuccessfully when round is not confirmed', async () => {
            const fixture = await beforePrestigePadTest({
                addSampleLaunch: true,
                addSampleRounds: true,
                raiseFirstRound: true,
                depositFirstRound: true,
            });

            const { prestigePad, depositor1 } = fixture;

            const launchId = 1;
            const index = 1;

            await expect(
                getPrestigePadTx_WithdrawProjectToken(prestigePad, depositor1, {
                    launchId: BigNumber.from(launchId),
                    index: BigNumber.from(index),
                })
            ).to.be.revertedWithCustomError(prestigePad, 'NotConfirmed');
        });

        it('7.1.20.10. Withdraw project token unsuccessfully when user has already withdrawn project token', async () => {
            const fixture = await beforePrestigePadTest({
                addSampleLaunch: true,
                addSampleRounds: true,
                doAllFirstFound: true,
            });

            const { prestigePad, depositor1 } = fixture;

            const launchId = 1;
            const index = 1;

            const withdrawParams: WithdrawProjectTokenParams = {
                launchId: BigNumber.from(launchId),
                index: BigNumber.from(index),
            };

            await callTransaction(getPrestigePadTx_WithdrawProjectToken(prestigePad, depositor1, withdrawParams));

            await expect(
                getPrestigePadTx_WithdrawProjectToken(prestigePad, depositor1, withdrawParams)
            ).to.be.revertedWithCustomError(prestigePad, 'AlreadyWithdrawn');
        });

        it('7.1.20.11. Withdraw project token unsuccessfully when withdrawing fund failed', async () => {
            const fixture = await beforePrestigePadTest({
                addSampleLaunch: true,
                addSampleRounds: true,
                doAllFirstFound: true,
            });

            const { deployer, prestigePad, depositor3, admins, admin, reserveVault } = fixture;

            await callTransaction(getPausableTxByInput_Pause(reserveVault as any, deployer, admin, admins));

            const launchId = 1;
            const index = 1;

            await expect(
                getPrestigePadTx_WithdrawProjectToken(prestigePad, depositor3, {
                    launchId: BigNumber.from(launchId),
                    index: BigNumber.from(index),
                })
            ).to.be.revertedWith('Pausable: paused');
        });
    });
});
