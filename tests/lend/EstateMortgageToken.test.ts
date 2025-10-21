import { expect } from 'chai';
import { BigNumber, Contract } from 'ethers';
import { ethers, upgrades } from 'hardhat';

// @nomicfoundation/hardhat-network-helpers
import { loadFixture, time } from '@nomicfoundation/hardhat-network-helpers';

// @defi-wonderland/smock
import { MockContract, smock } from '@defi-wonderland/smock';

// @tests
import { Constant } from '@tests/test.constant';
import {
    IERC165UpgradeableInterfaceId,
    IERC721MetadataUpgradeableInterfaceId,
    IERC2981UpgradeableInterfaceId,
    IAssetMortgageTokenInterfaceId,
    IEstateTokenReceiverInterfaceId,
    IMortgageTokenInterfaceId,
} from '@tests/interfaces';

// @tests/land
import { Initialization as LandInitialization } from '@tests/land/test.initialization';

// @tests/lend
import { Initialization as LendInitialization } from '@tests/lend/test.initialization';

// @typechain-types
import {
    Admin,
    CommissionToken,
    Currency,
    FeeReceiver,
    MockEstateToken,
    MockEstateForger__factory,
    EstateMortgageToken,
    MockEstateForger,
    CommissionToken__factory,
    PriceWatcher,
    ReserveVault,
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
import { deployEstateMortgageToken } from '@utils/deployments/lend/estateMortgageToken';

// @utils/models/lend
import {
    MortgageState,
    UpdateBaseURIParams,
    UpdateBaseURIParamsInput,
    UpdateFeeRateParams,
    UpdateFeeRateParamsInput,
} from '@utils/models/lend/mortgageToken';

// @utils/signatures/lend
import { getUpdateBaseURISignatures, getUpdateFeeRateSignatures } from '@utils/signatures/lend/mortgageToken';

// @utils/transaction/land
import { getCommissionTokenTx_RegisterBroker } from '@utils/transaction/land/commissionToken';
import {
    getEstateTokenTxByInput_AuthorizeTokenizers,
    getCallEstateTokenTx_TokenizeEstate,
    getEstateTokenTxByInput_RegisterCustodian,
    getEstateTokenTxByInput_UpdateCommissionToken,
    getEstateTokenTxByInput_UpdateZoneRoyaltyRate,
} from '@utils/transaction/land/estateToken';
import { EstateBorrowParams } from '@utils/models/lend/estateMortgageToken';

// @utils/transaction/lend
import { getEstateMortgageTokenTx_Borrow } from '@utils/transaction/lend/estateMortgageToken';
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
    getMortgageTokenTxByInput_UpdateBaseURI,
    getMortgageTokenTx_UpdateFeeRate,
    getMortgageTokenTxByInput_UpdateFeeRate,
} from '@utils/transaction/lend/mortgageToken';

// @utils/transaction/common
import {
    getAdminTxByInput_ActivateIn,
    getAdminTxByInput_AuthorizeManagers,
    getAdminTxByInput_AuthorizeModerators,
    getAdminTxByInput_DeclareZone,
    getAdminTxByInput_UpdateCurrencyRegistries,
} from '@utils/transaction/common/admin';
import { getPausableTxByInput_Pause } from '@utils/transaction/common/pausable';

async function testReentrancy_estateMortgageToken(
    estateMortgageToken: EstateMortgageToken,
    reentrancyContract: Contract,
    assertion: any
) {
    let data = [
        estateMortgageToken.interface.encodeFunctionData('lend', [0]),
        estateMortgageToken.interface.encodeFunctionData('repay', [0]),
        estateMortgageToken.interface.encodeFunctionData('safeLend', [0, 0]),
        estateMortgageToken.interface.encodeFunctionData('safeRepay', [0, 0]),
        estateMortgageToken.interface.encodeFunctionData('foreclose', [0]),
    ];

    await testReentrancy(reentrancyContract, estateMortgageToken, data, assertion);
}

interface EstateMortgageTokenFixture {
    deployer: any;
    admins: any[];
    lender1: any;
    lender2: any;
    borrower1: any;
    borrower2: any;
    custodian1: any;
    custodian2: any;
    broker1: any;
    broker2: any;
    manager: any;
    moderator: any;
    user: any;
    estateMortgageTokenOwner: any;
    validator: MockValidator;

    admin: Admin;
    currency: Currency;
    feeReceiver: FeeReceiver;
    priceWatcher: PriceWatcher;
    reserveVault: ReserveVault;
    estateToken: MockContract<MockEstateToken>;
    commissionToken: MockContract<CommissionToken>;
    estateMortgageToken: EstateMortgageToken;
    estateForger: MockContract<MockEstateForger>;

    zone1: string;
    zone2: string;
}

describe('3.2. EstateMortgageToken', async () => {
    async function estateMortgageTokenFixture(): Promise<EstateMortgageTokenFixture> {
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
            estateMortgageTokenOwner,
            custodian1,
            custodian2,
            broker1,
            broker2,
        ] = await ethers.getSigners();
        const admins = [admin1, admin2, admin3, admin4, admin5];

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

        const validator = new MockValidator(deployer as any);

        const currency = (await deployCurrency(deployer.address, 'MockCurrency', 'MCK')) as Currency;

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

        const MockCommissionTokenFactory = await smock.mock<CommissionToken__factory>('CommissionToken');
        const commissionToken = await MockCommissionTokenFactory.deploy();
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

        const MockEstateForgerFactory = await smock.mock<MockEstateForger__factory>('MockEstateForger');
        const estateForger = await MockEstateForgerFactory.deploy();
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

        const estateMortgageToken = (await deployEstateMortgageToken(
            deployer.address,
            admin.address,
            estateToken.address,
            feeReceiver.address,
            LendInitialization.ESTATE_MORTGAGE_TOKEN_Name,
            LendInitialization.ESTATE_MORTGAGE_TOKEN_Symbol,
            LendInitialization.ESTATE_MORTGAGE_TOKEN_BaseURI,
            LendInitialization.ESTATE_MORTGAGE_TOKEN_FeeRate
        )) as EstateMortgageToken;

        const zone1 = ethers.utils.formatBytes32String('TestZone1');
        const zone2 = ethers.utils.formatBytes32String('TestZone2');

        return {
            admin,
            feeReceiver,
            priceWatcher,
            reserveVault,
            currency,
            estateToken,
            commissionToken,
            estateMortgageToken,
            estateForger,
            validator,
            deployer,
            admins,
            manager,
            moderator,
            lender1,
            lender2,
            borrower1,
            borrower2,
            custodian1,
            custodian2,
            broker1,
            broker2,
            user,
            estateMortgageTokenOwner,
            zone1,
            zone2,
        };
    }

    async function beforeEstateMortgageTokenTest({
        skipSetApprovalForAll = false,
        skipListSampleCurrencies = false,
        skipListEstateToken = false,
        listSampleMortgage = false,
        listSampleLending = false,
        pause = false,
    } = {}): Promise<EstateMortgageTokenFixture> {
        const fixture = await loadFixture(estateMortgageTokenFixture);

        const {
            deployer,
            admin,
            admins,
            currency,
            estateToken,
            commissionToken,
            estateMortgageToken,
            borrower1,
            borrower2,
            lender1,
            lender2,
            broker1,
            broker2,
            estateForger,
            manager,
            moderator,
            custodian1,
            custodian2,
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

        if (!skipListEstateToken) {
            currentTimestamp += 1000;

            await time.setNextBlockTimestamp(currentTimestamp);

            await callTransaction(
                getCallEstateTokenTx_TokenizeEstate(estateToken as any, estateForger, {
                    totalSupply: BigNumber.from(1e9),
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
                    totalSupply: BigNumber.from(1e9),
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

            await estateToken.mint(borrower1.address, 1, 200_000);
            await estateToken.mint(borrower2.address, 1, 300_000);

            await estateToken.mint(borrower1.address, 2, 200);
            await estateToken.mint(borrower2.address, 2, 300);
        }

        if (!skipSetApprovalForAll) {
            await estateToken.connect(borrower1).setApprovalForAll(estateMortgageToken.address, true);
            await estateToken.connect(borrower2).setApprovalForAll(estateMortgageToken.address, true);
        }

        if (listSampleMortgage) {
            await callTransaction(
                getEstateMortgageTokenTx_Borrow(estateMortgageToken, borrower1, {
                    estateId: BigNumber.from(1),
                    amount: BigNumber.from(150_000),
                    principal: BigNumber.from(10e5),
                    repayment: BigNumber.from(11e5),
                    currency: ethers.constants.AddressZero,
                    duration: 1000,
                })
            );
            await callTransaction(estateToken.connect(borrower1).setApprovalForAll(estateMortgageToken.address, true));

            await callTransaction(
                getEstateMortgageTokenTx_Borrow(estateMortgageToken, borrower2, {
                    estateId: BigNumber.from(2),
                    amount: BigNumber.from(200),
                    principal: BigNumber.from(100000),
                    repayment: BigNumber.from(110000),
                    currency: currency.address,
                    duration: 1000,
                })
            );
            await callTransaction(estateToken.connect(borrower2).setApprovalForAll(estateMortgageToken.address, true));

            await prepareERC20(currency, [borrower1, borrower2, lender1, lender2], [estateMortgageToken], 1e9);
        }

        if (listSampleLending) {
            currentTimestamp += 100;
            await time.setNextBlockTimestamp(currentTimestamp);
            await callTransaction(
                getMortgageTokenTx_Lend(estateMortgageToken, lender1, { mortgageId: BigNumber.from(1) }, { value: 1e9 })
            );

            currentTimestamp += 100;
            await time.setNextBlockTimestamp(currentTimestamp);
            await callTransaction(
                getMortgageTokenTx_Lend(estateMortgageToken, lender2, {
                    mortgageId: BigNumber.from(2),
                })
            );
        }

        if (pause) {
            await callTransaction(getPausableTxByInput_Pause(estateMortgageToken, deployer, admin, admins));
        }

        return {
            ...fixture,
        };
    }

    /* --- Initialization --- */
    describe('3.2.1. initialize(address,address,string,string,string,uint256)', async () => {
        it('3.2.1.1. Deploy successfully', async () => {
            const { admin, estateToken, feeReceiver, commissionToken, estateMortgageToken } =
                await beforeEstateMortgageTokenTest();

            const tx = estateMortgageToken.deployTransaction;
            await expect(tx)
                .to.emit(estateMortgageToken, 'BaseURIUpdate')
                .withArgs(LendInitialization.ESTATE_MORTGAGE_TOKEN_BaseURI);
            await expect(tx)
                .to.emit(estateMortgageToken, 'FeeRateUpdate')
                .withArgs((rate: any) => {
                    expect(structToObject(rate)).to.deep.equal({
                        value: LendInitialization.ESTATE_MORTGAGE_TOKEN_FeeRate,
                        decimals: Constant.COMMON_RATE_DECIMALS,
                    });
                    return true;
                });

            expect(await estateMortgageToken.mortgageNumber()).to.equal(0);

            const feeRate = await estateMortgageToken.getFeeRate();
            expect(structToObject(feeRate)).to.deep.equal({
                value: LendInitialization.ESTATE_MORTGAGE_TOKEN_FeeRate,
                decimals: Constant.COMMON_RATE_DECIMALS,
            });

            expect(await estateMortgageToken.admin()).to.equal(admin.address);
            expect(await estateMortgageToken.estateToken()).to.equal(estateToken.address);
            expect(await estateMortgageToken.feeReceiver()).to.equal(feeReceiver.address);
            expect(await estateMortgageToken.commissionToken()).to.equal(commissionToken.address);
        });

        it('3.2.1.2. Deploy unsuccessfully with invalid fee rate', async () => {
            const { deployer, admin, estateToken, feeReceiver } =
                await beforeEstateMortgageTokenTest();

            const EstateMortgageToken = await ethers.getContractFactory('EstateMortgageToken', deployer);

            await expect(
                upgrades.deployProxy(EstateMortgageToken, [
                    admin.address,
                    estateToken.address,
                    feeReceiver.address,
                    LendInitialization.ESTATE_MORTGAGE_TOKEN_Name,
                    LendInitialization.ESTATE_MORTGAGE_TOKEN_Symbol,
                    LendInitialization.ESTATE_MORTGAGE_TOKEN_BaseURI,
                    Constant.COMMON_RATE_MAX_FRACTION.add(1),
                ])
            ).to.be.reverted;
        });
    });

    /* --- Administration --- */
    describe('3.2.2. updateBaseURI(string,bytes[])', async () => {
        it('3.2.2.1. Update base URI successfully with valid signatures', async () => {
            const { deployer, estateMortgageToken, admin, admins } = await beforeEstateMortgageTokenTest({
                listSampleMortgage: true,
                listSampleLending: true,
            });

            const paramsInput: UpdateBaseURIParamsInput = {
                uri: 'NewBaseURI:',
            };
            const tx = await getMortgageTokenTxByInput_UpdateBaseURI(
                estateMortgageToken as any,
                deployer,
                paramsInput,
                admin,
                admins
            );
            await tx.wait();

            await expect(tx).to.emit(estateMortgageToken, 'BaseURIUpdate').withArgs('NewBaseURI:');

            expect(await estateMortgageToken.tokenURI(1)).to.equal('NewBaseURI:1');
            expect(await estateMortgageToken.tokenURI(2)).to.equal('NewBaseURI:2');
        });

        it('3.2.2.2. Update base URI unsuccessfully with invalid signatures', async () => {
            const { deployer, estateMortgageToken, admin, admins } = await beforeEstateMortgageTokenTest();

            const paramsInput: UpdateBaseURIParamsInput = {
                uri: 'NewBaseURI:',
            };
            const params: UpdateBaseURIParams = {
                ...paramsInput,
                signatures: await getUpdateBaseURISignatures(
                    estateMortgageToken as any,
                    paramsInput,
                    admin,
                    admins,
                    false
                ),
            };
            await expect(
                getMortgageTokenTx_UpdateBaseURI(estateMortgageToken as any, deployer, params)
            ).to.be.revertedWithCustomError(admin, 'FailedVerification');
        });
    });

    describe('3.2.3. updateFeeRate(uint256,bytes[])', async () => {
        it('3.2.3.1. Update fee rate successfully with valid signatures', async () => {
            const { deployer, estateMortgageToken, admin, admins } = await beforeEstateMortgageTokenTest();

            const paramsInput: UpdateFeeRateParamsInput = {
                feeRate: ethers.utils.parseEther('0.2'),
            };
            const tx = await getMortgageTokenTxByInput_UpdateFeeRate(
                estateMortgageToken as any,
                deployer,
                paramsInput,
                admin,
                admins
            );
            await tx.wait();

            await expect(tx)
                .to.emit(estateMortgageToken, 'FeeRateUpdate')
                .withArgs((rate: any) => {
                    expect(structToObject(rate)).to.deep.equal({
                        value: paramsInput.feeRate,
                        decimals: Constant.COMMON_RATE_DECIMALS,
                    });
                    return true;
                });

            const feeRate = await estateMortgageToken.getFeeRate();
            expect(structToObject(feeRate)).to.deep.equal({
                value: paramsInput.feeRate,
                decimals: Constant.COMMON_RATE_DECIMALS,
            });
        });

        it('3.2.3.2. Update fee rate unsuccessfully with invalid signatures', async () => {
            const { deployer, estateMortgageToken, admin, admins } = await beforeEstateMortgageTokenTest();

            const paramsInput: UpdateFeeRateParamsInput = {
                feeRate: ethers.utils.parseEther('0.2'),
            };
            const params: UpdateFeeRateParams = {
                ...paramsInput,
                signatures: await getUpdateFeeRateSignatures(
                    estateMortgageToken as any,
                    paramsInput,
                    admin,
                    admins,
                    false
                ),
            };
            await expect(
                getMortgageTokenTx_UpdateFeeRate(estateMortgageToken as any, deployer, params)
            ).to.be.revertedWithCustomError(admin, 'FailedVerification');
        });

        it('3.2.3.3. Update fee rate unsuccessfully with invalid rate', async () => {
            const { deployer, estateMortgageToken, admin, admins } = await beforeEstateMortgageTokenTest();

            const paramsInput: UpdateFeeRateParamsInput = {
                feeRate: Constant.COMMON_RATE_MAX_FRACTION.add(1),
            };
            const params: UpdateFeeRateParams = {
                ...paramsInput,
                signatures: await getUpdateFeeRateSignatures(estateMortgageToken as any, paramsInput, admin, admins),
            };
            await expect(
                getMortgageTokenTx_UpdateFeeRate(estateMortgageToken as any, deployer, params)
            ).to.be.revertedWithCustomError(estateMortgageToken, 'InvalidRate');
        });
    });

    /* --- Query --- */
    describe('3.2.4. getMortgage(uint256)', () => {
        it('3.2.4.1. Revert with invalid mortgage id', async () => {
            const fixture = await beforeEstateMortgageTokenTest({
                listSampleMortgage: true,
            });

            const { estateMortgageToken } = fixture;

            await expectRevertWithModifierCustomError(
                estateMortgageToken,
                estateMortgageToken.getMortgage(0),
                'InvalidMortgageId'
            );
            await expectRevertWithModifierCustomError(
                estateMortgageToken,
                estateMortgageToken.getMortgage(100),
                'InvalidMortgageId'
            );
        });
    });

    describe('3.2.5. getCollateral(uint256)', () => {
        it('3.2.5.1. Revert with invalid mortgage id', async () => {
            const fixture = await beforeEstateMortgageTokenTest({
                listSampleMortgage: true,
            });

            const { estateMortgageToken } = fixture;

            await expectRevertWithModifierCustomError(
                estateMortgageToken,
                estateMortgageToken.getCollateral(0),
                'InvalidMortgageId'
            );
            await expectRevertWithModifierCustomError(
                estateMortgageToken,
                estateMortgageToken.getCollateral(100),
                'InvalidMortgageId'
            );
        });
    });

    describe('3.2.6. royaltyInfo(uint256,uint256)', () => {
        it('3.2.6.1. Return correct royalty info', async () => {
            const fixture = await beforeEstateMortgageTokenTest({
                listSampleMortgage: true,
                listSampleLending: true,
            });
            const { deployer, estateMortgageToken, feeReceiver, estateToken, admin, admins, zone1, zone2 } = fixture;

            const zone1RoyaltyRate = ethers.utils.parseEther('0.1');
            const zone2RoyaltyRate = ethers.utils.parseEther('0.2');

            await callTransaction(
                getEstateTokenTxByInput_UpdateZoneRoyaltyRate(
                    estateToken as any,
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
                getEstateTokenTxByInput_UpdateZoneRoyaltyRate(
                    estateToken as any,
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

            const royaltyInfo1 = await estateMortgageToken.royaltyInfo(1, salePrice);
            const royaltyFee1 = salePrice.mul(zone1RoyaltyRate).div(Constant.COMMON_RATE_MAX_FRACTION);
            expect(royaltyInfo1[0]).to.equal(feeReceiver.address);
            expect(royaltyInfo1[1]).to.equal(royaltyFee1);

            const royaltyInfo2 = await estateMortgageToken.royaltyInfo(2, salePrice);
            const royaltyFee2 = salePrice.mul(zone2RoyaltyRate).div(Constant.COMMON_RATE_MAX_FRACTION);
            expect(royaltyInfo2[0]).to.equal(feeReceiver.address);
            expect(royaltyInfo2[1]).to.equal(royaltyFee2);
        });

        it('3.2.6.2. Revert with invalid token id', async () => {
            const fixture = await beforeEstateMortgageTokenTest({
                listSampleMortgage: true,
            });
            const { estateMortgageToken } = fixture;

            const salePrice = ethers.utils.parseEther('10');

            await expect(estateMortgageToken.royaltyInfo(0, salePrice)).to.be.revertedWith('ERC721: invalid token ID');
            await expect(estateMortgageToken.royaltyInfo(100, salePrice)).to.be.revertedWith(
                'ERC721: invalid token ID'
            );

            await expect(estateMortgageToken.royaltyInfo(1, salePrice)).to.be.revertedWith('ERC721: invalid token ID');
            await expect(estateMortgageToken.royaltyInfo(2, salePrice)).to.be.revertedWith('ERC721: invalid token ID');
        });
    });

    describe('3.2.7. supportsInterface(bytes4)', () => {
        it('3.2.7.1. Return true for appropriate interface', async () => {
            const fixture = await beforeEstateMortgageTokenTest();
            const { estateMortgageToken } = fixture;

            expect(await estateMortgageToken.supportsInterface(getBytes4Hex(IAssetMortgageTokenInterfaceId))).to.equal(true);
            expect(await estateMortgageToken.supportsInterface(getBytes4Hex(IEstateTokenReceiverInterfaceId))).to.equal(
                true
            );
            expect(await estateMortgageToken.supportsInterface(getBytes4Hex(IMortgageTokenInterfaceId))).to.equal(true);

            expect(await estateMortgageToken.supportsInterface(getBytes4Hex(IERC165UpgradeableInterfaceId))).to.equal(
                true
            );
            expect(
                await estateMortgageToken.supportsInterface(getBytes4Hex(IERC721MetadataUpgradeableInterfaceId))
            ).to.equal(true);
            expect(await estateMortgageToken.supportsInterface(getBytes4Hex(IERC2981UpgradeableInterfaceId))).to.equal(
                true
            );
        });
    });

    /* --- Command --- */
    describe('3.2.8. borrow(uint256,uint256,uint256,uint256,address,uint40)', async () => {
        async function beforeBorrowTest(
            fixture: EstateMortgageTokenFixture
        ): Promise<{ defaultParams: EstateBorrowParams }> {
            return {
                defaultParams: {
                    estateId: BigNumber.from(1),
                    amount: BigNumber.from(150_000),
                    principal: BigNumber.from(10e5),
                    repayment: BigNumber.from(11e5),
                    currency: ethers.constants.AddressZero,
                    duration: 1000,
                },
            };
        }

        it('3.2.8.1. Create mortgage successfully', async () => {
            const fixture = await beforeEstateMortgageTokenTest();
            const { estateMortgageToken, admin, borrower1, borrower2, currency, estateToken } = fixture;

            const params1: EstateBorrowParams = {
                estateId: BigNumber.from(1),
                amount: BigNumber.from(150_000),
                principal: BigNumber.from(10e5),
                repayment: BigNumber.from(11e5),
                currency: ethers.constants.AddressZero,
                duration: 1000,
            };

            let initBorrower1Estate1Balance = await estateToken.balanceOf(borrower1.address, 1);
            let initEstateMortgageTokenEstate1Balance = await estateToken.balanceOf(estateMortgageToken.address, 1);

            const tx1 = await getEstateMortgageTokenTx_Borrow(estateMortgageToken, borrower1, params1);
            await tx1.wait();

            const mortgage1 = await estateMortgageToken.getMortgage(1);
            const fee1 = scaleRate(mortgage1.principal, await estateMortgageToken.getFeeRate());

            await expect(tx1)
                .to.emit(estateMortgageToken, 'NewMortgage')
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
                .to.emit(estateMortgageToken, 'NewCollateral')
                .withArgs(1, params1.estateId, params1.amount);

            expect(await estateMortgageToken.mortgageNumber()).to.equal(1);

            const collateral1 = await estateMortgageToken.getCollateral(1);
            expect(collateral1.tokenId).to.equal(params1.estateId);
            expect(collateral1.amount).to.equal(params1.amount);

            expect(mortgage1.principal).to.equal(params1.principal);
            expect(mortgage1.repayment).to.equal(params1.repayment);
            expect(mortgage1.fee).to.equal(fee1);
            expect(mortgage1.currency).to.equal(params1.currency);
            expect(mortgage1.due).to.equal(params1.duration);
            expect(mortgage1.state).to.equal(MortgageState.Pending);
            expect(mortgage1.borrower).to.equal(borrower1.address);
            expect(mortgage1.lender).to.equal(ethers.constants.AddressZero);

            expect(await estateToken.balanceOf(borrower1.address, 1)).to.equal(
                initBorrower1Estate1Balance.sub(params1.amount)
            );
            expect(await estateToken.balanceOf(estateMortgageToken.address, 1)).to.equal(
                initEstateMortgageTokenEstate1Balance.add(params1.amount)
            );

            const params2: EstateBorrowParams = {
                estateId: BigNumber.from(2),
                amount: BigNumber.from(200),
                principal: BigNumber.from(100000),
                repayment: BigNumber.from(110000),
                currency: currency.address,
                duration: 1000,
            };

            let initBorrower2Estate2Balance = await estateToken.balanceOf(borrower2.address, 2);
            let initEstateMortgageTokenEstate2Balance = await estateToken.balanceOf(estateMortgageToken.address, 2);

            const tx2 = await getEstateMortgageTokenTx_Borrow(estateMortgageToken, borrower2, params2);
            await tx2.wait();

            const mortgage2 = await estateMortgageToken.getMortgage(2);
            const fee2 = await applyDiscount(
                admin,
                scaleRate(mortgage2.principal, await estateMortgageToken.getFeeRate()),
                currency
            );

            await expect(tx2)
                .to.emit(estateMortgageToken, 'NewMortgage')
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
                .to.emit(estateMortgageToken, 'NewCollateral')
                .withArgs(2, params2.estateId, params2.amount);

            expect(await estateMortgageToken.mortgageNumber()).to.equal(2);

            const collateral2 = await estateMortgageToken.getCollateral(2);
            expect(collateral2.tokenId).to.equal(params2.estateId);
            expect(collateral2.amount).to.equal(params2.amount);

            expect(mortgage2.principal).to.equal(params2.principal);
            expect(mortgage2.repayment).to.equal(params2.repayment);
            expect(mortgage2.fee).to.equal(fee2);
            expect(mortgage2.currency).to.equal(params2.currency);
            expect(mortgage2.due).to.equal(params2.duration);
            expect(mortgage2.state).to.equal(MortgageState.Pending);
            expect(mortgage2.borrower).to.equal(borrower2.address);
            expect(mortgage2.lender).to.equal(ethers.constants.AddressZero);

            expect(await estateToken.balanceOf(borrower2.address, 2)).to.equal(
                initBorrower2Estate2Balance.sub(params2.amount)
            );
            expect(await estateToken.balanceOf(estateMortgageToken.address, 2)).to.equal(
                initEstateMortgageTokenEstate2Balance.add(params2.amount)
            );
        });

        it('3.2.8.2. Create mortgage unsuccessfully when paused', async () => {
            const fixture = await beforeEstateMortgageTokenTest({
                pause: true,
            });
            const { estateMortgageToken, borrower1 } = fixture;

            const { defaultParams } = await beforeBorrowTest(fixture);

            await expect(
                getEstateMortgageTokenTx_Borrow(estateMortgageToken, borrower1, defaultParams)
            ).to.be.revertedWith('Pausable: paused');
        });

        it('3.2.8.3. Create mortgage unsuccessfully with invalid estate id', async () => {
            const fixture = await beforeEstateMortgageTokenTest();
            const { estateMortgageToken, estateToken, borrower1 } = fixture;

            const { defaultParams } = await beforeBorrowTest(fixture);

            await expect(
                getEstateMortgageTokenTx_Borrow(estateMortgageToken, borrower1, {
                    ...defaultParams,
                    estateId: BigNumber.from(0),
                })
            ).to.be.revertedWithCustomError(estateMortgageToken, 'InvalidTokenId');

            await expect(
                getEstateMortgageTokenTx_Borrow(estateMortgageToken, borrower1, {
                    ...defaultParams,
                    estateId: BigNumber.from(3),
                })
            ).to.be.revertedWithCustomError(estateMortgageToken, 'InvalidTokenId');

            estateToken.isAvailable.whenCalledWith(1).returns(false);

            await expect(
                getEstateMortgageTokenTx_Borrow(estateMortgageToken, borrower1, {
                    ...defaultParams,
                    estateId: BigNumber.from(1),
                })
            ).to.be.revertedWithCustomError(estateMortgageToken, 'InvalidTokenId');
        });

        it('3.2.8.4. Create mortgage unsuccessfully with invalid currency', async () => {
            const fixture = await beforeEstateMortgageTokenTest({
                skipListSampleCurrencies: true,
            });
            const { estateMortgageToken, borrower1 } = fixture;
            const { defaultParams } = await beforeBorrowTest(fixture);

            await expect(
                getEstateMortgageTokenTx_Borrow(estateMortgageToken, borrower1, defaultParams)
            ).to.be.revertedWithCustomError(estateMortgageToken, 'InvalidCurrency');
        });

        it('3.2.8.5. Create mortgage unsuccessfully with zero amount', async () => {
            const fixture = await beforeEstateMortgageTokenTest();
            const { estateMortgageToken, borrower1 } = fixture;
            const { defaultParams } = await beforeBorrowTest(fixture);

            await expect(
                getEstateMortgageTokenTx_Borrow(estateMortgageToken, borrower1, {
                    ...defaultParams,
                    amount: BigNumber.from(0),
                })
            ).to.be.revertedWithCustomError(estateMortgageToken, 'InvalidInput');
        });

        it('3.2.8.6. Create mortgage unsuccessfully with amount more than balance', async () => {
            const fixture = await beforeEstateMortgageTokenTest();
            const { estateMortgageToken, estateToken, borrower1 } = fixture;
            const { defaultParams } = await beforeBorrowTest(fixture);

            const borrowerBalance = await estateToken.balanceOf(borrower1.address, defaultParams.estateId);

            await expect(
                getEstateMortgageTokenTx_Borrow(estateMortgageToken, borrower1, {
                    ...defaultParams,
                    amount: borrowerBalance.add(1),
                })
            ).to.be.revertedWithCustomError(estateMortgageToken, 'InvalidCollateral');
        });

        it('3.2.8.7. Create mortgage unsuccessfully with invalid principal', async () => {
            const fixture = await beforeEstateMortgageTokenTest();
            const { estateMortgageToken, borrower1 } = fixture;
            const { defaultParams } = await beforeBorrowTest(fixture);

            await expect(
                getEstateMortgageTokenTx_Borrow(estateMortgageToken, borrower1, {
                    ...defaultParams,
                    principal: BigNumber.from(0),
                })
            ).to.be.revertedWithCustomError(estateMortgageToken, 'InvalidPrincipal');
        });

        it('3.2.8.8. Create mortgage unsuccessfully with invalid repayment', async () => {
            const fixture = await beforeEstateMortgageTokenTest();
            const { estateMortgageToken, borrower1 } = fixture;
            const { defaultParams } = await beforeBorrowTest(fixture);

            await expect(
                getEstateMortgageTokenTx_Borrow(estateMortgageToken, borrower1, {
                    ...defaultParams,
                    repayment: defaultParams.principal.sub(1),
                })
            ).to.be.revertedWithCustomError(estateMortgageToken, 'InvalidRepayment');
        });
    });

    describe('3.2.9. cancel(uint256)', async () => {
        it('3.2.9.1. Cancel mortgage successfully by borrower', async () => {
            const fixture = await beforeEstateMortgageTokenTest({
                listSampleMortgage: true,
            });
            const { estateMortgageToken, borrower1 } = fixture;

            let tx = await getMortgageTokenTx_Cancel(estateMortgageToken, borrower1, {
                mortgageId: BigNumber.from(1),
            });
            await tx.wait();

            expect(tx).to.emit(estateMortgageToken, 'MortgageCancellation').withArgs(1);

            expect(await estateMortgageToken.mortgageNumber()).to.equal(2);

            const mortgage = await estateMortgageToken.getMortgage(1);
            expect(mortgage.state).to.equal(MortgageState.Cancelled);
        });

        it('3.2.9.2. Cancel mortgage successfully by manager', async () => {
            const fixture = await beforeEstateMortgageTokenTest({
                listSampleMortgage: true,
            });
            const { estateMortgageToken, manager } = fixture;

            let tx = await getMortgageTokenTx_Cancel(estateMortgageToken, manager, {
                mortgageId: BigNumber.from(2),
            });
            await tx.wait();

            expect(tx).to.emit(estateMortgageToken, 'MortgageCancellation').withArgs(2);

            expect(await estateMortgageToken.mortgageNumber()).to.equal(2);

            const mortgage = await estateMortgageToken.getMortgage(2);
            expect(mortgage.state).to.equal(MortgageState.Cancelled);
        });

        it('3.2.9.3. Cancel mortgage unsuccessfully by unauthorized user', async () => {
            const fixture = await beforeEstateMortgageTokenTest({
                listSampleMortgage: true,
            });
            const { estateMortgageToken, lender1, moderator } = fixture;
            await expect(
                getMortgageTokenTx_Cancel(estateMortgageToken, lender1, {
                    mortgageId: BigNumber.from(1),
                })
            ).to.be.revertedWithCustomError(estateMortgageToken, 'Unauthorized');
            await expect(
                getMortgageTokenTx_Cancel(estateMortgageToken, moderator, {
                    mortgageId: BigNumber.from(1),
                })
            ).to.be.revertedWithCustomError(estateMortgageToken, 'Unauthorized');
        });

        it('3.2.9.4. Cancel mortgage unsuccessfully with invalid mortgage id', async () => {
            const fixture = await beforeEstateMortgageTokenTest({
                listSampleMortgage: true,
            });
            const { estateMortgageToken, borrower1 } = fixture;
            await expect(
                getMortgageTokenTx_Cancel(estateMortgageToken, borrower1, {
                    mortgageId: BigNumber.from(0),
                })
            ).to.be.revertedWithCustomError(estateMortgageToken, 'InvalidMortgageId');

            await expect(
                getMortgageTokenTx_Cancel(estateMortgageToken, borrower1, {
                    mortgageId: BigNumber.from(3),
                })
            ).to.be.revertedWithCustomError(estateMortgageToken, 'InvalidMortgageId');
        });

        it('3.2.9.5. Cancel mortgage unsuccessfully with cancelled mortgage', async () => {
            const fixture = await beforeEstateMortgageTokenTest({
                listSampleMortgage: true,
            });
            const { estateMortgageToken, borrower1 } = fixture;
            await callTransaction(
                getMortgageTokenTx_Cancel(estateMortgageToken, borrower1, {
                    mortgageId: BigNumber.from(1),
                })
            );

            await expect(
                getMortgageTokenTx_Cancel(estateMortgageToken, borrower1, {
                    mortgageId: BigNumber.from(1),
                })
            ).to.be.revertedWithCustomError(estateMortgageToken, 'InvalidCancelling');
        });

        it('3.2.9.6. Cancel mortgage unsuccessfully with supplied mortgage', async () => {
            const fixture = await beforeEstateMortgageTokenTest({
                listSampleMortgage: true,
            });
            const { estateMortgageToken, borrower1, lender1 } = fixture;

            await callTransaction(
                getMortgageTokenTx_Lend(estateMortgageToken, lender1, { mortgageId: BigNumber.from(1) }, { value: 1e9 })
            );

            await expect(
                getMortgageTokenTx_Cancel(estateMortgageToken, borrower1, {
                    mortgageId: BigNumber.from(1),
                })
            ).to.be.revertedWithCustomError(estateMortgageToken, 'InvalidCancelling');
        });

        it('3.2.9.7. Cancel mortgage unsuccessfully with foreclosed mortgage', async () => {
            const fixture = await beforeEstateMortgageTokenTest({
                listSampleMortgage: true,
            });
            const { estateMortgageToken, borrower1, lender1 } = fixture;

            await callTransaction(
                getMortgageTokenTx_Lend(estateMortgageToken, lender1, { mortgageId: BigNumber.from(1) }, { value: 1e9 })
            );

            const due = (await estateMortgageToken.getMortgage(1)).due;

            await time.setNextBlockTimestamp(due);
            await callTransaction(
                getMortgageTokenTx_Foreclose(estateMortgageToken, lender1, {
                    mortgageId: BigNumber.from(1),
                })
            );

            await expect(
                getMortgageTokenTx_Cancel(estateMortgageToken, borrower1, {
                    mortgageId: BigNumber.from(1),
                })
            ).to.be.revertedWithCustomError(estateMortgageToken, 'InvalidCancelling');
        });

        it('3.2.9.8. Cancel mortgage unsuccessfully with repaid mortgage', async () => {
            const fixture = await beforeEstateMortgageTokenTest({
                listSampleMortgage: true,
            });
            const { estateMortgageToken, borrower1, lender1 } = fixture;

            await callTransaction(
                getMortgageTokenTx_Lend(estateMortgageToken, lender1, { mortgageId: BigNumber.from(1) }, { value: 1e9 })
            );

            await callTransaction(
                getMortgageTokenTx_Repay(
                    estateMortgageToken,
                    borrower1,
                    { mortgageId: BigNumber.from(1) },
                    { value: 1e9 }
                )
            );

            await expect(
                getMortgageTokenTx_Cancel(estateMortgageToken, borrower1, {
                    mortgageId: BigNumber.from(1),
                })
            ).to.be.revertedWithCustomError(estateMortgageToken, 'InvalidCancelling');
        });
    });

    describe('3.2.10. lend(uint256)', async () => {
        async function testLend(
            fixture: EstateMortgageTokenFixture,
            currencyExclusiveRate: BigNumber,
            commissionTokenRate: BigNumber,
            estateMortgageTokenFeeRate: BigNumber,
            isERC20: boolean,
            isExclusive: boolean,
            initialAmount: BigNumber,
            amount: BigNumber,
            principal: BigNumber,
            repayment: BigNumber
        ) {
            const {
                estateMortgageToken,
                admin,
                admins,
                commissionToken,
                deployer,
                estateToken,
                estateForger,
                borrower1,
                lender1,
                feeReceiver,
                custodian1,
                manager,
                zone1,
            } = fixture;

            const currentMortgageId = (await estateMortgageToken.mortgageNumber()).add(1);
            const currentTokenizationId = 0; // Does not matter
            const zone = zone1;
            const borrower = borrower1;
            const lender = lender1;
            const broker = randomWallet();

            await callTransaction(
                getMortgageTokenTxByInput_UpdateFeeRate(
                    estateMortgageToken as any,
                    deployer,
                    { feeRate: estateMortgageTokenFeeRate },
                    admin,
                    admins
                )
            );

            await callTransaction(
                getCommissionTokenTx_RegisterBroker(commissionToken as any, manager, {
                    zone,
                    broker: broker.address,
                    commissionRate: commissionTokenRate,
                })
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
                getCallEstateTokenTx_TokenizeEstate(estateToken as any, estateForger, {
                    totalSupply: BigNumber.from(0),
                    zone,
                    tokenizationId: BigNumber.from(currentTokenizationId),
                    uri: 'TestURI',
                    expireAt: currentTimestamp + 1e9,
                    custodian: custodian1.address,
                    broker: broker.address,
                })
            );

            const currentTokenId = await estateToken.estateNumber();

            await callTransaction(estateToken.mint(borrower.address, currentTokenId, initialAmount));
            await callTransaction(estateToken.connect(borrower).setApprovalForAll(estateMortgageToken.address, true));

            const walletsToReset = [feeReceiver, broker];
            if (isERC20) {
                await resetERC20(newCurrency!, walletsToReset);
            } else {
                await resetNativeToken(ethers.provider, walletsToReset);
            }

            const due = 1000;

            await callTransaction(
                getEstateMortgageTokenTx_Borrow(estateMortgageToken, borrower, {
                    estateId: currentMortgageId,
                    amount,
                    principal,
                    repayment,
                    currency: newCurrencyAddress,
                    duration: due,
                })
            );

            let fee = principal.mul(estateMortgageTokenFeeRate).div(Constant.COMMON_RATE_MAX_FRACTION);
            if (isExclusive) {
                fee = fee.sub(fee.mul(currencyExclusiveRate).div(Constant.COMMON_RATE_MAX_FRACTION));
            }
            let commissionAmount = fee.mul(commissionTokenRate).div(Constant.COMMON_RATE_MAX_FRACTION);

            let ethValue = ethers.BigNumber.from(0);
            await prepareNativeToken(ethers.provider, deployer, [lender], ethers.utils.parseEther('1.0'));
            if (isERC20) {
                await prepareERC20(newCurrency!, [lender], [estateMortgageToken], principal);
            } else {
                ethValue = principal;
                await prepareNativeToken(ethers.provider, deployer, [lender], principal);
            }

            let currentTotalSupply = await estateMortgageToken.totalSupply();

            let initBorrowerBalance = await getBalance(ethers.provider, borrower.address, newCurrency);
            let initLenderBalance = await getBalance(ethers.provider, lender.address, newCurrency);
            let initFeeReceiverBalance = await getBalance(ethers.provider, feeReceiver.address, newCurrency);
            let initBrokerBalance = await getBalance(ethers.provider, broker.address, newCurrency);

            currentTimestamp += 100;
            await time.setNextBlockTimestamp(currentTimestamp);

            let tx = await getMortgageTokenTx_Lend(
                estateMortgageToken,
                lender,
                { mortgageId: currentMortgageId },
                { value: ethValue }
            );
            const receipt = await tx.wait();

            let expectedBorrowerBalance = initBorrowerBalance.add(principal).sub(fee);
            let expectedLenderBalance = initLenderBalance.sub(principal);
            let expectedFeeReceiverBalance = initFeeReceiverBalance.add(fee.sub(commissionAmount));
            let expectedBrokerBalance = initBrokerBalance.add(commissionAmount);

            if (!isERC20) {
                const gasFee = receipt.gasUsed.mul(receipt.effectiveGasPrice);
                expectedLenderBalance = expectedLenderBalance.sub(gasFee);
            }

            await expect(tx)
                .to.emit(estateMortgageToken, 'NewToken')
                .withArgs(currentMortgageId, lender.address, currentTimestamp + due);
            await expect(tx)
                .to.emit(estateMortgageToken, 'CommissionDispatch')
                .withArgs(broker.address, commissionAmount, newCurrencyAddress);

            const mortgage = await estateMortgageToken.getMortgage(currentMortgageId);
            expect(mortgage.due).to.equal(currentTimestamp + due);
            expect(mortgage.state).to.equal(MortgageState.Supplied);
            expect(mortgage.lender).to.equal(lender.address);

            expect(await estateMortgageToken.totalSupply()).to.equal(currentTotalSupply.add(1));

            expect(await getBalance(ethers.provider, borrower.address, newCurrency)).to.equal(expectedBorrowerBalance);
            expect(await getBalance(ethers.provider, lender.address, newCurrency)).to.equal(expectedLenderBalance);
            expect(await getBalance(ethers.provider, feeReceiver.address, newCurrency)).to.equal(
                expectedFeeReceiverBalance
            );
            expect(await getBalance(ethers.provider, broker.address, newCurrency)).to.equal(expectedBrokerBalance);

            expect(await estateToken.balanceOf(borrower.address, currentTokenId)).to.equal(initialAmount.sub(amount));
            expect(await estateToken.balanceOf(estateMortgageToken.address, currentTokenId)).to.equal(amount);

            expect(await estateMortgageToken.ownerOf(currentMortgageId)).to.equal(lender.address);

            if (isERC20) {
                await resetERC20(newCurrency!, [borrower, lender, feeReceiver, broker]);
            } else {
                await resetNativeToken(ethers.provider, [borrower, lender, feeReceiver, broker]);
                await prepareNativeToken(ethers.provider, deployer, [borrower, lender], ethers.utils.parseEther('1.0'));
            }
        }

        it('3.2.10.1. Lend successfully in native and erc20 token', async () => {
            const fixture = await beforeEstateMortgageTokenTest({
                skipListSampleCurrencies: true,
                skipListEstateToken: true,
            });
            await testLend(
                fixture,
                ethers.utils.parseEther('0.3'),
                ethers.utils.parseEther('0.1'),
                LendInitialization.ESTATE_MORTGAGE_TOKEN_FeeRate,
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
                ethers.utils.parseEther('0.1'),
                LendInitialization.ESTATE_MORTGAGE_TOKEN_FeeRate,
                true,
                true,
                ethers.BigNumber.from(300),
                ethers.BigNumber.from(200),
                ethers.BigNumber.from(100000),
                ethers.BigNumber.from(110000)
            );
        });

        it('3.2.10.2. Lend successfully in all native/erc20 and exclusive/non-exclusive combinations', async () => {
            const fixture = await beforeEstateMortgageTokenTest({
                skipListSampleCurrencies: true,
                skipListEstateToken: true,
            });
            for (const isERC20 of [false, true]) {
                for (const isExclusive of [false, true]) {
                    if (isExclusive && !isERC20) {
                        continue;
                    }
                    await testLend(
                        fixture,
                        ethers.utils.parseEther('0.3'),
                        ethers.utils.parseEther('0.1'),
                        LendInitialization.ESTATE_MORTGAGE_TOKEN_FeeRate,
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

        it('3.2.10.3. Lend successfully with very large amount in all native/erc20 and exclusive/non-exclusive combinations', async () => {
            const fixture = await beforeEstateMortgageTokenTest({
                skipListSampleCurrencies: true,
                skipListEstateToken: true,
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

        it('3.2.10.4. Lend successfully in 100 random test cases', async () => {
            const fixture = await beforeEstateMortgageTokenTest({
                skipListSampleCurrencies: true,
                skipListEstateToken: true,
            });
            for (let testcase = 0; testcase < 100; testcase++) {
                const isERC20 = Math.random() < 0.5;
                const isExclusive = Math.random() < 0.5;
                const feeRate = randomBigNumber(ethers.constants.Zero, ethers.utils.parseEther('1.0'));
                const exclusiveRate = randomBigNumber(ethers.constants.Zero, ethers.utils.parseEther('1.0'));
                const commissionRate = randomBigNumber(ethers.constants.Zero, ethers.utils.parseEther('1.0'));

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
                    commissionRate,
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

        it('3.2.10.5. Lend unsuccessfully when paused', async () => {
            const fixture = await beforeEstateMortgageTokenTest({
                listSampleMortgage: true,
                pause: true,
            });
            const { estateMortgageToken, borrower1 } = fixture;

            await expect(
                getMortgageTokenTx_Lend(
                    estateMortgageToken,
                    borrower1,
                    { mortgageId: BigNumber.from(1) },
                    { value: 1e9 }
                )
            ).to.be.revertedWith('Pausable: paused');
        });

        it('3.2.10.6. Lend unsuccessfully with invalid mortgage id', async () => {
            const fixture = await beforeEstateMortgageTokenTest({
                listSampleMortgage: true,
            });
            const { estateMortgageToken, borrower1 } = fixture;

            await expect(
                getMortgageTokenTx_Lend(
                    estateMortgageToken,
                    borrower1,
                    { mortgageId: BigNumber.from(0) },
                    { value: 1e9 }
                )
            ).to.be.revertedWithCustomError(estateMortgageToken, 'InvalidMortgageId');

            await expect(
                getMortgageTokenTx_Lend(
                    estateMortgageToken,
                    borrower1,
                    { mortgageId: BigNumber.from(3) },
                    { value: 1e9 }
                )
            ).to.be.revertedWithCustomError(estateMortgageToken, 'InvalidMortgageId');
        });

        it('3.2.10.7. Lend unsuccessfully when borrower lend their own mortgage', async () => {
            const fixture = await beforeEstateMortgageTokenTest({
                listSampleMortgage: true,
            });
            const { estateMortgageToken, borrower1, borrower2 } = fixture;

            await expect(
                getMortgageTokenTx_Lend(
                    estateMortgageToken,
                    borrower1,
                    { mortgageId: BigNumber.from(1) },
                    { value: 1e9 }
                )
            ).to.be.revertedWithCustomError(estateMortgageToken, 'InvalidLending');

            await expect(
                getMortgageTokenTx_Lend(
                    estateMortgageToken,
                    borrower2,
                    { mortgageId: BigNumber.from(2) },
                    { value: 1e9 }
                )
            ).to.be.revertedWithCustomError(estateMortgageToken, 'InvalidLending');
        });

        it('3.2.10.8. Lend unsuccessfully with supplied mortgage', async () => {
            const fixture = await beforeEstateMortgageTokenTest({
                listSampleMortgage: true,
            });
            const { estateMortgageToken, lender1, lender2 } = fixture;

            await callTransaction(
                getMortgageTokenTx_Lend(estateMortgageToken, lender1, { mortgageId: BigNumber.from(1) }, { value: 1e9 })
            );

            await expect(
                getMortgageTokenTx_Lend(estateMortgageToken, lender1, { mortgageId: BigNumber.from(1) }, { value: 1e9 })
            ).to.be.revertedWithCustomError(estateMortgageToken, 'InvalidLending');
            await expect(
                getMortgageTokenTx_Lend(estateMortgageToken, lender2, { mortgageId: BigNumber.from(1) }, { value: 1e9 })
            ).to.be.revertedWithCustomError(estateMortgageToken, 'InvalidLending');
        });

        it('3.2.10.9. Lend unsuccessfully with repaid mortgage', async () => {
            const fixture = await beforeEstateMortgageTokenTest({
                listSampleMortgage: true,
            });
            const { estateMortgageToken, borrower1, lender1, lender2 } = fixture;

            await callTransaction(
                getMortgageTokenTx_Lend(estateMortgageToken, lender1, { mortgageId: BigNumber.from(1) }, { value: 1e9 })
            );

            await callTransaction(
                getMortgageTokenTx_Repay(
                    estateMortgageToken,
                    borrower1,
                    { mortgageId: BigNumber.from(1) },
                    { value: 1e9 }
                )
            );

            await expect(
                getMortgageTokenTx_Lend(estateMortgageToken, lender1, { mortgageId: BigNumber.from(1) }, { value: 1e9 })
            ).to.be.revertedWithCustomError(estateMortgageToken, 'InvalidLending');
            await expect(
                getMortgageTokenTx_Lend(estateMortgageToken, lender2, { mortgageId: BigNumber.from(1) }, { value: 1e9 })
            ).to.be.revertedWithCustomError(estateMortgageToken, 'InvalidLending');
        });

        it('3.2.10.10. Lend unsuccessfully with cancelled mortgage', async () => {
            const fixture = await beforeEstateMortgageTokenTest({
                listSampleMortgage: true,
            });
            const { estateMortgageToken, borrower1, lender1 } = fixture;

            await callTransaction(
                getMortgageTokenTx_Cancel(estateMortgageToken, borrower1, {
                    mortgageId: BigNumber.from(1),
                })
            );

            await expect(
                getMortgageTokenTx_Lend(estateMortgageToken, lender1, { mortgageId: BigNumber.from(1) }, { value: 1e9 })
            ).to.be.revertedWithCustomError(estateMortgageToken, 'InvalidLending');
        });

        it('3.2.10.11. Lend unsuccessfully with foreclosed mortgage', async () => {
            const fixture = await beforeEstateMortgageTokenTest({
                listSampleMortgage: true,
            });
            const { estateMortgageToken, lender1, lender2 } = fixture;

            await callTransaction(
                getMortgageTokenTx_Lend(estateMortgageToken, lender1, { mortgageId: BigNumber.from(1) }, { value: 1e9 })
            );

            const due = (await estateMortgageToken.getMortgage(1)).due;
            await time.setNextBlockTimestamp(due);

            await callTransaction(
                getMortgageTokenTx_Foreclose(estateMortgageToken, lender1, {
                    mortgageId: BigNumber.from(1),
                })
            );

            await expect(
                getMortgageTokenTx_Lend(estateMortgageToken, lender1, { mortgageId: BigNumber.from(1) }, { value: 1e9 })
            ).to.be.revertedWithCustomError(estateMortgageToken, 'InvalidLending');
            await expect(
                getMortgageTokenTx_Lend(estateMortgageToken, lender2, { mortgageId: BigNumber.from(1) }, { value: 1e9 })
            ).to.be.revertedWithCustomError(estateMortgageToken, 'InvalidLending');
        });

        it('3.2.10.12. Lend unsuccessfully with insufficient native token', async () => {
            const fixture = await beforeEstateMortgageTokenTest({
                listSampleMortgage: true,
            });
            const { estateMortgageToken, lender1 } = fixture;

            await expect(
                getMortgageTokenTx_Lend(estateMortgageToken, lender1, {
                    mortgageId: BigNumber.from(1),
                })
            ).to.be.revertedWithCustomError(estateMortgageToken, 'InsufficientValue');
        });

        it('3.2.10.13. Lend unsuccessfully when transferring native token to borrower failed', async () => {
            const fixture = await beforeEstateMortgageTokenTest();
            const { estateMortgageToken, lender1, deployer, estateToken } = fixture;

            const failReceiver = await deployFailReceiver(deployer, true, false);

            await callTransaction(estateToken.mint(failReceiver.address, 1, 200_000));
            await callTransaction(
                failReceiver.call(
                    estateToken.address,
                    estateToken.interface.encodeFunctionData('setApprovalForAll', [estateMortgageToken.address, true])
                )
            );

            const data = estateMortgageToken.interface.encodeFunctionData('borrow', [
                1,
                150_000,
                10e5,
                11e5,
                ethers.constants.AddressZero,
                1000,
            ]);
            await callTransaction(failReceiver.call(estateMortgageToken.address, data));

            await expect(
                getMortgageTokenTx_Lend(estateMortgageToken, lender1, { mortgageId: BigNumber.from(1) }, { value: 1e9 })
            ).to.be.revertedWithCustomError(estateMortgageToken, 'FailedTransfer');
        });

        it('3.2.10.14. Lend unsuccessfully when transferring native token to commission receiver failed', async () => {
            const fixture = await beforeEstateMortgageTokenTest();
            const { estateMortgageToken, borrower2, lender1, deployer, estateToken, commissionToken, broker2 } =
                fixture;

            const failReceiver = await deployFailReceiver(deployer, true, false);

            await callTransaction(
                getEstateMortgageTokenTx_Borrow(estateMortgageToken, borrower2, {
                    estateId: BigNumber.from(2),
                    amount: BigNumber.from(200),
                    principal: BigNumber.from(100000),
                    repayment: BigNumber.from(110000),
                    currency: ethers.constants.AddressZero,
                    duration: 1000,
                })
            );
            await callTransaction(estateToken.connect(borrower2).setApprovalForAll(estateMortgageToken.address, true));

            await callTransaction(
                commissionToken.connect(broker2).transferFrom(broker2.address, failReceiver.address, 2)
            );

            await expect(
                getMortgageTokenTx_Lend(estateMortgageToken, lender1, { mortgageId: BigNumber.from(1) }, { value: 1e9 })
            ).to.be.revertedWithCustomError(estateMortgageToken, 'FailedTransfer');
        });

        it('3.2.10.15. Buy token unsuccessfully when refunding to lender failed', async () => {
            const fixture = await beforeEstateMortgageTokenTest({
                listSampleMortgage: true,
            });
            const { estateMortgageToken, deployer } = fixture;
            const failReceiver = await deployFailReceiver(deployer, true, false);

            let data = estateMortgageToken.interface.encodeFunctionData('lend', [1]);

            await expect(
                failReceiver.call(estateMortgageToken.address, data, {
                    value: 1e9,
                })
            ).to.be.revertedWithCustomError(estateMortgageToken, 'FailedRefund');
        });

        it('3.2.10.16. Buy token unsuccessfully when the contract is reentered', async () => {
            const fixture = await beforeEstateMortgageTokenTest();
            const { estateMortgageToken, deployer, estateToken, lender1 } = fixture;

            const reentrancy = await deployReentrancyReceiver(deployer, true, false);

            await callTransaction(estateToken.mint(reentrancy.address, 1, 100_000));

            await callTransaction(
                reentrancy.call(
                    estateToken.address,
                    estateToken.interface.encodeFunctionData('setApprovalForAll', [estateMortgageToken.address, true])
                )
            );

            await callTransaction(
                reentrancy.call(
                    estateMortgageToken.address,
                    estateMortgageToken.interface.encodeFunctionData('borrow', [
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

            await testReentrancy_estateMortgageToken(estateMortgageToken, reentrancy, async () => {
                await expect(
                    getMortgageTokenTx_Lend(
                        estateMortgageToken,
                        lender1,
                        { mortgageId: BigNumber.from(mortgageId) },
                        { value: 1e9 }
                    )
                ).to.be.revertedWithCustomError(estateMortgageToken, 'FailedTransfer');
            });
        });
    });

    describe('3.2.11. safeLend(uint256,uint256)', async () => {
        it('3.2.11.1. Safe lend successfully', async () => {
            const fixture = await beforeEstateMortgageTokenTest({
                listSampleMortgage: true,
            });
            const { estateMortgageToken, borrower1, borrower2 } = fixture;

            await expect(
                getMortgageTokenTxByParams_SafeLend(
                    estateMortgageToken,
                    borrower2,
                    { mortgageId: BigNumber.from(1) },
                    { value: 1e9 }
                )
            ).to.not.be.reverted;

            await expect(
                getMortgageTokenTxByParams_SafeLend(
                    estateMortgageToken,
                    borrower1,
                    { mortgageId: BigNumber.from(2) },
                    { value: 1e9 }
                )
            ).to.not.be.reverted;
        });

        it('3.2.11.2. Safe lend unsuccessfully with invalid mortgage id', async () => {
            const fixture = await beforeEstateMortgageTokenTest({
                listSampleMortgage: true,
            });
            const { estateMortgageToken, borrower1 } = fixture;

            await expect(
                getMortgageTokenTx_SafeLend(
                    estateMortgageToken,
                    borrower1,
                    {
                        mortgageId: BigNumber.from(0),
                        anchor: BigNumber.from(0),
                    },
                    { value: 1e9 }
                )
            ).to.be.revertedWithCustomError(estateMortgageToken, 'InvalidMortgageId');

            await expect(
                getMortgageTokenTx_SafeLend(
                    estateMortgageToken,
                    borrower1,
                    {
                        mortgageId: BigNumber.from(3),
                        anchor: BigNumber.from(0),
                    },
                    { value: 1e9 }
                )
            ).to.be.revertedWithCustomError(estateMortgageToken, 'InvalidMortgageId');
        });

        it('3.2.11.3. Safe lend unsuccessfully with invalid anchor', async () => {
            const fixture = await beforeEstateMortgageTokenTest({
                listSampleMortgage: true,
            });
            const { estateMortgageToken, lender1 } = fixture;

            await expect(
                getMortgageTokenTx_SafeLend(
                    estateMortgageToken,
                    lender1,
                    {
                        mortgageId: BigNumber.from(1),
                        anchor: BigNumber.from(0),
                    },
                    { value: 1e9 }
                )
            ).to.be.revertedWithCustomError(estateMortgageToken, 'BadAnchor');

            await expect(
                getMortgageTokenTx_SafeLend(
                    estateMortgageToken,
                    lender1,
                    {
                        mortgageId: BigNumber.from(2),
                        anchor: BigNumber.from(0),
                    },
                    { value: 1e9 }
                )
            ).to.be.revertedWithCustomError(estateMortgageToken, 'BadAnchor');
        });
    });

    describe('3.2.12. repay(uint256)', () => {
        it('3.2.12.1. Repay successfully', async () => {
            const fixture = await beforeEstateMortgageTokenTest({
                listSampleMortgage: true,
                listSampleLending: true,
            });
            const {
                estateMortgageToken,
                borrower1,
                borrower2,
                lender1,
                lender2,
                estateToken,
                currency,
                estateMortgageTokenOwner,
            } = fixture;

            let currentTimestamp = (await time.latest()) + 10;
            await time.setNextBlockTimestamp(currentTimestamp);

            let lender1NativeBalance = await ethers.provider.getBalance(lender1.address);
            let borrower1NativeBalance = await ethers.provider.getBalance(borrower1.address);
            let borrower1Balance = await estateToken.balanceOf(borrower1.address, 1);
            let estateMortgageTokenBalance = await estateToken.balanceOf(estateMortgageToken.address, 1);
            let currentTotalSupply = await estateMortgageToken.totalSupply();

            let tx = await getMortgageTokenTx_Repay(
                estateMortgageToken,
                borrower1,
                { mortgageId: BigNumber.from(1) },
                { value: 1e9 }
            );
            let receipt = await tx.wait();
            let gasFee = receipt.gasUsed.mul(receipt.effectiveGasPrice);

            await expect(tx).to.emit(estateMortgageToken, 'MortgageRepayment').withArgs(1);

            const mortgage1 = await estateMortgageToken.getMortgage(1);
            expect(mortgage1.state).to.equal(MortgageState.Repaid);

            expect(await estateMortgageToken.balanceOf(borrower1.address)).to.equal(0);

            expect(await estateMortgageToken.totalSupply()).to.equal(currentTotalSupply.sub(1));

            expect(await estateToken.balanceOf(borrower1.address, 1)).to.equal(borrower1Balance.add(150_000));
            expect(await estateToken.balanceOf(estateMortgageToken.address, 1)).to.equal(
                estateMortgageTokenBalance.sub(150_000)
            );

            expect(await ethers.provider.getBalance(borrower1.address)).to.equal(
                borrower1NativeBalance.sub(gasFee).sub(11e5)
            );
            expect(await ethers.provider.getBalance(lender1.address)).to.equal(lender1NativeBalance.add(11e5));

            await callTransaction(
                estateMortgageToken.connect(lender2).transferFrom(lender2.address, estateMortgageTokenOwner.address, 2)
            );

            let borrower2CurrencyBalance = await currency.balanceOf(borrower2.address);
            let lender2CurrencyBalance = await currency.balanceOf(lender2.address);
            let estateMortgageTokenOwnerBalance = await currency.balanceOf(estateMortgageTokenOwner.address);
            let borrower2Balance = await estateToken.balanceOf(borrower2.address, 2);
            estateMortgageTokenBalance = await estateToken.balanceOf(estateMortgageToken.address, 2);

            tx = await getMortgageTokenTx_Repay(
                estateMortgageToken,
                borrower2,
                { mortgageId: BigNumber.from(2) },
                { value: 1e9 }
            );
            await tx.wait();

            await expect(tx).to.emit(estateMortgageToken, 'MortgageRepayment').withArgs(2);

            const mortgage2 = await estateMortgageToken.getMortgage(2);
            expect(mortgage2.state).to.equal(MortgageState.Repaid);

            expect(await estateMortgageToken.balanceOf(borrower2.address)).to.equal(0);
            expect(await estateMortgageToken.totalSupply()).to.equal(currentTotalSupply.sub(2));

            expect(await estateToken.balanceOf(borrower2.address, 2)).to.equal(borrower2Balance.add(200));
            expect(await estateToken.balanceOf(estateMortgageToken.address, 2)).to.equal(
                estateMortgageTokenBalance.sub(200)
            );

            expect(await currency.balanceOf(borrower2.address)).to.equal(borrower2CurrencyBalance.sub(110000));
            expect(await currency.balanceOf(lender2.address)).to.equal(lender2CurrencyBalance);
            expect(await currency.balanceOf(estateMortgageTokenOwner.address)).to.equal(
                estateMortgageTokenOwnerBalance.add(110000)
            );
        });

        it('3.2.12.2. Repay unsuccessfully when paused', async () => {
            const fixture = await beforeEstateMortgageTokenTest({
                listSampleMortgage: true,
                listSampleLending: true,
                pause: true,
            });
            const { estateMortgageToken, borrower1 } = fixture;

            await expect(
                getMortgageTokenTx_Repay(
                    estateMortgageToken,
                    borrower1,
                    { mortgageId: BigNumber.from(1) },
                    { value: 1e9 }
                )
            ).to.be.revertedWith('Pausable: paused');
        });

        it('3.2.12.3. Repay unsuccessfully with invalid mortgage id', async () => {
            const fixture = await beforeEstateMortgageTokenTest({
                listSampleMortgage: true,
                listSampleLending: true,
            });
            const { estateMortgageToken, borrower1 } = fixture;

            await expect(
                getMortgageTokenTx_Repay(estateMortgageToken, borrower1, {
                    mortgageId: BigNumber.from(0),
                })
            ).to.be.revertedWithCustomError(estateMortgageToken, 'InvalidMortgageId');

            await expect(
                getMortgageTokenTx_Repay(estateMortgageToken, borrower1, {
                    mortgageId: BigNumber.from(3),
                })
            ).to.be.revertedWithCustomError(estateMortgageToken, 'InvalidMortgageId');
        });

        it('3.2.12.4. Repay unsuccessfully with overdue mortgage', async () => {
            const fixture = await beforeEstateMortgageTokenTest({
                listSampleMortgage: true,
                listSampleLending: true,
            });
            const { estateMortgageToken, borrower1, borrower2 } = fixture;

            const due1 = (await estateMortgageToken.getMortgage(1)).due;
            await time.setNextBlockTimestamp(due1);

            await expect(
                getMortgageTokenTx_Repay(
                    estateMortgageToken,
                    borrower1,
                    { mortgageId: BigNumber.from(1) },
                    { value: 1e9 }
                )
            ).to.be.revertedWithCustomError(estateMortgageToken, 'Overdue');

            const due2 = (await estateMortgageToken.getMortgage(2)).due;
            await time.setNextBlockTimestamp(due2);

            await expect(
                getMortgageTokenTx_Repay(estateMortgageToken, borrower2, {
                    mortgageId: BigNumber.from(2),
                })
            ).to.be.revertedWithCustomError(estateMortgageToken, 'Overdue');
        });

        it('3.2.12.5. Repay unsuccessfully with pending mortgage', async () => {
            const fixture = await beforeEstateMortgageTokenTest({
                listSampleMortgage: true,
            });
            const { estateMortgageToken, borrower1, borrower2 } = fixture;

            await expect(
                getMortgageTokenTx_Repay(
                    estateMortgageToken,
                    borrower1,
                    { mortgageId: BigNumber.from(1) },
                    { value: 1e9 }
                )
            ).to.be.revertedWithCustomError(estateMortgageToken, 'InvalidRepaying');
            await expect(
                getMortgageTokenTx_Repay(estateMortgageToken, borrower2, {
                    mortgageId: BigNumber.from(2),
                })
            ).to.be.revertedWithCustomError(estateMortgageToken, 'InvalidRepaying');
        });

        it('3.2.12.6. Repay unsuccessfully with already repaid mortgage', async () => {
            const fixture = await beforeEstateMortgageTokenTest({
                listSampleMortgage: true,
                listSampleLending: true,
            });
            const { estateMortgageToken, borrower1, borrower2 } = fixture;

            await callTransaction(
                getMortgageTokenTx_Repay(
                    estateMortgageToken,
                    borrower1,
                    { mortgageId: BigNumber.from(1) },
                    { value: 1e9 }
                )
            );
            await callTransaction(
                getMortgageTokenTx_Repay(estateMortgageToken, borrower2, {
                    mortgageId: BigNumber.from(2),
                })
            );

            await expect(
                getMortgageTokenTx_Repay(
                    estateMortgageToken,
                    borrower1,
                    { mortgageId: BigNumber.from(1) },
                    { value: 1e9 }
                )
            ).to.be.revertedWithCustomError(estateMortgageToken, 'InvalidRepaying');
            await expect(
                getMortgageTokenTx_Repay(estateMortgageToken, borrower2, {
                    mortgageId: BigNumber.from(2),
                })
            ).to.be.revertedWithCustomError(estateMortgageToken, 'InvalidRepaying');
        });

        it('3.2.12.7. Repay unsuccessfully with foreclosed mortgage', async () => {
            const fixture = await beforeEstateMortgageTokenTest({
                listSampleMortgage: true,
                listSampleLending: true,
            });
            const { estateMortgageToken, borrower1, borrower2 } = fixture;

            const due = (await estateMortgageToken.getMortgage(2)).due;
            await time.setNextBlockTimestamp(due);

            await callTransaction(
                getMortgageTokenTx_Foreclose(estateMortgageToken, borrower1, {
                    mortgageId: BigNumber.from(1),
                })
            );
            await callTransaction(
                getMortgageTokenTx_Foreclose(estateMortgageToken, borrower2, {
                    mortgageId: BigNumber.from(2),
                })
            );

            await expect(
                getMortgageTokenTx_Repay(
                    estateMortgageToken,
                    borrower1,
                    { mortgageId: BigNumber.from(1) },
                    { value: 1e9 }
                )
            ).to.be.revertedWithCustomError(estateMortgageToken, 'InvalidRepaying');
            await expect(
                getMortgageTokenTx_Repay(estateMortgageToken, borrower2, {
                    mortgageId: BigNumber.from(2),
                })
            ).to.be.revertedWithCustomError(estateMortgageToken, 'InvalidRepaying');
        });

        it('3.2.12.8. Repay unsuccessfully with cancelled mortgage', async () => {
            const fixture = await beforeEstateMortgageTokenTest({
                listSampleMortgage: true,
            });
            const { estateMortgageToken, borrower1, borrower2 } = fixture;

            await callTransaction(
                getMortgageTokenTx_Cancel(estateMortgageToken, borrower1, {
                    mortgageId: BigNumber.from(1),
                })
            );
            await callTransaction(
                getMortgageTokenTx_Cancel(estateMortgageToken, borrower2, {
                    mortgageId: BigNumber.from(2),
                })
            );

            await expect(
                getMortgageTokenTx_Repay(
                    estateMortgageToken,
                    borrower1,
                    { mortgageId: BigNumber.from(1) },
                    { value: 1e9 }
                )
            ).to.be.revertedWithCustomError(estateMortgageToken, 'InvalidRepaying');
            await expect(
                getMortgageTokenTx_Repay(estateMortgageToken, borrower2, {
                    mortgageId: BigNumber.from(2),
                })
            ).to.be.revertedWithCustomError(estateMortgageToken, 'InvalidRepaying');
        });

        it('3.2.12.9. Repay unsuccessfully with insufficient funds', async () => {
            const fixture = await beforeEstateMortgageTokenTest({
                listSampleMortgage: true,
                listSampleLending: true,
            });
            const { estateMortgageToken, borrower1, borrower2, currency } = fixture;

            await expect(
                getMortgageTokenTx_Repay(estateMortgageToken, borrower1, {
                    mortgageId: BigNumber.from(1),
                })
            ).to.be.revertedWithCustomError(estateMortgageToken, 'InsufficientValue');

            await resetERC20(currency, [borrower2]);
            await expect(
                getMortgageTokenTx_Repay(estateMortgageToken, borrower2, {
                    mortgageId: BigNumber.from(2),
                })
            ).to.be.revertedWith('ERC20: transfer amount exceeds balance');
        });

        it('3.2.12.10. Repay unsuccessfully transferring native token to lender failed', async () => {
            const fixture = await beforeEstateMortgageTokenTest({
                listSampleMortgage: true,
            });
            const { estateMortgageToken, borrower1, deployer } = fixture;

            const failReceiver = await deployFailReceiver(deployer, true, false);

            const principal = (await estateMortgageToken.getMortgage(1)).principal;

            let data = estateMortgageToken.interface.encodeFunctionData('lend', [1]);
            await callTransaction(
                failReceiver.call(estateMortgageToken.address, data, {
                    value: principal,
                })
            );

            await expect(
                getMortgageTokenTx_Repay(
                    estateMortgageToken,
                    borrower1,
                    { mortgageId: BigNumber.from(1) },
                    { value: 1e9 }
                )
            ).to.be.revertedWithCustomError(estateMortgageToken, 'FailedTransfer');
        });

        it('3.2.12.11. Repay unsuccessfully when the contract is reentered', async () => {
            const fixture = await beforeEstateMortgageTokenTest({
                listSampleMortgage: true,
            });
            const { estateMortgageToken, borrower1, deployer } = fixture;

            const reentrancy = await deployReentrancyReceiver(deployer, true, false);

            const principal = (await estateMortgageToken.getMortgage(1)).principal;

            let data = estateMortgageToken.interface.encodeFunctionData('lend', [1]);
            await callTransaction(
                reentrancy.call(estateMortgageToken.address, data, {
                    value: principal,
                })
            );

            await testReentrancy_estateMortgageToken(estateMortgageToken, reentrancy, async () => {
                await expect(
                    getMortgageTokenTx_Repay(
                        estateMortgageToken,
                        borrower1,
                        { mortgageId: BigNumber.from(1) },
                        { value: 1e9 }
                    )
                ).to.be.revertedWithCustomError(estateMortgageToken, 'FailedTransfer');
            });
        });
    });

    describe('3.2.13. safeRepay(uint256,uint256)', () => {
        it('3.2.13.1. Safe repay successfully', async () => {
            const fixture = await beforeEstateMortgageTokenTest({
                listSampleMortgage: true,
                listSampleLending: true,
            });
            const { estateMortgageToken, borrower1, borrower2 } = fixture;

            await expect(
                getMortgageTokenTxByParams_SafeRepay(
                    estateMortgageToken,
                    borrower1,
                    { mortgageId: BigNumber.from(1) },
                    { value: 1e9 }
                )
            ).to.not.be.reverted;

            await expect(
                getMortgageTokenTxByParams_SafeRepay(estateMortgageToken, borrower2, {
                    mortgageId: BigNumber.from(2),
                })
            ).to.not.be.reverted;
        });

        it('3.2.13.2. Safe repay unsuccessfully with invalid mortgage id', async () => {
            const fixture = await beforeEstateMortgageTokenTest({
                listSampleMortgage: true,
                listSampleLending: true,
            });
            const { estateMortgageToken, borrower1 } = fixture;

            await expect(
                getMortgageTokenTx_SafeRepay(estateMortgageToken, borrower1, {
                    mortgageId: BigNumber.from(0),
                    anchor: BigNumber.from(0),
                })
            ).to.be.revertedWithCustomError(estateMortgageToken, 'InvalidMortgageId');

            await expect(
                getMortgageTokenTx_SafeRepay(estateMortgageToken, borrower1, {
                    mortgageId: BigNumber.from(3),
                    anchor: BigNumber.from(0),
                })
            ).to.be.revertedWithCustomError(estateMortgageToken, 'InvalidMortgageId');
        });

        it('3.2.13.3. Repay unsuccessfully with invalid anchor', async () => {
            const fixture = await beforeEstateMortgageTokenTest({
                listSampleMortgage: true,
                listSampleLending: true,
            });
            const { estateMortgageToken, borrower1 } = fixture;

            await expect(
                getMortgageTokenTx_SafeRepay(estateMortgageToken, borrower1, {
                    mortgageId: BigNumber.from(1),
                    anchor: BigNumber.from(0),
                })
            ).to.be.revertedWithCustomError(estateMortgageToken, 'BadAnchor');

            await expect(
                getMortgageTokenTx_SafeRepay(estateMortgageToken, borrower1, {
                    mortgageId: BigNumber.from(2),
                    anchor: BigNumber.from(0),
                })
            ).to.be.revertedWithCustomError(estateMortgageToken, 'BadAnchor');
        });
    });

    describe('3.2.14. foreclose(uint256)', () => {
        it('3.2.14.1. Foreclose successfully', async () => {
            const fixture = await beforeEstateMortgageTokenTest({
                listSampleMortgage: true,
                listSampleLending: true,
            });
            const { user, estateMortgageToken, lender1, lender2, estateToken, estateMortgageTokenOwner } = fixture;

            let lender1Balance = await estateToken.balanceOf(lender1.address, 1);
            let mortgageContractBalance = await estateToken.balanceOf(estateMortgageToken.address, 1);
            let currentTotalSupply = await estateMortgageToken.totalSupply();

            const due1 = (await estateMortgageToken.getMortgage(1)).due;
            await time.setNextBlockTimestamp(due1);

            let tx = await getMortgageTokenTx_Foreclose(estateMortgageToken, user, {
                mortgageId: BigNumber.from(1),
            });
            await tx.wait();

            await expect(tx).to.emit(estateMortgageToken, 'MortgageForeclosure').withArgs(1, lender1.address);

            const mortgage1 = await estateMortgageToken.getMortgage(1);
            expect(mortgage1.state).to.equal(MortgageState.Foreclosed);

            expect(await estateMortgageToken.balanceOf(lender1.address)).to.equal(0);

            expect(await estateMortgageToken.totalSupply()).to.equal(currentTotalSupply.sub(1));

            expect(await estateToken.balanceOf(lender1.address, 1)).to.equal(lender1Balance.add(150_000));
            expect(await estateToken.balanceOf(estateMortgageToken.address, 1)).to.equal(
                mortgageContractBalance.sub(150_000)
            );

            await callTransaction(
                estateMortgageToken.connect(lender2).transferFrom(lender2.address, estateMortgageTokenOwner.address, 2)
            );

            const due2 = (await estateMortgageToken.getMortgage(2)).due;
            await time.setNextBlockTimestamp(due2);

            let lender2Balance = await estateToken.balanceOf(lender2.address, 2);
            mortgageContractBalance = await estateToken.balanceOf(estateMortgageToken.address, 2);
            let estateMortgageTokenOwnerBalance = await estateToken.balanceOf(estateMortgageTokenOwner.address, 2);

            tx = await getMortgageTokenTx_Foreclose(estateMortgageToken, user, {
                mortgageId: BigNumber.from(2),
            });
            await tx.wait();

            await expect(tx)
                .to.emit(estateMortgageToken, 'MortgageForeclosure')
                .withArgs(2, estateMortgageTokenOwner.address);

            const mortgage2 = await estateMortgageToken.getMortgage(2);
            expect(mortgage2.state).to.equal(MortgageState.Foreclosed);

            expect(await estateMortgageToken.balanceOf(lender2.address)).to.equal(0);

            expect(await estateMortgageToken.totalSupply()).to.equal(currentTotalSupply.sub(2));

            expect(await estateToken.balanceOf(lender2.address, 2)).to.equal(lender2Balance);
            expect(await estateToken.balanceOf(estateMortgageTokenOwner.address, 2)).to.equal(
                estateMortgageTokenOwnerBalance.add(200)
            );
            expect(await estateToken.balanceOf(estateMortgageToken.address, 2)).to.equal(
                mortgageContractBalance.sub(200)
            );
        });

        it('3.2.14.2. Foreclose unsuccessfully when paused', async () => {
            const fixture = await beforeEstateMortgageTokenTest({
                listSampleMortgage: true,
                listSampleLending: true,
                pause: true,
            });
            const { user, estateMortgageToken } = fixture;

            await expect(
                getMortgageTokenTx_Foreclose(estateMortgageToken, user, {
                    mortgageId: BigNumber.from(1),
                })
            ).to.be.revertedWith('Pausable: paused');
        });

        it('3.2.14.3. Foreclose unsuccessfully with invalid mortgage id', async () => {
            const fixture = await beforeEstateMortgageTokenTest({
                listSampleMortgage: true,
                listSampleLending: true,
            });
            const { user, estateMortgageToken } = fixture;

            await expect(
                getMortgageTokenTx_Foreclose(estateMortgageToken, user, {
                    mortgageId: BigNumber.from(0),
                })
            ).to.be.revertedWithCustomError(estateMortgageToken, 'InvalidMortgageId');

            await expect(
                getMortgageTokenTx_Foreclose(estateMortgageToken, user, {
                    mortgageId: BigNumber.from(3),
                })
            ).to.be.revertedWithCustomError(estateMortgageToken, 'InvalidMortgageId');
        });

        it('3.2.14.4. Foreclose unsuccessfully when mortgage is not overdue', async () => {
            const fixture = await beforeEstateMortgageTokenTest({
                listSampleMortgage: true,
                listSampleLending: true,
            });
            const { user, estateMortgageToken } = fixture;

            await expect(
                getMortgageTokenTx_Foreclose(estateMortgageToken, user, {
                    mortgageId: BigNumber.from(1),
                })
            ).to.be.revertedWithCustomError(estateMortgageToken, 'InvalidForeclosing');
        });

        it('3.2.14.5. Foreclose unsuccessfully with pending mortgage', async () => {
            const fixture = await beforeEstateMortgageTokenTest({
                listSampleMortgage: true,
            });
            const { user, estateMortgageToken } = fixture;

            await expect(
                getMortgageTokenTx_Foreclose(estateMortgageToken, user, {
                    mortgageId: BigNumber.from(1),
                })
            ).to.be.revertedWithCustomError(estateMortgageToken, 'InvalidForeclosing');
        });

        it('3.2.14.6. Foreclose unsuccessfully with repaid mortgage', async () => {
            const fixture = await beforeEstateMortgageTokenTest({
                listSampleMortgage: true,
                listSampleLending: true,
            });
            const { user, estateMortgageToken, borrower1 } = fixture;

            await callTransaction(
                getMortgageTokenTx_Repay(
                    estateMortgageToken,
                    borrower1,
                    { mortgageId: BigNumber.from(1) },
                    { value: 1e9 }
                )
            );

            const due = (await estateMortgageToken.getMortgage(1)).due;
            await time.setNextBlockTimestamp(due);

            await expect(
                getMortgageTokenTx_Foreclose(estateMortgageToken, user, {
                    mortgageId: BigNumber.from(1),
                })
            ).to.be.revertedWithCustomError(estateMortgageToken, 'InvalidForeclosing');
        });

        it('3.2.14.7. Foreclose unsuccessfully with foreclosed mortgage', async () => {
            const fixture = await beforeEstateMortgageTokenTest({
                listSampleMortgage: true,
                listSampleLending: true,
            });
            const { user, estateMortgageToken, lender1 } = fixture;

            const due = (await estateMortgageToken.getMortgage(1)).due;
            await time.setNextBlockTimestamp(due);

            await callTransaction(
                getMortgageTokenTx_Foreclose(estateMortgageToken, lender1, {
                    mortgageId: BigNumber.from(1),
                })
            );

            await expect(
                getMortgageTokenTx_Foreclose(estateMortgageToken, user, {
                    mortgageId: BigNumber.from(1),
                })
            ).to.be.revertedWithCustomError(estateMortgageToken, 'InvalidForeclosing');
        });

        it('3.2.14.8. Foreclose unsuccessfully with cancelled mortgage', async () => {
            const fixture = await beforeEstateMortgageTokenTest({
                listSampleMortgage: true,
            });
            const { user, estateMortgageToken, borrower1 } = fixture;

            await callTransaction(
                getMortgageTokenTx_Cancel(estateMortgageToken, borrower1, {
                    mortgageId: BigNumber.from(1),
                })
            );

            await expect(
                getMortgageTokenTx_Foreclose(estateMortgageToken, user, {
                    mortgageId: BigNumber.from(1),
                })
            ).to.be.revertedWithCustomError(estateMortgageToken, 'InvalidForeclosing');
        });
    });
});
