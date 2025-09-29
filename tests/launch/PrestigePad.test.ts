import chai from 'chai';
import { expect } from 'chai';
import { ethers, upgrades } from 'hardhat';
import {
    Admin,
    CommissionToken,
    Currency,
    EstateToken,
    FeeReceiver,
    EstateForger,
    MockPriceFeed,
    MockEstateForger,
    IEstateTokenizer__factory,
    IEstateTokenReceiver__factory,
    ICommon__factory,
    IERC1155ReceiverUpgradeable__factory,
    ReserveVault,
    PriceWatcher,
    ProjectToken,
    MockPrestigePad,
    ReentrancyERC20,
    ReentrancyExclusiveERC20,
    FailReceiver,
    IProjectTokenReceiver__factory,
    IProjectLaunchpad__factory,
    IERC165Upgradeable__factory,
    IValidatable__factory,
    IPrestigePad__factory,
} from '@typechain-types';
import { callTransaction, callTransactionAtTimestamp, getBalance, getSignatures, prepareERC20, prepareNativeToken, randomWallet, resetERC20, resetNativeToken, testReentrancy } from '@utils/blockchain';
import { Constant, DAY } from '@tests/test.constant';
import { deployAdmin } from '@utils/deployments/common/admin';
import { deployFeeReceiver } from '@utils/deployments/common/feeReceiver';
import { deployCurrency } from '@utils/deployments/common/currency';
import { loadFixture, time } from "@nomicfoundation/hardhat-network-helpers";

import { MockContract, smock } from '@defi-wonderland/smock';

import {
    callAdmin_ActivateIn,
    callAdmin_AuthorizeManagers,
    callAdmin_AuthorizeModerators,
    callAdmin_DeclareZone,
    callAdmin_UpdateCurrencyRegistries,
} from '@utils/call/common/admin';
import { BigNumber, BigNumberish, Contract, Wallet } from 'ethers';
import { randomInt } from 'crypto';
import { getBytes4Hex, getInterfaceID, randomBigNumber, structToObject } from '@utils/utils';
import { OrderedMap } from '@utils/utils';
import { deployEstateForger } from '@utils/deployments/land/estateForger';
import { addCurrencyToAdminAndPriceWatcher } from '@utils/call/Common';
import { deployMockPriceFeed } from '@utils/deployments/mock/mockPriceFeed';
import { deployFailReceiver } from '@utils/deployments/mock/failReceiver';
import { deployReentrancy } from '@utils/deployments/mock/mockReentrancy/reentrancy';
import { deployEstateToken } from '@utils/deployments/land/estateToken';
import { deployMockEstateForger } from '@utils/deployments/mock/mockEstateForger';
import { deployReentrancyERC1155Holder } from '@utils/deployments/mock/mockReentrancy/reentrancyERC1155Holder';
import { request } from 'http';
import { Initialization as LandInitialization } from '@tests/land/test.initialization';
import { Initialization as LaunchInitialization } from '@tests/launch/test.initialization';
import { callReserveVault_AuthorizeProvider } from '@utils/call/ReserveVault';
import { applyDiscount, remain, scaleRate } from '@utils/formula';
import { RequestQuote, RequestAgenda, RequestEstate, RequestQuota } from '@utils/models/land/estateForger';
import { deployPriceWatcher } from '@utils/deployments/common/priceWatcher';
import { Rate } from '@utils/models/common/common';
import { MockValidator } from '@utils/mockValidator';
import { RegisterSellerInParams, RequestTokenizationParams, UpdateRequestEstateURIParams, UpdateRequestAgendaParams } from '@utils/models/land/estateForger';
import { getRegisterSellerInValidation, getRequestTokenizationValidation, getRegisterSellerInInvalidValidation, getRequestTokenizationInvalidValidation, getUpdateRequestEstateURIValidation, getUpdateRequestEstateURIInvalidValidation } from '@utils/validation/EstateForger';
import { deployMockPrestigePad } from '@utils/deployments/mock/mockPrestigePad';
import { getSafeConfirmCurrentRoundParams, getSafeFinalizeLaunchParams, InitiateLaunchParams, SafeConfirmCurrentRoundParams, ScheduleNextRoundParams, UpdateLaunchURIParams, UpdateRoundParams, UpdateRoundsParams } from '@utils/models/launch/prestigePad';
import { getInitiateLaunchInvalidValidation, getInitiateLaunchValidation, getUpdateLaunchURIInvalidValidation, getUpdateRoundInvalidValidation, getUpdateRoundsInvalidValidation, getUpdateRoundsValidation, getUpdateRoundValidation } from '@utils/validation/launch/prestigePad';
import { RegisterInitiatorParams } from '@utils/models/launch/projectToken';
import { getRegisterInitiatorValidation } from '@utils/validation/launch/projectToken';
import { callProjectToken_AuthorizeLaunchpads } from '@utils/call/launch/projectToken';
import { deployReentrancyERC1155Receiver } from '@utils/deployments/mock/mockReentrancy/reentrancyERC1155Receiver';
import { deployReentrancyExclusiveERC20 } from '@utils/deployments/mock/mockReentrancy/reentrancyExclusiveERC20';
import { deployReentrancyERC20 } from '@utils/deployments/mock/mockReentrancy/reentrancyERC20';
import { getCallSafeConfirmCurrentRoundTx, getCallScheduleNextRoundTx, getCallUpdateRoundsTx, getInitiateLaunchTx, getSafeConfirmCurrentRoundTx, getSafeFinalizeLaunchTx, getScheduleNextRoundTx, getUpdateLaunchURITx, getUpdateRoundsTx, getUpdateRoundTx } from '@utils/transaction/launch/prestigePad';
import { callPausable_Pause } from '@utils/call/common/pausable';

chai.use(smock.matchers);

export interface PrestigePadFixture {
    admin: Admin;
    feeReceiver: FeeReceiver;
    currencies: Currency[];
    estateToken: MockContract<EstateToken>;
    projectToken: MockContract<ProjectToken>;
    reserveVault: MockContract<ReserveVault>;
    priceWatcher: PriceWatcher;
    prestigePad: MockPrestigePad;
    nativePriceFeed: MockPriceFeed;
    currencyPriceFeed: MockPriceFeed;
    validator: MockValidator;

    reentrancyExclusiveERC20: ReentrancyExclusiveERC20;
    reentrancyERC20: ReentrancyERC20;
    failReceiver: FailReceiver;
    
    deployer: any;
    admins: any[];

    manager: any;
    moderator: any;
    user: any;
    initiator1: any, initiator2: any, initiator3: any;
    initiators: any[];
    commissionReceiver: any;
    depositor1: any, depositor2: any, depositor3: any;
    depositors: any[];

    zone1: string, zone2: string;
}

async function testReentrancy_prestigePad(
    fixture: PrestigePadFixture,
    reentrancyContract: Contract,
    assertion: any,
) {
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

    const initiateLaunchValidation = await getInitiateLaunchValidation(prestigePad, validator, initiateLaunchParams);

    await callTransaction(reentrancyContract.updateReentrancyPlan(
        prestigePad.address,
        prestigePad.interface.encodeFunctionData("initiateLaunch", [
            initiateLaunchParams.initiator,
            initiateLaunchParams.zone,
            initiateLaunchParams.projectURI,
            initiateLaunchParams.launchURI,
            initiateLaunchParams.initialQuantity,
            initiateLaunchParams.feeRate,
            initiateLaunchValidation,
        ])
    ));

    await assertion(timestamp);

    // scheduleNextRound
    timestamp += 10;

    await callTransaction(reentrancyContract.updateReentrancyPlan(
        prestigePad.address,
        prestigePad.interface.encodeFunctionData("scheduleNextRound", [
            1,
            BigNumber.from(1),
            ethers.utils.parseEther('0.1'),
            [],
            [],
            timestamp + 1000,
            Constant.PRESTIGE_PAD_RAISE_MINIMUM_DURATION,
        ])
    ));

    await assertion(timestamp);

    // scheduleNextRound
    timestamp += 10;

    const safeConfirmCurrentRoundParams: SafeConfirmCurrentRoundParams = { 
        launchId: BigNumber.from(1),
        anchor: ethers.utils.keccak256(ethers.utils.toUtf8Bytes('invalid anchor')),
    };
    await callTransaction(reentrancyContract.updateReentrancyPlan(
        prestigePad.address,
        prestigePad.interface.encodeFunctionData("safeConfirmCurrentRound", [
            safeConfirmCurrentRoundParams.launchId,
            safeConfirmCurrentRoundParams.anchor,
        ])
    ));

    await assertion(timestamp);

    // withdrawContribution
    timestamp += 10;

    await callTransaction(reentrancyContract.updateReentrancyPlan(
        prestigePad.address,
        prestigePad.interface.encodeFunctionData("withdrawContribution", [1])
    ));

    await assertion(timestamp);

    // withdrawProjectToken
    timestamp += 10;

    await callTransaction(reentrancyContract.updateReentrancyPlan(
        prestigePad.address,
        prestigePad.interface.encodeFunctionData("withdrawProjectToken", [1, 1])
    ));

    await assertion(timestamp);

    // contributeCurrentRound
    timestamp += 10;

    await callTransaction(reentrancyContract.updateReentrancyPlan(
        prestigePad.address,
        prestigePad.interface.encodeFunctionData("contributeCurrentRound", [1, BigNumber.from(100)])
    ));

    await assertion(timestamp);

    // safeContributeCurrentRound
    timestamp += 10;

    const anchor = ethers.utils.keccak256(ethers.utils.toUtf8Bytes('launch_uri_1'));
    await callTransaction(reentrancyContract.updateReentrancyPlan(
        prestigePad.address,
        prestigePad.interface.encodeFunctionData("safeContributeCurrentRound", [1, BigNumber.from(100), anchor])
    ));

    await assertion(timestamp);
}

export async function getFeeDenomination(
    prestigePad: MockPrestigePad,
    admin: Admin,
    launchId: BigNumber,
    _unitPrice: BigNumber,
    currency: Contract | null,
) {
    return applyDiscount(
        admin,
        scaleRate(_unitPrice, (await prestigePad.getLaunch(launchId)).feeRate),
        currency,
    )
}

export async function getCashbackBaseDenomination(
    feeDenomination: BigNumber,
    commissionDenomination: BigNumber,
    cashbackBaseRate: Rate,
) {
    return scaleRate(
        feeDenomination.sub(commissionDenomination),
        cashbackBaseRate,
    );
}

describe('7.1. PrestigePad', async () => {
    async function prestigePadFixture(): Promise<PrestigePadFixture> {
        const accounts = await ethers.getSigners();
        const deployer = accounts[0];
        const admins = [];
        for (let i = 1; i <= Constant.ADMIN_NUMBER; ++i) admins.push(accounts[i]);
        const user = accounts[Constant.ADMIN_NUMBER + 1];
        const manager = accounts[Constant.ADMIN_NUMBER + 2];
        const moderator = accounts[Constant.ADMIN_NUMBER + 3];
        const initiator1 = accounts[Constant.ADMIN_NUMBER + 4];
        const initiator2 = accounts[Constant.ADMIN_NUMBER + 5];
        const initiator3 = accounts[Constant.ADMIN_NUMBER + 6];
        const commissionReceiver = accounts[Constant.ADMIN_NUMBER + 7];
        const depositor1 = accounts[Constant.ADMIN_NUMBER + 8];
        const depositor2 = accounts[Constant.ADMIN_NUMBER + 9];
        const depositor3 = accounts[Constant.ADMIN_NUMBER + 10];

        const initiators = [initiator1, initiator2, initiator3];
        const depositors = [depositor1, depositor2, depositor3];

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

        const SmockCurrencyFactory = await smock.mock('Currency') as any;
        const currency1 = await SmockCurrencyFactory.deploy();
        const currency2 = await SmockCurrencyFactory.deploy();
        const currency3 = await SmockCurrencyFactory.deploy();
        await callTransaction(currency1.initialize('MockCurrency1', 'MCK1'));
        await callTransaction(currency2.initialize('MockCurrency2', 'MCK2'));
        await callTransaction(currency3.initialize('MockCurrency3', 'MCK3'));

        await callTransaction(currency1.setExclusiveDiscount(ethers.utils.parseEther('0.3'), Constant.COMMON_RATE_DECIMALS));
        await callTransaction(currency2.setExclusiveDiscount(ethers.utils.parseEther('0.4'), Constant.COMMON_RATE_DECIMALS));
        await callTransaction(currency3.setExclusiveDiscount(ethers.utils.parseEther('0.5'), Constant.COMMON_RATE_DECIMALS));

        const currencies = [currency1, currency2, currency3];

        const validator = new MockValidator(deployer as any);

        const nativePriceFeed = await deployMockPriceFeed(deployer.address, 0, 0) as MockPriceFeed;
        const currencyPriceFeed = await deployMockPriceFeed(deployer.address, 0, 0) as MockPriceFeed;

        const MockEstateTokenFactory = await smock.mock('EstateToken') as any;
        const estateToken = await MockEstateTokenFactory.deploy() as MockContract<EstateToken>;
        await callTransaction(estateToken.initialize(
            admin.address,
            feeReceiver.address,
            validator.getAddress(),
            LandInitialization.ESTATE_TOKEN_BaseURI,
        ));
        
        const MockProjectTokenFactory = await smock.mock('ProjectToken') as any;
        const projectToken = await MockProjectTokenFactory.deploy() as MockContract<ProjectToken>;
        await callTransaction(projectToken.initialize(
            admin.address,
            estateToken.address,
            feeReceiver.address,
            validator.getAddress(),
            LaunchInitialization.PROJECT_TOKEN_BaseURI,
        ));

        const SmockReserveVaultFactory = await smock.mock('ReserveVault') as any;
        const reserveVault = await SmockReserveVaultFactory.deploy() as MockContract<ReserveVault>;
        await callTransaction(reserveVault.initialize(
            admin.address,
        ));

        const priceWatcher = await deployPriceWatcher(
            deployer.address,
            admin.address
        ) as PriceWatcher;

        const prestigePad = await deployMockPrestigePad(
            deployer,
            admin.address,
            projectToken.address,
            priceWatcher.address,
            feeReceiver.address,
            reserveVault.address,
            validator.getAddress(),
            LaunchInitialization.PRESTIGE_PAD_BaseMinUnitPrice,
            LaunchInitialization.PRESTIGE_PAD_BaseMaxUnitPrice,
        ) as MockPrestigePad;

        const zone1 = ethers.utils.formatBytes32String("TestZone1");
        const zone2 = ethers.utils.formatBytes32String("TestZone2");

        const reentrancyExclusiveERC20 = await deployReentrancyExclusiveERC20(deployer) as ReentrancyExclusiveERC20;
        const reentrancyERC20 = await deployReentrancyERC20(deployer) as ReentrancyERC20;

        const failReceiver = await deployFailReceiver(deployer, false, false) as FailReceiver;

        return {
            admin,
            feeReceiver,
            currencies,
            estateToken,
            projectToken,
            reserveVault,
            priceWatcher,
            prestigePad,
            nativePriceFeed,
            currencyPriceFeed,
            validator,
            deployer,
            admins,
            manager,
            moderator,
            user,
            initiator1,
            initiator2,
            initiator3,
            initiators,
            commissionReceiver,
            depositor1,
            depositor2,
            depositor3,
            depositors,
            zone1,
            zone2,
            reentrancyExclusiveERC20,
            reentrancyERC20,
            failReceiver,
        };
    };

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
            commissionReceiver,
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
        let initiator3 = initiators[2];
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

        await callAdmin_AuthorizeManagers(
            admin,
            admins,
            [manager.address],
            true,
            await admin.nonce()
        );

        await callAdmin_AuthorizeModerators(
            admin,
            admins,
            [moderator.address],
            true,
            await admin.nonce()
        );

        if (!skipListSampleCurrencies) {
            await nativePriceFeed.updateData(1000_00000000, 8);
            await currencyPriceFeed.updateData(5_00000000, 8);

            await addCurrencyToAdminAndPriceWatcher(
                admin,
                priceWatcher,
                admins,
                [ethers.constants.AddressZero],
                [true],
                [false],
                [nativePriceFeed.address],
                [3600],
                [{ value: BigNumber.from(10000_000), decimals: 3 }],
            );
            
            await addCurrencyToAdminAndPriceWatcher(
                admin,
                priceWatcher,
                admins,
                [currencies[0].address],
                [true],
                [true],
                [currencyPriceFeed.address],
                [24 * 3600],
                [{ value: BigNumber.from(50_000), decimals: 3 }],
            );

            await callAdmin_UpdateCurrencyRegistries(
                admin,
                admins,
                [currencies[1].address, currencies[2].address],
                [true, true],
                [false, false],
                await admin.nonce(),
            );
        }

        if (!skipFundERC20ForInitiators) {
            await prepareERC20(
                currencies[0],
                initiators,
                [prestigePad],
                ethers.utils.parseEther('1000000000'),
            );
            await prepareERC20(
                currencies[1],
                initiators,
                [prestigePad],
                ethers.utils.parseEther('1000000000'),
            );
        }

        if (!skipFundERC20ForDepositors) {
            await prepareERC20(
                currencies[0],
                [depositor1, depositor2, depositor3],
                [prestigePad],
                ethers.utils.parseEther('1000000000'),
            );
        }

        if (!skipDeclareZone) {
            for (const zone of [zone1, zone2]) {
                await callAdmin_DeclareZone(
                    admin,
                    admins,
                    zone,
                    await admin.nonce()
                );
            }

            if (!skipAddZoneForExecutive) {
                await callAdmin_ActivateIn(
                    admin,
                    admins,
                    zone1,
                    [manager.address, moderator.address],
                    true,
                    await admin.nonce()
                );
                await callAdmin_ActivateIn(
                    admin,
                    admins,
                    zone2,
                    [manager.address, moderator.address],
                    true,
                    await admin.nonce()
                );
            }
        }

        let timestamp = await time.latest() + 1000;

        if (!skipAuthorizeLaunchpad) {
            await callProjectToken_AuthorizeLaunchpads(
                projectToken,
                admins,
                [prestigePad.address],
                true,
                await admin.nonce()
            );
        }

        if (!skipAuthorizeProviders) {
            await callReserveVault_AuthorizeProvider(
                reserveVault,
                admins,
                [prestigePad.address],
                true,
                await admin.nonce()
            );
        }

        if (!skipAuthorizeInitiators) {
            for (const zone of [zone1, zone2]) {
                for (const [index, initiator] of initiators.entries()) {
                    const params: RegisterInitiatorParams = {
                        zone: zone,
                        initiator: initiator.address,
                        uri: `initiator_uri_${index + 1}`,
                    };

                    const validation = await getRegisterInitiatorValidation(projectToken as any, validator, params);

                    await callTransaction(projectToken.connect(manager).registerInitiator(
                        params.zone,
                        params.initiator,
                        params.uri,
                        validation
                    ));
                }
            }
        }

        if (addSampleLaunch) {
            const params1: InitiateLaunchParams = {
                initiator: initiator1.address,
                zone: zone1,
                projectURI: 'project_uri_1',
                launchURI: 'launch_uri_1',
                initialQuantity: BigNumber.from(1000),
                feeRate: ethers.utils.parseEther('0.1'),
            }
            await callTransaction(getInitiateLaunchTx(prestigePad, validator, manager, params1));

            const params2: InitiateLaunchParams = {
                initiator: initiator2.address,
                zone: zone2,
                projectURI: 'project_uri_2',
                launchURI: 'launch_uri_2',
                initialQuantity: BigNumber.from(100),
                feeRate: ethers.utils.parseEther('0.2'),
            }
            await callTransaction(getInitiateLaunchTx(prestigePad, validator, manager, params2));
        }

        if (addSampleRounds) {
            const params1: UpdateRoundsParams = {
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
                    }
                ]
            }

            if (useFailReceiverAsInitiator) {
                await callTransaction(getCallUpdateRoundsTx(prestigePad, validator, failReceiver, params1));
            } else {
                await callTransaction(getUpdateRoundsTx(prestigePad, validator, initiator1, params1));
            }

            const params2: UpdateRoundsParams = {
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
                ]
            }
            await callTransaction(getUpdateRoundsTx(prestigePad, validator, initiator2, params2));
        }

        if (raiseFirstRound || doAllFirstFound) {
            const params1 = {
                launchId: BigNumber.from(1),
                cashbackThreshold: BigNumber.from('5'),
                cashbackBaseRate: ethers.utils.parseEther("0.1"),
                cashbackCurrencies: [currencies[0].address, currencies[1].address],
                cashbackDenominations: [ethers.utils.parseEther('0.01'), ethers.utils.parseEther('0.02')],
                raiseStartsAt: timestamp + 10,
                raiseDuration: Constant.PRESTIGE_PAD_RAISE_MINIMUM_DURATION + 10,
            };

            if (useFailReceiverAsInitiator) {
                await callTransaction(getCallScheduleNextRoundTx(prestigePad, failReceiver, params1));
            } else {
                await callTransaction(getScheduleNextRoundTx(prestigePad, initiator1, params1));
            }

            const params2 = {
                launchId: BigNumber.from(2),
                cashbackThreshold: BigNumber.from('0'),
                cashbackBaseRate: ethers.utils.parseEther("0"),
                cashbackCurrencies: [],
                cashbackDenominations: [],
                raiseStartsAt: timestamp + 20,
                raiseDuration: Constant.PRESTIGE_PAD_RAISE_MINIMUM_DURATION + 20,
            }
            await callTransaction(getScheduleNextRoundTx(prestigePad, initiator2, params2));
        }

        if (depositFirstRound || doAllFirstFound) {
            const roundId1 = (await prestigePad.getLaunch(1)).roundIds[1];
            timestamp = (await prestigePad.getRound(roundId1)).agenda.raiseStartsAt;
            await time.setNextBlockTimestamp(timestamp);

            await callTransaction(prestigePad.connect(depositor1).contributeCurrentRound(1, 2, { value: ethers.utils.parseEther('10') }));
            await callTransaction(prestigePad.connect(depositor2).contributeCurrentRound(1, 3, { value: ethers.utils.parseEther('10') }));
            await callTransaction(prestigePad.connect(depositor3).contributeCurrentRound(1, 5, { value: ethers.utils.parseEther('10') }));
            
            const roundId2 = (await prestigePad.getLaunch(2)).roundIds[1];
            timestamp = (await prestigePad.getRound(roundId2)).agenda.raiseStartsAt;
            await time.setNextBlockTimestamp(timestamp);

            await callTransaction(prestigePad.connect(depositor1).contributeCurrentRound(2, 400));
            await callTransaction(prestigePad.connect(depositor2).contributeCurrentRound(2, 600));
            await callTransaction(prestigePad.connect(depositor3).contributeCurrentRound(2, 1000));
        }

        if (confirmFirstRound || doAllFirstFound) {
            const confirmParams1 = await getSafeConfirmCurrentRoundParams(prestigePad, { launchId: BigNumber.from(1) });
            await callTransaction(getSafeConfirmCurrentRoundTx(
                prestigePad,
                initiator1,
                confirmParams1,
                { value: ethers.utils.parseEther('10') }
            ));

            const confirmParams2 = await getSafeConfirmCurrentRoundParams(prestigePad, { launchId: BigNumber.from(2) });
            await callTransaction(getSafeConfirmCurrentRoundTx(
                prestigePad,
                initiator2,
                confirmParams2,
            ));
        }

        if (cancelFirstRound) {
            await callTransaction(prestigePad.connect(initiator1).cancelCurrentRound(1));
            await callTransaction(prestigePad.connect(initiator2).cancelCurrentRound(2));
        }

        if (raiseSecondRound || doAllSecondFound) {
            const params1 = {
                launchId: BigNumber.from(1),
                cashbackThreshold: BigNumber.from('50'),
                cashbackBaseRate: ethers.utils.parseEther("0.2"),
                cashbackCurrencies: [currencies[1].address, ethers.constants.AddressZero],
                cashbackDenominations: [ethers.utils.parseEther('0.01'), ethers.utils.parseEther('0.02')],
                raiseStartsAt: timestamp + 30,
                raiseDuration: Constant.PRESTIGE_PAD_RAISE_MINIMUM_DURATION + 30,
            }
            await callTransaction(getScheduleNextRoundTx(prestigePad, initiator1, params1));

            const params2 = {
                launchId: BigNumber.from(2),
                cashbackThreshold: BigNumber.from('0'),
                cashbackBaseRate: ethers.utils.parseEther("0"),
                cashbackCurrencies: [],
                cashbackDenominations: [],
                raiseStartsAt: timestamp + 40,
                raiseDuration: Constant.PRESTIGE_PAD_RAISE_MINIMUM_DURATION + 40,
            };
            await callTransaction(getScheduleNextRoundTx(prestigePad, initiator2, params2));
        };

        if (depositSecondRound || doAllSecondFound) {
            const roundId1 = (await prestigePad.getLaunch(1)).roundIds[2];
            timestamp = (await prestigePad.getRound(roundId1)).agenda.raiseStartsAt;
            await time.setNextBlockTimestamp(timestamp);

            await callTransaction(prestigePad.connect(depositor1).contributeCurrentRound(1, 200));
            await callTransaction(prestigePad.connect(depositor2).contributeCurrentRound(1, 300));
            await callTransaction(prestigePad.connect(depositor3).contributeCurrentRound(1, 500));
            
            const roundId2 = (await prestigePad.getLaunch(2)).roundIds[2];
            timestamp = (await prestigePad.getRound(roundId2)).agenda.raiseStartsAt;
            await time.setNextBlockTimestamp(timestamp);

            await callTransaction(prestigePad.connect(depositor1).contributeCurrentRound(2, 40, { value: ethers.utils.parseEther('100') }));
            await callTransaction(prestigePad.connect(depositor2).contributeCurrentRound(2, 60, { value: ethers.utils.parseEther('100') }));
            await callTransaction(prestigePad.connect(depositor3).contributeCurrentRound(2, 100, { value: ethers.utils.parseEther('100') }));
        }

        if (confirmSecondRound || doAllSecondFound) {
            const confirmParams1 = await getSafeConfirmCurrentRoundParams(prestigePad, { launchId: BigNumber.from(1) });
            await callTransaction(getSafeConfirmCurrentRoundTx(
                prestigePad,
                initiator1,
                confirmParams1,
                { value: ethers.utils.parseEther('100') }
            ));
            
            const confirmParams2 = await getSafeConfirmCurrentRoundParams(prestigePad, { launchId: BigNumber.from(2) });
            await callTransaction(getSafeConfirmCurrentRoundTx(
                prestigePad,
                initiator2,
                confirmParams2,
            ));
        }

        if (finalizeLaunch) {
            const finalizeParams1 = await getSafeFinalizeLaunchParams(prestigePad, { launchId: BigNumber.from(1) });
            await callTransaction(getSafeFinalizeLaunchTx(
                prestigePad,
                initiator1,
                finalizeParams1,
            ));
            
            const finalizeParams2 = await getSafeFinalizeLaunchParams(prestigePad, { launchId: BigNumber.from(2) });
            await callTransaction(getSafeFinalizeLaunchTx(
                prestigePad,
                initiator2,
                finalizeParams2,
            ));
        }

        if (pause) {
            await callPausable_Pause(prestigePad, deployer, admins, admin);
        }

        return {
            ...fixture,
            currencies,
        };
    }

    describe('7.1.1. initialize(address, address, address, address, address, address, uint256, uint256, uint256)', async () => {
        it('7.1.1.1. Deploy successfully', async () => {
            const { admin, prestigePad, projectToken, feeReceiver, priceWatcher, reserveVault, validator } = await beforePrestigePadTest({});

            const tx = prestigePad.deployTransaction;
            await expect(tx).to.emit(prestigePad, 'BaseUnitPriceRangeUpdate').withArgs(
                LaunchInitialization.PRESTIGE_PAD_BaseMinUnitPrice,
                LaunchInitialization.PRESTIGE_PAD_BaseMaxUnitPrice,
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

    describe('7.1.2. updateBaseUnitPriceRange(uint256, uint256, bytes[])', async () => {
        it('7.1.2.1. updateBaseUnitPriceRange successfully with valid signatures', async () => {
            const { admin, admins, prestigePad } = await beforePrestigePadTest({});
            
            const baseMinUnitPrice = 20;
            const baseMaxUnitPrice = 100;

            const message = ethers.utils.defaultAbiCoder.encode(
                ['address', 'string', 'uint256', 'uint256'],
                [prestigePad.address, 'updateBaseUnitPriceRange', baseMinUnitPrice, baseMaxUnitPrice]
            );
            const signatures = await getSignatures(message, admins, await admin.nonce());

            const tx = await prestigePad.updateBaseUnitPriceRange(
                baseMinUnitPrice,
                baseMaxUnitPrice,
                signatures
            );
            await tx.wait();

            await expect(tx).to
                .emit(prestigePad, 'BaseUnitPriceRangeUpdate')
                .withArgs(baseMinUnitPrice, baseMaxUnitPrice);

            expect(await prestigePad.baseMinUnitPrice()).to.equal(baseMinUnitPrice);
            expect(await prestigePad.baseMaxUnitPrice()).to.equal(baseMaxUnitPrice);
        });

        it('7.1.2.2. updateBaseUnitPriceRange unsuccessfully with invalid signatures', async () => {
            const { admin, admins, prestigePad } = await beforePrestigePadTest({});
            const baseMinUnitPrice = 20;
            const baseMaxUnitPrice = 100;

            const message = ethers.utils.defaultAbiCoder.encode(
                ['address', 'string', 'uint256', 'uint256'],
                [prestigePad.address, 'updateBaseUnitPriceRange', baseMinUnitPrice, baseMaxUnitPrice]
            );
            const invalidSignatures = await getSignatures(message, admins, (await admin.nonce()).add(1));

            await expect(prestigePad.updateBaseUnitPriceRange(
                baseMinUnitPrice,
                baseMaxUnitPrice,
                invalidSignatures
            )).to.be.revertedWithCustomError(admin, 'FailedVerification');
        });

        it('7.1.2.3. updateBaseUnitPriceRange unsuccessfully with invalid price range', async () => {
            const { admin, admins, prestigePad } = await beforePrestigePadTest({});
            const baseMinUnitPrice = 101;
            const baseMaxUnitPrice = 100;

            const message = ethers.utils.defaultAbiCoder.encode(
                ['address', 'string', 'uint256', 'uint256'],
                [prestigePad.address, 'updateBaseUnitPriceRange', baseMinUnitPrice, baseMaxUnitPrice]
            );
            const signatures = await getSignatures(message, admins, await admin.nonce());

            await expect(prestigePad.updateBaseUnitPriceRange(
                baseMinUnitPrice,
                baseMaxUnitPrice,
                signatures
            )).to.be.revertedWithCustomError(prestigePad, 'InvalidInput');
        });
    });

    describe('7.1.3. getLaunch(uint256)', async () => {
        it('7.1.3.1. return correct launch with valid launch id', async () => {
            const fixture = await beforePrestigePadTest({
                addSampleLaunch: true,                
            });

            const { prestigePad } = fixture;

            await expect(prestigePad.getLaunch(1)).to.not.be.reverted;
            await expect(prestigePad.getLaunch(2)).to.not.be.reverted;
        });

        it('7.1.3.2. revert with invalid launch id', async () => {
            const fixture = await beforePrestigePadTest();

            const { prestigePad } = fixture;

            await expect(prestigePad.getLaunch(0))
                .to.be.revertedWithCustomError(prestigePad, 'InvalidLaunchId');
            await expect(prestigePad.getLaunch(100))
                .to.be.revertedWithCustomError(prestigePad, 'InvalidLaunchId');
        });
    });

    describe('7.1.4. getRound(uint256)', async () => {
        it('7.1.4.1. return correct round with valid round id', async () => {
            const fixture = await beforePrestigePadTest({
                addSampleLaunch: true,
                addSampleRounds: true,
            });

            const { prestigePad, currencies } = fixture;

            const roundId1 = (await prestigePad.getLaunch(1)).roundIds[1];
            await expect(prestigePad.getRound(roundId1)).to.not.be.reverted;

            const roundId2 = (await prestigePad.getLaunch(2)).roundIds[1];
            await expect(prestigePad.getRound(roundId2)).to.not.be.reverted;
        });

        it('7.1.4.2. revert with invalid round id', async () => {
            const fixture = await beforePrestigePadTest();

            const { prestigePad } = fixture;

            await expect(prestigePad.getRound(0))
                .to.be.revertedWithCustomError(prestigePad, 'InvalidRoundId');
            await expect(prestigePad.getRound(100))
                .to.be.revertedWithCustomError(prestigePad, 'InvalidRoundId');
        });
    });

    describe('7.1.5. initiateLaunch(address, bytes32, string, string, uint256, (uint256, uint256, bytes))', async () => {
        async function beforeInitiateLaunchTest(fixture: PrestigePadFixture): Promise<{
            defaultParams: InitiateLaunchParams,
        }> {
            const { initiator1, zone1 } = fixture;

            const defaultParams: InitiateLaunchParams = {
                initiator: initiator1.address,
                zone: zone1,
                projectURI: 'project_uri_1',
                launchURI: 'launch_uri_1',
                initialQuantity: BigNumber.from(1000),
                feeRate: BigNumber.from(1000),
            };

            return { defaultParams };
        }

        it('7.1.5.1. initiate launch successfully', async () => {
            const fixture = await beforePrestigePadTest({});

            const { prestigePad, validator, projectToken, manager, moderator, initiator1, zone1, initiator2, zone2 } = fixture;

            // Tx1: By manager, with initial quantity
            const params1 = {
                initiator: initiator1.address,
                zone: zone1,
                projectURI: 'project_uri_1',
                launchURI: 'launch_uri_1',
                initialQuantity: BigNumber.from(1000),
                feeRate: ethers.utils.parseEther('0.1'),
            }

            let timestamp = await time.latest() + 1000;

            await time.setNextBlockTimestamp(timestamp);

            const launchId1 = 1;
            const projectId1 = 1;
            const roundId1 = 1;

            let prestigePadInitBalance1 = await projectToken.balanceOf(prestigePad.address, projectId1);
            let initiatorInitBalance1 = await projectToken.balanceOf(params1.initiator, projectId1);

            const tx1 = await getInitiateLaunchTx(
                prestigePad,
                validator,
                manager,
                params1
            );
            await tx1.wait();

            await expect(tx1).to.emit(prestigePad, 'NewLaunch').withArgs(
                projectId1,
                launchId1,
                params1.initiator,
                params1.launchURI,
                params1.initialQuantity,
                (rate: Rate) => {
                    expect(structToObject(rate)).to.deep.equal({
                        value: params1.feeRate,
                        decimals: Constant.COMMON_RATE_DECIMALS,
                    });
                    return true;
                }
            );

            expect(await projectToken.projectNumber()).to.equal(1);
            const project1 = await projectToken.getProject(projectId1);
            expect(project1.zone).to.equal(params1.zone);
            expect(project1.estateId).to.equal(0);
            expect(project1.launchId).to.equal(launchId1);
            expect(project1.launchpad).to.equal(prestigePad.address);
            expect(project1.tokenizeAt).to.equal(timestamp);
            expect(project1.deprecateAt).to.equal(Constant.COMMON_INFINITE_TIMESTAMP);
            expect(project1.initiator).to.equal(params1.initiator);

            expect(await prestigePad.launchNumber()).to.equal(1);

            const launch1 = await prestigePad.getLaunch(launchId1);
            expect(launch1.projectId).to.equal(projectId1);
            expect(launch1.roundIds.length).to.equal(1);
            expect(launch1.roundIds[0]).to.equal(roundId1);
            expect(launch1.uri).to.equal(params1.launchURI);
            expect(launch1.initiator).to.equal(params1.initiator);
            expect(launch1.isFinalized).to.equal(false);
            expect(launch1.currentIndex).to.equal(0);
            expect(structToObject(launch1.feeRate)).to.deep.equal({
                value: params1.feeRate,
                decimals: Constant.COMMON_RATE_DECIMALS,
            });

            expect(await prestigePad.roundNumber()).to.equal(1);

            const round1 = await prestigePad.getRound(roundId1);
            expect(round1.quota.totalQuantity).to.equal(params1.initialQuantity);
            expect(round1.agenda.raiseStartsAt).to.equal(timestamp);
            expect(round1.agenda.confirmAt).to.equal(timestamp);

            const initialAmount1 = params1.initialQuantity.mul(BigNumber.from(10).pow(Constant.PROJECT_TOKEN_MAX_DECIMALS));
            expect(await projectToken.balanceOf(prestigePad.address, projectId1)).to.equal(prestigePadInitBalance1);
            expect(await projectToken.balanceOf(params1.initiator, projectId1)).to.equal(initiatorInitBalance1.add(initialAmount1));

            // Tx2: By moderator
            const params2 = {
                initiator: initiator2.address,
                zone: zone2,
                projectURI: 'project_uri_2',
                launchURI: 'launch_uri_2',
                initialQuantity: BigNumber.from(0),
                feeRate: ethers.utils.parseEther('0.2'),
            }

            timestamp += 10;

            await time.setNextBlockTimestamp(timestamp);

            const launchId2 = 2;
            const projectId2 = 2;
            const roundId2 = 2;

            const initialAmount2 = params2.initialQuantity.mul(BigNumber.from(10).pow(Constant.PROJECT_TOKEN_MAX_DECIMALS));
            let prestigePadInitBalance2 = await projectToken.balanceOf(prestigePad.address, projectId2);
            let initiatorInitBalance2 = await projectToken.balanceOf(params2.initiator, projectId2);

            const tx2 = await getInitiateLaunchTx(
                prestigePad,
                validator,
                moderator,
                params2
            );
            await tx2.wait();

            await expect(tx2).to.emit(prestigePad, 'NewLaunch').withArgs(
                projectId2,
                launchId2,
                params2.initiator,
                params2.launchURI,
                params2.initialQuantity,
                (rate: Rate) => {
                    expect(structToObject(rate)).to.deep.equal({
                        value: params2.feeRate,
                        decimals: Constant.COMMON_RATE_DECIMALS,
                    });
                    return true;
                }
            );

            expect(await projectToken.projectNumber()).to.equal(2);
            const project2 = await projectToken.getProject(projectId2);
            expect(project2.zone).to.equal(params2.zone);
            expect(project2.estateId).to.equal(0);
            expect(project2.launchId).to.equal(launchId2);
            expect(project2.launchpad).to.equal(prestigePad.address);
            expect(project2.tokenizeAt).to.equal(timestamp);
            expect(project2.deprecateAt).to.equal(Constant.COMMON_INFINITE_TIMESTAMP);
            expect(project2.initiator).to.equal(params2.initiator);

            expect(await prestigePad.launchNumber()).to.equal(2);

            const launch2 = await prestigePad.getLaunch(launchId2);
            expect(launch2.projectId).to.equal(projectId2);
            expect(launch2.roundIds.length).to.equal(1);
            expect(launch2.roundIds[0]).to.equal(roundId2);
            expect(launch2.uri).to.equal(params2.launchURI);
            expect(launch2.initiator).to.equal(params2.initiator);
            expect(launch2.isFinalized).to.equal(false);
            expect(launch2.currentIndex).to.equal(0);
            expect(structToObject(launch2.feeRate)).to.deep.equal({
                value: params2.feeRate,
                decimals: Constant.COMMON_RATE_DECIMALS,
            });

            expect(await prestigePad.roundNumber()).to.equal(2);

            const round2 = await prestigePad.getRound(roundId2);
            expect(round2.quota.totalQuantity).to.equal(params2.initialQuantity);
            expect(round2.agenda.raiseStartsAt).to.equal(timestamp);
            expect(round2.agenda.confirmAt).to.equal(timestamp);

            expect(await projectToken.balanceOf(prestigePad.address, projectId2)).to.equal(prestigePadInitBalance2);
            expect(await projectToken.balanceOf(params2.initiator, projectId2)).to.equal(initiatorInitBalance2.add(initialAmount2));            
        });

        it('7.1.5.2. initiate launch unsuccessfully when contract is reentered', async () => {
            const fixture = await beforePrestigePadTest();

            const { prestigePad, validator, manager, zone1, deployer, projectToken } = fixture;

            const reentrancy = await deployReentrancyERC1155Receiver(deployer);

            const registerInitiatorParams: RegisterInitiatorParams = {
                zone: zone1,
                initiator: reentrancy.address,
                uri: 'initiator_uri_1',
            }
            const validation = await getRegisterInitiatorValidation(projectToken as any, validator, registerInitiatorParams);
            
            await callTransaction(projectToken.connect(manager).registerInitiator(
                registerInitiatorParams.zone,
                registerInitiatorParams.initiator,
                registerInitiatorParams.uri,
                validation
            ));
            
            const params1 = {
                initiator: reentrancy.address,
                zone: zone1,
                projectURI: 'project_uri_1',
                launchURI: 'launch_uri_1',
                initialQuantity: BigNumber.from(1000),
                feeRate: ethers.utils.parseEther('0.1'),
            }

            await testReentrancy_prestigePad(
                fixture,
                reentrancy,
                async (timestamp: number) => {
                    await expect(getInitiateLaunchTx(
                        prestigePad,
                        validator,
                        manager,
                        params1
                    )).to.be.revertedWith('ReentrancyGuard: reentrant call');
                }
            );
        });

        it('7.1.5.3. initiate launch unsuccessfully by non-executive account', async () => {
            const fixture = await beforePrestigePadTest();

            const { prestigePad, user, validator } = fixture;

            const { defaultParams } = await beforeInitiateLaunchTest(fixture);

            await expect(getInitiateLaunchTx(prestigePad, validator, user, defaultParams))
                .to.be.revertedWithCustomError(prestigePad, 'Unauthorized');
        });

        it('7.1.5.4. initiate launch unsuccessfully when paused', async () => {
            const fixture = await beforePrestigePadTest({
                pause: true,
            });
            const { prestigePad, manager, validator } = fixture;

            const { defaultParams } = await beforeInitiateLaunchTest(fixture);

            await expect(getInitiateLaunchTx(prestigePad, validator, manager, defaultParams))
                .to.be.revertedWith('Pausable: paused');
        });

        it('7.1.5.5. initiate launch unsuccessfully with invalid validation', async () => {
            const fixture = await beforePrestigePadTest();

            const { prestigePad, manager, validator } = fixture;

            const { defaultParams } = await beforeInitiateLaunchTest(fixture);

            const invalidValidation = await getInitiateLaunchInvalidValidation(prestigePad, validator, defaultParams);

            await expect(prestigePad.connect(manager).initiateLaunch(
                defaultParams.initiator,
                defaultParams.zone,
                defaultParams.projectURI,
                defaultParams.launchURI,
                defaultParams.initialQuantity,
                defaultParams.feeRate,
                invalidValidation
            )).to.be.revertedWithCustomError(prestigePad, 'InvalidSignature');
        });

        it('7.1.5.6. initiate launch unsuccessfully with inactive zone', async () => {
            const fixture = await beforePrestigePadTest();

            const { prestigePad, manager, validator } = fixture;

            const { defaultParams } = await beforeInitiateLaunchTest(fixture);
            
            const zone = ethers.utils.formatBytes32String('invalid zone');
            const params = { ...defaultParams, zone: zone };

            await expect(getInitiateLaunchTx(prestigePad, validator, manager, params))
                .to.be.revertedWithCustomError(prestigePad, 'Unauthorized');
        });

        it('7.1.5.7. initiate launch unsuccessfully when sender is not authorized in zone', async () => {
            const fixture = await beforePrestigePadTest();

            const { admin, admins, prestigePad, manager, validator } = fixture;

            const { defaultParams } = await beforeInitiateLaunchTest(fixture);

            await callAdmin_ActivateIn(
                admin,
                admins,
                defaultParams.zone,
                [manager.address],
                false,
                await admin.nonce()
            );

            await expect(getInitiateLaunchTx(prestigePad, validator, manager, defaultParams))
                .to.be.revertedWithCustomError(prestigePad, 'Unauthorized');
        });

        it('7.1.5.8. initiate launch unsuccessfully when initiator is not registered in zone', async () => {
            const fixture = await beforePrestigePadTest({
                skipAuthorizeInitiators: true,
            });

            const { prestigePad, manager, validator } = fixture;

            const { defaultParams } = await beforeInitiateLaunchTest(fixture);

            await expect(getInitiateLaunchTx(prestigePad, validator, manager, defaultParams))
                .to.be.revertedWithCustomError(prestigePad, 'NotRegisteredInitiator');
        });

        it('7.1.5.9. initiate launch unsuccessfully when launching project failed', async () => {
            const fixture = await beforePrestigePadTest();

            const { deployer, admin, manager, projectToken, admins, validator, prestigePad } = fixture;

            const { defaultParams } = await beforeInitiateLaunchTest(fixture);

            await callPausable_Pause(projectToken as any, deployer, admins, admin);

            await expect(getInitiateLaunchTx(prestigePad, validator, manager, defaultParams))
                .to.be.revertedWith('Pausable: paused');
        });

        it('7.1.5.10. initiate launch unsuccessfully when initiator cannot receive erc1155', async () => {
            const fixture = await beforePrestigePadTest();

            const { prestigePad, manager, deployer, projectToken, validator, zone1 } = fixture;

            const { defaultParams } = await beforeInitiateLaunchTest(fixture);

            const failReceiver = await deployFailReceiver(deployer, false, true);

            const registerInitiatorParams: RegisterInitiatorParams = {
                zone: zone1,
                initiator: failReceiver.address,
                uri: 'initiator_uri_1',
            }
            const validation = await getRegisterInitiatorValidation(projectToken as any, validator, registerInitiatorParams);
            await callTransaction(projectToken.connect(manager).registerInitiator(
                registerInitiatorParams.zone,
                registerInitiatorParams.initiator,
                registerInitiatorParams.uri,
                validation
            ));

            const params = { ...defaultParams, initiator: failReceiver.address };
            await expect(getInitiateLaunchTx(prestigePad, validator, manager, params))
                .to.be.revertedWith('Fail');
        });
    });

    describe('7.1.6. updateLaunchURI(uint256, string, (uint256, uint256, bytes))', async () => {
        async function beforeUpdateLaunchURITest(fixture: PrestigePadFixture): Promise<{
            defaultParams: UpdateLaunchURIParams,
        }> {
            const defaultParams: UpdateLaunchURIParams = {
                launchId: BigNumber.from(1),
                uri: 'new_launch_uri_1',
            }

            return { defaultParams }
        }

        it('7.1.6.1. update launch uri successfully', async () => {
            const fixture = await beforePrestigePadTest({
                addSampleLaunch: true,
            });

            const { prestigePad, initiator1, initiator2, validator } = fixture;

            const params1: UpdateLaunchURIParams = {
                launchId: BigNumber.from(1),
                uri: 'new_launch_uri_1',
            }

            const tx1 = await getUpdateLaunchURITx(prestigePad, validator, initiator1, params1);
            await tx1.wait();

            const launch1 = await prestigePad.getLaunch(params1.launchId);
            expect(launch1.uri).to.equal(params1.uri);

            const params2: UpdateLaunchURIParams = {
                launchId: BigNumber.from(2),
                uri: 'new_launch_uri_2',
            }

            const tx2 = await getUpdateLaunchURITx(prestigePad, validator, initiator2, params2);
            await tx2.wait();

            const launch2 = await prestigePad.getLaunch(params2.launchId);
            expect(launch2.uri).to.equal(params2.uri);
        });

        it('7.1.6.2. update launch uri unsuccessfully with invalid launch id', async () => {
            const fixture = await beforePrestigePadTest();

            const { prestigePad, manager, validator } = fixture;

            const { defaultParams } = await beforeUpdateLaunchURITest(fixture);
            const params1 = {
                ...defaultParams,
                launchId: BigNumber.from(0),
            };
            await expect(getUpdateLaunchURITx(prestigePad, validator, manager, params1))
                .to.be.revertedWithCustomError(prestigePad, 'InvalidLaunchId');

            const params2 = {
                ...defaultParams,
                launchId: BigNumber.from(100),
            };
            await expect(getUpdateLaunchURITx(prestigePad, validator, manager, params2))
                .to.be.revertedWithCustomError(prestigePad, 'InvalidLaunchId');
        });

        it('7.1.6.3. update launch uri unsuccessfully when sender is not launch initiator', async () => {
            const fixture = await beforePrestigePadTest({
                addSampleLaunch: true,
            });

            const { prestigePad, manager, validator, initiator2 } = fixture;

            const { defaultParams } = await beforeUpdateLaunchURITest(fixture);

            // By manager
            await expect(getUpdateLaunchURITx(prestigePad, validator, manager, defaultParams))
                .to.be.revertedWithCustomError(prestigePad, 'Unauthorized');

            // By wrong initiator
            await expect(getUpdateLaunchURITx(prestigePad, validator, initiator2, defaultParams))
                .to.be.revertedWithCustomError(prestigePad, 'Unauthorized');
        });

        it('7.1.6.4. update launch uri unsuccessfully when paused', async () => {
            const fixture = await beforePrestigePadTest({
                addSampleLaunch: true,
                pause: true,
            });

            const { prestigePad, initiator1, validator } = fixture;

            const { defaultParams } = await beforeUpdateLaunchURITest(fixture);

            await expect(getUpdateLaunchURITx(prestigePad, validator, initiator1, defaultParams))
                .to.be.revertedWith('Pausable: paused');
        });

        it('7.1.6.5. update launch uri unsuccessfully with invalid validation', async () => {
            const fixture = await beforePrestigePadTest({
                addSampleLaunch: true,
            });

            const { prestigePad, initiator1, validator } = fixture;

            const { defaultParams } = await beforeUpdateLaunchURITest(fixture);

            const invalidValidation = await getUpdateLaunchURIInvalidValidation(prestigePad, validator, defaultParams);
            await expect(prestigePad.connect(initiator1).updateLaunchURI(
                defaultParams.launchId,
                defaultParams.uri,
                invalidValidation
            )).to.be.revertedWithCustomError(prestigePad, 'InvalidSignature');
        });

        it('7.1.6.6. update launch uri unsuccessfully when launch is finalized', async () => {
            const fixture = await beforePrestigePadTest({
                addSampleLaunch: true,
                addSampleRounds: true,
                doAllFirstFound: true,
                doAllSecondFound: true,
                finalizeLaunch: true,
            });

            const { prestigePad, initiator1, validator } = fixture;

            const { defaultParams } = await beforeUpdateLaunchURITest(fixture);

            await expect(getUpdateLaunchURITx(prestigePad, validator, initiator1, defaultParams))
                .to.be.revertedWithCustomError(prestigePad, 'AlreadyFinalized');
        });
    });

    describe('7.1.7. updateRound(uint256, uint256, (string, (uint256, uint256, uint256), (uint256, address), (uint256, uint256, bytes)))', async () => {
        async function beforeUpdateRoundTest(fixture: PrestigePadFixture): Promise<{
            defaultParams: UpdateRoundParams,
        }> {
            const { currencies } = fixture;

            const defaultParams: UpdateRoundParams = {
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
            }

            return { defaultParams }
        }

        it('7.1.7.1. update round successfully', async () => {
            const fixture = await beforePrestigePadTest({
                addSampleLaunch: true,
                addSampleRounds: true,
            });

            const { prestigePad, manager, validator, initiator1, zone1, initiator2, zone2 } = fixture;

            const { defaultParams: params } = await beforeUpdateRoundTest(fixture);

            const validation = await getUpdateRoundValidation(prestigePad, validator, params);
            const roundWithValidation = {
                ...params.round,
                validation,
            }

            const currentRoundNumber = await prestigePad.roundNumber();
            const currentRoundIds = (await prestigePad.getLaunch(params.launchId)).roundIds;

            const tx = await prestigePad.connect(initiator1).updateRound(
                params.launchId,
                params.index,
                roundWithValidation
            );

            const roundId = currentRoundNumber.add(1);

            await expect(tx).to.emit(prestigePad, 'NewRound').withArgs(
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

            await expect(tx).to.emit(prestigePad, 'LaunchRoundUpdate').withArgs(
                params.launchId,
                roundId,
                params.index
            );

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

        it('7.1.7.2. update round unsuccessfully with invalid launch id', async () => {
            const fixture = await beforePrestigePadTest();

            const { prestigePad, initiator1, validator } = fixture;

            const { defaultParams } = await beforeUpdateRoundTest(fixture);

            const params1 = { ...defaultParams, launchId: BigNumber.from(0) };
            await expect(getUpdateRoundTx(prestigePad, validator, initiator1, params1))
                .to.be.revertedWithCustomError(prestigePad, 'InvalidLaunchId');

            const params2 = { ...defaultParams, launchId: BigNumber.from(100) };
            await expect(getUpdateRoundTx(prestigePad, validator, initiator1, params2))
                .to.be.revertedWithCustomError(prestigePad, 'InvalidLaunchId');
        });

        it('7.1.7.3. update round unsuccessfully when sender is not launch initiator', async () => {
            const fixture = await beforePrestigePadTest({
                addSampleLaunch: true,
                addSampleRounds: true,
            });

            const { prestigePad, manager, initiator1, validator } = fixture;

            const { defaultParams } = await beforeUpdateRoundTest(fixture);
            
            // By manager
            const params1 = { ...defaultParams, launchId: BigNumber.from(1) };
            await expect(getUpdateRoundTx(prestigePad, validator, manager, params1))
                .to.be.revertedWithCustomError(prestigePad, 'Unauthorized');

            // By wrong initiator
            const params2 = { ...defaultParams, launchId: BigNumber.from(2) };
            await expect(getUpdateRoundTx(prestigePad, validator, initiator1, params2))
                .to.be.revertedWithCustomError(prestigePad, 'Unauthorized');
        });

        it('7.1.7.4. update round unsuccessfully when paused', async () => {
            const fixture = await beforePrestigePadTest({
                addSampleLaunch: true,
                addSampleRounds: true,
                pause: true,
            });

            const { prestigePad, initiator1, validator } = fixture;
            
            const { defaultParams } = await beforeUpdateRoundTest(fixture);

            const params = { ...defaultParams, launchId: BigNumber.from(1) };
            await expect(getUpdateRoundTx(prestigePad, validator, initiator1, params))
                .to.be.revertedWith('Pausable: paused');
        });

        it('7.1.7.5. update round unsuccessfully with invalid round validation', async () => {
            const fixture = await beforePrestigePadTest({
                addSampleLaunch: true,
                addSampleRounds: true,
            });

            const { prestigePad, validator, initiator1 } = fixture;

            const { defaultParams: params } = await beforeUpdateRoundTest(fixture);

            const invalidValidation = await getUpdateRoundInvalidValidation(prestigePad, validator, params);
            const roundWithValidation = {
                ...params.round,
                validation: invalidValidation,
            }

            await expect(prestigePad.connect(initiator1).updateRound(
                params.launchId,
                params.index,
                roundWithValidation,
            )).to.be.revertedWithCustomError(prestigePad, 'InvalidSignature');
        });

        it('7.1.7.6. update round unsuccessfully when launch is finalized', async () => {
            const fixture = await beforePrestigePadTest({
                addSampleLaunch: true,
                addSampleRounds: true,
                doAllFirstFound: true,
                doAllSecondFound: true,
                finalizeLaunch: true,
            });

            const { prestigePad, initiator1, validator } = fixture;

            const { defaultParams } = await beforeUpdateRoundTest(fixture);

            await expect(getUpdateRoundTx(prestigePad, validator, initiator1, defaultParams))
                .to.be.revertedWithCustomError(prestigePad, 'AlreadyFinalized');
        });

        it('7.1.7.7. update round unsuccessfully with invalid index', async () => {
            const fixture = await beforePrestigePadTest({
                addSampleLaunch: true,
                addSampleRounds: true,
            });

            const { prestigePad, initiator1, validator } = fixture;
            
            const { defaultParams } = await beforeUpdateRoundTest(fixture);
            const roundIdsLength = (await prestigePad.getLaunch(defaultParams.launchId)).roundIds.length;

            const params1 = { ...defaultParams, index: BigNumber.from(roundIdsLength) };
            await expect(getUpdateRoundTx(prestigePad, validator, initiator1, params1))
                .to.be.revertedWithCustomError(prestigePad, 'InvalidInput');

            const params2 = { ...defaultParams, index: BigNumber.from(roundIdsLength + 1) };
            await expect(getUpdateRoundTx(prestigePad, validator, initiator1, params2))
                .to.be.revertedWithCustomError(prestigePad, 'InvalidInput');
        });

        it('7.1.7.8. update round unsuccessfully when updated round is already initiated', async () => {
            const fixture = await beforePrestigePadTest({
                addSampleLaunch: true,
                addSampleRounds: true,
            });

            const { prestigePad, initiator1, validator } = fixture;
            
            const { defaultParams } = await beforeUpdateRoundTest(fixture);

            const params = { ...defaultParams, index: BigNumber.from(0) };
            await expect(getUpdateRoundTx(prestigePad, validator, initiator1, params))
                .to.be.revertedWithCustomError(prestigePad, 'InvalidUpdating');
        });

        it('7.1.7.9. update round unsuccessfully when currency price is not in range', async () => {
            const fixture = await beforePrestigePadTest({
                addSampleLaunch: true,
                addSampleRounds: true,
            });

            const { prestigePad, initiator1, validator } = fixture;
            
            const { defaultParams } = await beforeUpdateRoundTest(fixture);
            
            // Above max
            const params1 = { 
                ...defaultParams,
                round: { 
                    ...defaultParams.round,
                    quote: { 
                        ...defaultParams.round.quote,
                        unitPrice: ethers.utils.parseEther('1000000000'),
                    },
                },
            };
            await expect(getUpdateRoundTx(prestigePad, validator, initiator1, params1))
                .to.be.revertedWithCustomError(prestigePad, 'InvalidUnitPrice');

            // Below min
            const params2 = { 
                ...defaultParams,
                round: { 
                    ...defaultParams.round,
                    quote: { 
                        ...defaultParams.round.quote,
                        unitPrice: ethers.utils.parseEther('0.00001'),
                    },
                },
            };
            await expect(getUpdateRoundTx(prestigePad, validator, initiator1, params2))
                .to.be.revertedWithCustomError(prestigePad, 'InvalidUnitPrice');
        });

        it('7.1.7.10. update round unsuccessfully when min selling quantity exceed max selling quantity', async () => {
            const fixture = await beforePrestigePadTest({
                addSampleLaunch: true,
                addSampleRounds: true,
            });

            const { prestigePad, initiator1, validator } = fixture;
            
            const { defaultParams } = await beforeUpdateRoundTest(fixture);
            const params1 = {
                ...defaultParams,
                round: {
                    ...defaultParams.round,
                    quota: {
                        ...defaultParams.round.quota,
                        minRaisingQuantity: defaultParams.round.quota.maxRaisingQuantity.add(1),
                    },
                },
            };

            await expect(getUpdateRoundTx(prestigePad, validator, initiator1, params1))
                .to.be.revertedWithCustomError(prestigePad, 'InvalidInput');

            const params2 = {
                ...defaultParams,
                round: {
                    ...defaultParams.round,
                    quota: {
                        ...defaultParams.round.quota,
                        minRaisingQuantity: defaultParams.round.quota.maxRaisingQuantity,
                    },
                },
            };
            await expect(getUpdateRoundTx(prestigePad, validator, initiator1, params2))
                .to.not.be.reverted;
        });

        it('7.1.7.11. update round unsuccessfully when max selling quantity exceed total quantity', async () => {
            const fixture = await beforePrestigePadTest({
                addSampleLaunch: true,
                addSampleRounds: true,
            });

            const { prestigePad, initiator1, validator } = fixture;
            
            const { defaultParams } = await beforeUpdateRoundTest(fixture);
            const params1 = {
                ...defaultParams,
                round: {
                    ...defaultParams.round,
                    quota: {
                        ...defaultParams.round.quota,
                        maxRaisingQuantity: defaultParams.round.quota.totalQuantity.add(1),
                    },
                },
            };
            await expect(getUpdateRoundTx(prestigePad, validator, initiator1, params1))
                .to.be.revertedWithCustomError(prestigePad, 'InvalidInput');

            const params2 = {
                ...defaultParams,
                round: {
                    ...defaultParams.round,
                    quota: {
                        ...defaultParams.round.quota,
                        maxRaisingQuantity: defaultParams.round.quota.totalQuantity,
                    },
                },
            };
            await expect(getUpdateRoundTx(prestigePad, validator, initiator1, params2))
                .to.not.be.reverted;
        });
    });

    describe('7.1.8. updateRounds(uint256, uint256, (string, (uint256, uint256, uint256), (uint256, address), (uint256, uint256, bytes))[])', async () => {
        async function beforeUpdateRoundsTest(fixture: PrestigePadFixture): Promise<{
            defaultParams: UpdateRoundsParams,
        }> {
            const { currencies } = fixture;
            
            const defaultParams: UpdateRoundsParams = {
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
                    }
                ]
            };

            return { defaultParams };
        }
        
        it('7.1.8.1. update rounds successfully', async () => {
            const fixture = await beforePrestigePadTest({
                addSampleLaunch: true,
                addSampleRounds: true,
            });

            const { prestigePad, validator, initiator1, initiator2 } = fixture;

            const { defaultParams } = await beforeUpdateRoundsTest(fixture);
            const params1 = {
                ...defaultParams,
                removedRoundNumber: BigNumber.from(0),
            };

            const validations1 = await getUpdateRoundsValidation(prestigePad, validator, params1);
            const roundsWithValidations1 = params1.addedRounds.map((round, index) => ({
                ...round,
                validation: validations1[index],
            }));

            const currentIndex1 = (await prestigePad.getLaunch(params1.launchId)).currentIndex;
            const currentRoundNumber1 = await prestigePad.roundNumber();
            const currentRoundIds1 = (await prestigePad.getLaunch(params1.launchId)).roundIds;
            const startIndex1 = currentRoundIds1.length;

            // Tx1: No round removal
            const tx1 = await prestigePad.connect(initiator1).updateRounds(
                params1.launchId,
                params1.removedRoundNumber,
                roundsWithValidations1,
            );
            await tx1.wait();

            await expect(tx1).to.emit(prestigePad, 'LaunchRoundsRemoval').withArgs(
                params1.launchId,
                params1.removedRoundNumber,
                startIndex1,
            );

            for(let i = 0; i < params1.addedRounds.length; i++) {
                await expect(tx1).to.emit(prestigePad, 'LaunchRoundAppendage').withArgs(
                    params1.launchId,
                    currentRoundNumber1.add(i+1),
                );
            }

            const launch1 = await prestigePad.getLaunch(params1.launchId);
            expect(launch1.currentIndex).to.equal(currentIndex1);

            const expectedNewRoundIds1 = [...currentRoundIds1];
            for(let i = 0; i < params1.addedRounds.length; i++) {
                expectedNewRoundIds1.push(currentRoundNumber1.add(i+1));
            }
            expect(launch1.roundIds).to.deep.equal(expectedNewRoundIds1);

            for(let i = 0; i < params1.addedRounds.length; i++) {
                const roundId = currentRoundNumber1.add(i+1);
                const round = await prestigePad.getRound(roundId);
                expect(round.uri).to.equal(params1.addedRounds[i].uri);
                expect(round.quota.totalQuantity).to.equal(params1.addedRounds[i].quota.totalQuantity);
                expect(round.quota.minRaisingQuantity).to.equal(params1.addedRounds[i].quota.minRaisingQuantity);
                expect(round.quota.maxRaisingQuantity).to.equal(params1.addedRounds[i].quota.maxRaisingQuantity);
                expect(round.quote.unitPrice).to.equal(params1.addedRounds[i].quote.unitPrice);
                expect(round.quote.currency).to.equal(params1.addedRounds[i].quote.currency);
            }

            // Tx2: With round removal
            const params2 = {
                ...defaultParams,
                launchId: BigNumber.from(2),
                removedRoundNumber: BigNumber.from(2),
            };

            const validations2 = await getUpdateRoundsValidation(prestigePad, validator, params2);
            const roundsWithValidations2 = params2.addedRounds.map((round, index) => ({
                ...round,
                validation: validations2[index],
            }));

            const currentIndex2 = (await prestigePad.getLaunch(params2.launchId)).currentIndex;
            const currentRoundNumber2 = await prestigePad.roundNumber();
            const currentRoundIds2 = (await prestigePad.getLaunch(params2.launchId)).roundIds;
            const startIndex2 = currentRoundIds2.length - params2.removedRoundNumber.toNumber();

            const tx2 = await prestigePad.connect(initiator2).updateRounds(
                params2.launchId,
                params2.removedRoundNumber,
                roundsWithValidations2,
            );
            const receipt2 = await tx2.wait();

            const launch2 = await prestigePad.getLaunch(params2.launchId);
            expect(launch2.currentIndex).to.equal(currentIndex2);

            const expectedNewRoundIds2 = [...currentRoundIds2].slice(0, -params2.removedRoundNumber.toNumber());
            for(let i = 0; i < params2.addedRounds.length; i++) {
                expectedNewRoundIds2.push(currentRoundNumber2.add(i+1));
            }
            expect(launch2.roundIds).to.deep.equal(expectedNewRoundIds2);

            for(let i = 0; i < params2.addedRounds.length; i++) {
                await expect(tx2).to.emit(prestigePad, 'LaunchRoundAppendage').withArgs(
                    params2.launchId,
                    currentRoundNumber2.add(i+1),
                );
            }
        });

        it('7.1.8.2. update round unsuccessfully with invalid launch id', async () => {
            const fixture = await beforePrestigePadTest();

            const { prestigePad, validator, initiator1 } = fixture;

            const { defaultParams } = await beforeUpdateRoundsTest(fixture);
            
            const params1 = {
                ...defaultParams,
                launchId: BigNumber.from(0),
            };            
            await expect(getUpdateRoundsTx(
                prestigePad,
                validator,
                initiator1,
                params1,
            )).to.be.revertedWithCustomError(prestigePad, 'InvalidLaunchId');

            const params2 = {
                ...defaultParams,
                launchId: BigNumber.from(100),
            };
            await expect(getUpdateRoundsTx(
                prestigePad,
                validator,
                initiator1,
                params2,
            )).to.be.revertedWithCustomError(prestigePad, 'InvalidLaunchId');
        });

        it('7.1.8.3. update round unsuccessfully when sender is not launch initiator', async () => {
            const fixture = await beforePrestigePadTest({
                addSampleLaunch: true,
                addSampleRounds: true,
            });

            const { prestigePad, validator, manager, initiator2 } = fixture;

            const { defaultParams } = await beforeUpdateRoundsTest(fixture);

            // By manager
            await expect(getUpdateRoundsTx(
                prestigePad,
                validator,
                manager,
                defaultParams,
            )).to.be.revertedWithCustomError(prestigePad, 'Unauthorized');

            // By wrong initiator
            await expect(getUpdateRoundsTx(
                prestigePad,
                validator,
                initiator2,
                defaultParams,
            )).to.be.revertedWithCustomError(prestigePad, 'Unauthorized');
        });

        it('7.1.8.4. update round unsuccessfully when paused', async () => {
            const fixture = await beforePrestigePadTest({
                addSampleLaunch: true,
                addSampleRounds: true,
                pause: true,
            });

            const { prestigePad, validator, initiator1 } = fixture;

            const { defaultParams } = await beforeUpdateRoundsTest(fixture);

            await expect(getUpdateRoundsTx(
                prestigePad,
                validator,
                initiator1,
                defaultParams,
            )).to.be.revertedWith('Pausable: paused');
        });

        it('7.1.8.5. update round unsuccessfully when launch is finalized', async () => {
            const fixture = await beforePrestigePadTest({
                addSampleLaunch: true,
                addSampleRounds: true,
                doAllFirstFound: true,
                doAllSecondFound: true,
                finalizeLaunch: true,
            });

            const { prestigePad, validator, initiator1 } = fixture;

            const { defaultParams } = await beforeUpdateRoundsTest(fixture);

            await expect(getUpdateRoundsTx(
                prestigePad,
                validator,
                initiator1,
                defaultParams,
            )).to.be.revertedWithCustomError(prestigePad, 'AlreadyFinalized');
        });

        it('7.1.8.6. update round unsuccessfully when removing round number is greater than launch total round number', async () => {
            const fixture = await beforePrestigePadTest({
                addSampleLaunch: true,
                addSampleRounds: true,
            });

            const { prestigePad, validator, initiator1 } = fixture;

            const { defaultParams } = await beforeUpdateRoundsTest(fixture);

            const currentLaunchRoundNumber = (await prestigePad.getLaunch(defaultParams.launchId)).roundIds.length;

            const params1 = {
                ...defaultParams,
                removedRoundNumber: BigNumber.from(currentLaunchRoundNumber),
            };
            await expect(getUpdateRoundsTx(
                prestigePad,
                validator,
                initiator1,
                params1,
            )).to.be.revertedWithCustomError(prestigePad, 'InvalidRemoving');

            const params2 = {
                ...defaultParams,
                removedRoundNumber: BigNumber.from(currentLaunchRoundNumber + 1),
            };
            await expect(getUpdateRoundsTx(
                prestigePad,
                validator,
                initiator1,
                params2,
            )).to.be.revertedWithCustomError(prestigePad, 'InvalidRemoving');
        });

        it('7.1.8.7. update round unsuccessfully when current round is removed', async () => {
            const fixture = await beforePrestigePadTest({
                addSampleLaunch: true,
                addSampleRounds: true,
                raiseFirstRound: true,
            });

            const { prestigePad, validator, initiator1 } = fixture;

            const { defaultParams } = await beforeUpdateRoundsTest(fixture);            

            const params1 = {
                ...defaultParams,
                removedRoundNumber: BigNumber.from(2),
            };
            await expect(getUpdateRoundsTx(
                prestigePad,
                validator,
                initiator1,
                params1,
            )).to.be.revertedWithCustomError(prestigePad, 'InvalidRemoving');
            
            const params2 = {
                ...defaultParams,
                removedRoundNumber: BigNumber.from(3),
            };
            await expect(getUpdateRoundsTx(
                prestigePad,
                validator,
                initiator1,
                params2,
            )).to.be.revertedWithCustomError(prestigePad, 'InvalidRemoving');

            const params3 = {
                ...defaultParams,
                removedRoundNumber: BigNumber.from(1),
            };
            await expect(getUpdateRoundsTx(
                prestigePad,
                validator,
                initiator1,
                params3,
            )).to.not.be.reverted;
        });

        it('7.1.8.8. update round unsuccessfully with invalid round validation', async () => {
            const fixture = await beforePrestigePadTest({
                addSampleLaunch: true,
                addSampleRounds: true,
            });

            const { prestigePad, validator, initiator1 } = fixture;

            const { defaultParams } = await beforeUpdateRoundsTest(fixture);

            const validations = await getUpdateRoundsValidation(prestigePad, validator, defaultParams);
            const invalidValidations = await getUpdateRoundsInvalidValidation(prestigePad, validator, defaultParams);

            const roundsWithInvalidValidations = defaultParams.addedRounds.map((round, index) => ({
                ...round,
                validation: validations[index],
            }));
            roundsWithInvalidValidations[0].validation = invalidValidations[0];
            
            await expect(prestigePad.connect(initiator1).updateRounds(
                defaultParams.launchId,
                defaultParams.removedRoundNumber,
                roundsWithInvalidValidations,
            )).to.be.revertedWithCustomError(prestigePad, 'InvalidSignature');
        });

        it('7.1.8.9. update round unsuccessfully when currency price is not in range', async () => {
            const fixture = await beforePrestigePadTest({
                addSampleLaunch: true,
                addSampleRounds: true,
            });

            const { prestigePad, validator, initiator1 } = fixture;

            const { defaultParams } = await beforeUpdateRoundsTest(fixture);

            // Above max
            const params1 = {
                ...defaultParams,
                addedRounds: [
                    {
                        ...defaultParams.addedRounds[0],
                        quote: {
                            ...defaultParams.addedRounds[0].quote,
                            unitPrice: ethers.utils.parseEther("1000000000"),
                        },
                    },
                    ...defaultParams.addedRounds.slice(1),
                ],
            };
            await expect(getUpdateRoundsTx(
                prestigePad,
                validator,
                initiator1,
                params1,
            )).to.be.revertedWithCustomError(prestigePad, 'InvalidUnitPrice');

            // Below min
            const params2 = {
                ...defaultParams,
                addedRounds: [
                    {
                        ...defaultParams.addedRounds[0],
                        quote: {
                            ...defaultParams.addedRounds[0].quote,
                            unitPrice: ethers.utils.parseEther("0.00001"),
                        },
                    },
                ],
            };
            await expect(getUpdateRoundsTx(
                prestigePad,
                validator,
                initiator1,
                params2,
            )).to.be.revertedWithCustomError(prestigePad, 'InvalidUnitPrice');
        });

        it('7.1.8.10. update round unsuccessfully when min selling quantity exceed max selling quantity', async () => {
            const fixture = await beforePrestigePadTest({
                addSampleLaunch: true,
                addSampleRounds: true,
            });

            const { prestigePad, validator, initiator1 } = fixture;

            const { defaultParams } = await beforeUpdateRoundsTest(fixture);

            const params1 = {
                ...defaultParams,
                addedRounds: [
                    {
                        ...defaultParams.addedRounds[0],
                        quota: {
                            ...defaultParams.addedRounds[0].quota,
                            minRaisingQuantity: defaultParams.addedRounds[0].quota.maxRaisingQuantity.add(1),
                        },
                    },
                    ...defaultParams.addedRounds.slice(1),
                ],
            };
            await expect(getUpdateRoundsTx(
                prestigePad,
                validator,
                initiator1,
                params1,
            )).to.be.revertedWithCustomError(prestigePad, 'InvalidInput');

            const params2 = {
                ...defaultParams,
                addedRounds: [
                    {
                        ...defaultParams.addedRounds[0],
                        quota: {
                            ...defaultParams.addedRounds[0].quota,
                            minRaisingQuantity: defaultParams.addedRounds[0].quota.maxRaisingQuantity,
                        },
                    },
                ],
            };
            await expect(getUpdateRoundsTx(
                prestigePad,
                validator,
                initiator1,
                params2,
            )).to.not.be.reverted;
        });

        it('7.1.8.11. update round unsuccessfully when max selling quantity exceed total quantity', async () => {
            const fixture = await beforePrestigePadTest({
                addSampleLaunch: true,
                addSampleRounds: true,
            });

            const { prestigePad, validator, initiator1 } = fixture;

            const { defaultParams } = await beforeUpdateRoundsTest(fixture);

            const params1 = {
                ...defaultParams,
                addedRounds: [
                    {
                        ...defaultParams.addedRounds[0],
                        quota: {
                            ...defaultParams.addedRounds[0].quota,
                            maxRaisingQuantity: defaultParams.addedRounds[0].quota.totalQuantity.add(1),
                        },
                    },
                    ...defaultParams.addedRounds.slice(1),
                ],
            };
            await expect(getUpdateRoundsTx(
                prestigePad,
                validator,
                initiator1,
                params1,
            )).to.be.revertedWithCustomError(prestigePad, 'InvalidInput');

            const params2 = {
                ...defaultParams,
                addedRounds: [
                    {
                        ...defaultParams.addedRounds[0],
                        quota: {
                            ...defaultParams.addedRounds[0].quota,
                            maxRaisingQuantity: defaultParams.addedRounds[0].quota.totalQuantity,
                        },
                    },
                ],
            };
            await expect(getUpdateRoundsTx(
                prestigePad,
                validator,
                initiator1,
                params2,
            )).to.not.be.reverted;
        });
    });

    describe('7.1.9. scheduleNextRound(uint256, uint256, uint256, address[], uint256[], uint40, uint40)', async () => {
        async function beforeScheduleNextRoundTest(fixture: PrestigePadFixture): Promise<{
            defaultParams: ScheduleNextRoundParams,
        }> {
            const { currencies } = fixture;

            let timestamp = await time.latest() + 100;

            const defaultParams = {
                launchId: BigNumber.from(1),
                cashbackThreshold: BigNumber.from('5'),
                cashbackBaseRate: ethers.utils.parseEther("0.1"),
                cashbackCurrencies: [currencies[0].address, currencies[1].address],
                cashbackDenominations: [ethers.utils.parseEther('0.01'), ethers.utils.parseEther('0.02')],
                raiseStartsAt: timestamp + 10,
                raiseDuration: Constant.PRESTIGE_PAD_RAISE_MINIMUM_DURATION + 10,
            };

            return { defaultParams };
        }

        async function expectScheduleNextRound(
            fixture: PrestigePadFixture,
            params: ScheduleNextRoundParams,
            signer: Wallet,
            expectFn: (tx: Promise<any>) => Promise<void>
        ) {
            const { prestigePad } = fixture;
            await expectFn(prestigePad.connect(signer).scheduleNextRound(
                params.launchId,
                params.cashbackThreshold,
                params.cashbackBaseRate,
                params.cashbackCurrencies,
                params.cashbackDenominations,
                params.raiseStartsAt,
                params.raiseDuration,
            ));
        }

        it('7.1.9.1. raise next round successfully', async () => {
            const fixture = await beforePrestigePadTest({
                addSampleLaunch: true,
                addSampleRounds: true,
            });

            const { prestigePad, initiator1, initiator2, currencies, admin, reserveVault } = fixture;

            // Tx1: launch 1 with cashback
            let timestamp = await time.latest() + 100;
            
            const params1 = {
                launchId: BigNumber.from(1),
                cashbackThreshold: BigNumber.from('5'),
                cashbackBaseRate: ethers.utils.parseEther("0.1"),
                cashbackCurrencies: [currencies[0].address, currencies[1].address],
                cashbackDenominations: [ethers.utils.parseEther('0.01'), ethers.utils.parseEther('0.02')],
                raiseStartsAt: timestamp + 10,
                raiseDuration: Constant.PRESTIGE_PAD_RAISE_MINIMUM_DURATION + 10,
            }

            const roundId1 = (await prestigePad.getLaunch(params1.launchId)).roundIds[1];
            const unitPrice = (await prestigePad.getRound(roundId1)).quote.unitPrice;
            const feeDenomination = await getFeeDenomination(
                prestigePad,
                admin,
                params1.launchId,
                unitPrice,
                null
            );

            const initFundNumber = await reserveVault.fundNumber();

            const tx1 = await prestigePad.connect(initiator1).scheduleNextRound(
                params1.launchId,
                params1.cashbackThreshold,
                params1.cashbackBaseRate,
                params1.cashbackCurrencies,
                params1.cashbackDenominations,
                params1.raiseStartsAt,
                params1.raiseDuration,
            );
            await tx1.wait();

            const cashbackFundId1 = initFundNumber.add(1);
            const mainDenomination = feeDenomination.mul(params1.cashbackBaseRate).div(Constant.COMMON_RATE_MAX_FRACTION);

            await expect(tx1).to.emit(prestigePad, 'LaunchNextRoundSchedule').withArgs(
                params1.launchId,
                roundId1,
                cashbackFundId1,
                params1.raiseStartsAt,
                params1.raiseDuration,
            );
            await expect(tx1).to.emit(reserveVault, 'NewFund').withArgs(
                cashbackFundId1,
                prestigePad.address,
                ethers.constants.AddressZero,
                mainDenomination,
                params1.cashbackCurrencies,
                params1.cashbackDenominations,
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
                cashbackBaseRate: ethers.utils.parseEther("0.2"),
                cashbackCurrencies: [currencies[1].address, ethers.constants.AddressZero],
                cashbackDenominations: [ethers.utils.parseEther('0.01'), ethers.utils.parseEther('0.02')],
                raiseStartsAt: timestamp + 20,
                raiseDuration: Constant.PRESTIGE_PAD_RAISE_MINIMUM_DURATION + 20,
            }

            const roundId2 = (await prestigePad.getLaunch(params2.launchId)).roundIds[1];
            const unitPrice2 = (await prestigePad.getRound(roundId2)).quote.unitPrice;
            const feeDenomination2 = await getFeeDenomination(
                prestigePad,
                admin,
                params2.launchId,
                unitPrice2,
                currencies[0]
            );

            const tx2 = await prestigePad.connect(initiator2).scheduleNextRound(
                params2.launchId,
                params2.cashbackThreshold,
                params2.cashbackBaseRate,
                params2.cashbackCurrencies,
                params2.cashbackDenominations,
                params2.raiseStartsAt,
                params2.raiseDuration,
            );
            await tx2.wait();

            const cashbackFundId2 = initFundNumber.add(2);
            const mainDenomination2 = feeDenomination2.mul(params2.cashbackBaseRate).div(Constant.COMMON_RATE_MAX_FRACTION);

            await expect(tx2).to.emit(prestigePad, 'LaunchNextRoundSchedule').withArgs(
                params2.launchId,
                roundId2,
                cashbackFundId2,
                params2.raiseStartsAt,
                params2.raiseDuration,
            );
            await expect(tx2).to.emit(reserveVault, 'NewFund').withArgs(
                cashbackFundId2,
                prestigePad.address,
                currencies[0].address,
                mainDenomination2,
                params2.cashbackCurrencies,
                params2.cashbackDenominations,
            );

            expect(await reserveVault.fundNumber()).to.equal(initFundNumber.add(2));

            const fund2 = await reserveVault.getFund(cashbackFundId2);
            expect(fund2.mainCurrency).to.equal(currencies[0].address);
            expect(fund2.mainDenomination).to.equal(mainDenomination2);
            expect(fund2.extraCurrencies).to.deep.equal(params2.cashbackCurrencies);
            expect(fund2.extraDenominations).to.deep.equal(params2.cashbackDenominations);
        });
        
        it('7.1.9.2. raise next round successfully without cashback', async () => {
            const fixture = await beforePrestigePadTest({
                addSampleLaunch: true,
                addSampleRounds: true,
            });

            const { prestigePad, initiator1, reserveVault, admin } = fixture;

            const { defaultParams } = await beforeScheduleNextRoundTest(fixture);

            let timestamp = await time.latest() + 100;

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
            }

            const tx = await prestigePad.connect(initiator1).scheduleNextRound(
                params.launchId,
                params.cashbackThreshold,
                params.cashbackBaseRate,
                params.cashbackCurrencies,
                params.cashbackDenominations,
                params.raiseStartsAt,
                params.raiseDuration,
            );
            await tx.wait();

            const cashbackFundId = BigNumber.from(0);
            await expect(tx).to.emit(prestigePad, 'LaunchNextRoundSchedule').withArgs(
                params.launchId,
                roundId,
                cashbackFundId,
                params.raiseStartsAt,
                params.raiseDuration,
            );

            expect(await reserveVault.fundNumber()).to.equal(initFundNumber);
            
            const round = await prestigePad.getRound(roundId);
            expect(round.quote.cashbackThreshold).to.equal(params.cashbackThreshold);
            expect(round.quote.cashbackFundId).to.equal(cashbackFundId);
            expect(round.quote.feeDenomination).to.equal(feeDenomination);

            expect(round.agenda.raiseStartsAt).to.equal(params.raiseStartsAt);
            expect(round.agenda.raiseEndsAt).to.equal(params.raiseStartsAt + params.raiseDuration);
        });

        it('7.1.9.3. raise next round unsuccessfully when contract is reentered', async () => {
            const fixture = await beforePrestigePadTest({
                addSampleLaunch: true,
                addSampleRounds: true,
                useExclusiveReentrantCurrency: true,
            });

            const { prestigePad, initiator2, currencies } = fixture;
            const reentrancy = currencies[0];

            const { defaultParams } = await beforeScheduleNextRoundTest(fixture);
            const params = {
                ...defaultParams,
                launchId: BigNumber.from(2),
            }

            await testReentrancy_prestigePad(
                fixture,
                reentrancy,
                async (timestamp: number) => {
                    await expectScheduleNextRound(fixture, params, initiator2, async (tx) => {
                        await expect(tx).to.be.revertedWith('ReentrancyGuard: reentrant call');                        
                    });
                }
            );
        });

        it('7.1.9.4. raise next round unsuccessfully with invalid launch id', async () => {
            const fixture = await beforePrestigePadTest();

            const { prestigePad, initiator1 } = fixture;
            
            const { defaultParams } = await beforeScheduleNextRoundTest(fixture);
            
            const params1 = {
                ...defaultParams,
                launchId: BigNumber.from(0),
            }
            await expectScheduleNextRound(fixture, params1, initiator1, async (tx) => {
                await expect(tx).to.be.revertedWithCustomError(prestigePad, 'InvalidLaunchId');
            });

            const params2 = {
                ...defaultParams,
                launchId: BigNumber.from(100),
            }
            await expectScheduleNextRound(fixture, params2, initiator1, async (tx) => {
                await expect(tx).to.be.revertedWithCustomError(prestigePad, 'InvalidLaunchId');
            });
        });

        it('7.1.9.5. raise next round unsuccessfully when sender is not launch initiator', async () => {
            const fixture = await beforePrestigePadTest({
                addSampleLaunch: true,
                addSampleRounds: true,
            });

            const { prestigePad, manager, initiator2 } = fixture;

            const { defaultParams } = await beforeScheduleNextRoundTest(fixture);
            
            // By manager
            await expectScheduleNextRound(fixture, defaultParams, manager, async (tx) => {
                await expect(tx).to.be.revertedWithCustomError(prestigePad, 'Unauthorized');
            });

            // By wrong initiator
            await expectScheduleNextRound(fixture, defaultParams, initiator2, async (tx) => {
                await expect(tx).to.be.revertedWithCustomError(prestigePad, 'Unauthorized');
            });
        });

        it('7.1.9.6. raise next round unsuccessfully when paused', async () => {
            const fixture = await beforePrestigePadTest({
                addSampleLaunch: true,
                addSampleRounds: true,
                pause: true,
            });

            const { initiator1 } = fixture;

            const { defaultParams } = await beforeScheduleNextRoundTest(fixture);

            await expectScheduleNextRound(fixture, defaultParams, initiator1, async (tx) => {
                await expect(tx).to.be.revertedWith('Pausable: paused');
            });
        });

        it('7.1.9.7. raise next round unsuccessfully with invalid cashback base rate', async () => {
            const fixture = await beforePrestigePadTest({
                addSampleLaunch: true,
                addSampleRounds: true,
            });

            const { prestigePad, initiator1 } = fixture;
            
            const { defaultParams } = await beforeScheduleNextRoundTest(fixture);
            
            const params1 = {
                ...defaultParams,
                cashbackBaseRate: Constant.COMMON_RATE_MAX_FRACTION.add(1),
            }
            await expectScheduleNextRound(fixture, params1, initiator1, async (tx) => {
                await expect(tx).to.be.revertedWithCustomError(prestigePad, 'InvalidInput');
            });

            const params2 = {
                ...defaultParams,
                cashbackBaseRate: Constant.COMMON_RATE_MAX_FRACTION,
            }
            await expectScheduleNextRound(fixture, params2, initiator1, async (tx) => {
                await expect(tx).to.not.be.reverted;
            });
        });

        it('7.1.9.8. raise next round unsuccessfully with mismatched params length', async () => {
            const fixture = await beforePrestigePadTest({
                addSampleLaunch: true,
                addSampleRounds: true,
            });

            const { prestigePad, initiator1, currencies } = fixture;
            
            const { defaultParams } = await beforeScheduleNextRoundTest(fixture);

            const params1 = {
                ...defaultParams,
                cashbackCurrencies: [currencies[0].address, currencies[1].address],
                cashbackDenominations: [ethers.utils.parseEther('0.01')],
            }
            await expectScheduleNextRound(fixture, params1, initiator1, async (tx) => {
                await expect(tx).to.be.revertedWithCustomError(prestigePad, 'InvalidInput');
            });

            const params2 = {
                ...defaultParams,
                cashbackCurrencies: [currencies[0].address, currencies[1].address],
                cashbackDenominations: [ethers.utils.parseEther('0.01'), ethers.utils.parseEther('0.02'), ethers.utils.parseEther('0.03')],
            }
            await expectScheduleNextRound(fixture, params2, initiator1, async (tx) => {
                await expect(tx).to.be.revertedWithCustomError(prestigePad, 'InvalidInput');
            });
        });

        it('7.1.9.9. raise next round unsuccessfully with raise start time before current timestamp', async () => {
            const fixture = await beforePrestigePadTest({
                addSampleLaunch: true,
                addSampleRounds: true,
            });

            const { prestigePad, initiator1 } = fixture;
            
            const { defaultParams } = await beforeScheduleNextRoundTest(fixture);

            let timestamp = await time.latest() + 100;
            await time.setNextBlockTimestamp(timestamp);

            const params1 = {
                ...defaultParams,
                raiseStartsAt: timestamp - 1,
            }
            await expectScheduleNextRound(fixture, params1, initiator1, async (tx) => {
                await expect(tx).to.be.revertedWithCustomError(prestigePad, 'InvalidInput');
            });

            timestamp += 10;
            await time.setNextBlockTimestamp(timestamp);

            const params2 = {
                ...defaultParams,
                raiseStartsAt: timestamp,
            };
            await expectScheduleNextRound(fixture, params2, initiator1, async (tx) => {
                await expect(tx).to.not.be.reverted;
            });
        });

        it('7.1.9.10. raise next round unsuccessfully with raise duration less than minimum requirement', async () => {
            const fixture = await beforePrestigePadTest({
                addSampleLaunch: true,
                addSampleRounds: true,
            });

            const { prestigePad, initiator1 } = fixture;
            
            const { defaultParams } = await beforeScheduleNextRoundTest(fixture);

            const params1 = {
                ...defaultParams,
                raiseDuration: Constant.PRESTIGE_PAD_RAISE_MINIMUM_DURATION - 1,
            };
            await expectScheduleNextRound(fixture, params1, initiator1, async (tx) => {
                await expect(tx).to.be.revertedWithCustomError(prestigePad, 'InvalidInput');
            });

            const params2 = {
                ...defaultParams,
                raiseDuration: Constant.PRESTIGE_PAD_RAISE_MINIMUM_DURATION,
            };
            await expectScheduleNextRound(fixture, params2, initiator1, async (tx) => {
                await expect(tx).to.not.be.reverted;
            });
        });

        it('7.1.9.11. raise next round unsuccessfully when launch is finalized', async () => {
            const fixture = await beforePrestigePadTest({
                addSampleLaunch: true,
                addSampleRounds: true,
                doAllFirstFound: true,
                doAllSecondFound: true,
                finalizeLaunch: true,
            });

            const { prestigePad, initiator1 } = fixture;

            const { defaultParams } = await beforeScheduleNextRoundTest(fixture);

            await expectScheduleNextRound(fixture, defaultParams, initiator1, async (tx) => {
                await expect(tx).to.be.revertedWithCustomError(prestigePad, 'AlreadyFinalized');
            });
        });

        it('7.1.9.12. raise next round unsuccessfully when current round is not confirmed', async () => {
            const fixture = await beforePrestigePadTest({
                addSampleLaunch: true,
                addSampleRounds: true,
                raiseFirstRound: true
            });

            const { prestigePad, initiator1 } = fixture;

            const { defaultParams } = await beforeScheduleNextRoundTest(fixture);

            await expectScheduleNextRound(fixture, defaultParams, initiator1, async (tx) => {
                await expect(tx).to.be.revertedWithCustomError(prestigePad, 'InvalidScheduling');
            });
            
        });

        it('7.1.9.13. raise next round unsuccessfully when there is no new round', async () => {
            const fixture = await beforePrestigePadTest({
                addSampleLaunch: true,
            });

            const { prestigePad, initiator1 } = fixture;

            const { defaultParams } = await beforeScheduleNextRoundTest(fixture);

            await expectScheduleNextRound(fixture, defaultParams, initiator1, async (tx) => {
                await expect(tx).to.be.revertedWithCustomError(prestigePad, 'NoRoundToInitiate');
            });            
        });

        it('7.1.9.14. raise next round unsuccessfully when cashback threshold exceed total quantity', async () => {
            const fixture = await beforePrestigePadTest({
                addSampleLaunch: true,
                addSampleRounds: true,
            });

            const { prestigePad, initiator1 } = fixture;
            
            const { defaultParams } = await beforeScheduleNextRoundTest(fixture);

            const roundId = (await prestigePad.getLaunch(defaultParams.launchId)).roundIds[1];
            const totalQuantity = (await prestigePad.getRound(roundId)).quota.totalQuantity;
            const params1 = {
                ...defaultParams,
                cashbackThreshold: totalQuantity.add(1),
            }
            await expectScheduleNextRound(fixture, params1, initiator1, async (tx) => {
                await expect(tx).to.be.revertedWithCustomError(prestigePad, 'InvalidInput');
            });

            const params2 = {
                ...defaultParams,
                cashbackThreshold: totalQuantity,
            }
            await expectScheduleNextRound(fixture, params2, initiator1, async (tx) => {
                await expect(tx).to.not.be.reverted;
            });
        });

        it('7.1.9.15. raise next round unsuccessfully without cashback currencies and rate, but with cashback threshold', async () => {
            const fixture = await beforePrestigePadTest({
                addSampleLaunch: true,
                addSampleRounds: true,
            });

            const { prestigePad, initiator1 } = fixture;

            const { defaultParams } = await beforeScheduleNextRoundTest(fixture);

            const params = {
                ...defaultParams,
                cashbackBaseRate: ethers.utils.parseEther("0"),
                cashbackThreshold: BigNumber.from(10),
                cashbackCurrencies: [],
                cashbackDenominations: [],
            }
            await expectScheduleNextRound(fixture, params, initiator1, async (tx) => {
                await expect(tx).to.be.revertedWithCustomError(prestigePad, 'InvalidInput');
            });
        });

        it('7.1.9.16. raise next round unsuccessfully with cashback currencies and rate, but without cashback threshold', async () => {
            const fixture = await beforePrestigePadTest({
                addSampleLaunch: true,
                addSampleRounds: true,
            });

            const { prestigePad, initiator1, currencies } = fixture;
            
            const { defaultParams } = await beforeScheduleNextRoundTest(fixture);

            const params = {
                ...defaultParams,
                cashbackBaseRate: ethers.utils.parseEther("0.1"),
                cashbackThreshold: BigNumber.from(0),
                cashbackCurrencies: [currencies[0].address, currencies[1].address],
                cashbackDenominations: [ethers.utils.parseEther('0.01'), ethers.utils.parseEther('0.02')],
            }
            await expectScheduleNextRound(fixture, params, initiator1, async (tx) => {
                await expect(tx).to.be.revertedWithCustomError(prestigePad, 'InvalidInput');
            });
        });

        it('7.1.9.17. raise next round unsuccessfully when open fund failed', async () => {
            const fixture = await beforePrestigePadTest({
                addSampleLaunch: true,
                addSampleRounds: true,
                skipAuthorizeProviders: true,
            });

            const { prestigePad, initiator1 } = fixture;

            const { defaultParams } = await beforeScheduleNextRoundTest(fixture);

            await expectScheduleNextRound(fixture, defaultParams, initiator1, async (tx) => {
                await expect(tx).to.be.revertedWithCustomError(prestigePad, 'Unauthorized');
            });
        });
    });

    describe('7.1.10. cancelCurrentRound(uint256)', async () => {
        it('7.1.10.1. cancel current round successfully', async () => {
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

            const tx1 = await prestigePad.connect(initiator1).cancelCurrentRound(launchId1);

            const newRoundId1 = currentRoundNumber.add(1);
            await expect(tx1).to.emit(prestigePad, 'LaunchCurrentRoundCancellation').withArgs(
                launchId1,
                newRoundId1,
            );

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

        it('7.1.10.2. cancel current round unsuccessfully with invalid launch id', async () => {
            const fixture = await beforePrestigePadTest();

            const { prestigePad, initiator1 } = fixture;

            await expect(prestigePad.connect(initiator1).cancelCurrentRound(1))
                .to.be.revertedWithCustomError(prestigePad, 'InvalidLaunchId');
        });

        it('7.1.10.3. cancel current round unsuccessfully when sender is not launch initiator', async () => {
            const fixture = await beforePrestigePadTest({
                addSampleLaunch: true,
                addSampleRounds: true,
                raiseFirstRound: true,
            });

            const { prestigePad, manager, initiator1 } = fixture;

            // By manager
            await expect(prestigePad.connect(manager).cancelCurrentRound(1))
                .to.be.revertedWithCustomError(prestigePad, 'Unauthorized');

            // By wrong initiator
            await expect(prestigePad.connect(initiator1).cancelCurrentRound(2))
                .to.be.revertedWithCustomError(prestigePad, 'Unauthorized');
        });

        it('7.1.10.4. cancel current round unsuccessfully when paused', async () => {
            const fixture = await beforePrestigePadTest({
                addSampleLaunch: true,
                addSampleRounds: true,
                raiseFirstRound: true,
                pause: true,
            });

            const { prestigePad, manager, initiator1 } = fixture;

            await expect(prestigePad.connect(initiator1).cancelCurrentRound(1))
                .to.be.revertedWith('Pausable: paused');
        });

        it('7.1.10.5. cancel current round unsuccessfully when launch is finalized', async () => {
            const fixture = await beforePrestigePadTest({
                addSampleLaunch: true,
                addSampleRounds: true,
                doAllFirstFound: true,
                doAllSecondFound: true,
                finalizeLaunch: true,
            });

            const { prestigePad, initiator1 } = fixture;

            await expect(prestigePad.connect(initiator1).cancelCurrentRound(1))
                .to.be.revertedWithCustomError(prestigePad, 'AlreadyFinalized');
        });

        it('7.1.10.6. cancel current round unsuccessfully when current round is confirmed', async () => {
            const fixture = await beforePrestigePadTest({
                addSampleLaunch: true,
                addSampleRounds: true,
                raiseFirstRound: true,
                depositFirstRound: true,
                confirmFirstRound: true,
            });

            const { prestigePad, initiator1 } = fixture;

            await expect(prestigePad.connect(initiator1).cancelCurrentRound(1))
                .to.be.revertedWithCustomError(prestigePad, 'AlreadyConfirmed');
        });
    });

    describe('7.1.11. safeConfirmCurrentRound(uint256, bytes32)', async () => {
        it('7.1.11.1. safe confirm current round successfully with native currency', async () => {
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

            let timestamp = await time.latest() + 100;
            await time.setNextBlockTimestamp(timestamp);

            const params = await getSafeConfirmCurrentRoundParams(prestigePad, { launchId: BigNumber.from(launchId) });
            const tx = await getSafeConfirmCurrentRoundTx(
                prestigePad,
                initiator1,
                params,
                { value: ethers.utils.parseEther('100') }
            );
            const receipt = await tx.wait();
            const gasFee = receipt.effectiveGasPrice.mul(receipt.gasUsed);

            await expect(tx).to.emit(prestigePad, 'LaunchCurrentRoundConfirmation').withArgs(
                launchId,
                roundId,
                round.quota.raisedQuantity,
                value,
                feeAmount,
                cashbackBaseAmount
            );
            await expect(tx).to.emit(reserveVault, 'FundProvision').withArgs(
                fundId,
            );

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

            expect(await currencies[0].balanceOf(prestigePad.address)).to.equal(
                initPrestigePadCurrency0Balance
            );
            expect(await currencies[0].balanceOf(initiator1.address)).to.equal(
                initInitiator1Currency0Balance.sub(cashbackCurrency0Value)
            );
            expect(await currencies[0].balanceOf(reserveVault.address)).to.equal(
                initReserveVaultCurrency0Balance.add(cashbackCurrency0Value)
            );
            expect(await currencies[0].balanceOf(feeReceiver.address)).to.equal(
                initFeeReceiverCurrency0Balance
            );

            expect(await currencies[1].balanceOf(prestigePad.address)).to.equal(
                initPrestigePadCurrency1Balance
            );
            expect(await currencies[1].balanceOf(initiator1.address)).to.equal(
                initInitiator1Currency1Balance.sub(cashbackCurrency1Value)
            );
            expect(await currencies[1].balanceOf(reserveVault.address)).to.equal(
                initReserveVaultCurrency1Balance.add(cashbackCurrency1Value)
            );
            expect(await currencies[1].balanceOf(feeReceiver.address)).to.equal(
                initFeeReceiverCurrency1Balance
            );
        });

        it('7.1.11.2. safe confirm current round successfully with erc20 after raise ended', async () => {
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

            const params = await getSafeConfirmCurrentRoundParams(prestigePad, { launchId: BigNumber.from(launchId) });
            const tx = await getSafeConfirmCurrentRoundTx(
                prestigePad,
                initiator1,
                params,
                { value: ethers.utils.parseEther('100') }
            );
            const receipt = await tx.wait();
            const gasFee = receipt.effectiveGasPrice.mul(receipt.gasUsed);

            await expect(tx).to.emit(prestigePad, 'LaunchCurrentRoundConfirmation').withArgs(
                launchId,
                roundId,
                round.quota.raisedQuantity,
                value,
                feeAmount,
                cashbackBaseAmount
            );
            await expect(tx).to.emit(reserveVault, 'FundProvision').withArgs(
                fundId,
            );

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

            expect(await ethers.provider.getBalance(prestigePad.address)).to.equal(
                initPrestigePadNativeBalance
            );
            expect(await ethers.provider.getBalance(initiator1.address)).to.equal(
                initInitiator1NativeBalance.sub(gasFee).sub(cashbackNativeValue)
            );
            expect(await ethers.provider.getBalance(reserveVault.address)).to.equal(
                initReserveVaultNativeBalance.add(cashbackNativeValue)
            );
            expect(await ethers.provider.getBalance(feeReceiver.address)).to.equal(
                initFeeReceiverNativeBalance
            );

            expect(await currencies[1].balanceOf(prestigePad.address)).to.equal(
                initPrestigePadCurrency1Balance
            );
            expect(await currencies[1].balanceOf(initiator1.address)).to.equal(
                initInitiator1Currency1Balance.sub(cashbackCurrency1Value)
            );
            expect(await currencies[1].balanceOf(reserveVault.address)).to.equal(
                initReserveVaultCurrency1Balance.add(cashbackCurrency1Value)
            );
            expect(await currencies[1].balanceOf(feeReceiver.address)).to.equal(
                initFeeReceiverCurrency1Balance
            );
        });

        it('7.1.11.3. safe confirm current round successfully with erc20 without cashback', async () => {
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

            let timestamp = await time.latest() + 100;
            await time.setNextBlockTimestamp(timestamp);

            const params = await getSafeConfirmCurrentRoundParams(prestigePad, { launchId: BigNumber.from(launchId) });
            const tx = await getSafeConfirmCurrentRoundTx(
                prestigePad,
                initiator2,
                params,
                { value: ethers.utils.parseEther('100') }
            );
            const receipt = await tx.wait();
            const gasFee = receipt.effectiveGasPrice.mul(receipt.gasUsed);

            await expect(tx).to.emit(prestigePad, 'LaunchCurrentRoundConfirmation').withArgs(
                launchId,
                roundId,
                round.quota.raisedQuantity,
                value,
                feeAmount,
                0
            );
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
            expect(await currencies[0].balanceOf(reserveVault.address)).to.equal(
                initReserveVaultCurrency0Balance
            );

            expect(await ethers.provider.getBalance(prestigePad.address)).to.equal(
                initPrestigePadNativeBalance
            );
            expect(await ethers.provider.getBalance(initiator2.address)).to.equal(
                initInitiator2NativeBalance.sub(gasFee)
            );
        });

        it('7.1.11.4. safe confirm current round successfully with native currency without cashback', async () => {
            const fixture = await beforePrestigePadTest({
                addSampleLaunch: true,
                addSampleRounds: true,
                doAllFirstFound: true,
                raiseSecondRound: true,
                depositSecondRound: true,
            });

            const { prestigePad, initiator2, projectToken, feeReceiver, reserveVault, currencies } = fixture;

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

            let timestamp = await time.latest() + 100;
            await time.setNextBlockTimestamp(timestamp);

            const params = await getSafeConfirmCurrentRoundParams(prestigePad, { launchId: BigNumber.from(launchId) });
            const tx = await getSafeConfirmCurrentRoundTx(
                prestigePad,
                initiator2,
                params,
                { value: ethers.utils.parseEther('100') }
            );
            const receipt = await tx.wait();
            const gasFee = receipt.effectiveGasPrice.mul(receipt.gasUsed);

            await expect(tx).to.emit(prestigePad, 'LaunchCurrentRoundConfirmation').withArgs(
                launchId,
                roundId,
                round.quota.raisedQuantity,
                value,
                feeAmount,
                0
            );
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
            expect(await ethers.provider.getBalance(reserveVault.address)).to.equal(
                initReserveVaultNativeBalance
            );
        });

        it('7.1.11.5. safe confirm current round successfully with native currency in both main and extra currencies', async () => {
            const fixture = await beforePrestigePadTest({
                addSampleLaunch: true,
                addSampleRounds: true,
            });

            const { prestigePad, initiator1, depositor1, currencies, projectToken, feeReceiver, reserveVault } = fixture;

            let timestamp = await time.latest() + 100;
            await time.setNextBlockTimestamp(timestamp);

            const launchId = 1;

            const scheduleParams = {
                launchId: BigNumber.from(launchId),
                cashbackThreshold: BigNumber.from('5'),
                cashbackBaseRate: ethers.utils.parseEther("0.1"),
                cashbackCurrencies: [ethers.constants.AddressZero],
                cashbackDenominations: [ethers.utils.parseEther('0.01')],
                raiseStartsAt: timestamp + 10,
                raiseDuration: Constant.PRESTIGE_PAD_RAISE_MINIMUM_DURATION + 10,
            };
            await callTransaction(prestigePad.connect(initiator1).scheduleNextRound(
                scheduleParams.launchId,
                scheduleParams.cashbackThreshold,
                scheduleParams.cashbackBaseRate,
                scheduleParams.cashbackCurrencies,
                scheduleParams.cashbackDenominations,
                scheduleParams.raiseStartsAt,
                scheduleParams.raiseDuration
            ));

            const roundId = (await prestigePad.getLaunch(launchId)).roundIds[1];
            timestamp = (await prestigePad.getRound(roundId)).agenda.raiseStartsAt;
            await time.setNextBlockTimestamp(timestamp);

            await callTransaction(prestigePad.connect(depositor1).contributeCurrentRound(launchId, 10, { value: ethers.utils.parseEther('10') }));

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

            const confirmParams = await getSafeConfirmCurrentRoundParams(prestigePad, { launchId: BigNumber.from(launchId) });
            const tx = await getSafeConfirmCurrentRoundTx(
                prestigePad,
                initiator1,
                confirmParams,
                { value: ethers.utils.parseEther('100') }
            );
            const receipt = await tx.wait();
            const gasFee = receipt.effectiveGasPrice.mul(receipt.gasUsed);

            await expect(tx).to.emit(prestigePad, 'LaunchCurrentRoundConfirmation').withArgs(
                launchId,
                roundId,
                round.quota.raisedQuantity,
                value,
                feeAmount,
                cashbackBaseAmount,
            );
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

        it('7.1.11.6. safe confirm current round successfully with erc20 currency in both main and extra currencies', async () => {
            const fixture = await beforePrestigePadTest({
                addSampleLaunch: true,
                addSampleRounds: true,
            });

            const { prestigePad, initiator2, depositor1, currencies, projectToken, feeReceiver, reserveVault } = fixture;

            let timestamp = await time.latest() + 100;
            await time.setNextBlockTimestamp(timestamp);

            const launchId = 2;

            const scheduleParams = {
                launchId: BigNumber.from(launchId),
                cashbackThreshold: BigNumber.from('5'),
                cashbackBaseRate: ethers.utils.parseEther("0.1"),
                cashbackCurrencies: [currencies[0].address],
                cashbackDenominations: [ethers.utils.parseEther('0.01')],
                raiseStartsAt: timestamp + 10,
                raiseDuration: Constant.PRESTIGE_PAD_RAISE_MINIMUM_DURATION + 10,
            };
            await callTransaction(prestigePad.connect(initiator2).scheduleNextRound(
                scheduleParams.launchId,
                scheduleParams.cashbackThreshold,
                scheduleParams.cashbackBaseRate,
                scheduleParams.cashbackCurrencies,
                scheduleParams.cashbackDenominations,
                scheduleParams.raiseStartsAt,
                scheduleParams.raiseDuration
            ));

            const roundId = (await prestigePad.getLaunch(launchId)).roundIds[1];
            timestamp = (await prestigePad.getRound(roundId)).agenda.raiseStartsAt;
            await time.setNextBlockTimestamp(timestamp);

            await callTransaction(prestigePad.connect(depositor1).contributeCurrentRound(launchId, 500, { value: ethers.utils.parseEther('10') }));

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

            const params = await getSafeConfirmCurrentRoundParams(prestigePad, { launchId: BigNumber.from(launchId) });
            const tx = await getSafeConfirmCurrentRoundTx(
                prestigePad,
                initiator2,
                params,
                { value: ethers.utils.parseEther('100') }
            );
            const receipt = await tx.wait();
            const gasFee = receipt.effectiveGasPrice.mul(receipt.gasUsed);

            await expect(tx).to.emit(prestigePad, 'LaunchCurrentRoundConfirmation').withArgs(
                launchId,
                roundId,
                round.quota.raisedQuantity,
                value,
                feeAmount,
                cashbackBaseAmount,
            );
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

            expect(await ethers.provider.getBalance(prestigePad.address)).to.equal(
                initPrestigePadNativeBalance
            );
            expect(await ethers.provider.getBalance(initiator2.address)).to.equal(
                initInitiator2NativeBalance.sub(gasFee)
            );
            expect(await ethers.provider.getBalance(feeReceiver.address)).to.equal(
                initFeeReceiverNativeBalance
            );
            expect(await ethers.provider.getBalance(reserveVault.address)).to.equal(
                initReserveVaultNativeBalance
            );
        });

        it('7.1.11.7. safe confirm current round unsuccessfully when contract is reentered', async () => {
            const fixture = await beforePrestigePadTest({
                addSampleLaunch: true,
                addSampleRounds: true,
                raiseFirstRound: true,
                depositFirstRound: true,
                useReentrancyERC20: true,
            });

            const { prestigePad, initiator2, reentrancyERC20 } = fixture;

            const launchId = 2;

            await testReentrancy_prestigePad(
                fixture,
                reentrancyERC20,
                async (timestamp: number) => {
                    const params = await getSafeConfirmCurrentRoundParams(prestigePad, { launchId: BigNumber.from(launchId) });
                    await expect(getSafeConfirmCurrentRoundTx(
                        prestigePad,
                        initiator2,
                        params,
                        { value: ethers.utils.parseEther('100') }
                    )).to.be.revertedWith('ReentrancyGuard: reentrant call');
                }
            )
        });

        it('7.1.11.8. safe confirm current round unsuccessfully with invalid launch id', async () => {
            const fixture = await beforePrestigePadTest();

            const { prestigePad, initiator1 } = fixture;

            const params1 = {
                launchId: BigNumber.from(0),
                anchor: ethers.utils.keccak256(ethers.utils.toUtf8Bytes('invalid anchor')),
            }
            await expect(getSafeConfirmCurrentRoundTx(
                prestigePad,
                initiator1,
                params1,
                { value: ethers.utils.parseEther('100') }
            )).to.be.revertedWithCustomError(prestigePad, 'InvalidLaunchId');

            const params2 = {
                launchId: BigNumber.from(100),
                anchor: ethers.utils.keccak256(ethers.utils.toUtf8Bytes('invalid anchor')),
            }
            await expect(getSafeConfirmCurrentRoundTx(
                prestigePad,
                initiator1,
                params2,
                { value: ethers.utils.parseEther('100') }
            )).to.be.revertedWithCustomError(prestigePad, 'InvalidLaunchId');
        });

        it('7.1.11.9. safe confirm current round unsuccessfully when sender is not launch initiator', async () => {
            const fixture = await beforePrestigePadTest({
                addSampleLaunch: true,
                addSampleRounds: true,
                raiseFirstRound: true,
                depositFirstRound: true,
            });

            const { prestigePad, manager, initiator1 } = fixture;

            const params1 = await getSafeConfirmCurrentRoundParams(prestigePad, { launchId: BigNumber.from(1) });
            await expect(getSafeConfirmCurrentRoundTx(
                prestigePad,
                manager,
                params1,
                { value: ethers.utils.parseEther('100') }
            )).to.be.revertedWithCustomError(prestigePad, 'Unauthorized');

            const params2 = await getSafeConfirmCurrentRoundParams(prestigePad, { launchId: BigNumber.from(2) });
            await expect(getSafeConfirmCurrentRoundTx(
                prestigePad,
                initiator1,
                params2,
                { value: ethers.utils.parseEther('100') }
            )).to.be.revertedWithCustomError(prestigePad, 'Unauthorized');
        });

        it('7.1.11.10. safe confirm current round unsuccessfully when paused', async () => {
            const fixture = await beforePrestigePadTest({
                addSampleLaunch: true,
                addSampleRounds: true,
                raiseFirstRound: true,
                depositFirstRound: true,
                pause: true,
            });

            const { prestigePad, initiator1 } = fixture;

            const params = await getSafeConfirmCurrentRoundParams(prestigePad, { launchId: BigNumber.from(1) });
            await expect(getSafeConfirmCurrentRoundTx(
                prestigePad,
                initiator1,
                params,
                { value: ethers.utils.parseEther('100') }
            )).to.be.revertedWith('Pausable: paused');
        });

        it('7.1.11.11. safe confirm current round unsuccessfully when launch is finalized', async () => {
            const fixture = await beforePrestigePadTest({
                addSampleLaunch: true,
                addSampleRounds: true,
                doAllFirstFound: true,
                doAllSecondFound: true,
                finalizeLaunch: true,
            });

            const { prestigePad, initiator1 } = fixture;

            const params = await getSafeConfirmCurrentRoundParams(prestigePad, { launchId: BigNumber.from(1) });
            await expect(getSafeConfirmCurrentRoundTx(
                prestigePad,
                initiator1,
                params,
                { value: ethers.utils.parseEther('100') }
            )).to.be.revertedWithCustomError(prestigePad, 'AlreadyFinalized');
        });

        it('7.1.11.12. safe confirm current round unsuccessfully when round is confirmed', async () => {
            const fixture = await beforePrestigePadTest({
                addSampleLaunch: true,
                addSampleRounds: true,
                raiseFirstRound: true,
                depositFirstRound: true,
                confirmFirstRound: true,
            });

            const { prestigePad, initiator1 } = fixture;

            const params = await getSafeConfirmCurrentRoundParams(prestigePad, { launchId: BigNumber.from(1) });
            await expect(getSafeConfirmCurrentRoundTx(
                prestigePad,
                initiator1,
                params,
                { value: ethers.utils.parseEther('100') }
            )).to.be.revertedWithCustomError(prestigePad, 'AlreadyConfirmed');
        });

        it('7.1.11.13. safe confirm current round unsuccessfully when confirm time limit is overdue', async () => {
            const fixture = await beforePrestigePadTest({
                addSampleLaunch: true,
                addSampleRounds: true,
                raiseFirstRound: true,
                depositFirstRound: true,
            });

            const { prestigePad, initiator1 } = fixture;

            const launchId = 1;
            const roundId = (await prestigePad.getLaunch(launchId)).roundIds[1];

            let confirmDue = (await prestigePad.getRound(roundId)).agenda.raiseEndsAt + Constant.PRESTIGE_PAD_RAISE_CONFIRMATION_TIME_LIMIT;

            await time.setNextBlockTimestamp(confirmDue);

            const params = await getSafeConfirmCurrentRoundParams(prestigePad, { launchId: BigNumber.from(launchId) });
            await expect(getSafeConfirmCurrentRoundTx(
                prestigePad,
                initiator1,
                params,
                { value: ethers.utils.parseEther('100') }
            )).to.be.revertedWithCustomError(prestigePad, 'Timeout');

            await time.setNextBlockTimestamp(confirmDue + 5);

            await expect(getSafeConfirmCurrentRoundTx(
                prestigePad,
                initiator1,
                params,
                { value: ethers.utils.parseEther('100') }
            )).to.be.revertedWithCustomError(prestigePad, 'Timeout');
        });

        it('7.1.11.14. safe confirm current round unsuccessfully when sold quantity is not enough', async () => {
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

            const params1 = await getSafeConfirmCurrentRoundParams(prestigePad, { launchId: BigNumber.from(launchId) });
            await expect(getSafeConfirmCurrentRoundTx(
                prestigePad,
                initiator1,
                params1,
                { value: ethers.utils.parseEther('100') }
            )).to.be.revertedWithCustomError(prestigePad, 'NotEnoughSoldQuantity');

            // Just enough sold quantity
            await callTransaction(prestigePad.connect(depositor1).contributeCurrentRound(
                1,
                minRaisingQuantity,
                { value: ethers.utils.parseEther('100') }
            ));

            const params2 = await getSafeConfirmCurrentRoundParams(prestigePad, { launchId: BigNumber.from(launchId) });
            await expect(getSafeConfirmCurrentRoundTx(
                prestigePad,
                initiator1,
                params2,
                { value: ethers.utils.parseEther('100') }
            )).to.be.not.reverted;
        });

        it('7.1.11.15. safe confirm current round unsuccessfully when sending native token to initiator failed', async () => {
            const fixture = await beforePrestigePadTest({
                addSampleLaunch: true,
                addSampleRounds: true,
                raiseFirstRound: true,
                depositFirstRound: true,
                useFailReceiverAsInitiator: true,
            });

            const { prestigePad, failReceiver } = fixture;

            await callTransaction(failReceiver.activate(true));

            const params = await getSafeConfirmCurrentRoundParams(prestigePad, { launchId: BigNumber.from(1) });
            await expect(getCallSafeConfirmCurrentRoundTx(
                prestigePad,
                failReceiver,
                params,
                { value: ethers.utils.parseEther('100') }
            )).to.be.revertedWithCustomError(prestigePad, 'FailedTransfer');
        });

        it('7.1.11.16. safe confirm current round unsuccessfully when provide fund failed', async () => {
            const fixture = await beforePrestigePadTest({
                addSampleLaunch: true,
                addSampleRounds: true,
                raiseFirstRound: true,
                depositFirstRound: true,
            });

            const { deployer, prestigePad, initiator1, reserveVault, admin, admins } = fixture;

            await callPausable_Pause(reserveVault as any, deployer, admins, admin);

            const params = await getSafeConfirmCurrentRoundParams(prestigePad, { launchId: BigNumber.from(1) });
            await expect(getSafeConfirmCurrentRoundTx(
                prestigePad,
                initiator1,
                params,
                { value: ethers.utils.parseEther('100') }
            )).to.be.revertedWith('Pausable: paused');
        });
    });

    describe('7.1.12. finalize(uint256)', async () => {
        it('7.1.12.1. finalize launch successfully', async () => {
            const fixture = await beforePrestigePadTest({
                addSampleLaunch: true,
                addSampleRounds: true,
                doAllFirstFound: true,
                doAllSecondFound: true,
            });

            const { prestigePad, initiator1 } = fixture;

            const launchId = 1;

            const params = await getSafeFinalizeLaunchParams(prestigePad, { launchId: BigNumber.from(launchId) });
            const tx = await getSafeFinalizeLaunchTx(
                prestigePad,
                initiator1,
                params,
            );
            await expect(tx).to.emit(prestigePad, 'LaunchFinalization').withArgs(launchId);

            const launchAfter = await prestigePad.getLaunch(launchId);
            expect(launchAfter.isFinalized).to.be.true;
        });

        it('7.1.12.2. finalize launch unsuccessfully with invalid launch id', async () => {
            const fixture = await beforePrestigePadTest();

            const { prestigePad, initiator1 } = fixture;

            const params1 = {
                launchId: BigNumber.from(0),
                anchor: ethers.utils.keccak256(ethers.utils.toUtf8Bytes('invalid anchor')),
            }
            await expect(getSafeFinalizeLaunchTx(
                prestigePad,
                initiator1,
                params1,
            )).to.be.revertedWithCustomError(prestigePad, 'InvalidLaunchId');

            const params2 = {
                launchId: BigNumber.from(100),
                anchor: ethers.utils.keccak256(ethers.utils.toUtf8Bytes('invalid anchor')),
            }
            await expect(getSafeFinalizeLaunchTx(
                prestigePad,
                initiator1,
                params2,
            )).to.be.revertedWithCustomError(prestigePad, 'InvalidLaunchId');
        });

        it('7.1.12.3. finalize launch unsuccessfully when sender is not launch initiator', async () => {
            const fixture = await beforePrestigePadTest({
                addSampleLaunch: true,
                addSampleRounds: true,
                doAllFirstFound: true,
                doAllSecondFound: true,
            });

            const { prestigePad, manager, initiator1 } = fixture;

            // By manager
            const params1 = await getSafeFinalizeLaunchParams(prestigePad, { launchId: BigNumber.from(1) });
            await expect(getSafeFinalizeLaunchTx(
                prestigePad,
                manager,
                params1,
            )).to.be.revertedWithCustomError(prestigePad, 'Unauthorized');

            // By wrong initiator
            const params2 = await getSafeFinalizeLaunchParams(prestigePad, { launchId: BigNumber.from(2) });
            await expect(getSafeFinalizeLaunchTx(
                prestigePad,
                initiator1,
                params2,
            )).to.be.revertedWithCustomError(prestigePad, 'Unauthorized');
        });

        it('7.1.12.4. finalize launch unsuccessfully when paused', async () => {
            const fixture = await beforePrestigePadTest({
                addSampleLaunch: true,
                addSampleRounds: true,
                doAllFirstFound: true,
                doAllSecondFound: true,
                pause: true,
            });

            const { prestigePad, initiator1 } = fixture;

            const params = await getSafeFinalizeLaunchParams(prestigePad, { launchId: BigNumber.from(1) });
            await expect(getSafeFinalizeLaunchTx(
                prestigePad,
                initiator1,
                params,
            )).to.be.revertedWith('Pausable: paused');
        });

        it('7.1.12.5. finalize launch unsuccessfully when launch is already finalized', async () => {
            const fixture = await beforePrestigePadTest({
                addSampleLaunch: true,
                addSampleRounds: true,
                doAllFirstFound: true,
                doAllSecondFound: true,
                finalizeLaunch: true,
            });

            const { prestigePad, initiator1 } = fixture;

            const params = await getSafeFinalizeLaunchParams(prestigePad, { launchId: BigNumber.from(1) });
            await expect(getSafeFinalizeLaunchTx(
                prestigePad,
                initiator1,
                params,
            )).to.be.revertedWithCustomError(prestigePad, 'AlreadyFinalized');
        });
        
        it('7.1.12.6. finalize launch unsuccessfully when there are more round to raise', async () => {
            const fixture = await beforePrestigePadTest({
                addSampleLaunch: true,
                addSampleRounds: true,
                doAllFirstFound: true,
            });

            const { prestigePad, initiator1 } = fixture;

            const params = await getSafeFinalizeLaunchParams(prestigePad, { launchId: BigNumber.from(1) });
            await expect(getSafeFinalizeLaunchTx(
                prestigePad,
                initiator1,
                params,
            )).to.be.revertedWithCustomError(prestigePad, 'InvalidFinalizing');
        });

        it('7.1.12.7. finalize launch unsuccessfully when current round is not confirmed', async () => {
            const fixture = await beforePrestigePadTest({
                addSampleLaunch: true,
                addSampleRounds: true,
                doAllFirstFound: true,
                raiseSecondRound: true,
            });

            const { prestigePad, initiator1 } = fixture;

            const params = await getSafeFinalizeLaunchParams(prestigePad, { launchId: BigNumber.from(1) });
            await expect(getSafeFinalizeLaunchTx(
                prestigePad,
                initiator1,
                params,
            )).to.be.revertedWithCustomError(prestigePad, 'InvalidFinalizing');
        });
    });

    describe('7.1.13. contributeCurrentRound(uint256, uint256)', async () => {
        it('7.1.13.1. deposit current round successfully with native currency', async () => {
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

            const tx1 = await prestigePad.connect(depositor1).contributeCurrentRound(
                launchId,
                quantity1,
                { value: value1 }
            );
            const receipt1 = await tx1.wait();
            const gasFee1 = receipt1.effectiveGasPrice.mul(receipt1.gasUsed);

            await expect(tx1).to.emit(prestigePad, 'Contribution').withArgs(
                launchId,
                roundId,
                depositor1.address,
                quantity1,
                value1
            );
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

            const tx2 = await prestigePad.connect(depositor2).contributeCurrentRound(
                launchId,
                quantity2,
                { value: value2.add(ethers.utils.parseEther('1')) }
            );
            const receipt2 = await tx2.wait();
            const gasFee2 = receipt2.effectiveGasPrice.mul(receipt2.gasUsed);

            await expect(tx2).to.emit(prestigePad, 'Contribution').withArgs(
                launchId,
                roundId,
                depositor2.address,
                quantity2,
                value2
            );
            await expect(tx2).to.not.emit(reserveVault, 'FundExpansion');

            expect(await ethers.provider.getBalance(depositor2.address)).to.equal(
                initDepositor2NativeBalance.sub(gasFee2).sub(value2)
            );
            expect(await ethers.provider.getBalance(prestigePad.address)).to.equal(
                initPrestigePadNativeBalance.add(value2)
            );

            const roundAfter2 = await prestigePad.getRound(roundId);
            expect(roundAfter2.quota.raisedQuantity).to.equal(roundBefore.quota.raisedQuantity.add(quantity1 + quantity2));

            expect(await prestigePad.contributions(roundId, depositor2.address)).to.equal(quantity2);

            expect((await reserveVault.getFund(fundId)).quantity).to.equal(0);

            // Tx3: Depositor 1, fund expanded (2 + 5 = 7)

            const quantity3 = 5;
            const value3 = roundBefore.quote.unitPrice.mul(quantity3);

            initDepositor1NativeBalance = await ethers.provider.getBalance(depositor1.address);
            initPrestigePadNativeBalance = await ethers.provider.getBalance(prestigePad.address);

            const tx3 = await prestigePad.connect(depositor1).contributeCurrentRound(
                launchId,
                quantity3,
                { value: value3 }
            );
            const receipt3 = await tx3.wait();
            const gasFee3 = receipt3.effectiveGasPrice.mul(receipt3.gasUsed);

            await expect(tx3).to.emit(prestigePad, 'Contribution').withArgs(
                launchId,
                roundId,
                depositor1.address,
                quantity3,
                value3
            );
            await expect(tx3).to.emit(reserveVault, 'FundExpansion').withArgs(
                fundId,
                quantity1 + quantity3,
            );

            expect(await ethers.provider.getBalance(depositor1.address)).to.equal(
                initDepositor1NativeBalance.sub(gasFee3).sub(value3)
            );
            expect(await ethers.provider.getBalance(prestigePad.address)).to.equal(
                initPrestigePadNativeBalance.add(value3)
            );

            const roundAfter3 = await prestigePad.getRound(roundId);
            expect(roundAfter3.quota.raisedQuantity).to.equal(roundBefore.quota.raisedQuantity.add(quantity1 + quantity2 + quantity3));

            expect(await prestigePad.contributions(roundId, depositor1.address)).to.equal(quantity1 + quantity3);

            expect((await reserveVault.getFund(fundId)).quantity).to.equal(quantity1 + quantity3);

            // Tx4: Depositor 1 again. Fund expanded (7 + 8 = 15)

            const quantity4 = 8;
            const value4 = roundBefore.quote.unitPrice.mul(quantity4);

            initDepositor1NativeBalance = await ethers.provider.getBalance(depositor1.address);
            initPrestigePadNativeBalance = await ethers.provider.getBalance(prestigePad.address);

            const tx4 = await prestigePad.connect(depositor1).contributeCurrentRound(
                launchId,
                quantity4,
                { value: value4 }
            );
            const receipt4 = await tx4.wait();
            const gasFee4 = receipt4.effectiveGasPrice.mul(receipt4.gasUsed);

            await expect(tx4).to.emit(prestigePad, 'Contribution').withArgs(
                launchId,
                roundId,
                depositor1.address,
                quantity4,
                value4
            );
            await expect(tx4).to.emit(reserveVault, 'FundExpansion').withArgs(
                fundId,
                quantity4,
            );

            expect(await ethers.provider.getBalance(depositor1.address)).to.equal(
                initDepositor1NativeBalance.sub(gasFee4).sub(value4)
            );
            expect(await ethers.provider.getBalance(prestigePad.address)).to.equal(
                initPrestigePadNativeBalance.add(value4)
            );

            const roundAfter4 = await prestigePad.getRound(roundId);
            expect(roundAfter4.quota.raisedQuantity).to.equal(roundBefore.quota.raisedQuantity.add(quantity1 + quantity2 + quantity3 + quantity4));

            expect(await prestigePad.contributions(roundId, depositor1.address)).to.equal(quantity1 + quantity3 + quantity4);

            expect((await reserveVault.getFund(fundId)).quantity).to.equal(quantity1 + quantity3 + quantity4);

            // Tx5: Depositor 3, exceed cashback threshold right from first deposit
            const quantity5 = 6;
            const value5 = roundBefore.quote.unitPrice.mul(quantity5);

            let initDepositor3NativeBalance = await ethers.provider.getBalance(depositor3.address);
            initPrestigePadNativeBalance = await ethers.provider.getBalance(prestigePad.address);

            const tx5 = await prestigePad.connect(depositor3).contributeCurrentRound(
                launchId,
                quantity5,
                { value: value5 }
            );
            const receipt5 = await tx5.wait();
            const gasFee5 = receipt5.effectiveGasPrice.mul(receipt5.gasUsed);

            await expect(tx5).to.emit(prestigePad, 'Contribution').withArgs(
                launchId,
                roundId,
                depositor3.address,
                quantity5,
                value5
            );
            await expect(tx5).to.emit(reserveVault, 'FundExpansion').withArgs(
                fundId,
                quantity5,
            );

            expect(await ethers.provider.getBalance(depositor3.address)).to.equal(
                initDepositor3NativeBalance.sub(gasFee5).sub(value5)
            );
            expect(await ethers.provider.getBalance(prestigePad.address)).to.equal(
                initPrestigePadNativeBalance.add(value5)
            );

            const roundAfter5 = await prestigePad.getRound(roundId);
            expect(roundAfter5.quota.raisedQuantity).to.equal(roundBefore.quota.raisedQuantity.add(quantity1 + quantity2 + quantity3 + quantity4 + quantity5));

            expect(await prestigePad.contributions(roundId, depositor3.address)).to.equal(quantity5);

            expect((await reserveVault.getFund(fundId)).quantity).to.equal(quantity1 + quantity3 + quantity4 + quantity5);            
        });

        it('7.1.13.2. deposit current round successfully with erc20 currency and no cashback', async () => {
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

            const tx = await prestigePad.connect(depositor1).contributeCurrentRound(
                launchId,
                quantity,
            );

            await expect(tx).to.emit(prestigePad, 'Contribution').withArgs(
                launchId,
                roundId,
                depositor1.address,
                quantity,
                value
            );

            expect(await currency.balanceOf(depositor1.address)).to.equal(
                initDepositor1ERC20Balance.sub(value)
            );
            expect(await currency.balanceOf(prestigePad.address)).to.equal(
                initPrestigePadERC20Balance.add(value)
            );

            const roundAfter = await prestigePad.getRound(roundId);
            expect(roundAfter.quota.raisedQuantity).to.equal(roundBefore.quota.raisedQuantity.add(quantity));

            expect(await prestigePad.contributions(roundId, depositor1.address)).to.equal(quantity);
        });

        it('7.1.13.3. deposit current round unsuccessfully with invalid launch id', async () => {
            const fixture = await beforePrestigePadTest();

            const { prestigePad, depositor1 } = fixture;
            
            await expect(prestigePad.connect(depositor1).contributeCurrentRound(0, 5))
                .to.be.revertedWithCustomError(prestigePad, 'InvalidLaunchId');
            
            await expect(prestigePad.connect(depositor1).contributeCurrentRound(100, 5))
                .to.be.revertedWithCustomError(prestigePad, 'InvalidLaunchId');
        });

        it('7.1.13.4. deposit current round unsuccessfully when contract is reentered', async () => {
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

            await testReentrancy_prestigePad(
                fixture,
                reentrancyERC20,
                async (timestamp: number) => {
                    await expect(prestigePad.connect(depositor1).contributeCurrentRound(2, 5))
                        .to.be.revertedWith('ReentrancyGuard: reentrant call');
                }
            )
        });

        it('7.1.13.5. deposit current round unsuccessfully when paused', async () => {
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

            await expect(prestigePad.connect(depositor1).contributeCurrentRound(
                1,
                5,
                { value: ethers.utils.parseEther('100') }
            )).to.be.revertedWith('Pausable: paused');
        });

        it('7.1.13.6. deposit current round unsuccessfully when launch is finalized', async () => {
            const fixture = await beforePrestigePadTest({
                addSampleLaunch: true,
                addSampleRounds: true,
                doAllFirstFound: true,
                doAllSecondFound: true,
                finalizeLaunch: true,
            });

            const { prestigePad, depositor1 } = fixture;

            await expect(prestigePad.connect(depositor1).contributeCurrentRound(
                1,
                5,
                { value: ethers.utils.parseEther('100') }
            )).to.be.revertedWithCustomError(prestigePad, 'AlreadyFinalized');
        });

        it('7.1.13.7. deposit current round unsuccessfully when current round is confirmed', async () => {
            const fixture = await beforePrestigePadTest({
                addSampleLaunch: true,
                addSampleRounds: true,
                raiseFirstRound: true,
                depositFirstRound: true,
                confirmFirstRound: true,
            });

            const { prestigePad, depositor1 } = fixture;

            await expect(prestigePad.connect(depositor1).contributeCurrentRound(
                1,
                5,
                { value: ethers.utils.parseEther('100') }
            )).to.be.revertedWithCustomError(prestigePad, 'AlreadyConfirmed');
        });

        it('7.1.13.8. deposit current round unsuccessfully before raise starts', async () => {
            const fixture = await beforePrestigePadTest({
                addSampleLaunch: true,
                addSampleRounds: true,
                raiseFirstRound: true,
            });

            const { prestigePad, depositor1 } = fixture;

            const roundId = (await prestigePad.getLaunch(1)).roundIds[1];
            let timestamp = (await prestigePad.getRound(roundId)).agenda.raiseStartsAt;
            await time.setNextBlockTimestamp(timestamp - 5);

            await expect(prestigePad.connect(depositor1).contributeCurrentRound(
                1,
                5,
                { value: ethers.utils.parseEther('100') }
            )).to.be.revertedWithCustomError(prestigePad, 'InvalidContributing');

            await time.setNextBlockTimestamp(timestamp);

            await expect(prestigePad.connect(depositor1).contributeCurrentRound(
                1,
                5,
                { value: ethers.utils.parseEther('100') }
            )).to.not.be.reverted;
        });

        it('7.1.13.9. deposit current round unsuccessfully after raise ends', async () => {
            const fixture = await beforePrestigePadTest({
                addSampleLaunch: true,
                addSampleRounds: true,
                raiseFirstRound: true,
            });

            const { prestigePad, depositor1 } = fixture;

            const roundId = (await prestigePad.getLaunch(1)).roundIds[1];
            let timestamp = (await prestigePad.getRound(roundId)).agenda.raiseEndsAt;
            await time.setNextBlockTimestamp(timestamp);

            await expect(prestigePad.connect(depositor1).contributeCurrentRound(
                1,
                5,
                { value: ethers.utils.parseEther('100') }
            )).to.be.revertedWithCustomError(prestigePad, 'InvalidContributing');

            await time.setNextBlockTimestamp(timestamp + 5);

            await expect(prestigePad.connect(depositor1).contributeCurrentRound(
                1,
                5,
                { value: ethers.utils.parseEther('100') }
            )).to.be.revertedWithCustomError(prestigePad, 'InvalidContributing');
        });

        it('7.1.13.10. deposit current round unsuccessfully when deposit quantity exceed remaining quantity', async () => {
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

            await expect(prestigePad.connect(depositor1).contributeCurrentRound(
                1,
                round.quota.maxRaisingQuantity.add(1),
                { value: ethers.utils.parseEther('100') }
            )).to.be.revertedWithCustomError(prestigePad, 'MaxRaisingQuantityExceeded');
            
            await expect(prestigePad.connect(depositor1).contributeCurrentRound(
                1,
                round.quota.maxRaisingQuantity,
                { value: ethers.utils.parseEther('100') }
            )).to.not.be.reverted;
        });

        it('7.1.13.11. deposit current round unsuccessfully when expand fund failed', async () => {
            const fixture = await beforePrestigePadTest({
                addSampleLaunch: true,
                addSampleRounds: true,
                raiseFirstRound: true,
            });

            const { deployer, prestigePad, depositor1, admin, admins, reserveVault } = fixture;

            await callPausable_Pause(reserveVault as any, deployer, admins, admin);

            const roundId = (await prestigePad.getLaunch(1)).roundIds[1];
            const round = await prestigePad.getRound(roundId);
            let timestamp = round.agenda.raiseStartsAt;
            await time.setNextBlockTimestamp(timestamp);

            await expect(prestigePad.connect(depositor1).contributeCurrentRound(
                1,
                10,
                { value: ethers.utils.parseEther('100') }
            )).to.be.revertedWith('Pausable: paused');
        });
    });

    describe('7.1.14. safeContributeCurrentRound(uint256, uint256, bytes32)', async () => {
        it('7.1.14.1. safe deposit current round successfully', async () => {
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

            const anchor = ethers.utils.solidityKeccak256(
                ["string"],
                [(await prestigePad.getLaunch(launchId)).uri]
            );

            const tx = await prestigePad.connect(depositor1).safeContributeCurrentRound(
                launchId,
                quantity,
                anchor,
            );

            await expect(tx).to.emit(prestigePad, 'Contribution').withArgs(
                launchId,
                roundId,
                depositor1.address,
                quantity,
                value
            );

            expect(await currency.balanceOf(depositor1.address)).to.equal(
                initDepositor1ERC20Balance.sub(value)
            );
            expect(await currency.balanceOf(prestigePad.address)).to.equal(
                initPrestigePadERC20Balance.add(value)
            );

            const roundAfter = await prestigePad.getRound(roundId);
            expect(roundAfter.quota.raisedQuantity).to.equal(roundBefore.quota.raisedQuantity.add(quantity));

            expect(await prestigePad.contributions(roundId, depositor1.address)).to.equal(quantity);
        });

        it('7.1.14.2. safe deposit current round unsuccessfully with invalid launch id', async () => {
            const fixture = await beforePrestigePadTest();

            const { prestigePad, depositor1 } = fixture;

            await expect(prestigePad.connect(depositor1).safeContributeCurrentRound(
                0,
                5,
                ethers.utils.keccak256(ethers.utils.toUtf8Bytes(''))
            )).to.be.revertedWithCustomError(prestigePad, 'InvalidLaunchId');

            await expect(prestigePad.connect(depositor1).safeContributeCurrentRound(
                100,
                5,
                ethers.utils.keccak256(ethers.utils.toUtf8Bytes(''))
            )).to.be.revertedWithCustomError(prestigePad, 'InvalidLaunchId');
        });

        it('7.1.14.3. safe deposit current round unsuccessfully with invalid anchor', async () => {
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

            await expect(prestigePad.connect(depositor1).safeContributeCurrentRound(
                launchId,
                5,
                ethers.utils.keccak256(ethers.utils.toUtf8Bytes('invalid'))
            )).to.be.revertedWithCustomError(prestigePad, 'BadAnchor');
        });
    });

    describe('7.1.15. withdrawContribution(uint256)', async () => {
        it('7.1.15.1. withdraw deposit successfully', async () => {
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

            await callTransaction(prestigePad.connect(initiator1).cancelCurrentRound(1));
            await callTransaction(prestigePad.connect(initiator2).cancelCurrentRound(2));
            
            // Tx1: Depositor1 withdraw deposit from launch 1 (native token)
            const quantity1 = await prestigePad.contributions(oldRoundId1, depositor1.address);
            const value1 = oldRound1.quote.unitPrice.mul(quantity1);

            const initDepositor1NativeBalance = await ethers.provider.getBalance(depositor1.address);
            const initPrestigePadNativeBalance = await ethers.provider.getBalance(prestigePad.address);

            const tx1 = await prestigePad.connect(depositor1).withdrawContribution(oldRoundId1);
            const receipt1 = await tx1.wait();
            const gasFee1 = receipt1.gasUsed.mul(receipt1.effectiveGasPrice);

            await expect(tx1).to.emit(prestigePad, 'ContributionWithdrawal').withArgs(
                oldRoundId1,
                depositor1.address,
                quantity1,
                value1
            );

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

            const tx2 = await prestigePad.connect(depositor2).withdrawContribution(oldRoundId2);

            await expect(tx2).to.emit(prestigePad, 'ContributionWithdrawal').withArgs(
                oldRoundId2,
                depositor2.address,
                quantity2,
                value2
            );

            expect(await prestigePad.contributions(oldRoundId2, depositor2.address)).to.equal(0);

            expect(await currency.balanceOf(depositor2.address)).to.equal(
                initDepositor2ERC20Balance.add(value2)
            );
            expect(await currency.balanceOf(prestigePad.address)).to.equal(
                initPrestigePadERC20Balance.sub(value2)
            );
        });

        it('7.1.15.2. withdraw deposit unsuccessfully when contract is reentered', async () => {
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
            
            await callTransaction(prestigePad.connect(initiator2).cancelCurrentRound(launchId));

            await testReentrancy_prestigePad(
                fixture,
                reentrancyERC20,
                async (timestamp: number) => {
                    await expect(prestigePad.connect(depositor1).withdrawContribution(oldRoundId2))
                        .to.be.revertedWith('ReentrancyGuard: reentrant call');
                }
            );
        });

        it('7.1.15.3. withdraw deposit unsuccessfully with invalid round id', async () => {
            const fixture = await beforePrestigePadTest();
            
            const { prestigePad, depositor1 } = fixture;

            await expect(prestigePad.connect(depositor1).withdrawContribution(0))
                .to.be.revertedWithCustomError(prestigePad, 'InvalidRoundId');

            await expect(prestigePad.connect(depositor1).withdrawContribution(100))
                .to.be.revertedWithCustomError(prestigePad, 'InvalidRoundId');
        });

        it('7.1.15.4. withdraw deposit unsuccessfully when paused', async () => {
            const fixture = await beforePrestigePadTest({
                addSampleLaunch: true,
                addSampleRounds: true,
                raiseFirstRound: true,
                depositFirstRound: true,
            });

            const { deployer, prestigePad, depositor1, initiator1, admin, admins } = fixture;

            const oldRoundId = (await prestigePad.getLaunch(1)).roundIds[1];

            await callTransaction(prestigePad.connect(initiator1).cancelCurrentRound(1));

            await callPausable_Pause(prestigePad, deployer, admins, admin);

            await expect(prestigePad.connect(depositor1).withdrawContribution(oldRoundId))
                .to.be.revertedWith('Pausable: paused'); 
        });

        it('7.1.15.5. withdraw deposit unsuccessfully when round is confirmed', async () => {
            const fixture = await beforePrestigePadTest({
                addSampleLaunch: true,
                addSampleRounds: true,
                raiseFirstRound: true,
                depositFirstRound: true,
                confirmFirstRound: true,
            });

            const { prestigePad, depositor1 } = fixture;

            const roundId = (await prestigePad.getLaunch(1)).roundIds[1];

            await expect(prestigePad.connect(depositor1).withdrawContribution(roundId))
                .to.be.revertedWithCustomError(prestigePad, 'AlreadyConfirmed');
        });

        it('7.1.15.6. withdraw deposit unsuccessfully when raising is not ended', async () => {
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
            await expect(prestigePad.connect(depositor1).withdrawContribution(roundId))
                .to.be.revertedWithCustomError(prestigePad, 'StillRaising');
        });

        it('7.1.15.7. withdraw deposit unsuccessfully when sold quantity is enough and confirm time limit is not overdue', async () => {
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
            await expect(prestigePad.connect(depositor1).withdrawContribution(roundId))
                .to.be.revertedWithCustomError(prestigePad, 'InvalidWithdrawing');
        });

        it('7.1.15.8. withdraw deposit successfully when confirm time limit is overdue', async () => {
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
            await expect(prestigePad.connect(depositor1).withdrawContribution(roundId))
                .to.not.be.reverted;
        });

        it('7.1.15.9. withdraw deposit successfully when sold quantity is not enough', async () => {
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

            await callTransaction(prestigePad.connect(depositor1).contributeCurrentRound(
                launchId,
                quantity,
                { value: round.quote.unitPrice.mul(quantity) }
            ));

            await time.setNextBlockTimestamp(round.agenda.raiseEndsAt);

            await expect(prestigePad.connect(depositor1).withdrawContribution(roundId))
                .to.not.be.reverted;
        });

        it('7.1.15.10. withdraw deposit unsuccessfully when not deposited', async () => {
            const fixture = await beforePrestigePadTest({
                addSampleLaunch: true,
                addSampleRounds: true,
                raiseFirstRound: true,
            });

            const { prestigePad, depositor1, initiator1 } = fixture;

            const roundId = (await prestigePad.getLaunch(1)).roundIds[1];

            await callTransaction(prestigePad.connect(initiator1).cancelCurrentRound(1));

            await expect(prestigePad.connect(depositor1).withdrawContribution(roundId))
                .to.be.revertedWithCustomError(prestigePad, 'NothingToWithdraw');
        });

        it('7.1.15.11. withdraw deposit unsuccessfully when already withdrawn', async () => {
            const fixture = await beforePrestigePadTest({
                addSampleLaunch: true,
                addSampleRounds: true,
                raiseFirstRound: true,
                depositFirstRound: true,
            });

            const { prestigePad, depositor1, initiator1 } = fixture;

            const roundId = (await prestigePad.getLaunch(1)).roundIds[1];

            await callTransaction(prestigePad.connect(initiator1).cancelCurrentRound(1));

            await callTransaction(prestigePad.connect(depositor1).withdrawContribution(roundId));

            await expect(prestigePad.connect(depositor1).withdrawContribution(roundId))
                .to.be.revertedWithCustomError(prestigePad, 'NothingToWithdraw');
        });

        it('7.1.15.12. withdraw deposit unsuccessfully when sending native token to user failed', async () => {
            const fixture = await beforePrestigePadTest({
                addSampleLaunch: true,
                addSampleRounds: true,
                raiseFirstRound: true,
            });

            const { prestigePad, initiator1, failReceiver, deployer } = fixture;

            await prepareNativeToken(
                ethers.provider,
                deployer,
                [failReceiver],
                ethers.utils.parseEther('1000'),
            );

            const launchId = 1;
            const roundId = (await prestigePad.getLaunch(launchId)).roundIds[1];
            const round = await prestigePad.getRound(roundId);
            let timestamp = round.agenda.raiseStartsAt;
            await time.setNextBlockTimestamp(timestamp);

            const quantity = 10;

            await callTransaction(failReceiver.call(
                prestigePad.address,
                prestigePad.interface.encodeFunctionData('contributeCurrentRound', [
                    launchId,
                    quantity,
                ]),
                { value: round.quote.unitPrice.mul(quantity) }
            ));

            await callTransaction(prestigePad.connect(initiator1).cancelCurrentRound(1));

            await callTransaction(failReceiver.activate(true));

            await expect(failReceiver.call(
                prestigePad.address,
                prestigePad.interface.encodeFunctionData('withdrawContribution', [roundId])
            )).to.be.revertedWithCustomError(prestigePad, 'FailedTransfer');
        });
    });

    describe('7.1.16. withdrawProjectToken(uint256, uint256)', async () => {
        it('7.1.16.1. withdraw project token successfully with native token when qualified for cashback', async () => {
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

            let timestamp = await time.latest() + 100;
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

            const tx = await prestigePad.connect(depositor3).withdrawProjectToken(launchId, index);
            const receipt = await tx.wait();
            const gasFee = receipt.gasUsed.mul(receipt.effectiveGasPrice);

            await expect(tx).to.emit(prestigePad, 'ProjectTokenWithdrawal').withArgs(
                launchId,
                roundId,
                depositor3.address,
                amount
            );
            await expect(tx).to.emit(reserveVault, 'FundWithdrawal').withArgs(
                fundId,
                depositor3.address,
                quantity
            );

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
            expect(await ethers.provider.getBalance(prestigePad.address)).to.equal(
                initPrestigePadNativeBalance
            );
            expect(await ethers.provider.getBalance(reserveVault.address)).to.equal(
                initReserveVaultNativeBalance.sub(mainCashback)
            );

            expect(await currencies[0].balanceOf(depositor3.address)).to.equal(
                initDepositor3Currency0Balance.add(currency0Cashback)
            );
            expect(await currencies[0].balanceOf(prestigePad.address)).to.equal(
                initPrestigePadCurrency0Balance
            );
            expect(await currencies[0].balanceOf(reserveVault.address)).to.equal(
                initReserveVaultCurrency0Balance.sub(currency0Cashback)
            );

            expect(await currencies[1].balanceOf(depositor3.address)).to.equal(
                initDepositor3Currency1Balance.add(currency1Cashback)
            );
            expect(await currencies[1].balanceOf(prestigePad.address)).to.equal(
                initPrestigePadCurrency1Balance
            );
            expect(await currencies[1].balanceOf(reserveVault.address)).to.equal(
                initReserveVaultCurrency1Balance.sub(currency1Cashback)
            );
        });

        it('7.1.16.2. withdraw project token successfully with native token when not qualified for cashback', async () => {
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
            const fundId = (await prestigePad.getRound(roundId)).quote.cashbackFundId;
            const fund = await reserveVault.getFund(fundId);

            let timestamp = await time.latest() + 100;
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

            const tx = await prestigePad.connect(depositor1).withdrawProjectToken(launchId, index);
            const receipt = await tx.wait();
            const gasFee = receipt.gasUsed.mul(receipt.effectiveGasPrice);

            await expect(tx).to.emit(prestigePad, 'ProjectTokenWithdrawal').withArgs(
                launchId,
                roundId,
                depositor1.address,
                amount
            );
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
            expect(await ethers.provider.getBalance(prestigePad.address)).to.equal(
                initPrestigePadNativeBalance
            );
            expect(await ethers.provider.getBalance(reserveVault.address)).to.equal(
                initReserveVaultNativeBalance
            );

            expect(await currencies[0].balanceOf(depositor1.address)).to.equal(
                initDepositor1Currency0Balance
            );
            expect(await currencies[0].balanceOf(prestigePad.address)).to.equal(
                initPrestigePadCurrency0Balance
            );
            expect(await currencies[0].balanceOf(reserveVault.address)).to.equal(
                initReserveVaultCurrency0Balance
            );

            expect(await currencies[1].balanceOf(depositor1.address)).to.equal(
                initDepositor1Currency1Balance
            );
            expect(await currencies[1].balanceOf(prestigePad.address)).to.equal(
                initPrestigePadCurrency1Balance
            );
            expect(await currencies[1].balanceOf(reserveVault.address)).to.equal(
                initReserveVaultCurrency1Balance
            );
        });

        it('7.1.16.3. withdraw project token successfully with erc20 without cashback', async () => {
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

            let timestamp = await time.latest() + 100;
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

            const tx = await prestigePad.connect(depositor1).withdrawProjectToken(launchId, index);
            const receipt = await tx.wait();
            const gasFee = receipt.gasUsed.mul(receipt.effectiveGasPrice);

            await expect(tx).to.emit(prestigePad, 'ProjectTokenWithdrawal').withArgs(
                launchId,
                roundId,
                depositor1.address,
                amount
            );
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
            expect(await ethers.provider.getBalance(prestigePad.address)).to.equal(
                initPrestigePadNativeBalance
            );
            expect(await ethers.provider.getBalance(reserveVault.address)).to.equal(
                initReserveVaultNativeBalance
            );

            expect(await currencies[0].balanceOf(depositor1.address)).to.equal(
                initDepositor1Currency0Balance
            );
            expect(await currencies[0].balanceOf(prestigePad.address)).to.equal(
                initPrestigePadCurrency0Balance
            );
            expect(await currencies[0].balanceOf(reserveVault.address)).to.equal(
                initReserveVaultCurrency0Balance
            );
        });

        it('7.1.16.4. withdraw zero project token when user not deposited', async () => {
            const fixture = await beforePrestigePadTest({
                addSampleLaunch: true,
                addSampleRounds: true,
                doAllFirstFound: true,
            });

            const { prestigePad, initiator2, projectToken, reserveVault } = fixture;

            const launchId = 1;
            const index = 1;

            let timestamp = await time.latest() + 100;
            await time.setNextBlockTimestamp(timestamp);

            const roundId = (await prestigePad.getLaunch(launchId)).roundIds[index];

            const initInitiator2ProjectBalance = await projectToken.balanceOf(initiator2.address, launchId);
            const initPrestigePadProjectBalance = await projectToken.balanceOf(prestigePad.address, launchId);

            const initInitiator2NativeBalance = await ethers.provider.getBalance(initiator2.address);
            const initPrestigePadNativeBalance = await ethers.provider.getBalance(prestigePad.address);
            const initReserveVaultNativeBalance = await ethers.provider.getBalance(reserveVault.address);
            
            const tx = await prestigePad.connect(initiator2).withdrawProjectToken(launchId, index);
            const receipt = await tx.wait();
            const gasFee = receipt.gasUsed.mul(receipt.effectiveGasPrice);

            await expect(tx).to.emit(prestigePad, 'ProjectTokenWithdrawal').withArgs(
                launchId,
                roundId,
                initiator2.address,
                0
            );
            await expect(tx).to.not.emit(reserveVault, 'FundWithdrawal');

            expect(await prestigePad.contributions(roundId, initiator2.address)).to.equal(0);
            expect(await prestigePad.withdrawAt(roundId, initiator2.address)).to.equal(timestamp);

            expect(await projectToken.balanceOf(initiator2.address, launchId)).to.equal(
                initInitiator2ProjectBalance
            );
            expect(await projectToken.balanceOf(prestigePad.address, launchId)).to.equal(
                initPrestigePadProjectBalance
            );

            expect(await ethers.provider.getBalance(initiator2.address)).to.equal(
                initInitiator2NativeBalance.sub(gasFee)
            );
            expect(await ethers.provider.getBalance(prestigePad.address)).to.equal(
                initPrestigePadNativeBalance
            );
            expect(await ethers.provider.getBalance(reserveVault.address)).to.equal(
                initReserveVaultNativeBalance
            );
        });

        it('7.1.16.5. withdraw project token unsuccessfully when contract is reentered', async () => {
            const fixture = await beforePrestigePadTest({
                addSampleLaunch: true,
                addSampleRounds: true,
                doAllFirstFound: true,
                useReentrancyERC20: true,
            });

            const { prestigePad, depositor3, reentrancyERC20 } = fixture;

            const launchId = 1;
            const index = 1;

            await testReentrancy_prestigePad(
                fixture,
                reentrancyERC20,
                async (timestamp: number) => {
                    await expect(prestigePad.connect(depositor3).withdrawProjectToken(launchId, index))
                        .to.be.revertedWith('ReentrancyGuard: reentrant call');
                }
            );
        });

        it('7.1.16.6. withdraw project token unsuccessfully with invalid launch id', async () => {
            const fixture = await beforePrestigePadTest();

            const { prestigePad, depositor1 } = fixture;

            await expect(prestigePad.connect(depositor1).withdrawProjectToken(0, 1))
                .to.be.revertedWithCustomError(prestigePad, 'InvalidLaunchId');

            await expect(prestigePad.connect(depositor1).withdrawProjectToken(1, 0))
                .to.be.revertedWithCustomError(prestigePad, 'InvalidLaunchId');
        });

        it('7.1.16.7. withdraw project token unsuccessfully when paused', async () => {
            const fixture = await beforePrestigePadTest({
                addSampleLaunch: true,
                addSampleRounds: true,
                doAllFirstFound: true,
                pause: true,
            });

            const { prestigePad, depositor1 } = fixture;

            await expect(prestigePad.connect(depositor1).withdrawProjectToken(1, 1))
                .to.be.revertedWith('Pausable: paused');
        });

        it('7.1.16.8. withdraw project token unsuccessfully with invalid round index', async () => {
            const fixture = await beforePrestigePadTest({
                addSampleLaunch: true,
                addSampleRounds: true,
                doAllFirstFound: true,
            });

            const { prestigePad, depositor1 } = fixture;

            const currentIndex = (await prestigePad.getLaunch(1)).currentIndex;

            await expect(prestigePad.connect(depositor1).withdrawProjectToken(1, currentIndex.add(1)))
                .to.be.revertedWithCustomError(prestigePad, 'InvalidInput');
        });

        it('7.1.16.9. withdraw project token unsuccessfully when round is not confirmed', async () => {
            const fixture = await beforePrestigePadTest({
                addSampleLaunch: true,
                addSampleRounds: true,
                raiseFirstRound: true,
                depositFirstRound: true,
            });

            const { prestigePad, depositor1 } = fixture;

            const launchId = 1;
            const index = 1;

            await expect(prestigePad.connect(depositor1).withdrawProjectToken(launchId, index))
                .to.be.revertedWithCustomError(prestigePad, 'NotConfirmed');
        });

        it('7.1.16.10. withdraw project token unsuccessfully when user already withdrawn project token', async () => {
            const fixture = await beforePrestigePadTest({
                addSampleLaunch: true,
                addSampleRounds: true,
                doAllFirstFound: true,
            });

            const { prestigePad, depositor1 } = fixture;

            const launchId = 1;
            const index = 1;

            await callTransaction(prestigePad.connect(depositor1).withdrawProjectToken(launchId, index));

            await expect(prestigePad.connect(depositor1).withdrawProjectToken(launchId, index))
                .to.be.revertedWithCustomError(prestigePad, 'AlreadyWithdrawn');
        });

        it('7.1.16.11. withdraw project token unsuccessfully when withdraw fund failed', async () => {
            const fixture = await beforePrestigePadTest({
                addSampleLaunch: true,
                addSampleRounds: true,
                doAllFirstFound: true,
            });

            const { deployer, prestigePad, depositor3, admins, admin, reserveVault } = fixture;

            await callPausable_Pause(reserveVault as any, deployer, admins, admin);

            const launchId = 1;
            const index = 1;

            await expect(prestigePad.connect(depositor3).withdrawProjectToken(launchId, index))
                .to.be.revertedWith('Pausable: paused');
        });
    });

    describe('7.1.17. allocationOfAt(uint256)', async () => {
        it('7.1.17.1. return correct allocation', async () => {
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
            
            let timestamp = await time.latest() + 100;
            const baseTimestamp = timestamp;

            async function assertCorrectAllocation(currentTimestamp: number) {
                for (const timestamp of timePivots) {
                    if (timestamp > currentTimestamp) {
                        break;
                    }
                    console.log(`delta timestamp: ${timestamp - baseTimestamp}`);
                    console.log(`expected allocation: ${expectedAllocations.get(timestamp)}`);
                    console.log(`actual allocation: ${await prestigePad.allocationOfAt(depositor.address, launchId, timestamp)}`);
                    expect(await prestigePad.allocationOfAt(depositor.address, launchId, timestamp))
                        .to.equal(expectedAllocations.get(timestamp));
                }
            }

            // Test after round 1 start
            await callTransactionAtTimestamp(
                prestigePad.connect(initiator1).scheduleNextRound(
                    launchId,
                    BigNumber.from(0),
                    BigNumber.from(0),
                    [],
                    [],
                    timestamp,
                    Constant.PRESTIGE_PAD_RAISE_MINIMUM_DURATION
                ),
                timestamp
            );

            addTimePivot(0);
            addTimePivot(timestamp);
            await time.increaseTo(timestamp + 5);
            await assertCorrectAllocation(timestamp + 5);
            
            // Test after round 1 first deposit
            timestamp += 10;
            await callTransactionAtTimestamp(
                prestigePad.connect(depositor).contributeCurrentRound(launchId, depositRound1Turn1, { value: ethers.utils.parseEther('10') }),
                timestamp
            );

            expectedAllocations.set(timestamp, BigNumber.from(depositRound1Turn1).mul(units));
            
            addTimePivot(timestamp);
            await time.increaseTo(timestamp + 5);
            await assertCorrectAllocation(timestamp + 5);

            // Test after round 1 second deposit
            timestamp += 10;
            await callTransactionAtTimestamp(
                prestigePad.connect(depositor).contributeCurrentRound(launchId, depositRound1Turn2, { value: ethers.utils.parseEther('10') }),
                timestamp
            );
            
            expectedAllocations.set(timestamp, BigNumber.from(depositRound1).mul(units));
            
            addTimePivot(timestamp);
            await time.increaseTo(timestamp + 5);
            await assertCorrectAllocation(timestamp + 5);
            
            // Test after round 1 confirm
            timestamp += 10;
            const confirmParams1 = await getSafeConfirmCurrentRoundParams(prestigePad, { launchId: BigNumber.from(launchId) });
            await callTransactionAtTimestamp(
                getSafeConfirmCurrentRoundTx(
                    prestigePad,
                    initiator1,
                    confirmParams1,
                ),
                timestamp
            );

            addTimePivot(timestamp);
            await time.increaseTo(timestamp + 5);
            await assertCorrectAllocation(timestamp + 5);

            // Test after round 2 start
            timestamp += 10;
            await callTransactionAtTimestamp(
                prestigePad.connect(initiator1).scheduleNextRound(
                    launchId,
                    BigNumber.from(0),
                    BigNumber.from(0),
                    [],
                    [],
                    timestamp,
                    Constant.PRESTIGE_PAD_RAISE_MINIMUM_DURATION
                ),
                timestamp
            );
            
            addTimePivot(timestamp);
            await time.increaseTo(timestamp + 5);
            await assertCorrectAllocation(timestamp + 5);

            // Test after round 2 deposit
            timestamp += 10;
            await callTransactionAtTimestamp(
                prestigePad.connect(depositor).contributeCurrentRound(launchId, depositRound2, { value: ethers.utils.parseEther('10') }),
                timestamp
            );
            
            expectedAllocations.set(timestamp, BigNumber.from(depositRound1 + depositRound2).mul(units));

            addTimePivot(timestamp);
            await time.increaseTo(timestamp + 5);
            await assertCorrectAllocation(timestamp + 5);

            // Test after round 2 confirm
            timestamp += 10;
            const confirmParams2 = await getSafeConfirmCurrentRoundParams(prestigePad, { launchId: BigNumber.from(launchId) });
            await callTransactionAtTimestamp(
                getSafeConfirmCurrentRoundTx(
                    prestigePad,
                    initiator1,
                    confirmParams2,
                ),
                timestamp
            );

            addTimePivot(timestamp);
            await time.increaseTo(timestamp + 5);
            await assertCorrectAllocation(timestamp + 5);

            // Test after finalize launch
            timestamp += 10;
            const finalizeParams = await getSafeFinalizeLaunchParams(prestigePad, { launchId: BigNumber.from(launchId) });
            await callTransactionAtTimestamp(
                getSafeFinalizeLaunchTx(
                    prestigePad,
                    initiator1,
                    finalizeParams,
                ),
                timestamp
            );

            addTimePivot(timestamp);
            await time.increaseTo(timestamp + 5);
            await assertCorrectAllocation(timestamp + 5);

            // Test after withdraw project token of first round
            timestamp += 10;
            await callTransactionAtTimestamp(
                prestigePad.connect(depositor).withdrawProjectToken(launchId, 1),
                timestamp
            );

            expectedAllocations.set(timestamp, BigNumber.from(depositRound2).mul(units));

            addTimePivot(timestamp);
            await time.increaseTo(timestamp + 5);
            await assertCorrectAllocation(timestamp + 5);

            // Test after withdraw project token of second round
            timestamp += 10;
            await callTransactionAtTimestamp(
                prestigePad.connect(depositor).withdrawProjectToken(launchId, 2),
                timestamp
            );

            expectedAllocations.set(timestamp, BigNumber.from(0));

            addTimePivot(timestamp);
            await time.increaseTo(timestamp + 5);
            await assertCorrectAllocation(timestamp + 5);
        });

        it('7.1.17.2. revert with invalid launch id', async () => {
            const fixture = await beforePrestigePadTest();

            const { prestigePad, depositor1 } = fixture;

            await expect(prestigePad.allocationOfAt(depositor1.address, 0, 0))
                .to.be.revertedWithCustomError(prestigePad, 'InvalidLaunchId');
            await expect(prestigePad.allocationOfAt(depositor1.address, 0, 100))
                .to.be.revertedWithCustomError(prestigePad, 'InvalidLaunchId');
        });

        it('7.1.17.3. revert with timestamp after current timestamp', async () => {
            const fixture = await beforePrestigePadTest({
                addSampleLaunch: true,
                addSampleRounds: true,
            });

            const { prestigePad, depositor1 } = fixture;

            let timestamp = await time.latest();

            await expect(prestigePad.allocationOfAt(depositor1.address, 1, timestamp - 1))
                .to.not.be.reverted;
            await expect(prestigePad.allocationOfAt(depositor1.address, 1, timestamp))
                .to.not.be.reverted;
            await expect(prestigePad.allocationOfAt(depositor1.address, 1, timestamp + 1))
                .to.be.revertedWithCustomError(prestigePad, 'InvalidTimestamp');
        });
    });


    describe('7.1.18. supportsInterface(bytes4)', () => {
        it('7.1.18.1. return true for appropriate interface', async () => {
            const fixture = await beforePrestigePadTest();
            const { prestigePad } = fixture;

            const ICommon = ICommon__factory.createInterface();
            const IERC1155ReceiverUpgradeable = IERC1155ReceiverUpgradeable__factory.createInterface();
            const IProjectTokenReceiver = IProjectTokenReceiver__factory.createInterface();
            const IProjectLaunchpad = IProjectLaunchpad__factory.createInterface();
            const IERC165Upgradeable = IERC165Upgradeable__factory.createInterface();

            const IProjectTokenReceiverInterfaceId = getInterfaceID(IProjectTokenReceiver, [IERC1155ReceiverUpgradeable])
            const IProjectLaunchpadInterfaceId = getInterfaceID(IProjectLaunchpad, [ICommon, IProjectTokenReceiver])
            const IERC165UpgradeableInterfaceId = getInterfaceID(IERC165Upgradeable, []);

            expect(await prestigePad.supportsInterface(getBytes4Hex(IProjectTokenReceiverInterfaceId))).to.equal(true);
            expect(await prestigePad.supportsInterface(getBytes4Hex(IProjectLaunchpadInterfaceId))).to.equal(true);
            expect(await prestigePad.supportsInterface(getBytes4Hex(IERC165UpgradeableInterfaceId))).to.equal(true);
        });
    });
});

