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
} from '@typechain-types';
import { callTransaction, callTransactionAtTimestamp, getSignatures, randomWallet } from '@utils/blockchain';
import { Constant } from '@tests/test.constant';
import { deployAdmin } from '@utils/deployments/common/admin';
import { deployFeeReceiver } from '@utils/deployments/common/feeReceiver';
import { deployCurrency } from '@utils/deployments/common/currency';
import { deployMockEstateToken } from '@utils/deployments/mocks/mockEstateToken';
import { deployCommissionToken } from '@utils/deployments/land/commissionToken';
import { loadFixture, time } from "@nomicfoundation/hardhat-network-helpers";

import { MockContract, smock } from '@defi-wonderland/smock';
import { deployMockProjectToken } from '@utils/deployments/mocks/mockProjectToken';

import {
    callAdmin_ActivateIn,
    callAdmin_AuthorizeManagers,
    callAdmin_AuthorizeModerators,
    callAdmin_DeclareZones,
} from '@utils/callWithSignatures/admin';
import { BigNumber } from 'ethers';
import { randomInt } from 'crypto';
import { getBytes4Hex, getInterfaceID, randomBigNumber } from '@utils/utils';
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
import { callProjectToken_AuthorizeLaunchpads, callProjectToken_Pause } from '@utils/callWithSignatures/projectToken';

interface ProjectTokenFixture {
    admin: Admin;
    feeReceiver: FeeReceiver;
    priceWatcher: PriceWatcher;
    currency: Currency;
    reserveVault: ReserveVault;
    estateToken: MockContract<MockEstateToken>;
    projectToken: MockProjectToken;
    prestigePad: MockContract<MockPrestigePad>;
    validator: MockValidator;

    deployer: any;
    admins: any[];
    manager: any;
    moderator: any;
    user: any;
    requester1: any, requester2: any;
    commissionReceiver: any;
    depositor1: any, depositor2: any, depositor3: any;
    depositors: any[];
    zone: string;

    launchpads: any[];
}

describe('2.4. ProjectToken', async () => {
    afterEach(async () => {
        await ethers.provider.send("evm_setAutomine", [true]);
    });

    async function projectTokenFixture(): Promise<ProjectTokenFixture> {
        const accounts = await ethers.getSigners();
        const deployer = accounts[0];
        const admins = [];
        for (let i = 1; i <= Constant.ADMIN_NUMBER; ++i) admins.push(accounts[i]);
        const user = accounts[Constant.ADMIN_NUMBER + 2];
        const manager = accounts[Constant.ADMIN_NUMBER + 3];
        const moderator = accounts[Constant.ADMIN_NUMBER + 4];
        const requester1 = accounts[Constant.ADMIN_NUMBER + 5];
        const requester2 = accounts[Constant.ADMIN_NUMBER + 6];
        const commissionReceiver = accounts[Constant.ADMIN_NUMBER + 7];
        const depositor1 = accounts[Constant.ADMIN_NUMBER + 8];
        const depositor2 = accounts[Constant.ADMIN_NUMBER + 9];
        const depositor3 = accounts[Constant.ADMIN_NUMBER + 10];        
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
            LandInitialization.ESTATE_TOKEN_RoyaltyRate,
        ));

        const projectToken = await deployMockProjectToken(
            deployer.address,
            admin.address,
            estateToken.address,
            feeReceiver.address,
            validator.getAddress(),
            LaunchInitialization.PROJECT_TOKEN_BaseURI,
            LaunchInitialization.PROJECT_TOKEN_RoyaltyRate,
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
                LaunchInitialization.PRESTIGE_PAD_FeeRate,
            ));
            launchpads.push(mockPrestigePad);
        }

        const prestigePad = launchpads[0];
        launchpads = launchpads.slice(1);

        const zone = ethers.utils.formatBytes32String("TestZone");

        return {
            admin,
            feeReceiver,
            priceWatcher,
            currency,
            reserveVault,
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
            commissionReceiver,
            depositor1,
            depositor2,
            depositor3,
            depositors,
            zone,
            validator,
            launchpads,
        };
    };

    async function beforeProjectTokenTest({
        authorizePrestigePad = false,
        addSampleProjects = false,
        pause = false,
    } = {}): Promise<ProjectTokenFixture> {
        const fixture = await loadFixture(projectTokenFixture);
        const { admin, admins, manager, moderator, estateToken, projectToken, prestigePad, zone } = fixture;

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

        if (authorizePrestigePad) {
            await callProjectToken_AuthorizeLaunchpads(
                projectToken as any,
                admins,
                [prestigePad.address],
                true,
                await fixture.admin.nonce()
            );
        }

        await callAdmin_DeclareZones(
            admin,
            admins,
            [zone],
            true,
            await fixture.admin.nonce()
        );

        await callAdmin_ActivateIn(
            admin,
            admins,
            zone,
            [manager.address],
            true,
            await fixture.admin.nonce()
        );

        const baseTimestamp = await time.latest() + 1000;

        if (addSampleProjects) {

        }

        if (pause) {
            await callProjectToken_Pause(
                projectToken as any,
                admins,
                await fixture.admin.nonce()
            );
        }

        return fixture;
    }

    describe('2.4.1. initialize(address, address, string, uint256)', async () => {
        it('2.4.1.1. Deploy successfully', async () => {
            const { projectToken, admin, feeReceiver, validator, estateToken } = await beforeProjectTokenTest();

            const tx = projectToken.deployTransaction;
            await expect(tx).to.emit(projectToken, 'BaseURIUpdate').withArgs(
                LaunchInitialization.PROJECT_TOKEN_BaseURI
            );
            await expect(tx).to.emit(projectToken, 'RoyaltyRateUpdate').withArgs(
                LaunchInitialization.PROJECT_TOKEN_RoyaltyRate
            );

            expect(await projectToken.paused()).to.equal(false);

            expect(await projectToken.projectNumber()).to.equal(0);

            expect(await projectToken.admin()).to.equal(admin.address);
            expect(await projectToken.estateToken()).to.equal(estateToken.address);
            expect(await projectToken.feeReceiver()).to.equal(feeReceiver.address);
            
            const royaltyRate = await projectToken.getRoyaltyRate();
            expect(royaltyRate.value).to.equal(LaunchInitialization.PROJECT_TOKEN_RoyaltyRate);
            expect(royaltyRate.decimals).to.equal(Constant.COMMON_RATE_DECIMALS);
            
            expect(await projectToken.validator()).to.equal(validator.getAddress());

            expect(await projectToken.decimals()).to.equal(Constant.PROJECT_TOKEN_MAX_DECIMALS);
        });

        it('2.4.1.2. revert with invalid rate', async () => {
            const { admin, feeReceiver, validator, estateToken } = await beforeProjectTokenTest();
            const ProjectToken = await ethers.getContractFactory("ProjectToken");

            await expect(upgrades.deployProxy(ProjectToken, [
                admin.address,
                estateToken.address,
                feeReceiver.address,
                validator.getAddress(),
                LaunchInitialization.PROJECT_TOKEN_BaseURI,
                Constant.COMMON_RATE_MAX_FRACTION.add(1),
            ])).to.be.reverted;
        });
    });

    describe('2.4.2. updateBaseURI(string, bytes[])', async () => {
        it('2.4.2.1. updateBaseURI successfully with valid signatures', async () => {
            const { projectToken, admin, admins } = await beforeProjectTokenTest({
                authorizePrestigePad: true,
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

            expect(await projectToken.uri(1)).to.equal("NewBaseURI:Token1_URI");
            expect(await projectToken.uri(2)).to.equal("NewBaseURI:Token2_URI");
        });

        it('2.4.2.2. updateBaseURI unsuccessfully with invalid signatures', async () => {
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

    describe('2.4.3. updateRoyaltyRate(uint256, bytes[])', async () => {
        it('2.4.3.1. updateRoyaltyRate successfully with valid signatures', async () => {
            const { projectToken, admin, admins } = await beforeProjectTokenTest();

            const message = ethers.utils.defaultAbiCoder.encode(
                ["address", "string", "uint256"],
                [projectToken.address, "updateRoyaltyRate", ethers.utils.parseEther('0.2')]
            );

            const signatures = await getSignatures(message, admins, await admin.nonce());

            const tx = await projectToken.updateRoyaltyRate(ethers.utils.parseEther('0.2'), signatures);
            await tx.wait();

            await expect(tx).to
                .emit(projectToken, 'RoyaltyRateUpdate')
                .withArgs(ethers.utils.parseEther('0.2'));

            const royaltyRate = await projectToken.getRoyaltyRate();
            expect(royaltyRate.value).to.equal(ethers.utils.parseEther('0.2'));
            expect(royaltyRate.decimals).to.equal(Constant.COMMON_RATE_DECIMALS);
        });

        it('2.4.3.2. updateRoyaltyRate unsuccessfully with invalid signatures', async () => {
            const { projectToken, admin, admins } = await beforeProjectTokenTest();

            const message = ethers.utils.defaultAbiCoder.encode(
                ["address", "string", "uint256"],
                [projectToken.address, "updateRoyaltyRate", ethers.utils.parseEther('0.2')]
            );
            const invalidSignatures = await getSignatures(message, admins, (await admin.nonce()).add(1));

            await expect(projectToken.updateRoyaltyRate(
                ethers.utils.parseEther('0.2'),
                invalidSignatures
            )).to.be.revertedWithCustomError(admin, 'FailedVerification');
        });

        it('2.4.3.3. updateRoyaltyRate unsuccessfully with invalid rate', async () => {
            const { projectToken, admin, admins } = await beforeProjectTokenTest();

            let message = ethers.utils.defaultAbiCoder.encode(
                ["address", "string", "uint256"],
                [projectToken.address, "updateRoyaltyRate", Constant.COMMON_RATE_MAX_FRACTION.add(1)]
            );
            const signatures = await getSignatures(message, admins, await admin.nonce());

            await expect(projectToken.updateRoyaltyRate(
                Constant.COMMON_RATE_MAX_FRACTION.add(1),
                signatures
            )).to.be.revertedWithCustomError(projectToken, 'InvalidRate');
        });
    });

    describe('2.4.5. authorizeLaunchpads(address[], bool, bytes[])', async () => {
        it('2.4.5.1. Authorize launchpads successfully with valid signatures', async () => {
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

            for (const tokenizer of toBeLaunchpads) {
                await expect(tx).to
                    .emit(projectToken, 'TokenizerAuthorization')
                    .withArgs(tokenizer.address);
            }

            for (const tokenizer of launchpads) {
                const isLaunchpad = await projectToken.isLaunchpad(tokenizer.address);
                if (toBeLaunchpads.includes(tokenizer)) {
                    expect(isLaunchpad).to.be.true;
                } else {
                    expect(isLaunchpad).to.be.false;
                }
            }
        });

        it('2.4.5.2. Authorize tokenizer unsuccessfully with invalid signatures', async () => {
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

        it('2.4.5.3. Authorize tokenizer reverted without reason with EOA address', async () => {
            const { projectToken, admin, admins } = await beforeProjectTokenTest();

            const invalidTokenizer = randomWallet();

            const message = ethers.utils.defaultAbiCoder.encode(
                ['address', 'string', 'address[]', 'bool'],
                [projectToken.address, 'authorizeLaunchpads', [invalidTokenizer.address], true]
            );
            const signatures = await getSignatures(message, admins, await admin.nonce());

            await expect(projectToken.authorizeLaunchpads(
                [invalidTokenizer.address],
                true,
                signatures
            )).to.be.revertedWithCustomError(projectToken, 'InvalidTokenizer');
        })

        it('2.4.5.4. Authorize tokenizer reverted with contract not supporting ProjectTokenizer interface', async () => {
            const { projectToken, admin, admins } = await beforeProjectTokenTest();

            const invalidTokenizer = projectToken;

            const message = ethers.utils.defaultAbiCoder.encode(
                ['address', 'string', 'address[]', 'bool'],
                [projectToken.address, 'authorizeLaunchpads', [invalidTokenizer.address], true]
            );
            const signatures = await getSignatures(message, admins, await admin.nonce());

            await expect(projectToken.authorizeLaunchpads(
                [invalidTokenizer.address],
                true,
                signatures
            )).to.be.revertedWithCustomError(projectToken, 'InvalidTokenizer');
        })

        it('2.4.5.5. Authorize tokenizer unsuccessfully when authorizing same account twice on same tx', async () => {
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

        it('2.4.5.6. Authorize tokenizer unsuccessfully when authorizing same account twice on different tx', async () => {
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

        it('2.4.5.7. Deauthorize tokenizer successfully', async () => {
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

            for (const tokenizer of toDeauth) {
                await expect(tx).to
                    .emit(projectToken, 'TokenizerDeauthorization')
                    .withArgs(tokenizer.address);
            }

            for (const tokenizer of launchpads) {
                const isLaunchpad = await projectToken.isLaunchpad(tokenizer.address);
                if (toDeauth.includes(tokenizer)) {
                    expect(isLaunchpad).to.be.false;
                } else {
                    expect(isLaunchpad).to.be.true;
                }
            }            
        });

        it('2.4.5.8. Deauthorize tokenizer unsuccessfully with unauthorized account', async () => {
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

        it('2.4.5.9. Deauthorize tokenizer unsuccessfully when unauthorizing same accounts twice on same tx', async () => {
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

        it('2.4.5.10. Deauthorize tokenizer unsuccessfully when unauthorizing same accounts twice on different tx', async () => {
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

    describe('2.4.6. registerInitiator(bytes32, address, string, (uint256, uint256, bytes))', async () => {
        it('2.4.6.1. register initiator successfully', async () => {

        });

        it('2.4.6.2. register initiator unsuccessfully by non-manager', async () => {

        });

        it('2.4.6.3. register initiator unsuccessfully with inactive zone', async () => {

        });

        it('2.4.6.4. register initiator unsuccessfully with inactive manager in zone', async () => {

        });

        it('2.4.6.5. register initiator unsuccessfully with invalid validation', async () => {

        });

        it('2.4.6.6. register initiator unsuccessfully with invalid uri', async () => {

        });
    });

    describe('2.4.7. isInitiatorIn(bytes32, address)', async () => {
        it('2.4.7.1. return correct value', async () => {
            
        });
    });

    describe('2.4.8. getProject(uint256)', async () => {
        it('2.4.8.1. return correct project', async () => {
            
        });

        it('2.4.8.2. revert with invalid project id', async () => {

        });
    });

    describe('2.4.9. isAvailable(uint256)', async () => {
        it('2.4.9.1. return true for undeprecated project', async () => {
            
        });

        it('2.4.9.2. return false for deprecated project', async () => {

        });
    });

    describe('2.4.10. launchProject(bytes32, uint256, address, string)', async () => {
        it('2.4.10.1. launch project successfully', async () => {

        });

        it('2.4.10.2. launch project unsuccessfully when paused', async () => {

        });

        it('2.4.10.3. launch project unsuccessfully by non-launchpad sender', async () => {

        });

        it('2.4.10.4. launch project unsuccessfully when zone is inactive', async () => {

        });
    });

    describe('2.4.11. mint(uint256, uint256)', async () => {
        it('2.4.11.1. mint project token successfully', async () => {
            
        });

        it('2.4.11.2. mint unsuccessfully with invalid project id', async () => {

        });

        it('2.4.11.3. mint unsuccessfully with deprecated project', async () => {

        });

        it('2.4.11.4. mint unsuccessfully when when sender is not project\'s launchpad', async () => {

        });

        it('2.4.11.5. mint unsuccessfully when paused', async () => {

        });
    });

    describe('2.4.12. deprecateProject(uint256)', async () => {
        it('2.4.12.1. deprecate project successfully', async () => {

        });

        it('2.4.12.2. deprecate project unsuccessfully with invalid project id', async () => {

        });

        it('2.4.12.3. deprecate project unsuccessfully with already deprecated project', async () => {

        });

        it('2.4.12.4. deprecate project unsuccessfully with non-manager sender', async () => {

        });

        it('2.4.12.5. deprecate project unsuccessfully with inactive zone', async () => {

        });

        it('2.4.12.6. deprecate project unsuccessfully with inactive manager in zone', async () => {

        });
    
        it('2.4.12.7. deprecate project unsuccessfully when paused', async () => {

        });
    });

    describe('2.4.13. updateProjectURI(uint256, string, (uint256, uint256, bytes))', async () => {
        it('2.4.13.1. update project uri successfully', async () => {

        });

        it('2.4.13.2. update project uri unsuccessfully with invalid project id', async () => {

        });

        it('2.4.13.3. update project uri unsuccessfully with already deprecated project', async () => {

        });

        it('2.4.13.4. update project uri unsuccessfully with non-manager sender', async () => {

        });

        it('2.4.13.5. update project uri unsuccessfully with inactive zone', async () => {

        });

        it('2.4.13.6. update project uri unsuccessfully with inactive manager in zone', async () => {

        });
    
        it('2.4.13.7. update project uri unsuccessfully when paused', async () => {

        });

        it('2.4.13.8. update project uri unsuccessfully with invalid validation', async () => {

        });
    });

    describe('2.4.14. tokenizeProject(uint256, address)', async () => {
        it('2.4.14.1. tokenize project successfully', async () => {

        });

        it('2.4.14.2. tokenize project unsuccessfully when contract is reentered', async () => {

        });

        it('2.4.14.3. tokenize project unsuccessfully with invalid project id', async () => {

        });

        it('2.4.14.4. tokenize project unsuccessfully with deprecated project', async () => {

        });

        it('2.4.14.5. tokenize project unsuccessfully by non-manager', async () => {

        });

        it('2.4.14.6. tokenize project unsuccessfully with inactive zone', async () => {

        });
        
        it('2.4.14.7. tokenize project unsuccessfully with inactive manager in zone', async () => {

        });

        it('2.4.14.8. tokenize project unsuccessfully when paused', async () => {

        });

        it('2.4.14.9. tokenize project unsuccessfully with invalid commission receiver', async () => {

        });

        it('2.4.14.10. tokenize project unsuccessfully when project initiator is not registered as custodian in project zone', async () => {

        });

        it('2.4.14.11. tokenize project unsuccessfully when project is already tokenized', async () => {

        });

        it('2.4.14.12. tokenize project unsuccessfully with zero total supply', async () => {

        });

        it('2.4.14.13. tokenize project unsuccessfully when project is not finalized', async () => {

        });
        
        it('2.4.14.14. tokenize project unsuccessfully when tokenize estate failed', async () => {
            // ProjectToken is not registered as tokenizer in estate token
        });
    });

    describe('2.4.15. withdrawEstateToken(uint256)', async () => {
        it('2.4.15.1. withdraw estate token successfully', async () => {

        });

        it('2.4.15.2. withdraw zero estate token when user has zero project token balance', async () => {

        });

        it('2.4.15.3. withdraw estate token unsuccessfully when contract is reentered', async () => {

        });

        it('2.4.15.4. withdraw estate token unsuccessfully with invalid project id', async () => {

        });
        
        it('2.4.15.5. withdraw estate token unsuccessfully when project is deprecated', async () => {

        });

        it('2.4.15.6. withdraw estate token unsuccessfully when paused', async () => {

        });

        it('2.4.15.7. withdraw estate token unsuccessfully when project is not tokenized', async () => {

        });

        it('2.4.15.8. withdraw estate token unsuccessfully when user already withdrawn', async () => {

        });

        it('2.4.15.9. withdraw estate token unsuccessfully when transfer erc1155 failed', async () => {

        });
    });

    describe('2.4.16. isTokenized(uint256)', async () => {
        it('2.4.16.1. return true for tokenized project', async () => {
            
        });

        it('2.4.16.2. return false for untokenized project', async () => {

        });
    });

    describe('2.4.17. zoneOf(uint256)', async () => {
        it('2.4.17.1. return correct zone', async () => {

        });

        it('2.4.17.2. revert with invalid project id', async () => {

        });
    });

    describe('2.4.18. balanceOf(address, uint256)', async () => {
        it('2.4.18.1. return correct project token balance', async () => {

        });

        it('2.4.18.2. return zero for deprecated project', async () => {

        });
    });

    describe('2.4.19. balanceOfAt(address, uint256, uint256)', () => {
        it('2.4.19.1. return correct project token balance', async () => {

        });

        it('2.4.19.2. return correct project token balance in random tests', async () => {

        });

        it('2.4.19.3. revert with invalid project id', async () => {

        });

        it('2.4.19.4. revert with timestamp after current timestamp', async () => {

        });

        it('2.4.19.5. revert with timestamp after deprecation', async () => {

        });
    });

    describe('2.4.20. allocationOfAt(address, uint256, uint256)', () => {

    });

    describe('2.4.21. voteOfAt(address, uint256, uint256)', () => {

    });

    describe('2.4.22. totalVoteAt(uint256, uint256)', () => {
        it('2.4.22.1. return correct total vote for existing project', async () => {
        });

        it('2.4.22.2. revert with invalid project id', async () => {

        });

        it('2.4.22.3. return 0 with timestamp after current timestamp', async () => {

        });

        it('2.4.22.4. return 0 with timestamp before tokenize', async () => {

        });

        it('2.4.22.5. return 0 with timestamp after deprecation', async () => {

        });

        it('2.4.22.6. return total vote of each voteOfAt', async () => {

        });
    });
});
