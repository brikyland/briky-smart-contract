import { expect } from 'chai';
import { ethers } from 'hardhat';
import {
    Admin,
    CommissionToken,
    Currency,
    FeeReceiver,
    MockEstateToken,
    MortgageMarketplace,
    MockMortgageToken,
    MockEstateToken__factory,
    MockMortgageToken__factory,
    CommissionToken__factory,
    EstateForger,
    ReserveVault,
    PriceWatcher,
    MockEstateForger,
    EstateMortgageToken,
    ProjectMortgageToken,
    ERC721MortgageToken,
    ProxyCaller,
} from '@typechain-types';
import { callTransaction, expectRevertWithModifierCustomError, getSignatures, prepareERC20, prepareNativeToken, randomWallet, resetERC20, resetNativeToken, testReentrancy } from '@utils/blockchain';
import { Constant } from '@tests/test.constant';
import { deployAdmin } from '@utils/deployments/common/admin';
import { deployFeeReceiver } from '@utils/deployments/common/feeReceiver';
import { deployCurrency } from '@utils/deployments/common/currency';
import { loadFixture, time } from "@nomicfoundation/hardhat-network-helpers";

import { MockContract, smock } from '@defi-wonderland/smock';

import {
    callAdmin_DeclareZone,
    callAdmin_AuthorizeManagers,
    callAdmin_AuthorizeModerators,
    callAdmin_UpdateCurrencyRegistries,
    callAdmin_ActivateIn,
} from '@utils/callWithSignatures/admin';
import { BigNumber } from 'ethers';
import { randomInt } from 'crypto';
import { getInterfaceID, randomBigNumber } from '@utils/utils';
import { OrderedMap } from '@utils/utils';
import { deployEstateMortgageToken } from '@utils/deployments/lend/estateMortgageToken';
import { deployMortgageMarketplace } from '@utils/deployments/lux/mortgageMarketplace';
import { callMortgageMarketplace_Pause, callMortgageMarketplace_RegisterCollections } from '@utils/callWithSignatures/mortgageMarketplace';
import { Contract } from 'ethers';
import { MortgageState, OfferState } from '@utils/models/enums';
import { getBalance } from '@utils/blockchain';
import { deployFailReceiver } from '@utils/deployments/mock/failReceiver';
import { deployReentrancy } from '@utils/deployments/mock/mockReentrancy/reentrancy';
import { Initialization as LandInitialization } from '@tests/land/test.initialization';
import { Initialization as LendInitialization } from '@tests/lend/test.initialization';
import { MockValidator } from '@utils/mockValidator';
import { getRegisterBrokerTx } from '@utils/transaction/CommissionToken';
import { getCallTokenizeEstateTx, getRegisterCustodianTx } from '@utils/transaction/EstateToken';
import { deployEstateForger } from '@utils/deployments/land/estateForger';
import { deployPriceWatcher } from '@utils/deployments/common/priceWatcher';
import { deployReserveVault } from '@utils/deployments/common/reserveVault';
import { RegisterCustodianParams } from '@utils/models/EstateToken';
import { deployMockEstateForger } from '@utils/deployments/mock/mockEstateForger';
import { callEstateToken_AuthorizeTokenizers, callEstateToken_UpdateCommissionToken, callEstateToken_UpdateZoneRoyaltyRate } from '@utils/callWithSignatures/estateToken';
import { deployMockMortgageToken } from '@utils/deployments/mock/mockMortgageToken';
import { ListParams } from '@utils/models/ERC721Marketplace';
import { callERC721Marketplace_RegisterCollections } from '@utils/callWithSignatures/erc721Marketplace';
import { getCallListTx, getListTx } from '@utils/transaction/ERC721Marketplace';
import { deployERC721MortgageToken } from '@utils/deployments/lend/erc721MortgageToken';
import { deployProjectMortgageToken } from '@utils/deployments/lend/projectMortgageToken';
import { deployEstateToken } from '@utils/deployments/land/estateToken';
import { applyDiscount } from '@utils/formula';

interface MortgageMarketplaceFixture {
    admin: Admin;
    feeReceiver: FeeReceiver;
    currency: Currency;
    mortgageToken: MockMortgageToken;
    mortgageMarketplace: MortgageMarketplace;
    collections: any[];

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
    
    failReceiver: any;
}

async function testReentrancy_MortgageMarketplace(
    mortgageMarketplace: MortgageMarketplace,
    reentrancyContract: Contract,
    assertion: any,
) {
    let data = [
        mortgageMarketplace.interface.encodeFunctionData("buy", [0]),
        mortgageMarketplace.interface.encodeFunctionData("safeBuy", [0, 0]),
        mortgageMarketplace.interface.encodeFunctionData("cancel", [0]),
    ];

    await testReentrancy(
        reentrancyContract,
        mortgageMarketplace,
        data,
        assertion,
    );
}

describe('6.3. MortgageMarketplace', async () => {
    async function mortgageMarketplaceFixture(): Promise<MortgageMarketplaceFixture> {
        const accounts = await ethers.getSigners();
        const deployer = accounts[0];
        const admins = [];
        for (let i = 1; i <= Constant.ADMIN_NUMBER; ++i) admins.push(accounts[i]);
        const borrower1 = accounts[Constant.ADMIN_NUMBER + 1];
        const borrower2 = accounts[Constant.ADMIN_NUMBER + 2];
        const seller1 = accounts[Constant.ADMIN_NUMBER + 3];
        const seller2 = accounts[Constant.ADMIN_NUMBER + 4];
        const buyer1 = accounts[Constant.ADMIN_NUMBER + 5];
        const buyer2 = accounts[Constant.ADMIN_NUMBER + 6];
        const broker1 = accounts[Constant.ADMIN_NUMBER + 7];
        const broker2 = accounts[Constant.ADMIN_NUMBER + 8];
        const custodian1 = accounts[Constant.ADMIN_NUMBER + 9];
        const custodian2 = accounts[Constant.ADMIN_NUMBER + 10];
        const manager = accounts[Constant.ADMIN_NUMBER + 11];
        const moderator = accounts[Constant.ADMIN_NUMBER + 12];

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

        const currency = await deployCurrency(
            deployer.address,
            'MockCurrency',
            'MCK'
        ) as Currency;
        const mockCurrencyExclusiveRate = ethers.utils.parseEther("0.3");
        await callTransaction(currency.setExclusiveDiscount(mockCurrencyExclusiveRate, Constant.COMMON_RATE_DECIMALS));

        const mortgageToken = await deployMockMortgageToken(
            deployer.address,
            admin.address,
            feeReceiver.address,
            LendInitialization.ESTATE_MORTGAGE_TOKEN_Name,
            LendInitialization.ESTATE_MORTGAGE_TOKEN_Symbol,
            LendInitialization.ESTATE_MORTGAGE_TOKEN_BaseURI,
            LendInitialization.ESTATE_MORTGAGE_TOKEN_FeeRate,
        ) as MockMortgageToken;

        const validator = new MockValidator(deployer as any);

        const MockEstateTokenFactory = await smock.mock('MockEstateToken') as any;
        const estateToken = await MockEstateTokenFactory.deploy();
        await callTransaction(estateToken.initialize(
            admin.address,
            feeReceiver.address,
            validator.getAddress(),
            LandInitialization.ESTATE_TOKEN_BaseURI,
        ));   

        const MockCommissionTokenFactory = await smock.mock<CommissionToken__factory>('CommissionToken');
        const commissionToken = await MockCommissionTokenFactory.deploy();
        await callTransaction(commissionToken.initialize(
            admin.address,
            estateToken.address,
            feeReceiver.address,
            LandInitialization.COMMISSION_TOKEN_Name,
            LandInitialization.COMMISSION_TOKEN_Symbol,
            LandInitialization.COMMISSION_TOKEN_BaseURI,
            LandInitialization.COMMISSION_TOKEN_RoyaltyRate,
        ));
        
        await callEstateToken_UpdateCommissionToken(
            estateToken,
            admins,
            commissionToken.address,
            await admin.nonce()
        );

        const estateMortgageToken = await deployEstateMortgageToken(
            deployer.address,
            admin.address,
            estateToken.address,
            feeReceiver.address,
            LendInitialization.ESTATE_MORTGAGE_TOKEN_Name,
            LendInitialization.ESTATE_MORTGAGE_TOKEN_Symbol,
            LendInitialization.ESTATE_MORTGAGE_TOKEN_BaseURI,
            LendInitialization.ESTATE_MORTGAGE_TOKEN_FeeRate,
        ) as EstateMortgageToken;

        const fakeProjectToken = randomWallet();
        const projectMortgageToken = await deployProjectMortgageToken(
            deployer.address,
            admin.address,
            fakeProjectToken.address,
            feeReceiver.address,
            LendInitialization.PROJECT_MORTGAGE_TOKEN_Name,
            LendInitialization.PROJECT_MORTGAGE_TOKEN_Symbol,
            LendInitialization.PROJECT_MORTGAGE_TOKEN_BaseURI,
            LendInitialization.PROJECT_MORTGAGE_TOKEN_FeeRate,
        ) as ProjectMortgageToken;

        const erc721MortgageToken = await deployERC721MortgageToken(
            deployer.address,
            admin.address,
            feeReceiver.address,
            LendInitialization.ERC721_MORTGAGE_TOKEN_Name,
            LendInitialization.ERC721_MORTGAGE_TOKEN_Symbol,
            LendInitialization.ERC721_MORTGAGE_TOKEN_BaseURI,
            LendInitialization.ERC721_MORTGAGE_TOKEN_FeeRate,
        ) as ERC721MortgageToken;

        const collections = [estateMortgageToken, projectMortgageToken, erc721MortgageToken, mortgageToken];
        while (collections.length < 5) {
            const i = collections.length;
            const collection = await deployMockMortgageToken(
                deployer.address,
                admin.address,
                feeReceiver.address,
                LendInitialization.ERC721_MORTGAGE_TOKEN_Name,
                `TestCollection_${i}`,
                `TC_${i}`,
                LendInitialization.ERC721_MORTGAGE_TOKEN_FeeRate,
            ) as ERC721MortgageToken;
            collections.push(collection);
        }

        const mortgageMarketplace = await deployMortgageMarketplace(
            deployer.address,
            admin.address,
            feeReceiver.address,
        ) as MortgageMarketplace;

        const failReceiver = await deployFailReceiver(deployer, false, false);

        return {
            admin,
            feeReceiver,
            currency,
            mortgageToken,
            mortgageMarketplace,
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
            collections,
            failReceiver,
        };
    };

    async function beforeMortgageMarketplaceTest({
        skipRegisterCollection = false,
        listSampleCurrencies = false,
        listSampleMortgageToken = false,
        listSampleOffers = false,
        initialMortgageState = MortgageState.Supplied,
        useFailRoyaltyReceiver = false,
        fundERC20ForBuyers = false,
        pause = false,
    } = {}): Promise<MortgageMarketplaceFixture> {
        const fixture = await loadFixture(mortgageMarketplaceFixture);
        const {
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

        await callAdmin_AuthorizeManagers(
            admin,
            admins,
            [manager.address],
            true,
            await admin.nonce(),
        )
        await callAdmin_AuthorizeModerators(
            admin,
            admins,
            [moderator.address],
            true,
            await admin.nonce(),
        );

        if (!skipRegisterCollection) {
            await callERC721Marketplace_RegisterCollections(
                mortgageMarketplace,
                admins,
                [mortgageToken.address],
                true,
                await admin.nonce(),
            );
        }

        if (listSampleCurrencies) {
            await callAdmin_UpdateCurrencyRegistries(
                admin,
                admins,
                [ethers.constants.AddressZero, currency.address],
                [true, true],
                [false, true],
                await admin.nonce()
            );
        }

        if (useFailRoyaltyReceiver) {
            await callTransaction(mortgageToken.updateFeeReceiver(failReceiver.address));
        }

        if (listSampleMortgageToken) {
            await callTransaction(mortgageToken.addMortgage(
                10e5,
                11e5,
                200000,
                ethers.constants.AddressZero,
                currentTimestamp + 1000,
                initialMortgageState,
                borrower1.address,
                seller1.address,
            ));
            await callTransaction(mortgageToken.addMortgage(
                100000,
                110000,
                20000,
                ethers.constants.AddressZero,
                currentTimestamp + 1100,
                initialMortgageState,
                borrower2.address,
                seller2.address,
            ));

            await callTransaction(mortgageToken.mint(seller1.address, 1));
            await callTransaction(mortgageToken.mint(seller2.address, 2));
        }

        if (listSampleOffers) {
            const params1: ListParams = {
                collection: mortgageToken.address,
                tokenId: BigNumber.from(1),
                price: BigNumber.from(200000),
                currency: ethers.constants.AddressZero,
            };
            await callTransaction(getListTx(mortgageMarketplace, seller1, params1));

            const params2: ListParams = {
                collection: mortgageToken.address,
                tokenId: BigNumber.from(2),
                price: BigNumber.from(500000),
                currency: currency.address,
            }
            await callTransaction(getListTx(mortgageMarketplace, seller2, params2));

            await callTransaction(mortgageToken.connect(seller1).setApprovalForAll(mortgageMarketplace.address, true));
            await callTransaction(mortgageToken.connect(seller2).setApprovalForAll(mortgageMarketplace.address, true));
        }

        if (fundERC20ForBuyers) {
            await prepareERC20(currency, [buyer1, buyer2], [mortgageMarketplace], ethers.BigNumber.from(1e9));
        }

        if (pause) {
            await callMortgageMarketplace_Pause(
                mortgageMarketplace,
                admins,
                await admin.nonce()
            );
        }

        return {
            ...fixture,
        }
    }

    describe('6.3.1. initialize(address, address, address, address)', async () => {
        it('6.3.1.1. Deploy successfully', async () => {
            const { mortgageMarketplace, admin, feeReceiver } = await beforeMortgageMarketplaceTest();

            expect(await mortgageMarketplace.offerNumber()).to.equal(0);

            expect(await mortgageMarketplace.admin()).to.equal(admin.address);
            expect(await mortgageMarketplace.feeReceiver()).to.equal(feeReceiver.address);
        });
    });

    describe('6.3.2. getOffer(uint256)', async () => {
        it('6.3.2.1. return successfully', async () => {
            const fixture = await beforeMortgageMarketplaceTest({
                listSampleCurrencies: true,
                listSampleMortgageToken: true,
                listSampleOffers: true,
            });
            const { mortgageMarketplace } = fixture;

            expect(await mortgageMarketplace.getOffer(1)).to.not.be.reverted;
            expect(await mortgageMarketplace.getOffer(2)).to.not.be.reverted;
        });

        it('6.3.2.2. revert with invalid offer id', async () => {
            const fixture = await beforeMortgageMarketplaceTest({
                listSampleCurrencies: true,
                listSampleMortgageToken: true,
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

    describe('6.3.3. registerCollections(address[], bool, bytes[])', async () => {
        it('6.3.3.1. Register collections successfully with valid signatures', async () => {
            const { mortgageMarketplace, admin, admins, collections } = await beforeMortgageMarketplaceTest({
                skipRegisterCollection: true,
            });

            const toBeCollections = collections.slice(0, 3);

            const message = ethers.utils.defaultAbiCoder.encode(
                ['address', 'string', 'address[]', 'bool'],
                [mortgageMarketplace.address, 'registerCollections', toBeCollections.map(x => x.address), true]
            );
            const signatures = await getSignatures(message, admins, await admin.nonce());

            const tx = await mortgageMarketplace.registerCollections(
                toBeCollections.map(x => x.address),
                true,
                signatures
            );
            await tx.wait();

            for (const collection of toBeCollections) {
                await expect(tx).to
                    .emit(mortgageMarketplace, 'CollectionRegistration')
                    .withArgs(collection.address);
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

        it('6.3.3.2. Register collections unsuccessfully with invalid signatures', async () => {
            const { mortgageMarketplace, admin, admins, collections } = await beforeMortgageMarketplaceTest({
                skipRegisterCollection: true,
            });

            const toBeCollections = collections.slice(0, 3);

            const message = ethers.utils.defaultAbiCoder.encode(
                ['address', 'string', 'address[]', 'bool'],
                [mortgageMarketplace.address, 'registerCollections', toBeCollections.map(x => x.address), true]
            );
            const invalidSignatures = await getSignatures(message, admins, (await admin.nonce()).add(1));

            await expect(mortgageMarketplace.registerCollections(
                toBeCollections.map(x => x.address),
                true,
                invalidSignatures
            )).to.be.revertedWithCustomError(admin, 'FailedVerification');
        });

        it('6.3.3.3. Register collections reverted without reason with EOA address', async () => {
            const { mortgageMarketplace, admin, admins } = await beforeMortgageMarketplaceTest({
                skipRegisterCollection: true,
            });

            const invalidCollection = randomWallet();

            const message = ethers.utils.defaultAbiCoder.encode(
                ['address', 'string', 'address[]', 'bool'],
                [mortgageMarketplace.address, 'registerCollections', [invalidCollection.address], true]
            );
            const signatures = await getSignatures(message, admins, await admin.nonce());

            await expect(mortgageMarketplace.registerCollections(
                [invalidCollection.address],
                true,
                signatures
            )).to.be.revertedWithCustomError(mortgageMarketplace, 'InvalidCollection');
        })

        it('6.3.3.4. Authorize launchpad reverted with contract not supporting ProjectLaunchpad interface', async () => {
            const { mortgageMarketplace, admin, admins } = await beforeMortgageMarketplaceTest({
                skipRegisterCollection: true,
            });

            const invalidCollection = mortgageMarketplace;

            const message = ethers.utils.defaultAbiCoder.encode(
                ['address', 'string', 'address[]', 'bool'],
                [mortgageMarketplace.address, 'registerCollections', [invalidCollection.address], true]
            );
            const signatures = await getSignatures(message, admins, await admin.nonce());

            await expect(mortgageMarketplace.registerCollections(
                [invalidCollection.address],
                true,
                signatures
            )).to.be.revertedWithCustomError(mortgageMarketplace, 'InvalidCollection');
        })

        it('6.3.3.5. Authorize launchpad unsuccessfully when authorizing same account twice on same tx', async () => {
            const { mortgageMarketplace, admin, admins, collections } = await beforeMortgageMarketplaceTest({
                skipRegisterCollection: true,
            });

            const duplicateCollections = [collections[0], collections[1], collections[2], collections[0]];

            let message = ethers.utils.defaultAbiCoder.encode(
                ['address', 'string', 'address[]', 'bool'],
                [mortgageMarketplace.address, 'registerCollections', duplicateCollections.map(x => x.address), true]
            );
            let signatures = await getSignatures(message, admins, await admin.nonce());

            await expect(mortgageMarketplace.registerCollections(
                duplicateCollections.map(x => x.address),
                true,
                signatures
            )).to.be.revertedWithCustomError(mortgageMarketplace, `RegisteredCollection`)
        });

        it('6.3.3.6. Authorize launchpad unsuccessfully when authorizing same account twice on different tx', async () => {
            const { mortgageMarketplace, admin, admins, collections } = await beforeMortgageMarketplaceTest({
                skipRegisterCollection: true,
            });

            const tx1Collections = collections.slice(0, 3);

            let message = ethers.utils.defaultAbiCoder.encode(
                ['address', 'string', 'address[]', 'bool'],
                [mortgageMarketplace.address, 'registerCollections', tx1Collections.map(x => x.address), true]
            );
            let signatures = await getSignatures(message, admins, await admin.nonce());

            await callTransaction(mortgageMarketplace.registerCollections(
                tx1Collections.map(x => x.address),
                true,
                signatures
            ));

            const tx2Collections = [collections[3], collections[2], collections[4]];

            message = ethers.utils.defaultAbiCoder.encode(
                ['address', 'string', 'address[]', 'bool'],
                [mortgageMarketplace.address, 'registerCollections', tx2Collections.map(x => x.address), true]
            );
            signatures = await getSignatures(message, admins, await admin.nonce());

            await expect(mortgageMarketplace.registerCollections(
                tx2Collections.map(x => x.address),
                true,
                signatures
            )).to.be.revertedWithCustomError(mortgageMarketplace, `RegisteredCollection`)
        })

        async function setupCollections(mortgageMarketplace: MortgageMarketplace, admin: Admin, admins: any[], collections: any[]) {
            await callMortgageMarketplace_RegisterCollections(
                mortgageMarketplace as any,
                admins,
                collections.map(x => x.address),
                true,
                await admin.nonce(),
            );
        }

        it('6.3.3.7. Deregister collections successfully', async () => {
            const { mortgageMarketplace, admin, admins, collections } = await beforeMortgageMarketplaceTest({
                skipRegisterCollection: true,
            });

            await setupCollections(mortgageMarketplace, admin, admins, collections);

            const toDeregister = collections.slice(0, 2);

            const message = ethers.utils.defaultAbiCoder.encode(
                ['address', 'string', 'address[]', 'bool'],
                [mortgageMarketplace.address, 'registerCollections', toDeregister.map(x => x.address), false]
            );
            const signatures = await getSignatures(message, admins, await admin.nonce());

            const tx = await mortgageMarketplace.registerCollections(
                toDeregister.map(x => x.address),
                false,
                signatures
            );
            await tx.wait();

            for (const collection of toDeregister) {
                await expect(tx).to
                    .emit(mortgageMarketplace, 'CollectionDeregistration')
                    .withArgs(collection.address);
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

        it('6.3.3.8. Deregister collections unsuccessfully with unauthorized account', async () => {
            const { mortgageMarketplace, admin, admins, collections } = await beforeMortgageMarketplaceTest({
                skipRegisterCollection: true,
            });

            await setupCollections(mortgageMarketplace, admin, admins, collections);

            const account = randomWallet();
            const toDeauth = [collections[0], account];

            const message = ethers.utils.defaultAbiCoder.encode(
                ['address', 'string', 'address[]', 'bool'],
                [mortgageMarketplace.address, 'registerCollections', toDeauth.map(x => x.address), false]
            );
            const signatures = await getSignatures(message, admins, await admin.nonce());

            await expect(mortgageMarketplace.registerCollections(
                toDeauth.map(x => x.address),
                false,
                signatures
            )).to.be.revertedWithCustomError(mortgageMarketplace, `NotRegisteredCollection`)
        });

        it('6.3.3.8. Deauthorize launchpad unsuccessfully when unauthorizing same accounts twice on same tx', async () => {
            const { mortgageMarketplace, admin, admins, collections } = await beforeMortgageMarketplaceTest({
                skipRegisterCollection: true,
            });

            await setupCollections(mortgageMarketplace, admin, admins, collections);

            const toDeauth = collections.slice(0, 2).concat([collections[0]]);

            const message = ethers.utils.defaultAbiCoder.encode(
                ['address', 'string', 'address[]', 'bool'],
                [mortgageMarketplace.address, 'registerCollections', toDeauth.map(x => x.address), false]
            );
            const signatures = await getSignatures(message, admins, await admin.nonce());

            await expect(mortgageMarketplace.registerCollections(
                toDeauth.map(x => x.address),
                false,
                signatures
            )).to.be.revertedWithCustomError(mortgageMarketplace, `NotRegisteredCollection`)
        });

        it('6.3.3.9. Deauthorize launchpad unsuccessfully when unauthorizing same accounts twice on different tx', async () => {
            const { mortgageMarketplace, admin, admins, collections } = await beforeMortgageMarketplaceTest({
                skipRegisterCollection: true,
            });

            await setupCollections(mortgageMarketplace, admin, admins, collections);

            const tx1Accounts = collections.slice(0, 2);
            await callMortgageMarketplace_RegisterCollections(
                mortgageMarketplace as any,
                admins,
                tx1Accounts.map(x => x.address),
                false,
                await admin.nonce()
            );

            const tx2Accounts = [collections[0]];
            const message = ethers.utils.defaultAbiCoder.encode(
                ['address', 'string', 'address[]', 'bool'],
                [mortgageMarketplace.address, 'registerCollections', tx2Accounts.map(x => x.address), false]
            );
            const signatures = await getSignatures(message, admins, await admin.nonce());

            await expect(mortgageMarketplace.registerCollections(
                tx2Accounts.map(x => x.address),
                false,
                signatures
            )).to.be.revertedWithCustomError(mortgageMarketplace, `NotRegisteredCollection`)
        });
    });
    
    describe('6.3.3. list(uint256, uint256, address)', async () => {
        async function beforeListTest(fixture: MortgageMarketplaceFixture): Promise<{ defaultParams: ListParams }> {
            const { mortgageToken } = fixture;
            const defaultParams = {
                collection: mortgageToken.address,
                tokenId: BigNumber.from(1),
                price: BigNumber.from(200000),
                currency: ethers.constants.AddressZero,
            }
            return { defaultParams };
        }

        it('6.3.3.1. list token successfully', async () => {
            const fixture = await beforeMortgageMarketplaceTest({
                listSampleCurrencies: true,
                listSampleMortgageToken: true,
            });
            const { mortgageMarketplace, mortgageToken, seller1, feeReceiver, currency, seller2, admin } = fixture;

            const params1: ListParams = {
                collection: mortgageToken.address,
                tokenId: BigNumber.from(1),
                price: BigNumber.from(200000),
                currency: ethers.constants.AddressZero,
            };

            const royalty1 = (await mortgageToken.royaltyInfo(params1.tokenId, params1.price))[1];
            
            const tx1 = await getListTx(mortgageMarketplace, seller1, params1);
            await tx1.wait();

            expect(tx1).to.emit(mortgageMarketplace, 'NewOffer').withArgs(
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

            const tx2 = await getListTx(mortgageMarketplace, seller2, params2);
            await tx2.wait();

            expect(tx2).to.emit(mortgageMarketplace, 'NewOffer').withArgs(
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

        it('6.3.3.2. list token unsuccessfully when paused', async () => {
            const fixture = await beforeMortgageMarketplaceTest({
                listSampleCurrencies: true,
                listSampleMortgageToken: true,
                pause: true,
            });
            const { mortgageMarketplace, seller1 } = fixture;

            const { defaultParams } = await beforeListTest(fixture);

            await expect(getListTx(mortgageMarketplace, seller1, defaultParams))
                .to.be.revertedWith('Pausable: paused');
        });

        it('6.3.3.3. list token unsuccessfully with invalid token id', async () => {
            const fixture = await beforeMortgageMarketplaceTest({
                listSampleCurrencies: true,
                listSampleMortgageToken: true,
            });
            const { mortgageMarketplace, seller1 } = fixture;

            const { defaultParams } = await beforeListTest(fixture);

            const params1: ListParams = {
                ...defaultParams,
                tokenId: BigNumber.from(0),
            };
            await expect(getListTx(mortgageMarketplace, seller1, params1))
                .to.be.revertedWith('ERC721: invalid token ID');

            const params2: ListParams = {
                ...defaultParams,
                tokenId: BigNumber.from(3),
            };    
            await expect(getListTx(mortgageMarketplace, seller1, params2))
                .to.be.revertedWith('ERC721: invalid token ID');
        });

        it('6.3.3.4. list token unsuccessfully with unregistered collection', async () => {
            const fixture = await beforeMortgageMarketplaceTest({
                listSampleCurrencies: true,
                listSampleMortgageToken: true,
                skipRegisterCollection: true,
            });
            const { mortgageMarketplace, seller1 } = fixture;

            const { defaultParams } = await beforeListTest(fixture);

            await expect(getListTx(mortgageMarketplace, seller1, defaultParams))
                .to.be.revertedWithCustomError(mortgageMarketplace, 'InvalidCollection');
        });

        it('6.3.3.4. list token unsuccessfully with pending mortgage', async () => {
            const fixture = await beforeMortgageMarketplaceTest({
                listSampleCurrencies: true,
                listSampleMortgageToken: true,
                initialMortgageState: MortgageState.Pending,
            });
            const { mortgageMarketplace, seller2 } = fixture;

            const { defaultParams } = await beforeListTest(fixture);

            await expect(getListTx(mortgageMarketplace, seller2, defaultParams))
                .to.be.revertedWithCustomError(mortgageMarketplace, 'InvalidTokenId');
        });

        it('6.3.3.4. list token unsuccessfully with repaid mortgage', async () => {
            const fixture = await beforeMortgageMarketplaceTest({
                listSampleCurrencies: true,
                listSampleMortgageToken: true,
                initialMortgageState: MortgageState.Repaid,
            });
            const { mortgageMarketplace, seller2 } = fixture;

            const { defaultParams } = await beforeListTest(fixture);
                
            await expect(getListTx(mortgageMarketplace, seller2, defaultParams))
                .to.be.revertedWithCustomError(mortgageMarketplace, 'InvalidTokenId');
        });

        it('6.3.3.4. list token unsuccessfully with foreclosed mortgage', async () => {
            const fixture = await beforeMortgageMarketplaceTest({
                listSampleCurrencies: true,
                listSampleMortgageToken: true,
                initialMortgageState: MortgageState.Foreclosed,
            });
            const { mortgageMarketplace, seller2 } = fixture;

            const { defaultParams } = await beforeListTest(fixture);
                
            await expect(getListTx(mortgageMarketplace, seller2, defaultParams))
                .to.be.revertedWithCustomError(mortgageMarketplace, 'InvalidTokenId');
        });

        it('6.3.3.4. list token unsuccessfully by non token owner', async () => {
            const fixture = await beforeMortgageMarketplaceTest({
                listSampleCurrencies: true,
                listSampleMortgageToken: true,
            });
            const { mortgageMarketplace, seller2 } = fixture;

            const { defaultParams } = await beforeListTest(fixture);

            await expect(getListTx(mortgageMarketplace, seller2, defaultParams))
                .to.be.revertedWithCustomError(mortgageMarketplace, 'InvalidTokenId');
        });

        it('6.3.3.5. list token unsuccessfully with zero unit price', async () => {
            const fixture = await beforeMortgageMarketplaceTest({
                listSampleCurrencies: true,
                listSampleMortgageToken: true,
            });
            const { mortgageMarketplace, seller1 } = fixture;

            const { defaultParams } = await beforeListTest(fixture);

            const params: ListParams = {
                ...defaultParams,
                price: BigNumber.from(0),
            };
            await expect(getListTx(mortgageMarketplace, seller1, params))
                .to.be.revertedWithCustomError(mortgageMarketplace, 'InvalidPrice');
        });

        it('6.3.3.6. list token unsuccessfully with invalid currency', async () => {
            const fixture = await beforeMortgageMarketplaceTest({
                listSampleMortgageToken: true,
            });
            const { mortgageMarketplace, seller1 } = fixture;

            const { defaultParams } = await beforeListTest(fixture);

            await expect(getListTx(mortgageMarketplace, seller1, defaultParams))
                .to.be.revertedWithCustomError(mortgageMarketplace, 'InvalidCurrency');
        });
    });

    async function testBuyOffer(
        fixture: MortgageMarketplaceFixture,
        mockCurrencyExclusiveRate: BigNumber,
        isERC20: boolean,
        isExclusive: boolean,
        price: BigNumber,
        isSafeBuy: boolean,
    ) {
        const { deployer, mortgageMarketplace, borrower1, seller1, buyer1, feeReceiver, admins, admin, manager } = fixture;
        
        const mortgageToken = await deployMockMortgageToken(
            deployer.address,
            admin.address,
            feeReceiver.address,
            LendInitialization.ERC721_MORTGAGE_TOKEN_Name,
            `TestCollection`,
            `TC`,
            LendInitialization.ERC721_MORTGAGE_TOKEN_FeeRate,
        ) as MockMortgageToken;

        const broker = randomWallet();
        const currentTokenId = (await mortgageToken.mortgageNumber()).add(1);
        const currentOfferId = (await mortgageMarketplace.offerNumber()).add(1);

        let newCurrency: Currency | null = null;
        let newCurrencyAddress: string;
        if (isERC20) {
            newCurrency = await deployCurrency(
                deployer.address,
                `NewMockCurrency_${currentOfferId}`,
                `NMC_${currentOfferId}`
            ) as Currency;
            newCurrencyAddress = newCurrency.address;

            await callTransaction(newCurrency.setExclusiveDiscount(mockCurrencyExclusiveRate, Constant.COMMON_RATE_DECIMALS));
        } else {
            newCurrencyAddress = ethers.constants.AddressZero;
        }

        await callAdmin_UpdateCurrencyRegistries(
            admin,
            admins,
            [newCurrencyAddress],
            [true],
            [isExclusive],
            await admin.nonce(),
        );

        let currentTimestamp = await time.latest();

        const borrower = borrower1;
        const seller = seller1;
        const buyer = buyer1;

        await callTransaction(mortgageToken.addMortgage(
            10e5,
            11e5,
            200000,
            newCurrencyAddress,
            currentTimestamp + 1000,
            MortgageState.Supplied,
            borrower.address,
            seller.address,
        ));
        await callTransaction(mortgageToken.mint(seller.address, currentTokenId));

        await callMortgageMarketplace_RegisterCollections(
            mortgageMarketplace,
            admins,
            [mortgageToken.address],
            true,
            await admin.nonce(),
        )

        const params: ListParams = {
            collection: mortgageToken.address,
            tokenId: currentTokenId,
            price: price,
            currency: newCurrencyAddress,
        };
        await callTransaction(getListTx(mortgageMarketplace, seller, params));
        await callTransaction(mortgageToken.connect(seller).setApprovalForAll(mortgageMarketplace.address, true));

        let royaltyReceiver = feeReceiver.address;
        let royaltyAmount = (await mortgageToken.royaltyInfo(params.tokenId, params.price))[1];
        if (isExclusive) {
            royaltyAmount = await applyDiscount(admin, royaltyAmount, newCurrency);
        }

        let total = price.add(royaltyAmount);

        let ethValue = ethers.BigNumber.from(0);
        await prepareNativeToken(ethers.provider, deployer, [buyer], ethers.utils.parseEther("1.0"));
        if (isERC20) {
            await prepareERC20(newCurrency!, [buyer], [mortgageMarketplace], total);
        } else {
            ethValue = total;
            await prepareNativeToken(ethers.provider, deployer, [buyer], total);
        }

        let initBuyerBalance = await getBalance(ethers.provider, buyer.address, newCurrency);
        let initSellerBalance = await getBalance(ethers.provider, seller.address, newCurrency);
        let initFeeReceiverBalance = await getBalance(ethers.provider, feeReceiver.address, newCurrency);
        let initBrokerBalance = await getBalance(ethers.provider, broker.address, newCurrency);

        let tx;
        if (isSafeBuy) {
            tx = await mortgageMarketplace.connect(buyer).safeBuy(
                currentOfferId,
                currentTokenId,
                { value: ethValue }
            );
        } else {
            tx = await mortgageMarketplace.connect(buyer).buy(
                currentOfferId,
                { value: ethValue }
            );
        }
        const receipt = await tx.wait();

        let expectedBuyerBalance = initBuyerBalance.sub(total);
        let expectedSellerBalance = initSellerBalance.add(price);
        let expectedFeeReceiverBalance = initFeeReceiverBalance.add(royaltyAmount);

        if (!isERC20) {
            const gasFee = receipt.gasUsed.mul(receipt.effectiveGasPrice);
            expectedBuyerBalance = expectedBuyerBalance.sub(gasFee);
        }

        await expect(tx).to.emit(mortgageMarketplace, 'OfferSale').withArgs(
            currentOfferId,
            buyer.address,
            royaltyReceiver,
            royaltyAmount,
        );

        let offer = await mortgageMarketplace.getOffer(currentOfferId);
        expect(offer.tokenId).to.equal(currentTokenId);
        expect(offer.price).to.equal(price);
        expect(offer.currency).to.equal(newCurrencyAddress);
        expect(offer.state).to.equal(OfferState.Sold);
        expect(offer.seller).to.equal(seller.address);

        expect(await getBalance(ethers.provider, buyer.address, newCurrency)).to.equal(expectedBuyerBalance);
        expect(await getBalance(ethers.provider, seller.address, newCurrency)).to.equal(expectedSellerBalance);
        expect(await getBalance(ethers.provider, feeReceiver.address, newCurrency)).to.equal(expectedFeeReceiverBalance);

        expect(await mortgageToken.ownerOf(currentTokenId)).to.equal(buyer.address);

        let walletsToReset = [seller, buyer, feeReceiver];
        if (isERC20) {
            await resetERC20(newCurrency!, walletsToReset);
        } else {
            await resetNativeToken(ethers.provider, walletsToReset);
            await prepareNativeToken(ethers.provider, deployer, [seller, buyer], ethers.utils.parseEther("1.0"));
        }
    }

    describe('6.3.4. buy(uint256)', async () => {
        it('6.3.4.1. buy token successfully in native and erc20 token', async () => {
            const fixture = await beforeMortgageMarketplaceTest({
                listSampleCurrencies: true,
                listSampleMortgageToken: true,
            });
    
            await testBuyOffer(
                fixture,
                ethers.utils.parseEther("0.2"),
                false,
                false,
                ethers.BigNumber.from(200000),
                false,
            );

            await testBuyOffer(
                fixture,
                ethers.utils.parseEther("0.2"),
                true,
                false,
                ethers.BigNumber.from(500000),
                false,
            );
        });

        it('6.3.4.2. buy token successfully in all native/erc20 and exclusive/non-exclusive combinations', async () => {
            const fixture = await beforeMortgageMarketplaceTest({
                listSampleCurrencies: true,
                listSampleMortgageToken: true,
            });

            for (const isERC20 of [false, true]) {
                for (const isExclusive of [false, true]) {
                    if (!isERC20 && isExclusive) {
                        continue;
                    }
                    await testBuyOffer(
                        fixture,
                        ethers.utils.parseEther("0.2"),
                        isERC20,
                        isExclusive,
                        ethers.BigNumber.from(200000),
                        false,
                    )
                }
            }
        });

        it('6.3.4.3. buy token successfully with very large amount in all native/erc20 and exclusive/non-exclusive combinations', async () => {
            const fixture = await beforeMortgageMarketplaceTest({
                listSampleCurrencies: true,
                listSampleMortgageToken: true,
            });

            for (const isERC20 of [false, true]) {
                for (const isExclusive of [false, true]) {
                    if (!isERC20 && isExclusive) {
                        continue;
                    }
                    const price = ethers.BigNumber.from(2).pow(255);
                    await testBuyOffer(
                        fixture,
                        ethers.utils.parseEther("0.99"),
                        isERC20,
                        isExclusive,
                        price,
                        false,
                    )
                }
            }
        });

        it('6.3.4.4. buy token unsuccessfully when paused', async () => {
            const fixture = await beforeMortgageMarketplaceTest({
                listSampleCurrencies: true,
                listSampleMortgageToken: true,
                listSampleOffers: true,
                pause: true,
            });
            const { mortgageMarketplace, buyer1 } = fixture;

            await expect(mortgageMarketplace.connect(buyer1).buy(1, { value: 1e9 }))
                .to.be.revertedWith("Pausable: paused");
        });

        it('6.3.4.5. buy token unsuccessfully with invalid offer id', async () => {
            const fixture = await beforeMortgageMarketplaceTest({
                listSampleCurrencies: true,
                listSampleMortgageToken: true,
                listSampleOffers: true,
            });
            const { mortgageMarketplace, buyer1 } = fixture;

            await expect(mortgageMarketplace.connect(buyer1).buy(0, { value: 1e9 }))
                .to.be.revertedWithCustomError(mortgageMarketplace, "InvalidOfferId");

            await expect(mortgageMarketplace.connect(buyer1).buy(3, { value: 1e9 }))
                .to.be.revertedWithCustomError(mortgageMarketplace, "InvalidOfferId");
        });

        it('6.3.4.6. buy token unsuccessfully when seller buy their own token', async () => {
            const fixture = await beforeMortgageMarketplaceTest({
                listSampleCurrencies: true,
                listSampleMortgageToken: true,
                listSampleOffers: true,
            });
            const { mortgageMarketplace, seller1, seller2 } = fixture;

            await expect(mortgageMarketplace.connect(seller1).buy(1, { value: 1e9 }))
                .to.be.revertedWithCustomError(mortgageMarketplace, "InvalidBuying");

            await expect(mortgageMarketplace.connect(seller2).buy(2))
                .to.be.revertedWithCustomError(mortgageMarketplace, "InvalidBuying");
        });

        it('6.3.4.7. buy token unsuccessfully when offer is not selling', async () => {
            const fixture = await beforeMortgageMarketplaceTest({
                listSampleCurrencies: true,
                listSampleMortgageToken: true,
                listSampleOffers: true,
            });
            const { mortgageMarketplace, buyer1, buyer2 } = fixture;

            await callTransaction(mortgageMarketplace.connect(buyer1).buy(1, { value: 1e9 }));

            await expect(mortgageMarketplace.connect(buyer2).buy(1, { value: 1e9 }))
                .to.be.revertedWithCustomError(mortgageMarketplace, "InvalidBuying");
        });

        it('6.3.4.7. buy token unsuccessfully when mortgage is repaid', async () => {
            const fixture = await beforeMortgageMarketplaceTest({
                listSampleCurrencies: true,
                listSampleMortgageToken: true,
                listSampleOffers: true,
            });
            const { mortgageMarketplace, buyer1, borrower1, mortgageToken } = fixture;

            await callTransaction(mortgageToken.connect(borrower1).repay(1));

            await expect(mortgageMarketplace.connect(buyer1).buy(1, { value: 1e9 }))
                .to.be.revertedWithCustomError(mortgageMarketplace, "InvalidTokenId");
        });

        it('6.3.4.7. buy token unsuccessfully when mortgage is foreclosed', async () => {
            const fixture = await beforeMortgageMarketplaceTest({
                listSampleCurrencies: true,
                listSampleMortgageToken: true,
                listSampleOffers: true,
            });
            const { mortgageMarketplace, buyer1, seller1, mortgageToken } = fixture;

            await callTransaction(mortgageToken.connect(seller1).foreclose(1));

            await expect(mortgageMarketplace.connect(buyer1).buy(1, { value: 1e9 }))
                .to.be.revertedWithCustomError(mortgageMarketplace, "InvalidTokenId");
        });

        it('6.3.4.8. buy token unsuccessfully with insufficient native token', async () => {
            const fixture = await beforeMortgageMarketplaceTest({
                listSampleCurrencies: true,
                listSampleMortgageToken: true,
                listSampleOffers: true,
            });
            const { mortgageMarketplace, buyer1 } = fixture;

            await expect(mortgageMarketplace.connect(buyer1).buy(1))
                .to.be.revertedWithCustomError(mortgageMarketplace, "InsufficientValue");
        });

        it('6.3.4.9. buy token unsuccessfully when native token transfer to seller failed', async () => {
            const fixture = await beforeMortgageMarketplaceTest({
                listSampleCurrencies: true,
                listSampleMortgageToken: true,
            });
            const { mortgageMarketplace, seller1, buyer1, deployer, mortgageToken } = fixture;
            
            const failReceiver = await deployFailReceiver(deployer, true, false);

            await callTransaction(mortgageToken.connect(seller1).transferFrom(
                seller1.address,
                failReceiver.address,
                1,
            ));

            await callTransaction(failReceiver.call(
                mortgageToken.address,
                mortgageToken.interface.encodeFunctionData("setApprovalForAll", [mortgageMarketplace.address, true])
            ));

            await callTransaction(getCallListTx(
                mortgageMarketplace, 
                failReceiver as ProxyCaller, 
                {
                    collection: mortgageToken.address,
                    tokenId: BigNumber.from(1),
                    price: BigNumber.from(200000),
                    currency: ethers.constants.AddressZero,
                }
            ));

            await expect(mortgageMarketplace.connect(buyer1).buy(1, { value: 1e9 }))
                .to.be.revertedWithCustomError(mortgageMarketplace, "FailedTransfer");
        });

        it('6.3.4.10. buy token unsuccessfully when native token transfer to royalty receiver failed', async () => {
            const fixture = await beforeMortgageMarketplaceTest({
                listSampleCurrencies: true,
                listSampleMortgageToken: true,
                listSampleOffers: true,
                fundERC20ForBuyers: true,
                useFailRoyaltyReceiver: true,
            });
            const { mortgageMarketplace, buyer1, failReceiver } = fixture;

            await callTransaction(failReceiver.activate(true));

            await expect(mortgageMarketplace.connect(buyer1).buy(1, { value: 1e9 }))
                .to.be.revertedWithCustomError(mortgageMarketplace, "FailedTransfer");
        });

        it('6.3.4.11. buy token unsuccessfully when refund to sender failed', async () => {
            const fixture = await beforeMortgageMarketplaceTest({
                listSampleCurrencies: true,
                listSampleMortgageToken: true,
                listSampleOffers: true,
                fundERC20ForBuyers: true,
            });
            const { mortgageMarketplace, deployer } = fixture;

            const failReceiver = await deployFailReceiver(deployer, true, false);

            let data = mortgageMarketplace.interface.encodeFunctionData("buy", [1]);

            await expect(failReceiver.call(mortgageMarketplace.address, data, { value: 1e9 }))
                .to.be.revertedWithCustomError(mortgageMarketplace, "FailedRefund");
        });

        it('6.3.4.12. buy token unsuccessfully when this contract is reentered', async () => {
            const fixture = await beforeMortgageMarketplaceTest({
                listSampleCurrencies: true,
                listSampleMortgageToken: true,
            });
            const { deployer, mortgageToken, mortgageMarketplace, buyer1, seller1 } = fixture;

            const reentrancy = await deployReentrancy(deployer);

            await callTransaction(mortgageToken.connect(seller1).transferFrom(
                seller1.address,
                reentrancy.address,
                1,
            ));

            let data = mortgageMarketplace.interface.encodeFunctionData("list", [
                mortgageToken.address,
                1,
                200000,
                ethers.constants.AddressZero,
            ]);
            await callTransaction(reentrancy.call(mortgageMarketplace.address, data));

            data = mortgageToken.interface.encodeFunctionData("setApprovalForAll", [mortgageMarketplace.address, true]);
            await callTransaction(reentrancy.call(mortgageToken.address, data));

            await testReentrancy_MortgageMarketplace(
                mortgageMarketplace,
                reentrancy,
                async () => {
                    await expect(mortgageMarketplace.connect(buyer1).buy(1, { value: 1e9 }))
                        .to.be.revertedWithCustomError(mortgageMarketplace, "FailedTransfer");
                },
            );
        });
    });

    describe('6.3.5. safeBuy(uint256, uint256)', async () => {
        it('6.3.5.1. buy token successfully', async () => {
            const fixture = await beforeMortgageMarketplaceTest({
                listSampleCurrencies: true,
                listSampleMortgageToken: true,
            });
            
            await testBuyOffer(
                fixture,
                ethers.utils.parseEther("0.2"),
                false,
                false,
                ethers.BigNumber.from(200000),
                true,
            );

            await testBuyOffer(
                fixture,
                ethers.utils.parseEther("0.2"),
                true,
                false,
                ethers.BigNumber.from(500000),
                true,
            );
        });

        it('6.3.5.2. buy token unsuccessfully with invalid offer id', async () => {
            const fixture = await beforeMortgageMarketplaceTest({
                listSampleCurrencies: true,
                listSampleMortgageToken: true,
                listSampleOffers: true,
            });
            const { mortgageMarketplace, buyer1 } = fixture;

            await expect(mortgageMarketplace.connect(buyer1).safeBuy(0, 1, { value: 1e9 }))
                .to.be.revertedWithCustomError(mortgageMarketplace, "InvalidOfferId");

            await expect(mortgageMarketplace.connect(buyer1).safeBuy(3, 1, { value: 1e9 }))
                .to.be.revertedWithCustomError(mortgageMarketplace, "InvalidOfferId");
        });

        it('6.3.5.3. buy token unsuccessfully with invalid anchor', async () => {
            const fixture = await beforeMortgageMarketplaceTest({
                listSampleCurrencies: true,
                listSampleMortgageToken: true,
                listSampleOffers: true,
            });
            const { mortgageMarketplace, buyer1, buyer2 } = fixture;

            await expect(mortgageMarketplace.connect(buyer1).safeBuy(1, 2, { value: 1e9 }))
                .to.be.revertedWithCustomError(mortgageMarketplace, "BadAnchor");

            await expect(mortgageMarketplace.connect(buyer2).safeBuy(2, 1))
                .to.be.revertedWithCustomError(mortgageMarketplace, "BadAnchor");
        });
    });

    describe('6.3.6. cancelOffer(uint256)', async () => {
        it('6.3.6.1. cancel offer successfully by seller', async () => {
            const fixture = await beforeMortgageMarketplaceTest({
                listSampleCurrencies: true,
                listSampleMortgageToken: true,
                listSampleOffers: true,
                fundERC20ForBuyers: true,
            });
            const { mortgageMarketplace, seller1 } = fixture;

            let tx = await mortgageMarketplace.connect(seller1).cancel(1);
            await tx.wait();

            const offer = await mortgageMarketplace.getOffer(1);
            expect(offer.state).to.equal(OfferState.Cancelled);

            await expect(tx).to
                .emit(mortgageMarketplace, "OfferCancellation")
                .withArgs(1);
        });

        it('6.3.6.2. cancel offer successfully by manager', async () => {
            const fixture = await beforeMortgageMarketplaceTest({
                listSampleCurrencies: true,
                listSampleMortgageToken: true,
                listSampleOffers: true,
                fundERC20ForBuyers: true,
            });
            const { mortgageMarketplace, manager } = fixture;
            let tx = await mortgageMarketplace.connect(manager).cancel(1);
            await tx.wait();

            const offer = await mortgageMarketplace.getOffer(1);
            expect(offer.state).to.equal(OfferState.Cancelled);

            await expect(tx).to
                .emit(mortgageMarketplace, "OfferCancellation")
                .withArgs(1);
        });

        it('6.3.6.3. cancel offer unsuccessfully with invalid offer id', async () => {
            const fixture = await beforeMortgageMarketplaceTest({
                listSampleCurrencies: true,
                listSampleMortgageToken: true,
                listSampleOffers: true,
                fundERC20ForBuyers: true,
            });
            const { mortgageMarketplace, manager } = fixture;

            await expect(mortgageMarketplace.connect(manager).cancel(0))
                .to.be.revertedWithCustomError(mortgageMarketplace, "InvalidOfferId");
            await expect(mortgageMarketplace.connect(manager).cancel(3))
                .to.be.revertedWithCustomError(mortgageMarketplace, "InvalidOfferId");
        });

        it('6.3.6.4. cancel offer unsuccessfully by unauthorized user', async () => {
            const fixture = await beforeMortgageMarketplaceTest({
                listSampleCurrencies: true,
                listSampleMortgageToken: true,
                listSampleOffers: true,
                fundERC20ForBuyers: true,
            });
            const { mortgageMarketplace, seller2, moderator } = fixture;

            await expect(mortgageMarketplace.connect(seller2).cancel(1))
                .to.be.revertedWithCustomError(mortgageMarketplace, "Unauthorized");

            await expect(mortgageMarketplace.connect(moderator).cancel(1))
                .to.be.revertedWithCustomError(mortgageMarketplace, "Unauthorized");
        });

        it('6.3.6.5. cancel offer unsuccessfully when offer is already cancelled', async () => {
            const fixture = await beforeMortgageMarketplaceTest({
                listSampleCurrencies: true,
                listSampleMortgageToken: true,
                listSampleOffers: true,
                fundERC20ForBuyers: true,
            });
            const { mortgageMarketplace, manager } = fixture;

            await callTransaction(mortgageMarketplace.connect(manager).cancel(1));
            await expect(mortgageMarketplace.connect(manager).cancel(1))
                .to.be.revertedWithCustomError(mortgageMarketplace, "InvalidCancelling");
        });

        it('6.3.6.6. cancel offer unsuccessfully when offer is sold out', async () => {
            const fixture = await beforeMortgageMarketplaceTest({
                listSampleCurrencies: true,
                listSampleMortgageToken: true,
                listSampleOffers: true,
                fundERC20ForBuyers: true,
            });
            const { mortgageMarketplace, manager, buyer1 } = fixture;

            await callTransaction(mortgageMarketplace.connect(buyer1).buy(1, { value: 1e9 }));

            await expect(mortgageMarketplace.connect(manager).cancel(1))
                .to.be.revertedWithCustomError(mortgageMarketplace, "InvalidCancelling");
        });
    });
});
