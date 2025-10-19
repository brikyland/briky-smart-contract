import {expect} from 'chai';
import {BigNumber, Contract} from 'ethers';
import {ethers} from 'hardhat';

// @defi-wonderland/smock
import {smock} from '@defi-wonderland/smock';

// @nomicfoundation/hardhat-network-helpers
import {loadFixture, time} from '@nomicfoundation/hardhat-network-helpers';

// @tests
import {Constant} from '@tests/test.constant';

// @tests/land
import {Initialization as LandInitialization} from '@tests/land/test.initialization';

// @tests/lend
import {Initialization as LendInitialization} from '@tests/lend/test.initialization';

// @typechain-types
import {
    Admin,
    CommissionToken__factory,
    Currency,
    ERC721MortgageToken,
    EstateMortgageToken,
    FeeReceiver,
    MockMortgageToken,
    MortgageMarketplace,
    ProjectMortgageToken,
    ProxyCaller,
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
    testReentrancy
} from '@utils/blockchain';
import {applyDiscount} from '@utils/formula';
import {MockValidator} from '@utils/mockValidator';

// @utils/deployments/common
import {deployAdmin} from '@utils/deployments/common/admin';
import {deployFeeReceiver} from '@utils/deployments/common/feeReceiver';
import {deployCurrency} from '@utils/deployments/common/currency';

// @utils/deployments/lend
import {deployEstateMortgageToken} from '@utils/deployments/lend/estateMortgageToken';
import {deployERC721MortgageToken} from '@utils/deployments/lend/erc721MortgageToken';
import {deployProjectMortgageToken} from '@utils/deployments/lend/projectMortgageToken';

// @utils/deployments/lux
import {deployMortgageMarketplace} from '@utils/deployments/lux/mortgageMarketplace';

// @utils/deployments/mock
import {deployFailReceiver} from '@utils/deployments/mock/utilities/failReceiver';
import {deployMockMortgageToken} from '@utils/deployments/mock/lend/mockMortgageToken';
import { deployReentrancyReceiver } from '@utils/deployments/mock/reentrancy/reentrancyReceiver';

// @utils/models/lux
import {OfferState} from '@utils/models/lux/offerState';

// @utils/models/lend
import {MortgageState} from '@utils/models/lend/mortgageToken';
import {
    BuyParams,
    ListParams,
    RegisterCollectionsParams,
    RegisterCollectionsParamsInput,
} from '@utils/models/lux/erc721Marketplace';

// @utils/signatures/lux
import {getRegisterCollectionsSignatures} from '@utils/signatures/lux/erc721Marketplace';

// @utils/transaction/common
import {
    getAdminTxByInput_AuthorizeManagers,
    getAdminTxByInput_AuthorizeModerators,
    getAdminTxByInput_UpdateCurrencyRegistries,
} from '@utils/transaction/common/admin';
import {getPausableTxByInput_Pause} from '@utils/transaction/common/pausable';

// @utils/transaction/land
import {getEstateTokenTxByInput_UpdateCommissionToken} from '@utils/transaction/land/estateToken';

// @utils/transaction/lend
import {getMortgageTokenTx_Foreclose, getMortgageTokenTx_Repay} from '@utils/transaction/lend/mortgageToken';

// @utils/transaction/lux
import {
    getCallERC721MarketplaceTx_List,
    getERC721MarketplaceTx_Buy,
    getERC721MarketplaceTx_Cancel,
    getERC721MarketplaceTx_List,
    getERC721MarketplaceTx_RegisterCollections,
    getERC721MarketplaceTx_SafeBuy,
    getERC721MarketplaceTxByInput_RegisterCollections,
    getERC721MarketplaceTxByParams_SafeBuy,
} from '@utils/transaction/lux/erc721Marketplace';

interface MortgageMarketplaceFixture {
    deployer: any;
    admins: any[];
    borrower1: any;
    borrower2: any;
    seller1: any;
    seller2: any;
    buyer1: any;
    buyer2: any;
    manager: any;
    moderator: any;

    admin: Admin;
    currency: Currency;
    feeReceiver: FeeReceiver;
    mortgageToken: MockMortgageToken;
    mortgageMarketplace: MortgageMarketplace;
    collections: any[];

    failReceiver: any;
}

async function testReentrancy_MortgageMarketplace(
    mortgageMarketplace: MortgageMarketplace,
    reentrancyContract: Contract,
    assertion: any
) {
    let data = [
        mortgageMarketplace.interface.encodeFunctionData('buy', [0]),
        mortgageMarketplace.interface.encodeFunctionData('safeBuy', [0, 0]),
        mortgageMarketplace.interface.encodeFunctionData('cancel', [0]),
    ];

    await testReentrancy(reentrancyContract, mortgageMarketplace, data, assertion);
}

describe('6.3. MortgageMarketplace', async () => {
    async function mortgageMarketplaceFixture(): Promise<MortgageMarketplaceFixture> {
        const [
            deployer,
            admin1,
            admin2,
            admin3,
            admin4,
            admin5,
            borrower1,
            borrower2,
            seller1,
            seller2,
            buyer1,
            buyer2,
            manager,
            moderator,
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

        const currency = (await deployCurrency(deployer.address, 'MockCurrency', 'MCK')) as Currency;

        await callTransaction(
            currency.setExclusiveDiscount(ethers.utils.parseEther('0.3'), Constant.COMMON_RATE_DECIMALS)
        );

        const mortgageToken = (await deployMockMortgageToken(
            deployer.address,
            admin.address,
            feeReceiver.address,
            LendInitialization.ESTATE_MORTGAGE_TOKEN_Name,
            LendInitialization.ESTATE_MORTGAGE_TOKEN_Symbol,
            LendInitialization.ESTATE_MORTGAGE_TOKEN_BaseURI,
            LendInitialization.ESTATE_MORTGAGE_TOKEN_FeeRate
        )) as MockMortgageToken;

        const validator = new MockValidator(deployer as any);

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

        const fakeProjectToken = randomWallet();
        const projectMortgageToken = (await deployProjectMortgageToken(
            deployer.address,
            admin.address,
            fakeProjectToken.address,
            feeReceiver.address,
            LendInitialization.PROJECT_MORTGAGE_TOKEN_Name,
            LendInitialization.PROJECT_MORTGAGE_TOKEN_Symbol,
            LendInitialization.PROJECT_MORTGAGE_TOKEN_BaseURI,
            LendInitialization.PROJECT_MORTGAGE_TOKEN_FeeRate
        )) as ProjectMortgageToken;

        const erc721MortgageToken = (await deployERC721MortgageToken(
            deployer.address,
            admin.address,
            feeReceiver.address,
            LendInitialization.ERC721_MORTGAGE_TOKEN_Name,
            LendInitialization.ERC721_MORTGAGE_TOKEN_Symbol,
            LendInitialization.ERC721_MORTGAGE_TOKEN_BaseURI,
            LendInitialization.ERC721_MORTGAGE_TOKEN_FeeRate
        )) as ERC721MortgageToken;

        const collections = [estateMortgageToken, projectMortgageToken, erc721MortgageToken, mortgageToken];
        while (collections.length < 5) {
            const i = collections.length;
            const collection = (await deployMockMortgageToken(
                deployer.address,
                admin.address,
                feeReceiver.address,
                LendInitialization.ERC721_MORTGAGE_TOKEN_Name,
                `TestCollection_${i}`,
                `TC_${i}`,
                LendInitialization.ERC721_MORTGAGE_TOKEN_FeeRate
            )) as ERC721MortgageToken;
            collections.push(collection);
        }

        const mortgageMarketplace = (await deployMortgageMarketplace(
            deployer.address,
            admin.address,
            feeReceiver.address
        )) as MortgageMarketplace;

        const failReceiver = await deployFailReceiver(deployer, false, false);

        return {
            deployer,
            admins,
            borrower1,
            borrower2,
            seller1,
            seller2,
            buyer1,
            buyer2,
            manager,
            moderator,
            admin,
            currency,
            feeReceiver,
            mortgageToken,
            mortgageMarketplace,
            collections,
            failReceiver,
        };
    }

    async function beforeMortgageMarketplaceTest({
        skipRegisterCollection = false,
        skipListSampleCurrencies = false,
        skipListSampleMortgageToken = false,
        skipFundERC20ForBuyers = false,
        listSampleOffers = false,
        initialMortgageState = MortgageState.Supplied,
        useFailRoyaltyReceiver = false,
        pause = false,
    } = {}): Promise<MortgageMarketplaceFixture> {
        const fixture = await loadFixture(mortgageMarketplaceFixture);
        const {
            deployer,
            admin,
            admins,
            currency,
            mortgageToken,
            mortgageMarketplace,
            borrower1,
            borrower2,
            seller1,
            seller2,
            buyer1,
            buyer2,
            manager,
            moderator,
            failReceiver,
        } = fixture;

        let currentTimestamp = await time.latest();

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

        if (!skipRegisterCollection) {
            await callTransaction(
                getERC721MarketplaceTxByInput_RegisterCollections(
                    mortgageMarketplace,
                    deployer,
                    {
                        collections: [mortgageToken.address],
                        isCollection: true,
                    },
                    admin,
                    admins
                )
            );
        }

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

        if (useFailRoyaltyReceiver) {
            await callTransaction(mortgageToken.updateFeeReceiver(failReceiver.address));
        }

        if (!skipListSampleMortgageToken) {
            await callTransaction(
                mortgageToken.addMortgage(
                    10e5,
                    11e5,
                    200000,
                    ethers.constants.AddressZero,
                    currentTimestamp + 1000,
                    initialMortgageState,
                    borrower1.address,
                    seller1.address
                )
            );
            await callTransaction(
                mortgageToken.addMortgage(
                    100000,
                    110000,
                    20000,
                    ethers.constants.AddressZero,
                    currentTimestamp + 1100,
                    initialMortgageState,
                    borrower2.address,
                    seller2.address
                )
            );

            await callTransaction(mortgageToken.mint(seller1.address, 1));
            await callTransaction(mortgageToken.mint(seller2.address, 2));
        }

        if (!skipFundERC20ForBuyers) {
            await prepareERC20(currency, [buyer1, buyer2], [mortgageMarketplace], ethers.BigNumber.from(1e9));
        }

        if (listSampleOffers) {
            const params1: ListParams = {
                collection: mortgageToken.address,
                tokenId: BigNumber.from(1),
                price: BigNumber.from(200000),
                currency: ethers.constants.AddressZero,
            };
            await callTransaction(getERC721MarketplaceTx_List(mortgageMarketplace, seller1, params1));

            const params2: ListParams = {
                collection: mortgageToken.address,
                tokenId: BigNumber.from(2),
                price: BigNumber.from(500000),
                currency: currency.address,
            };
            await callTransaction(getERC721MarketplaceTx_List(mortgageMarketplace, seller2, params2));

            await callTransaction(mortgageToken.connect(seller1).setApprovalForAll(mortgageMarketplace.address, true));
            await callTransaction(mortgageToken.connect(seller2).setApprovalForAll(mortgageMarketplace.address, true));
        }

        if (pause) {
            await callTransaction(getPausableTxByInput_Pause(mortgageMarketplace, deployer, admin, admins));
        }

        return {
            ...fixture,
        };
    }

    /* --- Initialization --- */
    describe('6.3.1. initialize(address,address)', async () => {
        it('6.3.1.1. Deploy successfully', async () => {
            const { mortgageMarketplace, admin, feeReceiver } = await beforeMortgageMarketplaceTest();

            expect(await mortgageMarketplace.offerNumber()).to.equal(0);

            expect(await mortgageMarketplace.admin()).to.equal(admin.address);
            expect(await mortgageMarketplace.feeReceiver()).to.equal(feeReceiver.address);
        });
    });

    /* --- Administration --- */
    describe('6.3.2. registerCollections(address[],bool,bytes[])', async () => {
        it('6.3.2.1. Register collections successfully with valid signatures', async () => {
            const { deployer, mortgageMarketplace, admin, admins, collections } = await beforeMortgageMarketplaceTest({
                skipRegisterCollection: true,
            });

            const toBeCollections = collections.slice(0, 3);
            const paramsInput: RegisterCollectionsParamsInput = {
                collections: toBeCollections.map((x) => x.address),
                isCollection: true,
            };
            const tx = await getERC721MarketplaceTxByInput_RegisterCollections(
                mortgageMarketplace as any,
                deployer,
                paramsInput,
                admin,
                admins
            );
            await tx.wait();

            for (const collection of toBeCollections) {
                await expect(tx).to.emit(mortgageMarketplace, 'CollectionRegistration').withArgs(collection.address);
            }

            for (const collection of collections) {
                const isCollection = await mortgageMarketplace.isCollection(collection.address);
                if (toBeCollections.includes(collection)) {
                    expect(isCollection).to.be.true;
                } else {
                    expect(isCollection).to.be.false;
                }
            }
        });

        it('6.3.2.2. Register collections unsuccessfully with invalid signatures', async () => {
            const { deployer, mortgageMarketplace, admin, admins, collections } = await beforeMortgageMarketplaceTest({
                skipRegisterCollection: true,
            });

            const toBeCollections = collections.slice(0, 3);
            const paramsInput: RegisterCollectionsParamsInput = {
                collections: toBeCollections.map((x) => x.address),
                isCollection: true,
            };
            const params: RegisterCollectionsParams = {
                ...paramsInput,
                signatures: await getRegisterCollectionsSignatures(
                    mortgageMarketplace,
                    paramsInput,
                    admin,
                    admins,
                    false
                ),
            };
            await expect(
                getERC721MarketplaceTx_RegisterCollections(mortgageMarketplace as any, deployer, params)
            ).to.be.revertedWithCustomError(admin, 'FailedVerification');
        });

        it('6.3.2.3. Register collections unsuccessfully with EOA', async () => {
            const { deployer, mortgageMarketplace, admin, admins } = await beforeMortgageMarketplaceTest({
                skipRegisterCollection: true,
            });

            const invalidCollection = randomWallet();

            await expect(
                getERC721MarketplaceTxByInput_RegisterCollections(
                    mortgageMarketplace as any,
                    deployer,
                    {
                        collections: [invalidCollection.address],
                        isCollection: true,
                    },
                    admin,
                    admins
                )
            ).to.be.revertedWithCustomError(mortgageMarketplace, 'InvalidCollection');
        });

        it('6.3.2.4. Register collections unsuccessfully when contract does not support IMortgageToken interface', async () => {
            const { deployer, mortgageMarketplace, admin, admins } = await beforeMortgageMarketplaceTest({
                skipRegisterCollection: true,
            });

            await expect(
                getERC721MarketplaceTxByInput_RegisterCollections(
                    mortgageMarketplace as any,
                    deployer,
                    {
                        collections: [mortgageMarketplace.address],
                        isCollection: true,
                    },
                    admin,
                    admins
                )
            ).to.be.revertedWithCustomError(mortgageMarketplace, 'InvalidCollection');
        });

        it('6.3.2.5. Register collections unsuccessfully when authorizing the same account twice on the same tx', async () => {
            const { deployer, mortgageMarketplace, admin, admins, collections } = await beforeMortgageMarketplaceTest({
                skipRegisterCollection: true,
            });

            const duplicateCollections = [collections[0], collections[1], collections[2], collections[0]];

            await expect(
                getERC721MarketplaceTxByInput_RegisterCollections(
                    mortgageMarketplace as any,
                    deployer,
                    {
                        collections: duplicateCollections.map((x) => x.address),
                        isCollection: true,
                    },
                    admin,
                    admins
                )
            ).to.be.revertedWithCustomError(mortgageMarketplace, `RegisteredCollection`);
        });

        it('6.3.2.6. Register collections unsuccessfully when authorizing the same account twice on different txs', async () => {
            const { deployer, mortgageMarketplace, admin, admins, collections } = await beforeMortgageMarketplaceTest({
                skipRegisterCollection: true,
            });

            const tx1Collections = collections.slice(0, 3);
            await callTransaction(
                getERC721MarketplaceTxByInput_RegisterCollections(
                    mortgageMarketplace,
                    deployer,
                    {
                        collections: tx1Collections.map((x) => x.address),
                        isCollection: true,
                    },
                    admin,
                    admins
                )
            );

            const tx2Collections = [collections[3], collections[2], collections[4]];
            await expect(
                getERC721MarketplaceTxByInput_RegisterCollections(
                    mortgageMarketplace as any,
                    deployer,
                    {
                        collections: tx2Collections.map((x) => x.address),
                        isCollection: true,
                    },
                    admin,
                    admins
                )
            ).to.be.revertedWithCustomError(mortgageMarketplace, `RegisteredCollection`);
        });

        it('6.3.2.7. Deregister collections successfully', async () => {
            const { deployer, mortgageMarketplace, admin, admins, collections } = await beforeMortgageMarketplaceTest({
                skipRegisterCollection: true,
            });

            await callTransaction(
                getERC721MarketplaceTxByInput_RegisterCollections(
                    mortgageMarketplace,
                    deployer,
                    {
                        collections: collections.map((x) => x.address),
                        isCollection: true,
                    },
                    admin,
                    admins
                )
            );

            const toDeregister = collections.slice(0, 2);

            const tx = await getERC721MarketplaceTxByInput_RegisterCollections(
                mortgageMarketplace as any,
                deployer,
                {
                    collections: toDeregister.map((x) => x.address),
                    isCollection: false,
                },
                admin,
                admins
            );
            await tx.wait();

            for (const collection of toDeregister) {
                await expect(tx).to.emit(mortgageMarketplace, 'CollectionDeregistration').withArgs(collection.address);
            }

            for (const collection of collections) {
                const isCollection = await mortgageMarketplace.isCollection(collection.address);
                if (toDeregister.includes(collection)) {
                    expect(isCollection).to.be.false;
                } else {
                    expect(isCollection).to.be.true;
                }
            }
        });

        it('6.3.2.8. Deregister collections unsuccessfully with unauthorized account', async () => {
            const { deployer, mortgageMarketplace, admin, admins, collections } = await beforeMortgageMarketplaceTest({
                skipRegisterCollection: true,
            });

            await callTransaction(
                getERC721MarketplaceTxByInput_RegisterCollections(
                    mortgageMarketplace,
                    deployer,
                    {
                        collections: collections.map((x) => x.address),
                        isCollection: true,
                    },
                    admin,
                    admins
                )
            );

            const account = randomWallet();
            const toDeauth = [collections[0], account];

            await expect(
                getERC721MarketplaceTxByInput_RegisterCollections(
                    mortgageMarketplace as any,
                    deployer,
                    {
                        collections: toDeauth.map((x) => x.address),
                        isCollection: false,
                    },
                    admin,
                    admins
                )
            ).to.be.revertedWithCustomError(mortgageMarketplace, `NotRegisteredCollection`);
        });

        it('6.3.2.9. Deauthorize collections unsuccessfully when unauthorizing the same account twice on the same tx', async () => {
            const { deployer, mortgageMarketplace, admin, admins, collections } = await beforeMortgageMarketplaceTest({
                skipRegisterCollection: true,
            });

            await callTransaction(
                getERC721MarketplaceTxByInput_RegisterCollections(
                    mortgageMarketplace,
                    deployer,
                    {
                        collections: collections.map((x) => x.address),
                        isCollection: true,
                    },
                    admin,
                    admins
                )
            );

            const toDeauth = collections.slice(0, 2).concat([collections[0]]);

            await expect(
                getERC721MarketplaceTxByInput_RegisterCollections(
                    mortgageMarketplace as any,
                    deployer,
                    {
                        collections: toDeauth.map((x) => x.address),
                        isCollection: false,
                    },
                    admin,
                    admins
                )
            ).to.be.revertedWithCustomError(mortgageMarketplace, `NotRegisteredCollection`);
        });

        it('6.3.2.10. Deauthorize collections unsuccessfully when unauthorizing the same account twice on different txs', async () => {
            const { deployer, mortgageMarketplace, admin, admins, collections } = await beforeMortgageMarketplaceTest({
                skipRegisterCollection: true,
            });

            await callTransaction(
                getERC721MarketplaceTxByInput_RegisterCollections(
                    mortgageMarketplace,
                    deployer,
                    {
                        collections: collections.map((x) => x.address),
                        isCollection: true,
                    },
                    admin,
                    admins
                )
            );

            const tx1Accounts = collections.slice(0, 2);
            await callTransaction(
                getERC721MarketplaceTxByInput_RegisterCollections(
                    mortgageMarketplace as any,
                    deployer,
                    {
                        collections: tx1Accounts.map((x) => x.address),
                        isCollection: false,
                    },
                    admin,
                    admins
                )
            );

            const tx2Accounts = [collections[0]];
            await expect(
                getERC721MarketplaceTxByInput_RegisterCollections(
                    mortgageMarketplace as any,
                    deployer,
                    {
                        collections: tx2Accounts.map((x) => x.address),
                        isCollection: false,
                    },
                    admin,
                    admins
                )
            ).to.be.revertedWithCustomError(mortgageMarketplace, `NotRegisteredCollection`);
        });
    });

    /* --- Query --- */
    describe('6.3.3. getOffer(uint256)', async () => {
        it('6.3.3.1. Return successfully', async () => {
            const fixture = await beforeMortgageMarketplaceTest({
                listSampleOffers: true,
            });
            const { mortgageMarketplace } = fixture;

            expect(await mortgageMarketplace.getOffer(1)).to.not.be.reverted;
            expect(await mortgageMarketplace.getOffer(2)).to.not.be.reverted;
        });

        it('6.3.3.2. Revert with invalid offer id', async () => {
            const fixture = await beforeMortgageMarketplaceTest({
                listSampleOffers: true,
            });
            const { mortgageMarketplace } = fixture;

            await expectRevertWithModifierCustomError(
                mortgageMarketplace,
                mortgageMarketplace.getOffer(0),
                'InvalidOfferId'
            );
            await expectRevertWithModifierCustomError(
                mortgageMarketplace,
                mortgageMarketplace.getOffer(3),
                'InvalidOfferId'
            );
        });
    });

    /* --- Command --- */
    describe('6.3.4. list(address,uint256,uint256,address)', async () => {
        async function beforeListTest(fixture: MortgageMarketplaceFixture): Promise<{ defaultParams: ListParams }> {
            const { mortgageToken } = fixture;
            const defaultParams = {
                collection: mortgageToken.address,
                tokenId: BigNumber.from(1),
                price: BigNumber.from(200000),
                currency: ethers.constants.AddressZero,
            };
            return { defaultParams };
        }

        it('6.3.4.1. List token successfully', async () => {
            const fixture = await beforeMortgageMarketplaceTest();
            const { mortgageMarketplace, mortgageToken, seller1, feeReceiver, currency, seller2, admin } = fixture;

            const params1: ListParams = {
                collection: mortgageToken.address,
                tokenId: BigNumber.from(1),
                price: BigNumber.from(200000),
                currency: ethers.constants.AddressZero,
            };

            const royalty1 = (await mortgageToken.royaltyInfo(params1.tokenId, params1.price))[1];

            const tx1 = await getERC721MarketplaceTx_List(mortgageMarketplace, seller1, params1);
            await tx1.wait();

            expect(tx1)
                .to.emit(mortgageMarketplace, 'NewOffer')
                .withArgs(
                    params1.collection,
                    1,
                    params1.tokenId,
                    seller1.address,
                    params1.price,
                    royalty1,
                    feeReceiver.address,
                    params1.currency
                );

            expect(await mortgageMarketplace.offerNumber()).to.equal(1);

            const offer1 = await mortgageMarketplace.getOffer(1);
            expect(offer1.collection).to.equal(params1.collection);
            expect(offer1.tokenId).to.equal(params1.tokenId);
            expect(offer1.price).to.equal(params1.price);
            expect(offer1.royalty).to.equal(royalty1);
            expect(offer1.currency).to.equal(params1.currency);
            expect(offer1.state).to.equal(OfferState.Selling);
            expect(offer1.seller).to.equal(seller1.address);
            expect(offer1.royaltyReceiver).to.equal(feeReceiver.address);

            const params2: ListParams = {
                collection: mortgageToken.address,
                tokenId: BigNumber.from(2),
                price: BigNumber.from(500000),
                currency: currency.address,
            };

            const royalty2 = await applyDiscount(
                admin,
                (await mortgageToken.royaltyInfo(params2.tokenId, params2.price))[1],
                currency
            );

            const tx2 = await getERC721MarketplaceTx_List(mortgageMarketplace, seller2, params2);
            await tx2.wait();

            expect(tx2)
                .to.emit(mortgageMarketplace, 'NewOffer')
                .withArgs(
                    params2.collection,
                    2,
                    params2.tokenId,
                    seller2.address,
                    params2.price,
                    royalty2,
                    feeReceiver.address,
                    params2.currency
                );

            expect(await mortgageMarketplace.offerNumber()).to.equal(2);

            const offer2 = await mortgageMarketplace.getOffer(2);
            expect(offer2.collection).to.equal(params2.collection);
            expect(offer2.tokenId).to.equal(params2.tokenId);
            expect(offer2.price).to.equal(params2.price);
            expect(offer2.royalty).to.equal(royalty2);
            expect(offer2.currency).to.equal(params2.currency);
            expect(offer2.state).to.equal(OfferState.Selling);
            expect(offer2.seller).to.equal(seller2.address);
            expect(offer2.royaltyReceiver).to.equal(feeReceiver.address);
        });

        it('6.3.4.2. List token unsuccessfully when paused', async () => {
            const fixture = await beforeMortgageMarketplaceTest({
                pause: true,
            });
            const { mortgageMarketplace, seller1 } = fixture;

            const { defaultParams } = await beforeListTest(fixture);

            await expect(getERC721MarketplaceTx_List(mortgageMarketplace, seller1, defaultParams)).to.be.revertedWith(
                'Pausable: paused'
            );
        });

        it('6.3.4.3. List token unsuccessfully with invalid token id', async () => {
            const fixture = await beforeMortgageMarketplaceTest();
            const { mortgageMarketplace, seller1 } = fixture;

            const { defaultParams } = await beforeListTest(fixture);

            await expect(
                getERC721MarketplaceTx_List(mortgageMarketplace, seller1, {
                    ...defaultParams,
                    tokenId: BigNumber.from(0),
                })
            ).to.be.revertedWith('ERC721: invalid token ID');

            await expect(
                getERC721MarketplaceTx_List(mortgageMarketplace, seller1, {
                    ...defaultParams,
                    tokenId: BigNumber.from(3),
                })
            ).to.be.revertedWith('ERC721: invalid token ID');
        });

        it('6.3.4.4. List token unsuccessfully with unregistered collection', async () => {
            const fixture = await beforeMortgageMarketplaceTest({
                skipRegisterCollection: true,
            });
            const { mortgageMarketplace, seller1 } = fixture;

            const { defaultParams } = await beforeListTest(fixture);

            await expect(
                getERC721MarketplaceTx_List(mortgageMarketplace, seller1, defaultParams)
            ).to.be.revertedWithCustomError(mortgageMarketplace, 'InvalidCollection');
        });

        it('6.3.4.5. List token unsuccessfully with pending mortgage', async () => {
            const fixture = await beforeMortgageMarketplaceTest({
                initialMortgageState: MortgageState.Pending,
            });
            const { mortgageMarketplace, seller1 } = fixture;

            const { defaultParams } = await beforeListTest(fixture);

            await expect(
                getERC721MarketplaceTx_List(mortgageMarketplace, seller1, defaultParams)
            ).to.be.revertedWithCustomError(mortgageMarketplace, 'InvalidTokenId');
        });

        it('6.3.4.6. List token unsuccessfully with repaid mortgage', async () => {
            const fixture = await beforeMortgageMarketplaceTest({
                initialMortgageState: MortgageState.Repaid,
            });
            const { mortgageMarketplace, seller1 } = fixture;

            const { defaultParams } = await beforeListTest(fixture);

            await expect(
                getERC721MarketplaceTx_List(mortgageMarketplace, seller1, defaultParams)
            ).to.be.revertedWithCustomError(mortgageMarketplace, 'InvalidTokenId');
        });

        it('6.3.4.7. List token unsuccessfully with foreclosed mortgage', async () => {
            const fixture = await beforeMortgageMarketplaceTest({
                initialMortgageState: MortgageState.Foreclosed,
            });
            const { mortgageMarketplace, seller1 } = fixture;

            const { defaultParams } = await beforeListTest(fixture);

            await expect(
                getERC721MarketplaceTx_List(mortgageMarketplace, seller1, defaultParams)
            ).to.be.revertedWithCustomError(mortgageMarketplace, 'InvalidTokenId');
        });

        it('6.3.4.8. List token unsuccessfully by non token owner', async () => {
            const fixture = await beforeMortgageMarketplaceTest();
            const { mortgageMarketplace, seller2 } = fixture;

            const { defaultParams } = await beforeListTest(fixture);

            await expect(
                getERC721MarketplaceTx_List(mortgageMarketplace, seller2, defaultParams)
            ).to.be.revertedWithCustomError(mortgageMarketplace, 'InvalidTokenId');
        });

        it('6.3.4.9. List token unsuccessfully with zero unit price', async () => {
            const fixture = await beforeMortgageMarketplaceTest();
            const { mortgageMarketplace, seller1 } = fixture;

            const { defaultParams } = await beforeListTest(fixture);

            await expect(
                getERC721MarketplaceTx_List(mortgageMarketplace, seller1, {
                    ...defaultParams,
                    price: BigNumber.from(0),
                })
            ).to.be.revertedWithCustomError(mortgageMarketplace, 'InvalidPrice');
        });

        it('6.3.4.10. List token unsuccessfully with invalid currency', async () => {
            const fixture = await beforeMortgageMarketplaceTest({
                skipListSampleCurrencies: true,
            });
            const { mortgageMarketplace, seller1 } = fixture;

            const { defaultParams } = await beforeListTest(fixture);

            await expect(
                getERC721MarketplaceTx_List(mortgageMarketplace, seller1, defaultParams)
            ).to.be.revertedWithCustomError(mortgageMarketplace, 'InvalidCurrency');
        });
    });

    async function testBuyOffer(
        fixture: MortgageMarketplaceFixture,
        mockCurrencyExclusiveRate: BigNumber,
        isERC20: boolean,
        isExclusive: boolean,
        price: BigNumber,
        isSafeBuy: boolean
    ) {
        const { deployer, mortgageMarketplace, borrower1, seller1, buyer1, feeReceiver, admins, admin } =
            fixture;

        const mortgageToken = (await deployMockMortgageToken(
            deployer.address,
            admin.address,
            feeReceiver.address,
            LendInitialization.ERC721_MORTGAGE_TOKEN_Name,
            `TestCollection`,
            `TC`,
            LendInitialization.ERC721_MORTGAGE_TOKEN_FeeRate
        )) as MockMortgageToken;

        const currentTokenId = (await mortgageToken.mortgageNumber()).add(1);
        const currentOfferId = (await mortgageMarketplace.offerNumber()).add(1);

        let newCurrency: Currency | null = null;
        let newCurrencyAddress: string;
        if (isERC20) {
            newCurrency = (await deployCurrency(
                deployer.address,
                `NewMockCurrency_${currentOfferId}`,
                `NMC_${currentOfferId}`
            )) as Currency;
            newCurrencyAddress = newCurrency.address;

            await callTransaction(
                newCurrency.setExclusiveDiscount(mockCurrencyExclusiveRate, Constant.COMMON_RATE_DECIMALS)
            );
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

        let currentTimestamp = await time.latest();

        const borrower = borrower1;
        const seller = seller1;
        const buyer = buyer1;

        await callTransaction(
            mortgageToken.addMortgage(
                10e5,
                11e5,
                200000,
                newCurrencyAddress,
                currentTimestamp + 1000,
                MortgageState.Supplied,
                borrower.address,
                seller.address
            )
        );
        await callTransaction(mortgageToken.mint(seller.address, currentTokenId));

        await callTransaction(
            getERC721MarketplaceTxByInput_RegisterCollections(
                mortgageMarketplace,
                deployer,
                {
                    collections: [mortgageToken.address],
                    isCollection: true,
                },
                admin,
                admins
            )
        );

        const params: ListParams = {
            collection: mortgageToken.address,
            tokenId: currentTokenId,
            price: price,
            currency: newCurrencyAddress,
        };
        await callTransaction(getERC721MarketplaceTx_List(mortgageMarketplace, seller, params));
        await callTransaction(mortgageToken.connect(seller).setApprovalForAll(mortgageMarketplace.address, true));

        let royaltyReceiver = feeReceiver.address;
        let royaltyAmount = (await mortgageToken.royaltyInfo(params.tokenId, params.price))[1];
        if (isExclusive) {
            royaltyAmount = await applyDiscount(admin, royaltyAmount, newCurrency);
        }

        let total = price.add(royaltyAmount);

        let ethValue = ethers.BigNumber.from(0);
        await prepareNativeToken(ethers.provider, deployer, [buyer], ethers.utils.parseEther('1.0'));
        if (isERC20) {
            await prepareERC20(newCurrency!, [buyer], [mortgageMarketplace], total);
        } else {
            ethValue = total;
            await prepareNativeToken(ethers.provider, deployer, [buyer], total);
        }

        let initBuyerBalance = await getBalance(ethers.provider, buyer.address, newCurrency);
        let initSellerBalance = await getBalance(ethers.provider, seller.address, newCurrency);
        let initFeeReceiverBalance = await getBalance(ethers.provider, feeReceiver.address, newCurrency);

        const buyParams: BuyParams = {
            offerId: currentOfferId,
        };

        let tx;
        if (isSafeBuy) {
            tx = await getERC721MarketplaceTxByParams_SafeBuy(mortgageMarketplace, buyer as any, buyParams, {
                value: ethValue,
            });
        } else {
            tx = await getERC721MarketplaceTx_Buy(mortgageMarketplace, buyer as any, buyParams, {
                value: ethValue,
            });
        }
        const receipt = await tx.wait();

        let expectedBuyerBalance = initBuyerBalance.sub(total);
        let expectedSellerBalance = initSellerBalance.add(price);
        let expectedFeeReceiverBalance = initFeeReceiverBalance.add(royaltyAmount);

        if (!isERC20) {
            const gasFee = receipt.gasUsed.mul(receipt.effectiveGasPrice);
            expectedBuyerBalance = expectedBuyerBalance.sub(gasFee);
        }

        await expect(tx)
            .to.emit(mortgageMarketplace, 'OfferSale')
            .withArgs(currentOfferId, buyer.address, royaltyReceiver, royaltyAmount);

        let offer = await mortgageMarketplace.getOffer(currentOfferId);
        expect(offer.tokenId).to.equal(currentTokenId);
        expect(offer.price).to.equal(price);
        expect(offer.currency).to.equal(newCurrencyAddress);
        expect(offer.state).to.equal(OfferState.Sold);
        expect(offer.seller).to.equal(seller.address);

        expect(await getBalance(ethers.provider, buyer.address, newCurrency)).to.equal(expectedBuyerBalance);
        expect(await getBalance(ethers.provider, seller.address, newCurrency)).to.equal(expectedSellerBalance);
        expect(await getBalance(ethers.provider, feeReceiver.address, newCurrency)).to.equal(
            expectedFeeReceiverBalance
        );

        expect(await mortgageToken.ownerOf(currentTokenId)).to.equal(buyer.address);

        let walletsToReset = [seller, buyer, feeReceiver];
        if (isERC20) {
            await resetERC20(newCurrency!, walletsToReset);
        } else {
            await resetNativeToken(ethers.provider, walletsToReset);
            await prepareNativeToken(ethers.provider, deployer, [seller, buyer], ethers.utils.parseEther('1.0'));
        }
    }

    describe('6.3.5. buy(uint256)', async () => {
        it('6.3.5.1. Buy token successfully in native and erc20 token', async () => {
            const fixture = await beforeMortgageMarketplaceTest();

            await testBuyOffer(
                fixture,
                ethers.utils.parseEther('0.2'),
                false,
                false,
                ethers.BigNumber.from(200000),
                false
            );

            await testBuyOffer(
                fixture,
                ethers.utils.parseEther('0.2'),
                true,
                false,
                ethers.BigNumber.from(500000),
                false
            );
        });

        it('6.3.5.2. Buy token successfully in all native/erc20 and exclusive/non-exclusive combinations', async () => {
            const fixture = await beforeMortgageMarketplaceTest();

            for (const isERC20 of [false, true]) {
                for (const isExclusive of [false, true]) {
                    if (!isERC20 && isExclusive) {
                        continue;
                    }
                    await testBuyOffer(
                        fixture,
                        ethers.utils.parseEther('0.2'),
                        isERC20,
                        isExclusive,
                        ethers.BigNumber.from(200000),
                        false
                    );
                }
            }
        });

        it('6.3.5.3. Buy token successfully with very large amount in all native/erc20 and exclusive/non-exclusive combinations', async () => {
            const fixture = await beforeMortgageMarketplaceTest();

            for (const isERC20 of [false, true]) {
                for (const isExclusive of [false, true]) {
                    if (!isERC20 && isExclusive) {
                        continue;
                    }
                    const price = ethers.BigNumber.from(2).pow(255);
                    await testBuyOffer(fixture, ethers.utils.parseEther('0.99'), isERC20, isExclusive, price, false);
                }
            }
        });

        it('6.3.5.4. Buy token unsuccessfully when paused', async () => {
            const fixture = await beforeMortgageMarketplaceTest({
                listSampleOffers: true,
                pause: true,
            });
            const { mortgageMarketplace, buyer1 } = fixture;

            await expect(
                getERC721MarketplaceTx_Buy(mortgageMarketplace, buyer1, { offerId: BigNumber.from(1) }, { value: 1e9 })
            ).to.be.revertedWith('Pausable: paused');
        });

        it('6.3.5.5. Buy token unsuccessfully with invalid offer id', async () => {
            const fixture = await beforeMortgageMarketplaceTest({
                listSampleOffers: true,
            });
            const { mortgageMarketplace, buyer1 } = fixture;

            await expect(
                getERC721MarketplaceTx_Buy(mortgageMarketplace, buyer1, { offerId: BigNumber.from(0) }, { value: 1e9 })
            ).to.be.revertedWithCustomError(mortgageMarketplace, 'InvalidOfferId');

            await expect(
                getERC721MarketplaceTx_Buy(mortgageMarketplace, buyer1, { offerId: BigNumber.from(3) }, { value: 1e9 })
            ).to.be.revertedWithCustomError(mortgageMarketplace, 'InvalidOfferId');
        });

        it('6.3.5.6. Buy token unsuccessfully when seller buy their own token', async () => {
            const fixture = await beforeMortgageMarketplaceTest({
                listSampleOffers: true,
            });
            const { mortgageMarketplace, seller1, seller2 } = fixture;

            await expect(
                getERC721MarketplaceTx_Buy(mortgageMarketplace, seller1, { offerId: BigNumber.from(1) }, { value: 1e9 })
            ).to.be.revertedWithCustomError(mortgageMarketplace, 'InvalidBuying');

            await expect(
                getERC721MarketplaceTx_Buy(mortgageMarketplace, seller2, { offerId: BigNumber.from(2) }, { value: 1e9 })
            ).to.be.revertedWithCustomError(mortgageMarketplace, 'InvalidBuying');
        });

        it('6.3.5.7. Buy token unsuccessfully when offer is not selling', async () => {
            const fixture = await beforeMortgageMarketplaceTest({
                listSampleOffers: true,
            });
            const { mortgageMarketplace, buyer1, buyer2 } = fixture;

            await callTransaction(
                getERC721MarketplaceTx_Buy(mortgageMarketplace, buyer1, { offerId: BigNumber.from(1) }, { value: 1e9 })
            );

            await expect(
                getERC721MarketplaceTx_Buy(mortgageMarketplace, buyer2, { offerId: BigNumber.from(1) }, { value: 1e9 })
            ).to.be.revertedWithCustomError(mortgageMarketplace, 'InvalidBuying');
        });

        it('6.3.5.8. Buy token unsuccessfully when mortgage is repaid', async () => {
            const fixture = await beforeMortgageMarketplaceTest({
                listSampleOffers: true,
            });
            const { mortgageMarketplace, buyer1, borrower1, mortgageToken } = fixture;

            await callTransaction(
                getMortgageTokenTx_Repay(mortgageToken, borrower1, {
                    mortgageId: BigNumber.from(1),
                })
            );

            await expect(
                getERC721MarketplaceTx_Buy(mortgageMarketplace, buyer1, { offerId: BigNumber.from(1) }, { value: 1e9 })
            ).to.be.revertedWithCustomError(mortgageMarketplace, 'InvalidTokenId');
        });

        it('6.3.5.9. Buy token unsuccessfully when mortgage is foreclosed', async () => {
            const fixture = await beforeMortgageMarketplaceTest({
                listSampleOffers: true,
            });
            const { mortgageMarketplace, buyer1, seller1, mortgageToken } = fixture;

            await callTransaction(
                getMortgageTokenTx_Foreclose(mortgageToken, seller1, {
                    mortgageId: BigNumber.from(1),
                })
            );

            await expect(
                getERC721MarketplaceTx_Buy(mortgageMarketplace, buyer1, { offerId: BigNumber.from(1) }, { value: 1e9 })
            ).to.be.revertedWithCustomError(mortgageMarketplace, 'InvalidTokenId');
        });

        it('6.3.5.10. Buy token unsuccessfully with insufficient native token', async () => {
            const fixture = await beforeMortgageMarketplaceTest({
                listSampleOffers: true,
            });
            const { mortgageMarketplace, buyer1 } = fixture;

            await expect(
                getERC721MarketplaceTx_Buy(mortgageMarketplace, buyer1, {
                    offerId: BigNumber.from(1),
                })
            ).to.be.revertedWithCustomError(mortgageMarketplace, 'InsufficientValue');
        });

        it('6.3.5.11. Buy token unsuccessfully when transferring native token to seller failed', async () => {
            const fixture = await beforeMortgageMarketplaceTest();
            const { mortgageMarketplace, seller1, buyer1, deployer, mortgageToken } = fixture;

            const failReceiver = await deployFailReceiver(deployer, true, false);

            await callTransaction(
                mortgageToken.connect(seller1).transferFrom(seller1.address, failReceiver.address, 1)
            );

            await callTransaction(
                failReceiver.call(
                    mortgageToken.address,
                    mortgageToken.interface.encodeFunctionData('setApprovalForAll', [mortgageMarketplace.address, true])
                )
            );

            await callTransaction(
                getCallERC721MarketplaceTx_List(mortgageMarketplace, failReceiver as ProxyCaller, {
                    collection: mortgageToken.address,
                    tokenId: BigNumber.from(1),
                    price: BigNumber.from(200000),
                    currency: ethers.constants.AddressZero,
                })
            );

            await expect(
                getERC721MarketplaceTx_Buy(mortgageMarketplace, buyer1, { offerId: BigNumber.from(1) }, { value: 1e9 })
            ).to.be.revertedWithCustomError(mortgageMarketplace, 'FailedTransfer');
        });

        it('6.3.5.12. Buy token unsuccessfully when transferring native token to royalty receiver failed', async () => {
            const fixture = await beforeMortgageMarketplaceTest({
                listSampleOffers: true,
                useFailRoyaltyReceiver: true,
            });
            const { mortgageMarketplace, buyer1, failReceiver } = fixture;

            await callTransaction(failReceiver.activate(true));

            await expect(
                getERC721MarketplaceTx_Buy(mortgageMarketplace, buyer1, { offerId: BigNumber.from(1) }, { value: 1e9 })
            ).to.be.revertedWithCustomError(mortgageMarketplace, 'FailedTransfer');
        });

        it('6.3.5.13. Buy token unsuccessfully when refunding to sender failed', async () => {
            const fixture = await beforeMortgageMarketplaceTest({
                listSampleOffers: true,
            });
            const { mortgageMarketplace, deployer } = fixture;

            const failReceiver = await deployFailReceiver(deployer, true, false);

            await expect(
                failReceiver.call(
                    mortgageMarketplace.address,
                    mortgageMarketplace.interface.encodeFunctionData('buy', [1]),
                    { value: 1e9 }
                )
            ).to.be.revertedWithCustomError(mortgageMarketplace, 'FailedRefund');
        });

        it('6.3.5.14. Buy token unsuccessfully when the contract is reentered', async () => {
            const fixture = await beforeMortgageMarketplaceTest();
            const { deployer, mortgageToken, mortgageMarketplace, buyer1, seller1 } = fixture;

            const reentrancy = await deployReentrancyReceiver(deployer, true, false);

            await callTransaction(mortgageToken.connect(seller1).transferFrom(seller1.address, reentrancy.address, 1));

            await callTransaction(
                reentrancy.call(
                    mortgageMarketplace.address,
                    mortgageMarketplace.interface.encodeFunctionData('list', [
                        mortgageToken.address,
                        1,
                        200000,
                        ethers.constants.AddressZero,
                    ])
                )
            );

            await callTransaction(
                reentrancy.call(
                    mortgageToken.address,
                    mortgageToken.interface.encodeFunctionData('setApprovalForAll', [mortgageMarketplace.address, true])
                )
            );

            await testReentrancy_MortgageMarketplace(mortgageMarketplace, reentrancy, async () => {
                await expect(
                    getERC721MarketplaceTx_Buy(
                        mortgageMarketplace,
                        buyer1,
                        { offerId: BigNumber.from(1) },
                        { value: 1e9 }
                    )
                ).to.be.revertedWithCustomError(mortgageMarketplace, 'FailedTransfer');
            });
        });
    });

    describe('6.3.6. cancel(uint256)', async () => {
        it('6.3.6.1. Cancel offer successfully by seller', async () => {
            const fixture = await beforeMortgageMarketplaceTest({
                listSampleOffers: true,
            });
            const { mortgageMarketplace, seller1 } = fixture;

            let tx = await getERC721MarketplaceTx_Cancel(mortgageMarketplace, seller1, {
                offerId: BigNumber.from(1),
            });
            await tx.wait();

            const offer = await mortgageMarketplace.getOffer(1);
            expect(offer.state).to.equal(OfferState.Cancelled);

            await expect(tx).to.emit(mortgageMarketplace, 'OfferCancellation').withArgs(1);
        });

        it('6.3.6.2. Cancel offer successfully by manager', async () => {
            const fixture = await beforeMortgageMarketplaceTest({
                listSampleOffers: true,
            });
            const { mortgageMarketplace, manager } = fixture;
            let tx = await getERC721MarketplaceTx_Cancel(mortgageMarketplace, manager, {
                offerId: BigNumber.from(1),
            });
            await tx.wait();

            const offer = await mortgageMarketplace.getOffer(1);
            expect(offer.state).to.equal(OfferState.Cancelled);

            await expect(tx).to.emit(mortgageMarketplace, 'OfferCancellation').withArgs(1);
        });

        it('6.3.6.3. Cancel offer unsuccessfully with invalid offer id', async () => {
            const fixture = await beforeMortgageMarketplaceTest({
                listSampleOffers: true,
            });
            const { mortgageMarketplace, manager } = fixture;

            await expect(
                getERC721MarketplaceTx_Cancel(mortgageMarketplace, manager, {
                    offerId: BigNumber.from(0),
                })
            ).to.be.revertedWithCustomError(mortgageMarketplace, 'InvalidOfferId');
            await expect(
                getERC721MarketplaceTx_Cancel(mortgageMarketplace, manager, {
                    offerId: BigNumber.from(3),
                })
            ).to.be.revertedWithCustomError(mortgageMarketplace, 'InvalidOfferId');
        });

        it('6.3.6.4. Cancel offer unsuccessfully by unauthorized user', async () => {
            const fixture = await beforeMortgageMarketplaceTest({
                listSampleOffers: true,
            });
            const { mortgageMarketplace, seller2, moderator } = fixture;

            await expect(
                getERC721MarketplaceTx_Cancel(mortgageMarketplace, seller2, {
                    offerId: BigNumber.from(1),
                })
            ).to.be.revertedWithCustomError(mortgageMarketplace, 'Unauthorized');

            await expect(
                getERC721MarketplaceTx_Cancel(mortgageMarketplace, moderator, {
                    offerId: BigNumber.from(1),
                })
            ).to.be.revertedWithCustomError(mortgageMarketplace, 'Unauthorized');
        });

        it('6.3.6.5. Cancel offer unsuccessfully with already cancelled offer', async () => {
            const fixture = await beforeMortgageMarketplaceTest({
                listSampleOffers: true,
            });
            const { mortgageMarketplace, manager } = fixture;

            await callTransaction(
                getERC721MarketplaceTx_Cancel(mortgageMarketplace, manager, {
                    offerId: BigNumber.from(1),
                })
            );
            await expect(
                getERC721MarketplaceTx_Cancel(mortgageMarketplace, manager, {
                    offerId: BigNumber.from(1),
                })
            ).to.be.revertedWithCustomError(mortgageMarketplace, 'InvalidCancelling');
        });

        it('6.3.6.6. Cancel offer unsuccessfully when offer is sold out', async () => {
            const fixture = await beforeMortgageMarketplaceTest({
                listSampleOffers: true,
            });
            const { mortgageMarketplace, manager, buyer1 } = fixture;

            await callTransaction(
                getERC721MarketplaceTx_Buy(mortgageMarketplace, buyer1, { offerId: BigNumber.from(1) }, { value: 1e9 })
            );

            await expect(
                getERC721MarketplaceTx_Cancel(mortgageMarketplace, manager, {
                    offerId: BigNumber.from(1),
                })
            ).to.be.revertedWithCustomError(mortgageMarketplace, 'InvalidCancelling');
        });
    });

    describe('6.3.7. safeBuy(uint256,uint256)', async () => {
        it('6.3.7.1. Buy token successfully', async () => {
            const fixture = await beforeMortgageMarketplaceTest();

            await testBuyOffer(
                fixture,
                ethers.utils.parseEther('0.2'),
                false,
                false,
                ethers.BigNumber.from(200000),
                true
            );

            await testBuyOffer(
                fixture,
                ethers.utils.parseEther('0.2'),
                true,
                false,
                ethers.BigNumber.from(500000),
                true
            );
        });

        it('6.3.7.2. Buy token unsuccessfully with invalid offer id', async () => {
            const fixture = await beforeMortgageMarketplaceTest({
                listSampleOffers: true,
            });
            const { mortgageMarketplace, buyer1 } = fixture;

            await expect(
                getERC721MarketplaceTx_SafeBuy(
                    mortgageMarketplace,
                    buyer1,
                    {
                        offerId: BigNumber.from(0),
                        anchor: BigNumber.from(1),
                    },
                    { value: 1e9 }
                )
            ).to.be.revertedWithCustomError(mortgageMarketplace, 'InvalidOfferId');

            await expect(
                getERC721MarketplaceTx_SafeBuy(
                    mortgageMarketplace,
                    buyer1,
                    {
                        offerId: BigNumber.from(3),
                        anchor: BigNumber.from(1),
                    },
                    { value: 1e9 }
                )
            ).to.be.revertedWithCustomError(mortgageMarketplace, 'InvalidOfferId');
        });

        it('6.3.7.3. Buy token unsuccessfully with invalid anchor', async () => {
            const fixture = await beforeMortgageMarketplaceTest({
                listSampleOffers: true,
            });
            const { mortgageMarketplace, buyer1, buyer2 } = fixture;

            await expect(
                getERC721MarketplaceTx_SafeBuy(
                    mortgageMarketplace,
                    buyer1,
                    { offerId: BigNumber.from(1), anchor: BigNumber.from(0) },
                    { value: 1e9 }
                )
            ).to.be.revertedWithCustomError(mortgageMarketplace, 'BadAnchor');

            await expect(
                getERC721MarketplaceTx_SafeBuy(
                    mortgageMarketplace,
                    buyer2,
                    { offerId: BigNumber.from(2), anchor: BigNumber.from(0) },
                    { value: 1e9 }
                )
            ).to.be.revertedWithCustomError(mortgageMarketplace, 'BadAnchor');
        });
    });
});
