import { expect } from 'chai';
import { ethers, upgrades } from 'hardhat';
import {
    Admin,
    Currency,
    FeeReceiver,
    IERC165Upgradeable__factory,
    IERC2981Upgradeable__factory,
    MockProjectToken,
    ProjectMortgageToken,
    IProjectTokenReceiver__factory,
    IERC1155ReceiverUpgradeable__factory,
    ICommon__factory,
    IERC721MetadataUpgradeable__factory,
    IERC721Upgradeable__factory,
    PriceWatcher,
    ReserveVault,
    IERC4906Upgradeable__factory,
    IMortgageToken__factory,
    MockPrestigePad__factory,
    MockPrestigePad,
} from '@typechain-types';
import { callTransaction, getBalance, getSignatures, prepareERC20, prepareNativeToken, resetERC20, resetNativeToken, testReentrancy } from '@utils/blockchain';
import { Constant } from '@tests/test.constant';
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
} from '@utils/callWithSignatures/admin';
import { BigNumber, Contract } from 'ethers';
import { getBytes4Hex, getInterfaceID, randomBigNumber, structToObject } from '@utils/utils';
import { deployProjectMortgageToken } from '@utils/deployments/lend/projectMortgageToken';
import { callProjectToken_AuthorizeLaunchpads, callProjectToken_UpdateZoneRoyaltyRate } from '@utils/callWithSignatures/projectToken';
import { callProjectMortgageToken_Pause, callProjectMortgageToken_UpdateFeeRate } from '@utils/callWithSignatures/projectMortgageToken';
import { deployFailReceiver } from '@utils/deployments/mock/failReceiver';
import { deployReentrancyERC1155Holder } from '@utils/deployments/mock/mockReentrancy/reentrancyERC1155Holder';
import { deployReentrancy } from '@utils/deployments/mock/mockReentrancy/reentrancy';
import { MortgageState } from '@utils/models/enums';
import { Initialization as LaunchInitialization } from '@tests/launch/test.initialization';
import { Initialization as LandInitialization } from '@tests/land/test.initialization';
import { Initialization as LendInitialization } from '@tests/lend/test.initialization';
import { deployReserveVault } from '@utils/deployments/common/reserveVault';
import { deployPriceWatcher } from '@utils/deployments/common/priceWatcher';
import { MockValidator } from '@utils/mockValidator';
import { getCallLaunchProjectTx, getRegisterInitiatorTx } from '@utils/transaction/ProjectToken';
import { RegisterInitiatorParams } from '@utils/models/ProjectToken';
import { applyDiscount, scaleRate } from '@utils/formula';
import { ProjectBorrowParams } from '@utils/models/ProjectMortgageToken';
import { getProjectBorrowTx } from '@utils/transaction/ProjectMortgageToken';


async function testReentrancy_projectMortgageToken(
    projectMortgageToken: ProjectMortgageToken,
    reentrancyContract: Contract,
    assertion: any,
) {
    let data = [
        projectMortgageToken.interface.encodeFunctionData("lend", [0]),
        projectMortgageToken.interface.encodeFunctionData("repay", [0]),
        projectMortgageToken.interface.encodeFunctionData("safeLend", [0, 0]),
        projectMortgageToken.interface.encodeFunctionData("safeRepay", [0, 0]),
        projectMortgageToken.interface.encodeFunctionData("foreclose", [0]),
    ];

    await testReentrancy(
        reentrancyContract,
        projectMortgageToken,
        data,
        assertion,
    );
}


interface ProjectMortgageTokenFixture {
    admin: Admin;
    feeReceiver: FeeReceiver;
    priceWatcher: PriceWatcher;
    reserveVault: ReserveVault;
    currency: Currency;
    projectToken: MockContract<MockProjectToken>;
    prestigePad: MockContract<MockPrestigePad>;
    projectMortgageToken: ProjectMortgageToken;
    validator: MockValidator;

    deployer: any;
    admins: any[];
    lender1: any;
    lender2: any;
    borrower1: any;
    borrower2: any;
    initiator1: any;
    initiator2: any;
    manager: any;
    moderator: any;
    projectMortgageTokenOwner: any;

    zone1: string;
    zone2: string;

    mockCurrencyExclusiveRate: BigNumber;
}

describe('3.2. ProjectMortgageToken', async () => {
    async function projectMortgageTokenFixture(): Promise<ProjectMortgageTokenFixture> {
        const accounts = await ethers.getSigners();
        const deployer = accounts[0];
        const admins = [];
        for (let i = 1; i <= Constant.ADMIN_NUMBER; ++i) admins.push(accounts[i]);
        const lender1 = accounts[Constant.ADMIN_NUMBER + 1];
        const lender2 = accounts[Constant.ADMIN_NUMBER + 2];
        const borrower1 = accounts[Constant.ADMIN_NUMBER + 3];
        const borrower2 = accounts[Constant.ADMIN_NUMBER + 4];
        const manager = accounts[Constant.ADMIN_NUMBER + 5];
        const moderator = accounts[Constant.ADMIN_NUMBER + 6];
        const projectMortgageTokenOwner = accounts[Constant.ADMIN_NUMBER + 8];
        const initiator1 = accounts[Constant.ADMIN_NUMBER + 9];
        const initiator2 = accounts[Constant.ADMIN_NUMBER + 10];

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
        const mockCurrencyExclusiveRate = ethers.utils.parseEther('0.3');
        await callTransaction(currency.setExclusiveDiscount(mockCurrencyExclusiveRate, Constant.COMMON_RATE_DECIMALS));

        const MockEstateTokenFactory = await smock.mock('MockEstateToken') as any;
        const estateToken = await MockEstateTokenFactory.deploy();
        await callTransaction(estateToken.initialize(
            admin.address,
            feeReceiver.address,
            validator.getAddress(),
            LandInitialization.ESTATE_TOKEN_BaseURI,
        ));

        const MockProjectTokenFactory = await smock.mock('MockProjectToken') as any;
        const projectToken = await MockProjectTokenFactory.deploy();
        await callTransaction(projectToken.initialize(
            admin.address,
            estateToken.address,
            feeReceiver.address,
            validator.getAddress(),
            LaunchInitialization.PROJECT_TOKEN_BaseURI,
        ));

        const MockPrestigePadFactory = await smock.mock<MockPrestigePad__factory>('MockPrestigePad');
        const prestigePad = await MockPrestigePadFactory.deploy();
        await callTransaction(prestigePad.initialize(
            admin.address,
            projectToken.address,
            priceWatcher.address,
            feeReceiver.address,
            reserveVault.address,
            validator.getAddress(),
            LaunchInitialization.PRESTIGE_PAD_BaseMinUnitPrice,
            LaunchInitialization.PRESTIGE_PAD_BaseMaxUnitPrice,
        ));

        const projectMortgageToken = await deployProjectMortgageToken(
            deployer.address,
            admin.address,
            projectToken.address,
            feeReceiver.address,
            LendInitialization.PROJECT_MORTGAGE_TOKEN_Name,
            LendInitialization.PROJECT_MORTGAGE_TOKEN_Symbol,
            LendInitialization.PROJECT_MORTGAGE_TOKEN_BaseURI,
            LendInitialization.PROJECT_MORTGAGE_TOKEN_FeeRate,
        ) as ProjectMortgageToken;

        const zone1 = ethers.utils.formatBytes32String("TestZone1");
        const zone2 = ethers.utils.formatBytes32String("TestZone2");

        return {
            admin,
            feeReceiver,
            priceWatcher,
            reserveVault,
            currency,
            projectToken,
            prestigePad,
            projectMortgageToken,
            validator,
            deployer,
            admins,
            manager,
            moderator,
            lender1,
            lender2,
            borrower1,
            borrower2,
            initiator1,
            initiator2,
            mockCurrencyExclusiveRate,
            projectMortgageTokenOwner,
            zone1,
            zone2,
        };
    };

    async function beforeProjectMortgageTokenTest({
        skipSetApprovalForAll = false,
        listSampleCurrencies = false,
        listProjectToken = false,
        listSampleMortgage = false,
        listSampleLending = false,
        pause = false,
    } = {}): Promise<ProjectMortgageTokenFixture> {
        const fixture = await loadFixture(projectMortgageTokenFixture);

        const {
            admin,
            admins,
            currency,
            projectToken,
            prestigePad,
            projectMortgageToken,
            borrower1,
            borrower2,
            lender1,
            lender2,
            manager,
            moderator,
            initiator1,
            initiator2,
            validator,
            zone1,
            zone2 
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

        for (const zone of [zone1, zone2]) {
            await callAdmin_DeclareZone(
                admin,
                admins,
                zone,
                await fixture.admin.nonce()
            );
        }

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

        await callProjectToken_AuthorizeLaunchpads(
            projectToken,
            admins,
            [prestigePad.address],
            true,
            await admin.nonce()
        );

        for (const zone of [zone1, zone2]) {
            for (const initiator of [initiator1, initiator2]) {
                const params: RegisterInitiatorParams = {
                    zone,
                    initiator: initiator.address,
                    uri: "TestURI",
                };
                await callTransaction(getRegisterInitiatorTx(projectToken as any, validator, manager, params))
            }
        }

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

        if (listProjectToken) {
            currentTimestamp += 1000;

            await time.setNextBlockTimestamp(currentTimestamp);

            await callTransaction(getCallLaunchProjectTx(projectToken as any, prestigePad, {
                zone: zone1,
                launchId: BigNumber.from(10),
                uri: "Token1_URI",
                initiator: initiator1.address,
            }));
            await callTransaction(getCallLaunchProjectTx(projectToken as any, prestigePad, {
                zone: zone2,
                launchId: BigNumber.from(10),
                uri: "Token2_URI",
                initiator: initiator2.address,
            }));

            projectToken.isAvailable.whenCalledWith(1).returns(true);
            projectToken.isAvailable.whenCalledWith(2).returns(true);

            await projectToken.mintTo(borrower1.address, 1, 200_000);
            await projectToken.mintTo(borrower2.address, 1, 300_000);

            await projectToken.mintTo(borrower1.address, 2, 200);
            await projectToken.mintTo(borrower2.address, 2, 300);
        }

        if (!skipSetApprovalForAll) {
            await projectToken.connect(borrower1).setApprovalForAll(projectMortgageToken.address, true);
            await projectToken.connect(borrower2).setApprovalForAll(projectMortgageToken.address, true);
        }

        if (listSampleMortgage) {
            await callTransaction(getProjectBorrowTx(projectMortgageToken, borrower1, {
                projectId: BigNumber.from(1),
                amount: BigNumber.from(150_000),
                principal: BigNumber.from(10e5),
                repayment: BigNumber.from(11e5),
                currency: ethers.constants.AddressZero,
                duration: BigNumber.from(1000),
            }));
            await callTransaction(projectToken.connect(borrower1).setApprovalForAll(projectMortgageToken.address, true));

            await callTransaction(getProjectBorrowTx(projectMortgageToken, borrower2, {
                projectId: BigNumber.from(2),
                amount: BigNumber.from(200),
                principal: BigNumber.from(100000),
                repayment: BigNumber.from(110000),
                currency: currency.address,
                duration: BigNumber.from(1000),
            }));    
            await callTransaction(projectToken.connect(borrower2).setApprovalForAll(projectMortgageToken.address, true));
            
            await prepareERC20(
                currency,
                [borrower1, borrower2, lender1, lender2],
                [projectMortgageToken],
                1e9
            );
        }
        
        if (listSampleLending) {
            currentTimestamp += 100;
            await time.setNextBlockTimestamp(currentTimestamp);
            await callTransaction(projectMortgageToken.connect(lender1).lend(1, { value: 1e9 }));

            currentTimestamp += 100;
            await time.setNextBlockTimestamp(currentTimestamp);
            await callTransaction(projectMortgageToken.connect(lender2).lend(2));
        }

        if (pause) {
            await callProjectMortgageToken_Pause(
                projectMortgageToken,
                admins,
                await admin.nonce()
            );
        }

        return {
            ...fixture,
        }
    }

    describe('3.2.1. initialize(address, address, address, address, string, string, string, uint256, uint256)', async () => {
        it('3.2.1.1. Deploy successfully', async () => {
            const { admin, projectToken, feeReceiver, projectMortgageToken } = await beforeProjectMortgageTokenTest();

            const tx = projectMortgageToken.deployTransaction;
            await expect(tx).to.emit(projectMortgageToken, "BaseURIUpdate").withArgs(LendInitialization.PROJECT_MORTGAGE_TOKEN_BaseURI);
            await expect(tx).to.emit(projectMortgageToken, "FeeRateUpdate").withArgs(
                (rate: any) => {
                    expect(structToObject(rate)).to.deep.equal({
                        value: LendInitialization.PROJECT_MORTGAGE_TOKEN_FeeRate,
                        decimals: Constant.COMMON_RATE_DECIMALS,
                    });
                    return true;
                }
            );

            expect(await projectMortgageToken.mortgageNumber()).to.equal(0);

            const feeRate = await projectMortgageToken.getFeeRate();
            expect(structToObject(feeRate)).to.deep.equal({
                value: LendInitialization.PROJECT_MORTGAGE_TOKEN_FeeRate,
                decimals: Constant.COMMON_RATE_DECIMALS,
            });

            expect(await projectMortgageToken.admin()).to.equal(admin.address);
            expect(await projectMortgageToken.projectToken()).to.equal(projectToken.address);
            expect(await projectMortgageToken.feeReceiver()).to.equal(feeReceiver.address);
        });


        it('3.2.1.2. Deploy unsuccessfully with invalid fee rate', async () => {
            const { deployer, admin, projectToken, feeReceiver } = await beforeProjectMortgageTokenTest();

            const ProjectMortgageToken = await ethers.getContractFactory('ProjectMortgageToken', deployer);

            await expect(upgrades.deployProxy(ProjectMortgageToken, [
                admin.address,
                projectToken.address,
                feeReceiver.address,
                LendInitialization.PROJECT_MORTGAGE_TOKEN_Name,
                LendInitialization.PROJECT_MORTGAGE_TOKEN_Symbol,
                LendInitialization.PROJECT_MORTGAGE_TOKEN_BaseURI,
                Constant.COMMON_RATE_MAX_FRACTION.add(1),
            ])).to.be.reverted;
        });
    });

    describe('3.2.2. updateBaseURI(string, bytes[])', async () => {
        it('3.2.2.1. updateBaseURI successfully with valid signatures', async () => {
            const { projectMortgageToken, admin, admins } = await beforeProjectMortgageTokenTest({
                listSampleCurrencies: true,
                listProjectToken: true,
                listSampleMortgage: true,
                listSampleLending: true,
            });

            const message = ethers.utils.defaultAbiCoder.encode(
                ["address", "string", "string"],
                [projectMortgageToken.address, "updateBaseURI", "NewBaseURI:"]
            );
            const signatures = await getSignatures(message, admins, await admin.nonce());

            const tx = await projectMortgageToken.updateBaseURI("NewBaseURI:", signatures);
            await tx.wait();

            await expect(tx).to
                .emit(projectMortgageToken, 'BaseURIUpdate')
                .withArgs("NewBaseURI:");

            expect(await projectMortgageToken.tokenURI(1)).to.equal("NewBaseURI:1");
            expect(await projectMortgageToken.tokenURI(2)).to.equal("NewBaseURI:2");
        });

        it('3.2.2.2. updateBaseURI unsuccessfully with invalid signatures', async () => {
            const { projectMortgageToken, admin, admins } = await beforeProjectMortgageTokenTest();

            const message = ethers.utils.defaultAbiCoder.encode(
                ["address", "string", "string"],
                [projectMortgageToken.address, "updateBaseURI", "NewBaseURI:"]
            );
            const invalidSignatures = await getSignatures(message, admins, (await admin.nonce()).add(1));

            await expect(projectMortgageToken.updateBaseURI(
                "NewBaseURI:",
                invalidSignatures
            )).to.be.revertedWithCustomError(admin, 'FailedVerification');
        });
    });

    describe('3.2.3. updateFeeRate(uint256, bytes[])', async () => {
        it('3.2.3.1. updateFeeRate successfully with valid signatures', async () => {
            const { projectMortgageToken, admin, admins } = await beforeProjectMortgageTokenTest();

            const rateValue = ethers.utils.parseEther('0.2');

            const message = ethers.utils.defaultAbiCoder.encode(
                ["address", "string", "uint256"],
                [projectMortgageToken.address, "updateFeeRate", rateValue]
            );

            const signatures = await getSignatures(message, admins, await admin.nonce());

            const tx = await projectMortgageToken.updateFeeRate(rateValue, signatures);
            await tx.wait();

            await expect(tx).to
                .emit(projectMortgageToken, 'FeeRateUpdate')
                .withArgs(
                    (rate: any) => {
                        expect(structToObject(rate)).to.deep.equal({
                            value: rateValue,
                            decimals: Constant.COMMON_RATE_DECIMALS,
                        });
                        return true;
                    }
                );

            const feeRate = await projectMortgageToken.getFeeRate();
            expect(structToObject(feeRate)).to.deep.equal({
                value: rateValue,
                decimals: Constant.COMMON_RATE_DECIMALS,
            });
        });

        it('3.2.3.2. updateFeeRate unsuccessfully with invalid signatures', async () => {
            const { projectMortgageToken, admin, admins } = await beforeProjectMortgageTokenTest();

            const message = ethers.utils.defaultAbiCoder.encode(
                ["address", "string", "uint256"],
                [projectMortgageToken.address, "updateFeeRate", ethers.utils.parseEther('0.2')]
            );
            const invalidSignatures = await getSignatures(message, admins, (await admin.nonce()).add(1));

            await expect(projectMortgageToken.updateFeeRate(
                ethers.utils.parseEther('0.2'),
                invalidSignatures
            )).to.be.revertedWithCustomError(admin, 'FailedVerification');
        });

        it('3.2.3.3. updateFeeRate unsuccessfully with invalid rate', async () => {
            const { projectMortgageToken, admin, admins } = await beforeProjectMortgageTokenTest();

            let message = ethers.utils.defaultAbiCoder.encode(
                ["address", "string", "uint256"],
                [projectMortgageToken.address, "updateFeeRate", Constant.COMMON_RATE_MAX_FRACTION.add(1)]
            );
            const signatures = await getSignatures(message, admins, await admin.nonce());

            await expect(projectMortgageToken.updateFeeRate(
                Constant.COMMON_RATE_MAX_FRACTION.add(1),
                signatures
            )).to.be.revertedWithCustomError(projectMortgageToken, 'InvalidRate');
        });
    });

    describe('3.2.4. borrow(uint256, uint256, uint256, uint256, address, uint40)', async () => {
        async function beforeBorrowTest(fixture: ProjectMortgageTokenFixture): Promise<{ defaultParams: ProjectBorrowParams }> {
            return {
                defaultParams: {
                    projectId: BigNumber.from(1),
                    amount: BigNumber.from(150_000),
                    principal: BigNumber.from(10e5),
                    repayment: BigNumber.from(11e5),
                    currency: ethers.constants.AddressZero,
                    duration: BigNumber.from(1000),
                }
            }
        }

        it('3.2.4.1. create mortgage successfully', async () => {
            const fixture = await beforeProjectMortgageTokenTest({
                listSampleCurrencies: true,
                listProjectToken: true,
            });
            const { projectMortgageToken, admin, borrower1, borrower2, currency, projectToken } = fixture;

            const params1: ProjectBorrowParams = {
                projectId: BigNumber.from(1),
                amount: BigNumber.from(150_000),
                principal: BigNumber.from(10e5),
                repayment: BigNumber.from(11e5),
                currency: ethers.constants.AddressZero,
                duration: BigNumber.from(1000),
            }

            let initBorrower1Project1Balance = await projectToken.balanceOf(borrower1.address, 1);
            let initProjectMortgageTokenProject1Balance = await projectToken.balanceOf(projectMortgageToken.address, 1);

            const tx1 = await getProjectBorrowTx(projectMortgageToken, borrower1, params1);
            await tx1.wait();
            
            const mortgage1 = await projectMortgageToken.getMortgage(1);
            const fee1 = scaleRate(mortgage1.principal, await projectMortgageToken.getFeeRate());

            await expect(tx1).to.emit(projectMortgageToken, 'NewMortgage').withArgs(
                1,
                borrower1.address,
                params1.principal,
                params1.repayment,
                fee1,
                params1.currency,
                params1.duration
            );
            await expect(tx1).to.emit(projectMortgageToken, 'NewCollateral').withArgs(
                1,
                params1.projectId,
                params1.amount
            );

            expect(await projectMortgageToken.mortgageNumber()).to.equal(1);
            
            const collateral1 = await projectMortgageToken.getCollateral(1);
            expect(collateral1.tokenId).to.equal(params1.projectId);
            expect(collateral1.amount).to.equal(params1.amount);

            expect(mortgage1.principal).to.equal(params1.principal);
            expect(mortgage1.repayment).to.equal(params1.repayment);
            expect(mortgage1.fee).to.equal(fee1);
            expect(mortgage1.currency).to.equal(params1.currency);
            expect(mortgage1.due).to.equal(params1.duration);
            expect(mortgage1.state).to.equal(MortgageState.Pending);
            expect(mortgage1.borrower).to.equal(borrower1.address);
            expect(mortgage1.lender).to.equal(ethers.constants.AddressZero);

            expect(await projectToken.balanceOf(borrower1.address, 1)).to.equal(initBorrower1Project1Balance.sub(params1.amount));
            expect(await projectToken.balanceOf(projectMortgageToken.address, 1)).to.equal(initProjectMortgageTokenProject1Balance.add(params1.amount));

            const params2: ProjectBorrowParams = {
                projectId: BigNumber.from(2),
                amount: BigNumber.from(200),
                principal: BigNumber.from(100000),
                repayment: BigNumber.from(110000),
                currency: currency.address,
                duration: BigNumber.from(1000),
            }

            let initBorrower2Project2Balance = await projectToken.balanceOf(borrower2.address, 2);
            let initProjectMortgageTokenProject2Balance = await projectToken.balanceOf(projectMortgageToken.address, 2);

            const tx2 = await getProjectBorrowTx(projectMortgageToken, borrower2, params2);
            await tx2.wait();

            const mortgage2 = await projectMortgageToken.getMortgage(2);
            const fee2 = await applyDiscount(
                admin, 
                scaleRate(mortgage2.principal, await projectMortgageToken.getFeeRate()),
                currency
            );

            await expect(tx2).to.emit(projectMortgageToken, 'NewMortgage').withArgs(
                2,
                borrower2.address,
                params2.principal,
                params2.repayment,
                fee2,
                params2.currency,
                params2.duration
            );
            await expect(tx2).to.emit(projectMortgageToken, 'NewCollateral').withArgs(
                2,
                params2.projectId,
                params2.amount
            );

            expect(await projectMortgageToken.mortgageNumber()).to.equal(2);

            const collateral2 = await projectMortgageToken.getCollateral(2);
            expect(collateral2.tokenId).to.equal(params2.projectId);
            expect(collateral2.amount).to.equal(params2.amount);

            expect(mortgage2.principal).to.equal(params2.principal);
            expect(mortgage2.repayment).to.equal(params2.repayment);
            expect(mortgage2.fee).to.equal(fee2);
            expect(mortgage2.currency).to.equal(params2.currency);
            expect(mortgage2.due).to.equal(params2.duration);
            expect(mortgage2.state).to.equal(MortgageState.Pending);
            expect(mortgage2.borrower).to.equal(borrower2.address);
            expect(mortgage2.lender).to.equal(ethers.constants.AddressZero);

            expect(await projectToken.balanceOf(borrower2.address, 2)).to.equal(initBorrower2Project2Balance.sub(params2.amount));
            expect(await projectToken.balanceOf(projectMortgageToken.address, 2)).to.equal(initProjectMortgageTokenProject2Balance.add(params2.amount));
        });

        it('3.2.4.2. create mortgage unsuccessfully when paused', async () => {
            const fixture = await beforeProjectMortgageTokenTest({
                listSampleCurrencies: true,
                listProjectToken: true,
                pause: true
            });
            const { projectMortgageToken, borrower1 } = fixture;

            const { defaultParams } = await beforeBorrowTest(fixture);

            await expect(getProjectBorrowTx(projectMortgageToken, borrower1, defaultParams))
                .to.be.revertedWith('Pausable: paused');
        });

        it('3.2.4.3. create mortgage unsuccessfully with invalid project id', async () => {
            const fixture = await beforeProjectMortgageTokenTest({
                listSampleCurrencies: true,
                listProjectToken: true,
            });
            const { projectMortgageToken, projectToken, borrower1 } = fixture;

            const { defaultParams } = await beforeBorrowTest(fixture);

            const params1: ProjectBorrowParams = {
                ...defaultParams,
                projectId: BigNumber.from(0),
            }
            await expect(getProjectBorrowTx(projectMortgageToken, borrower1, params1))
                .to.be.revertedWithCustomError(projectMortgageToken, 'InvalidTokenId');

            const params2: ProjectBorrowParams = {
                ...defaultParams,
                projectId: BigNumber.from(3),
            }
            await expect(getProjectBorrowTx(projectMortgageToken, borrower1, params2))
                .to.be.revertedWithCustomError(projectMortgageToken, 'InvalidTokenId');

            projectToken.isAvailable.whenCalledWith(1).returns(false);

            const params3: ProjectBorrowParams = {
                ...defaultParams,
                projectId: BigNumber.from(1),
            }
            await expect(getProjectBorrowTx(projectMortgageToken, borrower1, params3))
                .to.be.revertedWithCustomError(projectMortgageToken, 'InvalidTokenId');
        });

        it('3.2.4.4. create mortgage unsuccessfully with invalid currency', async () => {
            const fixture = await beforeProjectMortgageTokenTest({
                listProjectToken: true,
            });
            const { projectMortgageToken, borrower1 } = fixture;
            const { defaultParams } = await beforeBorrowTest(fixture);
            
            await expect(getProjectBorrowTx(projectMortgageToken, borrower1, defaultParams))
                .to.be.revertedWithCustomError(projectMortgageToken, 'InvalidCurrency');
        });

        it('3.2.4.5. create mortgage unsuccessfully with zero amount', async () => {
            const fixture = await beforeProjectMortgageTokenTest({
                listSampleCurrencies: true,
                listProjectToken: true,
            });
            const { projectMortgageToken, borrower1 } = fixture;
            const { defaultParams } = await beforeBorrowTest(fixture);

            const params: ProjectBorrowParams = {
                ...defaultParams,
                amount: BigNumber.from(0),
            }
            await expect(getProjectBorrowTx(projectMortgageToken, borrower1, params))
                .to.be.revertedWithCustomError(projectMortgageToken, 'InvalidInput');
        });

        it('3.2.4.5. create mortgage unsuccessfully with amount more than balance', async () => {
            const fixture = await beforeProjectMortgageTokenTest({
                listSampleCurrencies: true,
                listProjectToken: true,
            });
            const { projectMortgageToken, projectToken, borrower1 } = fixture;
            const { defaultParams } = await beforeBorrowTest(fixture);

            const borrowerBalance = await projectToken.balanceOf(borrower1.address, defaultParams.projectId);

            const params: ProjectBorrowParams = {
                ...defaultParams,
                amount: borrowerBalance.add(1),
            }
            await expect(getProjectBorrowTx(projectMortgageToken, borrower1, params))
                .to.be.revertedWithCustomError(projectMortgageToken, 'InvalidCollateral');
        });

        it('3.2.4.6. create mortgage unsuccessfully with invalid principal', async () => {
            const fixture = await beforeProjectMortgageTokenTest({
                listSampleCurrencies: true,
                listProjectToken: true,
            });
            const { projectMortgageToken, projectToken, borrower1 } = fixture;
            const { defaultParams } = await beforeBorrowTest(fixture);

            const params: ProjectBorrowParams = {
                ...defaultParams,
                principal: BigNumber.from(0),
            }
            await expect(getProjectBorrowTx(projectMortgageToken, borrower1, params))
                .to.be.revertedWithCustomError(projectMortgageToken, 'InvalidPrincipal');
        });

        it('3.2.4.7. create mortgage unsuccessfully with invalid repayment', async () => {
            const fixture = await beforeProjectMortgageTokenTest({
                listSampleCurrencies: true,
                listProjectToken: true,
            });
            const { projectMortgageToken, borrower1 } = fixture;
            const { defaultParams } = await beforeBorrowTest(fixture);

            const params: ProjectBorrowParams = {
                ...defaultParams,
                repayment: defaultParams.principal.sub(1),
            }
            await expect(getProjectBorrowTx(projectMortgageToken, borrower1, params))
                .to.be.revertedWithCustomError(projectMortgageToken, 'InvalidRepayment');
        });
    });

    describe('3.2.5. cancel(uint256)', async () => {
        it('3.2.5.1. cancel mortgage successfully by borrower', async () => {
            const fixture = await beforeProjectMortgageTokenTest({
                listSampleCurrencies: true,
                listProjectToken: true,
                listSampleMortgage: true,
            });
            const { projectMortgageToken, borrower1 } = fixture;

            let tx = await projectMortgageToken.connect(borrower1).cancel(1);
            await tx.wait();

            expect(tx).to
                .emit(projectMortgageToken, 'MortgageCancellation')
                .withArgs(1);

            expect(await projectMortgageToken.mortgageNumber()).to.equal(2);

            const mortgage = await projectMortgageToken.getMortgage(1);
            expect(mortgage.state).to.equal(MortgageState.Cancelled);
        });

        it('3.2.5.2. cancel mortgage successfully by manager', async () => {
            const fixture = await beforeProjectMortgageTokenTest({
                listSampleCurrencies: true,
                listProjectToken: true,
                listSampleMortgage: true,
            });
            const { projectMortgageToken, manager } = fixture;

            let tx = await projectMortgageToken.connect(manager).cancel(2);
            await tx.wait();

            expect(tx).to
                .emit(projectMortgageToken, 'MortgageCancellation')
                .withArgs(2);

            expect(await projectMortgageToken.mortgageNumber()).to.equal(2);

            const mortgage = await projectMortgageToken.getMortgage(2);
            expect(mortgage.state).to.equal(MortgageState.Cancelled);
        });

        it('3.2.5.3. cancel mortgage unsuccessfully by unauthorized user', async () => {
            const fixture = await beforeProjectMortgageTokenTest({
                listSampleCurrencies: true,
                listProjectToken: true,
                listSampleMortgage: true,
            });
            const { projectMortgageToken, lender1, moderator } = fixture;
            await expect(projectMortgageToken.connect(lender1).cancel(1))
                .to.be.revertedWithCustomError(projectMortgageToken, 'Unauthorized');
            await expect(projectMortgageToken.connect(moderator).cancel(1))
                .to.be.revertedWithCustomError(projectMortgageToken, 'Unauthorized');
        });

        it('3.2.5.4. cancel mortgage unsuccessfully with invalid mortgage id', async () => {
            const fixture = await beforeProjectMortgageTokenTest({
                listSampleCurrencies: true,
                listProjectToken: true,
                listSampleMortgage: true,
            });
            const { projectMortgageToken, borrower1 } = fixture;
            await expect(projectMortgageToken.connect(borrower1).cancel(0))
                .to.be.revertedWithCustomError(projectMortgageToken, 'InvalidMortgageId');

            await expect(projectMortgageToken.connect(borrower1).cancel(3))
                .to.be.revertedWithCustomError(projectMortgageToken, 'InvalidMortgageId');
        });

        it('3.2.5.5. cancel mortgage unsuccessfully with cancelled mortgage', async () => {
            const fixture = await beforeProjectMortgageTokenTest({
                listSampleCurrencies: true,
                listProjectToken: true,
                listSampleMortgage: true,
            });
            const { projectMortgageToken, borrower1 } = fixture;
            await callTransaction(projectMortgageToken.connect(borrower1).cancel(1));

            await expect(projectMortgageToken.connect(borrower1).cancel(1))
                .to.be.revertedWithCustomError(projectMortgageToken, 'InvalidCancelling');
        });

        it('3.2.5.6. cancel mortgage unsuccessfully with supplied mortgage', async () => {
            const fixture = await beforeProjectMortgageTokenTest({
                listSampleCurrencies: true,
                listProjectToken: true,
                listSampleMortgage: true,
            });
            const { projectMortgageToken, borrower1, lender1 } = fixture;

            await callTransaction(projectMortgageToken.connect(lender1).lend(1, { value: 1e9 }));

            await expect(projectMortgageToken.connect(borrower1).cancel(1))
                .to.be.revertedWithCustomError(projectMortgageToken, 'InvalidCancelling');
        });

        it('3.2.5.7. cancel mortgage unsuccessfully with foreclosed mortgage', async () => {
            const fixture = await beforeProjectMortgageTokenTest({
                listSampleCurrencies: true,
                listProjectToken: true,
                listSampleMortgage: true,
            });
            const { projectMortgageToken, borrower1, lender1 } = fixture;

            await callTransaction(projectMortgageToken.connect(lender1).lend(1, { value: 1e9 }));

            const due = (await projectMortgageToken.getMortgage(1)).due;

            await time.setNextBlockTimestamp(due);
            await callTransaction(projectMortgageToken.connect(lender1).foreclose(1));

            await expect(projectMortgageToken.connect(borrower1).cancel(1))
                .to.be.revertedWithCustomError(projectMortgageToken, 'InvalidCancelling');
        });

        it('3.2.5.8. cancel mortgage unsuccessfully with repaid mortgage', async () => {
            const fixture = await beforeProjectMortgageTokenTest({
                listSampleCurrencies: true,
                listProjectToken: true,
                listSampleMortgage: true,
            });
            const { projectMortgageToken, borrower1, lender1 } = fixture;

            await callTransaction(projectMortgageToken.connect(lender1).lend(1, { value: 1e9 }));

            await callTransaction(projectMortgageToken.connect(borrower1).repay(1, { value: 1e9 }));

            await expect(projectMortgageToken.connect(borrower1).cancel(1))
                .to.be.revertedWithCustomError(projectMortgageToken, 'InvalidCancelling');
        });
    });

    describe('3.2.6. lend(uint256)', async () => {
        async function testLend(
            fixture: ProjectMortgageTokenFixture,
            currencyExclusiveRate: BigNumber,
            projectMortgageTokenFeeRate: BigNumber,
            isERC20: boolean,
            isExclusive: boolean,
            initialAmount: BigNumber,
            amount: BigNumber,
            principal: BigNumber,
            repayment: BigNumber,
        ) {
            const { projectMortgageToken, admin, admins, deployer, projectToken, prestigePad, borrower1, lender1, feeReceiver, initiator1, zone1 } = fixture;

            const currentMortgageId = (await projectMortgageToken.mortgageNumber()).add(1);
            const currentLaunchId = 0 // Does not matter
            const zone = zone1;
            const borrower = borrower1;
            const lender = lender1;
            
            await callProjectMortgageToken_UpdateFeeRate(projectMortgageToken, admins, projectMortgageTokenFeeRate, await admin.nonce());

            let newCurrency: Currency | null = null;
            let newCurrencyAddress: string;
            if (isERC20) {
                newCurrency = await deployCurrency(
                    deployer.address,
                    `NewMockCurrency_${currentMortgageId}`,
                    `NMC_${currentMortgageId}`
                ) as Currency;
                await newCurrency.setExclusiveDiscount(currencyExclusiveRate, Constant.COMMON_RATE_DECIMALS);
                newCurrencyAddress = newCurrency.address;
            } else {
                newCurrencyAddress = ethers.constants.AddressZero;
            }
            
            await callAdmin_UpdateCurrencyRegistries(
                admin,
                admins,
                [newCurrencyAddress],
                [true],
                [isExclusive],
                await admin.nonce()
            );

            let currentTimestamp = await time.latest() + 10;

            await callTransaction(getCallLaunchProjectTx(projectToken as any, prestigePad, {
                zone,
                launchId: BigNumber.from(currentLaunchId),
                initiator: initiator1.address,
                uri: "TestURI",
            }));

            const currentTokenId = await projectToken.projectNumber();

            await callTransaction(projectToken.mintTo(borrower.address, currentTokenId, initialAmount));
            await callTransaction(projectToken.connect(borrower).setApprovalForAll(projectMortgageToken.address, true));

            const walletsToReset = [feeReceiver];
            if (isERC20) {
                await resetERC20(newCurrency!, walletsToReset);
            } else {
                await resetNativeToken(ethers.provider, walletsToReset);
            }

            const due = 1000;

            let receipt = await callTransaction(projectMortgageToken.connect(borrower).borrow(
                currentMortgageId,
                amount,
                principal,
                repayment,
                newCurrencyAddress,
                due
            ));

            let fee = principal.mul(projectMortgageTokenFeeRate).div(Constant.COMMON_RATE_MAX_FRACTION);
            if (isExclusive) {
                fee = fee.sub(fee.mul(currencyExclusiveRate).div(Constant.COMMON_RATE_MAX_FRACTION));
            }

            let ethValue = ethers.BigNumber.from(0);
            await prepareNativeToken(ethers.provider, deployer, [lender], ethers.utils.parseEther("1.0"));
            if (isERC20) {
                await prepareERC20(newCurrency!, [lender], [projectMortgageToken], principal);
            } else {
                ethValue = principal;
                await prepareNativeToken(ethers.provider, deployer, [lender], principal);
            }

            let currentTotalSupply = await projectMortgageToken.totalSupply();

            let initBorrowerBalance = await getBalance(ethers.provider, borrower.address, newCurrency);
            let initLenderBalance = await getBalance(ethers.provider, lender.address, newCurrency);
            let initFeeReceiverBalance = await getBalance(ethers.provider, feeReceiver.address, newCurrency);

            currentTimestamp += 100;
            await time.setNextBlockTimestamp(currentTimestamp);

            let tx = await projectMortgageToken.connect(lender).lend(
                currentMortgageId,
                { value: ethValue }
            );
            receipt = await tx.wait();

            let expectedBorrowerBalance = initBorrowerBalance.add(principal).sub(fee);
            let expectedLenderBalance = initLenderBalance.sub(principal);
            let expectedFeeReceiverBalance = initFeeReceiverBalance.add(fee);

            if (!isERC20) {
                const gasFee = receipt.gasUsed.mul(receipt.effectiveGasPrice);
                expectedLenderBalance = expectedLenderBalance.sub(gasFee);
            }

            await expect(tx).to.emit(projectMortgageToken, 'NewToken').withArgs(
                currentMortgageId,
                lender.address,
                currentTimestamp + due,
            );

            const mortgage = await projectMortgageToken.getMortgage(currentMortgageId);
            expect(mortgage.due).to.equal(currentTimestamp + due);
            expect(mortgage.state).to.equal(MortgageState.Supplied);
            expect(mortgage.lender).to.equal(lender.address);

            expect(await projectMortgageToken.totalSupply()).to.equal(currentTotalSupply.add(1));

            expect(await getBalance(ethers.provider, borrower.address, newCurrency)).to.equal(expectedBorrowerBalance);
            expect(await getBalance(ethers.provider, lender.address, newCurrency)).to.equal(expectedLenderBalance);
            expect(await getBalance(ethers.provider, feeReceiver.address, newCurrency)).to.equal(expectedFeeReceiverBalance);

            expect(await projectToken.balanceOf(borrower.address, currentTokenId)).to.equal(initialAmount.sub(amount));
            expect(await projectToken.balanceOf(projectMortgageToken.address, currentTokenId)).to.equal(amount);

            expect(await projectMortgageToken.ownerOf(currentMortgageId)).to.equal(lender.address);

            if (isERC20) {
                await resetERC20(newCurrency!, [borrower, lender, feeReceiver]);
            } else {
                await resetNativeToken(ethers.provider, [borrower, lender, feeReceiver]);
                await prepareNativeToken(ethers.provider, deployer, [borrower, lender], ethers.utils.parseEther("1.0"));
            }
        }

        it('3.2.6.1. lend successfully in native and erc20 token', async () => {
            const fixture = await beforeProjectMortgageTokenTest();
            await testLend(
                fixture,
                fixture.mockCurrencyExclusiveRate,
                LendInitialization.PROJECT_MORTGAGE_TOKEN_FeeRate,
                false,
                false,
                ethers.BigNumber.from(200_000),
                ethers.BigNumber.from(150_000),
                ethers.BigNumber.from(10e5),
                ethers.BigNumber.from(11e5),
            )

            await testLend(
                fixture,
                fixture.mockCurrencyExclusiveRate,
                LendInitialization.PROJECT_MORTGAGE_TOKEN_FeeRate,
                true,
                true,
                ethers.BigNumber.from(300),
                ethers.BigNumber.from(200),
                ethers.BigNumber.from(100000),
                ethers.BigNumber.from(110000),
            )
        });

        it('3.2.6.2. lend successfully in all native/erc20 and exclusive/non-exclusive combinations', async () => {
            const fixture = await beforeProjectMortgageTokenTest();
            for (const isERC20 of [false, true]) {
                for (const isExclusive of [false, true]) {
                    if (isExclusive && !isERC20) {
                        continue;
                    }
                    await testLend(
                        fixture,
                        fixture.mockCurrencyExclusiveRate,
                        LendInitialization.PROJECT_MORTGAGE_TOKEN_FeeRate,
                        isERC20,
                        isExclusive,
                        ethers.BigNumber.from(200_000),
                        ethers.BigNumber.from(150_000),
                        ethers.BigNumber.from(10e5),
                        ethers.BigNumber.from(11e5),
                    )
                }
            }
        });

        it('3.2.6.3. lend successfully with very large amount in all native/erc20 and exclusive/non-exclusive combinations', async () => {
            const fixture = await beforeProjectMortgageTokenTest();
            for (const isERC20 of [false, true]) {
                for (const isExclusive of [false, true]) {
                    if (isExclusive && !isERC20) {
                        continue;
                    }
                    const amount = ethers.BigNumber.from(2).pow(255);
                    const principal = ethers.BigNumber.from(2).pow(255);
                    const repayment = principal.add(1);
                    await testLend(
                        fixture,
                        ethers.utils.parseEther("0.99"),
                        ethers.utils.parseEther("0.99"),
                        isERC20,
                        isExclusive,
                        amount.add(1),
                        amount,
                        principal,
                        repayment,
                    )
                }
            }
        });

        it('3.2.6.4. lend successfully in 100 random test cases', async () => {
            const fixture = await beforeProjectMortgageTokenTest();
            for (let testcase = 0; testcase < 100; testcase++) {
                const isERC20 = Math.random() < 0.5;
                const isExclusive = Math.random() < 0.5;
                const feeRate = randomBigNumber(ethers.constants.Zero, ethers.utils.parseEther("1.0"));
                const exclusiveRate = randomBigNumber(ethers.constants.Zero, ethers.utils.parseEther("1.0"));

                if (isExclusive && !isERC20) {
                    --testcase;
                    continue;
                }

                let randomNums = []
                for (let i = 0; i < 2; ++i) {
                    const maxSupply = ethers.BigNumber.from(2).pow(255);
                    randomNums.push(ethers.BigNumber.from(ethers.utils.randomBytes(32)).mod(maxSupply).add(1));
                }
                randomNums.sort((a, b) => a.sub(b).lt(0) ? -1 : 1);

                const initAmount = randomNums[1];
                const amount = randomNums[0];

                randomNums = [];
                for (let i = 0; i < 2; ++i) {
                    const maxSupply = ethers.BigNumber.from(2).pow(255);
                    randomNums.push(ethers.BigNumber.from(ethers.utils.randomBytes(32)).mod(maxSupply).add(1));
                }
                randomNums.sort((a, b) => a.sub(b).lt(0) ? -1 : 1);

                const principal = randomNums[0];
                const repayment = randomNums[1];

                await testLend(
                    fixture,
                    exclusiveRate,
                    feeRate,
                    isERC20,
                    isExclusive,
                    initAmount,
                    amount,
                    principal,
                    repayment,
                );
            }
        });

        it('3.2.6.5. lend unsuccessfully when paused', async () => {
            const fixture = await beforeProjectMortgageTokenTest({
                listSampleCurrencies: true,
                listProjectToken: true,
                listSampleMortgage: true,
                pause: true,
            });
            const { projectMortgageToken, borrower1 } = fixture;

            await expect(projectMortgageToken.connect(borrower1).lend(1, { value: 1e9 }))
                .to.be.revertedWith("Pausable: paused");
        });

        it('3.2.6.6. lend unsuccessfully with invalid mortgage id', async () => {
            const fixture = await beforeProjectMortgageTokenTest({
                listSampleCurrencies: true,
                listProjectToken: true,
                listSampleMortgage: true,
            });
            const { projectMortgageToken, borrower1 } = fixture;

            await expect(projectMortgageToken.connect(borrower1).lend(0, { value: 1e9 }))
                .to.be.revertedWithCustomError(projectMortgageToken, "InvalidMortgageId");

            await expect(projectMortgageToken.connect(borrower1).lend(3, { value: 1e9 }))
                .to.be.revertedWithCustomError(projectMortgageToken, "InvalidMortgageId");
        });

        it('3.2.6.7. lend unsuccessfully when borrower lend their own mortgage', async () => {
            const fixture = await beforeProjectMortgageTokenTest({
                listSampleCurrencies: true,
                listProjectToken: true,
                listSampleMortgage: true,
            });
            const { projectMortgageToken, borrower1, borrower2 } = fixture;

            await expect(projectMortgageToken.connect(borrower1).lend(1, { value: 1e9 }))
                .to.be.revertedWithCustomError(projectMortgageToken, "InvalidLending");

            await expect(projectMortgageToken.connect(borrower2).lend(2, { value: 1e9 }))
                .to.be.revertedWithCustomError(projectMortgageToken, "InvalidLending");
        });

        it('3.2.6.8. lend unsuccessfully with supplied mortgage', async () => {
            const fixture = await beforeProjectMortgageTokenTest({
                listSampleCurrencies: true,
                listProjectToken: true,
                listSampleMortgage: true,
            });
            const { projectMortgageToken, borrower1, lender1, lender2 } = fixture;

            await callTransaction(projectMortgageToken.connect(lender1).lend(1, { value: 1e9 }));

            await expect(projectMortgageToken.connect(lender1).lend(1, { value: 1e9 }))
                .to.be.revertedWithCustomError(projectMortgageToken, "InvalidLending");
            await expect(projectMortgageToken.connect(lender2).lend(1, { value: 1e9 }))
                .to.be.revertedWithCustomError(projectMortgageToken, "InvalidLending");
        });

        it('3.2.6.9. lend unsuccessfully with repaid mortgage', async () => {
            const fixture = await beforeProjectMortgageTokenTest({
                listSampleCurrencies: true,
                listProjectToken: true,
                listSampleMortgage: true,
            });
            const { projectMortgageToken, borrower1, lender1, lender2 } = fixture;

            await callTransaction(projectMortgageToken.connect(lender1).lend(1, { value: 1e9 }));

            await callTransaction(projectMortgageToken.connect(borrower1).repay(1, { value: 1e9 }));

            await expect(projectMortgageToken.connect(lender1).lend(1, { value: 1e9 }))
                .to.be.revertedWithCustomError(projectMortgageToken, "InvalidLending");
            await expect(projectMortgageToken.connect(lender2).lend(1, { value: 1e9 }))
                .to.be.revertedWithCustomError(projectMortgageToken, "InvalidLending");
        });

        it('3.2.6.10. lend unsuccessfully with cancelled mortgage', async () => {
            const fixture = await beforeProjectMortgageTokenTest({
                listSampleCurrencies: true,
                listProjectToken: true,
                listSampleMortgage: true,
            });
            const { projectMortgageToken, borrower1, lender1 } = fixture;

            await callTransaction(projectMortgageToken.connect(borrower1).cancel(1));

            await expect(projectMortgageToken.connect(lender1).lend(1, { value: 1e9 }))
                .to.be.revertedWithCustomError(projectMortgageToken, "InvalidLending");
        });

        it('3.2.6.11. lend unsuccessfully with foreclosed mortgage', async () => {
            const fixture = await beforeProjectMortgageTokenTest({
                listSampleCurrencies: true,
                listProjectToken: true,
                listSampleMortgage: true,
            });
            const { projectMortgageToken, lender1, lender2 } = fixture;

            await callTransaction(projectMortgageToken.connect(lender1).lend(1, { value: 1e9 }));

            const due = (await projectMortgageToken.getMortgage(1)).due;
            await time.setNextBlockTimestamp(due);

            await callTransaction(projectMortgageToken.connect(lender1).foreclose(1));

            await expect(projectMortgageToken.connect(lender1).lend(1, { value: 1e9 }))
                .to.be.revertedWithCustomError(projectMortgageToken, "InvalidLending");
            await expect(projectMortgageToken.connect(lender2).lend(1, { value: 1e9 }))
                .to.be.revertedWithCustomError(projectMortgageToken, "InvalidLending");
        });

        it('3.2.6.12. lend unsuccessfully with insufficient native token', async () => {
            const fixture = await beforeProjectMortgageTokenTest({
                listSampleCurrencies: true,
                listProjectToken: true,
                listSampleMortgage: true,
            });
            const { projectMortgageToken, lender1 } = fixture;

            await expect(projectMortgageToken.connect(lender1).lend(1))
                .to.be.revertedWithCustomError(projectMortgageToken, "InsufficientValue");
        });

        it('3.2.6.13. lend unsuccessfully when native token transfer to borrower failed', async () => {
            const fixture = await beforeProjectMortgageTokenTest({
                listSampleCurrencies: true,
                listProjectToken: true,
            });
            const { projectMortgageToken, lender1, deployer, projectToken } = fixture;

            const failReceiver = await deployFailReceiver(deployer, true, false);

            await callTransaction(projectToken.mintTo(failReceiver.address, 1, 200_000));
            await callTransaction(failReceiver.call(
                projectToken.address,
                projectToken.interface.encodeFunctionData("setApprovalForAll", [projectMortgageToken.address, true])
            ));

            const data = projectMortgageToken.interface.encodeFunctionData("borrow", [1, 150_000, 10e5, 11e5, ethers.constants.AddressZero, 1000]);
            await callTransaction(failReceiver.call(projectMortgageToken.address, data));

            await expect(projectMortgageToken.connect(lender1).lend(1, { value: 1e9 }))
                .to.be.revertedWithCustomError(projectMortgageToken, "FailedTransfer");
        });

        it('3.2.6.15. buy token unsuccessfully when refund to lender failed', async () => {
            const fixture = await beforeProjectMortgageTokenTest({
                listSampleCurrencies: true,
                listProjectToken: true,
                listSampleMortgage: true,
            });
            const { projectMortgageToken, deployer } = fixture;
            const failReceiver = await deployFailReceiver(deployer, true, false);

            let data = projectMortgageToken.interface.encodeFunctionData("lend", [1]);

            await expect(failReceiver.call(projectMortgageToken.address, data, { value: 1e9 }))
                .to.be.revertedWithCustomError(projectMortgageToken, "FailedRefund");
        });

        it('3.2.6.16. buy token unsuccessfully when borrower reenter this function', async () => {
            const fixture = await beforeProjectMortgageTokenTest({
                listSampleCurrencies: true,
                listProjectToken: true,
            });
            const { projectMortgageToken, deployer, projectToken, lender1 } = fixture;

            const reentrancy = await deployReentrancyERC1155Holder(deployer);

            await callTransaction(projectToken.mintTo(reentrancy.address, 1, 100_000));

            await callTransaction(reentrancy.call(
                projectToken.address,
                projectToken.interface.encodeFunctionData("setApprovalForAll", [
                    projectMortgageToken.address,
                    true
                ])
            ));

            await callTransaction(reentrancy.call(
                projectMortgageToken.address,
                projectMortgageToken.interface.encodeFunctionData("borrow", [
                    1,
                    100_000,
                    10e5,
                    11e5,
                    ethers.constants.AddressZero,
                    1000
                ])
            ));

            const mortgageId = 1;

            await testReentrancy_projectMortgageToken(
                projectMortgageToken,
                reentrancy,
                async () => {
                    await expect(projectMortgageToken.connect(lender1).lend(mortgageId, { value: 1e9 }))
                        .to.be.revertedWithCustomError(projectMortgageToken, "FailedTransfer");
                },
            );
        });
    });

    describe('3.2.7. safeLend(uint256, uint256)', async () => {
        it('3.2.7.1. safe lend successfully', async () => {
            const fixture = await beforeProjectMortgageTokenTest({
                listSampleCurrencies: true,
                listProjectToken: true,
                listSampleMortgage: true,
            });
            const { projectMortgageToken, borrower1, borrower2 } = fixture;

            const anchor1 = (await projectMortgageToken.getMortgage(1)).principal;
            await expect(projectMortgageToken.connect(borrower2).safeLend(1, anchor1, { value: 1e9 }))
                .to.not.be.reverted;

            const anchor2 = (await projectMortgageToken.getMortgage(2)).principal;
            await expect(projectMortgageToken.connect(borrower1).safeLend(2, anchor2))
                .to.not.be.reverted;
        });

        it('3.2.7.2. safe lend unsuccessfully with invalid mortgage id', async () => {
            const fixture = await beforeProjectMortgageTokenTest({
                listSampleCurrencies: true,
                listProjectToken: true,
                listSampleMortgage: true,
            });
            const { projectMortgageToken, borrower1 } = fixture;

            await expect(projectMortgageToken.connect(borrower1).safeLend(0, 1, { value: 1e9 }))
                .to.be.revertedWithCustomError(projectMortgageToken, "InvalidMortgageId");

            await expect(projectMortgageToken.connect(borrower1).safeLend(3, 1, { value: 1e9 }))
                .to.be.revertedWithCustomError(projectMortgageToken, "InvalidMortgageId");
        });


        it('3.2.7.3. safe lend unsuccessfully with invalid anchor', async () => {
            const fixture = await beforeProjectMortgageTokenTest({
                listSampleCurrencies: true,
                listProjectToken: true,
                listSampleMortgage: true,
            });
            const { projectMortgageToken, lender1 } = fixture;

            await expect(projectMortgageToken.connect(lender1).safeLend(1, 0, { value: 1e9 }))
                .to.be.revertedWithCustomError(projectMortgageToken, "BadAnchor");

            await expect(projectMortgageToken.connect(lender1).safeLend(2, 0, { value: 1e9 }))
                .to.be.revertedWithCustomError(projectMortgageToken, "BadAnchor");
        });
    });
    
    describe('3.2.8. repay(uint256)', () => {
        it('3.2.8.1. repay successfully', async () => {
            const fixture = await beforeProjectMortgageTokenTest({
                listSampleCurrencies: true,
                listProjectToken: true,
                listSampleMortgage: true,
                listSampleLending: true,
            });
            const { projectMortgageToken, borrower1, borrower2, lender1, lender2, projectToken, currency, projectMortgageTokenOwner } = fixture;

            let currentTimestamp = await time.latest() + 10;
            await time.setNextBlockTimestamp(currentTimestamp);

            let due = (await projectMortgageToken.getMortgage(1)).due;
            let lender1NativeBalance = await ethers.provider.getBalance(lender1.address);
            let borrower1NativeBalance = await ethers.provider.getBalance(borrower1.address);
            let borrower1Balance = await projectToken.balanceOf(borrower1.address, 1);
            let projectMortgageTokenBalance = await projectToken.balanceOf(projectMortgageToken.address, 1);
            let currentTotalSupply = await projectMortgageToken.totalSupply();

            let tx = await projectMortgageToken.connect(borrower1).repay(1, { value: 1e9 });
            let receipt = await tx.wait();
            let gasFee = receipt.gasUsed.mul(receipt.effectiveGasPrice);

            await expect(tx)
                .to.emit(projectMortgageToken, 'MortgageRepayment')
                .withArgs(1);

            const mortgage1 = await projectMortgageToken.getMortgage(1);
            expect(mortgage1.state).to.equal(MortgageState.Repaid);

            expect(await projectMortgageToken.balanceOf(borrower1.address)).to.equal(0);

            expect(await projectMortgageToken.totalSupply()).to.equal(currentTotalSupply.sub(1));

            expect(await projectToken.balanceOf(borrower1.address, 1)).to.equal(borrower1Balance.add(150_000));
            expect(await projectToken.balanceOf(projectMortgageToken.address, 1)).to.equal(projectMortgageTokenBalance.sub(150_000));

            expect(await ethers.provider.getBalance(borrower1.address)).to.equal(borrower1NativeBalance.sub(gasFee).sub(11e5));
            expect(await ethers.provider.getBalance(lender1.address)).to.equal(lender1NativeBalance.add(11e5));

            await callTransaction(projectMortgageToken.connect(lender2).transferFrom(
                lender2.address,
                projectMortgageTokenOwner.address,
                2
            ));

            due = (await projectMortgageToken.getMortgage(2)).due;
            let borrower2CurrencyBalance = await currency.balanceOf(borrower2.address);
            let lender2CurrencyBalance = await currency.balanceOf(lender2.address);
            let projectMortgageTokenOwnerBalance = await currency.balanceOf(projectMortgageTokenOwner.address);
            let borrower2Balance = await projectToken.balanceOf(borrower2.address, 2);
            projectMortgageTokenBalance = await projectToken.balanceOf(projectMortgageToken.address, 2);

            tx = await projectMortgageToken.connect(borrower2).repay(2, { value: 1e9 });
            await tx.wait();

            await expect(tx)
                .to.emit(projectMortgageToken, 'MortgageRepayment')
                .withArgs(2);

            const mortgage2 = await projectMortgageToken.getMortgage(2);
            expect(mortgage2.state).to.equal(MortgageState.Repaid);

            expect(await projectMortgageToken.balanceOf(borrower2.address)).to.equal(0);
            expect(await projectMortgageToken.totalSupply()).to.equal(currentTotalSupply.sub(2));

            expect(await projectToken.balanceOf(borrower2.address, 2)).to.equal(borrower2Balance.add(200));
            expect(await projectToken.balanceOf(projectMortgageToken.address, 2)).to.equal(projectMortgageTokenBalance.sub(200));

            expect(await currency.balanceOf(borrower2.address)).to.equal(borrower2CurrencyBalance.sub(110000));
            expect(await currency.balanceOf(lender2.address)).to.equal(lender2CurrencyBalance);
            expect(await currency.balanceOf(projectMortgageTokenOwner.address)).to.equal(projectMortgageTokenOwnerBalance.add(110000));
        });

        it('3.2.8.2. repay unsuccessfully when paused', async () => {
            const fixture = await beforeProjectMortgageTokenTest({
                listSampleCurrencies: true,
                listProjectToken: true,
                listSampleMortgage: true,
                listSampleLending: true,
                pause: true,
            });
            const { projectMortgageToken, borrower1 } = fixture;

            await expect(projectMortgageToken.connect(borrower1).repay(1, { value: 1e9 }))
                .to.be.revertedWith("Pausable: paused");
        });

        it('3.2.8.3. repay unsuccessfully with invalid mortgage id', async () => {
            const fixture = await beforeProjectMortgageTokenTest({
                listSampleCurrencies: true,
                listProjectToken: true,
                listSampleMortgage: true,
                listSampleLending: true,
            });
            const { projectMortgageToken, borrower1 } = fixture;

            await expect(projectMortgageToken.connect(borrower1).repay(0))
                .to.be.revertedWithCustomError(projectMortgageToken, "InvalidMortgageId");

            await expect(projectMortgageToken.connect(borrower1).repay(3))
                .to.be.revertedWithCustomError(projectMortgageToken, "InvalidMortgageId");
        });

        it('3.2.8.4. repay unsuccessfully with overdue mortgage', async () => {
            const fixture = await beforeProjectMortgageTokenTest({
                listSampleCurrencies: true,
                listProjectToken: true,
                listSampleMortgage: true,
                listSampleLending: true,
            });
            const { projectMortgageToken, borrower1, borrower2 } = fixture;

            const due1 = (await projectMortgageToken.getMortgage(1)).due;
            await time.setNextBlockTimestamp(due1);

            await expect(projectMortgageToken.connect(borrower1).repay(1, { value: 1e9 }))
                .to.be.revertedWithCustomError(projectMortgageToken, "Overdue");

            const due2 = (await projectMortgageToken.getMortgage(2)).due;
            await time.setNextBlockTimestamp(due2);

            await expect(projectMortgageToken.connect(borrower2).repay(2))
                .to.be.revertedWithCustomError(projectMortgageToken, "Overdue");
        });

        it('3.2.8.5. repay unsuccessfully with pending mortgage', async () => {
            const fixture = await beforeProjectMortgageTokenTest({
                listSampleCurrencies: true,
                listProjectToken: true,
                listSampleMortgage: true,
            });
            const { projectMortgageToken, borrower1, borrower2 } = fixture;

            await expect(projectMortgageToken.connect(borrower1).repay(1, { value: 1e9 }))
                .to.be.revertedWithCustomError(projectMortgageToken, "InvalidRepaying");
            await expect(projectMortgageToken.connect(borrower2).repay(2))
                .to.be.revertedWithCustomError(projectMortgageToken, "InvalidRepaying");
        });

        it('3.2.8.6. repay unsuccessfully with already repaid mortgage', async () => {
            const fixture = await beforeProjectMortgageTokenTest({
                listSampleCurrencies: true,
                listProjectToken: true,
                listSampleMortgage: true,
                listSampleLending: true,
            });
            const { projectMortgageToken, borrower1, borrower2 } = fixture;

            await callTransaction(projectMortgageToken.connect(borrower1).repay(1, { value: 1e9 }));
            await callTransaction(projectMortgageToken.connect(borrower2).repay(2));

            await expect(projectMortgageToken.connect(borrower1).repay(1, { value: 1e9 }))
                .to.be.revertedWithCustomError(projectMortgageToken, "InvalidRepaying");
            await expect(projectMortgageToken.connect(borrower2).repay(2))
                .to.be.revertedWithCustomError(projectMortgageToken, "InvalidRepaying");
        });

        it('3.2.8.7. repay unsuccessfully with foreclosed mortgage', async () => {
            const fixture = await beforeProjectMortgageTokenTest({
                listSampleCurrencies: true,
                listProjectToken: true,
                listSampleMortgage: true,
                listSampleLending: true,
            });
            const { projectMortgageToken, borrower1, borrower2 } = fixture;

            const due = (await projectMortgageToken.getMortgage(2)).due;
            await time.setNextBlockTimestamp(due);

            await callTransaction(projectMortgageToken.connect(borrower1).foreclose(1));
            await callTransaction(projectMortgageToken.connect(borrower2).foreclose(2));

            await expect(projectMortgageToken.connect(borrower1).repay(1, { value: 1e9 }))
                .to.be.revertedWithCustomError(projectMortgageToken, "InvalidRepaying");
            await expect(projectMortgageToken.connect(borrower2).repay(2))
                .to.be.revertedWithCustomError(projectMortgageToken, "InvalidRepaying");
        });

        it('3.2.8.8. repay unsuccessfully with cancelled mortgage', async () => {
            const fixture = await beforeProjectMortgageTokenTest({
                listSampleCurrencies: true,
                listProjectToken: true,
                listSampleMortgage: true,
            });
            const { projectMortgageToken, borrower1, borrower2 } = fixture;

            await callTransaction(projectMortgageToken.connect(borrower1).cancel(1));
            await callTransaction(projectMortgageToken.connect(borrower2).cancel(2));

            await expect(projectMortgageToken.connect(borrower1).repay(1, { value: 1e9 }))
                .to.be.revertedWithCustomError(projectMortgageToken, "InvalidRepaying");
            await expect(projectMortgageToken.connect(borrower2).repay(2))
                .to.be.revertedWithCustomError(projectMortgageToken, "InvalidRepaying");
        });

        it('3.2.8.9. repay unsuccessfully with insufficient funds', async () => {
            const fixture = await beforeProjectMortgageTokenTest({
                listSampleCurrencies: true,
                listProjectToken: true,
                listSampleMortgage: true,
                listSampleLending: true,
            });
            const { projectMortgageToken, borrower1, borrower2, currency } = fixture;

            await expect(projectMortgageToken.connect(borrower1).repay(1))
                .to.be.revertedWithCustomError(projectMortgageToken, "InsufficientValue");

            await resetERC20(currency, [borrower2])
            await expect(projectMortgageToken.connect(borrower2).repay(2))
                .to.be.revertedWith("ERC20: transfer amount exceeds balance");
        });

        it('3.2.8.10. repay unsuccessfully native token transfer to lender failed', async () => {
            const fixture = await beforeProjectMortgageTokenTest({
                listSampleCurrencies: true,
                listProjectToken: true,
                listSampleMortgage: true,
            });
            const { projectMortgageToken, borrower1, deployer } = fixture;

            const failReceiver = await deployFailReceiver(deployer, true, false);

            const principal = (await projectMortgageToken.getMortgage(1)).principal;

            let data = projectMortgageToken.interface.encodeFunctionData("lend", [1]);
            await callTransaction(failReceiver.call(projectMortgageToken.address, data, { value: principal }));

            await expect(projectMortgageToken.connect(borrower1).repay(1, { value: 1e9 }))
                .to.be.revertedWithCustomError(projectMortgageToken, "FailedTransfer");
        });

        it('3.2.8.11. repay unsuccessfully when this contract is reentered', async () => {
            const fixture = await beforeProjectMortgageTokenTest({
                listSampleCurrencies: true,
                listProjectToken: true,
                listSampleMortgage: true,
            });
            const { projectMortgageToken, borrower1, deployer } = fixture;

            const reentrancy = await deployReentrancy(deployer);

            const principal = (await projectMortgageToken.getMortgage(1)).principal;

            let data = projectMortgageToken.interface.encodeFunctionData("lend", [1]);
            await callTransaction(reentrancy.call(projectMortgageToken.address, data, { value: principal }));

            await testReentrancy_projectMortgageToken(
                projectMortgageToken,
                reentrancy,
                async () => {
                    await expect(projectMortgageToken.connect(borrower1).repay(1, { value: 1e9 }))
                        .to.be.revertedWithCustomError(projectMortgageToken, "FailedTransfer");
                },
            );
        });
    });
    
    describe('3.2.9. safeRepay(uint256, uint256)', () => {
        it('3.2.9.1. safe repay successfully', async () => {
            const fixture = await beforeProjectMortgageTokenTest({
                listSampleCurrencies: true,
                listProjectToken: true,
                listSampleMortgage: true,
                listSampleLending: true,
            });
            const { projectMortgageToken, borrower1, borrower2 } = fixture;

            const anchor1 = (await projectMortgageToken.getMortgage(1)).repayment;
            await expect(projectMortgageToken.connect(borrower1).safeRepay(1, anchor1, { value: 1e9 }))
                .to.not.be.reverted;

            const anchor2 = (await projectMortgageToken.getMortgage(2)).repayment;
            await expect(projectMortgageToken.connect(borrower2).safeRepay(2, anchor2))
                .to.not.be.reverted;
        });

        it('3.2.9.2. safe repay unsuccessfully with invalid mortgage id', async () => {
            const fixture = await beforeProjectMortgageTokenTest({
                listSampleCurrencies: true,
                listProjectToken: true,
                listSampleMortgage: true,
                listSampleLending: true,
            });
            const { projectMortgageToken, borrower1 } = fixture;

            await expect(projectMortgageToken.connect(borrower1).safeRepay(0, 0))
                .to.be.revertedWithCustomError(projectMortgageToken, "InvalidMortgageId");

            await expect(projectMortgageToken.connect(borrower1).safeRepay(3, 3))
                .to.be.revertedWithCustomError(projectMortgageToken, "InvalidMortgageId");
        });

        it('3.2.9.3. repay unsuccessfully with invalid anchor', async () => {
            const fixture = await beforeProjectMortgageTokenTest({
                listSampleCurrencies: true,
                listProjectToken: true,
                listSampleMortgage: true,
                listSampleLending: true,
            });
            const { projectMortgageToken, borrower1 } = fixture;

            await expect(projectMortgageToken.connect(borrower1).safeRepay(1, 0))
                .to.be.revertedWithCustomError(projectMortgageToken, "BadAnchor");

            await expect(projectMortgageToken.connect(borrower1).safeRepay(2, 0))
                .to.be.revertedWithCustomError(projectMortgageToken, "BadAnchor");
        });
    });

    describe('3.2.10. foreclose(uint256)', () => {
        it('3.2.10.1. foreclose successfully', async () => {
            const fixture = await beforeProjectMortgageTokenTest({
                listSampleCurrencies: true,
                listProjectToken: true,
                listSampleMortgage: true,
                listSampleLending: true,
            });
            const { projectMortgageToken, borrower1, borrower2, lender1, lender2, projectToken, currency, projectMortgageTokenOwner } = fixture;

            let lender1Balance = await projectToken.balanceOf(lender1.address, 1);
            let mortgageContractBalance = await projectToken.balanceOf(projectMortgageToken.address, 1);
            let currentTotalSupply = await projectMortgageToken.totalSupply();

            const due1 = (await projectMortgageToken.getMortgage(1)).due;
            await time.setNextBlockTimestamp(due1);

            let tx = await projectMortgageToken.foreclose(1);
            await tx.wait();

            await expect(tx)
                .to.emit(projectMortgageToken, 'MortgageForeclosure')
                .withArgs(1, lender1.address);

            const mortgage1 = await projectMortgageToken.getMortgage(1);
            expect(mortgage1.state).to.equal(MortgageState.Foreclosed);

            expect(await projectMortgageToken.balanceOf(lender1.address)).to.equal(0);

            expect(await projectMortgageToken.totalSupply()).to.equal(currentTotalSupply.sub(1));

            expect(await projectToken.balanceOf(lender1.address, 1)).to.equal(lender1Balance.add(150_000));
            expect(await projectToken.balanceOf(projectMortgageToken.address, 1)).to.equal(mortgageContractBalance.sub(150_000));

            await callTransaction(projectMortgageToken.connect(lender2).transferFrom(
                lender2.address,
                projectMortgageTokenOwner.address,
                2
            ));

            const due2 = (await projectMortgageToken.getMortgage(2)).due;
            await time.setNextBlockTimestamp(due2);

            let lender2Balance = await projectToken.balanceOf(lender2.address, 2);
            mortgageContractBalance = await projectToken.balanceOf(projectMortgageToken.address, 2);
            let projectMortgageTokenOwnerBalance = await projectToken.balanceOf(projectMortgageTokenOwner.address, 2);

            tx = await projectMortgageToken.foreclose(2);
            await tx.wait();

            await expect(tx)
                .to.emit(projectMortgageToken, 'MortgageForeclosure')
                .withArgs(2, projectMortgageTokenOwner.address);

            const mortgage2 = await projectMortgageToken.getMortgage(2);
            expect(mortgage2.state).to.equal(MortgageState.Foreclosed);

            expect(await projectMortgageToken.balanceOf(lender2.address)).to.equal(0);

            expect(await projectMortgageToken.totalSupply()).to.equal(currentTotalSupply.sub(2));

            expect(await projectToken.balanceOf(lender2.address, 2)).to.equal(lender2Balance);
            expect(await projectToken.balanceOf(projectMortgageTokenOwner.address, 2)).to.equal(projectMortgageTokenOwnerBalance.add(200));
            expect(await projectToken.balanceOf(projectMortgageToken.address, 2)).to.equal(mortgageContractBalance.sub(200));
        });

        it('3.2.10.2. foreclose unsuccessfully when paused', async () => {
            const fixture = await beforeProjectMortgageTokenTest({
                listSampleCurrencies: true,
                listProjectToken: true,
                listSampleMortgage: true,
                listSampleLending: true,
                pause: true,
            });
            const { projectMortgageToken } = fixture;

            await expect(projectMortgageToken.foreclose(1))
                .to.be.revertedWith("Pausable: paused");
        });

        it('3.2.10.3. foreclose unsuccessfully with invalid mortgage id', async () => {
            const fixture = await beforeProjectMortgageTokenTest({
                listSampleCurrencies: true,
                listProjectToken: true,
                listSampleMortgage: true,
                listSampleLending: true,
            });
            const { projectMortgageToken } = fixture;

            await expect(projectMortgageToken.foreclose(0))
                .to.be.revertedWithCustomError(projectMortgageToken, "InvalidMortgageId");

            await expect(projectMortgageToken.foreclose(3))
                .to.be.revertedWithCustomError(projectMortgageToken, "InvalidMortgageId");
        });

        it('3.2.10.4. foreclose unsuccessfully when mortgage is not overdue', async () => {
            const fixture = await beforeProjectMortgageTokenTest({
                listSampleCurrencies: true,
                listProjectToken: true,
                listSampleMortgage: true,
                listSampleLending: true,
            });
            const { projectMortgageToken, borrower1, borrower2 } = fixture;

            await expect(projectMortgageToken.foreclose(1))
                .to.be.revertedWithCustomError(projectMortgageToken, "InvalidForeclosing");
        });

        it('3.2.10.5. foreclose unsuccessfully with pending mortgage', async () => {
            const fixture = await beforeProjectMortgageTokenTest({
                listSampleCurrencies: true,
                listProjectToken: true,
                listSampleMortgage: true,
            });
            const { projectMortgageToken } = fixture;

            await expect(projectMortgageToken.foreclose(1))
                .to.be.revertedWithCustomError(projectMortgageToken, "InvalidForeclosing");
        });

        it('3.2.10.6. foreclose unsuccessfully with repaid mortgage', async () => {
            const fixture = await beforeProjectMortgageTokenTest({
                listSampleCurrencies: true,
                listProjectToken: true,
                listSampleMortgage: true,
                listSampleLending: true,
            });
            const { projectMortgageToken, borrower1 } = fixture;

            await callTransaction(projectMortgageToken.connect(borrower1).repay(1, { value: 1e9 }));

            const due = (await projectMortgageToken.getMortgage(1)).due;
            await time.setNextBlockTimestamp(due);

            await expect(projectMortgageToken.foreclose(1))
                .to.be.revertedWithCustomError(projectMortgageToken, "InvalidForeclosing");
        });

        it('3.2.10.7. foreclose unsuccessfully with foreclosed mortgage', async () => {
            const fixture = await beforeProjectMortgageTokenTest({
                listSampleCurrencies: true,
                listProjectToken: true,
                listSampleMortgage: true,
                listSampleLending: true,
            });
            const { projectMortgageToken, lender1 } = fixture;

            const due = (await projectMortgageToken.getMortgage(1)).due;
            await time.setNextBlockTimestamp(due);

            await callTransaction(projectMortgageToken.connect(lender1).foreclose(1));

            await expect(projectMortgageToken.foreclose(1))
                .to.be.revertedWithCustomError(projectMortgageToken, "InvalidForeclosing");
        });

        it('3.2.10.8. foreclose unsuccessfully with cancelled mortgage', async () => {
            const fixture = await beforeProjectMortgageTokenTest({
                listSampleCurrencies: true,
                listProjectToken: true,
                listSampleMortgage: true,
            });
            const { projectMortgageToken, borrower1 } = fixture;

            await callTransaction(projectMortgageToken.connect(borrower1).cancel(1));

            await expect(projectMortgageToken.foreclose(1))
                .to.be.revertedWithCustomError(projectMortgageToken, "InvalidForeclosing");
        });
    });

    describe('3.2.11. royaltyInfo(uint256, uint256)', () => {
        it('3.2.11.1. return correct royalty info', async () => {
            const fixture = await beforeProjectMortgageTokenTest({
                listSampleCurrencies: true,
                listProjectToken: true,
                listSampleMortgage: true,
                listSampleLending: true,
            });
            const { projectMortgageToken, feeReceiver, projectToken, admin, admins, zone1, zone2 } = fixture;

            const zone1RoyaltyRate = ethers.utils.parseEther('0.1');
            const zone2RoyaltyRate = ethers.utils.parseEther('0.2');
            
            await callProjectToken_UpdateZoneRoyaltyRate(
                projectToken,
                admins,
                zone1,
                zone1RoyaltyRate,
                await admin.nonce(),
            );
            
            await callProjectToken_UpdateZoneRoyaltyRate(
                projectToken,
                admins,
                zone2,
                zone2RoyaltyRate,
                await admin.nonce(),
            );

            const salePrice = ethers.BigNumber.from(1e6);
            
            const royaltyInfo1 = await projectMortgageToken.royaltyInfo(1, salePrice);
            const royaltyFee1 = salePrice.mul(zone1RoyaltyRate).div(Constant.COMMON_RATE_MAX_FRACTION);
            expect(royaltyInfo1[0]).to.equal(feeReceiver.address);
            expect(royaltyInfo1[1]).to.equal(royaltyFee1);

            const royaltyInfo2 = await projectMortgageToken.royaltyInfo(2, salePrice);
            const royaltyFee2 = salePrice.mul(zone2RoyaltyRate).div(Constant.COMMON_RATE_MAX_FRACTION);
            expect(royaltyInfo2[0]).to.equal(feeReceiver.address);
            expect(royaltyInfo2[1]).to.equal(royaltyFee2);
        });

        it('3.2.11.2. revert with invalid token id', async () => {
            const fixture = await beforeProjectMortgageTokenTest({
                listSampleCurrencies: true,
                listProjectToken: true,
                listSampleMortgage: true,
            });
            const { projectMortgageToken } = fixture;

            const salePrice = ethers.utils.parseEther('10');

            await expect(projectMortgageToken.royaltyInfo(0, salePrice))
                .to.be.revertedWith("ERC721: invalid token ID");
            await expect(projectMortgageToken.royaltyInfo(100, salePrice))
                .to.be.revertedWith("ERC721: invalid token ID");

            await expect(projectMortgageToken.royaltyInfo(1, salePrice))
                .to.be.revertedWith("ERC721: invalid token ID");
            await expect(projectMortgageToken.royaltyInfo(2, salePrice))
                .to.be.revertedWith("ERC721: invalid token ID");
        });
    });

    describe('3.2.13. supportsInterface(bytes4)', () => {
        it('3.2.13.1. return true for appropriate interface', async () => {
            const fixture = await beforeProjectMortgageTokenTest();
            const { projectMortgageToken } = fixture;

            const ICommon = ICommon__factory.createInterface();
            const IERC165Upgradeable = IERC165Upgradeable__factory.createInterface();
            const IERC2981Upgradeable = IERC2981Upgradeable__factory.createInterface();
            const IERC1155ReceiverUpgradeable = IERC1155ReceiverUpgradeable__factory.createInterface();
            const IProjectTokenReceiver = IProjectTokenReceiver__factory.createInterface();
            const IERC721Upgradeable = IERC721Upgradeable__factory.createInterface();
            const IERC721MetadataUpgradeable = IERC721MetadataUpgradeable__factory.createInterface();
            const IERC4906Upgradeable = IERC4906Upgradeable__factory.createInterface();
            const IMortgageToken = IMortgageToken__factory.createInterface();
            
            const IERC165UpgradeableInterfaceId = getInterfaceID(IERC165Upgradeable, []);
            const IProjectTokenReceiverInterfaceId = getInterfaceID(IProjectTokenReceiver, [IERC1155ReceiverUpgradeable]);
            const IERC721MetadataUpgradeableInterfaceId = getInterfaceID(IERC721MetadataUpgradeable, [IERC721Upgradeable]);
            const IMortgageTokenInterfaceId = getInterfaceID(IMortgageToken, [ICommon, IERC721MetadataUpgradeable, IERC2981Upgradeable, IERC4906Upgradeable]);
            const IERC2981UpgradeableInterfaceId = getInterfaceID(IERC2981Upgradeable, [IERC165Upgradeable]);

            expect(await projectMortgageToken.supportsInterface(getBytes4Hex(IERC165UpgradeableInterfaceId))).to.equal(true);
            expect(await projectMortgageToken.supportsInterface(getBytes4Hex(IProjectTokenReceiverInterfaceId))).to.equal(true);
            expect(await projectMortgageToken.supportsInterface(getBytes4Hex(IERC721MetadataUpgradeableInterfaceId))).to.equal(true);
            expect(await projectMortgageToken.supportsInterface(getBytes4Hex(IMortgageTokenInterfaceId))).to.equal(true);
            expect(await projectMortgageToken.supportsInterface(getBytes4Hex(IERC2981UpgradeableInterfaceId))).to.equal(true);
        });
    });
});
