import { expect } from 'chai';
import { BigNumber, Contract } from 'ethers';
import { ethers, upgrades } from 'hardhat';

// @defi-wonderland/smock
import { MockContract, smock } from '@defi-wonderland/smock';

// @nomicfoundation/hardhat-network-helpers
import { loadFixture, time } from '@nomicfoundation/hardhat-network-helpers';

// @tests
import {
    IERC165UpgradeableInterfaceId,
    IERC721MetadataUpgradeableInterfaceId,
    IERC2981UpgradeableInterfaceId,
    IAssetMortgageTokenInterfaceId,
    IMortgageTokenInterfaceId,
    IProjectTokenReceiverInterfaceId,
} from '@tests/interfaces';
import { Constant } from '@tests/test.constant';

// @tests/launch
import { Initialization as LaunchInitialization } from '@tests/launch/test.initialization';

// @tests/land
import { Initialization as LandInitialization } from '@tests/land/test.initialization';

// @tests/lend
import { Initialization as LendInitialization } from '@tests/lend/test.initialization';

// @typechain-types
import {
    Admin,
    Currency,
    FeeReceiver,
    MockProjectToken,
    ProjectMortgageToken,
    PriceWatcher,
    ReserveVault,
    MockPrestigePad__factory,
    MockPrestigePad,
} from '@typechain-types';

// @utils
import {
    callTransaction,
    expectRevertWithModifierCustomError,
    getBalance,
    prepareERC20,
    prepareNativeToken,
    resetERC20,
    resetNativeToken,
    testReentrancy,
} from '@utils/blockchain';
import { applyDiscount, scaleRate } from '@utils/formula';
import { MockValidator } from '@utils/mockValidator';
import { getBytes4Hex, randomBigNumber, structToObject } from '@utils/utils';

// @utils/deployments/common
import { deployAdmin } from '@utils/deployments/common/admin';
import { deployCurrency } from '@utils/deployments/common/currency';
import { deployFeeReceiver } from '@utils/deployments/common/feeReceiver';
import { deployPriceWatcher } from '@utils/deployments/common/priceWatcher';
import { deployReserveVault } from '@utils/deployments/common/reserveVault';

// @utils/deployments/mock
import { deployFailReceiver } from '@utils/deployments/mock/utilities/failReceiver';
import { deployReentrancyReceiver } from '@utils/deployments/mock/reentrancy/reentrancyReceiver';

// @utils/deployments/lend
import { deployProjectMortgageToken } from '@utils/deployments/lend/projectMortgageToken';

// @utils/models/lend
import {
    MortgageState,
    UpdateBaseURIParams,
    UpdateBaseURIParamsInput,
    UpdateFeeRateParams,
    UpdateFeeRateParamsInput,
} from '@utils/models/lend/mortgageToken';
import { ProjectBorrowParams } from '@utils/models/lend/projectMortgageToken';

// @utils/signatures/lend
import { getUpdateBaseURISignatures, getUpdateFeeRateSignatures } from '@utils/signatures/lend/mortgageToken';

// @utils/transaction/common
import {
    getAdminTxByInput_ActivateIn,
    getAdminTxByInput_AuthorizeManagers,
    getAdminTxByInput_AuthorizeModerators,
    getAdminTxByInput_DeclareZone,
    getAdminTxByInput_UpdateCurrencyRegistries,
} from '@utils/transaction/common/admin';
import { getPausableTxByInput_Pause } from '@utils/transaction/common/pausable';

// @utils/transaction/lend
import {
    getMortgageTokenTx_Cancel,
    getMortgageTokenTx_Foreclose,
    getMortgageTokenTx_Lend,
    getMortgageTokenTx_Repay,
    getMortgageTokenTx_SafeLend,
    getMortgageTokenTxByParams_SafeLend,
    getMortgageTokenTx_SafeRepay,
    getMortgageTokenTxByParams_SafeRepay,
    getMortgageTokenTx_UpdateBaseURI,
    getMortgageTokenTx_UpdateFeeRate,
    getMortgageTokenTxByInput_UpdateFeeRate,
} from '@utils/transaction/lend/mortgageToken';
import { getProjectMortgageTokenTx_Borrow } from '@utils/transaction/lend/projectMortgageToken';

// @utils/transaction/launch
import {
    getProjectTokenTxByInput_AuthorizeLaunchpad,
    getCallProjectTokenTx_LaunchProject,
    getProjectTokenTxByInput_RegisterInitiator,
    getProjectTokenTxByInput_UpdateBaseURI,
    getProjectTokenTxByInput_UpdateZoneRoyaltyRate,
} from '@utils/transaction/launch/projectToken';

async function testReentrancy_projectMortgageToken(
    projectMortgageToken: ProjectMortgageToken,
    reentrancyContract: Contract,
    assertion: any
) {
    let data = [
        projectMortgageToken.interface.encodeFunctionData('lend', [0]),
        projectMortgageToken.interface.encodeFunctionData('repay', [0]),
        projectMortgageToken.interface.encodeFunctionData('safeLend', [0, 0]),
        projectMortgageToken.interface.encodeFunctionData('safeRepay', [0, 0]),
        projectMortgageToken.interface.encodeFunctionData('foreclose', [0]),
    ];

    await testReentrancy(reentrancyContract, projectMortgageToken, data, assertion);
}

interface ProjectMortgageTokenFixture {
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
    user: any;
    projectMortgageTokenOwner: any;
    validator: MockValidator;

    admin: Admin;
    currency: Currency;
    feeReceiver: FeeReceiver;
    priceWatcher: PriceWatcher;
    reserveVault: ReserveVault;
    projectToken: MockContract<MockProjectToken>;
    prestigePad: MockContract<MockPrestigePad>;
    projectMortgageToken: ProjectMortgageToken;

    zone1: string;
    zone2: string;
}

describe('3.3. ProjectMortgageToken', async () => {
    async function projectMortgageTokenFixture(): Promise<ProjectMortgageTokenFixture> {
        const [
            deployer,
            admin1,
            admin2,
            admin3,
            admin4,
            admin5,
            lender1,
            lender2,
            borrower1,
            borrower2,
            manager,
            moderator,
            user,
            projectMortgageTokenOwner,
            initiator1,
            initiator2,
        ] = await ethers.getSigners();
        const admins = [admin1, admin2, admin3, admin4, admin5];
        const validator = new MockValidator(deployer as any);

        const currency = (await deployCurrency(deployer.address, 'MockCurrency', 'MCK')) as Currency;

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

        await callTransaction(
            currency.setExclusiveDiscount(ethers.utils.parseEther('0.3'), Constant.COMMON_RATE_DECIMALS)
        );

        const MockEstateTokenFactory = (await smock.mock('MockEstateToken')) as any;
        const estateToken = await MockEstateTokenFactory.deploy();
        await callTransaction(
            estateToken.initialize(
                admin.address,
                feeReceiver.address,
                validator.getAddress(),
                LandInitialization.ESTATE_TOKEN_BaseURI
            )
        );

        const MockProjectTokenFactory = (await smock.mock('MockProjectToken')) as any;
        const projectToken = await MockProjectTokenFactory.deploy();
        await callTransaction(
            projectToken.initialize(
                admin.address,
                estateToken.address,
                feeReceiver.address,
                validator.getAddress(),
                LaunchInitialization.PROJECT_TOKEN_BaseURI
            )
        );

        const MockPrestigePadFactory = await smock.mock<MockPrestigePad__factory>('MockPrestigePad');
        const prestigePad = await MockPrestigePadFactory.deploy();
        await callTransaction(
            prestigePad.initialize(
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

        const projectMortgageToken = (await deployProjectMortgageToken(
            deployer.address,
            admin.address,
            projectToken.address,
            feeReceiver.address,
            LendInitialization.PROJECT_MORTGAGE_TOKEN_Name,
            LendInitialization.PROJECT_MORTGAGE_TOKEN_Symbol,
            LendInitialization.PROJECT_MORTGAGE_TOKEN_BaseURI,
            LendInitialization.PROJECT_MORTGAGE_TOKEN_FeeRate
        )) as ProjectMortgageToken;

        const zone1 = ethers.utils.formatBytes32String('TestZone1');
        const zone2 = ethers.utils.formatBytes32String('TestZone2');

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
            user,
            lender1,
            lender2,
            borrower1,
            borrower2,
            initiator1,
            initiator2,
            projectMortgageTokenOwner,
            zone1,
            zone2,
        };
    }

    async function beforeProjectMortgageTokenTest({
        skipSetApprovalForAll = false,
        skipListSampleCurrencies = false,
        skipListProjectToken = false,
        listSampleMortgage = false,
        listSampleLending = false,
        pause = false,
    } = {}): Promise<ProjectMortgageTokenFixture> {
        const fixture = await loadFixture(projectMortgageTokenFixture);

        const {
            deployer,
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
            zone2,
        } = fixture;

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

        for (const zone of [zone1, zone2]) {
            await callTransaction(getAdminTxByInput_DeclareZone(admin, deployer, { zone }, admins));
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

        for (const zone of [zone1, zone2]) {
            for (const initiator of [initiator1, initiator2]) {
                await callTransaction(
                    getProjectTokenTxByInput_RegisterInitiator(
                        projectToken as any,
                        manager,
                        {
                            zone,
                            initiator: initiator.address,
                            uri: 'TestURI',
                        },
                        validator
                    )
                );
            }
        }

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

        if (!skipListProjectToken) {
            currentTimestamp += 1000;

            await time.setNextBlockTimestamp(currentTimestamp);

            await callTransaction(
                getCallProjectTokenTx_LaunchProject(projectToken as any, prestigePad, {
                    zone: zone1,
                    launchId: BigNumber.from(10),
                    uri: 'Token1_URI',
                    initiator: initiator1.address,
                })
            );
            await callTransaction(
                getCallProjectTokenTx_LaunchProject(projectToken as any, prestigePad, {
                    zone: zone2,
                    launchId: BigNumber.from(10),
                    uri: 'Token2_URI',
                    initiator: initiator2.address,
                })
            );

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
            await callTransaction(
                getProjectMortgageTokenTx_Borrow(projectMortgageToken, borrower1, {
                    projectId: BigNumber.from(1),
                    amount: BigNumber.from(150_000),
                    principal: BigNumber.from(10e5),
                    repayment: BigNumber.from(11e5),
                    currency: ethers.constants.AddressZero,
                    duration: 1000,
                })
            );
            await callTransaction(
                projectToken.connect(borrower1).setApprovalForAll(projectMortgageToken.address, true)
            );

            await callTransaction(
                getProjectMortgageTokenTx_Borrow(projectMortgageToken, borrower2, {
                    projectId: BigNumber.from(2),
                    amount: BigNumber.from(200),
                    principal: BigNumber.from(100000),
                    repayment: BigNumber.from(110000),
                    currency: currency.address,
                    duration: 1000,
                })
            );
            await callTransaction(
                projectToken.connect(borrower2).setApprovalForAll(projectMortgageToken.address, true)
            );

            await prepareERC20(currency, [borrower1, borrower2, lender1, lender2], [projectMortgageToken], 1e9);
        }

        if (listSampleLending) {
            currentTimestamp += 100;
            await time.setNextBlockTimestamp(currentTimestamp);
            await callTransaction(
                getMortgageTokenTx_Lend(
                    projectMortgageToken,
                    lender1,
                    { mortgageId: BigNumber.from(1) },
                    { value: 1e9 }
                )
            );

            currentTimestamp += 100;
            await time.setNextBlockTimestamp(currentTimestamp);
            await callTransaction(
                getMortgageTokenTx_Lend(projectMortgageToken, lender2, {
                    mortgageId: BigNumber.from(2),
                })
            );
        }

        if (pause) {
            await callTransaction(getPausableTxByInput_Pause(projectMortgageToken, deployer, admin, admins));
        }

        return {
            ...fixture,
        };
    }

    /* --- Initialization --- */
    describe('3.3.1. initialize(address,address,address,string,string,string,uint256)', async () => {
        it('3.3.1.1. Deploy successfully', async () => {
            const { admin, projectToken, feeReceiver, projectMortgageToken } = await beforeProjectMortgageTokenTest();

            const tx = projectMortgageToken.deployTransaction;
            await expect(tx)
                .to.emit(projectMortgageToken, 'BaseURIUpdate')
                .withArgs(LendInitialization.PROJECT_MORTGAGE_TOKEN_BaseURI);
            await expect(tx)
                .to.emit(projectMortgageToken, 'FeeRateUpdate')
                .withArgs((rate: any) => {
                    expect(structToObject(rate)).to.deep.equal({
                        value: LendInitialization.PROJECT_MORTGAGE_TOKEN_FeeRate,
                        decimals: Constant.COMMON_RATE_DECIMALS,
                    });
                    return true;
                });

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

        it('3.3.1.2. Deploy unsuccessfully with invalid fee rate', async () => {
            const { deployer, admin, projectToken, feeReceiver } = await beforeProjectMortgageTokenTest();

            const ProjectMortgageToken = await ethers.getContractFactory('ProjectMortgageToken', deployer);

            await expect(
                upgrades.deployProxy(ProjectMortgageToken, [
                    admin.address,
                    projectToken.address,
                    feeReceiver.address,
                    LendInitialization.PROJECT_MORTGAGE_TOKEN_Name,
                    LendInitialization.PROJECT_MORTGAGE_TOKEN_Symbol,
                    LendInitialization.PROJECT_MORTGAGE_TOKEN_BaseURI,
                    Constant.COMMON_RATE_MAX_FRACTION.add(1),
                ])
            ).to.be.reverted;
        });
    });

    /* --- Administration --- */
    describe('3.3.2. updateBaseURI(string,bytes[])', async () => {
        it('3.1.2.1. Update base URI successfully with valid signatures', async () => {
            const { deployer, projectMortgageToken, admin, admins } = await beforeProjectMortgageTokenTest({
                listSampleMortgage: true,
                listSampleLending: true,
            });

            const paramsInput: UpdateBaseURIParamsInput = {
                uri: 'NewBaseURI:',
            };
            const tx = await getProjectTokenTxByInput_UpdateBaseURI(
                projectMortgageToken as any,
                deployer,
                paramsInput,
                admin,
                admins
            );
            await tx.wait();

            await expect(tx).to.emit(projectMortgageToken, 'BaseURIUpdate').withArgs('NewBaseURI:');

            expect(await projectMortgageToken.tokenURI(1)).to.equal('NewBaseURI:1');
            expect(await projectMortgageToken.tokenURI(2)).to.equal('NewBaseURI:2');
        });

        it('3.1.2.2. Update base URI unsuccessfully with invalid signatures', async () => {
            const { deployer, projectMortgageToken, admin, admins } = await beforeProjectMortgageTokenTest();

            const paramsInput: UpdateBaseURIParamsInput = {
                uri: 'NewBaseURI:',
            };
            const params: UpdateBaseURIParams = {
                ...paramsInput,
                signatures: await getUpdateBaseURISignatures(
                    projectMortgageToken as any,
                    paramsInput,
                    admin,
                    admins,
                    false
                ),
            };
            await expect(
                getMortgageTokenTx_UpdateBaseURI(projectMortgageToken as any, deployer, params)
            ).to.be.revertedWithCustomError(admin, 'FailedVerification');
        });
    });

    describe('3.3.3. updateFeeRate(uint256,bytes[])', async () => {
        it('3.3.3.1. Update fee rate successfully with valid signatures', async () => {
            const { deployer, projectMortgageToken, admin, admins } = await beforeProjectMortgageTokenTest();

            const paramsInput: UpdateFeeRateParamsInput = {
                feeRate: ethers.utils.parseEther('0.2'),
            };
            const tx = await getMortgageTokenTxByInput_UpdateFeeRate(
                projectMortgageToken as any,
                deployer,
                paramsInput,
                admin,
                admins
            );
            await tx.wait();

            await expect(tx)
                .to.emit(projectMortgageToken, 'FeeRateUpdate')
                .withArgs((rate: any) => {
                    expect(structToObject(rate)).to.deep.equal({
                        value: paramsInput.feeRate,
                        decimals: Constant.COMMON_RATE_DECIMALS,
                    });
                    return true;
                });

            const feeRate = await projectMortgageToken.getFeeRate();
            expect(structToObject(feeRate)).to.deep.equal({
                value: paramsInput.feeRate,
                decimals: Constant.COMMON_RATE_DECIMALS,
            });
        });

        it('3.3.3.2. Update fee rate unsuccessfully with invalid signatures', async () => {
            const { deployer, projectMortgageToken, admin, admins } = await beforeProjectMortgageTokenTest();

            const paramsInput: UpdateFeeRateParamsInput = {
                feeRate: ethers.utils.parseEther('0.2'),
            };
            const params: UpdateFeeRateParams = {
                ...paramsInput,
                signatures: await getUpdateFeeRateSignatures(
                    projectMortgageToken as any,
                    paramsInput,
                    admin,
                    admins,
                    false
                ),
            };
            await expect(
                getMortgageTokenTx_UpdateFeeRate(projectMortgageToken as any, deployer, params)
            ).to.be.revertedWithCustomError(admin, 'FailedVerification');
        });

        it('3.3.3.3. Update fee rate unsuccessfully with invalid rate', async () => {
            const { deployer, projectMortgageToken, admin, admins } = await beforeProjectMortgageTokenTest();

            const paramsInput: UpdateFeeRateParamsInput = {
                feeRate: Constant.COMMON_RATE_MAX_FRACTION.add(1),
            };
            await expect(
                getMortgageTokenTxByInput_UpdateFeeRate(
                    projectMortgageToken as any,
                    deployer,
                    paramsInput,
                    admin,
                    admins
                )
            ).to.be.revertedWithCustomError(projectMortgageToken, 'InvalidRate');
        });
    });

    /* --- Query --- */
    describe('3.3.4. getMortgage(uint256)', () => {
        it('3.3.4.1. Revert with invalid mortgage id', async () => {
            const fixture = await beforeProjectMortgageTokenTest({
                listSampleMortgage: true,
            });

            const { projectMortgageToken } = fixture;

            await expectRevertWithModifierCustomError(
                projectMortgageToken,
                projectMortgageToken.getMortgage(0),
                'InvalidMortgageId'
            );
            await expectRevertWithModifierCustomError(
                projectMortgageToken,
                projectMortgageToken.getMortgage(100),
                'InvalidMortgageId'
            );
        });
    });

    describe('3.3.5. getCollateral(uint256)', () => {
        it('3.3.5.1. Revert with invalid mortgage id', async () => {
            const fixture = await beforeProjectMortgageTokenTest({
                listSampleMortgage: true,
            });

            const { projectMortgageToken } = fixture;

            await expectRevertWithModifierCustomError(
                projectMortgageToken,
                projectMortgageToken.getCollateral(0),
                'InvalidMortgageId'
            );
            await expectRevertWithModifierCustomError(
                projectMortgageToken,
                projectMortgageToken.getCollateral(100),
                'InvalidMortgageId'
            );
        });
    });

    describe('3.3.6. royaltyInfo(uint256,uint256)', () => {
        it('3.3.6.1. Return correct royalty info', async () => {
            const fixture = await beforeProjectMortgageTokenTest({
                listSampleMortgage: true,
                listSampleLending: true,
            });
            const { deployer, projectMortgageToken, feeReceiver, projectToken, admin, admins, zone1, zone2 } = fixture;

            const zone1RoyaltyRate = ethers.utils.parseEther('0.1');
            const zone2RoyaltyRate = ethers.utils.parseEther('0.2');

            await callTransaction(
                getProjectTokenTxByInput_UpdateZoneRoyaltyRate(
                    projectToken as any,
                    deployer,
                    {
                        zone: zone1,
                        royaltyRate: zone1RoyaltyRate,
                    },
                    admin,
                    admins
                )
            );

            await callTransaction(
                getProjectTokenTxByInput_UpdateZoneRoyaltyRate(
                    projectToken as any,
                    deployer,
                    {
                        zone: zone2,
                        royaltyRate: zone2RoyaltyRate,
                    },
                    admin,
                    admins
                )
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

        it('3.3.6.2. Revert with invalid token id', async () => {
            const fixture = await beforeProjectMortgageTokenTest({
                listSampleMortgage: true,
            });
            const { projectMortgageToken } = fixture;

            const salePrice = ethers.utils.parseEther('10');

            await expect(projectMortgageToken.royaltyInfo(0, salePrice)).to.be.revertedWith('ERC721: invalid token ID');
            await expect(projectMortgageToken.royaltyInfo(100, salePrice)).to.be.revertedWith(
                'ERC721: invalid token ID'
            );

            await expect(projectMortgageToken.royaltyInfo(1, salePrice)).to.be.revertedWith('ERC721: invalid token ID');
            await expect(projectMortgageToken.royaltyInfo(2, salePrice)).to.be.revertedWith('ERC721: invalid token ID');
        });
    });

    describe('3.3.7. supportsInterface(bytes4)', () => {
        it('3.3.7.1. Return true for appropriate interface', async () => {
            const fixture = await beforeProjectMortgageTokenTest();
            const { projectMortgageToken } = fixture;

            expect(await projectMortgageToken.supportsInterface(getBytes4Hex(IAssetMortgageTokenInterfaceId))).to.equal(true);
            expect(await projectMortgageToken.supportsInterface(getBytes4Hex(IMortgageTokenInterfaceId))).to.equal(
                true
            );
            expect(
                await projectMortgageToken.supportsInterface(getBytes4Hex(IProjectTokenReceiverInterfaceId))
            ).to.equal(true);

            expect(await projectMortgageToken.supportsInterface(getBytes4Hex(IERC165UpgradeableInterfaceId))).to.equal(
                true
            );
            expect(
                await projectMortgageToken.supportsInterface(getBytes4Hex(IERC721MetadataUpgradeableInterfaceId))
            ).to.equal(true);
            expect(await projectMortgageToken.supportsInterface(getBytes4Hex(IERC2981UpgradeableInterfaceId))).to.equal(
                true
            );
        });
    });

    /* --- Command --- */
    describe('3.3.8. borrow(uint256,uint256,uint256,uint256,address,uint40)', async () => {
        async function beforeBorrowTest(
            fixture: ProjectMortgageTokenFixture
        ): Promise<{ defaultParams: ProjectBorrowParams }> {
            return {
                defaultParams: {
                    projectId: BigNumber.from(1),
                    amount: BigNumber.from(150_000),
                    principal: BigNumber.from(10e5),
                    repayment: BigNumber.from(11e5),
                    currency: ethers.constants.AddressZero,
                    duration: 1000,
                },
            };
        }

        it('3.3.8.1. Create mortgage successfully', async () => {
            const fixture = await beforeProjectMortgageTokenTest();
            const { projectMortgageToken, admin, borrower1, borrower2, currency, projectToken } = fixture;

            const params1: ProjectBorrowParams = {
                projectId: BigNumber.from(1),
                amount: BigNumber.from(150_000),
                principal: BigNumber.from(10e5),
                repayment: BigNumber.from(11e5),
                currency: ethers.constants.AddressZero,
                duration: 1000,
            };

            let initBorrower1Project1Balance = await projectToken.balanceOf(borrower1.address, 1);
            let initProjectMortgageTokenProject1Balance = await projectToken.balanceOf(projectMortgageToken.address, 1);

            const tx1 = await getProjectMortgageTokenTx_Borrow(projectMortgageToken, borrower1, params1);
            await tx1.wait();

            const mortgage1 = await projectMortgageToken.getMortgage(1);
            const fee1 = scaleRate(mortgage1.principal, await projectMortgageToken.getFeeRate());

            await expect(tx1)
                .to.emit(projectMortgageToken, 'NewMortgage')
                .withArgs(
                    1,
                    borrower1.address,
                    params1.principal,
                    params1.repayment,
                    fee1,
                    params1.currency,
                    params1.duration
                );
            await expect(tx1)
                .to.emit(projectMortgageToken, 'NewCollateral')
                .withArgs(1, params1.projectId, params1.amount);

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

            expect(await projectToken.balanceOf(borrower1.address, 1)).to.equal(
                initBorrower1Project1Balance.sub(params1.amount)
            );
            expect(await projectToken.balanceOf(projectMortgageToken.address, 1)).to.equal(
                initProjectMortgageTokenProject1Balance.add(params1.amount)
            );

            const params2: ProjectBorrowParams = {
                projectId: BigNumber.from(2),
                amount: BigNumber.from(200),
                principal: BigNumber.from(100000),
                repayment: BigNumber.from(110000),
                currency: currency.address,
                duration: 1000,
            };

            let initBorrower2Project2Balance = await projectToken.balanceOf(borrower2.address, 2);
            let initProjectMortgageTokenProject2Balance = await projectToken.balanceOf(projectMortgageToken.address, 2);

            const tx2 = await getProjectMortgageTokenTx_Borrow(projectMortgageToken, borrower2, params2);
            await tx2.wait();

            const mortgage2 = await projectMortgageToken.getMortgage(2);
            const fee2 = await applyDiscount(
                admin,
                scaleRate(mortgage2.principal, await projectMortgageToken.getFeeRate()),
                currency
            );

            await expect(tx2)
                .to.emit(projectMortgageToken, 'NewMortgage')
                .withArgs(
                    2,
                    borrower2.address,
                    params2.principal,
                    params2.repayment,
                    fee2,
                    params2.currency,
                    params2.duration
                );
            await expect(tx2)
                .to.emit(projectMortgageToken, 'NewCollateral')
                .withArgs(2, params2.projectId, params2.amount);

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

            expect(await projectToken.balanceOf(borrower2.address, 2)).to.equal(
                initBorrower2Project2Balance.sub(params2.amount)
            );
            expect(await projectToken.balanceOf(projectMortgageToken.address, 2)).to.equal(
                initProjectMortgageTokenProject2Balance.add(params2.amount)
            );
        });

        it('3.3.8.2. Create mortgage unsuccessfully when paused', async () => {
            const fixture = await beforeProjectMortgageTokenTest({
                pause: true,
            });
            const { projectMortgageToken, borrower1 } = fixture;

            const { defaultParams } = await beforeBorrowTest(fixture);

            await expect(
                getProjectMortgageTokenTx_Borrow(projectMortgageToken, borrower1, defaultParams)
            ).to.be.revertedWith('Pausable: paused');
        });

        it('3.3.8.3. Create mortgage unsuccessfully with invalid project id', async () => {
            const fixture = await beforeProjectMortgageTokenTest();
            const { projectMortgageToken, projectToken, borrower1 } = fixture;

            const { defaultParams } = await beforeBorrowTest(fixture);

            await expect(
                getProjectMortgageTokenTx_Borrow(projectMortgageToken, borrower1, {
                    ...defaultParams,
                    projectId: BigNumber.from(0),
                })
            ).to.be.revertedWithCustomError(projectMortgageToken, 'InvalidTokenId');

            await expect(
                getProjectMortgageTokenTx_Borrow(projectMortgageToken, borrower1, {
                    ...defaultParams,
                    projectId: BigNumber.from(3),
                })
            ).to.be.revertedWithCustomError(projectMortgageToken, 'InvalidTokenId');

            projectToken.isAvailable.whenCalledWith(1).returns(false);

            await expect(
                getProjectMortgageTokenTx_Borrow(projectMortgageToken, borrower1, {
                    ...defaultParams,
                    projectId: BigNumber.from(1),
                })
            ).to.be.revertedWithCustomError(projectMortgageToken, 'InvalidTokenId');
        });

        it('3.3.8.4. Create mortgage unsuccessfully with invalid currency', async () => {
            const fixture = await beforeProjectMortgageTokenTest({
                skipListSampleCurrencies: true,
            });
            const { projectMortgageToken, borrower1 } = fixture;
            const { defaultParams } = await beforeBorrowTest(fixture);

            await expect(
                getProjectMortgageTokenTx_Borrow(projectMortgageToken, borrower1, defaultParams)
            ).to.be.revertedWithCustomError(projectMortgageToken, 'InvalidCurrency');
        });

        it('3.3.8.5. Create mortgage unsuccessfully with zero amount', async () => {
            const fixture = await beforeProjectMortgageTokenTest();
            const { projectMortgageToken, borrower1 } = fixture;
            const { defaultParams } = await beforeBorrowTest(fixture);

            await expect(
                getProjectMortgageTokenTx_Borrow(projectMortgageToken, borrower1, {
                    ...defaultParams,
                    amount: BigNumber.from(0),
                })
            ).to.be.revertedWithCustomError(projectMortgageToken, 'InvalidInput');
        });

        it('3.3.8.6. Create mortgage unsuccessfully with amount more than balance', async () => {
            const fixture = await beforeProjectMortgageTokenTest();
            const { projectMortgageToken, projectToken, borrower1 } = fixture;
            const { defaultParams } = await beforeBorrowTest(fixture);

            const borrowerBalance = await projectToken.balanceOf(borrower1.address, defaultParams.projectId);

            await expect(
                getProjectMortgageTokenTx_Borrow(projectMortgageToken, borrower1, {
                    ...defaultParams,
                    amount: borrowerBalance.add(1),
                })
            ).to.be.revertedWithCustomError(projectMortgageToken, 'InvalidCollateral');
        });

        it('3.3.8.7. Create mortgage unsuccessfully with invalid principal', async () => {
            const fixture = await beforeProjectMortgageTokenTest();
            const { projectMortgageToken, borrower1 } = fixture;
            const { defaultParams } = await beforeBorrowTest(fixture);

            await expect(
                getProjectMortgageTokenTx_Borrow(projectMortgageToken, borrower1, {
                    ...defaultParams,
                    principal: BigNumber.from(0),
                })
            ).to.be.revertedWithCustomError(projectMortgageToken, 'InvalidPrincipal');
        });

        it('3.3.8.8. Create mortgage unsuccessfully with invalid repayment', async () => {
            const fixture = await beforeProjectMortgageTokenTest();
            const { projectMortgageToken, borrower1 } = fixture;
            const { defaultParams } = await beforeBorrowTest(fixture);

            await expect(
                getProjectMortgageTokenTx_Borrow(projectMortgageToken, borrower1, {
                    ...defaultParams,
                    repayment: defaultParams.principal.sub(1),
                })
            ).to.be.revertedWithCustomError(projectMortgageToken, 'InvalidRepayment');
        });
    });

    describe('3.3.9. cancel(uint256)', async () => {
        it('3.3.9.1. Cancel mortgage successfully by borrower', async () => {
            const fixture = await beforeProjectMortgageTokenTest({
                listSampleMortgage: true,
            });
            const { projectMortgageToken, borrower1 } = fixture;

            let tx = await getMortgageTokenTx_Cancel(projectMortgageToken, borrower1, {
                mortgageId: BigNumber.from(1),
            });
            await tx.wait();

            expect(tx).to.emit(projectMortgageToken, 'MortgageCancellation').withArgs(1);

            expect(await projectMortgageToken.mortgageNumber()).to.equal(2);

            const mortgage = await projectMortgageToken.getMortgage(1);
            expect(mortgage.state).to.equal(MortgageState.Cancelled);
        });

        it('3.3.9.2. Cancel mortgage successfully by manager', async () => {
            const fixture = await beforeProjectMortgageTokenTest({
                listSampleMortgage: true,
            });
            const { projectMortgageToken, manager } = fixture;

            let tx = await getMortgageTokenTx_Cancel(projectMortgageToken, manager, {
                mortgageId: BigNumber.from(2),
            });
            await tx.wait();

            expect(tx).to.emit(projectMortgageToken, 'MortgageCancellation').withArgs(2);

            expect(await projectMortgageToken.mortgageNumber()).to.equal(2);

            const mortgage = await projectMortgageToken.getMortgage(2);
            expect(mortgage.state).to.equal(MortgageState.Cancelled);
        });

        it('3.3.9.3. Cancel mortgage unsuccessfully by unauthorized user', async () => {
            const fixture = await beforeProjectMortgageTokenTest({
                listSampleMortgage: true,
            });
            const { projectMortgageToken, lender1, moderator } = fixture;
            await expect(
                getMortgageTokenTx_Cancel(projectMortgageToken, lender1, {
                    mortgageId: BigNumber.from(1),
                })
            ).to.be.revertedWithCustomError(projectMortgageToken, 'Unauthorized');
            await expect(
                getMortgageTokenTx_Cancel(projectMortgageToken, moderator, {
                    mortgageId: BigNumber.from(1),
                })
            ).to.be.revertedWithCustomError(projectMortgageToken, 'Unauthorized');
        });

        it('3.3.9.4. Cancel mortgage unsuccessfully with invalid mortgage id', async () => {
            const fixture = await beforeProjectMortgageTokenTest({
                listSampleMortgage: true,
            });
            const { projectMortgageToken, borrower1 } = fixture;
            await expect(
                getMortgageTokenTx_Cancel(projectMortgageToken, borrower1, {
                    mortgageId: BigNumber.from(0),
                })
            ).to.be.revertedWithCustomError(projectMortgageToken, 'InvalidMortgageId');

            await expect(
                getMortgageTokenTx_Cancel(projectMortgageToken, borrower1, {
                    mortgageId: BigNumber.from(3),
                })
            ).to.be.revertedWithCustomError(projectMortgageToken, 'InvalidMortgageId');
        });

        it('3.3.9.5. Cancel mortgage unsuccessfully with cancelled mortgage', async () => {
            const fixture = await beforeProjectMortgageTokenTest({
                listSampleMortgage: true,
            });
            const { projectMortgageToken, borrower1 } = fixture;
            await callTransaction(
                getMortgageTokenTx_Cancel(projectMortgageToken, borrower1, {
                    mortgageId: BigNumber.from(1),
                })
            );

            await expect(
                getMortgageTokenTx_Cancel(projectMortgageToken, borrower1, {
                    mortgageId: BigNumber.from(1),
                })
            ).to.be.revertedWithCustomError(projectMortgageToken, 'InvalidCancelling');
        });

        it('3.3.9.6. Cancel mortgage unsuccessfully with supplied mortgage', async () => {
            const fixture = await beforeProjectMortgageTokenTest({
                listSampleMortgage: true,
            });
            const { projectMortgageToken, borrower1, lender1 } = fixture;

            await callTransaction(
                getMortgageTokenTx_Lend(
                    projectMortgageToken,
                    lender1,
                    { mortgageId: BigNumber.from(1) },
                    { value: 1e9 }
                )
            );

            await expect(
                getMortgageTokenTx_Cancel(projectMortgageToken, borrower1, {
                    mortgageId: BigNumber.from(1),
                })
            ).to.be.revertedWithCustomError(projectMortgageToken, 'InvalidCancelling');
        });

        it('3.3.9.7. Cancel mortgage unsuccessfully with foreclosed mortgage', async () => {
            const fixture = await beforeProjectMortgageTokenTest({
                listSampleMortgage: true,
            });
            const { projectMortgageToken, borrower1, lender1 } = fixture;

            await callTransaction(
                getMortgageTokenTx_Lend(
                    projectMortgageToken,
                    lender1,
                    { mortgageId: BigNumber.from(1) },
                    { value: 1e9 }
                )
            );

            const due = (await projectMortgageToken.getMortgage(1)).due;

            await time.setNextBlockTimestamp(due);
            await callTransaction(
                getMortgageTokenTx_Foreclose(projectMortgageToken, lender1, {
                    mortgageId: BigNumber.from(1),
                })
            );

            await expect(
                getMortgageTokenTx_Cancel(projectMortgageToken, borrower1, {
                    mortgageId: BigNumber.from(1),
                })
            ).to.be.revertedWithCustomError(projectMortgageToken, 'InvalidCancelling');
        });

        it('3.3.9.8. Cancel mortgage unsuccessfully with repaid mortgage', async () => {
            const fixture = await beforeProjectMortgageTokenTest({
                listSampleMortgage: true,
            });
            const { projectMortgageToken, borrower1, lender1 } = fixture;

            await callTransaction(
                getMortgageTokenTx_Lend(
                    projectMortgageToken,
                    lender1,
                    { mortgageId: BigNumber.from(1) },
                    { value: 1e9 }
                )
            );

            await callTransaction(
                getMortgageTokenTx_Repay(
                    projectMortgageToken,
                    borrower1,
                    { mortgageId: BigNumber.from(1) },
                    { value: 1e9 }
                )
            );

            await expect(
                getMortgageTokenTx_Cancel(projectMortgageToken, borrower1, {
                    mortgageId: BigNumber.from(1),
                })
            ).to.be.revertedWithCustomError(projectMortgageToken, 'InvalidCancelling');
        });
    });

    describe('3.3.10. lend(uint256)', async () => {
        async function testLend(
            fixture: ProjectMortgageTokenFixture,
            currencyExclusiveRate: BigNumber,
            projectMortgageTokenFeeRate: BigNumber,
            isERC20: boolean,
            isExclusive: boolean,
            initialAmount: BigNumber,
            amount: BigNumber,
            principal: BigNumber,
            repayment: BigNumber
        ) {
            const {
                projectMortgageToken,
                admin,
                admins,
                deployer,
                projectToken,
                prestigePad,
                borrower1,
                lender1,
                feeReceiver,
                initiator1,
                zone1,
            } = fixture;

            const currentMortgageId = (await projectMortgageToken.mortgageNumber()).add(1);
            const currentLaunchId = 0; // Does not matter
            const zone = zone1;
            const borrower = borrower1;
            const lender = lender1;

            await callTransaction(
                getMortgageTokenTxByInput_UpdateFeeRate(
                    projectMortgageToken as any,
                    deployer,
                    { feeRate: projectMortgageTokenFeeRate },
                    admin,
                    admins
                )
            );

            let newCurrency: Currency | null = null;
            let newCurrencyAddress: string;
            if (isERC20) {
                newCurrency = (await deployCurrency(
                    deployer.address,
                    `NewMockCurrency_${currentMortgageId}`,
                    `NMC_${currentMortgageId}`
                )) as Currency;
                await callTransaction(
                    newCurrency.setExclusiveDiscount(currencyExclusiveRate, Constant.COMMON_RATE_DECIMALS)
                );
                newCurrencyAddress = newCurrency.address;
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

            let currentTimestamp = (await time.latest()) + 10;

            await callTransaction(
                getCallProjectTokenTx_LaunchProject(projectToken as any, prestigePad, {
                    zone,
                    launchId: BigNumber.from(currentLaunchId),
                    initiator: initiator1.address,
                    uri: 'TestURI',
                })
            );

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

            await callTransaction(
                getProjectMortgageTokenTx_Borrow(projectMortgageToken, borrower, {
                    projectId: currentMortgageId,
                    amount,
                    principal,
                    repayment,
                    currency: newCurrencyAddress,
                    duration: due,
                })
            );

            let fee = principal.mul(projectMortgageTokenFeeRate).div(Constant.COMMON_RATE_MAX_FRACTION);
            if (isExclusive) {
                fee = fee.sub(fee.mul(currencyExclusiveRate).div(Constant.COMMON_RATE_MAX_FRACTION));
            }

            let ethValue = ethers.BigNumber.from(0);
            await prepareNativeToken(ethers.provider, deployer, [lender], ethers.utils.parseEther('1.0'));
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

            let tx = await getMortgageTokenTx_Lend(
                projectMortgageToken,
                lender,
                { mortgageId: currentMortgageId },
                { value: ethValue }
            );
            let receipt = await tx.wait();

            let expectedBorrowerBalance = initBorrowerBalance.add(principal).sub(fee);
            let expectedLenderBalance = initLenderBalance.sub(principal);
            let expectedFeeReceiverBalance = initFeeReceiverBalance.add(fee);

            if (!isERC20) {
                const gasFee = receipt.gasUsed.mul(receipt.effectiveGasPrice);
                expectedLenderBalance = expectedLenderBalance.sub(gasFee);
            }

            await expect(tx)
                .to.emit(projectMortgageToken, 'NewToken')
                .withArgs(currentMortgageId, lender.address, currentTimestamp + due);

            const mortgage = await projectMortgageToken.getMortgage(currentMortgageId);
            expect(mortgage.due).to.equal(currentTimestamp + due);
            expect(mortgage.state).to.equal(MortgageState.Supplied);
            expect(mortgage.lender).to.equal(lender.address);

            expect(await projectMortgageToken.totalSupply()).to.equal(currentTotalSupply.add(1));

            expect(await getBalance(ethers.provider, borrower.address, newCurrency)).to.equal(expectedBorrowerBalance);
            expect(await getBalance(ethers.provider, lender.address, newCurrency)).to.equal(expectedLenderBalance);
            expect(await getBalance(ethers.provider, feeReceiver.address, newCurrency)).to.equal(
                expectedFeeReceiverBalance
            );

            expect(await projectToken.balanceOf(borrower.address, currentTokenId)).to.equal(initialAmount.sub(amount));
            expect(await projectToken.balanceOf(projectMortgageToken.address, currentTokenId)).to.equal(amount);

            expect(await projectMortgageToken.ownerOf(currentMortgageId)).to.equal(lender.address);

            if (isERC20) {
                await resetERC20(newCurrency!, [borrower, lender, feeReceiver]);
            } else {
                await resetNativeToken(ethers.provider, [borrower, lender, feeReceiver]);
                await prepareNativeToken(ethers.provider, deployer, [borrower, lender], ethers.utils.parseEther('1.0'));
            }
        }

        it('3.3.10.1. Lend successfully in native and erc20 token', async () => {
            const fixture = await beforeProjectMortgageTokenTest({
                skipListSampleCurrencies: true,
                skipListProjectToken: true,
            });
            await testLend(
                fixture,
                ethers.utils.parseEther('0.3'),
                LendInitialization.PROJECT_MORTGAGE_TOKEN_FeeRate,
                false,
                false,
                ethers.BigNumber.from(200_000),
                ethers.BigNumber.from(150_000),
                ethers.BigNumber.from(10e5),
                ethers.BigNumber.from(11e5)
            );

            await testLend(
                fixture,
                ethers.utils.parseEther('0.3'),
                LendInitialization.PROJECT_MORTGAGE_TOKEN_FeeRate,
                true,
                true,
                ethers.BigNumber.from(300),
                ethers.BigNumber.from(200),
                ethers.BigNumber.from(100000),
                ethers.BigNumber.from(110000)
            );
        });

        it('3.3.10.2. Lend successfully in all native/erc20 and exclusive/non-exclusive combinations', async () => {
            const fixture = await beforeProjectMortgageTokenTest({
                skipListSampleCurrencies: true,
                skipListProjectToken: true,
            });
            for (const isERC20 of [false, true]) {
                for (const isExclusive of [false, true]) {
                    if (isExclusive && !isERC20) {
                        continue;
                    }
                    await testLend(
                        fixture,
                        ethers.utils.parseEther('0.3'),
                        LendInitialization.PROJECT_MORTGAGE_TOKEN_FeeRate,
                        isERC20,
                        isExclusive,
                        ethers.BigNumber.from(200_000),
                        ethers.BigNumber.from(150_000),
                        ethers.BigNumber.from(10e5),
                        ethers.BigNumber.from(11e5)
                    );
                }
            }
        });

        it('3.3.10.3. Lend successfully with very large amount in all native/erc20 and exclusive/non-exclusive combinations', async () => {
            const fixture = await beforeProjectMortgageTokenTest({
                skipListSampleCurrencies: true,
                skipListProjectToken: true,
            });
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
                        ethers.utils.parseEther('0.99'),
                        ethers.utils.parseEther('0.99'),
                        isERC20,
                        isExclusive,
                        amount.add(1),
                        amount,
                        principal,
                        repayment
                    );
                }
            }
        });

        it('3.3.10.4. Lend successfully in 100 random test cases', async () => {
            const fixture = await beforeProjectMortgageTokenTest({
                skipListSampleCurrencies: true,
                skipListProjectToken: true,
            });
            for (let testcase = 0; testcase < 100; testcase++) {
                const isERC20 = Math.random() < 0.5;
                const isExclusive = Math.random() < 0.5;
                const feeRate = randomBigNumber(ethers.constants.Zero, ethers.utils.parseEther('1.0'));
                const exclusiveRate = randomBigNumber(ethers.constants.Zero, ethers.utils.parseEther('1.0'));

                if (isExclusive && !isERC20) {
                    --testcase;
                    continue;
                }

                let randomNums = [];
                for (let i = 0; i < 2; ++i) {
                    const maxSupply = ethers.BigNumber.from(2).pow(255);
                    randomNums.push(ethers.BigNumber.from(ethers.utils.randomBytes(32)).mod(maxSupply).add(1));
                }
                randomNums.sort((a, b) => (a.sub(b).lt(0) ? -1 : 1));

                const initAmount = randomNums[1];
                const amount = randomNums[0];

                randomNums = [];
                for (let i = 0; i < 2; ++i) {
                    const maxSupply = ethers.BigNumber.from(2).pow(255);
                    randomNums.push(ethers.BigNumber.from(ethers.utils.randomBytes(32)).mod(maxSupply).add(1));
                }
                randomNums.sort((a, b) => (a.sub(b).lt(0) ? -1 : 1));

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
                    repayment
                );
            }
        });

        it('3.3.10.5. Lend unsuccessfully when paused', async () => {
            const fixture = await beforeProjectMortgageTokenTest({
                listSampleMortgage: true,
                pause: true,
            });
            const { projectMortgageToken, borrower1 } = fixture;

            await expect(
                getMortgageTokenTx_Lend(
                    projectMortgageToken,
                    borrower1,
                    { mortgageId: BigNumber.from(1) },
                    { value: 1e9 }
                )
            ).to.be.revertedWith('Pausable: paused');
        });

        it('3.3.10.6. Lend unsuccessfully with invalid mortgage id', async () => {
            const fixture = await beforeProjectMortgageTokenTest({
                listSampleMortgage: true,
            });
            const { projectMortgageToken, borrower1 } = fixture;

            await expect(
                getMortgageTokenTx_Lend(
                    projectMortgageToken,
                    borrower1,
                    { mortgageId: BigNumber.from(0) },
                    { value: 1e9 }
                )
            ).to.be.revertedWithCustomError(projectMortgageToken, 'InvalidMortgageId');

            await expect(
                getMortgageTokenTx_Lend(
                    projectMortgageToken,
                    borrower1,
                    { mortgageId: BigNumber.from(3) },
                    { value: 1e9 }
                )
            ).to.be.revertedWithCustomError(projectMortgageToken, 'InvalidMortgageId');
        });

        it('3.3.10.7. Lend unsuccessfully when borrower lend their own mortgage', async () => {
            const fixture = await beforeProjectMortgageTokenTest({
                listSampleMortgage: true,
            });
            const { projectMortgageToken, borrower1, borrower2 } = fixture;

            await expect(
                getMortgageTokenTx_Lend(
                    projectMortgageToken,
                    borrower1,
                    { mortgageId: BigNumber.from(1) },
                    { value: 1e9 }
                )
            ).to.be.revertedWithCustomError(projectMortgageToken, 'InvalidLending');

            await expect(
                getMortgageTokenTx_Lend(
                    projectMortgageToken,
                    borrower2,
                    { mortgageId: BigNumber.from(2) },
                    { value: 1e9 }
                )
            ).to.be.revertedWithCustomError(projectMortgageToken, 'InvalidLending');
        });

        it('3.3.10.8. Lend unsuccessfully with supplied mortgage', async () => {
            const fixture = await beforeProjectMortgageTokenTest({
                listSampleMortgage: true,
            });
            const { projectMortgageToken, lender1, lender2 } = fixture;

            await callTransaction(
                getMortgageTokenTx_Lend(
                    projectMortgageToken,
                    lender1,
                    { mortgageId: BigNumber.from(1) },
                    { value: 1e9 }
                )
            );

            await expect(
                getMortgageTokenTx_Lend(
                    projectMortgageToken,
                    lender1,
                    { mortgageId: BigNumber.from(1) },
                    { value: 1e9 }
                )
            ).to.be.revertedWithCustomError(projectMortgageToken, 'InvalidLending');
            await expect(
                getMortgageTokenTx_Lend(
                    projectMortgageToken,
                    lender2,
                    { mortgageId: BigNumber.from(1) },
                    { value: 1e9 }
                )
            ).to.be.revertedWithCustomError(projectMortgageToken, 'InvalidLending');
        });

        it('3.3.10.9. Lend unsuccessfully with repaid mortgage', async () => {
            const fixture = await beforeProjectMortgageTokenTest({
                listSampleMortgage: true,
            });
            const { projectMortgageToken, borrower1, lender1, lender2 } = fixture;

            await callTransaction(
                getMortgageTokenTx_Lend(
                    projectMortgageToken,
                    lender1,
                    { mortgageId: BigNumber.from(1) },
                    { value: 1e9 }
                )
            );

            await callTransaction(
                getMortgageTokenTx_Repay(
                    projectMortgageToken,
                    borrower1,
                    { mortgageId: BigNumber.from(1) },
                    { value: 1e9 }
                )
            );

            await expect(
                getMortgageTokenTx_Lend(
                    projectMortgageToken,
                    lender1,
                    { mortgageId: BigNumber.from(1) },
                    { value: 1e9 }
                )
            ).to.be.revertedWithCustomError(projectMortgageToken, 'InvalidLending');
            await expect(
                getMortgageTokenTx_Lend(
                    projectMortgageToken,
                    lender2,
                    { mortgageId: BigNumber.from(1) },
                    { value: 1e9 }
                )
            ).to.be.revertedWithCustomError(projectMortgageToken, 'InvalidLending');
        });

        it('3.3.10.10. Lend unsuccessfully with cancelled mortgage', async () => {
            const fixture = await beforeProjectMortgageTokenTest({
                listSampleMortgage: true,
            });
            const { projectMortgageToken, borrower1, lender1 } = fixture;

            await callTransaction(
                getMortgageTokenTx_Cancel(projectMortgageToken, borrower1, {
                    mortgageId: BigNumber.from(1),
                })
            );

            await expect(
                getMortgageTokenTx_Lend(
                    projectMortgageToken,
                    lender1,
                    { mortgageId: BigNumber.from(1) },
                    { value: 1e9 }
                )
            ).to.be.revertedWithCustomError(projectMortgageToken, 'InvalidLending');
        });

        it('3.3.10.11. Lend unsuccessfully with foreclosed mortgage', async () => {
            const fixture = await beforeProjectMortgageTokenTest({
                listSampleMortgage: true,
            });
            const { projectMortgageToken, lender1, lender2 } = fixture;

            await callTransaction(
                getMortgageTokenTx_Lend(
                    projectMortgageToken,
                    lender1,
                    { mortgageId: BigNumber.from(1) },
                    { value: 1e9 }
                )
            );

            const due = (await projectMortgageToken.getMortgage(1)).due;
            await time.setNextBlockTimestamp(due);

            await callTransaction(
                getMortgageTokenTx_Foreclose(projectMortgageToken, lender1, {
                    mortgageId: BigNumber.from(1),
                })
            );

            await expect(
                getMortgageTokenTx_Lend(
                    projectMortgageToken,
                    lender1,
                    { mortgageId: BigNumber.from(1) },
                    { value: 1e9 }
                )
            ).to.be.revertedWithCustomError(projectMortgageToken, 'InvalidLending');
            await expect(
                getMortgageTokenTx_Lend(
                    projectMortgageToken,
                    lender2,
                    { mortgageId: BigNumber.from(1) },
                    { value: 1e9 }
                )
            ).to.be.revertedWithCustomError(projectMortgageToken, 'InvalidLending');
        });

        it('3.3.10.12. Lend unsuccessfully with insufficient native token', async () => {
            const fixture = await beforeProjectMortgageTokenTest({
                listSampleMortgage: true,
            });
            const { projectMortgageToken, lender1 } = fixture;

            await expect(
                getMortgageTokenTx_Lend(projectMortgageToken, lender1, {
                    mortgageId: BigNumber.from(1),
                })
            ).to.be.revertedWithCustomError(projectMortgageToken, 'InsufficientValue');
        });

        it('3.3.10.13. Lend unsuccessfully when transferring native token to borrower failed', async () => {
            const fixture = await beforeProjectMortgageTokenTest();
            const { projectMortgageToken, lender1, deployer, projectToken } = fixture;

            const failReceiver = await deployFailReceiver(deployer, true, false);

            await callTransaction(projectToken.mintTo(failReceiver.address, 1, 200_000));
            await callTransaction(
                failReceiver.call(
                    projectToken.address,
                    projectToken.interface.encodeFunctionData('setApprovalForAll', [projectMortgageToken.address, true])
                )
            );

            const data = projectMortgageToken.interface.encodeFunctionData('borrow', [
                1,
                150_000,
                10e5,
                11e5,
                ethers.constants.AddressZero,
                1000,
            ]);
            await callTransaction(failReceiver.call(projectMortgageToken.address, data));

            await expect(
                getMortgageTokenTx_Lend(
                    projectMortgageToken,
                    lender1,
                    { mortgageId: BigNumber.from(1) },
                    { value: 1e9 }
                )
            ).to.be.revertedWithCustomError(projectMortgageToken, 'FailedTransfer');
        });

        it('3.3.10.14. Buy token unsuccessfully when refunding to lender failed', async () => {
            const fixture = await beforeProjectMortgageTokenTest({
                listSampleMortgage: true,
            });
            const { projectMortgageToken, deployer } = fixture;
            const failReceiver = await deployFailReceiver(deployer, true, false);

            let data = projectMortgageToken.interface.encodeFunctionData('lend', [1]);

            await expect(
                failReceiver.call(projectMortgageToken.address, data, {
                    value: 1e9,
                })
            ).to.be.revertedWithCustomError(projectMortgageToken, 'FailedRefund');
        });

        it('3.3.10.15. Buy token unsuccessfully when the contract is reentered', async () => {
            const fixture = await beforeProjectMortgageTokenTest();
            const { projectMortgageToken, deployer, projectToken, lender1 } = fixture;

            const reentrancy = await deployReentrancyReceiver(deployer, true, false);

            await callTransaction(projectToken.mintTo(reentrancy.address, 1, 100_000));

            await callTransaction(
                reentrancy.call(
                    projectToken.address,
                    projectToken.interface.encodeFunctionData('setApprovalForAll', [projectMortgageToken.address, true])
                )
            );

            await callTransaction(
                reentrancy.call(
                    projectMortgageToken.address,
                    projectMortgageToken.interface.encodeFunctionData('borrow', [
                        1,
                        100_000,
                        10e5,
                        11e5,
                        ethers.constants.AddressZero,
                        1000,
                    ])
                )
            );

            const mortgageId = 1;

            await testReentrancy_projectMortgageToken(projectMortgageToken, reentrancy, async () => {
                await expect(
                    getMortgageTokenTx_Lend(
                        projectMortgageToken,
                        lender1,
                        { mortgageId: BigNumber.from(mortgageId) },
                        { value: 1e9 }
                    )
                ).to.be.revertedWithCustomError(projectMortgageToken, 'FailedTransfer');
            });
        });
    });

    describe('3.3.11. safeLend(uint256,uint256)', async () => {
        it('3.3.11.1. Safe lend successfully', async () => {
            const fixture = await beforeProjectMortgageTokenTest({
                listSampleMortgage: true,
            });
            const { projectMortgageToken, borrower1, borrower2 } = fixture;

            await expect(
                getMortgageTokenTxByParams_SafeLend(
                    projectMortgageToken,
                    borrower2,
                    { mortgageId: BigNumber.from(1) },
                    { value: 1e9 }
                )
            ).to.not.be.reverted;

            await expect(
                getMortgageTokenTxByParams_SafeLend(
                    projectMortgageToken,
                    borrower1,
                    { mortgageId: BigNumber.from(2) },
                    { value: 1e9 }
                )
            ).to.not.be.reverted;
        });

        it('3.3.11.2. Safe lend unsuccessfully with invalid mortgage id', async () => {
            const fixture = await beforeProjectMortgageTokenTest({
                listSampleMortgage: true,
            });
            const { projectMortgageToken, borrower1 } = fixture;

            await expect(
                getMortgageTokenTx_SafeLend(
                    projectMortgageToken,
                    borrower1,
                    {
                        mortgageId: BigNumber.from(0),
                        anchor: BigNumber.from(0),
                    },
                    { value: 1e9 }
                )
            ).to.be.revertedWithCustomError(projectMortgageToken, 'InvalidMortgageId');

            await expect(
                getMortgageTokenTx_SafeLend(
                    projectMortgageToken,
                    borrower1,
                    {
                        mortgageId: BigNumber.from(3),
                        anchor: BigNumber.from(0),
                    },
                    { value: 1e9 }
                )
            ).to.be.revertedWithCustomError(projectMortgageToken, 'InvalidMortgageId');
        });

        it('3.3.11.3. Safe lend unsuccessfully with invalid anchor', async () => {
            const fixture = await beforeProjectMortgageTokenTest({
                listSampleMortgage: true,
            });
            const { projectMortgageToken, lender1 } = fixture;

            await expect(
                getMortgageTokenTx_SafeLend(
                    projectMortgageToken,
                    lender1,
                    {
                        mortgageId: BigNumber.from(1),
                        anchor: BigNumber.from(0),
                    },
                    { value: 1e9 }
                )
            ).to.be.revertedWithCustomError(projectMortgageToken, 'BadAnchor');

            await expect(
                getMortgageTokenTx_SafeLend(
                    projectMortgageToken,
                    lender1,
                    {
                        mortgageId: BigNumber.from(2),
                        anchor: BigNumber.from(0),
                    },
                    { value: 1e9 }
                )
            ).to.be.revertedWithCustomError(projectMortgageToken, 'BadAnchor');
        });
    });

    describe('3.3.12. repay(uint256)', () => {
        it('3.3.12.1. Repay successfully', async () => {
            const fixture = await beforeProjectMortgageTokenTest({
                listSampleMortgage: true,
                listSampleLending: true,
            });
            const {
                projectMortgageToken,
                borrower1,
                borrower2,
                lender1,
                lender2,
                projectToken,
                currency,
                projectMortgageTokenOwner,
            } = fixture;

            let currentTimestamp = (await time.latest()) + 10;
            await time.setNextBlockTimestamp(currentTimestamp);

            let lender1NativeBalance = await ethers.provider.getBalance(lender1.address);
            let borrower1NativeBalance = await ethers.provider.getBalance(borrower1.address);
            let borrower1Balance = await projectToken.balanceOf(borrower1.address, 1);
            let projectMortgageTokenBalance = await projectToken.balanceOf(projectMortgageToken.address, 1);
            let currentTotalSupply = await projectMortgageToken.totalSupply();

            let tx = await getMortgageTokenTx_Repay(
                projectMortgageToken,
                borrower1,
                { mortgageId: BigNumber.from(1) },
                { value: 1e9 }
            );
            let receipt = await tx.wait();
            let gasFee = receipt.gasUsed.mul(receipt.effectiveGasPrice);

            await expect(tx).to.emit(projectMortgageToken, 'MortgageRepayment').withArgs(1);

            const mortgage1 = await projectMortgageToken.getMortgage(1);
            expect(mortgage1.state).to.equal(MortgageState.Repaid);

            expect(await projectMortgageToken.balanceOf(borrower1.address)).to.equal(0);

            expect(await projectMortgageToken.totalSupply()).to.equal(currentTotalSupply.sub(1));

            expect(await projectToken.balanceOf(borrower1.address, 1)).to.equal(borrower1Balance.add(150_000));
            expect(await projectToken.balanceOf(projectMortgageToken.address, 1)).to.equal(
                projectMortgageTokenBalance.sub(150_000)
            );

            expect(await ethers.provider.getBalance(borrower1.address)).to.equal(
                borrower1NativeBalance.sub(gasFee).sub(11e5)
            );
            expect(await ethers.provider.getBalance(lender1.address)).to.equal(lender1NativeBalance.add(11e5));

            await callTransaction(
                projectMortgageToken
                    .connect(lender2)
                    .transferFrom(lender2.address, projectMortgageTokenOwner.address, 2)
            );

            let borrower2CurrencyBalance = await currency.balanceOf(borrower2.address);
            let lender2CurrencyBalance = await currency.balanceOf(lender2.address);
            let projectMortgageTokenOwnerBalance = await currency.balanceOf(projectMortgageTokenOwner.address);
            let borrower2Balance = await projectToken.balanceOf(borrower2.address, 2);
            projectMortgageTokenBalance = await projectToken.balanceOf(projectMortgageToken.address, 2);

            tx = await getMortgageTokenTx_Repay(
                projectMortgageToken,
                borrower2,
                { mortgageId: BigNumber.from(2) },
                { value: 1e9 }
            );
            await tx.wait();

            await expect(tx).to.emit(projectMortgageToken, 'MortgageRepayment').withArgs(2);

            const mortgage2 = await projectMortgageToken.getMortgage(2);
            expect(mortgage2.state).to.equal(MortgageState.Repaid);

            expect(await projectMortgageToken.balanceOf(borrower2.address)).to.equal(0);
            expect(await projectMortgageToken.totalSupply()).to.equal(currentTotalSupply.sub(2));

            expect(await projectToken.balanceOf(borrower2.address, 2)).to.equal(borrower2Balance.add(200));
            expect(await projectToken.balanceOf(projectMortgageToken.address, 2)).to.equal(
                projectMortgageTokenBalance.sub(200)
            );

            expect(await currency.balanceOf(borrower2.address)).to.equal(borrower2CurrencyBalance.sub(110000));
            expect(await currency.balanceOf(lender2.address)).to.equal(lender2CurrencyBalance);
            expect(await currency.balanceOf(projectMortgageTokenOwner.address)).to.equal(
                projectMortgageTokenOwnerBalance.add(110000)
            );
        });

        it('3.3.12.2. Repay unsuccessfully when paused', async () => {
            const fixture = await beforeProjectMortgageTokenTest({
                listSampleMortgage: true,
                listSampleLending: true,
                pause: true,
            });
            const { projectMortgageToken, borrower1 } = fixture;

            await expect(
                getMortgageTokenTx_Repay(
                    projectMortgageToken,
                    borrower1,
                    { mortgageId: BigNumber.from(1) },
                    { value: 1e9 }
                )
            ).to.be.revertedWith('Pausable: paused');
        });

        it('3.3.12.3. Repay unsuccessfully with invalid mortgage id', async () => {
            const fixture = await beforeProjectMortgageTokenTest({
                listSampleMortgage: true,
                listSampleLending: true,
            });
            const { projectMortgageToken, borrower1 } = fixture;

            await expect(
                getMortgageTokenTx_Repay(projectMortgageToken, borrower1, {
                    mortgageId: BigNumber.from(0),
                })
            ).to.be.revertedWithCustomError(projectMortgageToken, 'InvalidMortgageId');

            await expect(
                getMortgageTokenTx_Repay(projectMortgageToken, borrower1, {
                    mortgageId: BigNumber.from(3),
                })
            ).to.be.revertedWithCustomError(projectMortgageToken, 'InvalidMortgageId');
        });

        it('3.3.12.4. Repay unsuccessfully with overdue mortgage', async () => {
            const fixture = await beforeProjectMortgageTokenTest({
                listSampleMortgage: true,
                listSampleLending: true,
            });
            const { projectMortgageToken, borrower1, borrower2 } = fixture;

            const due1 = (await projectMortgageToken.getMortgage(1)).due;
            await time.setNextBlockTimestamp(due1);

            await expect(
                getMortgageTokenTx_Repay(
                    projectMortgageToken,
                    borrower1,
                    { mortgageId: BigNumber.from(1) },
                    { value: 1e9 }
                )
            ).to.be.revertedWithCustomError(projectMortgageToken, 'Overdue');

            const due2 = (await projectMortgageToken.getMortgage(2)).due;
            await time.setNextBlockTimestamp(due2);

            await expect(
                getMortgageTokenTx_Repay(projectMortgageToken, borrower2, {
                    mortgageId: BigNumber.from(2),
                })
            ).to.be.revertedWithCustomError(projectMortgageToken, 'Overdue');
        });

        it('3.3.12.5. Repay unsuccessfully with pending mortgage', async () => {
            const fixture = await beforeProjectMortgageTokenTest({
                listSampleMortgage: true,
            });
            const { projectMortgageToken, borrower1, borrower2 } = fixture;

            await expect(
                getMortgageTokenTx_Repay(
                    projectMortgageToken,
                    borrower1,
                    { mortgageId: BigNumber.from(1) },
                    { value: 1e9 }
                )
            ).to.be.revertedWithCustomError(projectMortgageToken, 'InvalidRepaying');
            await expect(
                getMortgageTokenTx_Repay(projectMortgageToken, borrower2, {
                    mortgageId: BigNumber.from(2),
                })
            ).to.be.revertedWithCustomError(projectMortgageToken, 'InvalidRepaying');
        });

        it('3.3.12.6. Repay unsuccessfully with already repaid mortgage', async () => {
            const fixture = await beforeProjectMortgageTokenTest({
                listSampleMortgage: true,
                listSampleLending: true,
            });
            const { projectMortgageToken, borrower1, borrower2 } = fixture;

            await callTransaction(
                getMortgageTokenTx_Repay(
                    projectMortgageToken,
                    borrower1,
                    { mortgageId: BigNumber.from(1) },
                    { value: 1e9 }
                )
            );
            await callTransaction(
                getMortgageTokenTx_Repay(projectMortgageToken, borrower2, {
                    mortgageId: BigNumber.from(2),
                })
            );

            await expect(
                getMortgageTokenTx_Repay(
                    projectMortgageToken,
                    borrower1,
                    { mortgageId: BigNumber.from(1) },
                    { value: 1e9 }
                )
            ).to.be.revertedWithCustomError(projectMortgageToken, 'InvalidRepaying');
            await expect(
                getMortgageTokenTx_Repay(projectMortgageToken, borrower2, {
                    mortgageId: BigNumber.from(2),
                })
            ).to.be.revertedWithCustomError(projectMortgageToken, 'InvalidRepaying');
        });

        it('3.3.12.7. Repay unsuccessfully with foreclosed mortgage', async () => {
            const fixture = await beforeProjectMortgageTokenTest({
                listSampleMortgage: true,
                listSampleLending: true,
            });
            const { projectMortgageToken, borrower1, borrower2 } = fixture;

            const due = (await projectMortgageToken.getMortgage(2)).due;
            await time.setNextBlockTimestamp(due);

            await callTransaction(
                getMortgageTokenTx_Foreclose(projectMortgageToken, borrower1, {
                    mortgageId: BigNumber.from(1),
                })
            );
            await callTransaction(
                getMortgageTokenTx_Foreclose(projectMortgageToken, borrower2, {
                    mortgageId: BigNumber.from(2),
                })
            );

            await expect(
                getMortgageTokenTx_Repay(
                    projectMortgageToken,
                    borrower1,
                    { mortgageId: BigNumber.from(1) },
                    { value: 1e9 }
                )
            ).to.be.revertedWithCustomError(projectMortgageToken, 'InvalidRepaying');
            await expect(
                getMortgageTokenTx_Repay(projectMortgageToken, borrower2, {
                    mortgageId: BigNumber.from(2),
                })
            ).to.be.revertedWithCustomError(projectMortgageToken, 'InvalidRepaying');
        });

        it('3.3.12.8. Repay unsuccessfully with cancelled mortgage', async () => {
            const fixture = await beforeProjectMortgageTokenTest({
                listSampleMortgage: true,
            });
            const { projectMortgageToken, borrower1, borrower2 } = fixture;

            await callTransaction(
                getMortgageTokenTx_Cancel(projectMortgageToken, borrower1, {
                    mortgageId: BigNumber.from(1),
                })
            );
            await callTransaction(
                getMortgageTokenTx_Cancel(projectMortgageToken, borrower2, {
                    mortgageId: BigNumber.from(2),
                })
            );

            await expect(
                getMortgageTokenTx_Repay(
                    projectMortgageToken,
                    borrower1,
                    { mortgageId: BigNumber.from(1) },
                    { value: 1e9 }
                )
            ).to.be.revertedWithCustomError(projectMortgageToken, 'InvalidRepaying');
            await expect(
                getMortgageTokenTx_Repay(projectMortgageToken, borrower2, {
                    mortgageId: BigNumber.from(2),
                })
            ).to.be.revertedWithCustomError(projectMortgageToken, 'InvalidRepaying');
        });

        it('3.3.12.9. Repay unsuccessfully with insufficient funds', async () => {
            const fixture = await beforeProjectMortgageTokenTest({
                listSampleMortgage: true,
                listSampleLending: true,
            });
            const { projectMortgageToken, borrower1, borrower2, currency } = fixture;

            await expect(
                getMortgageTokenTx_Repay(projectMortgageToken, borrower1, {
                    mortgageId: BigNumber.from(1),
                })
            ).to.be.revertedWithCustomError(projectMortgageToken, 'InsufficientValue');

            await resetERC20(currency, [borrower2]);
            await expect(
                getMortgageTokenTx_Repay(projectMortgageToken, borrower2, {
                    mortgageId: BigNumber.from(2),
                })
            ).to.be.revertedWith('ERC20: transfer amount exceeds balance');
        });

        it('3.3.12.10. Repay unsuccessfully transferring native token to lender failed', async () => {
            const fixture = await beforeProjectMortgageTokenTest({
                listSampleMortgage: true,
            });
            const { projectMortgageToken, borrower1, deployer } = fixture;

            const failReceiver = await deployFailReceiver(deployer, true, false);

            const principal = (await projectMortgageToken.getMortgage(1)).principal;

            let data = projectMortgageToken.interface.encodeFunctionData('lend', [1]);
            await callTransaction(
                failReceiver.call(projectMortgageToken.address, data, {
                    value: principal,
                })
            );

            await expect(
                getMortgageTokenTx_Repay(
                    projectMortgageToken,
                    borrower1,
                    { mortgageId: BigNumber.from(1) },
                    { value: 1e9 }
                )
            ).to.be.revertedWithCustomError(projectMortgageToken, 'FailedTransfer');
        });

        it('3.3.12.11. Repay unsuccessfully when the contract is reentered', async () => {
            const fixture = await beforeProjectMortgageTokenTest({
                listSampleMortgage: true,
            });
            const { projectMortgageToken, borrower1, deployer } = fixture;

            const reentrancy = await deployReentrancyReceiver(deployer, true, false);

            const principal = (await projectMortgageToken.getMortgage(1)).principal;

            let data = projectMortgageToken.interface.encodeFunctionData('lend', [1]);
            await callTransaction(
                reentrancy.call(projectMortgageToken.address, data, {
                    value: principal,
                })
            );

            await testReentrancy_projectMortgageToken(projectMortgageToken, reentrancy, async () => {
                await expect(
                    getMortgageTokenTx_Repay(
                        projectMortgageToken,
                        borrower1,
                        { mortgageId: BigNumber.from(1) },
                        { value: 1e9 }
                    )
                ).to.be.revertedWithCustomError(projectMortgageToken, 'FailedTransfer');
            });
        });
    });

    describe('3.3.13. safeRepay(uint256,uint256)', () => {
        it('3.3.13.1. Safe repay successfully', async () => {
            const fixture = await beforeProjectMortgageTokenTest({
                listSampleMortgage: true,
                listSampleLending: true,
            });
            const { projectMortgageToken, borrower1, borrower2 } = fixture;

            await expect(
                getMortgageTokenTxByParams_SafeRepay(
                    projectMortgageToken,
                    borrower1,
                    { mortgageId: BigNumber.from(1) },
                    { value: 1e9 }
                )
            ).to.not.be.reverted;

            await expect(
                getMortgageTokenTxByParams_SafeRepay(projectMortgageToken, borrower2, {
                    mortgageId: BigNumber.from(2),
                })
            ).to.not.be.reverted;
        });

        it('3.3.13.2. Safe repay unsuccessfully with invalid mortgage id', async () => {
            const fixture = await beforeProjectMortgageTokenTest({
                listSampleMortgage: true,
                listSampleLending: true,
            });
            const { projectMortgageToken, borrower1 } = fixture;

            await expect(
                getMortgageTokenTx_SafeRepay(projectMortgageToken, borrower1, {
                    mortgageId: BigNumber.from(0),
                    anchor: BigNumber.from(0),
                })
            ).to.be.revertedWithCustomError(projectMortgageToken, 'InvalidMortgageId');

            await expect(
                getMortgageTokenTx_SafeRepay(projectMortgageToken, borrower1, {
                    mortgageId: BigNumber.from(3),
                    anchor: BigNumber.from(0),
                })
            ).to.be.revertedWithCustomError(projectMortgageToken, 'InvalidMortgageId');
        });

        it('3.3.13.3. Repay unsuccessfully with invalid anchor', async () => {
            const fixture = await beforeProjectMortgageTokenTest({
                listSampleMortgage: true,
                listSampleLending: true,
            });
            const { projectMortgageToken, borrower1 } = fixture;

            await expect(
                getMortgageTokenTx_SafeRepay(projectMortgageToken, borrower1, {
                    mortgageId: BigNumber.from(1),
                    anchor: BigNumber.from(0),
                })
            ).to.be.revertedWithCustomError(projectMortgageToken, 'BadAnchor');

            await expect(
                getMortgageTokenTx_SafeRepay(projectMortgageToken, borrower1, {
                    mortgageId: BigNumber.from(2),
                    anchor: BigNumber.from(0),
                })
            ).to.be.revertedWithCustomError(projectMortgageToken, 'BadAnchor');
        });
    });

    describe('3.3.14. foreclose(uint256)', () => {
        it('3.3.14.1. Foreclose successfully', async () => {
            const fixture = await beforeProjectMortgageTokenTest({
                listSampleMortgage: true,
                listSampleLending: true,
            });
            const { user, projectMortgageToken, lender1, lender2, projectToken, projectMortgageTokenOwner } = fixture;

            let lender1Balance = await projectToken.balanceOf(lender1.address, 1);
            let mortgageContractBalance = await projectToken.balanceOf(projectMortgageToken.address, 1);
            let currentTotalSupply = await projectMortgageToken.totalSupply();

            const due1 = (await projectMortgageToken.getMortgage(1)).due;
            await time.setNextBlockTimestamp(due1);

            let tx = await getMortgageTokenTx_Foreclose(projectMortgageToken, user, {
                mortgageId: BigNumber.from(1),
            });
            await tx.wait();

            await expect(tx).to.emit(projectMortgageToken, 'MortgageForeclosure').withArgs(1, lender1.address);

            const mortgage1 = await projectMortgageToken.getMortgage(1);
            expect(mortgage1.state).to.equal(MortgageState.Foreclosed);

            expect(await projectMortgageToken.balanceOf(lender1.address)).to.equal(0);

            expect(await projectMortgageToken.totalSupply()).to.equal(currentTotalSupply.sub(1));

            expect(await projectToken.balanceOf(lender1.address, 1)).to.equal(lender1Balance.add(150_000));
            expect(await projectToken.balanceOf(projectMortgageToken.address, 1)).to.equal(
                mortgageContractBalance.sub(150_000)
            );

            await callTransaction(
                projectMortgageToken
                    .connect(lender2)
                    .transferFrom(lender2.address, projectMortgageTokenOwner.address, 2)
            );

            const due2 = (await projectMortgageToken.getMortgage(2)).due;
            await time.setNextBlockTimestamp(due2);

            let lender2Balance = await projectToken.balanceOf(lender2.address, 2);
            mortgageContractBalance = await projectToken.balanceOf(projectMortgageToken.address, 2);
            let projectMortgageTokenOwnerBalance = await projectToken.balanceOf(projectMortgageTokenOwner.address, 2);

            tx = await getMortgageTokenTx_Foreclose(projectMortgageToken, user, {
                mortgageId: BigNumber.from(2),
            });
            await tx.wait();

            await expect(tx)
                .to.emit(projectMortgageToken, 'MortgageForeclosure')
                .withArgs(2, projectMortgageTokenOwner.address);

            const mortgage2 = await projectMortgageToken.getMortgage(2);
            expect(mortgage2.state).to.equal(MortgageState.Foreclosed);

            expect(await projectMortgageToken.balanceOf(lender2.address)).to.equal(0);

            expect(await projectMortgageToken.totalSupply()).to.equal(currentTotalSupply.sub(2));

            expect(await projectToken.balanceOf(lender2.address, 2)).to.equal(lender2Balance);
            expect(await projectToken.balanceOf(projectMortgageTokenOwner.address, 2)).to.equal(
                projectMortgageTokenOwnerBalance.add(200)
            );
            expect(await projectToken.balanceOf(projectMortgageToken.address, 2)).to.equal(
                mortgageContractBalance.sub(200)
            );
        });

        it('3.3.14.2. Foreclose unsuccessfully when paused', async () => {
            const fixture = await beforeProjectMortgageTokenTest({
                listSampleMortgage: true,
                listSampleLending: true,
                pause: true,
            });
            const { user, projectMortgageToken } = fixture;

            await expect(
                getMortgageTokenTx_Foreclose(projectMortgageToken, user, {
                    mortgageId: BigNumber.from(1),
                })
            ).to.be.revertedWith('Pausable: paused');
        });

        it('3.3.14.3. Foreclose unsuccessfully with invalid mortgage id', async () => {
            const fixture = await beforeProjectMortgageTokenTest({
                listSampleMortgage: true,
                listSampleLending: true,
            });
            const { user, projectMortgageToken } = fixture;

            await expect(
                getMortgageTokenTx_Foreclose(projectMortgageToken, user, {
                    mortgageId: BigNumber.from(0),
                })
            ).to.be.revertedWithCustomError(projectMortgageToken, 'InvalidMortgageId');

            await expect(
                getMortgageTokenTx_Foreclose(projectMortgageToken, user, {
                    mortgageId: BigNumber.from(3),
                })
            ).to.be.revertedWithCustomError(projectMortgageToken, 'InvalidMortgageId');
        });

        it('3.3.14.4. Foreclose unsuccessfully when mortgage is not overdue', async () => {
            const fixture = await beforeProjectMortgageTokenTest({
                listSampleMortgage: true,
                listSampleLending: true,
            });
            const { user, projectMortgageToken } = fixture;

            await expect(
                getMortgageTokenTx_Foreclose(projectMortgageToken, user, {
                    mortgageId: BigNumber.from(1),
                })
            ).to.be.revertedWithCustomError(projectMortgageToken, 'InvalidForeclosing');
        });

        it('3.3.14.5. Foreclose unsuccessfully with pending mortgage', async () => {
            const fixture = await beforeProjectMortgageTokenTest({
                listSampleMortgage: true,
            });
            const { user, projectMortgageToken } = fixture;

            await expect(
                getMortgageTokenTx_Foreclose(projectMortgageToken, user, {
                    mortgageId: BigNumber.from(1),
                })
            ).to.be.revertedWithCustomError(projectMortgageToken, 'InvalidForeclosing');
        });

        it('3.3.14.6. Foreclose unsuccessfully with repaid mortgage', async () => {
            const fixture = await beforeProjectMortgageTokenTest({
                listSampleMortgage: true,
                listSampleLending: true,
            });
            const { user, projectMortgageToken, borrower1 } = fixture;

            await callTransaction(
                getMortgageTokenTx_Repay(
                    projectMortgageToken,
                    borrower1,
                    { mortgageId: BigNumber.from(1) },
                    { value: 1e9 }
                )
            );

            const due = (await projectMortgageToken.getMortgage(1)).due;
            await time.setNextBlockTimestamp(due);

            await expect(
                getMortgageTokenTx_Foreclose(projectMortgageToken, user, {
                    mortgageId: BigNumber.from(1),
                })
            ).to.be.revertedWithCustomError(projectMortgageToken, 'InvalidForeclosing');
        });

        it('3.3.14.7. Foreclose unsuccessfully with foreclosed mortgage', async () => {
            const fixture = await beforeProjectMortgageTokenTest({
                listSampleMortgage: true,
                listSampleLending: true,
            });
            const { user, projectMortgageToken, lender1 } = fixture;

            const due = (await projectMortgageToken.getMortgage(1)).due;
            await time.setNextBlockTimestamp(due);

            await callTransaction(
                getMortgageTokenTx_Foreclose(projectMortgageToken, lender1, {
                    mortgageId: BigNumber.from(1),
                })
            );

            await expect(
                getMortgageTokenTx_Foreclose(projectMortgageToken, user, {
                    mortgageId: BigNumber.from(1),
                })
            ).to.be.revertedWithCustomError(projectMortgageToken, 'InvalidForeclosing');
        });

        it('3.3.14.8. Foreclose unsuccessfully with cancelled mortgage', async () => {
            const fixture = await beforeProjectMortgageTokenTest({
                listSampleMortgage: true,
            });
            const { user, projectMortgageToken, borrower1 } = fixture;

            await callTransaction(
                getMortgageTokenTx_Cancel(projectMortgageToken, borrower1, {
                    mortgageId: BigNumber.from(1),
                })
            );

            await expect(
                getMortgageTokenTx_Foreclose(projectMortgageToken, user, {
                    mortgageId: BigNumber.from(1),
                })
            ).to.be.revertedWithCustomError(projectMortgageToken, 'InvalidForeclosing');
        });
    });
});
