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
} from '@typechain-types';
import { callTransaction, getBalance, getSignatures, prepareERC20, prepareNativeToken, randomWallet, resetERC20, resetNativeToken, testReentrancy } from '@utils/blockchain';
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
    callAdmin_DeclareZones,
    callAdmin_UpdateCurrencyRegistries,
} from '@utils/callWithSignatures/admin';
import {
    callEstateToken_UpdateCommissionToken,
    callEstateToken_Pause,
    callEstateToken_AuthorizeTokenizers,
} from '@utils/callWithSignatures/estateToken';
import { BigNumber, BigNumberish, Contract, Wallet } from 'ethers';
import { randomInt } from 'crypto';
import { getBytes4Hex, getInterfaceID, randomBigNumber, structToObject } from '@utils/utils';
import { OrderedMap } from '@utils/utils';
import { deployEstateForger } from '@utils/deployments/land/estateForger';
import { addCurrencyToAdminAndPriceWatcher } from '@utils/callWithSignatures/common';
import { callEstateForger_Pause, callEstateForger_UpdateBaseUnitPriceRange, callEstateForger_UpdateFeeRate, callEstateForger_Whitelist } from '@utils/callWithSignatures/estateForger';
import { deployMockPriceFeed } from '@utils/deployments/mocks/mockPriceFeed';
import { deployFailReceiver } from '@utils/deployments/mocks/failReceiver';
import { deployReentrancy } from '@utils/deployments/mocks/mockReentrancy/reentrancy';
import { deployEstateToken } from '@utils/deployments/land/estateToken';
import { deployMockEstateForger } from '@utils/deployments/mocks/mockEstateForger';
import { deployReentrancyERC1155Holder } from '@utils/deployments/mocks/mockReentrancy/reentrancyERC1155Holder';
import { request } from 'http';
import { Initialization as LandInitialization } from '@tests/land/test.initialization';
import { Initialization as LaunchInitialization } from '@tests/launch/test.initialization';
import { callReserveVault_AuthorizeProvider } from '@utils/callWithSignatures/reserveVault';
import { remain, scale } from '@utils/formula';
import { RequestQuote, RequestAgenda, RequestEstate, RequestQuota } from '@utils/models/EstateForger';
import { deployPriceWatcher } from '@utils/deployments/common/priceWatcher';
import { Rate } from '@utils/models/Common';
import { MockValidator } from '@utils/mockValidator';
import { RegisterSellerInParams, RequestTokenizationParams, UpdateRequestURIParams, UpdateRequestAgendaParams } from '@utils/models/EstateForger';
import { getRegisterSellerInValidation, getRequestTokenizationValidation, getRegisterSellerInInvalidValidation, getRequestTokenizationInvalidValidation, getUpdateRequestURIValidation, getUpdateRequestURIInvalidValidation } from '@utils/validation/EstateForger';
import { deployMockPrestigePad } from '@utils/deployments/mocks/mockPrestigePad';
import { callPrestigePad_Pause } from '@utils/callWithSignatures/prestigePad';
import { InitiateLaunchParams, UpdateRoundParams, UpdateRoundsParams } from '@utils/models/PrestigePad';
import { getInitiateLaunchInvalidValidation, getInitiateLaunchValidation, getUpdateRoundInvalidValidation, getUpdateRoundsInvalidValidation, getUpdateRoundsValidation, getUpdateRoundValidation } from '@utils/validation/PrestigePad';
import { RegisterInitiatorParams } from '@utils/models/ProjectToken';
import { getRegisterInitiatorValidation } from '@utils/validation/ProjectToken';
import { callProjectToken_AuthorizeLaunchpads, callProjectToken_Pause } from '@utils/callWithSignatures/projectToken';
import { deployReentrancyERC1155Receiver } from '@utils/deployments/mocks/mockReentrancy/reentrancyERC1155Receiver';

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
            initiateLaunchValidation,
        ])
    ));

    await assertion(timestamp);

    // raiseNextRound
    timestamp += 10;

    await callTransaction(reentrancyContract.updateReentrancyPlan(
        prestigePad.address,
        prestigePad.interface.encodeFunctionData("raiseNextRound", [
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

    // raiseNextRound
    timestamp += 10;

    await callTransaction(reentrancyContract.updateReentrancyPlan(
        prestigePad.address,
        prestigePad.interface.encodeFunctionData("confirmCurrentRound", [1])
    ));

    await assertion(timestamp);

    // withdrawDeposit
    timestamp += 10;

    await callTransaction(reentrancyContract.updateReentrancyPlan(
        prestigePad.address,
        prestigePad.interface.encodeFunctionData("withdrawDeposit", [1])
    ));

    await assertion(timestamp);

    // withdrawProjectToken
    timestamp += 10;

    await callTransaction(reentrancyContract.updateReentrancyPlan(
        prestigePad.address,
        prestigePad.interface.encodeFunctionData("withdrawProjectToken", [1, 1])
    ));

    await assertion(timestamp);

    // depositCurrentRound
    timestamp += 10;

    await callTransaction(reentrancyContract.updateReentrancyPlan(
        prestigePad.address,
        prestigePad.interface.encodeFunctionData("depositCurrentRound", [1, BigNumber.from(100)])
    ));

    await assertion(timestamp);

    // safeDepositCurrentRound
    timestamp += 10;

    const anchor = ethers.utils.keccak256(ethers.utils.toUtf8Bytes('launch_uri_1'));
    await callTransaction(reentrancyContract.updateReentrancyPlan(
        prestigePad.address,
        prestigePad.interface.encodeFunctionData("safeDepositCurrentRound", [1, BigNumber.from(100), anchor])
    ));

    await assertion(timestamp);
}

export async function applyDiscount(
    admin: Admin,
    feeAmount: BigNumber,
    currency: Contract | null,
) {
    const isExclusive = currency ? await admin.isExclusiveCurrency(currency.address) : false;
    if (isExclusive) {
        const exclusiveRate = currency ? await currency.exclusiveDiscount() : ethers.BigNumber.from(0);
        return remain(feeAmount, exclusiveRate);
    }
    return feeAmount;
}

export async function getFeeDenomination(
    estateForger: EstateForger,
    admin: Admin,
    _unitPrice: BigNumber,
    currency: Contract | null,
) {
    return applyDiscount(
        admin,
        scale(_unitPrice, await estateForger.getFeeRate()),
        currency,
    )
}

export async function getCommissionDenomination(
    commissionToken: CommissionToken,
    feeDenomination: BigNumber,
) {
    return scale(
        feeDenomination,
        await commissionToken.getCommissionRate(),
    )
}

export async function getCashbackBaseDenomination(
    feeDenomination: BigNumber,
    commissionDenomination: BigNumber,
    cashbackBaseRate: Rate,
) {
    return scale(
        feeDenomination.sub(commissionDenomination),
        cashbackBaseRate,
    );
}

describe.only('7.1. PrestigePad', async () => {
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
            LandInitialization.ESTATE_TOKEN_RoyaltyRate,
        ));
        
        const MockProjectTokenFactory = await smock.mock('ProjectToken') as any;
        const projectToken = await MockProjectTokenFactory.deploy() as MockContract<ProjectToken>;
        await callTransaction(projectToken.initialize(
            admin.address,
            estateToken.address,
            feeReceiver.address,
            validator.getAddress(),
            LaunchInitialization.PROJECT_TOKEN_BaseURI,
            LaunchInitialization.PROJECT_TOKEN_RoyaltyRate,
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
            LaunchInitialization.PRESTIGE_PAD_FeeRate,
        ) as MockPrestigePad;

        const zone1 = ethers.utils.formatBytes32String("TestZone1");
        const zone2 = ethers.utils.formatBytes32String("TestZone2");

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
        };
    };

    async function beforePrestigePadTest({
        skipListSampleCurrencies = false,
        skipAuthorizeLaunchpad = false,
        skipAuthorizeInitiators = false,
        skipAddZoneForExecutive = false,
        skipFundERC20ForDepositors = false,
        addSampleLaunch = false,
        addSampleRounds = false,
        raiseFirstRound = false,
        depositFirstRound = false,
        confirmFirstRound = false,
        doSecondRound = false,
        finalizeLaunch = false,
        pause = false,
    } = {}): Promise<PrestigePadFixture> {
        const fixture = await loadFixture(prestigePadFixture);
        const { 
            admin,
            admins,
            manager,
            moderator,
            projectToken,
            prestigePad,
            priceWatcher,
            currencies,
            nativePriceFeed,
            currencyPriceFeed,
            commissionReceiver,
            zone1,
            zone2,
            initiator1,
            initiator2,
            initiator3,
            initiators,
            depositor1,
            depositor2,
            depositor3,
            reserveVault,
            deployer,
            validator,
        } = fixture;

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
                [10000_000],
                [3],
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
                [50_000],
                [3],
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

        if (!skipFundERC20ForDepositors) {
            await prepareERC20(
                currencies[0],
                [depositor1, depositor2, depositor3],
                [prestigePad],
                ethers.utils.parseEther('1000000000'),
            );
        }

        await callAdmin_DeclareZones(
            admin,
            admins,
            [zone1, zone2],
            true,
            await admin.nonce()
        );


        let timestamp = await time.latest() + 1000;

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

        if (!skipAuthorizeLaunchpad) {
            await callProjectToken_AuthorizeLaunchpads(
                projectToken,
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
            }
            const validation1 = await getInitiateLaunchValidation(prestigePad, validator, params1);

            await callTransaction(prestigePad.connect(manager).initiateLaunch(
                params1.initiator,
                params1.zone,
                params1.projectURI,
                params1.launchURI,
                params1.initialQuantity,
                validation1
            ));

            const params2: InitiateLaunchParams = {
                initiator: initiator2.address,
                zone: zone2,
                projectURI: 'project_uri_2',
                launchURI: 'launch_uri_2',
                initialQuantity: BigNumber.from(100),
            }
            const validation2 = await getInitiateLaunchValidation(prestigePad, validator, params2);

            await callTransaction(prestigePad.connect(manager).initiateLaunch(
                params2.initiator,
                params2.zone,
                params2.projectURI,
                params2.launchURI,
                params2.initialQuantity,
                validation2
            ));
        }

        if (addSampleRounds) {
            const params1: UpdateRoundsParams = {
                launchId: BigNumber.from(1),
                removedRoundNumber: BigNumber.from(0),
                addedRounds: [
                    {
                        uri: 'round_uri_1',
                        quota: {
                            totalQuantity: BigNumber.from(1000),
                            minSellingQuantity: BigNumber.from(100),
                            maxSellingQuantity: BigNumber.from(700),
                        },
                        quote: {
                            unitPrice: ethers.utils.parseEther('0.2'),
                            currency: ethers.constants.AddressZero,
                        },
                    },
                    {
                        uri: 'round_uri_2',
                        quota: {
                            totalQuantity: BigNumber.from(200),
                            minSellingQuantity: BigNumber.from(10),
                            maxSellingQuantity: BigNumber.from(150),
                        },
                        quote: {
                            unitPrice: ethers.utils.parseEther('100'),
                            currency: currencies[0].address,
                        },
                    }
                ]
            }
            const validations1 = await getUpdateRoundsValidation(prestigePad, validator, params1);

            await callTransaction(prestigePad.connect(initiator1).updateRounds(
                params1.launchId,
                params1.removedRoundNumber,
                params1.addedRounds.map((round, index) => ({
                    ...round,
                    validation: validations1[index],
                })),
            ));

            const params2: UpdateRoundsParams = {
                launchId: BigNumber.from(2),
                removedRoundNumber: BigNumber.from(0),
                addedRounds: [
                    {
                        uri: 'round_uri_3',
                        quota: {
                            totalQuantity: BigNumber.from(300),
                            minSellingQuantity: BigNumber.from(30),
                            maxSellingQuantity: BigNumber.from(300),
                        },
                        quote: {
                            unitPrice: ethers.utils.parseEther('0.2'),
                            currency: ethers.constants.AddressZero,
                        },
                    },
                    {
                        uri: 'round_uri_4',
                        quota: {
                            totalQuantity: BigNumber.from(3000),
                            minSellingQuantity: BigNumber.from(300),
                            maxSellingQuantity: BigNumber.from(3000),
                        },
                        quote: {
                            unitPrice: ethers.utils.parseEther('150'),
                            currency: currencies[0].address,
                        },
                    }

                ]
            }
            const validations2 = await getUpdateRoundsValidation(prestigePad, validator, params2);

            await callTransaction(prestigePad.connect(initiator2).updateRounds(
                params2.launchId,
                params2.removedRoundNumber,
                params2.addedRounds.map((round, index) => ({
                    ...round,
                    validation: validations2[index],
                })),
            ));
        }

        if (pause) {
            await callPrestigePad_Pause(
                prestigePad,
                admins,
                await admin.nonce()
            );
        }

        return fixture;
    }

    describe('7.1.1. initialize(address, address, address, address, address, address, uint256, uint256, uint256)', async () => {
        it('7.1.1.1. Deploy successfully', async () => {
            const { admin, prestigePad, projectToken, feeReceiver, priceWatcher, reserveVault, validator } = await beforePrestigePadTest({});

            const tx = prestigePad.deployTransaction;
            await expect(tx).to.emit(prestigePad, 'BaseUnitPriceRangeUpdate').withArgs(
                LaunchInitialization.PRESTIGE_PAD_BaseMinUnitPrice,
                LaunchInitialization.PRESTIGE_PAD_BaseMaxUnitPrice,
            );
            await expect(tx).to.emit(prestigePad, 'FeeRateUpdate').withArgs(
                LaunchInitialization.PRESTIGE_PAD_FeeRate,
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

            const feeRate = await prestigePad.getFeeRate();
            expect(feeRate.value).to.equal(LaunchInitialization.PRESTIGE_PAD_FeeRate);
            expect(feeRate.decimals).to.equal(Constant.COMMON_RATE_DECIMALS);
        });

        it('7.1.1.2. revert with invalid fee rate', async () => {
            const { admin, feeReceiver, projectToken, priceWatcher, reserveVault, validator } = await beforePrestigePadTest({});
            const PrestigePad = await ethers.getContractFactory("PrestigePad");

            await expect(upgrades.deployProxy(PrestigePad, [
                admin.address,
                projectToken.address,
                priceWatcher.address,
                feeReceiver.address,
                reserveVault.address,
                validator.getAddress(),
                LaunchInitialization.PRESTIGE_PAD_BaseMinUnitPrice,
                LaunchInitialization.PRESTIGE_PAD_BaseMaxUnitPrice,
                Constant.COMMON_RATE_MAX_FRACTION.add(1),
            ])).to.be.reverted;
        });
    });

    describe('7.1.2. updateFeeRate(uint256, bytes[])', async () => {
        it('7.1.2.1. updateFeeRate successfully with valid signatures', async () => {
            const { admin, admins, prestigePad } = await beforePrestigePadTest({});
            const message = ethers.utils.defaultAbiCoder.encode(
                ["address", "string", "uint256"],
                [prestigePad.address, "updateFeeRate", ethers.utils.parseEther('0.2')]
            );

            const signatures = await getSignatures(message, admins, await admin.nonce());

            const tx = await prestigePad.updateFeeRate(ethers.utils.parseEther('0.2'), signatures);
            await tx.wait();

            await expect(tx).to
                .emit(prestigePad, 'FeeRateUpdate')
                .withArgs(ethers.utils.parseEther('0.2'));

            const feeRate = await prestigePad.getFeeRate();
            expect(feeRate.value).to.equal(ethers.utils.parseEther('0.2'));
            expect(feeRate.decimals).to.equal(Constant.COMMON_RATE_DECIMALS);
        });

        it('7.1.2.2. updateFeeRate unsuccessfully with invalid signatures', async () => {
            const { admin, admins, prestigePad } = await beforePrestigePadTest({});

            const message = ethers.utils.defaultAbiCoder.encode(
                ["address", "string", "uint256"],
                [prestigePad.address, "updateFeeRate", ethers.utils.parseEther('0.2')]
            );
            const invalidSignatures = await getSignatures(message, admins, (await admin.nonce()).add(1));

            await expect(prestigePad.updateFeeRate(
                ethers.utils.parseEther('0.2'),
                invalidSignatures
            )).to.be.revertedWithCustomError(admin, 'FailedVerification');
        });

        it('7.1.2.3. updateFeeRate unsuccessfully with invalid rate', async () => {
            const { admin, admins, prestigePad } = await beforePrestigePadTest({});
            
            let message = ethers.utils.defaultAbiCoder.encode(
                ["address", "string", "uint256"],
                [prestigePad.address, "updateFeeRate", Constant.COMMON_RATE_MAX_FRACTION.add(1)]
            );
            const signatures = await getSignatures(message, admins, await admin.nonce());

            await expect(prestigePad.updateFeeRate(
                Constant.COMMON_RATE_MAX_FRACTION.add(1),
                signatures
            )).to.be.revertedWithCustomError(prestigePad, 'InvalidRate');
        });
    });

    describe('7.1.3. updateBaseUnitPriceRange(uint256, uint256, bytes[])', async () => {
        it('7.1.3.1. updateBaseUnitPriceRange successfully with valid signatures', async () => {
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

        it('7.1.3.2. updateBaseUnitPriceRange unsuccessfully with invalid signatures', async () => {
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

        it('7.1.3.3. updateBaseUnitPriceRange unsuccessfully with invalid price range', async () => {
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

    describe('7.1.4. getLaunch(uint256)', async () => {
        it('7.1.4.1. return correct launch with valid launch id', async () => {
            const fixture = await beforePrestigePadTest({
                addSampleLaunch: true,
            });

            const { prestigePad, manager, validator, initiator1, zone1, initiator2, zone2 } = fixture;
            
            
        });

        it('7.1.4.2. revert with invalid launch id', async () => {

        });
    });

    describe('7.1.5. getRound(uint256)', async () => {
        it('7.1.5.1. return correct round with valid round id', async () => {

        });

        it('7.1.5.2. revert with invalid round id', async () => {

        });
    });

    describe('7.1.6. initiateLaunch(address, bytes32, string, string, uint256, (uint256, uint256, bytes))', async () => {
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
            };

            return { defaultParams };
        }

        async function expectInitiateLaunch(
            fixture: PrestigePadFixture,
            params: InitiateLaunchParams,
            signer: Wallet,
            expectFn: (tx: Promise<any>) => Promise<void>
        ) {
            const { prestigePad, validator } = fixture;

            const validation = await getInitiateLaunchValidation(prestigePad, validator, params);

            const tx = prestigePad.connect(signer).initiateLaunch(
                params.initiator,
                params.zone,
                params.projectURI,
                params.launchURI,
                params.initialQuantity,
                validation
            );

            await expectFn(tx);
        }

        it('7.1.6.1. initiate launch successfully', async () => {
            const fixture = await beforePrestigePadTest({});

            const { prestigePad, validator, projectToken, manager, moderator, initiator1, zone1, initiator2, zone2 } = fixture;

            // Tx1: By manager, with initial quantity
            const params1 = {
                initiator: initiator1.address,
                zone: zone1,
                projectURI: 'project_uri_1',
                launchURI: 'launch_uri_1',
                initialQuantity: BigNumber.from(1000),
            }

            const validation1 = await getInitiateLaunchValidation(prestigePad, validator, params1);

            let timestamp = await time.latest() + 1000;

            await time.setNextBlockTimestamp(timestamp);

            const launchId1 = 1;
            const projectId1 = 1;
            const roundId1 = 1;

            let prestigePadInitBalance1 = await projectToken.balanceOf(prestigePad.address, projectId1);
            let initiatorInitBalance1 = await projectToken.balanceOf(params1.initiator, projectId1);

            const tx1 = await prestigePad.connect(manager).initiateLaunch(
                params1.initiator,
                params1.zone,
                params1.projectURI,
                params1.launchURI,
                params1.initialQuantity,
                validation1
            );
            await tx1.wait();

            await expect(tx1).to.emit(prestigePad, 'NewLaunch').withArgs(
                projectId1,
                launchId1,
                params1.initiator,
                params1.launchURI,
                params1.initialQuantity,
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
                initialQuantity: BigNumber.from(1),
            }

            const validation2 = await getInitiateLaunchValidation(prestigePad, validator, params2);

            timestamp += 10;

            await time.setNextBlockTimestamp(timestamp);

            const launchId2 = 2;
            const projectId2 = 2;
            const roundId2 = 2;

            const initialAmount2 = params2.initialQuantity.mul(BigNumber.from(10).pow(Constant.PROJECT_TOKEN_MAX_DECIMALS));
            let prestigePadInitBalance2 = await projectToken.balanceOf(prestigePad.address, projectId2);
            let initiatorInitBalance2 = await projectToken.balanceOf(params2.initiator, projectId2);

            const tx2 = await prestigePad.connect(moderator).initiateLaunch(
                params2.initiator,
                params2.zone,
                params2.projectURI,
                params2.launchURI,
                params2.initialQuantity,
                validation2
            );
            await tx2.wait();

            await expect(tx2).to.emit(prestigePad, 'NewLaunch').withArgs(
                projectId2,
                launchId2,
                params2.initiator,
                params2.launchURI,
                params2.initialQuantity,
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

            expect(await prestigePad.roundNumber()).to.equal(2);

            const round2 = await prestigePad.getRound(roundId2);
            expect(round2.quota.totalQuantity).to.equal(params2.initialQuantity);
            expect(round2.agenda.raiseStartsAt).to.equal(timestamp);
            expect(round2.agenda.confirmAt).to.equal(timestamp);

            expect(await projectToken.balanceOf(prestigePad.address, projectId2)).to.equal(prestigePadInitBalance2);
            expect(await projectToken.balanceOf(params2.initiator, projectId2)).to.equal(initiatorInitBalance2.add(initialAmount2));            
        });

        it('7.1.6.2. initiate launch unsuccessfully when contract is reentered', async () => {
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
            }

            const validation1 = await getInitiateLaunchValidation(prestigePad, validator, params1);

            await testReentrancy_prestigePad(
                fixture,
                reentrancy,
                async (timestamp: number) => {
                    await expect(prestigePad.connect(manager).initiateLaunch(
                        params1.initiator,
                        params1.zone,
                        params1.projectURI,
                        params1.launchURI,
                        params1.initialQuantity,
                        validation1
                    )).to.be.revertedWith('ReentrancyGuard: reentrant call');
                }
            );
        });

        it('7.1.6.3. initiate launch unsuccessfully by non-executive account', async () => {
            const fixture = await beforePrestigePadTest();

            const { prestigePad, user } = fixture;

            const { defaultParams } = await beforeInitiateLaunchTest(fixture);

            await expectInitiateLaunch(fixture, defaultParams, user, async (tx) => {
                await expect(tx).to.be.revertedWithCustomError(prestigePad, 'Unauthorized');
            });
        });

        it('7.1.6.4. initiate launch unsuccessfully when paused', async () => {
            const fixture = await beforePrestigePadTest({
                pause: true,
            });
            const { prestigePad, manager } = fixture;

            const { defaultParams } = await beforeInitiateLaunchTest(fixture);

            await expectInitiateLaunch(fixture, defaultParams, manager, async (tx) => {
                await expect(tx).to.be.revertedWith('Pausable: paused');
            });
        });

        it('7.1.6.5. initiate launch unsuccessfully with invalid validation', async () => {
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
                invalidValidation
            )).to.be.revertedWithCustomError(prestigePad, 'InvalidSignature');
        });

        it('7.1.6.6. initiate launch unsuccessfully with inactive zone', async () => {
            const fixture = await beforePrestigePadTest();

            const { admin, admins, prestigePad, manager } = fixture;

            const { defaultParams } = await beforeInitiateLaunchTest(fixture);

            await callAdmin_DeclareZones(
                admin,
                admins,
                [defaultParams.zone],
                false,
                await admin.nonce()
            );

            await expectInitiateLaunch(fixture, defaultParams, manager, async (tx) => {
                await expect(tx).to.be.revertedWithCustomError(prestigePad, 'Unauthorized');
            });
        });

        it('7.1.6.7. initiate launch unsuccessfully when sender is not authorized in zone', async () => {
            const fixture = await beforePrestigePadTest();

            const { admin, admins, prestigePad, manager } = fixture;

            const { defaultParams } = await beforeInitiateLaunchTest(fixture);

            await callAdmin_ActivateIn(
                admin,
                admins,
                defaultParams.zone,
                [manager.address],
                false,
                await admin.nonce()
            );

            await expectInitiateLaunch(fixture, defaultParams, manager, async (tx) => {
                await expect(tx).to.be.revertedWithCustomError(prestigePad, 'Unauthorized');
            });
        });

        it('7.1.6.8. initiate launch unsuccessfully when initiator is not registered in zone', async () => {
            const fixture = await beforePrestigePadTest({
                skipAuthorizeInitiators: true,
            });

            const { prestigePad, manager } = fixture;

            const { defaultParams } = await beforeInitiateLaunchTest(fixture);

            await expectInitiateLaunch(fixture, defaultParams, manager, async (tx) => {
                await expect(tx).to.be.revertedWithCustomError(prestigePad, 'NotRegisteredInitiator');
            });
        });

        it('7.1.6.9. initiate launch unsuccessfully when launching project failed', async () => {
            const fixture = await beforePrestigePadTest();

            const { admin, manager, projectToken, admins } = fixture;

            const { defaultParams } = await beforeInitiateLaunchTest(fixture);

            await callProjectToken_Pause(
                projectToken,
                admins,
                await admin.nonce()
            );

            await expectInitiateLaunch(fixture, defaultParams, manager, async (tx) => {
                await expect(tx).to.be.revertedWith('Pausable: paused');
            });
        });

        it('7.1.6.10. initiate launch unsuccessfully when initiator cannot receive erc1155', async () => {
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

            await expectInitiateLaunch(
                fixture,
                { ...defaultParams, initiator: failReceiver.address },
                manager,
                async (tx) => {
                    await expect(tx).to.be.revertedWith('Fail');
                }
            );
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
                        minSellingQuantity: BigNumber.from(101),
                        maxSellingQuantity: BigNumber.from(701),
                    },
                    quote: {
                        unitPrice: ethers.utils.parseEther('150.1'),
                        currency: currencies[0].address,
                    },
                },
            }

            return { defaultParams }
        }

        async function expectUpdateRound(
            fixture: PrestigePadFixture,
            params: UpdateRoundParams,
            signer: Wallet,
            expectFn: (tx: Promise<any>) => Promise<void>
        ) {
            const { prestigePad, validator } = fixture;

            const validation = await getUpdateRoundValidation(prestigePad, validator, params);

            const tx = prestigePad.connect(signer).updateRound(
                params.launchId,
                params.index,
                {
                    ...params.round,
                    validation,
                },
            );

            await expectFn(tx);
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
                roundWithValidation,
            );
            const receipt = await tx.wait();

            const roundId = currentRoundNumber.add(1);

            const newRoundEvent = receipt.events!.find(log => log.event === 'NewRound')!;
            expect(newRoundEvent.args!.roundId).to.equal(roundId);
            expect(newRoundEvent.args!.launchId).to.equal(params.launchId);
            expect(newRoundEvent.args!.uri).to.equal(params.round.uri);
            expect(structToObject(newRoundEvent.args!.quota)).to.deep.equal(params.round.quota);
            expect(structToObject(newRoundEvent.args!.quote)).to.deep.equal(params.round.quote);

            const roundUpdateEvent = receipt.events!.find(log => log.event === 'RoundUpdate')!;
            expect(roundUpdateEvent.args!.launchId).to.equal(params.launchId);
            expect(roundUpdateEvent.args!.roundId).to.equal(roundId);
            expect(roundUpdateEvent.args!.index).to.equal(params.index);
            expect(structToObject(roundUpdateEvent.args!.round)).to.deep.equal(roundWithValidation);

            const launch = await prestigePad.getLaunch(params.launchId);

            expect(launch.roundIds.length).to.equal(currentRoundIds.length);
            const expectedUpdatedRoundIds = [...currentRoundIds];
            expectedUpdatedRoundIds[params.index.toNumber()] = roundId;
            expect(expectedUpdatedRoundIds).to.deep.equal(launch.roundIds);
            
            expect(await prestigePad.roundNumber()).to.equal(currentRoundNumber.add(1));
            const round = await prestigePad.getRound(roundId);
            expect(round.uri).to.equal(params.round.uri);
            expect(round.quota.totalQuantity).to.equal(params.round.quota.totalQuantity);
            expect(round.quota.minSellingQuantity).to.equal(params.round.quota.minSellingQuantity);
            expect(round.quota.maxSellingQuantity).to.equal(params.round.quota.maxSellingQuantity);
            expect(round.quote.unitPrice).to.equal(params.round.quote.unitPrice);
            expect(round.quote.currency).to.equal(params.round.quote.currency);
        });

        it('7.1.7.2. update round unsuccessfully with invalid launch id', async () => {
            const fixture = await beforePrestigePadTest();

            const { prestigePad, initiator1, initiator2 } = fixture;

            const { defaultParams } = await beforeUpdateRoundTest(fixture);

            await expectUpdateRound(
                fixture,
                { ...defaultParams, launchId: BigNumber.from(0) },
                initiator1,
                async (tx) => {
                    await expect(tx).to.be.revertedWithCustomError(prestigePad, 'InvalidLaunchId');
                }
            );
            await expectUpdateRound(
                fixture,
                { ...defaultParams, launchId: BigNumber.from(100) },
                initiator1,
                async (tx) => {
                    await expect(tx).to.be.revertedWithCustomError(prestigePad, 'InvalidLaunchId');
                }
            );
        });

        it('7.1.7.3. update round unsuccessfully when sender is not launch initiator', async () => {
            const fixture = await beforePrestigePadTest({
                addSampleLaunch: true,
                addSampleRounds: true,
            });

            const { prestigePad, manager, initiator1 } = fixture;

            const { defaultParams } = await beforeUpdateRoundTest(fixture);
            
            // By manager
            await expectUpdateRound(
                fixture,
                { ...defaultParams, launchId: BigNumber.from(1) },
                manager,
                async (tx) => {
                    await expect(tx).to.be.revertedWithCustomError(prestigePad, 'Unauthorized');
                }
            );
            // By wrong initiator
            await expectUpdateRound(
                fixture,
                { ...defaultParams, launchId: BigNumber.from(2) },
                initiator1,
                async (tx) => {
                    await expect(tx).to.be.revertedWithCustomError(prestigePad, 'Unauthorized');
                }
            );
        });

        it('7.1.7.4. update round unsuccessfully when paused', async () => {
            const fixture = await beforePrestigePadTest({
                addSampleLaunch: true,
                addSampleRounds: true,
                pause: true,
            });

            const { initiator1 } = fixture;
            
            const { defaultParams } = await beforeUpdateRoundTest(fixture);

            await expectUpdateRound(
                fixture,
                defaultParams,
                initiator1,
                async (tx) => {
                    await expect(tx).to.be.revertedWith('Pausable: paused');
                }
            );
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
            // TODO: Implement
        });

        it('7.1.7.7. update round unsuccessfully with invalid index', async () => {
            const fixture = await beforePrestigePadTest({
                addSampleLaunch: true,
                addSampleRounds: true,
            });

            const { prestigePad, initiator1 } = fixture;
            
            const { defaultParams } = await beforeUpdateRoundTest(fixture);
            const roundIdsLength = (await prestigePad.getLaunch(defaultParams.launchId)).roundIds.length;

            await expectUpdateRound(
                fixture,
                { ...defaultParams, index: BigNumber.from(roundIdsLength) },
                initiator1,
                async (tx) => {
                    await expect(tx).to.be.revertedWithCustomError(prestigePad, 'InvalidInput');
                }
            );
            await expectUpdateRound(
                fixture,
                { ...defaultParams, index: BigNumber.from(roundIdsLength + 1) },
                initiator1,
                async (tx) => {
                    await expect(tx).to.be.revertedWithCustomError(prestigePad, 'InvalidInput');
                }
            );
        });

        it('7.1.7.8. update round unsuccessfully when updated round is already initiated', async () => {
            const fixture = await beforePrestigePadTest({
                addSampleLaunch: true,
                addSampleRounds: true,
            });

            const { prestigePad, initiator1 } = fixture;
            
            const { defaultParams } = await beforeUpdateRoundTest(fixture);

            await expectUpdateRound(
                fixture,
                { ...defaultParams, index: BigNumber.from(0) },
                initiator1,
                async (tx) => {
                    await expect(tx).to.be.revertedWithCustomError(prestigePad, 'AlreadyInitiated');
                }
            );
        });

        it('7.1.7.9. update round unsuccessfully when currency price is not in range', async () => {
            const fixture = await beforePrestigePadTest({
                addSampleLaunch: true,
                addSampleRounds: true,
            });

            const { prestigePad, initiator1 } = fixture;
            
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
            await expectUpdateRound(fixture, params1, initiator1, async (tx) => {
                await expect(tx).to.be.revertedWithCustomError(prestigePad, 'InvalidUnitPrice');
            });

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
            await expectUpdateRound(fixture, params2, initiator1, async (tx) => {
                await expect(tx).to.be.revertedWithCustomError(prestigePad, 'InvalidUnitPrice');
            });
        });

        it('7.1.7.10. update round unsuccessfully when min selling quantity exceed max selling quantity', async () => {
            const fixture = await beforePrestigePadTest({
                addSampleLaunch: true,
                addSampleRounds: true,
            });

            const { prestigePad, initiator1 } = fixture;
            
            const { defaultParams } = await beforeUpdateRoundTest(fixture);
            const params1 = {
                ...defaultParams,
                round: {
                    ...defaultParams.round,
                    quota: {
                        ...defaultParams.round.quota,
                        minSellingQuantity: defaultParams.round.quota.maxSellingQuantity.add(1),
                    },
                },
            };
            await expectUpdateRound(fixture, params1, initiator1, async (tx) => {
                await expect(tx).to.be.revertedWithCustomError(prestigePad, 'InvalidInput');
            });

            const params2 = {
                ...defaultParams,
                round: {
                    ...defaultParams.round,
                    quota: {
                        ...defaultParams.round.quota,
                        minSellingQuantity: defaultParams.round.quota.maxSellingQuantity,
                    },
                },
            };
            await expectUpdateRound(fixture, params2, initiator1, async (tx) => {
                await expect(tx).to.not.be.reverted;
            });
        });

        it('7.1.7.11. update round unsuccessfully when max selling quantity exceed total quantity', async () => {
            const fixture = await beforePrestigePadTest({
                addSampleLaunch: true,
                addSampleRounds: true,
            });

            const { prestigePad, initiator1 } = fixture;
            
            const { defaultParams } = await beforeUpdateRoundTest(fixture);
            const params1 = {
                ...defaultParams,
                round: {
                    ...defaultParams.round,
                    quota: {
                        ...defaultParams.round.quota,
                        maxSellingQuantity: defaultParams.round.quota.totalQuantity.add(1),
                    },
                },
            };
            await expectUpdateRound(fixture, params1, initiator1, async (tx) => {
                await expect(tx).to.be.revertedWithCustomError(prestigePad, 'InvalidInput');
            });

            const params2 = {
                ...defaultParams,
                round: {
                    ...defaultParams.round,
                    quota: {
                        ...defaultParams.round.quota,
                        maxSellingQuantity: defaultParams.round.quota.totalQuantity,
                    },
                },
            };
            await expectUpdateRound(fixture, params2, initiator1, async (tx) => {
                await expect(tx).to.not.be.reverted;
            });
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
                            minSellingQuantity: BigNumber.from(101),
                            maxSellingQuantity: BigNumber.from(701),
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
                            minSellingQuantity: BigNumber.from(11),
                            maxSellingQuantity: BigNumber.from(151),
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

        async function expectUpdateRounds(
            fixture: PrestigePadFixture,
            params: UpdateRoundsParams,
            signer: Wallet,
            expectFn: (tx: Promise<any>) => Promise<void>
        ) {
            const { prestigePad, validator } = fixture;

            const validations = await getUpdateRoundsValidation(prestigePad, validator, params);
            const roundsWithValidations = params.addedRounds.map((round, index) => ({
                ...round,
                validation: validations[index],
            }));

            const tx = prestigePad.connect(signer).updateRounds(
                params.launchId,
                params.removedRoundNumber,
                roundsWithValidations,
            );

            await expectFn(tx);
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
            const receipt1 = await tx1.wait();

            for(let i = 0; i < params1.addedRounds.length; i++) {
                const roundUpdateEvent = receipt1.events!.filter(event => event.event === 'RoundUpdate')[i]!;
                expect(roundUpdateEvent.args!.launchId).to.equal(params1.launchId);
                expect(roundUpdateEvent.args!.roundId).to.equal(currentRoundNumber1.add(i+1));
                expect(roundUpdateEvent.args!.index).to.equal(startIndex1 + i);
                expect(structToObject(roundUpdateEvent.args!.round)).to.deep.equal(roundsWithValidations1[i]);

                const newRoundEvent = receipt1.events!.filter(event => event.event === 'NewRound')[i]!;
                expect(newRoundEvent.args!.roundId).to.equal(currentRoundNumber1.add(i+1));
                expect(newRoundEvent.args!.launchId).to.equal(params1.launchId);
                expect(newRoundEvent.args!.uri).to.equal(params1.addedRounds[i].uri);
                expect(structToObject(newRoundEvent.args!.quota)).to.deep.equal(params1.addedRounds[i].quota);
                expect(structToObject(newRoundEvent.args!.quote)).to.deep.equal(params1.addedRounds[i].quote);
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
                expect(round.quota.minSellingQuantity).to.equal(params1.addedRounds[i].quota.minSellingQuantity);
                expect(round.quota.maxSellingQuantity).to.equal(params1.addedRounds[i].quota.maxSellingQuantity);
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
                const roundUpdateEvent = receipt2.events!.filter(event => event.event === 'RoundUpdate')[i]!;
                expect(roundUpdateEvent.args!.index).to.equal(startIndex2 + i);
            }
        });

        it('7.1.8.2. update round unsuccessfully with invalid launch id', async () => {
            const fixture = await beforePrestigePadTest();

            const { prestigePad, initiator1 } = fixture;

            const { defaultParams } = await beforeUpdateRoundsTest(fixture);
            
            const params1 = {
                ...defaultParams,
                launchId: BigNumber.from(0),
            };            
            await expectUpdateRounds(fixture, params1, initiator1, async (tx) => {
                await expect(tx).to.be.revertedWithCustomError(prestigePad, 'InvalidLaunchId');
            });

            const params2 = {
                ...defaultParams,
                launchId: BigNumber.from(100),
            };
            await expectUpdateRounds(fixture, params2, initiator1, async (tx) => {
                await expect(tx).to.be.revertedWithCustomError(prestigePad, 'InvalidLaunchId');
            });
        });

        it('7.1.8.3. update round unsuccessfully when sender is not launch initiator', async () => {
            const fixture = await beforePrestigePadTest({
                addSampleLaunch: true,
                addSampleRounds: true,
            });

            const { prestigePad, manager, initiator2 } = fixture;

            const { defaultParams } = await beforeUpdateRoundsTest(fixture);

            // By manager
            await expectUpdateRounds(fixture, defaultParams, manager, async (tx) => {
                await expect(tx).to.be.revertedWithCustomError(prestigePad, 'Unauthorized');
            });

            // By wrong initiator
            await expectUpdateRounds(fixture, defaultParams, initiator2, async (tx) => {
                await expect(tx).to.be.revertedWithCustomError(prestigePad, 'Unauthorized');
            });
        });

        it('7.1.8.4. update round unsuccessfully when paused', async () => {
            const fixture = await beforePrestigePadTest({
                addSampleLaunch: true,
                addSampleRounds: true,
                pause: true,
            });

            const { prestigePad, initiator1 } = fixture;

            const { defaultParams } = await beforeUpdateRoundsTest(fixture);

            await expectUpdateRounds(fixture, defaultParams, initiator1, async (tx) => {
                await expect(tx).to.be.revertedWith('Pausable: paused');
            });

            await expectUpdateRounds(fixture, defaultParams, initiator1, async (tx) => {
                await expect(tx).to.be.revertedWith('Pausable: paused');
            });
        });

        it('7.1.8.5. update round unsuccessfully when launch is finalized', async () => {
            // TODO: Implement  
        });

        it('7.1.8.6. update round unsuccessfully when removing round number is greater than launch total round number', async () => {
            const fixture = await beforePrestigePadTest({
                addSampleLaunch: true,
                addSampleRounds: true,
            });

            const { prestigePad, initiator1 } = fixture;

            const { defaultParams } = await beforeUpdateRoundsTest(fixture);

            const currentLaunchRoundNumber = (await prestigePad.getLaunch(defaultParams.launchId)).roundIds.length;

            const params1 = {
                ...defaultParams,
                removedRoundNumber: BigNumber.from(currentLaunchRoundNumber),
            };
            await expectUpdateRounds(fixture, params1, initiator1, async (tx) => {
                await expect(tx).to.be.revertedWithCustomError(prestigePad, 'InvalidRemoving');
            });

            const params2 = {
                ...defaultParams,
                removedRoundNumber: BigNumber.from(currentLaunchRoundNumber + 1),
            };
            await expectUpdateRounds(fixture, params2, initiator1, async (tx) => {
                await expect(tx).to.be.revertedWithCustomError(prestigePad, 'InvalidRemoving');
            });
        });

        it('7.1.8.7. update round unsuccessfully when current round is removed', async () => {
            // TODO: Implement

            // const fixture = await beforePrestigePadTest({
            //     addSampleLaunch: true,
            //     addSampleRounds: true,
            // });

            // const { prestigePad, initiator1 } = fixture;

            // const { defaultParams } = await beforeUpdateRoundsTest(fixture);            

            // const params1 = {
            //     ...defaultParams,
            //     removedRoundNumber: BigNumber.from(3),
            // };
            // await expectUpdateRounds(fixture, params1, initiator1, async (tx) => {
            //     await expect(tx).to.be.revertedWithCustomError(prestigePad, 'InvalidRemoving');
            // });
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

            const { prestigePad, initiator1 } = fixture;

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
            await expectUpdateRounds(fixture, params1, initiator1, async (tx) => {
                await expect(tx).to.be.revertedWithCustomError(prestigePad, 'InvalidUnitPrice');
            });

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
            await expectUpdateRounds(fixture, params2, initiator1, async (tx) => {
                await expect(tx).to.be.revertedWithCustomError(prestigePad, 'InvalidUnitPrice');
            });
        });

        it('7.1.8.10. update round unsuccessfully when min selling quantity exceed max selling quantity', async () => {
            const fixture = await beforePrestigePadTest({
                addSampleLaunch: true,
                addSampleRounds: true,
            });

            const { prestigePad, initiator1 } = fixture;

            const { defaultParams } = await beforeUpdateRoundsTest(fixture);

            const params1 = {
                ...defaultParams,
                addedRounds: [
                    {
                        ...defaultParams.addedRounds[0],
                        quota: {
                            ...defaultParams.addedRounds[0].quota,
                            minSellingQuantity: defaultParams.addedRounds[0].quota.maxSellingQuantity.add(1),
                        },
                    },
                    ...defaultParams.addedRounds.slice(1),
                ],
            };
            await expectUpdateRounds(fixture, params1, initiator1, async (tx) => {
                await expect(tx).to.be.revertedWithCustomError(prestigePad, 'InvalidInput');
            });

            const params2 = {
                ...defaultParams,
                addedRounds: [
                    {
                        ...defaultParams.addedRounds[0],
                        quota: {
                            ...defaultParams.addedRounds[0].quota,
                            minSellingQuantity: defaultParams.addedRounds[0].quota.maxSellingQuantity,
                        },
                    },
                ],
            };
            await expectUpdateRounds(fixture, params2, initiator1, async (tx) => {
                await expect(tx).to.not.be.reverted;
            });
        });

        it('7.1.8.11. update round unsuccessfully when max selling quantity exceed total quantity', async () => {
            const fixture = await beforePrestigePadTest({
                addSampleLaunch: true,
                addSampleRounds: true,
            });

            const { prestigePad, initiator1 } = fixture;

            const { defaultParams } = await beforeUpdateRoundsTest(fixture);

            const params1 = {
                ...defaultParams,
                addedRounds: [
                    {
                        ...defaultParams.addedRounds[0],
                        quota: {
                            ...defaultParams.addedRounds[0].quota,
                            maxSellingQuantity: defaultParams.addedRounds[0].quota.totalQuantity.add(1),
                        },
                    },
                    ...defaultParams.addedRounds.slice(1),
                ],
            };
            await expectUpdateRounds(fixture, params1, initiator1, async (tx) => {
                await expect(tx).to.be.revertedWithCustomError(prestigePad, 'InvalidInput');
            });

            const params2 = {
                ...defaultParams,
                addedRounds: [
                    {
                        ...defaultParams.addedRounds[0],
                        quota: {
                            ...defaultParams.addedRounds[0].quota,
                            maxSellingQuantity: defaultParams.addedRounds[0].quota.totalQuantity,
                        },
                    },
                ],
            };
            await expectUpdateRounds(fixture, params2, initiator1, async (tx) => {
                await expect(tx).to.not.be.reverted;
            });
        });
    });

    describe('7.1.9. raiseNextRound(uint256, uint256, uint256, address[], uint256[], uint40, uint40)', async () => {
        it('7.1.9.1. raise next round successfully', async () => {

        });

        it('7.1.9.2. raise next round unsuccessfully when contract is reentered', async () => {

        });

        it('7.1.9.3. raise next round unsuccessfully with invalid launch id', async () => {

        });

        it('7.1.9.4. raise next round unsuccessfully when sender is not launch initiator', async () => {

        });

        it('7.1.9.5. raise next round unsuccessfully when paused', async () => {

        });

        it('7.1.9.6. raise next round unsuccessfully with invalid cashback base rate', async () => {

        });

        it('7.1.9.7. raise next round unsuccessfully with mismatched params length', async () => {

        });

        it('7.1.9.8. raise next round unsuccessfully with raise start time after current timestamp', async () => {

        });

        it('7.1.9.9. raise next round unsuccessfully with raise duration less than minimum requirement', async () => {
        
        });

        it('7.1.9.10. raise next round unsuccessfully when launch is finalized', async () => {

        });

        it('7.1.9.11. raise next round unsuccessfully when current round is not confirmed', async () => {

        });

        it('7.1.9.12. raise next round unsuccessfully when there is no new round', async () => {

        });

        it('7.1.9.13. raise next round unsuccessfully when cashback threshold exceed total quantity', async () => {

        });

        it('7.1.9.14. raise next round unsuccessfully without cashback currencies and rate, but with cashback threshold', async () => {

        });

        it('7.1.9.15. raise next round unsuccessfully with cashback currencies and rate, but without cashback base rate', async () => {

        });

        it('7.1.9.16. raise next round unsuccessfully when open fund failed', async () => {

        });
    });

    describe('7.1.10. cancelCurrentRound(uint256)', async () => {
        it('7.1.10.1. cancel current round successfully', async () => {

        });

        it('7.1.10.2. cancel current round unsuccessfully with invalid launch id', async () => {

        });

        it('7.1.10.3. cancel current round unsuccessfully when sender is not launch initiator', async () => {

        });

        it('7.1.10.4. cancel current round unsuccessfully when paused', async () => {

        });

        it('7.1.10.5. cancel current round unsuccessfully when launch is finalized', async () => {

        });

        it('7.1.10.6. cancel current round unsuccessfully when current round is confirmed', async () => {

        });
    });

    describe('7.1.11. confirmCurrentRound(uint256)', async () => {
        it('7.1.11.1. confirm current round successfully before raise ends', async () => {

        });

        it('7.1.11.2. confirm current round successfully after raise ends', async () => {

        });

        it('7.1.11.3. confirm current round successfully without cashback', async () => {

        });

        it('7.1.11.4. confirm current round when contract is reentered', async () => {

        });

        it('7.1.11.5. confirm current round unsuccessfully with invalid launch id', async () => {

        });

        it('7.1.11.6. confirm current round unsuccessfully when sender is not launch initiator', async () => {

        });

        it('7.1.11.7. confirm current round unsuccessfully when paused', async () => {

        });

        it('7.1.11.8. confirm current round unsuccessfully when round is confirmed', async () => {

        });

        it('7.1.11.9. confirm current round unsuccessfully when confirm time limit is overdue', async () => {

        });

        it('7.1.11.10. confirm current round unsuccessfully when sold quantity is not enough', async () => {

        });

        it('7.1.11.11. confirm current round unsuccessfully when sending native token to initiator failed', async () => {

        });

        it('7.1.11.12. confirm current round unsuccessfully when provide fund failed', async () => {

        });
    });

    describe('7.1.12. finalize(uint256)', async () => {
        it('7.1.12.1. finalize launch successfully', async () => {

        });

        it('7.1.12.2. finalize launch unsuccessfully with invalid launch id', async () => {

        });

        it('7.1.12.3. finalize launch unsuccessfully when sender is not launch initiator', async () => {

        });

        it('7.1.12.4. finalize launch unsuccessfully when paused', async () => {

        });

        it('7.1.12.5. finalize launch unsuccessfully when launch is finalized', async () => {

        });
        
        it('7.1.12.6. finalize launch unsuccessfully when there are more round to raise', async () => {

        });

        it('7.1.12.7. finalize launch unsuccessfully when current round is not confirmed', async () => {

        });
    });

    describe('7.1.13. depositCurrentRound(uint256, uint256)', async () => {
        it('7.1.13.1. deposit current round successfully', async () => {
            
        });

        it('7.1.13.2. deposit current round unsuccessfully with invalid launch id', async () => {

        });

        it('7.1.13.3. deposit current round unsuccessfully when contract is reentered', async () => {

        });

        it('7.1.13.4. deposit current round unsuccessfully when paused', async () => {

        });

        it('7.1.13.5. deposit current round unsuccessfully when launch is finalized', async () => {

        });

        it('7.1.13.6. deposit current round unsuccessfully when current round is confirmed', async () => {

        });

        it('7.1.13.7. deposit current round unsuccessfully before raise starts', async () => {

        });

        it('7.1.13.8. deposit current round unsuccessfully after raise ends', async () => {

        });

        it('7.1.13.9. deposit current round unsuccessfully when deposit quantity exceed remaining quantity', async () => {

        });
    });

    describe('7.1.14. safeDepositCurrentRound(uint256, uint256, bytes32)', async () => {
        it('7.1.14.1. safe deposit current round successfully', async () => {

        });

        it('7.1.14.2. safe deposit current round unsuccessfully with invalid launch id', async () => {

        });

        it('7.1.14.3. safe deposit current round unsuccessfully with invalid anchor', async () => {

        });
    });

    describe('7.1.15. withdrawDeposit(uint256)', async () => {
        it('7.1.15.1. withdraw deposit successfully', async () => {

        });

        it('7.1.15.2. withdraw deposit unsuccessfully when contract is reentered', async () => {

        });

        it('7.1.15.3. withdraw deposit unsuccessfully with invalid round id', async () => {

        });

        it('7.1.15.4. withdraw deposit unsuccessfully when paused', async () => {

        });

        it('7.1.15.5. withdraw deposit unsuccessfully when round is confirmed', async () => {

        });

        it('7.1.15.6. withdraw deposit unsuccessfully when raising is not ended', async () => {
        
        });

        it('7.1.15.7. withdraw deposit unsuccessfully when confirm time limit is not overdue', async () => {

        });

        it('7.1.15.8. withdraw deposit unsuccessfully when not deposited', async () => {

        });

        it('7.1.15.9. withdraw deposit unsuccessfully when already withdrawn', async () => {

        });

        it('7.1.15.10. withdraw deposit unsuccessfully when sending native token to user failed', async () => {

        });
    });

    describe('7.1.16. withdrawProjectToken(uint256, uint256)', async () => {
        it('7.1.16.1. withdraw project token successfully', async () => {

        });

        it('7.1.16.2. withdraw project token successfully without cashback', async () => {

        });

        it('7.1.16.3. withdraw zero project token when user not deposited', async () => {

        });

        it('7.1.16.4. withdraw project token unsuccessfully when contract is reentered', async () => {

        });

        it('7.1.16.5. withdraw project token unsuccessfully with invalid launch id', async () => {

        });

        it('7.1.16.6. withdraw project token unsuccessfully when paused', async () => {

        });

        it('7.1.16.7. withdraw project token unsuccessfully with invalid round index', async () => {

        });

        it('7.1.16.8. withdraw project token unsuccessfully when round is not confirmed', async () => {

        });

        it('7.1.16.9. withdraw project token unsuccessfully when user already withdrawn project token', async () => {

        });

        it('7.1.16.10. withdraw project token unsuccessfully when withdraw fund failed', async () => {

        });
    });

    describe('7.1.17. allocationOfAt(uint256)', async () => {
        it('7.1.17.1. return correct allocation', async () => {

        });

        it('7.1.17.2. revert with invalid launch id', async () => {

        });

        it('7.1.17.3. revert with timestamp after current timestamp', async () => {

        });
    });
});

