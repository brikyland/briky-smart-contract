import {expect} from 'chai';
import {BigNumber, Contract} from 'ethers';
import {ethers, upgrades} from 'hardhat';

// @defi-wonderland/smock
import {MockContract, smock} from '@defi-wonderland/smock';

// @nomicfoundation/hardhat-network-helpers
import {loadFixture, time} from '@nomicfoundation/hardhat-network-helpers';

// @tests
import {Constant} from '@tests/test.constant';
import {
    IERC165UpgradeableInterfaceId,
    IERC721MetadataUpgradeableInterfaceId,
    IERC2981UpgradeableInterfaceId,
    IMortgageTokenInterfaceId,
} from '@tests/interfaces';

// @tests/lend
import {Initialization as LendInitialization} from '@tests/lend/test.initialization';

// @typechain-types
import {
    Admin,
    Currency,
    ERC721MortgageToken,
    FeeReceiver,
    RoyaltyCollection,
    RoyaltyCollection__factory,
} from '@typechain-types';

// @utils
import {
    callTransaction,
    getBalance,
    prepareERC20,
    prepareNativeToken,
    randomWallet,
    resetERC20,
    resetNativeToken,
    testReentrancy,
} from '@utils/blockchain';
import {applyDiscount, scaleRate} from '@utils/formula';
import {getBytes4Hex, randomBigNumber, structToObject} from '@utils/utils';

// @utils/deployments/common
import {deployAdmin} from '@utils/deployments/common/admin';
import {deployFeeReceiver} from '@utils/deployments/common/feeReceiver';
import {deployCurrency} from '@utils/deployments/common/currency';

// @utils/deployments/lend
import {deployERC721MortgageToken} from '@utils/deployments/lend/erc721MortgageToken';

// @utils/deployments/mock
import {deployFailReceiver} from '@utils/deployments/mock/utilities/failReceiver';
import {deployReentrancyReceiver} from '@utils/deployments/mock/reentrancy/reentrancyReceiver';

// @utils/models/lend
import {
    MortgageState,
    UpdateBaseURIParams,
    UpdateBaseURIParamsInput,
    UpdateFeeRateParams,
    UpdateFeeRateParamsInput,
} from '@utils/models/lend/mortgageToken';

// @utils/models/lend
import {
    ERC721BorrowParams,
    RegisterCollateralsParams,
    RegisterCollateralsParamsInput,
} from '@utils/models/lend/erc721MortgageToken';

// @utils/signatures/lend
import {getRegisterCollateralsSignatures} from '@utils/signatures/lend/erc721MortgageToken';

// @utils/signatures/lend
import {getUpdateBaseURISignatures, getUpdateFeeRateSignatures} from '@utils/signatures/lend/mortgageToken';

// @utils/transaction/lend
import {
    getERC721MortgageTokenTx_Borrow,
    getERC721MortgageTokenTx_RegisterCollaterals,
    getERC721MortgageTokenTxByInput_RegisterCollaterals,
} from '@utils/transaction/lend/erc721MortgageToken';

// @utils/transaction/lend
import {
    getMortgageTokenTx_Cancel,
    getMortgageTokenTx_Foreclose,
    getMortgageTokenTx_Lend,
    getMortgageTokenTx_Repay,
    getMortgageTokenTx_SafeLend,
    getMortgageTokenTx_SafeRepay,
    getMortgageTokenTx_UpdateBaseURI,
    getMortgageTokenTx_UpdateFeeRate,
    getMortgageTokenTxByInput_UpdateBaseURI,
    getMortgageTokenTxByInput_UpdateFeeRate,
    getMortgageTokenTxByParams_SafeLend,
    getMortgageTokenTxByParams_SafeRepay,
} from '@utils/transaction/lend/mortgageToken';

// @utils/transaction/common
import {
    getAdminTxByInput_AuthorizeManagers,
    getAdminTxByInput_AuthorizeModerators,
    getAdminTxByInput_UpdateCurrencyRegistries,
} from '@utils/transaction/common/admin';
import {getPausableTxByInput_Pause} from '@utils/transaction/common/pausable';

async function testReentrancy_erc721MortgageToken(
    erc721MortgageToken: ERC721MortgageToken,
    reentrancyContract: Contract,
    assertion: any
) {
    let data = [
        erc721MortgageToken.interface.encodeFunctionData('lend', [0]),
        erc721MortgageToken.interface.encodeFunctionData('repay', [0]),
        erc721MortgageToken.interface.encodeFunctionData('safeLend', [0, 0]),
        erc721MortgageToken.interface.encodeFunctionData('safeRepay', [0, 0]),
        erc721MortgageToken.interface.encodeFunctionData('foreclose', [0]),
    ];

    await testReentrancy(reentrancyContract, erc721MortgageToken, data, assertion);
}

interface ERC721MortgageTokenFixture {
    deployer: any;
    admins: any[];
    lender1: any;
    lender2: any;
    borrower1: any;
    borrower2: any;
    manager: any;
    moderator: any;
    royaltyReceiver: any;
    erc721MortgageTokenOwner: any;
    user: any;

    admin: Admin;
    currency: Currency;
    feeReceiver: FeeReceiver;
    feeReceiverCollection: MockContract<RoyaltyCollection>;
    otherCollection: MockContract<RoyaltyCollection>;
    collaterals: MockContract<RoyaltyCollection>[];
    erc721MortgageToken: ERC721MortgageToken;
}

describe('3.1. ERC721MortgageToken', async () => {
    async function erc721MortgageTokenFixture(): Promise<ERC721MortgageTokenFixture> {
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
            royaltyReceiver,
            erc721MortgageTokenOwner,
            user,
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

        const currency = (await deployCurrency(deployer.address, 'MockCurrency', 'MCK')) as Currency;

        await callTransaction(
            currency.setExclusiveDiscount(ethers.utils.parseEther('0.3'), Constant.COMMON_RATE_DECIMALS)
        );

        const feeReceiver = (await deployFeeReceiver(deployer.address, admin.address)) as FeeReceiver;

        const SmockCollectionFactory = await smock.mock<RoyaltyCollection__factory>('RoyaltyCollection');
        const feeReceiverCollection = await SmockCollectionFactory.deploy();
        await feeReceiverCollection.initialize(
            admin.address,
            feeReceiver.address,
            ethers.utils.parseEther('0.1'),
            'FeeReceiverCollection',
            'FRC'
        );
        const otherCollection = await SmockCollectionFactory.deploy();
        await otherCollection.initialize(
            admin.address,
            royaltyReceiver.address,
            ethers.utils.parseEther('0.2'),
            'OtherCollection',
            'OTC'
        );

        const collaterals = [];
        for (let i = 0; i < 5; ++i) {
            const collateral = await SmockCollectionFactory.deploy();
            await collateral.initialize(
                admin.address,
                royaltyReceiver.address,
                ethers.utils.parseEther('0.3'),
                `Collateral_${i}`,
                `CLT${i}`
            );
            collaterals.push(collateral);
        }

        const erc721MortgageToken = (await deployERC721MortgageToken(
            deployer.address,
            admin.address,
            feeReceiver.address,
            LendInitialization.ERC721_MORTGAGE_TOKEN_Name,
            LendInitialization.ERC721_MORTGAGE_TOKEN_Symbol,
            LendInitialization.ERC721_MORTGAGE_TOKEN_BaseURI,
            LendInitialization.ERC721_MORTGAGE_TOKEN_FeeRate
        )) as ERC721MortgageToken;

        return {
            deployer,
            admins,
            manager,
            moderator,
            royaltyReceiver,
            lender1,
            lender2,
            borrower1,
            borrower2,
            erc721MortgageTokenOwner,
            user,
            admin,
            currency,
            feeReceiver,
            feeReceiverCollection,
            otherCollection,
            collaterals,
            erc721MortgageToken,
        };
    }

    async function beforeERC721MortgageTokenTest({
        skipSetApprovalForAll = false,
        skipRegisterCollaterals = false,
        skipListSampleCurrencies = false,
        skipListSampleCollectionTokens = false,
        listSampleMortgage = false,
        listSampleLending = false,
        pause = false,
    } = {}): Promise<ERC721MortgageTokenFixture> {
        const fixture = await loadFixture(erc721MortgageTokenFixture);

        const {
            deployer,
            admins,
            borrower1,
            borrower2,
            lender1,
            lender2,
            manager,
            moderator,
            admin,
            currency,
            feeReceiverCollection,
            otherCollection,
            erc721MortgageToken,
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

        if (!skipRegisterCollaterals) {
            await callTransaction(
                getERC721MortgageTokenTxByInput_RegisterCollaterals(
                    erc721MortgageToken as any,
                    deployer,
                    {
                        tokens: [feeReceiverCollection.address, otherCollection.address],
                        isCollateral: true,
                    },
                    admin,
                    admins
                )
            );
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

        if (!skipListSampleCollectionTokens) {
            for (const collection of [feeReceiverCollection, otherCollection]) {
                await callTransaction(collection.mint(borrower1.address, 1));
                await callTransaction(collection.mint(borrower2.address, 2));

                if (!skipSetApprovalForAll) {
                    await callTransaction(
                        collection.connect(borrower1).setApprovalForAll(erc721MortgageToken.address, true)
                    );
                    await callTransaction(
                        collection.connect(borrower2).setApprovalForAll(erc721MortgageToken.address, true)
                    );
                }
            }
        }

        if (listSampleMortgage) {
            await callTransaction(
                getERC721MortgageTokenTx_Borrow(erc721MortgageToken, borrower1, {
                    token: feeReceiverCollection.address,
                    tokenId: BigNumber.from(1),
                    principal: BigNumber.from(10e5),
                    repayment: BigNumber.from(11e5),
                    currency: ethers.constants.AddressZero,
                    duration: 1000,
                })
            );

            await callTransaction(
                getERC721MortgageTokenTx_Borrow(erc721MortgageToken, borrower2, {
                    token: otherCollection.address,
                    tokenId: BigNumber.from(2),
                    principal: BigNumber.from(100000),
                    repayment: BigNumber.from(110000),
                    currency: currency.address,
                    duration: 1000,
                })
            );

            await prepareERC20(currency, [borrower1, borrower2, lender1, lender2], [erc721MortgageToken], 1e9);
        }

        if (listSampleLending) {
            currentTimestamp += 100;
            await time.setNextBlockTimestamp(currentTimestamp);
            await callTransaction(
                getMortgageTokenTx_Lend(erc721MortgageToken, lender1, { mortgageId: BigNumber.from(1) }, { value: 1e9 })
            );

            currentTimestamp += 100;
            await time.setNextBlockTimestamp(currentTimestamp);
            await callTransaction(
                getMortgageTokenTx_Lend(erc721MortgageToken, lender2, {
                    mortgageId: BigNumber.from(2),
                })
            );
        }

        if (pause) {
            await callTransaction(getPausableTxByInput_Pause(erc721MortgageToken, deployer, admin, admins));
        }

        return {
            ...fixture,
        };
    }

    /* --- Initialization --- */
    describe('3.1.1. initialize(address,address,string,string,string,uint256)', async () => {
        it('3.1.1.1. Deploy successfully', async () => {
            const { admin, feeReceiver, erc721MortgageToken } = await beforeERC721MortgageTokenTest();

            const tx = erc721MortgageToken.deployTransaction;
            await expect(tx)
                .to.emit(erc721MortgageToken, 'BaseURIUpdate')
                .withArgs(LendInitialization.ERC721_MORTGAGE_TOKEN_BaseURI);
            await expect(tx)
                .to.emit(erc721MortgageToken, 'FeeRateUpdate')
                .withArgs((rate: any) => {
                    expect(structToObject(rate)).to.deep.equal({
                        value: LendInitialization.ERC721_MORTGAGE_TOKEN_FeeRate,
                        decimals: Constant.COMMON_RATE_DECIMALS,
                    });
                    return true;
                });

            expect(await erc721MortgageToken.mortgageNumber()).to.equal(0);

            const feeRate = await erc721MortgageToken.getFeeRate();
            expect(structToObject(feeRate)).to.deep.equal({
                value: LendInitialization.ERC721_MORTGAGE_TOKEN_FeeRate,
                decimals: Constant.COMMON_RATE_DECIMALS,
            });

            expect(await erc721MortgageToken.admin()).to.equal(admin.address);
            expect(await erc721MortgageToken.feeReceiver()).to.equal(feeReceiver.address);
        });

        it('3.1.1.2. Deploy unsuccessfully with invalid fee rate', async () => {
            const { deployer, admin, feeReceiver } = await beforeERC721MortgageTokenTest();

            const ERC721MortgageToken = await ethers.getContractFactory('ERC721MortgageToken', deployer);

            await expect(
                upgrades.deployProxy(ERC721MortgageToken, [
                    admin.address,
                    feeReceiver.address,
                    LendInitialization.ERC721_MORTGAGE_TOKEN_Name,
                    LendInitialization.ERC721_MORTGAGE_TOKEN_Symbol,
                    LendInitialization.ERC721_MORTGAGE_TOKEN_BaseURI,
                    Constant.COMMON_RATE_MAX_FRACTION.add(1),
                ])
            ).to.be.reverted;
        });
    });

    /* --- Administration --- */
    describe('3.1.2. updateBaseURI(string,bytes[])', async () => {
        it('3.1.2.1. Update base URI successfully with valid signatures', async () => {
            const { deployer, erc721MortgageToken, admin, admins } = await beforeERC721MortgageTokenTest({
                listSampleMortgage: true,
                listSampleLending: true,
            });

            const paramsInput: UpdateBaseURIParamsInput = {
                uri: 'NewBaseURI:',
            };
            const tx = await getMortgageTokenTxByInput_UpdateBaseURI(
                erc721MortgageToken as any,
                deployer,
                paramsInput,
                admin,
                admins
            );
            await tx.wait();

            await expect(tx).to.emit(erc721MortgageToken, 'BaseURIUpdate').withArgs('NewBaseURI:');

            expect(await erc721MortgageToken.tokenURI(1)).to.equal('NewBaseURI:1');
            expect(await erc721MortgageToken.tokenURI(2)).to.equal('NewBaseURI:2');
        });

        it('3.1.2.2. Update base URI unsuccessfully with invalid signatures', async () => {
            const { deployer, erc721MortgageToken, admin, admins } = await beforeERC721MortgageTokenTest();

            const paramsInput: UpdateBaseURIParamsInput = {
                uri: 'NewBaseURI:',
            };
            const params: UpdateBaseURIParams = {
                ...paramsInput,
                signatures: await getUpdateBaseURISignatures(
                    erc721MortgageToken as any,
                    paramsInput,
                    admin,
                    admins,
                    false
                ),
            };
            await expect(
                getMortgageTokenTx_UpdateBaseURI(erc721MortgageToken as any, deployer, params)
            ).to.be.revertedWithCustomError(admin, 'FailedVerification');
        });
    });

    describe('3.1.3. updateFeeRate(uint256,bytes[])', async () => {
        it('3.1.3.1. Update fee rate successfully with valid signatures', async () => {
            const { deployer, erc721MortgageToken, admin, admins } = await beforeERC721MortgageTokenTest();

            const paramsInput: UpdateFeeRateParamsInput = {
                feeRate: ethers.utils.parseEther('0.2'),
            };
            const tx = await getMortgageTokenTxByInput_UpdateFeeRate(
                erc721MortgageToken as any,
                deployer,
                paramsInput,
                admin,
                admins
            );
            await tx.wait();

            await expect(tx)
                .to.emit(erc721MortgageToken, 'FeeRateUpdate')
                .withArgs((rate: any) => {
                    expect(structToObject(rate)).to.deep.equal({
                        value: paramsInput.feeRate,
                        decimals: Constant.COMMON_RATE_DECIMALS,
                    });
                    return true;
                });

            const feeRate = await erc721MortgageToken.getFeeRate();
            expect(structToObject(feeRate)).to.deep.equal({
                value: paramsInput.feeRate,
                decimals: Constant.COMMON_RATE_DECIMALS,
            });
        });

        it('3.1.3.2. Update fee rate unsuccessfully with invalid signatures', async () => {
            const { deployer, erc721MortgageToken, admin, admins } = await beforeERC721MortgageTokenTest();

            const paramsInput: UpdateFeeRateParamsInput = {
                feeRate: ethers.utils.parseEther('0.2'),
            };
            const params: UpdateFeeRateParams = {
                ...paramsInput,
                signatures: await getUpdateFeeRateSignatures(
                    erc721MortgageToken as any,
                    paramsInput,
                    admin,
                    admins,
                    false
                ),
            };
            await expect(
                getMortgageTokenTx_UpdateFeeRate(erc721MortgageToken as any, deployer, params)
            ).to.be.revertedWithCustomError(admin, 'FailedVerification');
        });

        it('3.1.3.3. Update fee rate unsuccessfully with invalid rate', async () => {
            const { deployer, erc721MortgageToken, admin, admins } = await beforeERC721MortgageTokenTest();

            await expect(
                getMortgageTokenTxByInput_UpdateFeeRate(
                    erc721MortgageToken as any,
                    deployer,
                    { feeRate: Constant.COMMON_RATE_MAX_FRACTION.add(1) },
                    admin,
                    admins
                )
            ).to.be.revertedWithCustomError(erc721MortgageToken, 'InvalidRate');
        });
    });

    describe('3.1.4. registerCollaterals(address[],bool,bytes[])', async () => {
        it('3.1.4.1. Register collaterals successfully with valid signatures', async () => {
            const { deployer, erc721MortgageToken, admin, admins, collaterals } = await beforeERC721MortgageTokenTest();

            const toBeCollaterals = collaterals.slice(0, 3);

            const paramsInput: RegisterCollateralsParamsInput = {
                tokens: toBeCollaterals.map((x) => x.address),
                isCollateral: true,
            };
            const tx = await getERC721MortgageTokenTxByInput_RegisterCollaterals(
                erc721MortgageToken as any,
                deployer,
                paramsInput,
                admin,
                admins
            );
            await tx.wait();

            for (const collateral of toBeCollaterals) {
                await expect(tx).to.emit(erc721MortgageToken, 'CollateralRegistration').withArgs(collateral.address);
            }

            for (const collateral of collaterals) {
                const isCollateral = await erc721MortgageToken.isCollateral(collateral.address);
                if (toBeCollaterals.includes(collateral)) {
                    expect(isCollateral).to.be.true;
                } else {
                    expect(isCollateral).to.be.false;
                }
            }
        });

        it('3.1.4.2. Register collaterals unsuccessfully with invalid signatures', async () => {
            const { deployer, erc721MortgageToken, admin, admins, collaterals } = await beforeERC721MortgageTokenTest();

            const toBeCollaterals = collaterals.slice(0, 3);

            const paramsInput: RegisterCollateralsParamsInput = {
                tokens: toBeCollaterals.map((x) => x.address),
                isCollateral: true,
            };
            const params: RegisterCollateralsParams = {
                ...paramsInput,
                signatures: await getRegisterCollateralsSignatures(
                    erc721MortgageToken as any,
                    paramsInput,
                    admin,
                    admins,
                    false
                ),
            };
            await expect(
                getERC721MortgageTokenTx_RegisterCollaterals(erc721MortgageToken as any, deployer, params)
            ).to.be.revertedWithCustomError(admin, 'FailedVerification');
        });

        it('3.1.4.3. Register collaterals unsuccessfully with EOA', async () => {
            const { deployer, erc721MortgageToken, admin, admins } = await beforeERC721MortgageTokenTest();

            const invalidCollateral = randomWallet();

            await expect(
                getERC721MortgageTokenTxByInput_RegisterCollaterals(
                    erc721MortgageToken as any,
                    deployer,
                    {
                        tokens: [invalidCollateral.address],
                        isCollateral: true,
                    },
                    admin,
                    admins
                )
            ).to.be.revertedWithCustomError(erc721MortgageToken, 'InvalidCollateral');
        });

        it('3.1.4.4. Register collaterals reverted when contract does not support ProjectLaunchpad interface', async () => {
            const { deployer, erc721MortgageToken, admin, admins } = await beforeERC721MortgageTokenTest();

            await expect(
                getERC721MortgageTokenTxByInput_RegisterCollaterals(
                    erc721MortgageToken as any,
                    deployer,
                    {
                        tokens: [erc721MortgageToken.address],
                        isCollateral: true,
                    },
                    admin,
                    admins
                )
            ).to.be.revertedWithCustomError(erc721MortgageToken, 'InvalidCollateral');
        });

        it('3.1.4.5. Register collaterals unsuccessfully when authorizing itself', async () => {
            const { deployer, erc721MortgageToken, admin, admins } = await beforeERC721MortgageTokenTest();

            const toBeCollaterals = [erc721MortgageToken];

            await expect(
                getERC721MortgageTokenTxByInput_RegisterCollaterals(
                    erc721MortgageToken as any,
                    deployer,
                    {
                        tokens: toBeCollaterals.map((x) => x.address),
                        isCollateral: true,
                    },
                    admin,
                    admins
                )
            ).to.be.revertedWithCustomError(erc721MortgageToken, `InvalidCollateral`);
        });

        it('3.1.4.6. Register collaterals unsuccessfully when authorizing the same account twice on the same tx', async () => {
            const { deployer, erc721MortgageToken, admin, admins, collaterals } = await beforeERC721MortgageTokenTest();

            const duplicateCollaterals = [collaterals[0], collaterals[1], collaterals[2], collaterals[0]];

            await expect(
                getERC721MortgageTokenTxByInput_RegisterCollaterals(
                    erc721MortgageToken as any,
                    deployer,
                    {
                        tokens: duplicateCollaterals.map((x) => x.address),
                        isCollateral: true,
                    },
                    admin,
                    admins
                )
            ).to.be.revertedWithCustomError(erc721MortgageToken, `RegisteredCollateral`);
        });

        it('3.1.4.7. Register collaterals unsuccessfully when authorizing the same account twice on different txs', async () => {
            const { deployer, erc721MortgageToken, admin, admins, collaterals } = await beforeERC721MortgageTokenTest();

            const tx1Collaterals = collaterals.slice(0, 3);
            await callTransaction(
                getERC721MortgageTokenTxByInput_RegisterCollaterals(
                    erc721MortgageToken as any,
                    deployer,
                    {
                        tokens: tx1Collaterals.map((x) => x.address),
                        isCollateral: true,
                    },
                    admin,
                    admins
                )
            );

            const tx2Collaterals = [collaterals[3], collaterals[2], collaterals[4]];
            await expect(
                getERC721MortgageTokenTxByInput_RegisterCollaterals(
                    erc721MortgageToken as any,
                    deployer,
                    {
                        tokens: tx2Collaterals.map((x) => x.address),
                        isCollateral: true,
                    },
                    admin,
                    admins
                )
            ).to.be.revertedWithCustomError(erc721MortgageToken, `RegisteredCollateral`);
        });

        it('3.1.4.8. Deregister collaterals successfully', async () => {
            const { deployer, erc721MortgageToken, admin, admins, collaterals } = await beforeERC721MortgageTokenTest();

            await callTransaction(
                getERC721MortgageTokenTxByInput_RegisterCollaterals(
                    erc721MortgageToken as any,
                    deployer,
                    {
                        tokens: collaterals.map((x) => x.address),
                        isCollateral: true,
                    },
                    admin,
                    admins
                )
            );

            const toDeregister = collaterals.slice(0, 2);
            const tx = await getERC721MortgageTokenTxByInput_RegisterCollaterals(
                erc721MortgageToken as any,
                deployer,
                {
                    tokens: toDeregister.map((x) => x.address),
                    isCollateral: false,
                },
                admin,
                admins
            );
            await tx.wait();

            for (const collateral of toDeregister) {
                await expect(tx).to.emit(erc721MortgageToken, 'CollateralDeregistration').withArgs(collateral.address);
            }

            for (const collateral of collaterals) {
                const isCollateral = await erc721MortgageToken.isCollateral(collateral.address);
                if (toDeregister.includes(collateral)) {
                    expect(isCollateral).to.be.false;
                } else {
                    expect(isCollateral).to.be.true;
                }
            }
        });

        it('3.1.4.9. Deregister collaterals unsuccessfully with unauthorized account', async () => {
            const { deployer, erc721MortgageToken, admin, admins, collaterals } = await beforeERC721MortgageTokenTest();

            await callTransaction(
                getERC721MortgageTokenTxByInput_RegisterCollaterals(
                    erc721MortgageToken as any,
                    deployer,
                    {
                        tokens: collaterals.map((x) => x.address),
                        isCollateral: true,
                    },
                    admin,
                    admins
                )
            );

            const account = randomWallet();
            const toDeauth = [collaterals[0], account];

            await expect(
                getERC721MortgageTokenTxByInput_RegisterCollaterals(
                    erc721MortgageToken as any,
                    deployer,
                    {
                        tokens: toDeauth.map((x) => x.address),
                        isCollateral: false,
                    },
                    admin,
                    admins
                )
            ).to.be.revertedWithCustomError(erc721MortgageToken, `NotRegisteredCollateral`);
        });

        it('7.2.4.8. Deregister collaterals unsuccessfully when unauthorizing the same account twice on the same tx', async () => {
            const { deployer, erc721MortgageToken, admin, admins, collaterals } = await beforeERC721MortgageTokenTest();

            await callTransaction(
                getERC721MortgageTokenTxByInput_RegisterCollaterals(
                    erc721MortgageToken as any,
                    deployer,
                    {
                        tokens: collaterals.map((x) => x.address),
                        isCollateral: true,
                    },
                    admin,
                    admins
                )
            );

            const toDeauth = collaterals.slice(0, 2).concat([collaterals[0]]);
            await expect(
                getERC721MortgageTokenTxByInput_RegisterCollaterals(
                    erc721MortgageToken as any,
                    deployer,
                    {
                        tokens: toDeauth.map((x) => x.address),
                        isCollateral: false,
                    },
                    admin,
                    admins
                )
            ).to.be.revertedWithCustomError(erc721MortgageToken, `NotRegisteredCollateral`);
        });

        it('7.2.4.9. Deregister collaterals unsuccessfully when unauthorizing the same account twice on different txs', async () => {
            const { deployer, erc721MortgageToken, admin, admins, collaterals } = await beforeERC721MortgageTokenTest();

            await callTransaction(
                getERC721MortgageTokenTxByInput_RegisterCollaterals(
                    erc721MortgageToken as any,
                    deployer,
                    {
                        tokens: collaterals.map((x) => x.address),
                        isCollateral: true,
                    },
                    admin,
                    admins
                )
            );

            const tx1Accounts = collaterals.slice(0, 2);
            await callTransaction(
                getERC721MortgageTokenTxByInput_RegisterCollaterals(
                    erc721MortgageToken as any,
                    deployer,
                    {
                        tokens: tx1Accounts.map((x) => x.address),
                        isCollateral: false,
                    },
                    admin,
                    admins
                )
            );

            const tx2Accounts = [collaterals[0]];
            await expect(
                getERC721MortgageTokenTxByInput_RegisterCollaterals(
                    erc721MortgageToken as any,
                    deployer,
                    {
                        tokens: tx2Accounts.map((x) => x.address),
                        isCollateral: false,
                    },
                    admin,
                    admins
                )
            ).to.be.revertedWithCustomError(erc721MortgageToken, `NotRegisteredCollateral`);
        });
    });

    /* --- Query --- */
    describe('3.1.5. getMortgage(uint256)', () => {
        it('3.1.5.1. Revert with invalid mortgage id', async () => {
            const fixture = await beforeERC721MortgageTokenTest({
                listSampleMortgage: true,
            });

            const { erc721MortgageToken } = fixture;

            await expect(erc721MortgageToken.getMortgage(0)).to.be.revertedWithCustomError(
                erc721MortgageToken,
                'InvalidMortgageId'
            );
            await expect(erc721MortgageToken.getMortgage(100)).to.be.revertedWithCustomError(
                erc721MortgageToken,
                'InvalidMortgageId'
            );
        });
    });

    describe('3.1.6. getCollateral(uint256)', () => {
        it('3.1.6.1. Revert with invalid mortgage id', async () => {
            const fixture = await beforeERC721MortgageTokenTest({
                listSampleMortgage: true,
                listSampleLending: true,
            });

            const { erc721MortgageToken } = fixture;

            await expect(erc721MortgageToken.getCollateral(0)).to.be.revertedWithCustomError(
                erc721MortgageToken,
                'InvalidMortgageId'
            );
            await expect(erc721MortgageToken.getCollateral(100)).to.be.revertedWithCustomError(
                erc721MortgageToken,
                'InvalidMortgageId'
            );
        });
    });

    describe('3.1.7. royaltyInfo(uint256,uint256)', () => {
        it('3.1.7.1. Return correct royalty info for collection supporting ERC2981', async () => {
            const fixture = await beforeERC721MortgageTokenTest({
                listSampleMortgage: true,
                listSampleLending: true,
            });
            const { erc721MortgageToken, feeReceiver, feeReceiverCollection, otherCollection } = fixture;

            const salePrice = ethers.BigNumber.from(1e6);

            const royaltyInfo1 = await erc721MortgageToken.royaltyInfo(1, salePrice);
            const royaltyFee1 = (await feeReceiverCollection.royaltyInfo(1, salePrice))[1];
            expect(royaltyInfo1[0]).to.equal(feeReceiver.address);
            expect(royaltyInfo1[1]).to.equal(royaltyFee1);

            const royaltyInfo2 = await erc721MortgageToken.royaltyInfo(2, salePrice);
            const royaltyFee2 = (await otherCollection.royaltyInfo(2, salePrice))[1];
            expect(royaltyInfo2[0]).to.equal(feeReceiver.address);
            expect(royaltyInfo2[1]).to.equal(royaltyFee2);
        });

        it('3.1.7.2. Return zero for collection not supporting ERC2981', async () => {
            const fixture = await beforeERC721MortgageTokenTest({
                skipListSampleCollectionTokens: true,
            });

            const { deployer, erc721MortgageToken, borrower1, admin, admins, lender1 } = fixture;

            const CollectionFactory = await ethers.getContractFactory('Collection');
            const collection = await upgrades.deployProxy(CollectionFactory, ['TestCollection', 'TC']);

            await callTransaction(collection.mint(borrower1.address, 1));
            await callTransaction(collection.connect(borrower1).setApprovalForAll(erc721MortgageToken.address, true));

            await callTransaction(
                getERC721MortgageTokenTxByInput_RegisterCollaterals(
                    erc721MortgageToken,
                    deployer,
                    {
                        tokens: [collection.address],
                        isCollateral: true,
                    },
                    admin,
                    admins
                )
            );

            await callTransaction(
                getERC721MortgageTokenTx_Borrow(erc721MortgageToken, borrower1, {
                    token: collection.address,
                    tokenId: BigNumber.from(1),
                    principal: BigNumber.from(10e5),
                    repayment: BigNumber.from(11e5),
                    currency: ethers.constants.AddressZero,
                    duration: 1000,
                })
            );

            await callTransaction(
                getMortgageTokenTx_Lend(erc721MortgageToken, lender1, { mortgageId: BigNumber.from(1) }, { value: 1e9 })
            );

            const royaltyInfo = await erc721MortgageToken.royaltyInfo(1, ethers.BigNumber.from(1e6));
            expect(royaltyInfo[0]).to.equal(ethers.constants.AddressZero);
            expect(royaltyInfo[1]).to.equal(0);
        });

        it('3.1.7.3. Revert with invalid token id', async () => {
            const fixture = await beforeERC721MortgageTokenTest({
                listSampleMortgage: true,
            });
            const { erc721MortgageToken } = fixture;

            const salePrice = ethers.utils.parseEther('10');

            await expect(erc721MortgageToken.royaltyInfo(0, salePrice)).to.be.revertedWith('ERC721: invalid token ID');
            await expect(erc721MortgageToken.royaltyInfo(100, salePrice)).to.be.revertedWith(
                'ERC721: invalid token ID'
            );

            await expect(erc721MortgageToken.royaltyInfo(1, salePrice)).to.be.revertedWith('ERC721: invalid token ID');
            await expect(erc721MortgageToken.royaltyInfo(2, salePrice)).to.be.revertedWith('ERC721: invalid token ID');
        });
    });

    describe('3.1.8. supportsInterface(bytes4)', () => {
        it('3.1.8.1. Return true for appropriate interface', async () => {
            const fixture = await beforeERC721MortgageTokenTest();
            const { erc721MortgageToken } = fixture;

            expect(await erc721MortgageToken.supportsInterface(getBytes4Hex(IMortgageTokenInterfaceId))).to.equal(true);

            expect(await erc721MortgageToken.supportsInterface(getBytes4Hex(IERC165UpgradeableInterfaceId))).to.equal(
                true
            );
            expect(
                await erc721MortgageToken.supportsInterface(getBytes4Hex(IERC721MetadataUpgradeableInterfaceId))
            ).to.equal(true);
            expect(await erc721MortgageToken.supportsInterface(getBytes4Hex(IERC2981UpgradeableInterfaceId))).to.equal(
                true
            );
        });
    });

    /* --- Command --- */
    describe('3.1.9. borrow(address,uint256,uint256,uint256,address,uint40)', async () => {
        async function beforeBorrowTest(
            fixture: ERC721MortgageTokenFixture
        ): Promise<{ defaultParams: ERC721BorrowParams }> {
            const { feeReceiverCollection } = fixture;
            return {
                defaultParams: {
                    token: feeReceiverCollection.address,
                    tokenId: BigNumber.from(1),
                    principal: BigNumber.from(10e5),
                    repayment: BigNumber.from(11e5),
                    currency: ethers.constants.AddressZero,
                    duration: 1000,
                },
            };
        }

        it('3.1.9.1. Create mortgage successfully', async () => {
            const fixture = await beforeERC721MortgageTokenTest();
            const {
                erc721MortgageToken,
                admin,
                borrower1,
                borrower2,
                currency,
                feeReceiverCollection,
                otherCollection,
            } = fixture;

            const params1: ERC721BorrowParams = {
                token: feeReceiverCollection.address,
                tokenId: BigNumber.from(1),
                principal: BigNumber.from(10e5),
                repayment: BigNumber.from(11e5),
                currency: ethers.constants.AddressZero,
                duration: 1000,
            };

            const tx1 = await getERC721MortgageTokenTx_Borrow(erc721MortgageToken, borrower1, params1);
            await tx1.wait();

            const mortgage1 = await erc721MortgageToken.getMortgage(1);
            const fee1 = scaleRate(mortgage1.principal, await erc721MortgageToken.getFeeRate());

            await expect(tx1)
                .to.emit(erc721MortgageToken, 'NewMortgage')
                .withArgs(
                    1,
                    borrower1.address,
                    params1.principal,
                    params1.repayment,
                    fee1,
                    params1.currency,
                    params1.duration
                );
            await expect(tx1).to.emit(erc721MortgageToken, 'NewCollateral').withArgs(1, params1.token, params1.tokenId);

            expect(await erc721MortgageToken.mortgageNumber()).to.equal(1);

            const collateral1 = await erc721MortgageToken.getCollateral(1);
            expect(collateral1.collection).to.equal(params1.token);
            expect(collateral1.tokenId).to.equal(params1.tokenId);

            expect(mortgage1.principal).to.equal(params1.principal);
            expect(mortgage1.repayment).to.equal(params1.repayment);
            expect(mortgage1.fee).to.equal(fee1);
            expect(mortgage1.currency).to.equal(params1.currency);
            expect(mortgage1.due).to.equal(params1.duration);
            expect(mortgage1.state).to.equal(MortgageState.Pending);
            expect(mortgage1.borrower).to.equal(borrower1.address);
            expect(mortgage1.lender).to.equal(ethers.constants.AddressZero);

            expect(await feeReceiverCollection.ownerOf(1)).to.equal(erc721MortgageToken.address);

            const params2: ERC721BorrowParams = {
                token: otherCollection.address,
                tokenId: BigNumber.from(2),
                principal: BigNumber.from(100000),
                repayment: BigNumber.from(110000),
                currency: currency.address,
                duration: 1000,
            };

            const tx2 = await getERC721MortgageTokenTx_Borrow(erc721MortgageToken, borrower2, params2);
            await tx2.wait();

            const mortgage2 = await erc721MortgageToken.getMortgage(2);
            const fee2 = await applyDiscount(
                admin,
                scaleRate(mortgage2.principal, await erc721MortgageToken.getFeeRate()),
                currency
            );

            await expect(tx2)
                .to.emit(erc721MortgageToken, 'NewMortgage')
                .withArgs(
                    2,
                    borrower2.address,
                    params2.principal,
                    params2.repayment,
                    fee2,
                    params2.currency,
                    params2.duration
                );
            await expect(tx2).to.emit(erc721MortgageToken, 'NewCollateral').withArgs(2, params2.token, params2.tokenId);

            expect(await erc721MortgageToken.mortgageNumber()).to.equal(2);

            const collateral2 = await erc721MortgageToken.getCollateral(2);
            expect(collateral2.collection).to.equal(params2.token);
            expect(collateral2.tokenId).to.equal(params2.tokenId);

            expect(mortgage2.principal).to.equal(params2.principal);
            expect(mortgage2.repayment).to.equal(params2.repayment);
            expect(mortgage2.fee).to.equal(fee2);
            expect(mortgage2.currency).to.equal(params2.currency);
            expect(mortgage2.due).to.equal(params2.duration);
            expect(mortgage2.state).to.equal(MortgageState.Pending);
            expect(mortgage2.borrower).to.equal(borrower2.address);
            expect(mortgage2.lender).to.equal(ethers.constants.AddressZero);

            expect(await otherCollection.ownerOf(2)).to.equal(erc721MortgageToken.address);
        });

        it('3.1.9.2. Create mortgage unsuccessfully when paused', async () => {
            const fixture = await beforeERC721MortgageTokenTest({
                pause: true,
            });
            const { erc721MortgageToken, borrower1 } = fixture;

            const { defaultParams } = await beforeBorrowTest(fixture);

            await expect(
                getERC721MortgageTokenTx_Borrow(erc721MortgageToken, borrower1, defaultParams)
            ).to.be.revertedWith('Pausable: paused');
        });

        it('3.1.9.3. Create mortgage unsuccessfully with unregistered collection', async () => {
            const fixture = await beforeERC721MortgageTokenTest({
                skipListSampleCollectionTokens: true,
                skipRegisterCollaterals: true,
            });
            const { erc721MortgageToken, borrower1 } = fixture;

            const { defaultParams } = await beforeBorrowTest(fixture);

            await expect(
                getERC721MortgageTokenTx_Borrow(erc721MortgageToken, borrower1, defaultParams)
            ).to.be.revertedWithCustomError(erc721MortgageToken, 'InvalidCollateral');
        });

        it('3.1.9.4. Create mortgage unsuccessfully with invalid erc721 id', async () => {
            const fixture = await beforeERC721MortgageTokenTest();
            const { erc721MortgageToken, borrower1 } = fixture;

            const { defaultParams } = await beforeBorrowTest(fixture);

            await expect(
                getERC721MortgageTokenTx_Borrow(erc721MortgageToken, borrower1, {
                    ...defaultParams,
                    tokenId: BigNumber.from(0),
                })
            ).to.be.revertedWith('ERC721: invalid token ID');

            await expect(
                getERC721MortgageTokenTx_Borrow(erc721MortgageToken, borrower1, {
                    ...defaultParams,
                    tokenId: BigNumber.from(3),
                })
            ).to.be.revertedWith('ERC721: invalid token ID');
        });

        it('3.1.9.5. Create mortgage unsuccessfully with invalid currency', async () => {
            const fixture = await beforeERC721MortgageTokenTest({
                skipListSampleCurrencies: true,
            });
            const { erc721MortgageToken, borrower1 } = fixture;
            const { defaultParams } = await beforeBorrowTest(fixture);

            await expect(
                getERC721MortgageTokenTx_Borrow(erc721MortgageToken, borrower1, defaultParams)
            ).to.be.revertedWithCustomError(erc721MortgageToken, 'InvalidCurrency');
        });

        it('3.1.9.6. Create mortgage unsuccessfully when borrower is not token owner', async () => {
            const fixture = await beforeERC721MortgageTokenTest();
            const { erc721MortgageToken, feeReceiverCollection, borrower2 } = fixture;
            const { defaultParams } = await beforeBorrowTest(fixture);

            await expect(
                getERC721MortgageTokenTx_Borrow(erc721MortgageToken, borrower2, {
                    ...defaultParams,
                    token: feeReceiverCollection.address,
                    tokenId: BigNumber.from(1),
                })
            ).to.be.revertedWithCustomError(erc721MortgageToken, 'InvalidCollateral');
        });

        it('3.1.9.7. Create mortgage unsuccessfully with invalid principal', async () => {
            const fixture = await beforeERC721MortgageTokenTest();
            const { erc721MortgageToken, borrower1 } = fixture;
            const { defaultParams } = await beforeBorrowTest(fixture);

            await expect(
                getERC721MortgageTokenTx_Borrow(erc721MortgageToken, borrower1, {
                    ...defaultParams,
                    principal: BigNumber.from(0),
                })
            ).to.be.revertedWithCustomError(erc721MortgageToken, 'InvalidPrincipal');
        });

        it('3.1.9.8. Create mortgage unsuccessfully with invalid repayment', async () => {
            const fixture = await beforeERC721MortgageTokenTest();
            const { erc721MortgageToken, borrower1 } = fixture;
            const { defaultParams } = await beforeBorrowTest(fixture);

            await expect(
                getERC721MortgageTokenTx_Borrow(erc721MortgageToken, borrower1, {
                    ...defaultParams,
                    repayment: defaultParams.principal.sub(1),
                })
            ).to.be.revertedWithCustomError(erc721MortgageToken, 'InvalidRepayment');
        });
    });

    describe('3.1.10. cancel(uint256)', async () => {
        it('3.1.10.1. Cancel mortgage successfully by borrower', async () => {
            const fixture = await beforeERC721MortgageTokenTest({
                listSampleMortgage: true,
            });
            const { erc721MortgageToken, borrower1 } = fixture;

            let tx = await getMortgageTokenTx_Cancel(erc721MortgageToken, borrower1, {
                mortgageId: BigNumber.from(1),
            });
            await tx.wait();

            expect(tx).to.emit(erc721MortgageToken, 'MortgageCancellation').withArgs(1);

            expect(await erc721MortgageToken.mortgageNumber()).to.equal(2);

            const mortgage = await erc721MortgageToken.getMortgage(1);
            expect(mortgage.state).to.equal(MortgageState.Cancelled);
        });

        it('3.1.10.2. Cancel mortgage successfully by manager', async () => {
            const fixture = await beforeERC721MortgageTokenTest({
                listSampleMortgage: true,
            });
            const { erc721MortgageToken, manager } = fixture;

            let tx = await getMortgageTokenTx_Cancel(erc721MortgageToken, manager, {
                mortgageId: BigNumber.from(2),
            });
            await tx.wait();

            expect(tx).to.emit(erc721MortgageToken, 'MortgageCancellation').withArgs(2);

            expect(await erc721MortgageToken.mortgageNumber()).to.equal(2);

            const mortgage = await erc721MortgageToken.getMortgage(2);
            expect(mortgage.state).to.equal(MortgageState.Cancelled);
        });

        it('3.1.10.3. Cancel mortgage unsuccessfully by unauthorized user', async () => {
            const fixture = await beforeERC721MortgageTokenTest({
                listSampleMortgage: true,
            });
            const { erc721MortgageToken, lender1, moderator } = fixture;
            await expect(
                getMortgageTokenTx_Cancel(erc721MortgageToken, lender1, {
                    mortgageId: BigNumber.from(1),
                })
            ).to.be.revertedWithCustomError(erc721MortgageToken, 'Unauthorized');
            await expect(
                getMortgageTokenTx_Cancel(erc721MortgageToken, moderator, {
                    mortgageId: BigNumber.from(1),
                })
            ).to.be.revertedWithCustomError(erc721MortgageToken, 'Unauthorized');
        });

        it('3.1.10.4. Cancel mortgage unsuccessfully with invalid mortgage id', async () => {
            const fixture = await beforeERC721MortgageTokenTest({
                listSampleMortgage: true,
            });
            const { erc721MortgageToken, borrower1 } = fixture;
            await expect(
                getMortgageTokenTx_Cancel(erc721MortgageToken, borrower1, {
                    mortgageId: BigNumber.from(0),
                })
            ).to.be.revertedWithCustomError(erc721MortgageToken, 'InvalidMortgageId');

            await expect(
                getMortgageTokenTx_Cancel(erc721MortgageToken, borrower1, {
                    mortgageId: BigNumber.from(3),
                })
            ).to.be.revertedWithCustomError(erc721MortgageToken, 'InvalidMortgageId');
        });

        it('3.1.10.5. Cancel mortgage unsuccessfully with cancelled mortgage', async () => {
            const fixture = await beforeERC721MortgageTokenTest({
                listSampleMortgage: true,
            });
            const { erc721MortgageToken, borrower1 } = fixture;
            await callTransaction(
                getMortgageTokenTx_Cancel(erc721MortgageToken, borrower1, {
                    mortgageId: BigNumber.from(1),
                })
            );

            await expect(
                getMortgageTokenTx_Cancel(erc721MortgageToken, borrower1, {
                    mortgageId: BigNumber.from(1),
                })
            ).to.be.revertedWithCustomError(erc721MortgageToken, 'InvalidCancelling');
        });

        it('3.1.10.6. Cancel mortgage unsuccessfully with supplied mortgage', async () => {
            const fixture = await beforeERC721MortgageTokenTest({
                listSampleMortgage: true,
            });
            const { erc721MortgageToken, borrower1, lender1 } = fixture;

            await callTransaction(
                getMortgageTokenTx_Lend(erc721MortgageToken, lender1, { mortgageId: BigNumber.from(1) }, { value: 1e9 })
            );

            await expect(
                getMortgageTokenTx_Cancel(erc721MortgageToken, borrower1, {
                    mortgageId: BigNumber.from(1),
                })
            ).to.be.revertedWithCustomError(erc721MortgageToken, 'InvalidCancelling');
        });

        it('3.1.10.7. Cancel mortgage unsuccessfully with foreclosed mortgage', async () => {
            const fixture = await beforeERC721MortgageTokenTest({
                listSampleMortgage: true,
            });
            const { erc721MortgageToken, borrower1, lender1 } = fixture;

            await callTransaction(
                getMortgageTokenTx_Lend(erc721MortgageToken, lender1, { mortgageId: BigNumber.from(1) }, { value: 1e9 })
            );

            const due = (await erc721MortgageToken.getMortgage(1)).due;

            await time.setNextBlockTimestamp(due);
            await callTransaction(
                getMortgageTokenTx_Foreclose(erc721MortgageToken, lender1, {
                    mortgageId: BigNumber.from(1),
                })
            );

            await expect(
                getMortgageTokenTx_Cancel(erc721MortgageToken, borrower1, {
                    mortgageId: BigNumber.from(1),
                })
            ).to.be.revertedWithCustomError(erc721MortgageToken, 'InvalidCancelling');
        });

        it('3.1.10.8. Cancel mortgage unsuccessfully with repaid mortgage', async () => {
            const fixture = await beforeERC721MortgageTokenTest({
                listSampleMortgage: true,
            });
            const { erc721MortgageToken, borrower1, lender1 } = fixture;

            await callTransaction(
                getMortgageTokenTx_Lend(erc721MortgageToken, lender1, { mortgageId: BigNumber.from(1) }, { value: 1e9 })
            );

            await callTransaction(
                getMortgageTokenTx_Repay(
                    erc721MortgageToken,
                    borrower1,
                    { mortgageId: BigNumber.from(1) },
                    { value: 1e9 }
                )
            );

            await expect(
                getMortgageTokenTx_Cancel(erc721MortgageToken, borrower1, {
                    mortgageId: BigNumber.from(1),
                })
            ).to.be.revertedWithCustomError(erc721MortgageToken, 'InvalidCancelling');
        });
    });

    describe('3.1.11. lend(uint256)', async () => {
        async function testLend(
            fixture: ERC721MortgageTokenFixture,
            currencyExclusiveRate: BigNumber,
            erc721MortgageTokenFeeRate: BigNumber,
            isERC20: boolean,
            isExclusive: boolean,
            principal: BigNumber,
            repayment: BigNumber,
            isSafeLend: boolean
        ) {
            const {
                erc721MortgageToken,
                admin,
                admins,
                deployer,
                borrower1,
                lender1,
                feeReceiver,
                feeReceiverCollection,
            } = fixture;

            const borrower = borrower1;
            const lender = lender1;

            await callTransaction(
                getMortgageTokenTxByInput_UpdateFeeRate(
                    erc721MortgageToken as any,
                    deployer,
                    {
                        feeRate: erc721MortgageTokenFeeRate,
                    },
                    admin,
                    admins
                )
            );

            let collection = feeReceiverCollection;

            const currentTokenId = (await collection.tokenNumber()).add(1);
            const currentMortgageId = (await erc721MortgageToken.mortgageNumber()).add(1);

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

            await callTransaction(collection.mint(borrower.address, currentTokenId));
            await callTransaction(collection.connect(borrower).setApprovalForAll(erc721MortgageToken.address, true));

            const walletsToReset = [feeReceiver];
            if (isERC20) {
                await resetERC20(newCurrency!, walletsToReset);
            } else {
                await resetNativeToken(ethers.provider, walletsToReset);
            }

            const due = 1000;
            await callTransaction(
                getERC721MortgageTokenTx_Borrow(erc721MortgageToken, borrower, {
                    token: collection.address,
                    tokenId: currentTokenId,
                    principal: principal,
                    repayment: repayment,
                    currency: newCurrencyAddress,
                    duration: due,
                })
            );

            let fee = principal.mul(erc721MortgageTokenFeeRate).div(Constant.COMMON_RATE_MAX_FRACTION);
            if (isExclusive) {
                fee = fee.sub(fee.mul(currencyExclusiveRate).div(Constant.COMMON_RATE_MAX_FRACTION));
            }

            let ethValue = ethers.BigNumber.from(0);
            await prepareNativeToken(ethers.provider, deployer, [lender], ethers.utils.parseEther('1.0'));
            if (isERC20) {
                await prepareERC20(newCurrency!, [lender], [erc721MortgageToken], principal);
            } else {
                ethValue = principal;
                await prepareNativeToken(ethers.provider, deployer, [lender], principal);
            }

            let currentTotalSupply = await erc721MortgageToken.totalSupply();

            let initBorrowerBalance = await getBalance(ethers.provider, borrower.address, newCurrency);
            let initLenderBalance = await getBalance(ethers.provider, lender.address, newCurrency);
            let initFeeReceiverBalance = await getBalance(ethers.provider, feeReceiver.address, newCurrency);

            currentTimestamp += 100;
            await time.setNextBlockTimestamp(currentTimestamp);

            let tx;
            if (isSafeLend) {
                tx = await getMortgageTokenTx_Lend(
                    erc721MortgageToken,
                    lender,
                    { mortgageId: currentMortgageId },
                    { value: ethValue }
                );
            } else {
                tx = await getMortgageTokenTxByParams_SafeLend(
                    erc721MortgageToken,
                    lender,
                    { mortgageId: currentMortgageId },
                    { value: ethValue }
                );
            }
            const receipt = await tx.wait();

            let expectedBorrowerBalance = initBorrowerBalance.add(principal).sub(fee);
            let expectedLenderBalance = initLenderBalance.sub(principal);
            let expectedFeeReceiverBalance = initFeeReceiverBalance.add(fee);

            if (!isERC20) {
                const gasFee = receipt.gasUsed.mul(receipt.effectiveGasPrice);
                expectedLenderBalance = expectedLenderBalance.sub(gasFee);
            }

            await expect(tx)
                .to.emit(erc721MortgageToken, 'NewToken')
                .withArgs(currentMortgageId, lender.address, currentTimestamp + due);

            const mortgage = await erc721MortgageToken.getMortgage(currentMortgageId);
            expect(mortgage.due).to.equal(currentTimestamp + due);
            expect(mortgage.state).to.equal(MortgageState.Supplied);
            expect(mortgage.lender).to.equal(lender.address);

            expect(await erc721MortgageToken.totalSupply()).to.equal(currentTotalSupply.add(1));

            expect(await getBalance(ethers.provider, borrower.address, newCurrency)).to.equal(expectedBorrowerBalance);
            expect(await getBalance(ethers.provider, lender.address, newCurrency)).to.equal(expectedLenderBalance);
            expect(await getBalance(ethers.provider, feeReceiver.address, newCurrency)).to.equal(
                expectedFeeReceiverBalance
            );

            expect(await erc721MortgageToken.ownerOf(currentMortgageId)).to.equal(lender.address);

            if (isERC20) {
                await resetERC20(newCurrency!, [borrower, lender, feeReceiver]);
            } else {
                await resetNativeToken(ethers.provider, [borrower, lender, feeReceiver]);
                await prepareNativeToken(ethers.provider, deployer, [borrower, lender], ethers.utils.parseEther('1.0'));
            }
        }

        it('3.1.11.1. Lend successfully in native and erc20 token', async () => {
            const fixture = await beforeERC721MortgageTokenTest({
                skipListSampleCurrencies: true,
                skipListSampleCollectionTokens: true,
            });
            await testLend(
                fixture,
                ethers.utils.parseEther('0.3'),
                LendInitialization.ERC721_MORTGAGE_TOKEN_FeeRate,
                false,
                false,
                ethers.BigNumber.from(10e5),
                ethers.BigNumber.from(11e5),
                false
            );

            await testLend(
                fixture,
                ethers.utils.parseEther('0.3'),
                LendInitialization.ERC721_MORTGAGE_TOKEN_FeeRate,
                true,
                true,
                ethers.BigNumber.from(100000),
                ethers.BigNumber.from(110000),
                false
            );
        });

        it('3.1.11.2. Lend successfully in all native/erc20 and exclusive/non-exclusive combinations', async () => {
            const fixture = await beforeERC721MortgageTokenTest({
                skipListSampleCurrencies: true,
                skipListSampleCollectionTokens: true,
            });
            for (const isERC20 of [false, true]) {
                for (const isExclusive of [false, true]) {
                    if (isExclusive && !isERC20) {
                        continue;
                    }
                    await testLend(
                        fixture,
                        ethers.utils.parseEther('0.3'),
                        LendInitialization.ERC721_MORTGAGE_TOKEN_FeeRate,
                        isERC20,
                        isExclusive,
                        ethers.BigNumber.from(10e5),
                        ethers.BigNumber.from(11e5),
                        false
                    );
                }
            }
        });

        it('3.1.11.3. Lend successfully with very large amount in all native/erc20 and exclusive/non-exclusive combinations', async () => {
            const fixture = await beforeERC721MortgageTokenTest({
                skipListSampleCurrencies: true,
                skipListSampleCollectionTokens: true,
            });
            for (const isERC20 of [false, true]) {
                for (const isExclusive of [false, true]) {
                    if (isExclusive && !isERC20) {
                        continue;
                    }
                    const principal = ethers.BigNumber.from(2).pow(255);
                    const repayment = principal.add(1);
                    await testLend(
                        fixture,
                        ethers.utils.parseEther('0.99'),
                        ethers.utils.parseEther('0.99'),
                        isERC20,
                        isExclusive,
                        principal,
                        repayment,
                        false
                    );
                }
            }
        });

        it('3.1.11.4. Lend successfully in 100 random test cases', async () => {
            const fixture = await beforeERC721MortgageTokenTest({
                skipListSampleCurrencies: true,
                skipListSampleCollectionTokens: true,
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

                const principal = randomNums[0];
                const repayment = randomNums[1];

                await testLend(fixture, exclusiveRate, feeRate, isERC20, isExclusive, principal, repayment, false);
            }
        });

        it('3.1.11.5. Lend unsuccessfully when paused', async () => {
            const fixture = await beforeERC721MortgageTokenTest({
                listSampleMortgage: true,
                pause: true,
            });
            const { erc721MortgageToken, borrower1 } = fixture;

            await expect(
                getMortgageTokenTx_Lend(
                    erc721MortgageToken,
                    borrower1,
                    { mortgageId: BigNumber.from(1) },
                    { value: 1e9 }
                )
            ).to.be.revertedWith('Pausable: paused');
        });

        it('3.1.11.6. Lend unsuccessfully with invalid mortgage id', async () => {
            const fixture = await beforeERC721MortgageTokenTest({
                listSampleMortgage: true,
            });
            const { erc721MortgageToken, borrower1 } = fixture;

            await expect(
                getMortgageTokenTx_Lend(
                    erc721MortgageToken,
                    borrower1,
                    { mortgageId: BigNumber.from(0) },
                    { value: 1e9 }
                )
            ).to.be.revertedWithCustomError(erc721MortgageToken, 'InvalidMortgageId');

            await expect(
                getMortgageTokenTx_Lend(
                    erc721MortgageToken,
                    borrower1,
                    { mortgageId: BigNumber.from(3) },
                    { value: 1e9 }
                )
            ).to.be.revertedWithCustomError(erc721MortgageToken, 'InvalidMortgageId');
        });

        it('3.1.11.7. Lend unsuccessfully when borrower lend their own mortgage', async () => {
            const fixture = await beforeERC721MortgageTokenTest({
                listSampleMortgage: true,
            });
            const { erc721MortgageToken, borrower1, borrower2 } = fixture;

            await expect(
                getMortgageTokenTx_Lend(
                    erc721MortgageToken,
                    borrower1,
                    { mortgageId: BigNumber.from(1) },
                    { value: 1e9 }
                )
            ).to.be.revertedWithCustomError(erc721MortgageToken, 'InvalidLending');

            await expect(
                getMortgageTokenTx_Lend(
                    erc721MortgageToken,
                    borrower2,
                    { mortgageId: BigNumber.from(2) },
                    { value: 1e9 }
                )
            ).to.be.revertedWithCustomError(erc721MortgageToken, 'InvalidLending');
        });

        it('3.1.11.8. Lend unsuccessfully with supplied mortgage', async () => {
            const fixture = await beforeERC721MortgageTokenTest({
                listSampleMortgage: true,
            });
            const { erc721MortgageToken, lender1, lender2 } = fixture;

            await callTransaction(
                getMortgageTokenTx_Lend(erc721MortgageToken, lender1, { mortgageId: BigNumber.from(1) }, { value: 1e9 })
            );

            await expect(
                getMortgageTokenTx_Lend(erc721MortgageToken, lender1, { mortgageId: BigNumber.from(1) }, { value: 1e9 })
            ).to.be.revertedWithCustomError(erc721MortgageToken, 'InvalidLending');
            await expect(
                getMortgageTokenTx_Lend(erc721MortgageToken, lender2, { mortgageId: BigNumber.from(1) }, { value: 1e9 })
            ).to.be.revertedWithCustomError(erc721MortgageToken, 'InvalidLending');
        });

        it('3.1.11.9. Lend unsuccessfully with repaid mortgage', async () => {
            const fixture = await beforeERC721MortgageTokenTest({
                listSampleMortgage: true,
            });
            const { erc721MortgageToken, borrower1, lender1, lender2 } = fixture;

            await callTransaction(
                getMortgageTokenTx_Lend(erc721MortgageToken, lender1, { mortgageId: BigNumber.from(1) }, { value: 1e9 })
            );

            await callTransaction(
                getMortgageTokenTx_Repay(
                    erc721MortgageToken,
                    borrower1,
                    { mortgageId: BigNumber.from(1) },
                    { value: 1e9 }
                )
            );

            await expect(
                getMortgageTokenTx_Lend(erc721MortgageToken, lender1, { mortgageId: BigNumber.from(1) }, { value: 1e9 })
            ).to.be.revertedWithCustomError(erc721MortgageToken, 'InvalidLending');
            await expect(
                getMortgageTokenTx_Lend(erc721MortgageToken, lender2, { mortgageId: BigNumber.from(1) }, { value: 1e9 })
            ).to.be.revertedWithCustomError(erc721MortgageToken, 'InvalidLending');
        });

        it('3.1.11.10. Lend unsuccessfully with cancelled mortgage', async () => {
            const fixture = await beforeERC721MortgageTokenTest({
                listSampleMortgage: true,
            });
            const { erc721MortgageToken, borrower1, lender1 } = fixture;

            await callTransaction(
                getMortgageTokenTx_Cancel(erc721MortgageToken, borrower1, {
                    mortgageId: BigNumber.from(1),
                })
            );

            await expect(
                getMortgageTokenTx_Lend(erc721MortgageToken, lender1, { mortgageId: BigNumber.from(1) }, { value: 1e9 })
            ).to.be.revertedWithCustomError(erc721MortgageToken, 'InvalidLending');
        });

        it('3.1.11.11. Lend unsuccessfully with foreclosed mortgage', async () => {
            const fixture = await beforeERC721MortgageTokenTest({
                listSampleMortgage: true,
            });
            const { erc721MortgageToken, lender1, lender2 } = fixture;

            await callTransaction(
                getMortgageTokenTx_Lend(erc721MortgageToken, lender1, { mortgageId: BigNumber.from(1) }, { value: 1e9 })
            );

            const due = (await erc721MortgageToken.getMortgage(1)).due;
            await time.setNextBlockTimestamp(due);

            await callTransaction(
                getMortgageTokenTx_Foreclose(erc721MortgageToken, lender1, {
                    mortgageId: BigNumber.from(1),
                })
            );

            await expect(
                getMortgageTokenTx_Lend(erc721MortgageToken, lender1, { mortgageId: BigNumber.from(1) }, { value: 1e9 })
            ).to.be.revertedWithCustomError(erc721MortgageToken, 'InvalidLending');
            await expect(
                getMortgageTokenTx_Lend(erc721MortgageToken, lender2, { mortgageId: BigNumber.from(1) }, { value: 1e9 })
            ).to.be.revertedWithCustomError(erc721MortgageToken, 'InvalidLending');
        });

        it('3.1.11.12. Lend unsuccessfully with insufficient native token', async () => {
            const fixture = await beforeERC721MortgageTokenTest({
                listSampleMortgage: true,
            });
            const { erc721MortgageToken, lender1 } = fixture;

            await expect(
                getMortgageTokenTx_Lend(erc721MortgageToken, lender1, {
                    mortgageId: BigNumber.from(1),
                })
            ).to.be.revertedWithCustomError(erc721MortgageToken, 'InsufficientValue');
        });

        it('3.1.11.13. Lend unsuccessfully when transferring native token to borrower failed', async () => {
            const fixture = await beforeERC721MortgageTokenTest({
                skipListSampleCollectionTokens: true,
            });
            const { erc721MortgageToken, lender1, deployer, feeReceiverCollection } = fixture;

            const failReceiver = await deployFailReceiver(deployer, true, false);

            await callTransaction(feeReceiverCollection.mint(failReceiver.address, 1));
            await callTransaction(
                failReceiver.call(
                    feeReceiverCollection.address,
                    feeReceiverCollection.interface.encodeFunctionData('setApprovalForAll', [
                        erc721MortgageToken.address,
                        true,
                    ])
                )
            );

            const data = erc721MortgageToken.interface.encodeFunctionData('borrow', [
                feeReceiverCollection.address,
                1,
                10e5,
                11e5,
                ethers.constants.AddressZero,
                1000,
            ]);
            await callTransaction(failReceiver.call(erc721MortgageToken.address, data));

            await expect(
                getMortgageTokenTx_Lend(erc721MortgageToken, lender1, { mortgageId: BigNumber.from(1) }, { value: 1e9 })
            ).to.be.revertedWithCustomError(erc721MortgageToken, 'FailedTransfer');
        });

        it('3.1.11.14. Buy token unsuccessfully when refunding to lender failed', async () => {
            const fixture = await beforeERC721MortgageTokenTest({
                listSampleMortgage: true,
            });
            const { erc721MortgageToken, deployer } = fixture;
            const failReceiver = await deployFailReceiver(deployer, true, false);

            let data = erc721MortgageToken.interface.encodeFunctionData('lend', [1]);

            await expect(
                failReceiver.call(erc721MortgageToken.address, data, {
                    value: 1e9,
                })
            ).to.be.revertedWithCustomError(erc721MortgageToken, 'FailedRefund');
        });

        it('3.1.11.15. Buy token unsuccessfully when the contract is reentered', async () => {
            const fixture = await beforeERC721MortgageTokenTest({
                skipListSampleCollectionTokens: true,
            });
            const { erc721MortgageToken, deployer, feeReceiverCollection, lender1 } = fixture;

            const reentrancy = await deployReentrancyReceiver(deployer, true, false);

            await callTransaction(feeReceiverCollection.mint(reentrancy.address, 1));

            await callTransaction(
                reentrancy.call(
                    feeReceiverCollection.address,
                    feeReceiverCollection.interface.encodeFunctionData('setApprovalForAll', [
                        erc721MortgageToken.address,
                        true,
                    ])
                )
            );

            await callTransaction(
                reentrancy.call(
                    erc721MortgageToken.address,
                    erc721MortgageToken.interface.encodeFunctionData('borrow', [
                        feeReceiverCollection.address,
                        1,
                        10e5,
                        11e5,
                        ethers.constants.AddressZero,
                        1000,
                    ])
                )
            );

            const mortgageId = 1;

            await testReentrancy_erc721MortgageToken(erc721MortgageToken, reentrancy, async () => {
                await expect(
                    getMortgageTokenTx_Lend(
                        erc721MortgageToken,
                        lender1,
                        { mortgageId: BigNumber.from(mortgageId) },
                        { value: 1e9 }
                    )
                ).to.be.revertedWithCustomError(erc721MortgageToken, 'FailedTransfer');
            });
        });
    });

    describe('3.1.12. safeLend(uint256,uint256)', async () => {
        it('3.1.12.1. Safe lend successfully', async () => {
            const fixture = await beforeERC721MortgageTokenTest({
                listSampleMortgage: true,
            });
            const { erc721MortgageToken, borrower1, borrower2 } = fixture;

            await expect(
                getMortgageTokenTxByParams_SafeLend(
                    erc721MortgageToken,
                    borrower2,
                    { mortgageId: BigNumber.from(1) },
                    { value: 1e9 }
                )
            ).to.not.be.reverted;

            await expect(
                getMortgageTokenTxByParams_SafeLend(erc721MortgageToken, borrower1, {
                    mortgageId: BigNumber.from(2),
                })
            ).to.not.be.reverted;
        });

        it('3.1.12.2. Safe lend unsuccessfully with invalid mortgage id', async () => {
            const fixture = await beforeERC721MortgageTokenTest({
                listSampleMortgage: true,
            });
            const { erc721MortgageToken, borrower1 } = fixture;

            await expect(
                getMortgageTokenTx_SafeLend(
                    erc721MortgageToken,
                    borrower1,
                    {
                        mortgageId: BigNumber.from(0),
                        anchor: BigNumber.from(0),
                    },
                    { value: 1e9 }
                )
            ).to.be.revertedWithCustomError(erc721MortgageToken, 'InvalidMortgageId');

            await expect(
                getMortgageTokenTx_SafeLend(
                    erc721MortgageToken,
                    borrower1,
                    {
                        mortgageId: BigNumber.from(3),
                        anchor: BigNumber.from(0),
                    },
                    { value: 1e9 }
                )
            ).to.be.revertedWithCustomError(erc721MortgageToken, 'InvalidMortgageId');
        });

        it('3.1.12.3. Safe lend unsuccessfully with invalid anchor', async () => {
            const fixture = await beforeERC721MortgageTokenTest({
                listSampleMortgage: true,
            });
            const { erc721MortgageToken, lender1 } = fixture;

            await expect(
                getMortgageTokenTx_SafeLend(
                    erc721MortgageToken,
                    lender1,
                    {
                        mortgageId: BigNumber.from(1),
                        anchor: BigNumber.from(0),
                    },
                    { value: 1e9 }
                )
            ).to.be.revertedWithCustomError(erc721MortgageToken, 'BadAnchor');

            await expect(
                getMortgageTokenTx_SafeLend(
                    erc721MortgageToken,
                    lender1,
                    {
                        mortgageId: BigNumber.from(2),
                        anchor: BigNumber.from(0),
                    },
                    { value: 1e9 }
                )
            ).to.be.revertedWithCustomError(erc721MortgageToken, 'BadAnchor');
        });
    });

    describe('3.1.13. repay(uint256)', () => {
        it('3.1.13.1. Repay successfully', async () => {
            const fixture = await beforeERC721MortgageTokenTest({
                listSampleMortgage: true,
                listSampleLending: true,
            });
            const {
                erc721MortgageToken,
                borrower1,
                borrower2,
                lender1,
                lender2,
                feeReceiverCollection,
                currency,
                erc721MortgageTokenOwner,
                otherCollection,
            } = fixture;

            let currentTimestamp = (await time.latest()) + 10;
            await time.setNextBlockTimestamp(currentTimestamp);

            let lender1NativeBalance = await ethers.provider.getBalance(lender1.address);
            let borrower1NativeBalance = await ethers.provider.getBalance(borrower1.address);
            let currentTotalSupply = await erc721MortgageToken.totalSupply();

            let tx = await getMortgageTokenTx_Repay(
                erc721MortgageToken,
                borrower1,
                { mortgageId: BigNumber.from(1) },
                { value: 1e9 }
            );
            let receipt = await tx.wait();
            let gasFee = receipt.gasUsed.mul(receipt.effectiveGasPrice);

            await expect(tx).to.emit(erc721MortgageToken, 'MortgageRepayment').withArgs(1);

            const mortgage1 = await erc721MortgageToken.getMortgage(1);
            expect(mortgage1.state).to.equal(MortgageState.Repaid);

            expect(await erc721MortgageToken.balanceOf(borrower1.address)).to.equal(0);

            expect(await erc721MortgageToken.totalSupply()).to.equal(currentTotalSupply.sub(1));

            expect(await feeReceiverCollection.ownerOf(1)).to.equal(borrower1.address);

            expect(await ethers.provider.getBalance(borrower1.address)).to.equal(
                borrower1NativeBalance.sub(gasFee).sub(11e5)
            );
            expect(await ethers.provider.getBalance(lender1.address)).to.equal(lender1NativeBalance.add(11e5));

            await callTransaction(
                erc721MortgageToken.connect(lender2).transferFrom(lender2.address, erc721MortgageTokenOwner.address, 2)
            );

            let borrower2CurrencyBalance = await currency.balanceOf(borrower2.address);
            let lender2CurrencyBalance = await currency.balanceOf(lender2.address);
            let erc721MortgageTokenOwnerBalance = await currency.balanceOf(erc721MortgageTokenOwner.address);

            tx = await getMortgageTokenTx_Repay(
                erc721MortgageToken,
                borrower2,
                { mortgageId: BigNumber.from(2) },
                { value: 1e9 }
            );
            await tx.wait();

            await expect(tx).to.emit(erc721MortgageToken, 'MortgageRepayment').withArgs(2);

            const mortgage2 = await erc721MortgageToken.getMortgage(2);
            expect(mortgage2.state).to.equal(MortgageState.Repaid);

            expect(await erc721MortgageToken.balanceOf(borrower2.address)).to.equal(0);
            expect(await erc721MortgageToken.totalSupply()).to.equal(currentTotalSupply.sub(2));

            expect(await otherCollection.ownerOf(2)).to.equal(borrower2.address);

            expect(await currency.balanceOf(borrower2.address)).to.equal(borrower2CurrencyBalance.sub(110000));
            expect(await currency.balanceOf(lender2.address)).to.equal(lender2CurrencyBalance);
            expect(await currency.balanceOf(erc721MortgageTokenOwner.address)).to.equal(
                erc721MortgageTokenOwnerBalance.add(110000)
            );
        });

        it('3.1.13.2. Repay unsuccessfully when paused', async () => {
            const fixture = await beforeERC721MortgageTokenTest({
                listSampleMortgage: true,
                listSampleLending: true,
                pause: true,
            });
            const { erc721MortgageToken, borrower1 } = fixture;

            await expect(
                getMortgageTokenTx_Repay(
                    erc721MortgageToken,
                    borrower1,
                    { mortgageId: BigNumber.from(1) },
                    { value: 1e9 }
                )
            ).to.be.revertedWith('Pausable: paused');
        });

        it('3.1.13.3. Repay unsuccessfully with invalid mortgage id', async () => {
            const fixture = await beforeERC721MortgageTokenTest({
                listSampleMortgage: true,
                listSampleLending: true,
            });
            const { erc721MortgageToken, borrower1 } = fixture;

            await expect(
                getMortgageTokenTx_Repay(erc721MortgageToken, borrower1, {
                    mortgageId: BigNumber.from(0),
                })
            ).to.be.revertedWithCustomError(erc721MortgageToken, 'InvalidMortgageId');

            await expect(
                getMortgageTokenTx_Repay(erc721MortgageToken, borrower1, {
                    mortgageId: BigNumber.from(3),
                })
            ).to.be.revertedWithCustomError(erc721MortgageToken, 'InvalidMortgageId');
        });

        it('3.1.13.4. Repay unsuccessfully with overdue mortgage', async () => {
            const fixture = await beforeERC721MortgageTokenTest({
                listSampleMortgage: true,
                listSampleLending: true,
            });
            const { erc721MortgageToken, borrower1, borrower2 } = fixture;

            const due1 = (await erc721MortgageToken.getMortgage(1)).due;
            await time.setNextBlockTimestamp(due1);

            await expect(
                getMortgageTokenTx_Repay(
                    erc721MortgageToken,
                    borrower1,
                    { mortgageId: BigNumber.from(1) },
                    { value: 1e9 }
                )
            ).to.be.revertedWithCustomError(erc721MortgageToken, 'Overdue');

            const due2 = (await erc721MortgageToken.getMortgage(2)).due;
            await time.setNextBlockTimestamp(due2);

            await expect(
                getMortgageTokenTx_Repay(erc721MortgageToken, borrower2, {
                    mortgageId: BigNumber.from(2),
                })
            ).to.be.revertedWithCustomError(erc721MortgageToken, 'Overdue');
        });

        it('3.1.13.5. Repay unsuccessfully with pending mortgage', async () => {
            const fixture = await beforeERC721MortgageTokenTest({
                listSampleMortgage: true,
            });
            const { erc721MortgageToken, borrower1, borrower2 } = fixture;

            await expect(
                getMortgageTokenTx_Repay(
                    erc721MortgageToken,
                    borrower1,
                    { mortgageId: BigNumber.from(1) },
                    { value: 1e9 }
                )
            ).to.be.revertedWithCustomError(erc721MortgageToken, 'InvalidRepaying');
            await expect(
                getMortgageTokenTx_Repay(erc721MortgageToken, borrower2, {
                    mortgageId: BigNumber.from(2),
                })
            ).to.be.revertedWithCustomError(erc721MortgageToken, 'InvalidRepaying');
        });

        it('3.1.13.6. Repay unsuccessfully with already repaid mortgage', async () => {
            const fixture = await beforeERC721MortgageTokenTest({
                listSampleMortgage: true,
                listSampleLending: true,
            });
            const { erc721MortgageToken, borrower1, borrower2 } = fixture;

            await callTransaction(
                getMortgageTokenTx_Repay(
                    erc721MortgageToken,
                    borrower1,
                    { mortgageId: BigNumber.from(1) },
                    { value: 1e9 }
                )
            );
            await callTransaction(
                getMortgageTokenTx_Repay(erc721MortgageToken, borrower2, {
                    mortgageId: BigNumber.from(2),
                })
            );

            await expect(
                getMortgageTokenTx_Repay(
                    erc721MortgageToken,
                    borrower1,
                    { mortgageId: BigNumber.from(1) },
                    { value: 1e9 }
                )
            ).to.be.revertedWithCustomError(erc721MortgageToken, 'InvalidRepaying');
            await expect(
                getMortgageTokenTx_Repay(erc721MortgageToken, borrower2, {
                    mortgageId: BigNumber.from(2),
                })
            ).to.be.revertedWithCustomError(erc721MortgageToken, 'InvalidRepaying');
        });

        it('3.1.13.7. Repay unsuccessfully with foreclosed mortgage', async () => {
            const fixture = await beforeERC721MortgageTokenTest({
                listSampleMortgage: true,
                listSampleLending: true,
            });
            const { erc721MortgageToken, borrower1, borrower2 } = fixture;

            const due = (await erc721MortgageToken.getMortgage(2)).due;
            await time.setNextBlockTimestamp(due);

            await callTransaction(
                getMortgageTokenTx_Foreclose(erc721MortgageToken, borrower1, {
                    mortgageId: BigNumber.from(1),
                })
            );
            await callTransaction(
                getMortgageTokenTx_Foreclose(erc721MortgageToken, borrower2, {
                    mortgageId: BigNumber.from(2),
                })
            );

            await expect(
                getMortgageTokenTx_Repay(
                    erc721MortgageToken,
                    borrower1,
                    { mortgageId: BigNumber.from(1) },
                    { value: 1e9 }
                )
            ).to.be.revertedWithCustomError(erc721MortgageToken, 'InvalidRepaying');
            await expect(
                getMortgageTokenTx_Repay(erc721MortgageToken, borrower2, {
                    mortgageId: BigNumber.from(2),
                })
            ).to.be.revertedWithCustomError(erc721MortgageToken, 'InvalidRepaying');
        });

        it('3.1.13.8. Repay unsuccessfully with cancelled mortgage', async () => {
            const fixture = await beforeERC721MortgageTokenTest({
                listSampleMortgage: true,
            });
            const { erc721MortgageToken, borrower1, borrower2 } = fixture;

            await callTransaction(
                getMortgageTokenTx_Cancel(erc721MortgageToken, borrower1, {
                    mortgageId: BigNumber.from(1),
                })
            );
            await callTransaction(
                getMortgageTokenTx_Cancel(erc721MortgageToken, borrower2, {
                    mortgageId: BigNumber.from(2),
                })
            );

            await expect(
                getMortgageTokenTx_Repay(
                    erc721MortgageToken,
                    borrower1,
                    { mortgageId: BigNumber.from(1) },
                    { value: 1e9 }
                )
            ).to.be.revertedWithCustomError(erc721MortgageToken, 'InvalidRepaying');
            await expect(
                getMortgageTokenTx_Repay(erc721MortgageToken, borrower2, {
                    mortgageId: BigNumber.from(2),
                })
            ).to.be.revertedWithCustomError(erc721MortgageToken, 'InvalidRepaying');
        });

        it('3.1.13.9. Repay unsuccessfully with insufficient funds', async () => {
            const fixture = await beforeERC721MortgageTokenTest({
                listSampleMortgage: true,
                listSampleLending: true,
            });
            const { erc721MortgageToken, borrower1, borrower2, currency } = fixture;

            await expect(
                getMortgageTokenTx_Repay(erc721MortgageToken, borrower1, {
                    mortgageId: BigNumber.from(1),
                })
            ).to.be.revertedWithCustomError(erc721MortgageToken, 'InsufficientValue');

            await resetERC20(currency, [borrower2]);
            await expect(
                getMortgageTokenTx_Repay(erc721MortgageToken, borrower2, {
                    mortgageId: BigNumber.from(2),
                })
            ).to.be.revertedWith('ERC20: transfer amount exceeds balance');
        });

        it('3.1.13.10. Repay unsuccessfully transferring native token to lender failed', async () => {
            const fixture = await beforeERC721MortgageTokenTest({
                listSampleMortgage: true,
            });
            const { erc721MortgageToken, borrower1, deployer } = fixture;

            const failReceiver = await deployFailReceiver(deployer, true, false);

            const principal = (await erc721MortgageToken.getMortgage(1)).principal;

            let data = erc721MortgageToken.interface.encodeFunctionData('lend', [1]);
            await callTransaction(
                failReceiver.call(erc721MortgageToken.address, data, {
                    value: principal,
                })
            );

            await expect(
                getMortgageTokenTx_Repay(
                    erc721MortgageToken,
                    borrower1,
                    { mortgageId: BigNumber.from(1) },
                    { value: 1e9 }
                )
            ).to.be.revertedWithCustomError(erc721MortgageToken, 'FailedTransfer');
        });

        it('3.1.13.11. Repay unsuccessfully when the contract is reentered', async () => {
            const fixture = await beforeERC721MortgageTokenTest({
                listSampleMortgage: true,
            });
            const { erc721MortgageToken, borrower1, deployer } = fixture;

            const reentrancy = await deployReentrancyReceiver(deployer, true, false);

            const principal = (await erc721MortgageToken.getMortgage(1)).principal;

            let data = erc721MortgageToken.interface.encodeFunctionData('lend', [1]);
            await callTransaction(
                reentrancy.call(erc721MortgageToken.address, data, {
                    value: principal,
                })
            );

            await testReentrancy_erc721MortgageToken(erc721MortgageToken, reentrancy, async () => {
                await expect(
                    getMortgageTokenTx_Repay(
                        erc721MortgageToken,
                        borrower1,
                        { mortgageId: BigNumber.from(1) },
                        { value: 1e9 }
                    )
                ).to.be.revertedWithCustomError(erc721MortgageToken, 'FailedTransfer');
            });
        });
    });

    describe('3.1.14. safeRepay(uint256,uint256)', () => {
        it('3.1.14.1. Safe repay successfully', async () => {
            const fixture = await beforeERC721MortgageTokenTest({
                listSampleMortgage: true,
                listSampleLending: true,
            });
            const { erc721MortgageToken, borrower1, borrower2 } = fixture;

            await expect(
                getMortgageTokenTxByParams_SafeRepay(
                    erc721MortgageToken,
                    borrower1,
                    { mortgageId: BigNumber.from(1) },
                    { value: 1e9 }
                )
            ).to.not.be.reverted;

            await expect(
                getMortgageTokenTxByParams_SafeRepay(erc721MortgageToken, borrower2, {
                    mortgageId: BigNumber.from(2),
                })
            ).to.not.be.reverted;
        });

        it('3.1.14.2. Safe repay unsuccessfully with invalid mortgage id', async () => {
            const fixture = await beforeERC721MortgageTokenTest({
                listSampleMortgage: true,
                listSampleLending: true,
            });
            const { erc721MortgageToken, borrower1 } = fixture;

            await expect(
                getMortgageTokenTx_SafeRepay(erc721MortgageToken, borrower1, {
                    mortgageId: BigNumber.from(0),
                    anchor: BigNumber.from(0),
                })
            ).to.be.revertedWithCustomError(erc721MortgageToken, 'InvalidMortgageId');

            await expect(
                getMortgageTokenTx_SafeRepay(erc721MortgageToken, borrower1, {
                    mortgageId: BigNumber.from(3),
                    anchor: BigNumber.from(3),
                })
            ).to.be.revertedWithCustomError(erc721MortgageToken, 'InvalidMortgageId');
        });

        it('3.1.14.3. Repay unsuccessfully with invalid anchor', async () => {
            const fixture = await beforeERC721MortgageTokenTest({
                listSampleMortgage: true,
                listSampleLending: true,
            });
            const { erc721MortgageToken, borrower1 } = fixture;

            await expect(
                getMortgageTokenTx_SafeRepay(erc721MortgageToken, borrower1, {
                    mortgageId: BigNumber.from(1),
                    anchor: BigNumber.from(0),
                })
            ).to.be.revertedWithCustomError(erc721MortgageToken, 'BadAnchor');

            await expect(
                getMortgageTokenTx_SafeRepay(erc721MortgageToken, borrower1, {
                    mortgageId: BigNumber.from(2),
                    anchor: BigNumber.from(0),
                })
            ).to.be.revertedWithCustomError(erc721MortgageToken, 'BadAnchor');
        });
    });

    describe('3.1.15. foreclose(uint256)', () => {
        it('3.1.15.1. Foreclose successfully', async () => {
            const fixture = await beforeERC721MortgageTokenTest({
                listSampleMortgage: true,
                listSampleLending: true,
            });
            const {
                user,
                erc721MortgageToken,
                feeReceiverCollection,
                otherCollection,
                lender1,
                lender2,
                erc721MortgageTokenOwner,
            } = fixture;

            let currentTotalSupply = await erc721MortgageToken.totalSupply();

            // Tx1: lender1 foreclose mortgage 1, receiver is lender1
            const due1 = (await erc721MortgageToken.getMortgage(1)).due;
            await time.setNextBlockTimestamp(due1);

            let tx = await getMortgageTokenTx_Foreclose(erc721MortgageToken, user, {
                mortgageId: BigNumber.from(1),
            });
            await tx.wait();

            await expect(tx).to.emit(erc721MortgageToken, 'MortgageForeclosure').withArgs(1, lender1.address);

            const mortgage1 = await erc721MortgageToken.getMortgage(1);
            expect(mortgage1.state).to.equal(MortgageState.Foreclosed);

            expect(await erc721MortgageToken.balanceOf(lender1.address)).to.equal(0);

            expect(await erc721MortgageToken.totalSupply()).to.equal(currentTotalSupply.sub(1));

            expect(await feeReceiverCollection.ownerOf(1)).to.equal(lender1.address);

            // Tx2: lender2 foreclose mortgage 2, receiver is another user
            await callTransaction(
                erc721MortgageToken.connect(lender2).transferFrom(lender2.address, erc721MortgageTokenOwner.address, 2)
            );

            const due2 = (await erc721MortgageToken.getMortgage(2)).due;
            await time.setNextBlockTimestamp(due2);

            tx = await getMortgageTokenTx_Foreclose(erc721MortgageToken, user, {
                mortgageId: BigNumber.from(2),
            });
            await tx.wait();

            await expect(tx)
                .to.emit(erc721MortgageToken, 'MortgageForeclosure')
                .withArgs(2, erc721MortgageTokenOwner.address);

            const mortgage2 = await erc721MortgageToken.getMortgage(2);
            expect(mortgage2.state).to.equal(MortgageState.Foreclosed);

            expect(await erc721MortgageToken.balanceOf(lender2.address)).to.equal(0);

            expect(await erc721MortgageToken.totalSupply()).to.equal(currentTotalSupply.sub(2));

            expect(await otherCollection.ownerOf(2)).to.equal(erc721MortgageTokenOwner.address);
        });

        it('3.1.15.2. Foreclose unsuccessfully when paused', async () => {
            const fixture = await beforeERC721MortgageTokenTest({
                listSampleMortgage: true,
                listSampleLending: true,
                pause: true,
            });
            const { user, erc721MortgageToken } = fixture;

            await expect(
                getMortgageTokenTx_Foreclose(erc721MortgageToken, user, {
                    mortgageId: BigNumber.from(1),
                })
            ).to.be.revertedWith('Pausable: paused');
        });

        it('3.1.15.3. Foreclose unsuccessfully with invalid mortgage id', async () => {
            const fixture = await beforeERC721MortgageTokenTest({
                listSampleMortgage: true,
                listSampleLending: true,
            });
            const { user, erc721MortgageToken } = fixture;

            await expect(
                getMortgageTokenTx_Foreclose(erc721MortgageToken, user, {
                    mortgageId: BigNumber.from(0),
                })
            ).to.be.revertedWithCustomError(erc721MortgageToken, 'InvalidMortgageId');

            await expect(
                getMortgageTokenTx_Foreclose(erc721MortgageToken, user, {
                    mortgageId: BigNumber.from(3),
                })
            ).to.be.revertedWithCustomError(erc721MortgageToken, 'InvalidMortgageId');
        });

        it('3.1.15.4. Foreclose unsuccessfully when mortgage is not overdue', async () => {
            const fixture = await beforeERC721MortgageTokenTest({
                listSampleMortgage: true,
                listSampleLending: true,
            });
            const { user, erc721MortgageToken } = fixture;

            await expect(
                getMortgageTokenTx_Foreclose(erc721MortgageToken, user, {
                    mortgageId: BigNumber.from(1),
                })
            ).to.be.revertedWithCustomError(erc721MortgageToken, 'InvalidForeclosing');
        });

        it('3.1.15.5. Foreclose unsuccessfully with pending mortgage', async () => {
            const fixture = await beforeERC721MortgageTokenTest({
                listSampleMortgage: true,
            });
            const { user, erc721MortgageToken } = fixture;

            await expect(
                getMortgageTokenTx_Foreclose(erc721MortgageToken, user, {
                    mortgageId: BigNumber.from(1),
                })
            ).to.be.revertedWithCustomError(erc721MortgageToken, 'InvalidForeclosing');
        });

        it('3.1.15.6. Foreclose unsuccessfully with repaid mortgage', async () => {
            const fixture = await beforeERC721MortgageTokenTest({
                listSampleMortgage: true,
                listSampleLending: true,
            });
            const { user, erc721MortgageToken, borrower1 } = fixture;

            await callTransaction(
                getMortgageTokenTx_Repay(
                    erc721MortgageToken,
                    borrower1,
                    { mortgageId: BigNumber.from(1) },
                    { value: 1e9 }
                )
            );

            const due = (await erc721MortgageToken.getMortgage(1)).due;
            await time.setNextBlockTimestamp(due);

            await expect(
                getMortgageTokenTx_Foreclose(erc721MortgageToken, user, {
                    mortgageId: BigNumber.from(1),
                })
            ).to.be.revertedWithCustomError(erc721MortgageToken, 'InvalidForeclosing');
        });

        it('3.1.15.7. Foreclose unsuccessfully with foreclosed mortgage', async () => {
            const fixture = await beforeERC721MortgageTokenTest({
                listSampleMortgage: true,
                listSampleLending: true,
            });
            const { user, erc721MortgageToken, lender1 } = fixture;

            const due = (await erc721MortgageToken.getMortgage(1)).due;
            await time.setNextBlockTimestamp(due);

            await callTransaction(
                getMortgageTokenTx_Foreclose(erc721MortgageToken, lender1, {
                    mortgageId: BigNumber.from(1),
                })
            );

            await expect(
                getMortgageTokenTx_Foreclose(erc721MortgageToken, user, {
                    mortgageId: BigNumber.from(1),
                })
            ).to.be.revertedWithCustomError(erc721MortgageToken, 'InvalidForeclosing');
        });

        it('3.1.15.8. Foreclose unsuccessfully with cancelled mortgage', async () => {
            const fixture = await beforeERC721MortgageTokenTest({
                listSampleMortgage: true,
            });
            const { user, erc721MortgageToken, borrower1 } = fixture;

            await callTransaction(
                getMortgageTokenTx_Cancel(erc721MortgageToken, borrower1, {
                    mortgageId: BigNumber.from(1),
                })
            );

            await expect(
                getMortgageTokenTx_Foreclose(erc721MortgageToken, user, {
                    mortgageId: BigNumber.from(1),
                })
            ).to.be.revertedWithCustomError(erc721MortgageToken, 'InvalidForeclosing');
        });
    });
});
