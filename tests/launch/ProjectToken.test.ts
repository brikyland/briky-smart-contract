import { expect } from 'chai';
import { ethers, upgrades } from 'hardhat';
import {
    Admin,
    CommissionToken,
    Currency,
    EstateToken,
    FeeReceiver,
    IERC165Upgradeable__factory,
    MockEstateToken,
    MockEstateForger__factory,
    ReserveVault,
    IERC2981Upgradeable__factory,
    IRoyaltyRateProposer__factory,
    ICommon__factory,
    IERC1155Upgradeable__factory,
    IERC1155MetadataURIUpgradeable__factory,
    PriceWatcher,
    IGovernor__factory,
    GovernanceHub,
    DividendHub,
    MockEstateLiquidator,
    MockEstateForger,
    MockEstateLiquidator__factory,
    MockPrestigePad,
    MockProjectToken,
    MockEstateToken__factory,
    MockPrestigePad__factory,
    ReentrancyERC1155Receiver,
    FailReceiver,
    IAssetToken__factory,
    IProjectToken__factory,
    IValidatable__factory,
    IEstateTokenizer__factory,
    IEstateTokenReceiver__factory,
} from '@typechain-types';
import { callTransaction, callTransactionAtTimestamp, getSignatures, randomWallet } from '@utils/blockchain';
import { Constant } from '@tests/test.constant';
import { deployAdmin } from '@utils/deployments/common/admin';
import { deployFeeReceiver } from '@utils/deployments/common/feeReceiver';
import { deployCurrency } from '@utils/deployments/common/currency';
import { deployMockEstateToken } from '@utils/deployments/mock/mockEstateToken';
import { deployCommissionToken } from '@utils/deployments/land/commissionToken';
import { loadFixture, time } from "@nomicfoundation/hardhat-network-helpers";

import { MockContract, smock } from '@defi-wonderland/smock';
import { deployMockProjectToken } from '@utils/deployments/mock/mockProjectToken';

import {
    callAdmin_ActivateIn,
    callAdmin_AuthorizeManagers,
    callAdmin_AuthorizeModerators,
    callAdmin_DeclareZone,
} from '@utils/call/admin';
import { BigNumber, Contract } from 'ethers';
import { randomInt } from 'crypto';
import { getBytes4Hex, getInterfaceID, randomBigNumber, structToObject } from '@utils/utils';
import { OrderedMap } from '@utils/utils';
import { deployReserveVault } from '@utils/deployments/common/reserveVault';
import { deployPriceWatcher } from '@utils/deployments/common/priceWatcher';
import { deployGovernanceHub } from '@utils/deployments/common/governanceHub';
import { deployDividendHub } from '@utils/deployments/common/dividendHub';
import { MockValidator } from '@utils/mockValidator';
import { UpdateEstateURIParams } from '@utils/models/EstateToken';
import { getUpdateEstateURIValidation } from '@utils/validation/EstateToken';
import { Initialization as LaunchInitialization } from '@tests/launch/test.initialization';
import { Initialization as LandInitialization } from '@tests/land/test.initialization';
import { callProjectToken_AuthorizeLaunchpads } from '@utils/call/projectToken';
import { DeprecateProjectParams, LaunchProjectParams, MintParams, RegisterInitiatorParams, SafeDeprecateProjectParams, SafeUpdateProjectURIParams, TokenizeProjectParams, UpdateProjectURIParams } from '@utils/models/ProjectToken';
import { getInitiateLaunchValidation } from '@utils/validation/PrestigePad';
import { getRegisterInitiatorInvalidValidation, getRegisterInitiatorValidation, getSafeUpdateProjectURIInvalidValidation, getSafeUpdateProjectURIValidation } from '@utils/validation/ProjectToken';
import { ContractTransaction } from 'ethers';
import { getCallLaunchProjectTx, getCallMintTx, getCallSafeTokenizeProjectTxByParams, getRegisterInitiatorTx, getSafeDeprecateProjectTx, getSafeDeprecateProjectTxByParams, getSafeTokenizeProjectTxByParams, getSafeUpdateProjectURITx, getSafeUpdateProjectURITxByParams } from '@utils/transaction/ProjectToken';
import { getRegisterCustodianTx } from '@utils/transaction/EstateToken';
import { callEstateToken_AuthorizeTokenizers, callEstateToken_UpdateCommissionToken } from '@utils/call/estateToken';
import { deployReentrancyERC1155Receiver } from '@utils/deployments/mock/mockReentrancy/reentrancyERC1155Receiver';
import { deployFailReceiver } from '@utils/deployments/mock/failReceiver';
import { getRegisterBrokerTx } from '@utils/transaction/CommissionToken';
import { IAssetTokenInterfaceId, IERC1155MetadataURIUpgradeableInterfaceId, IERC165UpgradeableInterfaceId, IERC2981UpgradeableInterfaceId, IEstateTokenizerInterfaceId, IGovernorInterfaceId, IRoyaltyRateProposerInterfaceId } from '@tests/interfaces';
import { callPausable_Pause } from '@utils/call/Pausable';

interface ProjectTokenFixture {
    admin: Admin;
    feeReceiver: FeeReceiver;
    priceWatcher: PriceWatcher;
    currency: Currency;
    reserveVault: ReserveVault;
    estateToken: MockContract<MockEstateToken>;
    projectToken: MockProjectToken;
    prestigePad: MockContract<MockPrestigePad>;
    commissionToken: CommissionToken;
    validator: MockValidator;
    
    reentrancyERC1155Receiver: ReentrancyERC1155Receiver;
    failReceiver: FailReceiver;

    deployer: any;
    admins: any[];
    manager: any;
    moderator: any;
    user: any;
    requester1: any, requester2: any;
    broker1: any, broker2: any;
    depositor1: any, depositor2: any, depositor3: any;
    depositors: any[];
    zone1: string, zone2: string;
    initiator1: any, initiator2: any;
    initiators: any[];
    custodian1: any, custodian2: any;
    custodians: any[];

    launchpads: any[];
}

async function testReentrancy_projectToken(
    fixture: ProjectTokenFixture,
    reentrancyContract: Contract,
    assertion: any,
) {
    const { projectToken, broker1, initiator1, admin, admins, zone1 } = fixture;

    let timestamp = await time.latest();

    // tokenizeProject
    await callTransaction(reentrancyContract.updateReentrancyPlan(
        projectToken.address,
        projectToken.interface.encodeFunctionData("safeTokenizeProject", [
            BigNumber.from(1),
            initiator1.address,
            broker1.address,
            ethers.utils.keccak256(ethers.utils.toUtf8Bytes('launch_uri_1')),
        ]),
    ));

    await assertion(timestamp);

    // withdrawEstateToken
    timestamp += 10;

    await callTransaction(reentrancyContract.updateReentrancyPlan(
        projectToken.address,
        projectToken.interface.encodeFunctionData("withdrawEstateToken", [
            1,
        ])
    ));

    await assertion(timestamp);
}

describe('7.2. ProjectToken', async () => {
    afterEach(async () => {
        await ethers.provider.send("evm_setAutomine", [true]);
        
        const fixture = await beforeProjectTokenTest();
        const { prestigePad } = fixture;

        prestigePad.isFinalized.reset();
        prestigePad.allocationOfAt.reset();
    });

    async function projectTokenFixture(): Promise<ProjectTokenFixture> {
        const accounts = await ethers.getSigners();
        const deployer = accounts[0];
        const admins = [];
        for (let i = 1; i <= Constant.ADMIN_NUMBER; ++i) admins.push(accounts[i]);
        const user = accounts[Constant.ADMIN_NUMBER + 1];
        const manager = accounts[Constant.ADMIN_NUMBER + 2];
        const moderator = accounts[Constant.ADMIN_NUMBER + 3];
        const requester1 = accounts[Constant.ADMIN_NUMBER + 4];
        const requester2 = accounts[Constant.ADMIN_NUMBER + 5];
        const broker1 = accounts[Constant.ADMIN_NUMBER + 6];
        const broker2 = accounts[Constant.ADMIN_NUMBER + 7];
        const depositor1 = accounts[Constant.ADMIN_NUMBER + 8];
        const depositor2 = accounts[Constant.ADMIN_NUMBER + 9];
        const depositor3 = accounts[Constant.ADMIN_NUMBER + 10];        
        const depositors = [depositor1, depositor2, depositor3];
        const initiator1 = accounts[Constant.ADMIN_NUMBER + 11];
        const initiator2 = accounts[Constant.ADMIN_NUMBER + 12];
        const initiators = [initiator1, initiator2];
        const custodian1 = accounts[Constant.ADMIN_NUMBER + 13];
        const custodian2 = accounts[Constant.ADMIN_NUMBER + 14];
        const custodians = [custodian1, custodian2];

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

        const currency = await deployCurrency(
            deployer.address,
            'MockCurrency',
            'MCK'
        ) as Currency;

        const validator = new MockValidator(deployer as any);

        const SmockEstateTokenFactory = await smock.mock<MockEstateToken__factory>('MockEstateToken');
        const estateToken = await SmockEstateTokenFactory.deploy();
        await callTransaction(estateToken.initialize(
            admin.address,
            feeReceiver.address,
            validator.getAddress(),
            LandInitialization.ESTATE_TOKEN_BaseURI,
        ));

        const commissionToken = await deployCommissionToken(
            deployer,
            admin.address,
            estateToken.address,
            feeReceiver.address,
            LandInitialization.COMMISSION_TOKEN_Name,
            LandInitialization.COMMISSION_TOKEN_Symbol,
            LandInitialization.COMMISSION_TOKEN_BaseURI,
            LandInitialization.COMMISSION_TOKEN_RoyaltyRate,
        ) as CommissionToken;

        await callEstateToken_UpdateCommissionToken(
            estateToken as any,
            admins,
            commissionToken.address,
            await admin.nonce()
        );

        const projectToken = await deployMockProjectToken(
            deployer.address,
            admin.address,
            estateToken.address,
            feeReceiver.address,
            validator.getAddress(),
            LaunchInitialization.PROJECT_TOKEN_BaseURI,
        ) as MockProjectToken;

        const MockPrestigePadFactory = await smock.mock<MockPrestigePad__factory>('MockPrestigePad');
        let launchpads: any[] = [];
        for (let i = 0; i < 6; ++i) {
            const mockPrestigePad = await MockPrestigePadFactory.deploy();
            await callTransaction(mockPrestigePad.initialize(
                admin.address,
                projectToken.address,
                priceWatcher.address,
                feeReceiver.address,
                reserveVault.address,
                validator.getAddress(),
                LaunchInitialization.PRESTIGE_PAD_BaseMinUnitPrice,
                LaunchInitialization.PRESTIGE_PAD_BaseMaxUnitPrice,
            ));
            launchpads.push(mockPrestigePad);
        }

        const prestigePad = launchpads[0];
        launchpads = launchpads.slice(1);

        const zone1 = ethers.utils.formatBytes32String("TestZone1");
        const zone2 = ethers.utils.formatBytes32String("TestZone2");

        const reentrancyERC1155Receiver = await deployReentrancyERC1155Receiver(deployer.address) as ReentrancyERC1155Receiver;
        const failReceiver = await deployFailReceiver(deployer.address, false, false) as FailReceiver;

        return {
            admin,
            feeReceiver,
            priceWatcher,
            currency,
            reserveVault,
            commissionToken,
            estateToken,
            projectToken,
            prestigePad,
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
            zone1,
            zone2,
            validator,
            launchpads,
            reentrancyERC1155Receiver,
            failReceiver,
        };
    };

    async function beforeProjectTokenTest({
        skipAuthorizeLaunchpad = false,
        skipAuthorizeExecutive = false,
        skipAddProjectTokenAsTokenizer = false,
        skipAddCustodianAsEstateCustodian = false,
        skipRegisterBroker = false,
        skipDeclareZone = false,
        useReentrancyERC1155ReceiverAsDepositor = false,
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
            reentrancyERC1155Receiver,
            failReceiver,
        } = fixture;

        let depositor1 = fixture.depositor1;
        if (useReentrancyERC1155ReceiverAsDepositor) {
            depositor1 = reentrancyERC1155Receiver;
        }
        if (useFailReceiverAsDepositor) {
            depositor1 = failReceiver;
        }

        if (!skipAuthorizeExecutive) {
            await callAdmin_AuthorizeManagers(
                admin,
                admins,
                [manager.address],
                true,
                await fixture.admin.nonce()
            );

            await callAdmin_AuthorizeModerators(
                admin,
                admins,
                [moderator.address],
                true,
                await fixture.admin.nonce()
            );
        }

        if (!skipAuthorizeLaunchpad) {
            await callProjectToken_AuthorizeLaunchpads(
                projectToken as any,
                admins,
                [prestigePad.address],
                true,
                await fixture.admin.nonce()
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
        }

        if (!skipAddProjectTokenAsTokenizer) {
            await callEstateToken_AuthorizeTokenizers(
                estateToken as any,
                admins,
                [projectToken.address],
                true,
                await admin.nonce()
            );
        }

        await callAdmin_ActivateIn(
            admin,
            admins,
            zone1,
            [manager.address, moderator.address],
            true,
            await fixture.admin.nonce()
        );
        await callAdmin_ActivateIn(
            admin,
            admins,
            zone2,
            [manager.address, moderator.address],
            true,
            await fixture.admin.nonce()
        );

        if (!skipRegisterBroker) {
            await callTransaction(getRegisterBrokerTx(commissionToken as any, manager, {
                zone: zone1,
                broker: broker1.address,
                commissionRate: ethers.utils.parseEther('0.1'),
            }));
            await callTransaction(getRegisterBrokerTx(commissionToken as any, manager, {
                zone: zone2,
                broker: broker2.address,
                commissionRate: ethers.utils.parseEther('0.2'),
            }));
        }

        const baseTimestamp = await time.latest() + 1000;

        if (!skipAddCustodianAsEstateCustodian) {
            await callTransaction(getRegisterCustodianTx(estateToken as any, validator, manager, {
                zone: zone1,
                custodian: custodian1.address,
                uri: 'custodian1_zone1_uri',
            }));
            await callTransaction(getRegisterCustodianTx(estateToken as any, validator, manager, {
                zone: zone2,
                custodian: custodian2.address,
                uri: 'custodian2_zone2_uri',
            }));
        }

        if (addSampleProjects) {
            await callTransaction(prestigePad.call(
                projectToken.address,
                projectToken.interface.encodeFunctionData('launchProject', [
                    zone1,
                    1,
                    initiator1.address,
                    "initiator1_uri"
                ])
            ));
            await callTransaction(prestigePad.call(
                projectToken.address,
                projectToken.interface.encodeFunctionData('launchProject', [
                    zone2,
                    2,
                    initiator2.address,
                    "initiator2_uri"
                ])
            ));
        }

        if (mintProjectTokenForDepositor) {
            await callTransaction(getCallMintTx(projectToken as any, prestigePad, {
                projectId: BigNumber.from(1),
                amount: BigNumber.from(1000),
            }));
            await callTransaction(getCallMintTx(projectToken as any, prestigePad, {
                projectId: BigNumber.from(2),
                amount: BigNumber.from(100),
            }));

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
                }
            ]
            for (const item of data) {
                await callTransaction(prestigePad.transfer(
                    item.to,
                    item.projectId,
                    item.amount,
                ));
            }
        }

        if (tokenizeProject) {
            prestigePad.isFinalized.whenCalledWith(1).returns(true);
            prestigePad.isFinalized.whenCalledWith(2).returns(true);

            await callTransaction(getSafeTokenizeProjectTxByParams(projectToken as any, manager, {
                projectId: BigNumber.from(1),
                custodian: custodian1.address,
                broker: broker1.address,
            }));
            await callTransaction(getSafeTokenizeProjectTxByParams(projectToken as any, manager, {
                projectId: BigNumber.from(2),
                custodian: custodian2.address,
                broker: broker2.address,
            }));
        }

        if (deprecateProjects) {    
            await callTransaction(getSafeDeprecateProjectTxByParams(projectToken as any, manager, {
                projectId: BigNumber.from(1),
                data: 'deprecateProject1',
            }));
            await callTransaction(getSafeDeprecateProjectTxByParams(projectToken as any, manager, {
                projectId: BigNumber.from(2),
                data: 'deprecateProject2',
            }));
        }

        if (pause) {
            await callPausable_Pause(projectToken, deployer, admins, admin);
        }

        return {
            ...fixture,
            depositor1,
        };
    }

    describe('7.2.1. initialize(address, address, string, uint256)', async () => {
        it('7.2.1.1. Deploy successfully', async () => {
            const { projectToken, admin, feeReceiver, validator, estateToken } = await beforeProjectTokenTest();

            const tx = projectToken.deployTransaction;
            await expect(tx).to.emit(projectToken, 'BaseURIUpdate').withArgs(
                LaunchInitialization.PROJECT_TOKEN_BaseURI
            );

            expect(await projectToken.paused()).to.equal(false);

            expect(await projectToken.projectNumber()).to.equal(0);

            expect(await projectToken.admin()).to.equal(admin.address);
            expect(await projectToken.estateToken()).to.equal(estateToken.address);
            expect(await projectToken.feeReceiver()).to.equal(feeReceiver.address);

            expect(await projectToken.validator()).to.equal(validator.getAddress());

            expect(await projectToken.decimals()).to.equal(Constant.PROJECT_TOKEN_MAX_DECIMALS);
        });
    });

    describe('7.2.2. updateBaseURI(string, bytes[])', async () => {
        it('7.2.2.1. updateBaseURI successfully with valid signatures', async () => {
            const { projectToken, admin, admins } = await beforeProjectTokenTest({
                addSampleProjects: true,        
            });

            const message = ethers.utils.defaultAbiCoder.encode(
                ["address", "string", "string"],
                [projectToken.address, "updateBaseURI", "NewBaseURI:"]
            );
            const signatures = await getSignatures(message, admins, await admin.nonce());

            const tx = await projectToken.updateBaseURI("NewBaseURI:", signatures);
            await tx.wait();

            await expect(tx).to
                .emit(projectToken, 'BaseURIUpdate')
                .withArgs("NewBaseURI:");

            expect(await projectToken.uri(1)).to.equal("NewBaseURI:initiator1_uri");
            expect(await projectToken.uri(2)).to.equal("NewBaseURI:initiator2_uri");
        });

        it('7.2.2.2. updateBaseURI unsuccessfully with invalid signatures', async () => {
            const { projectToken, admin, admins } = await beforeProjectTokenTest();

            const message = ethers.utils.defaultAbiCoder.encode(
                ["address", "string", "string"],
                [projectToken.address, "updateBaseURI", "NewBaseURI:"]
            );
            const invalidSignatures = await getSignatures(message, admins, (await admin.nonce()).add(1));

            await expect(projectToken.updateBaseURI(
                "NewBaseURI:",
                invalidSignatures
            )).to.be.revertedWithCustomError(admin, 'FailedVerification');
        });
    });

    describe('7.2.3. updateZoneRoyaltyRate(uint256, bytes[])', async () => {
        it('7.2.3.1. updateZoneRoyaltyRate successfully with valid signatures', async () => {
            const fixture = await beforeProjectTokenTest();
            const { projectToken, admin, admins, zone1, zone2 } = fixture;

            const rate1 = ethers.utils.parseEther('0.2');
            const message1 = ethers.utils.defaultAbiCoder.encode(
                ["address", "string", "bytes32", "uint256"],
                [projectToken.address, "updateZoneRoyaltyRate", zone1, rate1]
            );

            const signatures1 = await getSignatures(message1, admins, await admin.nonce());

            const tx1 = await projectToken.updateZoneRoyaltyRate(zone1, rate1, signatures1);
            await tx1.wait();

            await expect(tx1).to.emit(projectToken, 'ZoneRoyaltyRateUpdate').withArgs(
                zone1,
                (rate: any) => {
                    expect(structToObject(rate)).to.deep.equal({
                        value: rate1,
                        decimals: Constant.COMMON_RATE_DECIMALS,
                    });
                    return true;
                }
            );

            expect(structToObject(await projectToken.getZoneRoyaltyRate(zone1))).to.deep.equal({
                value: rate1,
                decimals: Constant.COMMON_RATE_DECIMALS,
            });

            const rate2 = ethers.utils.parseEther('0.3');
            const message2 = ethers.utils.defaultAbiCoder.encode(
                ["address", "string", "bytes32", "uint256"],
                [projectToken.address, "updateZoneRoyaltyRate", zone2, rate2]
            );
            const signatures2 = await getSignatures(message2, admins, await admin.nonce());

            const tx2 = await projectToken.updateZoneRoyaltyRate(zone2, rate2, signatures2);
            await tx2.wait();

            await expect(tx2).to.emit(projectToken, 'ZoneRoyaltyRateUpdate').withArgs(
                zone2,
                (rate: any) => {
                    expect(structToObject(rate)).to.deep.equal({
                        value: rate2,
                        decimals: Constant.COMMON_RATE_DECIMALS,
                    });
                    return true;
                }
            );

            expect(structToObject(await projectToken.getZoneRoyaltyRate(zone2))).to.deep.equal({
                value: rate2,
                decimals: Constant.COMMON_RATE_DECIMALS,
            });
        });

        it('7.2.3.2. updateZoneRoyaltyRate unsuccessfully with invalid signatures', async () => {
            const fixture = await beforeProjectTokenTest();
            const { projectToken, admin, admins, zone1 } = fixture;

            const message = ethers.utils.defaultAbiCoder.encode(
                ["address", "string", "bytes32", "uint256"],
                [projectToken.address, "updateZoneRoyaltyRate", zone1, ethers.utils.parseEther('0.2')]
            );
            const invalidSignatures = await getSignatures(message, admins, (await admin.nonce()).add(1));

            await expect(projectToken.updateZoneRoyaltyRate(
                zone1,
                ethers.utils.parseEther('0.2'),
                invalidSignatures
            )).to.be.revertedWithCustomError(admin, 'FailedVerification');
        });

        it('7.2.3.3. updateZoneRoyaltyRate unsuccessfully with invalid rate', async () => {
            const fixture = await beforeProjectTokenTest();
            const { projectToken, admin, admins, zone1 } = fixture;

            const rate = Constant.COMMON_RATE_MAX_FRACTION.add(1);
            let message = ethers.utils.defaultAbiCoder.encode(
                ["address", "string", "bytes32", "uint256"],
                [projectToken.address, "updateZoneRoyaltyRate", zone1, rate]
            );
            const signatures = await getSignatures(message, admins, await admin.nonce());

            await expect(projectToken.updateZoneRoyaltyRate(
                zone1,
                rate,
                signatures
            )).to.be.revertedWithCustomError(projectToken, 'InvalidRate');
        });

        it('7.2.3.4. updateZoneRoyaltyRate unsuccessfully with invalid zone', async () => {
            const fixture = await beforeProjectTokenTest();
            const { projectToken, admin, admins } = fixture;

            const zone = ethers.utils.formatBytes32String('invalid zone');
            const rate = ethers.utils.parseEther('0.2');

            let message = ethers.utils.defaultAbiCoder.encode(
                ["address", "string", "bytes32", "uint256"],
                [projectToken.address, "updateZoneRoyaltyRate", zone, rate]
            );
            const signatures = await getSignatures(message, admins, await admin.nonce());

            await expect(projectToken.updateZoneRoyaltyRate(
                zone,
                rate,
                signatures
            )).to.be.revertedWithCustomError(projectToken, 'InvalidZone');
        });
    });


    describe('7.2.4. authorizeLaunchpads(address[], bool, bytes[])', async () => {
        it('7.2.4.1. Authorize launchpads successfully with valid signatures', async () => {
            const { projectToken, admin, admins, launchpads } = await beforeProjectTokenTest();

            const toBeLaunchpads = launchpads.slice(0, 3);

            const message = ethers.utils.defaultAbiCoder.encode(
                ['address', 'string', 'address[]', 'bool'],
                [projectToken.address, 'authorizeLaunchpads', toBeLaunchpads.map(x => x.address), true]
            );
            const signatures = await getSignatures(message, admins, await admin.nonce());

            const tx = await projectToken.authorizeLaunchpads(
                toBeLaunchpads.map(x => x.address),
                true,
                signatures
            );
            await tx.wait();

            for (const launchpad of toBeLaunchpads) {
                await expect(tx).to
                    .emit(projectToken, 'LaunchpadAuthorization')
                    .withArgs(launchpad.address);
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

        it('7.2.4.2. Authorize launchpad unsuccessfully with invalid signatures', async () => {
            const { projectToken, admin, admins, launchpads } = await beforeProjectTokenTest();

            const toBeLaunchpads = launchpads.slice(0, 3);

            const message = ethers.utils.defaultAbiCoder.encode(
                ['address', 'string', 'address[]', 'bool'],
                [projectToken.address, 'authorizeLaunchpads', toBeLaunchpads.map(x => x.address), true]
            );
            const invalidSignatures = await getSignatures(message, admins, (await admin.nonce()).add(1));

            await expect(projectToken.authorizeLaunchpads(
                toBeLaunchpads.map(x => x.address),
                true,
                invalidSignatures
            )).to.be.revertedWithCustomError(admin, 'FailedVerification');
        });

        it('7.2.4.3. Authorize launchpad reverted without reason with EOA address', async () => {
            const { projectToken, admin, admins } = await beforeProjectTokenTest();

            const invalidLaunchpad = randomWallet();

            const message = ethers.utils.defaultAbiCoder.encode(
                ['address', 'string', 'address[]', 'bool'],
                [projectToken.address, 'authorizeLaunchpads', [invalidLaunchpad.address], true]
            );
            const signatures = await getSignatures(message, admins, await admin.nonce());

            await expect(projectToken.authorizeLaunchpads(
                [invalidLaunchpad.address],
                true,
                signatures
            )).to.be.revertedWithCustomError(projectToken, 'InvalidLaunchpad');
        })

        it('7.2.4.4. Authorize launchpad reverted with contract not supporting ProjectLaunchpad interface', async () => {
            const { projectToken, admin, admins } = await beforeProjectTokenTest();

            const invalidLaunchpad = projectToken;

            const message = ethers.utils.defaultAbiCoder.encode(
                ['address', 'string', 'address[]', 'bool'],
                [projectToken.address, 'authorizeLaunchpads', [invalidLaunchpad.address], true]
            );
            const signatures = await getSignatures(message, admins, await admin.nonce());

            await expect(projectToken.authorizeLaunchpads(
                [invalidLaunchpad.address],
                true,
                signatures
            )).to.be.revertedWithCustomError(projectToken, 'InvalidLaunchpad');
        })

        it('7.2.4.5. Authorize launchpad unsuccessfully when authorizing same account twice on same tx', async () => {
            const { projectToken, admin, admins, launchpads } = await beforeProjectTokenTest();

            const duplicateLaunchpads = [launchpads[0], launchpads[1], launchpads[2], launchpads[0]];

            let message = ethers.utils.defaultAbiCoder.encode(
                ['address', 'string', 'address[]', 'bool'],
                [projectToken.address, 'authorizeLaunchpads', duplicateLaunchpads.map(x => x.address), true]
            );
            let signatures = await getSignatures(message, admins, await admin.nonce());

            await expect(projectToken.authorizeLaunchpads(
                duplicateLaunchpads.map(x => x.address),
                true,
                signatures
            )).to.be.revertedWithCustomError(projectToken, `AuthorizedAccount`)
        });

        it('7.7.2.3. Authorize launchpad unsuccessfully when authorizing same account twice on different tx', async () => {
            const { projectToken, admin, admins, launchpads } = await beforeProjectTokenTest();

            const tx1Launchpads = launchpads.slice(0, 3);

            let message = ethers.utils.defaultAbiCoder.encode(
                ['address', 'string', 'address[]', 'bool'],
                [projectToken.address, 'authorizeLaunchpads', tx1Launchpads.map(x => x.address), true]
            );
            let signatures = await getSignatures(message, admins, await admin.nonce());

            await callTransaction(projectToken.authorizeLaunchpads(
                tx1Launchpads.map(x => x.address),
                true,
                signatures
            ));

            const tx2Launchpads = [launchpads[3], launchpads[2], launchpads[4]];

            message = ethers.utils.defaultAbiCoder.encode(
                ['address', 'string', 'address[]', 'bool'],
                [projectToken.address, 'authorizeLaunchpads', tx2Launchpads.map(x => x.address), true]
            );
            signatures = await getSignatures(message, admins, await admin.nonce());

            await expect(projectToken.authorizeLaunchpads(
                tx2Launchpads.map(x => x.address),
                true,
                signatures
            )).to.be.revertedWithCustomError(projectToken, `AuthorizedAccount`)
        })

        async function setupLaunchpads(projectToken: MockProjectToken, admin: Admin, admins: any[], launchpads: any[]) {
            await callProjectToken_AuthorizeLaunchpads(
                projectToken as any,
                admins,
                launchpads.map(x => x.address),
                true,
                await admin.nonce(),
            );
        }

        it('7.2.4.6. Deauthorize launchpad successfully', async () => {
            const { projectToken, admin, admins, launchpads } = await beforeProjectTokenTest();

            await setupLaunchpads(projectToken, admin, admins, launchpads);

            const toDeauth = launchpads.slice(0, 2);

            const message = ethers.utils.defaultAbiCoder.encode(
                ['address', 'string', 'address[]', 'bool'],
                [projectToken.address, 'authorizeLaunchpads', toDeauth.map(x => x.address), false]
            );
            const signatures = await getSignatures(message, admins, await admin.nonce());

            const tx = await projectToken.authorizeLaunchpads(
                toDeauth.map(x => x.address),
                false,
                signatures
            );
            await tx.wait();

            for (const launchpad of toDeauth) {
                await expect(tx).to
                    .emit(projectToken, 'LaunchpadDeauthorization')
                    .withArgs(launchpad.address);
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

        it('7.2.4.7. Deauthorize launchpad unsuccessfully with unauthorized account', async () => {
            const { projectToken, admin, admins, launchpads } = await beforeProjectTokenTest();

            await setupLaunchpads(projectToken, admin, admins, launchpads);

            const account = randomWallet();
            const toDeauth = [launchpads[0], account];

            const message = ethers.utils.defaultAbiCoder.encode(
                ['address', 'string', 'address[]', 'bool'],
                [projectToken.address, 'authorizeLaunchpads', toDeauth.map(x => x.address), false]
            );
            const signatures = await getSignatures(message, admins, await admin.nonce());

            await expect(projectToken.authorizeLaunchpads(
                toDeauth.map(x => x.address),
                false,
                signatures
            )).to.be.revertedWithCustomError(projectToken, `NotAuthorizedAccount`)
        });

        it('7.2.4.8. Deauthorize launchpad unsuccessfully when unauthorizing same accounts twice on same tx', async () => {
            const { projectToken, admin, admins, launchpads } = await beforeProjectTokenTest();

            await setupLaunchpads(projectToken, admin, admins, launchpads);

            const toDeauth = launchpads.slice(0, 2).concat([launchpads[0]]);

            const message = ethers.utils.defaultAbiCoder.encode(
                ['address', 'string', 'address[]', 'bool'],
                [projectToken.address, 'authorizeLaunchpads', toDeauth.map(x => x.address), false]
            );
            const signatures = await getSignatures(message, admins, await admin.nonce());

            await expect(projectToken.authorizeLaunchpads(
                toDeauth.map(x => x.address),
                false,
                signatures
            )).to.be.revertedWithCustomError(projectToken, `NotAuthorizedAccount`)
        });

        it('7.2.4.9. Deauthorize launchpad unsuccessfully when unauthorizing same accounts twice on different tx', async () => {
            const { projectToken, admin, admins, launchpads } = await beforeProjectTokenTest();

            await setupLaunchpads(projectToken, admin, admins, launchpads);

            const tx1Accounts = launchpads.slice(0, 2);
            await callProjectToken_AuthorizeLaunchpads(
                projectToken as any,
                admins,
                tx1Accounts.map(x => x.address),
                false,
                await admin.nonce()
            );

            const tx2Accounts = [launchpads[0]];
            const message = ethers.utils.defaultAbiCoder.encode(
                ['address', 'string', 'address[]', 'bool'],
                [projectToken.address, 'authorizeLaunchpads', tx2Accounts.map(x => x.address), false]
            );
            const signatures = await getSignatures(message, admins, await admin.nonce());

            await expect(projectToken.authorizeLaunchpads(
                tx2Accounts.map(x => x.address),
                false,
                signatures
            )).to.be.revertedWithCustomError(projectToken, `NotAuthorizedAccount`)
        });
    });

    describe('7.2.5. registerInitiator(bytes32, address, string, (uint256, uint256, bytes))', async () => {        
        async function beforeRegisterInitiatorTest(fixture: ProjectTokenFixture): Promise<{
            defaultParams: RegisterInitiatorParams,
        }> {
            const { zone1, initiator1 } = fixture;

            const defaultParams: RegisterInitiatorParams = {
                zone: zone1,
                initiator: initiator1.address,
                uri: "initiator_uri",
            }

            return { defaultParams }
        }

        it('7.2.5.1. register initiator successfully', async () => {
            const fixture = await beforeProjectTokenTest();
            const { projectToken, manager, validator } = fixture;

            const { defaultParams: params } = await beforeRegisterInitiatorTest(fixture);

            const tx = await getRegisterInitiatorTx(projectToken, validator, manager, params);
            await tx.wait();

            await expect(tx).to.emit(projectToken, 'InitiatorRegistration').withArgs(
                params.zone,
                params.initiator,
                params.uri
            );
            expect(await projectToken.initiatorURI(params.zone, params.initiator)).to.equal(params.uri);
        });

        it('7.2.5.2. register initiator unsuccessfully by non-manager', async () => {
            const fixture = await beforeProjectTokenTest();
            const { projectToken, moderator, user, validator } = fixture;

            const { defaultParams: params } = await beforeRegisterInitiatorTest(fixture);

            // By moderator
            await expect(getRegisterInitiatorTx(projectToken, validator, moderator, params))
                .to.be.revertedWithCustomError(projectToken, `Unauthorized`);

            // By user
            await expect(getRegisterInitiatorTx(projectToken, validator, user, params))
                .to.be.revertedWithCustomError(projectToken, `Unauthorized`);
        });

        it('7.2.5.3. register initiator unsuccessfully with inactive zone', async () => {
            const fixture = await beforeProjectTokenTest();
            const { projectToken, manager, validator } = fixture;

            const { defaultParams } = await beforeRegisterInitiatorTest(fixture);

            const zone = ethers.utils.formatBytes32String('invalid zone');
            const params: RegisterInitiatorParams = {
                ...defaultParams,
                zone: zone,
            }

            await expect(getRegisterInitiatorTx(projectToken, validator, manager, params))
                .to.be.revertedWithCustomError(projectToken, `Unauthorized`);
        });

        it('7.2.5.4. register initiator unsuccessfully with inactive manager in zone', async () => {
            const fixture = await beforeProjectTokenTest();
            const { projectToken, manager, admin, admins, validator } = fixture;

            const { defaultParams: params } = await beforeRegisterInitiatorTest(fixture);

            await callAdmin_ActivateIn(
                admin,
                admins,
                params.zone,
                [manager.address],
                false,
                await admin.nonce()
            )

            await expect(getRegisterInitiatorTx(projectToken, validator, manager, params))
                .to.be.revertedWithCustomError(projectToken, `Unauthorized`);
        });

        it('7.2.5.5. register initiator unsuccessfully with invalid validation', async () => {
            const fixture = await beforeProjectTokenTest();
            const { projectToken, manager, validator } = fixture;

            const { defaultParams: params } = await beforeRegisterInitiatorTest(fixture);

            const validation = await getRegisterInitiatorInvalidValidation(
                projectToken,
                validator,
                params
            );

            await expect(projectToken.connect(manager).registerInitiator(
                params.zone,
                params.initiator,
                params.uri,
                validation
            )).to.be.revertedWithCustomError(projectToken, `InvalidSignature`);
        });

        it('7.2.5.6. register initiator unsuccessfully with invalid uri', async () => {
            const fixture = await beforeProjectTokenTest();
            const { projectToken, manager, validator } = fixture;

            const { defaultParams } = await beforeRegisterInitiatorTest(fixture);
            const params = {
                ...defaultParams,
                uri: "",
            }

            await expect(getRegisterInitiatorTx(projectToken, validator, manager, params))
                .to.be.revertedWithCustomError(projectToken, `InvalidURI`);
        });
    });

    describe('7.2.6. isInitiatorIn(bytes32, address)', async () => {
        it('7.2.6.1. return correct value', async () => {
            const fixture = await beforeProjectTokenTest();
            const { projectToken, manager, initiator1, initiator2, zone1, zone2, validator } = fixture;

            const params: RegisterInitiatorParams = {
                zone: zone1,
                initiator: initiator1.address,
                uri: "initiator_uri",
            }

            await callTransaction(getRegisterInitiatorTx(projectToken, validator, manager, params));

            expect(await projectToken.isInitiatorIn(zone1, initiator1.address)).to.be.true;
            expect(await projectToken.isInitiatorIn(zone1, initiator2.address)).to.be.false;
            expect(await projectToken.isInitiatorIn(zone2, initiator1.address)).to.be.false;
            expect(await projectToken.isInitiatorIn(zone2, initiator2.address)).to.be.false;
        });
    });

    describe('7.2.7. getProject(uint256)', async () => {
        it('7.2.7.1. return with valid project id', async () => {
            const fixture = await beforeProjectTokenTest({
                addSampleProjects: true,
            });
            const { projectToken } = fixture;

            await expect(projectToken.getProject(1)).to.not.be.reverted;
            await expect(projectToken.getProject(2)).to.not.be.reverted;
        });

        it('7.2.7.2. revert with invalid project id', async () => {
            const fixture = await beforeProjectTokenTest();
            const { projectToken } = fixture;

            await expect(projectToken.getProject(0))
                .to.be.revertedWithCustomError(projectToken, `InvalidProjectId`);
            await expect(projectToken.getProject(100))
                .to.be.revertedWithCustomError(projectToken, `InvalidProjectId`);
        });
    });

    describe('7.2.8. isAvailable(uint256)', async () => {
        it('7.2.8.1. return true for undeprecated project and untokenized project', async () => {
            const fixture = await beforeProjectTokenTest({
                addSampleProjects: true,
            });
            const { projectToken } = fixture;

            expect(await projectToken.isAvailable(1)).to.be.true;
            expect(await projectToken.isAvailable(2)).to.be.true;
        });

        it('7.2.8.2. return false for deprecated project', async () => {
            const fixture = await beforeProjectTokenTest({
                addSampleProjects: true,
            });
            const { projectToken, manager } = fixture;

            await callTransaction(getSafeDeprecateProjectTxByParams(projectToken as any, manager, {
                projectId: BigNumber.from(1),
                data: 'deprecateProject1',
            }));
            await callTransaction(getSafeDeprecateProjectTxByParams(projectToken as any, manager, {
                projectId: BigNumber.from(2),
                data: 'deprecateProject2',
            }));

            expect(await projectToken.isAvailable(1)).to.be.false;
            expect(await projectToken.isAvailable(2)).to.be.false;
        });

        it('7.2.8.3. return false for tokenized project', async () => {
            const fixture = await beforeProjectTokenTest({
                addSampleProjects: true,
                mintProjectTokenForDepositor: true,
                tokenizeProject: true,
            });
            const { projectToken, manager } = fixture;

            expect(await projectToken.isAvailable(1)).to.be.false;
            expect(await projectToken.isAvailable(2)).to.be.false;
        });
    });

    describe('7.2.9. launchProject(bytes32, uint256, address, string)', async () => {
        async function beforeLaunchProjectTest(fixture: ProjectTokenFixture): Promise<{
            defaultParams: LaunchProjectParams,
        }> {
            const { zone1, initiator1 } = fixture;

            const defaultParams: LaunchProjectParams = {
                zone: zone1,
                launchId: BigNumber.from(10),
                initiator: initiator1.address,
                uri: "project_uri",
            }

            return { defaultParams }
        }

        it('7.2.9.1. launch project successfully', async () => {
            const fixture = await beforeProjectTokenTest();

            const { projectToken, prestigePad, zone1, initiator1 } = fixture;

            const currentProjectNumber = await projectToken.projectNumber();

            // Tx1: Launch project 1
            const params1: LaunchProjectParams = {
                zone: zone1,
                launchId: BigNumber.from(10),
                initiator: initiator1.address,
                uri: "project_uri",
            };

            let timestamp = await time.latest() + 1000;
            await time.setNextBlockTimestamp(timestamp);

            const tx1 = await getCallLaunchProjectTx(projectToken, prestigePad, params1);
            await tx1.wait();

            const projectId1 = currentProjectNumber.add(1);

            await expect(tx1).to.emit(projectToken, 'NewToken').withArgs(
                projectId1,
                params1.zone,
                params1.launchId,
                prestigePad.address,
                params1.initiator
            );

            const project1 = await projectToken.getProject(projectId1);
            expect(project1.estateId).to.equal(0);
            expect(project1.zone).to.equal(params1.zone);
            expect(project1.launchId).to.equal(params1.launchId);
            expect(project1.launchpad).to.equal(prestigePad.address);
            expect(project1.tokenizeAt).to.equal(timestamp);
            expect(project1.deprecateAt).to.equal(Constant.COMMON_INFINITE_TIMESTAMP);
            expect(project1.initiator).to.equal(params1.initiator);

            expect(await projectToken.projectNumber()).to.equal(projectId1);
            expect(await projectToken.uri(projectId1)).to.equal(LaunchInitialization.PROJECT_TOKEN_BaseURI + params1.uri);

            // Tx2: Launch project 2
            const params2: LaunchProjectParams = {
                zone: zone1,
                launchId: BigNumber.from(20),
                initiator: initiator1.address,
                uri: "project_uri",
            };

            timestamp += 10;
            await time.setNextBlockTimestamp(timestamp);

            const tx2 = await getCallLaunchProjectTx(projectToken, prestigePad, params2);
            await tx2.wait();

            const projectId2 = currentProjectNumber.add(2);

            await expect(tx2).to.emit(projectToken, 'NewToken').withArgs(
                projectId2,
                params2.zone,
                params2.launchId,
                prestigePad.address,
                params2.initiator
            );

            const project2 = await projectToken.getProject(projectId2);
            expect(project2.estateId).to.equal(0);
            expect(project2.zone).to.equal(params2.zone);
            expect(project2.launchId).to.equal(params2.launchId);
            expect(project2.launchpad).to.equal(prestigePad.address);
            expect(project2.tokenizeAt).to.equal(timestamp);
            expect(project2.deprecateAt).to.equal(Constant.COMMON_INFINITE_TIMESTAMP);
            expect(project2.initiator).to.equal(params2.initiator);

            expect(await projectToken.projectNumber()).to.equal(projectId2);
            expect(await projectToken.uri(projectId2)).to.equal(LaunchInitialization.PROJECT_TOKEN_BaseURI + params2.uri);
        });

        it('7.2.9.2. launch project unsuccessfully when paused', async () => {
            const fixture = await beforeProjectTokenTest({
                pause: true,
            });
            const { projectToken, prestigePad } = fixture;

            const { defaultParams: params } = await beforeLaunchProjectTest(fixture);

            await expect(getCallLaunchProjectTx(projectToken, prestigePad, params))
                .to.be.revertedWith(`Pausable: paused`);
        });

        it('7.2.9.3. launch project unsuccessfully by non-launchpad sender', async () => {
            const fixture = await beforeProjectTokenTest({
                skipAuthorizeLaunchpad: true,
            });
            const { projectToken, prestigePad } = fixture;

            const { defaultParams: params } = await beforeLaunchProjectTest(fixture);

            await expect(getCallLaunchProjectTx(projectToken, prestigePad, params))
                .to.be.revertedWithCustomError(projectToken, `Unauthorized`);
        });

        it('7.2.9.4. launch project unsuccessfully when zone is inactive', async () => {
            const fixture = await beforeProjectTokenTest();
            const { projectToken, prestigePad } = fixture;

            const zone = ethers.utils.formatBytes32String('invalid zone');

            const { defaultParams } = await beforeLaunchProjectTest(fixture);

            const params: LaunchProjectParams = {
                ...defaultParams,
                zone: zone,
            }
            await expect(getCallLaunchProjectTx(projectToken, prestigePad, params))
                .to.be.revertedWithCustomError(projectToken, `InvalidInput`);
        });
    });

    describe('7.2.10. mint(uint256, uint256)', async () => {
        it('7.2.10.1. mint project token successfully', async () => {
            const fixture = await beforeProjectTokenTest({
                addSampleProjects: true,
            });
            const { projectToken, prestigePad } = fixture;

            // Tx1: Mint project 1
            const params1: MintParams = {
                projectId: BigNumber.from(1),
                amount: BigNumber.from(100),
            }

            const tx1 = await getCallMintTx(projectToken, prestigePad, params1);

            await expect(tx1).to.emit(projectToken, 'TransferSingle').withArgs(
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
            }

            const tx2 = await getCallMintTx(projectToken, prestigePad, params2);

            await expect(tx2).to.emit(projectToken, 'TransferSingle').withArgs(
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
            }

            const tx3 = await getCallMintTx(projectToken, prestigePad, params3);

            await expect(tx3).to.emit(projectToken, 'TransferSingle').withArgs(
                prestigePad.address,
                ethers.constants.AddressZero,
                prestigePad.address,
                params3.projectId,
                params3.amount
            );

            expect(await projectToken.balanceOf(prestigePad.address, 1)).to.equal(params1.amount.add(params3.amount));
            expect(await projectToken.balanceOf(prestigePad.address, 2)).to.equal(params2.amount);
        });

        it('7.2.10.2. mint unsuccessfully with invalid project id', async () => {
            const fixture = await beforeProjectTokenTest();
            const { projectToken, prestigePad } = fixture;

            const params1: MintParams = {
                projectId: BigNumber.from(0),
                amount: BigNumber.from(100),
            }
            await expect(getCallMintTx(projectToken, prestigePad, params1))
                .to.be.revertedWithCustomError(projectToken, `InvalidProjectId`);

            const params2: MintParams = {
                projectId: BigNumber.from(100),
                amount: BigNumber.from(100),
            }
            await expect(getCallMintTx(projectToken, prestigePad, params2))
                .to.be.revertedWithCustomError(projectToken, `InvalidProjectId`);
        });

        it('7.2.10.3. mint unsuccessfully with deprecated project', async () => {
            const fixture = await beforeProjectTokenTest({
                addSampleProjects: true,
                deprecateProjects: true,
            });
            const { projectToken, prestigePad } = fixture;

            const params: MintParams = {
                projectId: BigNumber.from(1),
                amount: BigNumber.from(100),
            }
            await expect(getCallMintTx(projectToken, prestigePad, params))
                .to.be.revertedWithCustomError(projectToken, `InvalidProjectId`);
        });

        it('7.2.10.4. mint unsuccessfully when when sender is not launchpad of project', async () => {
            const fixture = await beforeProjectTokenTest({
                addSampleProjects: true,
            });
            const { projectToken, manager } = fixture;

            const params: MintParams = {
                projectId: BigNumber.from(1),
                amount: BigNumber.from(100),
            }
            await expect(projectToken.connect(manager).mint(params.projectId, params.amount))
                .to.be.revertedWithCustomError(projectToken, `Unauthorized`);
        });

        it('7.2.10.5. mint unsuccessfully when paused', async () => {
            const fixture = await beforeProjectTokenTest({
                addSampleProjects: true,
                pause: true,
            });
            const { projectToken, prestigePad } = fixture;

            const params: MintParams = {
                projectId: BigNumber.from(1),
                amount: BigNumber.from(100),
            }
            await expect(getCallMintTx(projectToken, prestigePad, params))
                .to.be.revertedWith(`Pausable: paused`);
        });
    });

    describe('7.2.11. safeDeprecateProject(uint256, string, bytes32)', async () => {
        it('7.2.11.1. safe deprecate project successfully', async () => {
            const fixture = await beforeProjectTokenTest({
                addSampleProjects: true,
            });
            const { projectToken, manager } = fixture;

            let timestamp = await time.latest() + 1000;
            await time.setNextBlockTimestamp(timestamp);
            
            const params: DeprecateProjectParams = {
                projectId: BigNumber.from(1),
                data: 'deprecateProject1',
            };
            const tx = await getSafeDeprecateProjectTxByParams(projectToken as any, manager, params);
            await tx.wait();

            await expect(tx).to.emit(projectToken, 'ProjectDeprecation').withArgs(
                params.projectId,
                params.data
            );

            const project = await projectToken.getProject(1);
            expect(project.deprecateAt).to.equal(timestamp);
        });

        it('7.2.11.2. safe deprecate project unsuccessfully with invalid project id', async () => {
            const fixture = await beforeProjectTokenTest();
            const { projectToken, manager } = fixture;

            const params1: DeprecateProjectParams = {
                projectId: BigNumber.from(0),
                data: 'deprecateProject1',
            };
            await expect(getSafeDeprecateProjectTxByParams(projectToken as any, manager, params1))
                .to.be.revertedWithCustomError(projectToken, `InvalidProjectId`);

            const params2: DeprecateProjectParams = {
                projectId: BigNumber.from(100),
                data: 'deprecateProject1',
            };
            await expect(getSafeDeprecateProjectTxByParams(projectToken as any, manager, params2))
                .to.be.revertedWithCustomError(projectToken, `InvalidProjectId`);            
        });

        it('7.2.11.2. safe deprecate project unsuccessfully with invalid anchor', async () => {
            const fixture = await beforeProjectTokenTest({
                addSampleProjects: true,
            });
            const { projectToken, manager } = fixture;

            const params: SafeDeprecateProjectParams = {
                projectId: BigNumber.from(1),
                data: 'deprecateProject1',
                anchor: ethers.utils.keccak256(ethers.utils.toUtf8Bytes('invalid anchor')),
            };
            await expect(getSafeDeprecateProjectTx(projectToken as any, manager, params))
                .to.be.revertedWithCustomError(projectToken, `BadAnchor`);
        });

        it('7.2.11.3. safe deprecate project unsuccessfully with already deprecated project', async () => {
            const fixture = await beforeProjectTokenTest({
                addSampleProjects: true,
                deprecateProjects: true,
            });
            const { projectToken, manager } = fixture;

            const params1: DeprecateProjectParams = {
                projectId: BigNumber.from(1),
                data: 'deprecateProject1',
            };
            await expect(getSafeDeprecateProjectTxByParams(projectToken as any, manager, params1))
                .to.be.revertedWithCustomError(projectToken, `InvalidProjectId`);

            const params2: DeprecateProjectParams = {
                projectId: BigNumber.from(2),
                data: 'deprecateProject1',
            };
            await expect(getSafeDeprecateProjectTxByParams(projectToken as any, manager, params2))
                .to.be.revertedWithCustomError(projectToken, `InvalidProjectId`);
        });

        it('7.2.11.4. safe deprecate project unsuccessfully with non-manager sender', async () => {
            const fixture = await beforeProjectTokenTest({
                addSampleProjects: true,
            });
            const { projectToken, moderator, user } = fixture;

            // By moderator
            const params1: DeprecateProjectParams = {
                projectId: BigNumber.from(1),
                data: 'deprecateProject1',
            };
            await expect(getSafeDeprecateProjectTxByParams(projectToken as any, moderator, params1))
                .to.be.revertedWithCustomError(projectToken, `Unauthorized`);

            // By user
            const params2: DeprecateProjectParams = {
                projectId: BigNumber.from(1),
                data: 'deprecateProject1',
            };
            await expect(getSafeDeprecateProjectTxByParams(projectToken as any, user, params2))
                .to.be.revertedWithCustomError(projectToken, `Unauthorized`);
        });

        it('7.2.11.6. safe deprecate project unsuccessfully with inactive manager in zone', async () => {
            const fixture = await beforeProjectTokenTest({
                addSampleProjects: true,
            });
            const { projectToken, manager, admin, admins, zone1 } = fixture;

            await callAdmin_ActivateIn(
                admin,
                admins,
                zone1,
                [manager.address],
                false,
                await admin.nonce()
            );

            const params: DeprecateProjectParams = {
                projectId: BigNumber.from(1),
                data: 'deprecateProject1',
            };
            await expect(getSafeDeprecateProjectTxByParams(projectToken as any, manager, params))
                .to.be.revertedWithCustomError(projectToken, `Unauthorized`);
        });
    
        it('7.2.11.7. safe deprecate project unsuccessfully when paused', async () => {
            const fixture = await beforeProjectTokenTest({
                addSampleProjects: true,
                pause: true,
            });
            const { projectToken, manager } = fixture;

            const params: DeprecateProjectParams = {
                projectId: BigNumber.from(1),
                data: 'deprecateProject1',
            };
            await expect(getSafeDeprecateProjectTxByParams(projectToken as any, manager, params))
                .to.be.revertedWith(`Pausable: paused`);
        });
    });

    describe('7.2.12. safeUpdateProjectURI(uint256, string, (uint256, uint256, bytes), bytes32)', async () => {
        it('7.2.12.1. safe update project uri successfully', async () => {
            const fixture = await beforeProjectTokenTest({
                addSampleProjects: true,
            });
            const { projectToken, manager, validator } = fixture;

            const params: UpdateProjectURIParams = {
                projectId: BigNumber.from(1),
                uri: 'new_project_uri_1',
            }

            const tx = await getSafeUpdateProjectURITxByParams(projectToken, validator, manager, params);
            await tx.wait();

            await expect(tx).to.emit(projectToken, 'URI').withArgs(
                LaunchInitialization.PROJECT_TOKEN_BaseURI + params.uri,
                1,
            );

            expect(await projectToken.uri(1)).to.equal(LaunchInitialization.PROJECT_TOKEN_BaseURI + params.uri);
        });

        it('7.2.12.2. safe update project uri unsuccessfully with invalid project id', async () => {
            const fixture = await beforeProjectTokenTest();
            const { projectToken, manager, validator } = fixture;

            const params: UpdateProjectURIParams = {
                projectId: BigNumber.from(0),
                uri: 'new_project_uri_1',
            }
            await expect(getSafeUpdateProjectURITxByParams(projectToken, validator, manager, params))
                .to.be.revertedWithCustomError(projectToken, `InvalidProjectId`);

            const params2: UpdateProjectURIParams = {
                projectId: BigNumber.from(100),
                uri: 'new_project_uri_1',
            }
            await expect(getSafeUpdateProjectURITxByParams(projectToken, validator, manager, params2))
                .to.be.revertedWithCustomError(projectToken, `InvalidProjectId`);
        });

        it('7.2.12.3. safe update project uri unsuccessfully with invalid anchor', async () => {
            const fixture = await beforeProjectTokenTest({
                addSampleProjects: true,
            });
            const { projectToken, manager, validator } = fixture;
            
            const params: SafeUpdateProjectURIParams = {
                projectId: BigNumber.from(1),
                uri: 'new_project_uri_1',
                anchor: ethers.utils.keccak256(ethers.utils.toUtf8Bytes('invalid anchor')),
            }
            await expect(getSafeUpdateProjectURITx(projectToken, validator, manager, params))
                .to.be.revertedWithCustomError(projectToken, `BadAnchor`);
        });

        it('7.2.12.3. safe update project uri unsuccessfully with already deprecated project', async () => {
            const fixture = await beforeProjectTokenTest({
                addSampleProjects: true,
                deprecateProjects: true,
            });
            const { projectToken, manager, validator } = fixture;

            const params: UpdateProjectURIParams = {
                projectId: BigNumber.from(1),
                uri: 'new_project_uri_1',
            }
            await expect(getSafeUpdateProjectURITxByParams(projectToken, validator, manager, params))
                .to.be.revertedWithCustomError(projectToken, `InvalidProjectId`);
        });

        it('7.2.12.4. safe update project uri unsuccessfully with non-manager sender', async () => {
            const fixture = await beforeProjectTokenTest({
                addSampleProjects: true,
            });
            const { projectToken, moderator, user, validator } = fixture;

            const params: UpdateProjectURIParams = {
                projectId: BigNumber.from(1),
                uri: 'new_project_uri_1',
            }
            
            // By moderator
            await expect(getSafeUpdateProjectURITxByParams(projectToken, validator, moderator, params))
                .to.be.revertedWithCustomError(projectToken, `Unauthorized`);

            // By user
            await expect(getSafeUpdateProjectURITxByParams(projectToken, validator, user, params))
                .to.be.revertedWithCustomError(projectToken, `Unauthorized`);
        });

        it('7.2.12.6. safe update project uri unsuccessfully with inactive manager in zone', async () => {
            const fixture = await beforeProjectTokenTest({
                addSampleProjects: true,
            });
            const { projectToken, manager, admin, admins, zone1, validator } = fixture;

            await callAdmin_ActivateIn(
                admin,
                admins,
                zone1,
                [manager.address],
                false,
                await admin.nonce()
            );

            const params: UpdateProjectURIParams = {
                projectId: BigNumber.from(1),
                uri: 'new_project_uri_1',
            }
            await expect(getSafeUpdateProjectURITxByParams(projectToken, validator, manager, params))
                .to.be.revertedWithCustomError(projectToken, `Unauthorized`);
        });
    
        it('7.2.12.7. safe update project uri unsuccessfully when paused', async () => {
            const fixture = await beforeProjectTokenTest({
                addSampleProjects: true,
                pause: true,
            });
            const { projectToken, manager, validator } = fixture;

            const params: UpdateProjectURIParams = {
                projectId: BigNumber.from(1),
                uri: 'new_project_uri_1',
            }
            await expect(getSafeUpdateProjectURITxByParams(projectToken, validator, manager, params))
                .to.be.revertedWith(`Pausable: paused`);
        });

        it('7.2.12.8. safe update project uri unsuccessfully with invalid validation', async () => {
            const fixture = await beforeProjectTokenTest({
                addSampleProjects: true,
            });
            const { projectToken, manager, validator } = fixture;

            const currentURI = await projectToken.uri(BigNumber.from(1));
            const safeParams: SafeUpdateProjectURIParams = {
                projectId: BigNumber.from(1),
                uri: 'new_project_uri_1',
                anchor: ethers.utils.keccak256(ethers.utils.toUtf8Bytes(currentURI)),
            }

            const validation = await getSafeUpdateProjectURIInvalidValidation(
                projectToken,
                validator,
                safeParams
            );

            await expect(projectToken.connect(manager).safeUpdateProjectURI(
                safeParams.projectId,
                safeParams.uri,
                validation,
                safeParams.anchor,
            )).to.be.revertedWithCustomError(projectToken, `InvalidSignature`);
        });
    });

    describe('7.2.13. safeTokenizeProject(uint256, address, address, bytes32)', async () => {
        it('7.2.13.1. safe tokenize project successfully', async () => {
            const fixture = await beforeProjectTokenTest({
                addSampleProjects: true,
                mintProjectTokenForDepositor: true,
            });
            const { prestigePad, projectToken, manager, broker1, broker2, commissionToken, estateToken, zone1, zone2, custodian1, custodian2 } = fixture;

            const currentEstateNumber = await estateToken.estateNumber();

            // Tx1: Tokenize project 1
            let timestamp = await time.latest() + 1000;
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
            }
            const tx1 = await getSafeTokenizeProjectTxByParams(projectToken, manager, params1);
            await tx1.wait();

            await expect(tx1).to.emit(projectToken, 'ProjectTokenization').withArgs(
                projectId1,
                estateId1,
                supply1,
                custodian1.address,
                broker1.address
            );

            await expect(tx1).to.emit(estateToken, 'NewToken').withArgs(
                estateId1,
                zone1,
                projectId1,
                projectToken.address,
                custodian1.address,
                Constant.COMMON_INFINITE_TIMESTAMP,
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
            }
            const tx2 = await getSafeTokenizeProjectTxByParams(projectToken, manager, params2);
            await tx2.wait();

            await expect(tx2).to.emit(projectToken, 'ProjectTokenization').withArgs(
                projectId2,
                estateId2,
                supply2,
                custodian2.address,
                broker2.address
            );
            await expect(tx2).to.emit(estateToken, 'NewToken').withArgs(
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

        it('7.2.13.2. safe tokenize project unsuccessfully with invalid project id', async () => {
            const fixture = await beforeProjectTokenTest();
            const { projectToken, manager, broker1, custodian1 } = fixture;

            const params1: TokenizeProjectParams = {
                projectId: BigNumber.from(0),
                custodian: custodian1.address,
                broker: broker1.address,
            }
            await expect(getSafeTokenizeProjectTxByParams(projectToken, manager, params1))
                .to.be.revertedWithCustomError(projectToken, `InvalidProjectId`);

            const params2: TokenizeProjectParams = {
                projectId: BigNumber.from(100),
                custodian: custodian1.address,
                broker: broker1.address,
            }
            await expect(getSafeTokenizeProjectTxByParams(projectToken, manager, params2))
                .to.be.revertedWithCustomError(projectToken, `InvalidProjectId`);
        });

        it('7.2.13.3. safe tokenize project unsuccessfully with deprecated project', async () => {
            const fixture = await beforeProjectTokenTest({
                addSampleProjects: true,
                mintProjectTokenForDepositor: true,
                deprecateProjects: true,
            });
            const { prestigePad, projectToken, manager, broker1, custodian1 } = fixture;

            prestigePad.isFinalized.whenCalledWith(1).returns(true);

            const params: TokenizeProjectParams = {
                projectId: BigNumber.from(1),
                custodian: custodian1.address,
                broker: broker1.address,
            }
            await expect(getSafeTokenizeProjectTxByParams(projectToken, manager, params))
                .to.be.revertedWithCustomError(projectToken, `InvalidProjectId`);
        });

        it('7.2.13.4. safe tokenize project unsuccessfully by non-manager', async () => {
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
            }

            // By moderator
            await expect(getSafeTokenizeProjectTxByParams(projectToken, moderator, params))
                .to.be.revertedWithCustomError(projectToken, `Unauthorized`);

            // By user
            await expect(getSafeTokenizeProjectTxByParams(projectToken, user, params))
                .to.be.revertedWithCustomError(projectToken, `Unauthorized`);
        });

        it('7.2.13.6. safe tokenize project unsuccessfully with inactive manager in zone', async () => {
            const fixture = await beforeProjectTokenTest({
                addSampleProjects: true,
                mintProjectTokenForDepositor: true,
            });
            const { prestigePad, projectToken, manager, admin, admins, zone1, broker1, custodian1 } = fixture;

            await callAdmin_ActivateIn(
                admin,
                admins,
                zone1,
                [manager.address],
                false,
                await admin.nonce()
            );

            prestigePad.isFinalized.whenCalledWith(1).returns(true);

            const params: TokenizeProjectParams = {
                projectId: BigNumber.from(1),
                custodian: custodian1.address,
                broker: broker1.address,
            }
            await expect(getSafeTokenizeProjectTxByParams(projectToken, manager, params))
                .to.be.revertedWithCustomError(projectToken, `Unauthorized`);
        });

        it('7.2.13.7. safe tokenize project unsuccessfully when paused', async () => {
            const fixture = await beforeProjectTokenTest({
                addSampleProjects: true,
                mintProjectTokenForDepositor: true,
                pause: true,
            });
            const { prestigePad, projectToken, manager, broker1, custodian1 } = fixture;

            prestigePad.isFinalized.whenCalledWith(1).returns(true);

            const params: TokenizeProjectParams = {
                projectId: BigNumber.from(1),
                custodian: custodian1.address,
                broker: broker1.address,
            }
            await expect(getSafeTokenizeProjectTxByParams(projectToken, manager, params))
                .to.be.revertedWith(`Pausable: paused`);
        });

        it('7.2.13.8. safe tokenize project unsuccessfully with unregistered custodian', async () => {
            const fixture = await beforeProjectTokenTest({
                addSampleProjects: true,
                mintProjectTokenForDepositor: true,
            });
            const { prestigePad, projectToken, manager, broker1, custodian1 } = fixture;

            prestigePad.isFinalized.whenCalledWith(1).returns(true);

            const unregisteredCustodian = randomWallet();

            const params: TokenizeProjectParams = {
                projectId: BigNumber.from(1),
                custodian: unregisteredCustodian.address,
                broker: broker1.address,
            }
            await expect(getSafeTokenizeProjectTxByParams(projectToken, manager, params))
                .to.be.reverted;
        });

        it('7.2.13.8. safe tokenize project unsuccessfully with unregistered broker', async () => {
            const fixture = await beforeProjectTokenTest({
                addSampleProjects: true,
                mintProjectTokenForDepositor: true,
            });
            const { prestigePad, projectToken, manager, broker1, custodian1 } = fixture;

            prestigePad.isFinalized.whenCalledWith(1).returns(true);

            const unregisteredBroker = randomWallet();

            const params: TokenizeProjectParams = {
                projectId: BigNumber.from(1),
                custodian: custodian1.address,
                broker: unregisteredBroker.address,
            }
            await expect(getSafeTokenizeProjectTxByParams(projectToken, manager, params))
                .to.be.reverted
        });

        it('7.2.13.10. safe tokenize project unsuccessfully when project is already tokenized', async () => {
            const fixture = await beforeProjectTokenTest({
                addSampleProjects: true,
                mintProjectTokenForDepositor: true,
                tokenizeProject: true,
            });
            const { projectToken, manager, broker1, custodian1 } = fixture;

            const params: TokenizeProjectParams = {
                projectId: BigNumber.from(1),
                custodian: custodian1.address,
                broker: broker1.address,
            }
            await expect(getSafeTokenizeProjectTxByParams(projectToken, manager, params))
                .to.be.revertedWithCustomError(projectToken, `AlreadyTokenized`);
        });

        it('7.2.13.11. safe tokenize project unsuccessfully with zero total supply', async () => {
            const fixture = await beforeProjectTokenTest({
                addSampleProjects: true,
            });
            const { prestigePad, projectToken, manager, broker1, custodian1 } = fixture;

            prestigePad.isFinalized.whenCalledWith(1).returns(true);

            const params: TokenizeProjectParams = {
                projectId: BigNumber.from(1),
                custodian: custodian1.address,
                broker: broker1.address,
            }
            await expect(getSafeTokenizeProjectTxByParams(projectToken, manager, params))
                .to.be.revertedWithCustomError(projectToken, `NothingToTokenize`);
        });

        it('7.2.13.12. safe tokenize project unsuccessfully when project is not finalized', async () => {
            const fixture = await beforeProjectTokenTest({
                addSampleProjects: true,
                mintProjectTokenForDepositor: true,
            });
            const { projectToken, manager, broker1, custodian1 } = fixture;

            const params: TokenizeProjectParams = {
                projectId: BigNumber.from(1),
                custodian: custodian1.address,
                broker: broker1.address,
            }
            await expect(getSafeTokenizeProjectTxByParams(projectToken, manager, params))
                .to.be.revertedWithCustomError(projectToken, `InvalidTokenizing`);
        });
        
        it('7.2.13.13. safe tokenize project unsuccessfully when tokenize estate failed', async () => {
            // ProjectToken is not registered as tokenizer in estate token
            const fixture = await beforeProjectTokenTest({
                skipAddProjectTokenAsTokenizer: true,
                addSampleProjects: true,
                mintProjectTokenForDepositor: true,
            });
            const { prestigePad, estateToken, projectToken, manager, broker1, custodian1 } = fixture;

            prestigePad.isFinalized.whenCalledWith(1).returns(true);

            const params: TokenizeProjectParams = {
                projectId: BigNumber.from(1),
                custodian: custodian1.address,
                broker: broker1.address,
            }
            await expect(getSafeTokenizeProjectTxByParams(projectToken, manager, params))
                .to.be.revertedWithCustomError(estateToken, `Unauthorized`);
        });
    });

    describe('7.2.14. withdrawEstateToken(uint256)', async () => {
        it('7.2.14.1. withdraw estate token successfully', async () => {
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

            const tx1 = await projectToken.connect(depositor1).withdrawEstateToken(1);
            await tx1.wait();
            
            await expect(tx1).to.emit(projectToken, 'EstateTokenWithdrawal').withArgs(
                1,
                depositor1.address,
                amount1
            );

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
            await callTransaction(projectToken.connect(depositor2).safeTransferFrom(
                depositor2.address,
                depositor1.address,
                1,
                amount2,
                "0x"
            ));

            // Tx2: Depositor1 withdraw extra estate token from project 1
            initDepositor1EstateBalance = await estateToken.balanceOf(depositor1.address, 1);
            initProjectTokenProjectBalance = await projectToken.balanceOf(projectToken.address, 1);
            initProjectTokenEstateBalance = await estateToken.balanceOf(projectToken.address, 1);

            const tx2 = await projectToken.connect(depositor1).withdrawEstateToken(1);
            await tx2.wait();

            await expect(tx2).to.emit(projectToken, 'EstateTokenWithdrawal').withArgs(
                1,
                depositor1.address,
                amount2
            );

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

        it('7.2.14.2. withdraw zero estate token when user has zero project token balance', async () => {
            const fixture = await beforeProjectTokenTest({
                addSampleProjects: true,
                mintProjectTokenForDepositor: true,
                tokenizeProject: true,
            });
            const { projectToken, estateToken, initiator2 } = fixture;

            const tx = await projectToken.connect(initiator2).withdrawEstateToken(1);
            await tx.wait();

            await expect(tx).to.emit(projectToken, 'EstateTokenWithdrawal').withArgs(
                1,
                initiator2.address,
                0
            );

            expect(await projectToken.balanceOf(initiator2.address, 1)).to.equal(0);
            expect(await estateToken.balanceOf(initiator2.address, 1)).to.equal(0);
        });

        it('7.2.14.3. withdraw estate token unsuccessfully when contract is reentered', async () => {
            const fixture = await beforeProjectTokenTest({                
                useReentrancyERC1155ReceiverAsDepositor: true,
                addSampleProjects: true,
                mintProjectTokenForDepositor: true,
                tokenizeProject: true,
            });
            const { projectToken, reentrancyERC1155Receiver } = fixture;

            await testReentrancy_projectToken(
                fixture,
                reentrancyERC1155Receiver,
                async (timestamp: number) => {
                    await expect(reentrancyERC1155Receiver.call(
                        projectToken.address,
                        projectToken.interface.encodeFunctionData("withdrawEstateToken", [1]),
                    )).to.be.revertedWith(`ReentrancyGuard: reentrant call`);
                }
            );
        });

        it('7.2.14.4. withdraw estate token unsuccessfully with invalid project id', async () => {
            const fixture = await beforeProjectTokenTest();
            
            const { projectToken, depositor1 } = fixture;

            await expect(projectToken.connect(depositor1).withdrawEstateToken(0))
                .to.be.revertedWithCustomError(projectToken, `InvalidProjectId`);

            await expect(projectToken.connect(depositor1).withdrawEstateToken(100))
                .to.be.revertedWithCustomError(projectToken, `InvalidProjectId`);
        });
        
        it('7.2.14.5. withdraw estate token unsuccessfully when project is deprecated', async () => {
            const fixture = await beforeProjectTokenTest({
                addSampleProjects: true,
                mintProjectTokenForDepositor: true,
                tokenizeProject: true,
                deprecateProjects: true,
            });
            const { projectToken, depositor1 } = fixture;

            await expect(projectToken.connect(depositor1).withdrawEstateToken(1))
                .to.be.revertedWithCustomError(projectToken, `InvalidProjectId`);
        });

        it('7.2.14.6. withdraw estate token unsuccessfully when paused', async () => {
            const fixture = await beforeProjectTokenTest({
                addSampleProjects: true,
                mintProjectTokenForDepositor: true,
                tokenizeProject: true,
                pause: true,
            });
            const { projectToken, depositor1 } = fixture;

            await expect(projectToken.connect(depositor1).withdrawEstateToken(1))
                .to.be.revertedWith(`Pausable: paused`);
        });

        it('7.2.14.7. withdraw estate token unsuccessfully when project is not tokenized', async () => {
            const fixture = await beforeProjectTokenTest({
                addSampleProjects: true,
                mintProjectTokenForDepositor: true,
            });
            const { projectToken, depositor1 } = fixture;

            await expect(projectToken.connect(depositor1).withdrawEstateToken(1))
                .to.be.revertedWithCustomError(projectToken, `InvalidWithdrawing`);
        });

        it('7.2.14.8. withdraw estate token unsuccessfully when transfer erc1155 failed', async () => {
            const fixture = await beforeProjectTokenTest({
                addSampleProjects: true,
                mintProjectTokenForDepositor: true,
                tokenizeProject: true,
                useFailReceiverAsDepositor: true,
            });
            const { projectToken, failReceiver } = fixture;

            await callTransaction(failReceiver.activateRejectERC1155(true));

            await expect(failReceiver.call(
                projectToken.address,
                projectToken.interface.encodeFunctionData("withdrawEstateToken", [1]),
            )).to.be.revertedWith(`Fail`);
        });
    });

    describe('7.2.15. isTokenized(uint256)', async () => {
        it('7.2.15.1. return true for tokenized project', async () => {
            const fixture = await beforeProjectTokenTest({
                addSampleProjects: true,
                mintProjectTokenForDepositor: true,
                tokenizeProject: true,
            });
            const { projectToken } = fixture;

            expect(await projectToken.isTokenized(1)).to.equal(true);
            expect(await projectToken.isTokenized(2)).to.equal(true);
        });

        it('7.2.15.2. return false for untokenized project', async () => {
            const fixture = await beforeProjectTokenTest({
                addSampleProjects: true,
                mintProjectTokenForDepositor: true,
            });
            const { projectToken } = fixture;

            expect(await projectToken.isTokenized(1)).to.equal(false);
            expect(await projectToken.isTokenized(2)).to.equal(false);
        });
    });

    describe('7.2.16. zoneOf(uint256)', async () => {
        it('7.2.16.1. return correct zone', async () => {
            const fixture = await beforeProjectTokenTest({
                addSampleProjects: true,
            });
            const { projectToken, zone1, zone2 } = fixture;

            expect(await projectToken.zoneOf(1)).to.equal(zone1);
            expect(await projectToken.zoneOf(2)).to.equal(zone2);
        });

        it('7.2.16.2. revert with invalid project id', async () => {
            const fixture = await beforeProjectTokenTest();
            const { projectToken, depositor1 } = fixture;

            await expect(projectToken.connect(depositor1).zoneOf(0))
                .to.be.revertedWithCustomError(projectToken, `InvalidProjectId`);

            await expect(projectToken.connect(depositor1).zoneOf(100))
                .to.be.revertedWithCustomError(projectToken, `InvalidProjectId`);
        });
    });

    describe('7.2.17. balanceOf(address, uint256)', async () => {
        it('7.2.17.1. return correct project token balance', async () => {
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

        it('7.2.17.2. return zero for invalid project id', async () => {
            const fixture = await beforeProjectTokenTest({
                addSampleProjects: true,
                mintProjectTokenForDepositor: true,
                tokenizeProject: true,
            });

            const { projectToken, depositor1 } = fixture;

            expect(await projectToken.balanceOf(depositor1.address, 0)).to.equal(0);
            expect(await projectToken.balanceOf(depositor1.address, 100)).to.equal(0);
        });

        it('7.2.17.3. return zero for deprecated project', async () => {
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

    describe('7.2.18. balanceOfAt(address, uint256, uint256)', () => {
        it('7.2.18.1. return correct project token balance', async () => {
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

        it('7.2.18.2. return correct project token balance in random tests', async () => {
            const fixture = await beforeProjectTokenTest({
                addSampleProjects: true,
            });
            const { projectToken, prestigePad, depositors } = fixture
            
            prestigePad.allocationOfAt.returns(1234);

            const amounts = [];
            for (let i = 0; i < 3; ++i) {
                const amount = ethers.BigNumber.from(randomInt(10_000, 30_000));
                amounts.push(amount);
            }

            const totalAmount = amounts.reduce((a, b) => a.add(b), ethers.BigNumber.from(0));

            const projectId = BigNumber.from(1);
            await callTransaction(getCallMintTx(projectToken as any, prestigePad, {
                projectId,
                amount: totalAmount,
            }));

            const baseTimestamp = await time.latest() + 1000;
            let currentTimestamp = baseTimestamp + 10;
            
            await ethers.provider.send("evm_setAutomine", [false]);

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

            await ethers.provider.send("evm_mine", []);

            const receipts = await Promise.all(txs.map(tx => tx.wait()));
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
                    if (from == to) { --i_tx; continue }

                    if (balances[from].eq(0)) { --i_tx; continue }

                    const amount = randomBigNumber(ethers.BigNumber.from(1), balances[from]);

                    const tx = await projectToken.connect(depositors[from]).safeTransferFrom(
                        depositors[from].address,
                        depositors[to].address,
                        projectId,
                        amount,
                        ethers.utils.formatBytes32String(""),
                        { gasLimit: 1e6 },
                    );
                    txs.push(tx);

                    balances[from] = balances[from].sub(amount);
                    balances[to] = balances[to].add(amount);
                    records.push({ from, to, amount });
                }

                await ethers.provider.send("evm_mine", []);

                const receipts = await Promise.all(txs.map(tx => tx.wait()));
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

            const lastTimestamp = (await ethers.provider.getBlock('latest')).timestamp;
            currentTimestamp = lastTimestamp;
        });

        it('7.2.18.3. revert with invalid project id', async () => {
            const fixture = await beforeProjectTokenTest();
            const { projectToken, depositor1 } = fixture;

            let timestamp = await time.latest();

            await expect(projectToken.balanceOfAt(depositor1.address, 0, timestamp))
                .to.be.revertedWithCustomError(projectToken, `InvalidProjectId`);

            await expect(projectToken.balanceOfAt(depositor1.address, 100, timestamp))
                .to.be.revertedWithCustomError(projectToken, `InvalidProjectId`);
        });

        it('7.2.18.4. revert with timestamp after current timestamp', async () => {
            const fixture = await beforeProjectTokenTest({
                addSampleProjects: true,
                mintProjectTokenForDepositor: true,
                tokenizeProject: true,
            });
            const { projectToken, depositor1 } = fixture;

            let timestamp = await time.latest();

            await expect(projectToken.balanceOfAt(depositor1.address, 1, timestamp - 1))
                .to.be.not.reverted;
            await expect(projectToken.balanceOfAt(depositor1.address, 1, timestamp))
                .to.be.not.reverted;
            await expect(projectToken.balanceOfAt(depositor1.address, 1, timestamp + 1))
                .to.be.revertedWithCustomError(projectToken, `InvalidTimestamp`);
        });

        it('7.2.18.5. revert with timestamp after deprecation', async () => {
            const fixture = await beforeProjectTokenTest({
                addSampleProjects: true,
                mintProjectTokenForDepositor: true,
                tokenizeProject: true,
                deprecateProjects: true,
            });
            const { projectToken, depositor1 } = fixture;

            let deprecateAt = (await projectToken.getProject(1)).deprecateAt;

            await expect(projectToken.balanceOfAt(depositor1.address, 1, deprecateAt - 1))
                .to.be.not.reverted;
            await expect(projectToken.balanceOfAt(depositor1.address, 1, deprecateAt))
                .to.be.not.reverted;
            await expect(projectToken.balanceOfAt(depositor1.address, 1, deprecateAt + 1))
                .to.be.revertedWithCustomError(projectToken, `InvalidTimestamp`);
        });
    });

    describe('7.2.19. allocationOfAt(address, uint256, uint256)', () => {
        it('7.2.19.1. return correct allocation for tokenized project', async () => {
            const fixture = await beforeProjectTokenTest({
                addSampleProjects: true,
            });
            
            const { projectToken, prestigePad, depositors, manager, broker1, custodian1 } = fixture

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

                prestigePad.allocationOfAt.whenCalledWith(
                    depositor.address,
                    projectId,
                    timestamp
                ).returns(prestigePadAllocation(timestamp));
            }

            async function assertCorrectAllocation(firstTimestamp: number, currentTimestamp: number) {
                for (const timestamp of timePivots) {
                    if (timestamp > currentTimestamp || timestamp < firstTimestamp) {
                        break;
                    }
                    expect(await projectToken.allocationOfAt(depositor.address, projectId, timestamp))
                        .to.equal(expectedAllocations.get(timestamp).add(prestigePadAllocation(timestamp)));
                }
            }

            await callTransaction(getCallMintTx(projectToken as any, prestigePad, {
                projectId,
                amount: BigNumber.from(1000),
            }));
            
            // First token transfer
            const amount1 = BigNumber.from(200);

            let timestamp = await time.latest() + 100;
            await callTransactionAtTimestamp(
                prestigePad.transfer(depositor.address, projectId, amount1),
                timestamp,
            );

            expectedAllocations.set(timestamp, amount1);

            addTimePivot(timestamp);

            // Second token transfer
            const amount2 = BigNumber.from(400);
            
            timestamp += 10;
            await callTransactionAtTimestamp(
                prestigePad.transfer(depositor.address, projectId, amount2),
                timestamp,
            );

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
            }
            await callTransactionAtTimestamp(
                getSafeTokenizeProjectTxByParams(projectToken, manager, tokenizeParams),
                timestamp,
            );

            addTimePivot(timestamp);

            await time.increaseTo(timestamp + 5);
            await assertCorrectAllocation(tokenizeAt, timestamp);

            // Withdraw estate token
            timestamp += 10;
            await callTransactionAtTimestamp(
                projectToken.connect(depositor).withdrawEstateToken(projectId),
                timestamp,
            );

            expectedAllocations.set(timestamp, BigNumber.from(0));

            addTimePivot(timestamp);

            await time.increaseTo(timestamp + 5);
            await assertCorrectAllocation(tokenizeAt, timestamp);            
        });

        it('7.2.19.2. revert with invalid project id', async () => {
            const fixture = await beforeProjectTokenTest();
            const { projectToken, depositor1 } = fixture;

            let timestamp = await time.latest();

            await expect(projectToken.allocationOfAt(depositor1.address, 0, timestamp))
                .to.be.revertedWithCustomError(projectToken, `InvalidProjectId`);

            await expect(projectToken.allocationOfAt(depositor1.address, 100, timestamp))
                .to.be.revertedWithCustomError(projectToken, `InvalidProjectId`);
        });

        it('7.2.19.3. revert with timestamp after current timestamp', async () => {
            const fixture = await beforeProjectTokenTest({
                addSampleProjects: true,
                mintProjectTokenForDepositor: true,
                tokenizeProject: true,
            });
            const { prestigePad, projectToken, depositor1 } = fixture;

            let timestamp = await time.latest();

            prestigePad.allocationOfAt.returns(BigNumber.from(0));

            await expect(projectToken.allocationOfAt(depositor1.address, 1, timestamp - 1))
                .to.be.not.reverted;
            await expect(projectToken.allocationOfAt(depositor1.address, 1, timestamp))
                .to.be.not.reverted;
            await expect(projectToken.allocationOfAt(depositor1.address, 1, timestamp + 1))
                .to.be.revertedWithCustomError(projectToken, `InvalidTimestamp`);
        });
    });

    describe('7.2.20. equityOfAt(address, uint256, uint256)', () => {
        it('7.2.20.1. return correct vote for available project', async () => {
            const fixture = await beforeProjectTokenTest({
                addSampleProjects: true,
            });
            const { prestigePad, projectToken, depositor1, depositor2 } = fixture;

            const baseTimestamp = await time.latest() + 1000;

            const projectId1 = 1;
            const launchId1 = (await projectToken.getProject(projectId1)).launchId;

            const projectId2 = 2;
            const launchId2 = (await projectToken.getProject(projectId2)).launchId;

            // Depositor 1, estate 1
            await callTransactionAtTimestamp(
                projectToken.mintTo(depositor1.address, projectId1, 10_000),
                baseTimestamp,
            );
            await time.increaseTo(baseTimestamp + 10);

            prestigePad.allocationOfAt.whenCalledWith(depositor1.address, launchId1, baseTimestamp - 1).returns(20_000);
            prestigePad.allocationOfAt.whenCalledWith(depositor1.address, launchId1, baseTimestamp).returns(20_000);
            prestigePad.allocationOfAt.whenCalledWith(depositor1.address, launchId1, baseTimestamp + 10).returns(20_000);

            expect(await projectToken.equityOfAt(depositor1.address, projectId1, baseTimestamp - 1)).to.equal(20_000);
            expect(await projectToken.equityOfAt(depositor1.address, projectId1, baseTimestamp)).to.equal(30_000);
            expect(await projectToken.equityOfAt(depositor1.address, projectId1, baseTimestamp + 10)).to.equal(30_000);

            // Depositor 1, estate 2
            await callTransactionAtTimestamp(
                projectToken.mintTo(depositor1.address, projectId2, 40_000),
                baseTimestamp + 20,
            );
            await time.increaseTo(baseTimestamp + 30);

            prestigePad.allocationOfAt.whenCalledWith(depositor1.address, launchId2, baseTimestamp + 19).returns(80_000);
            prestigePad.allocationOfAt.whenCalledWith(depositor1.address, launchId2, baseTimestamp + 20).returns(80_000);
            prestigePad.allocationOfAt.whenCalledWith(depositor1.address, launchId2, baseTimestamp + 30).returns(80_000);

            expect(await projectToken.equityOfAt(depositor1.address, projectId2, baseTimestamp + 19)).to.equal(80_000);
            expect(await projectToken.equityOfAt(depositor1.address, projectId2, baseTimestamp + 20)).to.equal(120_000);
            expect(await projectToken.equityOfAt(depositor1.address, projectId2, baseTimestamp + 30)).to.equal(120_000);

            // Depositor 2, estate 1
            await callTransactionAtTimestamp(
                projectToken.mintTo(depositor2.address, projectId1, 160_000),
                baseTimestamp + 40,
            );
            await time.increaseTo(baseTimestamp + 50);

            prestigePad.allocationOfAt.whenCalledWith(depositor2.address, launchId1, baseTimestamp + 39).returns(320_000);
            prestigePad.allocationOfAt.whenCalledWith(depositor2.address, launchId1, baseTimestamp + 40).returns(320_000);
            prestigePad.allocationOfAt.whenCalledWith(depositor2.address, launchId1, baseTimestamp + 50).returns(320_000);

            expect(await projectToken.equityOfAt(depositor2.address, projectId1, baseTimestamp + 39)).to.equal(320_000);
            expect(await projectToken.equityOfAt(depositor2.address, projectId1, baseTimestamp + 40)).to.equal(480_000);
            expect(await projectToken.equityOfAt(depositor2.address, projectId1, baseTimestamp + 50)).to.equal(480_000);
        });
        
        it('7.2.20.2. revert with invalid project id', async () => {
            const fixture = await beforeProjectTokenTest();
            const { projectToken, depositor1 } = fixture;

            let timestamp = await time.latest();

            await expect(projectToken.equityOfAt(depositor1.address, 0, timestamp))
                .to.be.revertedWithCustomError(projectToken, `InvalidProjectId`);

            await expect(projectToken.equityOfAt(depositor1.address, 100, timestamp))
                .to.be.revertedWithCustomError(projectToken, `InvalidProjectId`);
        });

        it('7.2.20.3. revert with timestamp after current timestamp', async () => {
            const fixture = await beforeProjectTokenTest({
                addSampleProjects: true,
            });
            const { prestigePad, projectToken, depositor1 } = fixture;

            await callTransaction(projectToken.mintTo(depositor1.address, 1, 10_000));

            let timestamp = await time.latest();

            prestigePad.allocationOfAt.returns(0);

            await expect(projectToken.equityOfAt(depositor1.address, 1, timestamp - 1))
                .to.be.not.reverted;
            await expect(projectToken.equityOfAt(depositor1.address, 1, timestamp))
                .to.be.not.reverted;
            await expect(projectToken.equityOfAt(depositor1.address, 1, timestamp + 1))
                .to.be.revertedWithCustomError(projectToken, `InvalidTimestamp`);
        });

        it('7.2.20.4. revert with timestamp after deprecation', async () => {
            const fixture = await beforeProjectTokenTest({
                addSampleProjects: true,
            });
            const { prestigePad, projectToken, depositor1, manager } = fixture;

            await callTransaction(projectToken.mintTo(depositor1.address, 1, 10_000));

            let timestamp = await time.latest() + 10;

            prestigePad.allocationOfAt.returns(0);

            const deprecateParams: DeprecateProjectParams = {
                projectId: BigNumber.from(1),
                data: 'deprecateProject1',
            };
            await callTransactionAtTimestamp(
                getSafeDeprecateProjectTxByParams(projectToken, manager, deprecateParams),
                timestamp,
            );

            await time.increaseTo(timestamp + 5);

            await expect(projectToken.equityOfAt(depositor1.address, 1, timestamp - 1))
                .to.be.not.reverted;
            await expect(projectToken.equityOfAt(depositor1.address, 1, timestamp))
                .to.be.not.reverted;
            await expect(projectToken.equityOfAt(depositor1.address, 1, timestamp + 1))
                .to.be.revertedWithCustomError(projectToken, `InvalidTimestamp`);
        });

        it('7.2.20.5. return 0 for launchpad contract of project', async () => {
            const fixture = await beforeProjectTokenTest({
                addSampleProjects: true,
            });
            const { prestigePad, projectToken } = fixture;

            const baseTimestamp = await time.latest() + 1000;

            const projectId1 = 1;
            const launchId1 = (await projectToken.getProject(projectId1)).launchId;

            await callTransactionAtTimestamp(
                projectToken.mintTo(prestigePad.address, projectId1, 10_000),
                baseTimestamp,
            );
            await time.increaseTo(baseTimestamp + 10);

            prestigePad.allocationOfAt.whenCalledWith(prestigePad.address, launchId1, baseTimestamp).returns(20_000);
            prestigePad.allocationOfAt.whenCalledWith(prestigePad.address, launchId1, baseTimestamp + 10).returns(20_000);

            expect(await projectToken.equityOfAt(prestigePad.address, projectId1, baseTimestamp)).to.equal(0);
            expect(await projectToken.equityOfAt(prestigePad.address, projectId1, baseTimestamp + 10)).to.equal(0);
        });
    });

    describe('7.2.21. totalEquityAt(uint256, uint256)', () => {
        it('7.2.21.1. return correct total vote for existing project', async () => {
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
                        expect(await projectToken.totalEquityAt(projectId1, timestamp))
                            .to.equal(expectedTotalVote1.get(timestamp));
                    }
                    if (minted2) {
                        expect(await projectToken.totalEquityAt(projectId2, timestamp))
                            .to.equal(expectedTotalVote2.get(timestamp));
                    }
                }
            }
            
            let timestamp = await time.latest() + 100;

            // Mint project 1
            await callTransactionAtTimestamp(
                projectToken.mintTo(depositor1.address, projectId1, 10_000),
                timestamp,
            );
            expectedTotalVote1.set(timestamp, BigNumber.from(10_000));
            minted1 = true;

            addTimePivot(timestamp);
            await time.increaseTo(timestamp + 5);
            await assertCorrectAllocation(timestamp);
            
            // Mint project 2
            timestamp += 10;

            await callTransactionAtTimestamp(
                projectToken.mintTo(depositor2.address, projectId2, 20_000),
                timestamp,
            );
            expectedTotalVote2.set(timestamp, BigNumber.from(20_000));
            minted2 = true;

            addTimePivot(timestamp);
            await time.increaseTo(timestamp + 5);
            await assertCorrectAllocation(timestamp);

            // Transfer project 1 to depositor 2
            timestamp += 10;

            await callTransactionAtTimestamp(
                projectToken.connect(depositor1).safeTransferFrom(
                    depositor1.address,
                    depositor2.address,
                    projectId1,
                    5_000,
                    "0x",
                ),
                timestamp,
            );

            addTimePivot(timestamp);
            await time.increaseTo(timestamp + 5);
            await assertCorrectAllocation(timestamp);
            
            // Mint project 1 again
            timestamp += 10;

            await callTransactionAtTimestamp(
                projectToken.mintTo(depositor2.address, projectId1, 40_000),
                timestamp,
            );
            expectedTotalVote1.set(timestamp, BigNumber.from(50_000));

            addTimePivot(timestamp);
            await time.increaseTo(timestamp + 5);
            await assertCorrectAllocation(timestamp);

            // Mint project 2 again
            timestamp += 10;

            await callTransactionAtTimestamp(
                projectToken.mintTo(depositor2.address, projectId2, 80_000),
                timestamp,
            );
            expectedTotalVote2.set(timestamp, BigNumber.from(100_000));

            addTimePivot(timestamp);
            await time.increaseTo(timestamp + 5);
            await assertCorrectAllocation(timestamp);

            // Transfer project 2 to depositor 1
            timestamp += 10;

            await callTransactionAtTimestamp(
                projectToken.connect(depositor2).safeTransferFrom(
                    depositor2.address,
                    depositor1.address,
                    projectId2,
                    2_000,
                    "0x",
                ),
                timestamp,
            );
            
            addTimePivot(timestamp);
            await time.increaseTo(timestamp + 5);
            await assertCorrectAllocation(timestamp);
        });

        it('7.2.21.2. revert with invalid project id', async () => {
            const fixture = await beforeProjectTokenTest();
            const { projectToken, depositor1 } = fixture;

            let timestamp = await time.latest();

            await expect(projectToken.totalEquityAt(0, timestamp))
                .to.be.revertedWithCustomError(projectToken, `InvalidProjectId`);

            await expect(projectToken.totalEquityAt(100, timestamp))
                .to.be.revertedWithCustomError(projectToken, `InvalidProjectId`);
        });

        it('7.2.21.3. revert with timestamp after current timestamp', async () => {
            const fixture = await beforeProjectTokenTest({
                addSampleProjects: true,
            });
            const { prestigePad, projectToken, depositor1 } = fixture;

            await callTransaction(projectToken.mintTo(depositor1.address, 1, 10_000));

            let timestamp = await time.latest();

            prestigePad.allocationOfAt.returns(0);

            await expect(projectToken.totalEquityAt(1, timestamp - 1))
                .to.be.not.reverted;
            await expect(projectToken.totalEquityAt(1, timestamp))
                .to.be.not.reverted;
            await expect(projectToken.totalEquityAt(1, timestamp + 1))
                .to.be.revertedWithCustomError(projectToken, `InvalidTimestamp`);
        });

        it('7.2.21.4. revert with timestamp before tokenize', async () => {
            const fixture = await beforeProjectTokenTest({
                addSampleProjects: true,
            });
            const { prestigePad, projectToken, depositor1 } = fixture;

            await callTransaction(projectToken.mintTo(depositor1.address, 1, 10_000));

            let timestamp = (await projectToken.getProject(1)).tokenizeAt;

            prestigePad.allocationOfAt.returns(0);

            await expect(projectToken.totalEquityAt(1, timestamp - 1))
                .to.be.revertedWithCustomError(projectToken, `InvalidTimestamp`);
            await expect(projectToken.totalEquityAt(1, timestamp))
                .to.be.not.reverted;
            await expect(projectToken.totalEquityAt(1, timestamp + 1))
                .to.be.not.reverted;
        });

        it('7.2.21.5. revert with timestamp after deprecation', async () => {
            const fixture = await beforeProjectTokenTest({
                addSampleProjects: true,
            });
            const { prestigePad, projectToken, depositor1 } = fixture;

            await callTransaction(projectToken.mintTo(depositor1.address, 1, 10_000));

            let timestamp = (await projectToken.getProject(1)).deprecateAt;

            await time.increaseTo(timestamp + 5);

            prestigePad.allocationOfAt.returns(0);

            await expect(projectToken.totalEquityAt(1, timestamp - 1))
                .to.be.not.reverted;
            await expect(projectToken.totalEquityAt(1, timestamp))
                .to.be.not.reverted;
            await expect(projectToken.totalEquityAt(1, timestamp + 1))
                .to.be.revertedWithCustomError(projectToken, `InvalidTimestamp`);
        });

        it('7.2.21.6. returned total vote should be the sum of equityOfAt', async () => {
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
            
            let timestamp = await time.latest() + 100;

            // Mint for depositor 1
            await callTransactionAtTimestamp(
                projectToken.mintTo(depositor1.address, projectId, 10_000),
                timestamp,
            );

            addTimePivot(timestamp);
            await time.increaseTo(timestamp + 5);
            await assertCorrectAllocation(timestamp);
            
            // Mint for depositor 2
            timestamp += 10;

            await callTransactionAtTimestamp(
                projectToken.mintTo(depositor2.address, projectId, 20_000),
                timestamp,
            );

            addTimePivot(timestamp);
            await time.increaseTo(timestamp + 5);
            await assertCorrectAllocation(timestamp);

            // Transfer from depositor 1 to depositor 2
            timestamp += 10;

            await callTransactionAtTimestamp(
                projectToken.connect(depositor1).safeTransferFrom(
                    depositor1.address,
                    depositor2.address,
                    projectId,
                    5_000,
                    "0x",
                ),
                timestamp,
            );

            addTimePivot(timestamp);
            await time.increaseTo(timestamp + 5);
            await assertCorrectAllocation(timestamp);
            
            // Mint for depositor 1 again
            timestamp += 10;

            await callTransactionAtTimestamp(
                projectToken.mintTo(depositor2.address, projectId, 40_000),
                timestamp,
            );

            addTimePivot(timestamp);
            await time.increaseTo(timestamp + 5);
            await assertCorrectAllocation(timestamp);

            // Mint for depositor 2 again
            timestamp += 10;

            await callTransactionAtTimestamp(
                projectToken.mintTo(depositor2.address, projectId, 80_000),
                timestamp,
            );

            addTimePivot(timestamp);
            await time.increaseTo(timestamp + 5);
            await assertCorrectAllocation(timestamp);

            // Transfer from depositor 2 to depositor 1
            timestamp += 10;

            await callTransactionAtTimestamp(
                projectToken.connect(depositor2).safeTransferFrom(
                    depositor2.address,
                    depositor1.address,
                    projectId,
                    2_000,
                    "0x",
                ),
                timestamp,
            );
            
            addTimePivot(timestamp);
            await time.increaseTo(timestamp + 5);
            await assertCorrectAllocation(timestamp);
        });
    });

    describe('2.4.23. supportsInterface(bytes4)', () => {
        it('2.4.23.1. return true for appropriate interface', async () => {
            const fixture = await beforeProjectTokenTest();
            const { projectToken } = fixture;

            expect(await projectToken.supportsInterface(getBytes4Hex(IAssetTokenInterfaceId))).to.equal(true);
            expect(await projectToken.supportsInterface(getBytes4Hex(IGovernorInterfaceId))).to.equal(true);
            expect(await projectToken.supportsInterface(getBytes4Hex(IEstateTokenizerInterfaceId))).to.equal(true);
            expect(await projectToken.supportsInterface(getBytes4Hex(IRoyaltyRateProposerInterfaceId))).to.equal(true);
            expect(await projectToken.supportsInterface(getBytes4Hex(IERC165UpgradeableInterfaceId))).to.equal(true);
            expect(await projectToken.supportsInterface(getBytes4Hex(IERC1155MetadataURIUpgradeableInterfaceId))).to.equal(true);
            expect(await projectToken.supportsInterface(getBytes4Hex(IERC2981UpgradeableInterfaceId))).to.equal(true);
        });
    });
});
