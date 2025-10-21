import { expect } from 'chai';
import { randomInt } from 'crypto';
import { BigNumber, Contract } from 'ethers';
import { ethers } from 'hardhat';

// @defi-wonderland/smock
import { MockContract, smock } from '@defi-wonderland/smock';

// @nomicfoundation/hardhat-network-helpers
import { loadFixture, time } from '@nomicfoundation/hardhat-network-helpers';

// @tests
import {
    IERC165UpgradeableInterfaceId,
    IERC1155MetadataURIUpgradeableInterfaceId,
    IERC2981UpgradeableInterfaceId,
    IAssetTokenInterfaceId,
    IEstateTokenizerInterfaceId,
    IGovernorInterfaceId,
} from '@tests/interfaces';
import { Constant } from '@tests/test.constant';

// @tests/launch
import { Initialization as LaunchInitialization } from '@tests/launch/test.initialization';

// @tests/land
import { Initialization as LandInitialization } from '@tests/land/test.initialization';

// @typechain-types
import {
    Admin,
    CommissionToken,
    Currency,
    FeeReceiver,
    MockEstateToken,
    ReserveVault,
    PriceWatcher,
    MockPrestigePad,
    MockProjectToken,
    MockEstateToken__factory,
    MockPrestigePad__factory,
    ReentrancyReceiver,
    FailReceiver,
} from '@typechain-types';

// @utils
import { callTransaction, callTransactionAtTimestamp, randomWallet } from '@utils/blockchain';
import { MockValidator } from '@utils/mockValidator';
import { getBytes4Hex, randomBigNumber, structToObject, OrderedMap } from '@utils/utils';

// @utils/anchor/launch
import { getSafeUpdateProjectURIAnchor } from '@utils/anchor/launch/projectToken';

// @utils/deployments/common
import { deployAdmin } from '@utils/deployments/common/admin';
import { deployCurrency } from '@utils/deployments/common/currency';
import { deployFeeReceiver } from '@utils/deployments/common/feeReceiver';
import { deployGovernor } from '@utils/deployments/common/governor';
import { deployPriceWatcher } from '@utils/deployments/common/priceWatcher';
import { deployReserveVault } from '@utils/deployments/common/reserveVault';

// @utils/deployments/land
import { deployCommissionToken } from '@utils/deployments/land/commissionToken';

// @utils/deployments/mock
import { deployFailReceiver } from '@utils/deployments/mock/utilities/failReceiver';
import { deployMockProjectToken } from '@utils/deployments/mock/launch/mockProjectToken';
import { deployReentrancyReceiver } from '@utils/deployments/mock/reentrancy/reentrancyReceiver';

// @utils/models/launch
import {
    AuthorizeLaunchpadParams,
    AuthorizeLaunchpadParamsInput,
    DeprecateProjectParams,
    LaunchProjectParams,
    MintParams,
    RegisterInitiatorParams,
    RegisterInitiatorParamsInput,
    SafeUpdateProjectURIParams,
    TokenizeProjectParams,
    UpdateProjectURIParamsInput,
    UpdateBaseURIParams,
    UpdateBaseURIParamsInput,
    UpdateZoneRoyaltyRateParams,
    UpdateZoneRoyaltyRateParamsInput,
} from '@utils/models/launch/projectToken';

// @utils/signatures/launch
import {
    getUpdateBaseURISignatures,
    getUpdateZoneRoyaltyRateSignatures,
    getAuthorizeLaunchpadSignatures,
} from '@utils/signatures/launch/projectToken';

// @utils/transaction/common
import {
    getAdminTxByInput_ActivateIn,
    getAdminTxByInput_AuthorizeManagers,
    getAdminTxByInput_AuthorizeModerators,
    getAdminTxByInput_DeclareZone,
} from '@utils/transaction/common/admin';
import { getPausableTxByInput_Pause } from '@utils/transaction/common/pausable';

// @utils/transaction/land
import {
    getCommissionTokenTx_RegisterBroker,
    getCommissionTokenTx_UpdateBaseURI,
    getCommissionTokenTxByInput_UpdateBaseURI,
} from '@utils/transaction/land/commissionToken';
import {
    getEstateTokenTxByInput_AuthorizeTokenizers,
    getEstateTokenTxByInput_RegisterCustodian,
    getEstateTokenTxByInput_UpdateCommissionToken,
} from '@utils/transaction/land/estateToken';

// @utils/transaction/launch
import {
    getProjectTokenTx_AuthorizeLaunchpad,
    getProjectTokenTxByInput_AuthorizeLaunchpad,
    getCallProjectTokenTx_LaunchProject,
    getCallProjectTokenTx_Mint,
    getProjectTokenTx_Mint,
    getProjectTokenTx_RegisterInitiator,
    getProjectTokenTxByInput_RegisterInitiator,
    getProjectTokenTx_SafeDeprecateProject,
    getProjectTokenTxByParams_SafeDeprecateProject,
    getProjectTokenTxByParams_SafeTokenizeProject,
    getProjectTokenTx_SafeUpdateProjectURI,
    getProjectTokenTxByInput_SafeUpdateProjectURI,
    getProjectTokenTx_UpdateZoneRoyaltyRate,
    getProjectTokenTx_WithdrawEstateToken,
    getProjectTokenTxByInput_UpdateZoneRoyaltyRate,
} from '@utils/transaction/launch/projectToken';

// @utils/validation/launch
import {
    getRegisterInitiatorValidation,
    getSafeUpdateProjectURIValidation,
} from '@utils/validation/launch/projectToken';

interface ProjectTokenFixture {
    deployer: any;
    admins: any[];
    manager: any;
    moderator: any;
    user: any;
    requester1: any;
    requester2: any;
    broker1: any;
    broker2: any;
    depositor1: any;
    depositor2: any;
    depositor3: any;
    depositors: any[];
    initiator1: any;
    initiator2: any;
    initiators: any[];
    custodian1: any;
    custodian2: any;
    custodians: any[];
    validator: MockValidator;

    admin: Admin;
    currency: Currency;
    feeReceiver: FeeReceiver;
    priceWatcher: PriceWatcher;
    reserveVault: ReserveVault;
    estateToken: MockContract<MockEstateToken>;
    projectToken: MockProjectToken;
    prestigePad: MockContract<MockPrestigePad>;
    commissionToken: CommissionToken;

    launchpads: any[];
    reentrancyReceiver: ReentrancyReceiver;
    failReceiver: FailReceiver;
    zone1: string;
    zone2: string;
}

async function testReentrancy_projectToken(fixture: ProjectTokenFixture, reentrancyContract: Contract, assertion: any) {
    const { projectToken, broker1, initiator1 } = fixture;

    let timestamp = await time.latest();

    // tokenizeProject
    await callTransaction(
        reentrancyContract.updateReentrancyPlan(
            projectToken.address,
            projectToken.interface.encodeFunctionData('safeTokenizeProject', [
                BigNumber.from(1),
                initiator1.address,
                broker1.address,
                ethers.utils.keccak256(ethers.utils.toUtf8Bytes('launch_uri_1')),
            ])
        )
    );

    await assertion(timestamp);

    // withdrawEstateToken
    timestamp += 10;

    await callTransaction(
        reentrancyContract.updateReentrancyPlan(
            projectToken.address,
            projectToken.interface.encodeFunctionData('withdrawEstateToken', [1])
        )
    );

    await assertion(timestamp);
}

describe('7.2. ProjectToken', async () => {
    afterEach(async () => {
        await ethers.provider.send('evm_setAutomine', [true]);

        const fixture = await beforeProjectTokenTest();
        const { prestigePad } = fixture;

        prestigePad.isFinalized.reset();
        prestigePad.allocationOfAt.reset();
    });

    async function projectTokenFixture(): Promise<ProjectTokenFixture> {
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
            requester1,
            requester2,
            broker1,
            broker2,
            depositor1,
            depositor2,
            depositor3,
            initiator1,
            initiator2,
            custodian1,
            custodian2,
        ] = await ethers.getSigners();
        const admins = [admin1, admin2, admin3, admin4, admin5];
        const depositors = [depositor1, depositor2, depositor3];
        const initiators = [initiator1, initiator2];
        const custodians = [custodian1, custodian2];

        const adminAddresses: string[] = admins.map((signer) => signer.address);
        const admin = (await deployAdmin(
            deployer.address,
            adminAddresses[0],
            adminAddresses[1],
            adminAddresses[2],
            adminAddresses[3],
            adminAddresses[4]
        )) as Admin;

        const feeReceiver = (await deployFeeReceiver(deployer.address, admin.address)) as FeeReceiver;

        const priceWatcher = (await deployPriceWatcher(deployer.address, admin.address)) as PriceWatcher;

        const reserveVault = (await deployReserveVault(deployer.address, admin.address)) as ReserveVault;

        const currency = (await deployCurrency(deployer.address, 'MockCurrency', 'MCK')) as Currency;

        const validator = new MockValidator(deployer as any);

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

        const commissionToken = (await deployCommissionToken(
            deployer,
            admin.address,
            estateToken.address,
            feeReceiver.address,
            LandInitialization.COMMISSION_TOKEN_Name,
            LandInitialization.COMMISSION_TOKEN_Symbol,
            LandInitialization.COMMISSION_TOKEN_BaseURI,
            LandInitialization.COMMISSION_TOKEN_RoyaltyRate
        )) as CommissionToken;

        await callTransaction(
            getEstateTokenTxByInput_UpdateCommissionToken(
                estateToken as any,
                deployer,
                { commissionToken: commissionToken.address },
                admin,
                admins
            )
        );

        const projectToken = (await deployMockProjectToken(
            deployer.address,
            admin.address,
            estateToken.address,
            feeReceiver.address,
            validator.getAddress(),
            LaunchInitialization.PROJECT_TOKEN_BaseURI
        )) as MockProjectToken;

        const MockPrestigePadFactory = await smock.mock<MockPrestigePad__factory>('MockPrestigePad');
        let launchpads: any[] = [];
        for (let i = 0; i < 6; ++i) {
            const mockPrestigePad = await MockPrestigePadFactory.deploy();
            await callTransaction(
                mockPrestigePad.initialize(
                    admin.address,
                    projectToken.address,
                    priceWatcher.address,
                    feeReceiver.address,
                    reserveVault.address,
                    validator.getAddress(),
                    LaunchInitialization.PRESTIGE_PAD_BaseMinUnitPrice,
                    LaunchInitialization.PRESTIGE_PAD_BaseMaxUnitPrice
                )
            );
            launchpads.push(mockPrestigePad);
        }

        const prestigePad = launchpads[0];
        launchpads = launchpads.slice(1);

        const zone1 = ethers.utils.formatBytes32String('TestZone1');
        const zone2 = ethers.utils.formatBytes32String('TestZone2');

        const reentrancyReceiver = (await deployReentrancyReceiver(deployer, true, true)) as ReentrancyReceiver;
        const failReceiver = (await deployFailReceiver(deployer.address, false, false)) as FailReceiver;

        return {
            deployer,
            admins,
            manager,
            moderator,
            user,
            requester1,
            requester2,
            broker1,
            broker2,
            depositor1,
            depositor2,
            depositor3,
            depositors,
            initiator1,
            initiator2,
            initiators,
            custodian1,
            custodian2,
            custodians,
            validator,
            admin,
            currency,
            feeReceiver,
            priceWatcher,
            reserveVault,
            commissionToken,
            estateToken,
            projectToken,
            prestigePad,
            launchpads,
            reentrancyReceiver,
            failReceiver,
            zone1,
            zone2,
        };
    }

    async function beforeProjectTokenTest({
        skipAuthorizeLaunchpad = false,
        skipAuthorizeExecutive = false,
        skipAddProjectTokenAsTokenizer = false,
        skipAddCustodianAsEstateCustodian = false,
        skipRegisterBroker = false,
        skipDeclareZone = false,
        useReentrancyReceiverAsDepositor = false,
        useFailReceiverAsDepositor = false,
        addSampleProjects = false,
        deprecateProjects = false,
        mintProjectTokenForDepositor = false,
        tokenizeProject = false,
        pause = false,
    } = {}): Promise<ProjectTokenFixture> {
        const fixture = await loadFixture(projectTokenFixture);
        const {
            deployer,
            admin,
            admins,
            manager,
            moderator,
            estateToken,
            projectToken,
            prestigePad,
            zone1,
            zone2,
            initiator1,
            initiator2,
            custodian1,
            custodian2,
            validator,
            commissionToken,
            broker1,
            broker2,
            depositor2,
            depositor3,
            reentrancyReceiver,
            failReceiver,
        } = fixture;

        let depositor1 = fixture.depositor1;
        if (useReentrancyReceiverAsDepositor) {
            depositor1 = reentrancyReceiver;
        }
        if (useFailReceiverAsDepositor) {
            depositor1 = failReceiver;
        }

        if (!skipAuthorizeExecutive) {
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
        }

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

        if (!skipDeclareZone) {
            for (const zone of [zone1, zone2]) {
                await callTransaction(getAdminTxByInput_DeclareZone(admin, deployer, { zone }, admins));
            }
        }

        if (!skipAddProjectTokenAsTokenizer) {
            await callTransaction(
                getEstateTokenTxByInput_AuthorizeTokenizers(
                    estateToken as any,
                    deployer,
                    {
                        accounts: [projectToken.address],
                        isTokenizer: true,
                    },
                    admin,
                    admins
                )
            );
        }

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

        if (!skipRegisterBroker) {
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
        }

        if (!skipAddCustodianAsEstateCustodian) {
            await callTransaction(
                getEstateTokenTxByInput_RegisterCustodian(
                    estateToken as any,
                    manager,
                    {
                        zone: zone1,
                        custodian: custodian1.address,
                        uri: 'custodian1_zone1_uri',
                    },
                    validator
                )
            );
            await callTransaction(
                getEstateTokenTxByInput_RegisterCustodian(
                    estateToken as any,
                    manager,
                    {
                        zone: zone2,
                        custodian: custodian2.address,
                        uri: 'custodian2_zone2_uri',
                    },
                    validator
                )
            );
        }

        if (addSampleProjects) {
            await callTransaction(
                getCallProjectTokenTx_LaunchProject(projectToken as any, prestigePad, {
                    zone: zone1,
                    launchId: BigNumber.from(1),
                    initiator: initiator1.address,
                    uri: 'initiator1_uri',
                })
            );

            await callTransaction(
                getCallProjectTokenTx_LaunchProject(projectToken as any, prestigePad, {
                    zone: zone2,
                    launchId: BigNumber.from(2),
                    initiator: initiator2.address,
                    uri: 'initiator2_uri',
                })
            );
        }

        if (mintProjectTokenForDepositor) {
            await callTransaction(
                getCallProjectTokenTx_Mint(projectToken as any, prestigePad, {
                    projectId: BigNumber.from(1),
                    amount: BigNumber.from(1000),
                })
            );
            await callTransaction(
                getCallProjectTokenTx_Mint(projectToken as any, prestigePad, {
                    projectId: BigNumber.from(2),
                    amount: BigNumber.from(100),
                })
            );

            const data = [
                {
                    projectId: 1,
                    amount: 200,
                    to: depositor1.address,
                },
                {
                    projectId: 1,
                    amount: 300,
                    to: depositor2.address,
                },
                {
                    projectId: 1,
                    amount: 500,
                    to: depositor3.address,
                },
                {
                    projectId: 2,
                    amount: 20,
                    to: depositor1.address,
                },
                {
                    projectId: 2,
                    amount: 30,
                    to: depositor2.address,
                },
                {
                    projectId: 2,
                    amount: 50,
                    to: depositor3.address,
                },
            ];
            for (const item of data) {
                await callTransaction(prestigePad.transfer(item.to, item.projectId, item.amount));
            }
        }

        if (tokenizeProject) {
            prestigePad.isFinalized.whenCalledWith(1).returns(true);
            prestigePad.isFinalized.whenCalledWith(2).returns(true);

            await callTransaction(
                getProjectTokenTxByParams_SafeTokenizeProject(projectToken as any, manager, {
                    projectId: BigNumber.from(1),
                    custodian: custodian1.address,
                    broker: broker1.address,
                })
            );
            await callTransaction(
                getProjectTokenTxByParams_SafeTokenizeProject(projectToken as any, manager, {
                    projectId: BigNumber.from(2),
                    custodian: custodian2.address,
                    broker: broker2.address,
                })
            );
        }

        if (deprecateProjects) {
            await callTransaction(
                getProjectTokenTxByParams_SafeDeprecateProject(projectToken as any, manager, {
                    projectId: BigNumber.from(1),
                    data: 'deprecateProject1',
                })
            );
            await callTransaction(
                getProjectTokenTxByParams_SafeDeprecateProject(projectToken as any, manager, {
                    projectId: BigNumber.from(2),
                    data: 'deprecateProject2',
                })
            );
        }

        if (pause) {
            await callTransaction(getPausableTxByInput_Pause(projectToken, deployer, admin, admins));
        }

        return {
            ...fixture,
            depositor1,
        };
    }

    /* --- Initialization --- */
    describe('7.2.1. initialize(address,address,address,address,string)', async () => {
        it('7.2.1.1. Deploy successfully', async () => {
            const { projectToken, admin, feeReceiver, validator, estateToken } = await beforeProjectTokenTest();

            const tx = projectToken.deployTransaction;
            await expect(tx)
                .to.emit(projectToken, 'BaseURIUpdate')
                .withArgs(LaunchInitialization.PROJECT_TOKEN_BaseURI);

            expect(await projectToken.paused()).to.equal(false);

            expect(await projectToken.projectNumber()).to.equal(0);

            expect(await projectToken.admin()).to.equal(admin.address);
            expect(await projectToken.estateToken()).to.equal(estateToken.address);
            expect(await projectToken.feeReceiver()).to.equal(feeReceiver.address);

            expect(await projectToken.validator()).to.equal(validator.getAddress());

            expect(await projectToken.decimals()).to.equal(Constant.PROJECT_TOKEN_MAX_DECIMALS);
        });
    });

    /* --- Administration --- */
    describe('7.2.2. updateBaseURI(string,bytes[])', async () => {
        it('7.2.2.1. Update base URI successfully with valid signatures', async () => {
            const { deployer, projectToken, admin, admins } = await beforeProjectTokenTest({
                addSampleProjects: true,
            });

            const paramsInput: UpdateBaseURIParamsInput = {
                uri: 'NewBaseURI:',
            };
            const tx = await getCommissionTokenTxByInput_UpdateBaseURI(
                projectToken as any,
                deployer,
                paramsInput,
                admin,
                admins
            );
            await tx.wait();

            await expect(tx).to.emit(projectToken, 'BaseURIUpdate').withArgs('NewBaseURI:');

            expect(await projectToken.uri(1)).to.equal('NewBaseURI:initiator1_uri');
            expect(await projectToken.uri(2)).to.equal('NewBaseURI:initiator2_uri');
        });

        it('7.2.2.2. Update base URI unsuccessfully with invalid signatures', async () => {
            const { deployer, projectToken, admin, admins } = await beforeProjectTokenTest();

            const paramsInput: UpdateBaseURIParamsInput = {
                uri: 'NewBaseURI:',
            };
            const params: UpdateBaseURIParams = {
                ...paramsInput,
                signatures: await getUpdateBaseURISignatures(projectToken as any, paramsInput, admin, admins, false),
            };
            await expect(
                getCommissionTokenTx_UpdateBaseURI(projectToken as any, deployer, params)
            ).to.be.revertedWithCustomError(admin, 'FailedVerification');
        });
    });

    describe('7.2.3. updateZoneRoyaltyRate(bytes32,uint256,bytes[])', async () => {
        it('7.2.3.1. Update zone royalty rate successfully with valid signatures', async () => {
            const fixture = await beforeProjectTokenTest();
            const { deployer, projectToken, admin, admins, zone1, zone2 } = fixture;

            const paramsInput1: UpdateZoneRoyaltyRateParamsInput = {
                zone: zone1,
                royaltyRate: ethers.utils.parseEther('0.2'),
            };
            const tx1 = await getProjectTokenTxByInput_UpdateZoneRoyaltyRate(
                projectToken as any,
                deployer,
                paramsInput1,
                admin,
                admins
            );
            await tx1.wait();

            await expect(tx1)
                .to.emit(projectToken, 'ZoneRoyaltyRateUpdate')
                .withArgs(zone1, (rate: any) => {
                    expect(structToObject(rate)).to.deep.equal({
                        value: paramsInput1.royaltyRate,
                        decimals: Constant.COMMON_RATE_DECIMALS,
                    });
                    return true;
                });

            expect(structToObject(await projectToken.getZoneRoyaltyRate(zone1))).to.deep.equal({
                value: paramsInput1.royaltyRate,
                decimals: Constant.COMMON_RATE_DECIMALS,
            });

            const paramsInput2: UpdateZoneRoyaltyRateParamsInput = {
                zone: zone2,
                royaltyRate: ethers.utils.parseEther('0.3'),
            };
            const tx2 = await getProjectTokenTxByInput_UpdateZoneRoyaltyRate(
                projectToken as any,
                deployer,
                paramsInput2,
                admin,
                admins
            );
            await tx2.wait();

            await expect(tx2)
                .to.emit(projectToken, 'ZoneRoyaltyRateUpdate')
                .withArgs(zone2, (rate: any) => {
                    expect(structToObject(rate)).to.deep.equal({
                        value: paramsInput2.royaltyRate,
                        decimals: Constant.COMMON_RATE_DECIMALS,
                    });
                    return true;
                });

            expect(structToObject(await projectToken.getZoneRoyaltyRate(zone2))).to.deep.equal({
                value: paramsInput2.royaltyRate,
                decimals: Constant.COMMON_RATE_DECIMALS,
            });
        });

        it('7.2.3.2. Update zone royalty rate unsuccessfully with invalid signatures', async () => {
            const fixture = await beforeProjectTokenTest();
            const { deployer, projectToken, admin, admins, zone1 } = fixture;

            const paramsInput: UpdateZoneRoyaltyRateParamsInput = {
                zone: zone1,
                royaltyRate: ethers.utils.parseEther('0.2'),
            };
            const params: UpdateZoneRoyaltyRateParams = {
                ...paramsInput,
                signatures: await getUpdateZoneRoyaltyRateSignatures(
                    projectToken as any,
                    paramsInput,
                    admin,
                    admins,
                    false
                ),
            };
            await expect(
                getProjectTokenTx_UpdateZoneRoyaltyRate(projectToken as any, deployer, params)
            ).to.be.revertedWithCustomError(admin, 'FailedVerification');
        });

        it('7.2.3.3. Update zone royalty rate unsuccessfully with invalid rate', async () => {
            const fixture = await beforeProjectTokenTest();
            const { deployer, projectToken, admin, admins, zone1 } = fixture;

            await expect(
                getProjectTokenTxByInput_UpdateZoneRoyaltyRate(
                    projectToken as any,
                    deployer,
                    {
                        zone: zone1,
                        royaltyRate: Constant.COMMON_RATE_MAX_FRACTION.add(1),
                    },
                    admin,
                    admins
                )
            ).to.be.revertedWithCustomError(projectToken, 'InvalidRate');
        });

        it('7.2.3.4. Update zone royalty rate unsuccessfully with invalid zone', async () => {
            const fixture = await beforeProjectTokenTest();
            const { deployer, projectToken, admin, admins } = fixture;

            await expect(
                getProjectTokenTxByInput_UpdateZoneRoyaltyRate(
                    projectToken as any,
                    deployer,
                    {
                        zone: ethers.utils.formatBytes32String('invalid zone'),
                        royaltyRate: ethers.utils.parseEther('0.2'),
                    },
                    admin,
                    admins
                )
            ).to.be.revertedWithCustomError(projectToken, 'InvalidZone');
        });
    });

    describe('7.2.4. authorizeLaunchpads(address[],bool,bytes[])', async () => {
        it('7.2.4.1. Authorize launchpads successfully with valid signatures', async () => {
            const { deployer, projectToken, admin, admins, launchpads } = await beforeProjectTokenTest();

            const toBeLaunchpads = launchpads.slice(0, 3);

            const paramsInput: AuthorizeLaunchpadParamsInput = {
                accounts: toBeLaunchpads.map((x) => x.address),
                isLaunchpad: true,
            };
            const tx = await getProjectTokenTxByInput_AuthorizeLaunchpad(
                projectToken as any,
                deployer,
                paramsInput,
                admin,
                admins
            );
            await tx.wait();

            for (const launchpad of toBeLaunchpads) {
                await expect(tx).to.emit(projectToken, 'LaunchpadAuthorization').withArgs(launchpad.address);
            }

            for (const launchpad of launchpads) {
                const isLaunchpad = await projectToken.isLaunchpad(launchpad.address);
                if (toBeLaunchpads.includes(launchpad)) {
                    expect(isLaunchpad).to.be.true;
                } else {
                    expect(isLaunchpad).to.be.false;
                }
            }
        });

        it('7.2.4.2. Authorize launchpads unsuccessfully with invalid signatures', async () => {
            const { deployer, projectToken, admin, admins, launchpads } = await beforeProjectTokenTest();

            const toBeLaunchpads = launchpads.slice(0, 3);

            const paramsInput: AuthorizeLaunchpadParamsInput = {
                accounts: toBeLaunchpads.map((x) => x.address),
                isLaunchpad: true,
            };
            const params: AuthorizeLaunchpadParams = {
                ...paramsInput,
                signatures: await getAuthorizeLaunchpadSignatures(
                    projectToken as any,
                    paramsInput,
                    admin,
                    admins,
                    false
                ),
            };
            await expect(
                getProjectTokenTx_AuthorizeLaunchpad(projectToken as any, deployer, params)
            ).to.be.revertedWithCustomError(admin, 'FailedVerification');
        });

        it('7.2.4.3. Authorize launchpads unsuccessfully with EOA', async () => {
            const { deployer, projectToken, admin, admins } = await beforeProjectTokenTest();

            const invalidLaunchpad = randomWallet();

            await expect(
                getProjectTokenTxByInput_AuthorizeLaunchpad(
                    projectToken as any,
                    deployer,
                    {
                        accounts: [invalidLaunchpad.address],
                        isLaunchpad: true,
                    },
                    admin,
                    admins
                )
            ).to.be.revertedWithCustomError(projectToken, 'InvalidLaunchpad');
        });

        it('7.2.4.4. Authorize launchpads reverted when contract does not support ProjectLaunchpad interface', async () => {
            const { deployer, projectToken, admin, admins } = await beforeProjectTokenTest();

            await expect(
                getProjectTokenTxByInput_AuthorizeLaunchpad(
                    projectToken as any,
                    deployer,
                    {
                        accounts: [projectToken.address],
                        isLaunchpad: true,
                    },
                    admin,
                    admins
                )
            ).to.be.revertedWithCustomError(projectToken, 'InvalidLaunchpad');
        });

        it('7.2.4.5. Authorize launchpads unsuccessfully when authorizing the same account twice on the same tx', async () => {
            const { deployer, projectToken, admin, admins, launchpads } = await beforeProjectTokenTest();

            const duplicateLaunchpads = [launchpads[0], launchpads[1], launchpads[2], launchpads[0]];

            await expect(
                getProjectTokenTxByInput_AuthorizeLaunchpad(
                    projectToken as any,
                    deployer,
                    {
                        accounts: duplicateLaunchpads.map((x) => x.address),
                        isLaunchpad: true,
                    },
                    admin,
                    admins
                )
            ).to.be.revertedWithCustomError(projectToken, `AuthorizedAccount`);
        });

        it('7.7.2.3. Authorize launchpads unsuccessfully when authorizing the same account twice on different txs', async () => {
            const { deployer, projectToken, admin, admins, launchpads } = await beforeProjectTokenTest();

            const tx1Launchpads = launchpads.slice(0, 3);
            await callTransaction(
                getProjectTokenTxByInput_AuthorizeLaunchpad(
                    projectToken as any,
                    deployer,
                    {
                        accounts: tx1Launchpads.map((x) => x.address),
                        isLaunchpad: true,
                    },
                    admin,
                    admins
                )
            );

            const tx2Launchpads = [launchpads[3], launchpads[2], launchpads[4]];
            await expect(
                getProjectTokenTxByInput_AuthorizeLaunchpad(
                    projectToken as any,
                    deployer,
                    {
                        accounts: tx2Launchpads.map((x) => x.address),
                        isLaunchpad: true,
                    },
                    admin,
                    admins
                )
            ).to.be.revertedWithCustomError(projectToken, `AuthorizedAccount`);
        });

        async function setupLaunchpads(fixture: ProjectTokenFixture) {
            const { deployer, projectToken, admin, admins, launchpads } = fixture;

            await callTransaction(
                getProjectTokenTxByInput_AuthorizeLaunchpad(
                    projectToken as any,
                    deployer,
                    {
                        accounts: launchpads.map((x) => x.address),
                        isLaunchpad: true,
                    },
                    admin,
                    admins
                )
            );
        }

        it('7.2.4.6. Deauthorize launchpads successfully', async () => {
            const fixture = await beforeProjectTokenTest();
            const { deployer, projectToken, admin, admins, launchpads } = fixture;

            await setupLaunchpads(fixture);

            const toDeauth = launchpads.slice(0, 2);
            const tx = await getProjectTokenTxByInput_AuthorizeLaunchpad(
                projectToken as any,
                deployer,
                {
                    accounts: toDeauth.map((x) => x.address),
                    isLaunchpad: false,
                },
                admin,
                admins
            );
            await tx.wait();

            for (const launchpad of toDeauth) {
                await expect(tx).to.emit(projectToken, 'LaunchpadDeauthorization').withArgs(launchpad.address);
            }

            for (const launchpad of launchpads) {
                const isLaunchpad = await projectToken.isLaunchpad(launchpad.address);
                if (toDeauth.includes(launchpad)) {
                    expect(isLaunchpad).to.be.false;
                } else {
                    expect(isLaunchpad).to.be.true;
                }
            }
        });

        it('7.2.4.7. Deauthorize launchpads unsuccessfully with unauthorized account', async () => {
            const fixture = await beforeProjectTokenTest();
            const { deployer, projectToken, admin, admins, launchpads } = fixture;

            await setupLaunchpads(fixture);

            const account = randomWallet();
            const toDeauth = [launchpads[0], account];

            await expect(
                getProjectTokenTxByInput_AuthorizeLaunchpad(
                    projectToken as any,
                    deployer,
                    {
                        accounts: toDeauth.map((x) => x.address),
                        isLaunchpad: false,
                    },
                    admin,
                    admins
                )
            ).to.be.revertedWithCustomError(projectToken, `NotAuthorizedAccount`);
        });

        it('7.2.4.8. Deauthorize launchpads unsuccessfully when unauthorizing the same account twice on the same tx', async () => {
            const fixture = await beforeProjectTokenTest();
            const { deployer, projectToken, admin, admins, launchpads } = fixture;

            await setupLaunchpads(fixture);

            const toDeauth = launchpads.slice(0, 2).concat([launchpads[0]]);
            await expect(
                getProjectTokenTxByInput_AuthorizeLaunchpad(
                    projectToken as any,
                    deployer,
                    {
                        accounts: toDeauth.map((x) => x.address),
                        isLaunchpad: false,
                    },
                    admin,
                    admins
                )
            ).to.be.revertedWithCustomError(projectToken, `NotAuthorizedAccount`);
        });

        it('7.2.4.9. Deauthorize launchpads unsuccessfully when unauthorizing the same account twice on different txs', async () => {
            const fixture = await beforeProjectTokenTest();
            const { deployer, projectToken, admin, admins, launchpads } = fixture;

            await setupLaunchpads(fixture);

            const tx1Accounts = launchpads.slice(0, 2);
            await callTransaction(
                getProjectTokenTxByInput_AuthorizeLaunchpad(
                    projectToken as any,
                    deployer,
                    {
                        accounts: tx1Accounts.map((x) => x.address),
                        isLaunchpad: false,
                    },
                    admin,
                    admins
                )
            );

            const tx2Accounts = [launchpads[0]];
            await expect(
                getProjectTokenTxByInput_AuthorizeLaunchpad(
                    projectToken as any,
                    deployer,
                    {
                        accounts: tx2Accounts.map((x) => x.address),
                        isLaunchpad: false,
                    },
                    admin,
                    admins
                )
            ).to.be.revertedWithCustomError(projectToken, `NotAuthorizedAccount`);
        });
    });

    /* --- Query --- */
    describe('7.2.5. isInitiatorIn(bytes32,address)', async () => {
        it('7.2.5.1. Return correct value', async () => {
            const fixture = await beforeProjectTokenTest();
            const { projectToken, manager, initiator1, initiator2, zone1, zone2, validator } = fixture;

            const paramsInput: RegisterInitiatorParamsInput = {
                zone: zone1,
                initiator: initiator1.address,
                uri: 'initiator_uri',
            };

            await callTransaction(
                getProjectTokenTxByInput_RegisterInitiator(projectToken as any, manager, paramsInput, validator)
            );

            expect(await projectToken.isInitiatorIn(zone1, initiator1.address)).to.be.true;
            expect(await projectToken.isInitiatorIn(zone1, initiator2.address)).to.be.false;
            expect(await projectToken.isInitiatorIn(zone2, initiator1.address)).to.be.false;
            expect(await projectToken.isInitiatorIn(zone2, initiator2.address)).to.be.false;
        });
    });

    describe('7.2.6. getProject(uint256)', async () => {
        it('7.2.6.1. Return with valid project id', async () => {
            const fixture = await beforeProjectTokenTest({
                addSampleProjects: true,
            });
            const { projectToken } = fixture;

            await expect(projectToken.getProject(1)).to.not.be.reverted;
            await expect(projectToken.getProject(2)).to.not.be.reverted;
        });

        it('7.2.6.2. Revert with invalid project id', async () => {
            const fixture = await beforeProjectTokenTest();
            const { projectToken } = fixture;

            await expect(projectToken.getProject(0)).to.be.revertedWithCustomError(projectToken, `InvalidProjectId`);
            await expect(projectToken.getProject(100)).to.be.revertedWithCustomError(projectToken, `InvalidProjectId`);
        });
    });

    describe('7.2.7. getRepresentative(uint256)', async () => {
        it('7.2.7.1. Return correct value', async () => {
            const fixture = await beforeProjectTokenTest({
                addSampleProjects: true,
            });
            const { projectToken, initiator1, initiator2 } = fixture;

            expect(await projectToken.getRepresentative(1)).to.equal(initiator1.address);
            expect(await projectToken.getRepresentative(2)).to.equal(initiator2.address);
        });

        it('7.2.7.2. Revert with invalid project id', async () => {
            const fixture = await beforeProjectTokenTest();
            const { projectToken } = fixture;

            await expect(projectToken.getRepresentative(0)).to.be.revertedWithCustomError(
                projectToken,
                `InvalidProjectId`
            );
            await expect(projectToken.getRepresentative(100)).to.be.revertedWithCustomError(
                projectToken,
                `InvalidProjectId`
            );
        });
    });

    describe('7.2.8. isAvailable(uint256)', async () => {
        it('7.2.8.1. Return true for undeprecated project and untokenized project', async () => {
            const fixture = await beforeProjectTokenTest({
                addSampleProjects: true,
            });
            const { projectToken } = fixture;

            expect(await projectToken.isAvailable(1)).to.be.true;
            expect(await projectToken.isAvailable(2)).to.be.true;
        });

        it('7.2.8.2. Return false for deprecated project', async () => {
            const fixture = await beforeProjectTokenTest({
                addSampleProjects: true,
            });
            const { projectToken, manager } = fixture;

            await callTransaction(
                getProjectTokenTxByParams_SafeDeprecateProject(projectToken as any, manager, {
                    projectId: BigNumber.from(1),
                    data: 'deprecateProject1',
                })
            );
            await callTransaction(
                getProjectTokenTxByParams_SafeDeprecateProject(projectToken as any, manager, {
                    projectId: BigNumber.from(2),
                    data: 'deprecateProject2',
                })
            );

            expect(await projectToken.isAvailable(1)).to.be.false;
            expect(await projectToken.isAvailable(2)).to.be.false;
        });

        it('7.2.8.3. Return false for tokenized project', async () => {
            const fixture = await beforeProjectTokenTest({
                addSampleProjects: true,
                mintProjectTokenForDepositor: true,
                tokenizeProject: true,
            });
            const { projectToken } = fixture;

            expect(await projectToken.isAvailable(1)).to.be.false;
            expect(await projectToken.isAvailable(2)).to.be.false;
        });
    });

    describe('7.2.9. zoneOf(uint256)', async () => {
        it('7.2.9.1. Return correct zone', async () => {
            const fixture = await beforeProjectTokenTest({
                addSampleProjects: true,
            });
            const { projectToken, zone1, zone2 } = fixture;

            expect(await projectToken.zoneOf(1)).to.equal(zone1);
            expect(await projectToken.zoneOf(2)).to.equal(zone2);
        });

        it('7.2.9.2. Revert with invalid project id', async () => {
            const fixture = await beforeProjectTokenTest();
            const { projectToken, depositor1 } = fixture;

            await expect(projectToken.connect(depositor1).zoneOf(0)).to.be.revertedWithCustomError(
                projectToken,
                `InvalidProjectId`
            );

            await expect(projectToken.connect(depositor1).zoneOf(100)).to.be.revertedWithCustomError(
                projectToken,
                `InvalidProjectId`
            );
        });
    });

    describe('7.2.10. balanceOf(address,uint256)', async () => {
        it('7.2.10.1. Return correct project token balance', async () => {
            const fixture = await beforeProjectTokenTest({
                addSampleProjects: true,
                mintProjectTokenForDepositor: true,
                tokenizeProject: true,
            });
            const { projectToken, depositor1, depositor2, depositor3 } = fixture;

            expect(await projectToken.balanceOf(depositor1.address, 1)).to.equal(200);
            expect(await projectToken.balanceOf(depositor2.address, 1)).to.equal(300);
            expect(await projectToken.balanceOf(depositor3.address, 1)).to.equal(500);

            expect(await projectToken.balanceOf(depositor1.address, 2)).to.equal(20);
            expect(await projectToken.balanceOf(depositor2.address, 2)).to.equal(30);
            expect(await projectToken.balanceOf(depositor3.address, 2)).to.equal(50);
        });

        it('7.2.10.2. Return zero for invalid project id', async () => {
            const fixture = await beforeProjectTokenTest({
                addSampleProjects: true,
                mintProjectTokenForDepositor: true,
                tokenizeProject: true,
            });

            const { projectToken, depositor1 } = fixture;

            expect(await projectToken.balanceOf(depositor1.address, 0)).to.equal(0);
            expect(await projectToken.balanceOf(depositor1.address, 100)).to.equal(0);
        });

        it('7.2.10.3. Return zero for deprecated project', async () => {
            const fixture = await beforeProjectTokenTest({
                addSampleProjects: true,
                mintProjectTokenForDepositor: true,
                tokenizeProject: true,
                deprecateProjects: true,
            });
            const { projectToken, depositor1, depositor2 } = fixture;

            expect(await projectToken.balanceOf(depositor1.address, 1)).to.equal(0);
            expect(await projectToken.balanceOf(depositor1.address, 1)).to.equal(0);
            expect(await projectToken.balanceOf(depositor1.address, 1)).to.equal(0);

            expect(await projectToken.balanceOf(depositor2.address, 2)).to.equal(0);
            expect(await projectToken.balanceOf(depositor2.address, 2)).to.equal(0);
            expect(await projectToken.balanceOf(depositor2.address, 2)).to.equal(0);
        });
    });

    describe('7.2.11. balanceOfAt(address,uint256,uint256)', () => {
        it('7.2.11.1. Return correct project token balance', async () => {
            const fixture = await beforeProjectTokenTest({
                addSampleProjects: true,
                mintProjectTokenForDepositor: true,
                tokenizeProject: true,
            });
            const { projectToken, depositor1, depositor2, depositor3 } = fixture;

            const timestamp = await time.latest();

            expect(await projectToken.balanceOfAt(depositor1.address, 1, timestamp)).to.equal(200);
            expect(await projectToken.balanceOfAt(depositor2.address, 1, timestamp)).to.equal(300);
            expect(await projectToken.balanceOfAt(depositor3.address, 1, timestamp)).to.equal(500);

            expect(await projectToken.balanceOfAt(depositor1.address, 2, timestamp)).to.equal(20);
            expect(await projectToken.balanceOfAt(depositor2.address, 2, timestamp)).to.equal(30);
            expect(await projectToken.balanceOfAt(depositor3.address, 2, timestamp)).to.equal(50);
        });

        it('7.2.11.2. Return correct project token balance in random tests', async () => {
            const fixture = await beforeProjectTokenTest({
                addSampleProjects: true,
            });
            const { projectToken, prestigePad, depositors } = fixture;

            prestigePad.allocationOfAt.returns(1234);

            const amounts = [];
            for (let i = 0; i < 3; ++i) {
                const amount = ethers.BigNumber.from(randomInt(10_000, 30_000));
                amounts.push(amount);
            }

            const totalAmount = amounts.reduce((a, b) => a.add(b), ethers.BigNumber.from(0));

            const projectId = BigNumber.from(1);
            await callTransaction(
                getCallProjectTokenTx_Mint(projectToken as any, prestigePad, {
                    projectId,
                    amount: totalAmount,
                })
            );

            const baseTimestamp = (await time.latest()) + 1000;
            let currentTimestamp = baseTimestamp + 10;

            await ethers.provider.send('evm_setAutomine', [false]);

            const snapshots = [];
            for (let i = 0; i < 3; ++i) {
                snapshots.push(new OrderedMap<number, BigNumber>(ethers.BigNumber.from(0)));
            }

            await time.setNextBlockTimestamp(currentTimestamp);

            const txs = [];
            for (let i = 0; i < 3; ++i) {
                const tx = await prestigePad.transfer(depositors[i].address, projectId, amounts[i]);
                txs.push(tx);
            }

            await ethers.provider.send('evm_mine', []);

            const receipts = await Promise.all(txs.map((tx) => tx.wait()));
            for (const [i, receipt] of receipts.entries()) {
                const timestamp = (await ethers.provider.getBlock(receipt.blockNumber!)).timestamp;
                snapshots[i].set(timestamp, snapshots[i].get(timestamp).add(amounts[i]));
            }

            for (let iter = 0; iter < 20; ++iter) {
                const initBalances: BigNumber[] = [];
                for (let i = 0; i < 3; ++i) {
                    initBalances.push(await projectToken.balanceOf(depositors[i].address, projectId));
                }

                let balances = [...initBalances];
                const txCount = 10;
                const txs = [];
                const records = [];

                for (let i_tx = 0; i_tx < txCount; ++i_tx) {
                    let from = randomInt(0, 3);
                    let to = randomInt(0, 3);
                    if (from == to) {
                        --i_tx;
                        continue;
                    }

                    if (balances[from].eq(0)) {
                        --i_tx;
                        continue;
                    }

                    const amount = randomBigNumber(ethers.BigNumber.from(1), balances[from]);

                    const tx = await projectToken
                        .connect(depositors[from])
                        .safeTransferFrom(
                            depositors[from].address,
                            depositors[to].address,
                            projectId,
                            amount,
                            ethers.utils.formatBytes32String(''),
                            { gasLimit: 1e6 }
                        );
                    txs.push(tx);

                    balances[from] = balances[from].sub(amount);
                    balances[to] = balances[to].add(amount);
                    records.push({ from, to, amount });
                }

                await ethers.provider.send('evm_mine', []);

                const receipts = await Promise.all(txs.map((tx) => tx.wait()));
                balances = [...initBalances];
                for (const [i, receipt] of receipts.entries()) {
                    const { from, to, amount } = records[i];
                    const timestamp = (await ethers.provider.getBlock(receipt.blockNumber!)).timestamp;

                    balances[from] = balances[from].sub(amount);
                    balances[to] = balances[to].add(amount);

                    snapshots[from].set(timestamp, balances[from]);
                    snapshots[to].set(timestamp, balances[to]);
                }

                const lastTimestamp = (await ethers.provider.getBlock('latest')).timestamp;
                for (let deltaT = -1; deltaT <= lastTimestamp - currentTimestamp; ++deltaT) {
                    const t = currentTimestamp + deltaT;
                    for (let i = 0; i < 3; ++i) {
                        const expectedBalance = snapshots[i].get(t);
                        const actualBalance = await projectToken.balanceOfAt(depositors[i].address, projectId, t);
                        expect(actualBalance).to.equal(expectedBalance);
                    }
                }
            }
        });

        it('7.2.11.3. Revert with invalid project id', async () => {
            const fixture = await beforeProjectTokenTest();
            const { projectToken, depositor1 } = fixture;

            let timestamp = await time.latest();

            await expect(projectToken.balanceOfAt(depositor1.address, 0, timestamp)).to.be.revertedWithCustomError(
                projectToken,
                `InvalidProjectId`
            );

            await expect(projectToken.balanceOfAt(depositor1.address, 100, timestamp)).to.be.revertedWithCustomError(
                projectToken,
                `InvalidProjectId`
            );
        });

        it('7.2.11.4. Revert with timestamp after current timestamp', async () => {
            const fixture = await beforeProjectTokenTest({
                addSampleProjects: true,
                mintProjectTokenForDepositor: true,
                tokenizeProject: true,
            });
            const { projectToken, depositor1 } = fixture;

            let timestamp = await time.latest();

            await expect(projectToken.balanceOfAt(depositor1.address, 1, timestamp - 1)).to.be.not.reverted;
            await expect(projectToken.balanceOfAt(depositor1.address, 1, timestamp)).to.be.not.reverted;
            await expect(projectToken.balanceOfAt(depositor1.address, 1, timestamp + 1)).to.be.revertedWithCustomError(
                projectToken,
                `InvalidTimestamp`
            );
        });

        it('7.2.11.5. Revert with timestamp after deprecation', async () => {
            const fixture = await beforeProjectTokenTest({
                addSampleProjects: true,
                mintProjectTokenForDepositor: true,
                tokenizeProject: true,
                deprecateProjects: true,
            });
            const { projectToken, depositor1 } = fixture;

            let deprecateAt = (await projectToken.getProject(1)).deprecateAt;

            await expect(projectToken.balanceOfAt(depositor1.address, 1, deprecateAt - 1)).to.be.not.reverted;
            await expect(projectToken.balanceOfAt(depositor1.address, 1, deprecateAt)).to.be.not.reverted;
            await expect(
                projectToken.balanceOfAt(depositor1.address, 1, deprecateAt + 1)
            ).to.be.revertedWithCustomError(projectToken, `InvalidTimestamp`);
        });
    });

    describe('7.2.12. allocationOfAt(address,uint256,uint256)', () => {
        it('7.2.12.1. Return correct allocation for tokenized project', async () => {
            const fixture = await beforeProjectTokenTest({
                addSampleProjects: true,
            });

            const { projectToken, prestigePad, depositors, manager, broker1, custodian1 } = fixture;

            const projectId = BigNumber.from(1);
            const depositor = depositors[0];

            const expectedAllocations = new OrderedMap<number, BigNumber>(ethers.BigNumber.from(0));
            expectedAllocations.set(0, BigNumber.from(0));

            function prestigePadAllocation(timestamp: number) {
                return BigNumber.from(timestamp).mul(10);
            }

            const timePivots = new Set<number>();
            function addTimePivot(timestamp: number) {
                if (timestamp > 0) {
                    timePivots.add(timestamp - 1);
                }
                timePivots.add(timestamp);
                timePivots.add(timestamp + 1);

                prestigePad.allocationOfAt
                    .whenCalledWith(depositor.address, projectId, timestamp)
                    .returns(prestigePadAllocation(timestamp));
            }

            async function assertCorrectAllocation(firstTimestamp: number, currentTimestamp: number) {
                for (const timestamp of timePivots) {
                    if (timestamp > currentTimestamp || timestamp < firstTimestamp) {
                        break;
                    }
                    expect(await projectToken.allocationOfAt(depositor.address, projectId, timestamp)).to.equal(
                        expectedAllocations.get(timestamp).add(prestigePadAllocation(timestamp))
                    );
                }
            }

            await callTransaction(
                getCallProjectTokenTx_Mint(projectToken as any, prestigePad, {
                    projectId,
                    amount: BigNumber.from(1000),
                })
            );

            // First token transfer
            const amount1 = BigNumber.from(200);

            let timestamp = (await time.latest()) + 100;
            await callTransactionAtTimestamp(prestigePad.transfer(depositor.address, projectId, amount1), timestamp);

            expectedAllocations.set(timestamp, amount1);

            addTimePivot(timestamp);

            // Second token transfer
            const amount2 = BigNumber.from(400);

            timestamp += 10;
            await callTransactionAtTimestamp(prestigePad.transfer(depositor.address, projectId, amount2), timestamp);

            expectedAllocations.set(timestamp, amount2);

            addTimePivot(timestamp);

            // Tokenize project
            prestigePad.isFinalized.whenCalledWith(projectId).returns(true);

            timestamp += 10;
            const tokenizeAt = timestamp;

            const tokenizeParams: TokenizeProjectParams = {
                projectId: BigNumber.from(1),
                custodian: custodian1.address,
                broker: broker1.address,
            };
            await callTransactionAtTimestamp(
                getProjectTokenTxByParams_SafeTokenizeProject(projectToken, manager, tokenizeParams),
                timestamp
            );

            addTimePivot(timestamp);

            await time.increaseTo(timestamp + 5);
            await assertCorrectAllocation(tokenizeAt, timestamp);

            // Withdraw estate token
            timestamp += 10;
            await callTransactionAtTimestamp(
                getProjectTokenTx_WithdrawEstateToken(projectToken, depositor, {
                    projectId: BigNumber.from(projectId),
                }),
                timestamp
            );

            expectedAllocations.set(timestamp, BigNumber.from(0));

            addTimePivot(timestamp);

            await time.increaseTo(timestamp + 5);
            await assertCorrectAllocation(tokenizeAt, timestamp);
        });

        it('7.2.12.2. Revert with invalid project id', async () => {
            const fixture = await beforeProjectTokenTest();
            const { projectToken, depositor1 } = fixture;

            let timestamp = await time.latest();

            await expect(projectToken.allocationOfAt(depositor1.address, 0, timestamp)).to.be.revertedWithCustomError(
                projectToken,
                `InvalidProjectId`
            );

            await expect(projectToken.allocationOfAt(depositor1.address, 100, timestamp)).to.be.revertedWithCustomError(
                projectToken,
                `InvalidProjectId`
            );
        });

        it('7.2.12.3. Revert with timestamp after current timestamp', async () => {
            const fixture = await beforeProjectTokenTest({
                addSampleProjects: true,
                mintProjectTokenForDepositor: true,
                tokenizeProject: true,
            });
            const { prestigePad, projectToken, depositor1 } = fixture;

            let timestamp = await time.latest();

            prestigePad.allocationOfAt.returns(BigNumber.from(0));

            await expect(projectToken.allocationOfAt(depositor1.address, 1, timestamp - 1)).to.be.not.reverted;
            await expect(projectToken.allocationOfAt(depositor1.address, 1, timestamp)).to.be.not.reverted;
            await expect(
                projectToken.allocationOfAt(depositor1.address, 1, timestamp + 1)
            ).to.be.revertedWithCustomError(projectToken, `InvalidTimestamp`);
        });
    });

    describe('7.2.13. equityOfAt(address,uint256,uint256)', () => {
        it('7.2.13.1. Return correct vote for available project', async () => {
            const fixture = await beforeProjectTokenTest({
                addSampleProjects: true,
            });
            const { prestigePad, projectToken, depositor1, depositor2 } = fixture;

            const baseTimestamp = (await time.latest()) + 1000;

            const projectId1 = 1;
            const launchId1 = (await projectToken.getProject(projectId1)).launchId;

            const projectId2 = 2;
            const launchId2 = (await projectToken.getProject(projectId2)).launchId;

            // Depositor 1, estate 1
            await callTransactionAtTimestamp(
                projectToken.mintTo(depositor1.address, projectId1, 10_000),
                baseTimestamp
            );
            await time.increaseTo(baseTimestamp + 10);

            prestigePad.allocationOfAt.whenCalledWith(depositor1.address, launchId1, baseTimestamp - 1).returns(20_000);
            prestigePad.allocationOfAt.whenCalledWith(depositor1.address, launchId1, baseTimestamp).returns(20_000);
            prestigePad.allocationOfAt
                .whenCalledWith(depositor1.address, launchId1, baseTimestamp + 10)
                .returns(20_000);

            expect(await projectToken.equityOfAt(depositor1.address, projectId1, baseTimestamp - 1)).to.equal(20_000);
            expect(await projectToken.equityOfAt(depositor1.address, projectId1, baseTimestamp)).to.equal(30_000);
            expect(await projectToken.equityOfAt(depositor1.address, projectId1, baseTimestamp + 10)).to.equal(30_000);

            // Depositor 1, estate 2
            await callTransactionAtTimestamp(
                projectToken.mintTo(depositor1.address, projectId2, 40_000),
                baseTimestamp + 20
            );
            await time.increaseTo(baseTimestamp + 30);

            prestigePad.allocationOfAt
                .whenCalledWith(depositor1.address, launchId2, baseTimestamp + 19)
                .returns(80_000);
            prestigePad.allocationOfAt
                .whenCalledWith(depositor1.address, launchId2, baseTimestamp + 20)
                .returns(80_000);
            prestigePad.allocationOfAt
                .whenCalledWith(depositor1.address, launchId2, baseTimestamp + 30)
                .returns(80_000);

            expect(await projectToken.equityOfAt(depositor1.address, projectId2, baseTimestamp + 19)).to.equal(80_000);
            expect(await projectToken.equityOfAt(depositor1.address, projectId2, baseTimestamp + 20)).to.equal(120_000);
            expect(await projectToken.equityOfAt(depositor1.address, projectId2, baseTimestamp + 30)).to.equal(120_000);

            // Depositor 2, estate 1
            await callTransactionAtTimestamp(
                projectToken.mintTo(depositor2.address, projectId1, 160_000),
                baseTimestamp + 40
            );
            await time.increaseTo(baseTimestamp + 50);

            prestigePad.allocationOfAt
                .whenCalledWith(depositor2.address, launchId1, baseTimestamp + 39)
                .returns(320_000);
            prestigePad.allocationOfAt
                .whenCalledWith(depositor2.address, launchId1, baseTimestamp + 40)
                .returns(320_000);
            prestigePad.allocationOfAt
                .whenCalledWith(depositor2.address, launchId1, baseTimestamp + 50)
                .returns(320_000);

            expect(await projectToken.equityOfAt(depositor2.address, projectId1, baseTimestamp + 39)).to.equal(320_000);
            expect(await projectToken.equityOfAt(depositor2.address, projectId1, baseTimestamp + 40)).to.equal(480_000);
            expect(await projectToken.equityOfAt(depositor2.address, projectId1, baseTimestamp + 50)).to.equal(480_000);
        });

        it('7.2.13.2. Revert with invalid project id', async () => {
            const fixture = await beforeProjectTokenTest();
            const { projectToken, depositor1 } = fixture;

            let timestamp = await time.latest();

            await expect(projectToken.equityOfAt(depositor1.address, 0, timestamp)).to.be.revertedWithCustomError(
                projectToken,
                `InvalidProjectId`
            );

            await expect(projectToken.equityOfAt(depositor1.address, 100, timestamp)).to.be.revertedWithCustomError(
                projectToken,
                `InvalidProjectId`
            );
        });

        it('7.2.13.3. Revert with timestamp after current timestamp', async () => {
            const fixture = await beforeProjectTokenTest({
                addSampleProjects: true,
            });
            const { prestigePad, projectToken, depositor1 } = fixture;

            await callTransaction(projectToken.mintTo(depositor1.address, 1, 10_000));

            let timestamp = await time.latest();

            prestigePad.allocationOfAt.returns(0);

            await expect(projectToken.equityOfAt(depositor1.address, 1, timestamp - 1)).to.be.not.reverted;
            await expect(projectToken.equityOfAt(depositor1.address, 1, timestamp)).to.be.not.reverted;
            await expect(projectToken.equityOfAt(depositor1.address, 1, timestamp + 1)).to.be.revertedWithCustomError(
                projectToken,
                `InvalidTimestamp`
            );
        });

        it('7.2.13.4. Revert with timestamp after deprecation', async () => {
            const fixture = await beforeProjectTokenTest({
                addSampleProjects: true,
            });
            const { prestigePad, projectToken, depositor1, manager } = fixture;

            await callTransaction(projectToken.mintTo(depositor1.address, 1, 10_000));

            let timestamp = (await time.latest()) + 10;

            prestigePad.allocationOfAt.returns(0);

            const deprecateParams: DeprecateProjectParams = {
                projectId: BigNumber.from(1),
                data: 'deprecateProject1',
            };
            await callTransactionAtTimestamp(
                getProjectTokenTxByParams_SafeDeprecateProject(projectToken, manager, deprecateParams),
                timestamp
            );

            await time.increaseTo(timestamp + 5);

            await expect(projectToken.equityOfAt(depositor1.address, 1, timestamp - 1)).to.be.not.reverted;
            await expect(projectToken.equityOfAt(depositor1.address, 1, timestamp)).to.be.not.reverted;
            await expect(projectToken.equityOfAt(depositor1.address, 1, timestamp + 1)).to.be.revertedWithCustomError(
                projectToken,
                `InvalidTimestamp`
            );
        });

        it('7.2.13.5. Return 0 for launchpad contract of project', async () => {
            const fixture = await beforeProjectTokenTest({
                addSampleProjects: true,
            });
            const { prestigePad, projectToken } = fixture;

            const baseTimestamp = (await time.latest()) + 1000;

            const projectId1 = 1;
            const launchId1 = (await projectToken.getProject(projectId1)).launchId;

            await callTransactionAtTimestamp(
                projectToken.mintTo(prestigePad.address, projectId1, 10_000),
                baseTimestamp
            );
            await time.increaseTo(baseTimestamp + 10);

            prestigePad.allocationOfAt.whenCalledWith(prestigePad.address, launchId1, baseTimestamp).returns(20_000);
            prestigePad.allocationOfAt
                .whenCalledWith(prestigePad.address, launchId1, baseTimestamp + 10)
                .returns(20_000);

            expect(await projectToken.equityOfAt(prestigePad.address, projectId1, baseTimestamp)).to.equal(0);
            expect(await projectToken.equityOfAt(prestigePad.address, projectId1, baseTimestamp + 10)).to.equal(0);
        });
    });

    describe('7.2.14. totalEquityAt(uint256,uint256)', () => {
        it('7.2.14.1. Return correct total vote for existing project', async () => {
            const fixture = await beforeProjectTokenTest({
                addSampleProjects: true,
            });
            const { projectToken, depositor1, depositor2 } = fixture;

            const projectId1 = 1;
            const projectId2 = 2;
            let minted1 = false;
            let minted2 = false;

            const expectedTotalVote1 = new OrderedMap<number, BigNumber>(ethers.BigNumber.from(0));
            const expectedTotalVote2 = new OrderedMap<number, BigNumber>(ethers.BigNumber.from(0));
            expectedTotalVote1.set(0, BigNumber.from(0));
            expectedTotalVote2.set(0, BigNumber.from(0));

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
                    if (minted1) {
                        expect(await projectToken.totalEquityAt(projectId1, timestamp)).to.equal(
                            expectedTotalVote1.get(timestamp)
                        );
                    }
                    if (minted2) {
                        expect(await projectToken.totalEquityAt(projectId2, timestamp)).to.equal(
                            expectedTotalVote2.get(timestamp)
                        );
                    }
                }
            }

            let timestamp = (await time.latest()) + 100;

            // Mint project 1
            await callTransactionAtTimestamp(projectToken.mintTo(depositor1.address, projectId1, 10_000), timestamp);
            expectedTotalVote1.set(timestamp, BigNumber.from(10_000));
            minted1 = true;

            addTimePivot(timestamp);
            await time.increaseTo(timestamp + 5);
            await assertCorrectAllocation(timestamp);

            // Mint project 2
            timestamp += 10;

            await callTransactionAtTimestamp(projectToken.mintTo(depositor2.address, projectId2, 20_000), timestamp);
            expectedTotalVote2.set(timestamp, BigNumber.from(20_000));
            minted2 = true;

            addTimePivot(timestamp);
            await time.increaseTo(timestamp + 5);
            await assertCorrectAllocation(timestamp);

            // Transfer project 1 to depositor 2
            timestamp += 10;

            await callTransactionAtTimestamp(
                projectToken
                    .connect(depositor1)
                    .safeTransferFrom(depositor1.address, depositor2.address, projectId1, 5_000, '0x'),
                timestamp
            );

            addTimePivot(timestamp);
            await time.increaseTo(timestamp + 5);
            await assertCorrectAllocation(timestamp);

            // Mint project 1 again
            timestamp += 10;

            await callTransactionAtTimestamp(projectToken.mintTo(depositor2.address, projectId1, 40_000), timestamp);
            expectedTotalVote1.set(timestamp, BigNumber.from(50_000));

            addTimePivot(timestamp);
            await time.increaseTo(timestamp + 5);
            await assertCorrectAllocation(timestamp);

            // Mint project 2 again
            timestamp += 10;

            await callTransactionAtTimestamp(projectToken.mintTo(depositor2.address, projectId2, 80_000), timestamp);
            expectedTotalVote2.set(timestamp, BigNumber.from(100_000));

            addTimePivot(timestamp);
            await time.increaseTo(timestamp + 5);
            await assertCorrectAllocation(timestamp);

            // Transfer project 2 to depositor 1
            timestamp += 10;

            await callTransactionAtTimestamp(
                projectToken
                    .connect(depositor2)
                    .safeTransferFrom(depositor2.address, depositor1.address, projectId2, 2_000, '0x'),
                timestamp
            );

            addTimePivot(timestamp);
            await time.increaseTo(timestamp + 5);
            await assertCorrectAllocation(timestamp);
        });

        it('7.2.14.2. Revert with invalid project id', async () => {
            const fixture = await beforeProjectTokenTest();
            const { projectToken } = fixture;

            let timestamp = await time.latest();

            await expect(projectToken.totalEquityAt(0, timestamp)).to.be.revertedWithCustomError(
                projectToken,
                `InvalidProjectId`
            );

            await expect(projectToken.totalEquityAt(100, timestamp)).to.be.revertedWithCustomError(
                projectToken,
                `InvalidProjectId`
            );
        });

        it('7.2.14.3. Revert with timestamp after current timestamp', async () => {
            const fixture = await beforeProjectTokenTest({
                addSampleProjects: true,
            });
            const { prestigePad, projectToken, depositor1 } = fixture;

            await callTransaction(projectToken.mintTo(depositor1.address, 1, 10_000));

            let timestamp = await time.latest();

            prestigePad.allocationOfAt.returns(0);

            await expect(projectToken.totalEquityAt(1, timestamp - 1)).to.be.not.reverted;
            await expect(projectToken.totalEquityAt(1, timestamp)).to.be.not.reverted;
            await expect(projectToken.totalEquityAt(1, timestamp + 1)).to.be.revertedWithCustomError(
                projectToken,
                `InvalidTimestamp`
            );
        });

        it('7.2.14.4. Revert with timestamp before tokenize', async () => {
            const fixture = await beforeProjectTokenTest({
                addSampleProjects: true,
            });
            const { prestigePad, projectToken, depositor1 } = fixture;

            await callTransaction(projectToken.mintTo(depositor1.address, 1, 10_000));

            let timestamp = (await projectToken.getProject(1)).tokenizeAt;

            prestigePad.allocationOfAt.returns(0);

            await expect(projectToken.totalEquityAt(1, timestamp - 1)).to.be.revertedWithCustomError(
                projectToken,
                `InvalidTimestamp`
            );
            await expect(projectToken.totalEquityAt(1, timestamp)).to.be.not.reverted;
            await expect(projectToken.totalEquityAt(1, timestamp + 1)).to.be.not.reverted;
        });

        it('7.2.14.5. Revert with timestamp after deprecation', async () => {
            const fixture = await beforeProjectTokenTest({
                addSampleProjects: true,
            });
            const { prestigePad, projectToken, depositor1 } = fixture;

            await callTransaction(projectToken.mintTo(depositor1.address, 1, 10_000));

            let timestamp = (await projectToken.getProject(1)).deprecateAt;

            await time.increaseTo(timestamp + 5);

            prestigePad.allocationOfAt.returns(0);

            await expect(projectToken.totalEquityAt(1, timestamp - 1)).to.be.not.reverted;
            await expect(projectToken.totalEquityAt(1, timestamp)).to.be.not.reverted;
            await expect(projectToken.totalEquityAt(1, timestamp + 1)).to.be.revertedWithCustomError(
                projectToken,
                `InvalidTimestamp`
            );
        });

        it('7.2.14.6. Returned total vote should be the sum of equityOfAt', async () => {
            const fixture = await beforeProjectTokenTest({
                addSampleProjects: true,
            });
            const { prestigePad, projectToken, depositor1, depositor2 } = fixture;

            const projectId = 1;

            prestigePad.allocationOfAt.returns(0);

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
                    const totalVote = await projectToken.totalEquityAt(projectId, timestamp);
                    const depositor1Vote = await projectToken.equityOfAt(depositor1.address, projectId, timestamp);
                    const depositor2Vote = await projectToken.equityOfAt(depositor2.address, projectId, timestamp);
                    expect(totalVote).to.equal(depositor1Vote.add(depositor2Vote));
                }
            }

            let timestamp = (await time.latest()) + 100;

            // Mint for depositor 1
            await callTransactionAtTimestamp(projectToken.mintTo(depositor1.address, projectId, 10_000), timestamp);

            addTimePivot(timestamp);
            await time.increaseTo(timestamp + 5);
            await assertCorrectAllocation(timestamp);

            // Mint for depositor 2
            timestamp += 10;

            await callTransactionAtTimestamp(projectToken.mintTo(depositor2.address, projectId, 20_000), timestamp);

            addTimePivot(timestamp);
            await time.increaseTo(timestamp + 5);
            await assertCorrectAllocation(timestamp);

            // Transfer from depositor 1 to depositor 2
            timestamp += 10;

            await callTransactionAtTimestamp(
                projectToken
                    .connect(depositor1)
                    .safeTransferFrom(depositor1.address, depositor2.address, projectId, 5_000, '0x'),
                timestamp
            );

            addTimePivot(timestamp);
            await time.increaseTo(timestamp + 5);
            await assertCorrectAllocation(timestamp);

            // Mint for depositor 1 again
            timestamp += 10;

            await callTransactionAtTimestamp(projectToken.mintTo(depositor2.address, projectId, 40_000), timestamp);

            addTimePivot(timestamp);
            await time.increaseTo(timestamp + 5);
            await assertCorrectAllocation(timestamp);

            // Mint for depositor 2 again
            timestamp += 10;

            await callTransactionAtTimestamp(projectToken.mintTo(depositor2.address, projectId, 80_000), timestamp);

            addTimePivot(timestamp);
            await time.increaseTo(timestamp + 5);
            await assertCorrectAllocation(timestamp);

            // Transfer from depositor 2 to depositor 1
            timestamp += 10;

            await callTransactionAtTimestamp(
                projectToken
                    .connect(depositor2)
                    .safeTransferFrom(depositor2.address, depositor1.address, projectId, 2_000, '0x'),
                timestamp
            );

            addTimePivot(timestamp);
            await time.increaseTo(timestamp + 5);
            await assertCorrectAllocation(timestamp);
        });
    });

    describe('7.2.15. getRoyaltyRate(uint256)', async () => {
        it('7.2.15.1. Return correct value', async () => {
            const fixture = await beforeProjectTokenTest({
                addSampleProjects: true,
            });
            const { deployer, admins, admin, projectToken } = fixture;

            const estate1Zone = (await projectToken.getProject(1)).zone;
            await callTransaction(
                getProjectTokenTxByInput_UpdateZoneRoyaltyRate(
                    projectToken as any,
                    deployer,
                    {
                        zone: estate1Zone,
                        royaltyRate: ethers.utils.parseEther('0.1'),
                    },
                    admin,
                    admins
                )
            );

            const estate2Zone = (await projectToken.getProject(2)).zone;
            await callTransaction(
                getProjectTokenTxByInput_UpdateZoneRoyaltyRate(
                    projectToken as any,
                    deployer,
                    {
                        zone: estate2Zone,
                        royaltyRate: ethers.utils.parseEther('0.2'),
                    },
                    admin,
                    admins
                )
            );

            expect(structToObject(await projectToken.getRoyaltyRate(1))).to.deep.equal({
                value: ethers.utils.parseEther('0.1'),
                decimals: Constant.COMMON_RATE_DECIMALS,
            });

            expect(structToObject(await projectToken.getRoyaltyRate(2))).to.deep.equal({
                value: ethers.utils.parseEther('0.2'),
                decimals: Constant.COMMON_RATE_DECIMALS,
            });
        });

        it('7.2.15.2. Revert with invalid project id', async () => {
            const fixture = await beforeProjectTokenTest();
            const { projectToken } = fixture;

            await expect(projectToken.getRoyaltyRate(0)).to.be.revertedWithCustomError(
                projectToken,
                `InvalidProjectId`
            );
            await expect(projectToken.getRoyaltyRate(100)).to.be.revertedWithCustomError(
                projectToken,
                `InvalidProjectId`
            );
        });
    });

    describe('7.2.16. isTokenized(uint256)', async () => {
        it('7.2.16.1. Return true for tokenized project', async () => {
            const fixture = await beforeProjectTokenTest({
                addSampleProjects: true,
                mintProjectTokenForDepositor: true,
                tokenizeProject: true,
            });
            const { projectToken } = fixture;

            expect(await projectToken.isTokenized(1)).to.equal(true);
            expect(await projectToken.isTokenized(2)).to.equal(true);
        });

        it('7.2.16.2. Return false for untokenized project', async () => {
            const fixture = await beforeProjectTokenTest({
                addSampleProjects: true,
                mintProjectTokenForDepositor: true,
            });
            const { projectToken } = fixture;

            expect(await projectToken.isTokenized(1)).to.equal(false);
            expect(await projectToken.isTokenized(2)).to.equal(false);
        });
    });

    describe('2.4.23. supportsInterface(bytes4)', () => {
        it('2.4.23.1. Return true for appropriate interface', async () => {
            const fixture = await beforeProjectTokenTest();
            const { projectToken } = fixture;

            expect(await projectToken.supportsInterface(getBytes4Hex(IAssetTokenInterfaceId))).to.equal(true);
            expect(await projectToken.supportsInterface(getBytes4Hex(IGovernorInterfaceId))).to.equal(true);
            expect(await projectToken.supportsInterface(getBytes4Hex(IEstateTokenizerInterfaceId))).to.equal(true);
            expect(await projectToken.supportsInterface(getBytes4Hex(IERC165UpgradeableInterfaceId))).to.equal(true);
            expect(
                await projectToken.supportsInterface(getBytes4Hex(IERC1155MetadataURIUpgradeableInterfaceId))
            ).to.equal(true);
            expect(await projectToken.supportsInterface(getBytes4Hex(IERC2981UpgradeableInterfaceId))).to.equal(true);
        });
    });

    describe('7.2.17. onERC1155Received(address,address,uint256,uint256,bytes)', async () => {
        it('7.2.17.1. Successfully receive estate token', async () => {
            const fixture = await beforeProjectTokenTest({
                addSampleProjects: true,
                mintProjectTokenForDepositor: true,
                tokenizeProject: true,
            });
            const { depositor1, projectToken, estateToken } = fixture;

            await callTransaction(projectToken.connect(depositor1).withdrawEstateToken(1));

            const estateId = (await projectToken.getProject(1)).estateId;

            await expect(
                estateToken
                    .connect(depositor1)
                    .safeTransferFrom(depositor1.address, projectToken.address, estateId, 50, '0x')
            ).to.not.be.reverted;
        });

        it('7.2.17.2. Successfully receive project token', async () => {
            const fixture = await beforeProjectTokenTest({
                addSampleProjects: true,
                mintProjectTokenForDepositor: true,
            });
            const { projectToken, depositor1 } = fixture;

            await expect(
                projectToken.connect(depositor1).safeTransferFrom(depositor1.address, projectToken.address, 1, 50, '0x')
            ).to.not.be.reverted;
        });

        it('7.2.17.3. Revert when receiving unknown ERC1155 token', async () => {
            const fixture = await beforeProjectTokenTest();
            const { deployer, depositor1, projectToken, admin } = fixture;

            const unknownERC1155Token = await deployGovernor(deployer, admin.address);

            await callTransaction(unknownERC1155Token.connect(depositor1).mint(1, 50));

            await expect(
                unknownERC1155Token
                    .connect(depositor1)
                    .safeTransferFrom(depositor1.address, projectToken.address, 1, 50, '0x')
            ).to.be.revertedWith('ERC1155: ERC1155Receiver rejected tokens');
        });
    });

    describe('7.2.18. onERC1155BatchReceived(address,address,uint256[],uint256[],bytes)', async () => {
        it('7.2.18.1. Successfully receive estate tokens batch', async () => {
            const fixture = await beforeProjectTokenTest({
                addSampleProjects: true,
                mintProjectTokenForDepositor: true,
                tokenizeProject: true,
            });
            const { projectToken, estateToken, depositor1 } = fixture;

            await callTransaction(projectToken.connect(depositor1).withdrawEstateToken(1));
            await callTransaction(projectToken.connect(depositor1).withdrawEstateToken(2));

            const project1 = await projectToken.getProject(1);
            const project2 = await projectToken.getProject(2);
            const estateId1 = project1.estateId;
            const estateId2 = project2.estateId;

            await expect(
                estateToken
                    .connect(depositor1)
                    .safeBatchTransferFrom(
                        depositor1.address,
                        projectToken.address,
                        [estateId1, estateId2],
                        [10, 5],
                        '0x'
                    )
            ).to.not.be.reverted;
        });

        it('7.2.18.2. Successfully receive project tokens batch', async () => {
            const fixture = await beforeProjectTokenTest({
                addSampleProjects: true,
                mintProjectTokenForDepositor: true,
            });
            const { projectToken, depositor1 } = fixture;

            await expect(
                projectToken
                    .connect(depositor1)
                    .safeBatchTransferFrom(depositor1.address, projectToken.address, [1, 2], [10, 5], '0x')
            ).to.not.be.reverted;
        });

        it('7.2.18.3. Revert when receiving unknown ERC1155 tokens batch', async () => {
            const fixture = await beforeProjectTokenTest();
            const { projectToken, depositor1, deployer, admin } = fixture;

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
    describe('7.2.19. registerInitiator(bytes32,address,string,(uint256,uint256,bytes))', async () => {
        async function beforeRegisterInitiatorTest(fixture: ProjectTokenFixture): Promise<{
            defaultParamsInput: RegisterInitiatorParamsInput;
        }> {
            const { zone1, initiator1 } = fixture;

            const defaultParamsInput: RegisterInitiatorParamsInput = {
                zone: zone1,
                initiator: initiator1.address,
                uri: 'initiator_uri',
            };

            return { defaultParamsInput };
        }

        it('7.2.19.1. Register initiator successfully', async () => {
            const fixture = await beforeProjectTokenTest();
            const { manager, projectToken, validator } = fixture;

            const { defaultParamsInput } = await beforeRegisterInitiatorTest(fixture);

            const tx = await getProjectTokenTxByInput_RegisterInitiator(
                projectToken as any,
                manager,
                defaultParamsInput,
                validator
            );
            await tx.wait();

            await expect(tx)
                .to.emit(projectToken, 'InitiatorRegistration')
                .withArgs(defaultParamsInput.zone, defaultParamsInput.initiator, defaultParamsInput.uri);
            expect(await projectToken.initiatorURI(defaultParamsInput.zone, defaultParamsInput.initiator)).to.equal(
                defaultParamsInput.uri
            );
        });

        it('7.2.19.2. Register initiator unsuccessfully by non-manager', async () => {
            const fixture = await beforeProjectTokenTest();
            const { projectToken, moderator, user, validator } = fixture;

            const { defaultParamsInput } = await beforeRegisterInitiatorTest(fixture);

            // By moderator
            await expect(
                getProjectTokenTxByInput_RegisterInitiator(
                    projectToken as any,
                    moderator,
                    defaultParamsInput,
                    validator
                )
            ).to.be.revertedWithCustomError(projectToken, `Unauthorized`);

            // By user
            await expect(
                getProjectTokenTxByInput_RegisterInitiator(projectToken as any, user, defaultParamsInput, validator)
            ).to.be.revertedWithCustomError(projectToken, `Unauthorized`);
        });

        it('7.2.19.3. Register initiator unsuccessfully with inactive zone', async () => {
            const fixture = await beforeProjectTokenTest();
            const { projectToken, manager, validator } = fixture;

            const { defaultParamsInput } = await beforeRegisterInitiatorTest(fixture);

            const zone = ethers.utils.formatBytes32String('invalid zone');
            await expect(
                getProjectTokenTxByInput_RegisterInitiator(
                    projectToken as any,
                    manager,
                    {
                        ...defaultParamsInput,
                        zone: zone,
                    },
                    validator
                )
            ).to.be.revertedWithCustomError(projectToken, `Unauthorized`);
        });

        it('7.2.19.4. Register initiator unsuccessfully with inactive manager in zone', async () => {
            const fixture = await beforeProjectTokenTest();
            const { deployer, projectToken, manager, admin, admins, validator } = fixture;

            const { defaultParamsInput } = await beforeRegisterInitiatorTest(fixture);

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
                getProjectTokenTxByInput_RegisterInitiator(projectToken as any, manager, defaultParamsInput, validator)
            ).to.be.revertedWithCustomError(projectToken, `Unauthorized`);
        });

        it('7.2.19.5. Register initiator unsuccessfully with invalid validation', async () => {
            const fixture = await beforeProjectTokenTest();
            const { projectToken, manager, validator } = fixture;

            const { defaultParamsInput } = await beforeRegisterInitiatorTest(fixture);

            const params: RegisterInitiatorParams = {
                ...defaultParamsInput,
                validation: await getRegisterInitiatorValidation(projectToken, defaultParamsInput, validator, false),
            };

            await expect(
                getProjectTokenTx_RegisterInitiator(projectToken as any, manager, params)
            ).to.be.revertedWithCustomError(projectToken, `InvalidSignature`);
        });

        it('7.2.19.6. Register initiator unsuccessfully with invalid uri', async () => {
            const fixture = await beforeProjectTokenTest();
            const { projectToken, manager, validator } = fixture;

            const { defaultParamsInput } = await beforeRegisterInitiatorTest(fixture);

            await expect(
                getProjectTokenTxByInput_RegisterInitiator(
                    projectToken as any,
                    manager,
                    {
                        ...defaultParamsInput,
                        uri: '',
                    },
                    validator
                )
            ).to.be.revertedWithCustomError(projectToken, `InvalidURI`);
        });
    });

    describe('7.2.20. launchProject(bytes32,uint256,address,string)', async () => {
        async function beforeLaunchProjectTest(fixture: ProjectTokenFixture): Promise<{
            defaultParams: LaunchProjectParams;
        }> {
            const { zone1, initiator1 } = fixture;

            const defaultParams: LaunchProjectParams = {
                zone: zone1,
                launchId: BigNumber.from(10),
                initiator: initiator1.address,
                uri: 'project_uri',
            };

            return { defaultParams };
        }

        it('7.2.20.1. Launch project successfully', async () => {
            const fixture = await beforeProjectTokenTest();

            const { projectToken, prestigePad, zone1, initiator1 } = fixture;

            const currentProjectNumber = await projectToken.projectNumber();

            // Tx1: Launch project 1
            const params1: LaunchProjectParams = {
                zone: zone1,
                launchId: BigNumber.from(10),
                initiator: initiator1.address,
                uri: 'project_uri',
            };

            let timestamp = (await time.latest()) + 1000;
            await time.setNextBlockTimestamp(timestamp);

            const tx1 = await getCallProjectTokenTx_LaunchProject(projectToken, prestigePad, params1);
            await tx1.wait();

            const projectId1 = currentProjectNumber.add(1);

            await expect(tx1)
                .to.emit(projectToken, 'NewToken')
                .withArgs(projectId1, params1.zone, params1.launchId, prestigePad.address, params1.initiator);

            const project1 = await projectToken.getProject(projectId1);
            expect(project1.estateId).to.equal(0);
            expect(project1.zone).to.equal(params1.zone);
            expect(project1.launchId).to.equal(params1.launchId);
            expect(project1.launchpad).to.equal(prestigePad.address);
            expect(project1.tokenizeAt).to.equal(timestamp);
            expect(project1.deprecateAt).to.equal(Constant.COMMON_INFINITE_TIMESTAMP);
            expect(project1.initiator).to.equal(params1.initiator);

            expect(await projectToken.projectNumber()).to.equal(projectId1);
            expect(await projectToken.uri(projectId1)).to.equal(
                LaunchInitialization.PROJECT_TOKEN_BaseURI + params1.uri
            );

            // Tx2: Launch project 2
            const params2: LaunchProjectParams = {
                zone: zone1,
                launchId: BigNumber.from(20),
                initiator: initiator1.address,
                uri: 'project_uri',
            };

            timestamp += 10;
            await time.setNextBlockTimestamp(timestamp);

            const tx2 = await getCallProjectTokenTx_LaunchProject(projectToken, prestigePad, params2);
            await tx2.wait();

            const projectId2 = currentProjectNumber.add(2);

            await expect(tx2)
                .to.emit(projectToken, 'NewToken')
                .withArgs(projectId2, params2.zone, params2.launchId, prestigePad.address, params2.initiator);

            const project2 = await projectToken.getProject(projectId2);
            expect(project2.estateId).to.equal(0);
            expect(project2.zone).to.equal(params2.zone);
            expect(project2.launchId).to.equal(params2.launchId);
            expect(project2.launchpad).to.equal(prestigePad.address);
            expect(project2.tokenizeAt).to.equal(timestamp);
            expect(project2.deprecateAt).to.equal(Constant.COMMON_INFINITE_TIMESTAMP);
            expect(project2.initiator).to.equal(params2.initiator);

            expect(await projectToken.projectNumber()).to.equal(projectId2);
            expect(await projectToken.uri(projectId2)).to.equal(
                LaunchInitialization.PROJECT_TOKEN_BaseURI + params2.uri
            );
        });

        it('7.2.20.2. Launch project unsuccessfully when paused', async () => {
            const fixture = await beforeProjectTokenTest({
                pause: true,
            });
            const { projectToken, prestigePad } = fixture;

            const { defaultParams: params } = await beforeLaunchProjectTest(fixture);

            await expect(getCallProjectTokenTx_LaunchProject(projectToken, prestigePad, params)).to.be.revertedWith(
                `Pausable: paused`
            );
        });

        it('7.2.20.3. Launch project unsuccessfully by non-launchpad sender', async () => {
            const fixture = await beforeProjectTokenTest({
                skipAuthorizeLaunchpad: true,
            });
            const { projectToken, prestigePad } = fixture;

            const { defaultParams: params } = await beforeLaunchProjectTest(fixture);

            await expect(
                getCallProjectTokenTx_LaunchProject(projectToken, prestigePad, params)
            ).to.be.revertedWithCustomError(projectToken, `Unauthorized`);
        });

        it('7.2.20.4. Launch project unsuccessfully when zone is inactive', async () => {
            const fixture = await beforeProjectTokenTest();
            const { projectToken, prestigePad } = fixture;

            const { defaultParams } = await beforeLaunchProjectTest(fixture);

            await expect(
                getCallProjectTokenTx_LaunchProject(projectToken, prestigePad, {
                    ...defaultParams,
                    zone: ethers.utils.formatBytes32String('invalid zone'),
                })
            ).to.be.revertedWithCustomError(projectToken, `InvalidInput`);
        });
    });

    describe('7.2.21. mint(uint256,uint256)', async () => {
        it('7.2.21.1. Mint project token successfully', async () => {
            const fixture = await beforeProjectTokenTest({
                addSampleProjects: true,
            });
            const { projectToken, prestigePad } = fixture;

            // Tx1: Mint project 1
            const params1: MintParams = {
                projectId: BigNumber.from(1),
                amount: BigNumber.from(100),
            };

            const tx1 = await getCallProjectTokenTx_Mint(projectToken, prestigePad, params1);

            await expect(tx1)
                .to.emit(projectToken, 'TransferSingle')
                .withArgs(
                    prestigePad.address,
                    ethers.constants.AddressZero,
                    prestigePad.address,
                    params1.projectId,
                    params1.amount
                );

            expect(await projectToken.balanceOf(prestigePad.address, 1)).to.equal(params1.amount);
            expect(await projectToken.balanceOf(prestigePad.address, 2)).to.equal(0);

            // Tx2: Mint project 2
            const params2: MintParams = {
                projectId: BigNumber.from(2),
                amount: BigNumber.from(200),
            };

            const tx2 = await getCallProjectTokenTx_Mint(projectToken, prestigePad, params2);

            await expect(tx2)
                .to.emit(projectToken, 'TransferSingle')
                .withArgs(
                    prestigePad.address,
                    ethers.constants.AddressZero,
                    prestigePad.address,
                    params2.projectId,
                    params2.amount
                );

            expect(await projectToken.balanceOf(prestigePad.address, 1)).to.equal(params1.amount);
            expect(await projectToken.balanceOf(prestigePad.address, 2)).to.equal(params2.amount);

            // Tx3: Mint project 1 again
            const params3: MintParams = {
                projectId: BigNumber.from(1),
                amount: BigNumber.from(100),
            };

            const tx3 = await getCallProjectTokenTx_Mint(projectToken, prestigePad, params3);

            await expect(tx3)
                .to.emit(projectToken, 'TransferSingle')
                .withArgs(
                    prestigePad.address,
                    ethers.constants.AddressZero,
                    prestigePad.address,
                    params3.projectId,
                    params3.amount
                );

            expect(await projectToken.balanceOf(prestigePad.address, 1)).to.equal(params1.amount.add(params3.amount));
            expect(await projectToken.balanceOf(prestigePad.address, 2)).to.equal(params2.amount);
        });

        it('7.2.21.2. Mint unsuccessfully with invalid project id', async () => {
            const fixture = await beforeProjectTokenTest();
            const { projectToken, prestigePad } = fixture;

            await expect(
                getCallProjectTokenTx_Mint(projectToken, prestigePad, {
                    projectId: BigNumber.from(0),
                    amount: BigNumber.from(100),
                })
            ).to.be.revertedWithCustomError(projectToken, `InvalidProjectId`);

            await expect(
                getCallProjectTokenTx_Mint(projectToken, prestigePad, {
                    projectId: BigNumber.from(100),
                    amount: BigNumber.from(100),
                })
            ).to.be.revertedWithCustomError(projectToken, `InvalidProjectId`);
        });

        it('7.2.21.3. Mint unsuccessfully with deprecated project', async () => {
            const fixture = await beforeProjectTokenTest({
                addSampleProjects: true,
                deprecateProjects: true,
            });
            const { projectToken, prestigePad } = fixture;

            await expect(
                getCallProjectTokenTx_Mint(projectToken, prestigePad, {
                    projectId: BigNumber.from(1),
                    amount: BigNumber.from(100),
                })
            ).to.be.revertedWithCustomError(projectToken, `InvalidProjectId`);
        });

        it('7.2.21.4. Mint unsuccessfully when sender is not launchpad of project', async () => {
            const fixture = await beforeProjectTokenTest({
                addSampleProjects: true,
            });
            const { projectToken, manager } = fixture;

            await expect(
                getProjectTokenTx_Mint(projectToken as any, manager, {
                    projectId: BigNumber.from(1),
                    amount: BigNumber.from(100),
                })
            ).to.be.revertedWithCustomError(projectToken, `Unauthorized`);
        });

        it('7.2.21.5. Mint unsuccessfully when paused', async () => {
            const fixture = await beforeProjectTokenTest({
                addSampleProjects: true,
                pause: true,
            });
            const { projectToken, prestigePad } = fixture;

            await expect(
                getCallProjectTokenTx_Mint(projectToken, prestigePad, {
                    projectId: BigNumber.from(1),
                    amount: BigNumber.from(100),
                })
            ).to.be.revertedWith(`Pausable: paused`);
        });
    });

    describe('7.2.22. withdrawEstateToken(uint256)', async () => {
        it('7.2.22.1. Withdraw estate token successfully', async () => {
            const fixture = await beforeProjectTokenTest({
                addSampleProjects: true,
                mintProjectTokenForDepositor: true,
                tokenizeProject: true,
            });
            const { projectToken, estateToken, depositor1, depositor2 } = fixture;

            // Tx1: Depositor1 withdraw from project 1
            let amount1 = await projectToken.balanceOf(depositor1.address, 1);
            let initDepositor1EstateBalance = await estateToken.balanceOf(depositor1.address, 1);
            let initProjectTokenProjectBalance = await projectToken.balanceOf(projectToken.address, 1);
            let initProjectTokenEstateBalance = await estateToken.balanceOf(projectToken.address, 1);

            const tx1 = await getProjectTokenTx_WithdrawEstateToken(projectToken, depositor1, {
                projectId: BigNumber.from(1),
            });
            await tx1.wait();

            await expect(tx1).to.emit(projectToken, 'EstateTokenWithdrawal').withArgs(1, depositor1.address, amount1);

            expect(await projectToken.balanceOf(depositor1.address, 1)).to.equal(0);
            expect(await estateToken.balanceOf(depositor1.address, 1)).to.equal(
                initDepositor1EstateBalance.add(amount1)
            );

            expect(await projectToken.balanceOf(projectToken.address, 1)).to.equal(
                initProjectTokenProjectBalance.add(amount1)
            );
            expect(await estateToken.balanceOf(projectToken.address, 1)).to.equal(
                initProjectTokenEstateBalance.sub(amount1)
            );

            // New project token transfer to depositor1
            const amount2 = await projectToken.balanceOf(depositor2.address, 1);
            await callTransaction(
                projectToken
                    .connect(depositor2)
                    .safeTransferFrom(depositor2.address, depositor1.address, 1, amount2, '0x')
            );

            // Tx2: Depositor1 withdraw extra estate token from project 1
            initDepositor1EstateBalance = await estateToken.balanceOf(depositor1.address, 1);
            initProjectTokenProjectBalance = await projectToken.balanceOf(projectToken.address, 1);
            initProjectTokenEstateBalance = await estateToken.balanceOf(projectToken.address, 1);

            const tx2 = await getProjectTokenTx_WithdrawEstateToken(projectToken, depositor1, {
                projectId: BigNumber.from(1),
            });
            await tx2.wait();

            await expect(tx2).to.emit(projectToken, 'EstateTokenWithdrawal').withArgs(1, depositor1.address, amount2);

            expect(await projectToken.balanceOf(depositor1.address, 1)).to.equal(0);
            expect(await estateToken.balanceOf(depositor1.address, 1)).to.equal(
                initDepositor1EstateBalance.add(amount2)
            );

            expect(await projectToken.balanceOf(projectToken.address, 1)).to.equal(
                initProjectTokenProjectBalance.add(amount2)
            );
            expect(await estateToken.balanceOf(projectToken.address, 1)).to.equal(
                initProjectTokenEstateBalance.sub(amount2)
            );
        });

        it('7.2.22.2. Withdraw zero estate token when user has zero project token balance', async () => {
            const fixture = await beforeProjectTokenTest({
                addSampleProjects: true,
                mintProjectTokenForDepositor: true,
                tokenizeProject: true,
            });
            const { projectToken, estateToken, initiator2 } = fixture;

            const tx = await getProjectTokenTx_WithdrawEstateToken(projectToken, initiator2, {
                projectId: BigNumber.from(1),
            });
            await tx.wait();

            await expect(tx).to.emit(projectToken, 'EstateTokenWithdrawal').withArgs(1, initiator2.address, 0);

            expect(await projectToken.balanceOf(initiator2.address, 1)).to.equal(0);
            expect(await estateToken.balanceOf(initiator2.address, 1)).to.equal(0);
        });

        it('7.2.22.3. Withdraw estate token unsuccessfully when the contract is reentered', async () => {
            const fixture = await beforeProjectTokenTest({
                useReentrancyReceiverAsDepositor: true,
                addSampleProjects: true,
                mintProjectTokenForDepositor: true,
                tokenizeProject: true,
            });
            const { projectToken, reentrancyReceiver } = fixture;

            await testReentrancy_projectToken(fixture, reentrancyReceiver, async (timestamp: number) => {
                await expect(
                    reentrancyReceiver.call(
                        projectToken.address,
                        projectToken.interface.encodeFunctionData('withdrawEstateToken', [1])
                    )
                ).to.be.revertedWith(`ReentrancyGuard: reentrant call`);
            });
        });

        it('7.2.22.4. Withdraw estate token unsuccessfully with invalid project id', async () => {
            const fixture = await beforeProjectTokenTest();

            const { projectToken, depositor1 } = fixture;

            await expect(
                getProjectTokenTx_WithdrawEstateToken(projectToken, depositor1, {
                    projectId: BigNumber.from(0),
                })
            ).to.be.revertedWithCustomError(projectToken, `InvalidProjectId`);

            await expect(
                getProjectTokenTx_WithdrawEstateToken(projectToken, depositor1, {
                    projectId: BigNumber.from(100),
                })
            ).to.be.revertedWithCustomError(projectToken, `InvalidProjectId`);
        });

        it('7.2.22.5. Withdraw estate token unsuccessfully when project is deprecated', async () => {
            const fixture = await beforeProjectTokenTest({
                addSampleProjects: true,
                mintProjectTokenForDepositor: true,
                tokenizeProject: true,
                deprecateProjects: true,
            });
            const { projectToken, depositor1 } = fixture;

            await expect(
                getProjectTokenTx_WithdrawEstateToken(projectToken, depositor1, {
                    projectId: BigNumber.from(1),
                })
            ).to.be.revertedWithCustomError(projectToken, `InvalidProjectId`);
        });

        it('7.2.22.6. Withdraw estate token unsuccessfully when paused', async () => {
            const fixture = await beforeProjectTokenTest({
                addSampleProjects: true,
                mintProjectTokenForDepositor: true,
                tokenizeProject: true,
                pause: true,
            });
            const { projectToken, depositor1 } = fixture;

            await expect(
                getProjectTokenTx_WithdrawEstateToken(projectToken, depositor1, {
                    projectId: BigNumber.from(1),
                })
            ).to.be.revertedWith(`Pausable: paused`);
        });

        it('7.2.22.7. Withdraw estate token unsuccessfully when project is not tokenized', async () => {
            const fixture = await beforeProjectTokenTest({
                addSampleProjects: true,
                mintProjectTokenForDepositor: true,
            });
            const { projectToken, depositor1 } = fixture;

            await expect(
                getProjectTokenTx_WithdrawEstateToken(projectToken, depositor1, {
                    projectId: BigNumber.from(1),
                })
            ).to.be.revertedWithCustomError(projectToken, `InvalidWithdrawing`);
        });

        it('7.2.22.8. Withdraw estate token unsuccessfully when transferring ERC1155 token failed', async () => {
            const fixture = await beforeProjectTokenTest({
                addSampleProjects: true,
                mintProjectTokenForDepositor: true,
                tokenizeProject: true,
                useFailReceiverAsDepositor: true,
            });
            const { projectToken, failReceiver } = fixture;

            await callTransaction(failReceiver.activateRejectERC1155(true));

            await expect(
                failReceiver.call(
                    projectToken.address,
                    projectToken.interface.encodeFunctionData('withdrawEstateToken', [1])
                )
            ).to.be.revertedWith(`Fail`);
        });
    });

    describe('7.2.23. safeDeprecateProject(uint256,string,bytes32)', async () => {
        it('7.2.23.1. Safe deprecate project successfully', async () => {
            const fixture = await beforeProjectTokenTest({
                addSampleProjects: true,
            });
            const { projectToken, manager } = fixture;

            let timestamp = (await time.latest()) + 1000;
            await time.setNextBlockTimestamp(timestamp);

            const params: DeprecateProjectParams = {
                projectId: BigNumber.from(1),
                data: 'deprecateProject1',
            };
            const tx = await getProjectTokenTxByParams_SafeDeprecateProject(projectToken as any, manager, params);
            await tx.wait();

            await expect(tx).to.emit(projectToken, 'ProjectDeprecation').withArgs(params.projectId, params.data);

            const project = await projectToken.getProject(1);
            expect(project.deprecateAt).to.equal(timestamp);
        });

        it('7.2.23.2. Safe deprecate project unsuccessfully with invalid project id', async () => {
            const fixture = await beforeProjectTokenTest();
            const { projectToken, manager } = fixture;

            await expect(
                getProjectTokenTxByParams_SafeDeprecateProject(projectToken as any, manager, {
                    projectId: BigNumber.from(0),
                    data: 'deprecateProject1',
                })
            ).to.be.revertedWithCustomError(projectToken, `InvalidProjectId`);

            await expect(
                getProjectTokenTxByParams_SafeDeprecateProject(projectToken as any, manager, {
                    projectId: BigNumber.from(100),
                    data: 'deprecateProject1',
                })
            ).to.be.revertedWithCustomError(projectToken, `InvalidProjectId`);
        });

        it('7.2.23.3. Safe deprecate project unsuccessfully with invalid anchor', async () => {
            const fixture = await beforeProjectTokenTest({
                addSampleProjects: true,
            });
            const { projectToken, manager } = fixture;

            await expect(
                getProjectTokenTx_SafeDeprecateProject(projectToken as any, manager, {
                    projectId: BigNumber.from(1),
                    data: 'deprecateProject1',
                    anchor: ethers.utils.keccak256(ethers.utils.toUtf8Bytes('invalid anchor')),
                })
            ).to.be.revertedWithCustomError(projectToken, `BadAnchor`);
        });

        it('7.2.23.4. Safe deprecate project unsuccessfully with already deprecated project', async () => {
            const fixture = await beforeProjectTokenTest({
                addSampleProjects: true,
                deprecateProjects: true,
            });
            const { projectToken, manager } = fixture;

            await expect(
                getProjectTokenTxByParams_SafeDeprecateProject(projectToken as any, manager, {
                    projectId: BigNumber.from(1),
                    data: 'deprecateProject1',
                })
            ).to.be.revertedWithCustomError(projectToken, `InvalidProjectId`);

            await expect(
                getProjectTokenTxByParams_SafeDeprecateProject(projectToken as any, manager, {
                    projectId: BigNumber.from(2),
                    data: 'deprecateProject1',
                })
            ).to.be.revertedWithCustomError(projectToken, `InvalidProjectId`);
        });

        it('7.2.23.5. Safe deprecate project unsuccessfully with non-manager sender', async () => {
            const fixture = await beforeProjectTokenTest({
                addSampleProjects: true,
            });
            const { projectToken, moderator, user } = fixture;

            // By moderator
            await expect(
                getProjectTokenTxByParams_SafeDeprecateProject(projectToken as any, moderator, {
                    projectId: BigNumber.from(1),
                    data: 'deprecateProject1',
                })
            ).to.be.revertedWithCustomError(projectToken, `Unauthorized`);

            // By user
            await expect(
                getProjectTokenTxByParams_SafeDeprecateProject(projectToken as any, user, {
                    projectId: BigNumber.from(1),
                    data: 'deprecateProject1',
                })
            ).to.be.revertedWithCustomError(projectToken, `Unauthorized`);
        });

        it('7.2.23.6. Safe deprecate project unsuccessfully with inactive manager in zone', async () => {
            const fixture = await beforeProjectTokenTest({
                addSampleProjects: true,
            });
            const { deployer, projectToken, manager, admin, admins, zone1 } = fixture;

            await callTransaction(
                getAdminTxByInput_ActivateIn(
                    admin,
                    deployer,
                    {
                        zone: zone1,
                        accounts: [manager.address],
                        isActive: false,
                    },
                    admins
                )
            );

            await expect(
                getProjectTokenTxByParams_SafeDeprecateProject(projectToken as any, manager, {
                    projectId: BigNumber.from(1),
                    data: 'deprecateProject1',
                })
            ).to.be.revertedWithCustomError(projectToken, `Unauthorized`);
        });

        it('7.2.23.7. Safe deprecate project unsuccessfully when paused', async () => {
            const fixture = await beforeProjectTokenTest({
                addSampleProjects: true,
                pause: true,
            });
            const { projectToken, manager } = fixture;

            await expect(
                getProjectTokenTxByParams_SafeDeprecateProject(projectToken as any, manager, {
                    projectId: BigNumber.from(1),
                    data: 'deprecateProject1',
                })
            ).to.be.revertedWith(`Pausable: paused`);
        });
    });

    describe('7.2.24. safeUpdateProjectURI(uint256,string,(uint256,uint256,bytes),bytes32)', async () => {
        it('7.2.24.1. Safe update project uri successfully', async () => {
            const fixture = await beforeProjectTokenTest({
                addSampleProjects: true,
            });
            const { projectToken, manager, validator } = fixture;

            const paramsInput: UpdateProjectURIParamsInput = {
                projectId: BigNumber.from(1),
                uri: 'new_project_uri_1',
            };

            const tx = await getProjectTokenTxByInput_SafeUpdateProjectURI(
                projectToken,
                manager,
                paramsInput,
                validator
            );
            await tx.wait();

            await expect(tx)
                .to.emit(projectToken, 'URI')
                .withArgs(LaunchInitialization.PROJECT_TOKEN_BaseURI + paramsInput.uri, 1);

            expect(await projectToken.uri(1)).to.equal(LaunchInitialization.PROJECT_TOKEN_BaseURI + paramsInput.uri);
        });

        it('7.2.24.2. Safe update project uri unsuccessfully with invalid project id', async () => {
            const fixture = await beforeProjectTokenTest();
            const { projectToken, manager, validator } = fixture;

            await expect(
                getProjectTokenTxByInput_SafeUpdateProjectURI(
                    projectToken,
                    manager,
                    {
                        projectId: BigNumber.from(0),
                        uri: 'new_project_uri_1',
                    },
                    validator
                )
            ).to.be.revertedWithCustomError(projectToken, `InvalidProjectId`);

            await expect(
                getProjectTokenTxByInput_SafeUpdateProjectURI(
                    projectToken,
                    manager,
                    {
                        projectId: BigNumber.from(100),
                        uri: 'new_project_uri_1',
                    },
                    validator
                )
            ).to.be.revertedWithCustomError(projectToken, `InvalidProjectId`);
        });

        it('7.2.24.3. Safe update project uri unsuccessfully with invalid anchor', async () => {
            const fixture = await beforeProjectTokenTest({
                addSampleProjects: true,
            });
            const { projectToken, manager, validator } = fixture;

            const paramsInput: UpdateProjectURIParamsInput = {
                projectId: BigNumber.from(1),
                uri: 'new_project_uri_1',
            };
            const params: SafeUpdateProjectURIParams = {
                ...paramsInput,
                anchor: ethers.utils.keccak256(ethers.utils.toUtf8Bytes('invalid anchor')),
                validation: await getSafeUpdateProjectURIValidation(projectToken, paramsInput, validator),
            };
            await expect(
                getProjectTokenTx_SafeUpdateProjectURI(projectToken, manager, params)
            ).to.be.revertedWithCustomError(projectToken, `BadAnchor`);
        });

        it('7.2.24.4. Safe update project uri unsuccessfully with already deprecated project', async () => {
            const fixture = await beforeProjectTokenTest({
                addSampleProjects: true,
                deprecateProjects: true,
            });
            const { projectToken, manager, validator } = fixture;

            await expect(
                getProjectTokenTxByInput_SafeUpdateProjectURI(
                    projectToken,
                    manager,
                    {
                        projectId: BigNumber.from(1),
                        uri: 'new_project_uri_1',
                    },
                    validator
                )
            ).to.be.revertedWithCustomError(projectToken, `InvalidProjectId`);
        });

        it('7.2.24.5. Safe update project uri unsuccessfully with non-manager sender', async () => {
            const fixture = await beforeProjectTokenTest({
                addSampleProjects: true,
            });
            const { projectToken, moderator, user, validator } = fixture;

            const paramsInput: UpdateProjectURIParamsInput = {
                projectId: BigNumber.from(1),
                uri: 'new_project_uri_1',
            };

            // By moderator
            await expect(
                getProjectTokenTxByInput_SafeUpdateProjectURI(projectToken, moderator, paramsInput, validator)
            ).to.be.revertedWithCustomError(projectToken, `Unauthorized`);

            // By user
            await expect(
                getProjectTokenTxByInput_SafeUpdateProjectURI(projectToken, user, paramsInput, validator)
            ).to.be.revertedWithCustomError(projectToken, `Unauthorized`);
        });

        it('7.2.24.6. Safe update project uri unsuccessfully with inactive manager in zone', async () => {
            const fixture = await beforeProjectTokenTest({
                addSampleProjects: true,
            });
            const { deployer, projectToken, manager, admin, admins, zone1, validator } = fixture;

            await callTransaction(
                getAdminTxByInput_ActivateIn(
                    admin,
                    deployer,
                    {
                        zone: zone1,
                        accounts: [manager.address],
                        isActive: false,
                    },
                    admins
                )
            );

            await expect(
                getProjectTokenTxByInput_SafeUpdateProjectURI(
                    projectToken,
                    manager,
                    {
                        projectId: BigNumber.from(1),
                        uri: 'new_project_uri_1',
                    },
                    validator
                )
            ).to.be.revertedWithCustomError(projectToken, `Unauthorized`);
        });

        it('7.2.24.7. Safe update project uri unsuccessfully when paused', async () => {
            const fixture = await beforeProjectTokenTest({
                addSampleProjects: true,
                pause: true,
            });
            const { projectToken, manager, validator } = fixture;

            await expect(
                getProjectTokenTxByInput_SafeUpdateProjectURI(
                    projectToken,
                    manager,
                    {
                        projectId: BigNumber.from(1),
                        uri: 'new_project_uri_1',
                    },
                    validator
                )
            ).to.be.revertedWith(`Pausable: paused`);
        });

        it('7.2.24.8. Safe update project uri unsuccessfully with invalid validation', async () => {
            const fixture = await beforeProjectTokenTest({
                addSampleProjects: true,
            });
            const { projectToken, manager, validator } = fixture;

            const paramsInput: UpdateProjectURIParamsInput = {
                projectId: BigNumber.from(1),
                uri: 'new_project_uri_1',
            };
            const params: SafeUpdateProjectURIParams = {
                ...paramsInput,
                anchor: await getSafeUpdateProjectURIAnchor(projectToken, paramsInput),
                validation: await getSafeUpdateProjectURIValidation(projectToken, paramsInput, validator, false),
            };
            await expect(
                getProjectTokenTx_SafeUpdateProjectURI(projectToken, manager, params)
            ).to.be.revertedWithCustomError(projectToken, `InvalidSignature`);
        });
    });

    describe('7.2.25. safeTokenizeProject(uint256,address,address,bytes32)', async () => {
        it('7.2.25.1. Safe tokenize project successfully', async () => {
            const fixture = await beforeProjectTokenTest({
                addSampleProjects: true,
                mintProjectTokenForDepositor: true,
            });
            const {
                prestigePad,
                projectToken,
                manager,
                broker1,
                broker2,
                commissionToken,
                estateToken,
                zone1,
                zone2,
                custodian1,
                custodian2,
            } = fixture;

            const currentEstateNumber = await estateToken.estateNumber();

            // Tx1: Tokenize project 1
            let timestamp = (await time.latest()) + 1000;
            await time.setNextBlockTimestamp(timestamp);

            const projectId1 = 1;
            const estateId1 = currentEstateNumber.add(1);
            const supply1 = await projectToken.totalSupply(1);
            const uri1 = await projectToken.uri(1);

            prestigePad.isFinalized.whenCalledWith(projectId1).returns(true);

            const params1: TokenizeProjectParams = {
                projectId: BigNumber.from(1),
                custodian: custodian1.address,
                broker: broker1.address,
            };
            const tx1 = await getProjectTokenTxByParams_SafeTokenizeProject(projectToken, manager, params1);
            await tx1.wait();

            await expect(tx1)
                .to.emit(projectToken, 'ProjectTokenization')
                .withArgs(projectId1, estateId1, supply1, custodian1.address, broker1.address);

            await expect(tx1)
                .to.emit(estateToken, 'NewToken')
                .withArgs(
                    estateId1,
                    zone1,
                    projectId1,
                    projectToken.address,
                    custodian1.address,
                    Constant.COMMON_INFINITE_TIMESTAMP
                );

            const project1 = await projectToken.getProject(projectId1);
            expect(project1.estateId).to.equal(estateId1);
            expect(project1.tokenizeAt).to.equal(timestamp);

            const estate1 = await estateToken.getEstate(estateId1);
            expect(estate1.zone).to.equal(zone1);
            expect(estate1.tokenizationId).to.equal(projectId1);
            expect(estate1.tokenizer).to.equal(projectToken.address);
            expect(estate1.tokenizeAt).to.equal(timestamp);
            expect(estate1.expireAt).to.equal(Constant.COMMON_INFINITE_TIMESTAMP);
            expect(estate1.custodian).to.equal(custodian1.address);
            expect(estate1.deprecateAt).to.equal(Constant.COMMON_INFINITE_TIMESTAMP);

            expect(await commissionToken.ownerOf(estateId1)).to.equal(broker1.address);

            expect(await estateToken.balanceOf(projectToken.address, estateId1)).to.equal(supply1);

            expect(await estateToken.uri(estateId1)).to.equal(LandInitialization.ESTATE_TOKEN_BaseURI + uri1);

            // Tx2: Tokenize project 2
            timestamp += 10;
            await time.setNextBlockTimestamp(timestamp);

            const projectId2 = 2;
            const estateId2 = currentEstateNumber.add(2);
            const supply2 = await projectToken.totalSupply(2);
            const uri2 = await projectToken.uri(2);

            prestigePad.isFinalized.whenCalledWith(projectId2).returns(true);

            const params2: TokenizeProjectParams = {
                projectId: BigNumber.from(2),
                custodian: custodian2.address,
                broker: broker2.address,
            };
            const tx2 = await getProjectTokenTxByParams_SafeTokenizeProject(projectToken, manager, params2);
            await tx2.wait();

            await expect(tx2)
                .to.emit(projectToken, 'ProjectTokenization')
                .withArgs(projectId2, estateId2, supply2, custodian2.address, broker2.address);
            await expect(tx2)
                .to.emit(estateToken, 'NewToken')
                .withArgs(
                    estateId2,
                    zone2,
                    projectId2,
                    projectToken.address,
                    custodian2.address,
                    Constant.COMMON_INFINITE_TIMESTAMP
                );

            const project2 = await projectToken.getProject(projectId2);
            expect(project2.estateId).to.equal(estateId2);
            expect(project2.tokenizeAt).to.equal(timestamp);

            const estate2 = await estateToken.getEstate(estateId2);
            expect(estate2.zone).to.equal(zone2);
            expect(estate2.tokenizationId).to.equal(projectId2);
            expect(estate2.tokenizer).to.equal(projectToken.address);
            expect(estate2.tokenizeAt).to.equal(timestamp);
            expect(estate2.expireAt).to.equal(Constant.COMMON_INFINITE_TIMESTAMP);
            expect(estate2.custodian).to.equal(custodian2.address);
            expect(estate2.deprecateAt).to.equal(Constant.COMMON_INFINITE_TIMESTAMP);

            expect(await commissionToken.ownerOf(estateId2)).to.equal(broker2.address);

            expect(await estateToken.balanceOf(projectToken.address, estateId2)).to.equal(supply2);

            expect(await estateToken.uri(estateId2)).to.equal(LandInitialization.ESTATE_TOKEN_BaseURI + uri2);
        });

        it('7.2.25.2. Safe tokenize project unsuccessfully with invalid project id', async () => {
            const fixture = await beforeProjectTokenTest();
            const { projectToken, manager, broker1, custodian1 } = fixture;

            await expect(
                getProjectTokenTxByParams_SafeTokenizeProject(projectToken, manager, {
                    projectId: BigNumber.from(0),
                    custodian: custodian1.address,
                    broker: broker1.address,
                })
            ).to.be.revertedWithCustomError(projectToken, `InvalidProjectId`);

            await expect(
                getProjectTokenTxByParams_SafeTokenizeProject(projectToken, manager, {
                    projectId: BigNumber.from(100),
                    custodian: custodian1.address,
                    broker: broker1.address,
                })
            ).to.be.revertedWithCustomError(projectToken, `InvalidProjectId`);
        });

        it('7.2.25.3. Safe tokenize project unsuccessfully with deprecated project', async () => {
            const fixture = await beforeProjectTokenTest({
                addSampleProjects: true,
                mintProjectTokenForDepositor: true,
                deprecateProjects: true,
            });
            const { prestigePad, projectToken, manager, broker1, custodian1 } = fixture;

            prestigePad.isFinalized.whenCalledWith(1).returns(true);

            await expect(
                getProjectTokenTxByParams_SafeTokenizeProject(projectToken, manager, {
                    projectId: BigNumber.from(1),
                    custodian: custodian1.address,
                    broker: broker1.address,
                })
            ).to.be.revertedWithCustomError(projectToken, `InvalidProjectId`);
        });

        it('7.2.25.4. Safe tokenize project unsuccessfully by non-manager', async () => {
            const fixture = await beforeProjectTokenTest({
                addSampleProjects: true,
                mintProjectTokenForDepositor: true,
            });
            const { prestigePad, projectToken, moderator, user, broker1, custodian1 } = fixture;

            prestigePad.isFinalized.whenCalledWith(1).returns(true);

            const params: TokenizeProjectParams = {
                projectId: BigNumber.from(1),
                custodian: custodian1.address,
                broker: broker1.address,
            };

            // By moderator
            await expect(
                getProjectTokenTxByParams_SafeTokenizeProject(projectToken, moderator, params)
            ).to.be.revertedWithCustomError(projectToken, `Unauthorized`);

            // By user
            await expect(
                getProjectTokenTxByParams_SafeTokenizeProject(projectToken, user, params)
            ).to.be.revertedWithCustomError(projectToken, `Unauthorized`);
        });

        it('7.2.25.5. Safe tokenize project unsuccessfully with inactive manager in zone', async () => {
            const fixture = await beforeProjectTokenTest({
                addSampleProjects: true,
                mintProjectTokenForDepositor: true,
            });
            const { deployer, prestigePad, projectToken, manager, admin, admins, zone1, broker1, custodian1 } = fixture;

            await callTransaction(
                getAdminTxByInput_ActivateIn(
                    admin,
                    deployer,
                    {
                        zone: zone1,
                        accounts: [manager.address],
                        isActive: false,
                    },
                    admins
                )
            );

            prestigePad.isFinalized.whenCalledWith(1).returns(true);

            await expect(
                getProjectTokenTxByParams_SafeTokenizeProject(projectToken, manager, {
                    projectId: BigNumber.from(1),
                    custodian: custodian1.address,
                    broker: broker1.address,
                })
            ).to.be.revertedWithCustomError(projectToken, `Unauthorized`);
        });

        it('7.2.25.6. Safe tokenize project unsuccessfully when paused', async () => {
            const fixture = await beforeProjectTokenTest({
                addSampleProjects: true,
                mintProjectTokenForDepositor: true,
                pause: true,
            });
            const { prestigePad, projectToken, manager, broker1, custodian1 } = fixture;

            prestigePad.isFinalized.whenCalledWith(1).returns(true);

            await expect(
                getProjectTokenTxByParams_SafeTokenizeProject(projectToken, manager, {
                    projectId: BigNumber.from(1),
                    custodian: custodian1.address,
                    broker: broker1.address,
                })
            ).to.be.revertedWith(`Pausable: paused`);
        });

        it('7.2.25.7. Safe tokenize project unsuccessfully with unregistered custodian', async () => {
            const fixture = await beforeProjectTokenTest({
                addSampleProjects: true,
                mintProjectTokenForDepositor: true,
            });
            const { prestigePad, projectToken, manager, broker1 } = fixture;

            prestigePad.isFinalized.whenCalledWith(1).returns(true);

            const unregisteredCustodian = randomWallet();

            await expect(
                getProjectTokenTxByParams_SafeTokenizeProject(projectToken, manager, {
                    projectId: BigNumber.from(1),
                    custodian: unregisteredCustodian.address,
                    broker: broker1.address,
                })
            ).to.be.reverted;
        });

        it('7.2.25.8. Safe tokenize project unsuccessfully with unregistered broker', async () => {
            const fixture = await beforeProjectTokenTest({
                addSampleProjects: true,
                mintProjectTokenForDepositor: true,
            });
            const { prestigePad, projectToken, manager, custodian1 } = fixture;

            prestigePad.isFinalized.whenCalledWith(1).returns(true);

            const unregisteredBroker = randomWallet();

            await expect(
                getProjectTokenTxByParams_SafeTokenizeProject(projectToken, manager, {
                    projectId: BigNumber.from(1),
                    custodian: custodian1.address,
                    broker: unregisteredBroker.address,
                })
            ).to.be.reverted;
        });

        it('7.2.25.9. Safe tokenize project unsuccessfully with already tokenized project', async () => {
            const fixture = await beforeProjectTokenTest({
                addSampleProjects: true,
                mintProjectTokenForDepositor: true,
                tokenizeProject: true,
            });
            const { projectToken, manager, broker1, custodian1 } = fixture;

            await expect(
                getProjectTokenTxByParams_SafeTokenizeProject(projectToken, manager, {
                    projectId: BigNumber.from(1),
                    custodian: custodian1.address,
                    broker: broker1.address,
                })
            ).to.be.revertedWithCustomError(projectToken, `AlreadyTokenized`);
        });

        it('7.2.25.10. Safe tokenize project unsuccessfully with zero total supply', async () => {
            const fixture = await beforeProjectTokenTest({
                addSampleProjects: true,
            });
            const { prestigePad, projectToken, manager, broker1, custodian1 } = fixture;

            prestigePad.isFinalized.whenCalledWith(1).returns(true);

            await expect(
                getProjectTokenTxByParams_SafeTokenizeProject(projectToken, manager, {
                    projectId: BigNumber.from(1),
                    custodian: custodian1.address,
                    broker: broker1.address,
                })
            ).to.be.revertedWithCustomError(projectToken, `NothingToTokenize`);
        });

        it('7.2.25.11. Safe tokenize project unsuccessfully when project is not finalized', async () => {
            const fixture = await beforeProjectTokenTest({
                addSampleProjects: true,
                mintProjectTokenForDepositor: true,
            });
            const { projectToken, manager, broker1, custodian1 } = fixture;

            await expect(
                getProjectTokenTxByParams_SafeTokenizeProject(projectToken, manager, {
                    projectId: BigNumber.from(1),
                    custodian: custodian1.address,
                    broker: broker1.address,
                })
            ).to.be.revertedWithCustomError(projectToken, `InvalidTokenizing`);
        });

        it('7.2.25.12. Safe tokenize project unsuccessfully when tokenizing estate failed', async () => {
            // ProjectToken is not registered as tokenizer in estate token
            const fixture = await beforeProjectTokenTest({
                skipAddProjectTokenAsTokenizer: true,
                addSampleProjects: true,
                mintProjectTokenForDepositor: true,
            });
            const { prestigePad, estateToken, projectToken, manager, broker1, custodian1 } = fixture;

            prestigePad.isFinalized.whenCalledWith(1).returns(true);

            await expect(
                getProjectTokenTxByParams_SafeTokenizeProject(projectToken, manager, {
                    projectId: BigNumber.from(1),
                    custodian: custodian1.address,
                    broker: broker1.address,
                })
            ).to.be.revertedWithCustomError(estateToken, `Unauthorized`);
        });
    });
});
