    import { expect } from 'chai';
import { ethers, upgrades } from 'hardhat';
import {
    Admin,
    Currency,
    FeeReceiver,
    ERC721Marketplace,
    RoyaltyCollection,
    RoyaltyCollection__factory,
    Collection__factory,
    ProxyCaller,
} from '@typechain-types';
import { callTransaction, expectRevertWithModifierCustomError, getBalance, getSignatures, prepareERC20, prepareNativeToken, randomWallet, resetERC20, resetNativeToken, testReentrancy } from '@utils/blockchain';
import { Constant } from '@tests/test.constant';
import { deployAdmin } from '@utils/deployments/common/admin';
import { deployFeeReceiver } from '@utils/deployments/common/feeReceiver';
import { deployCurrency } from '@utils/deployments/common/currency';
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";

import { MockContract, smock } from '@defi-wonderland/smock';

import { BigNumber, Contract, Wallet } from 'ethers';
import { deployERC721Marketplace } from '@utils/deployments/lux/erc721Marketplace';
import { OfferState } from "@utils/models/lux/offerState";
import { deployFailReceiver } from '@utils/deployments/mock/failReceiver';
import { deployReentrancy } from '@utils/deployments/mock/mockReentrancy/reentrancy';
import { applyDiscount, remain } from '@utils/formula';
import { BuyParams, ListParams, RegisterCollectionsParams, RegisterCollectionsParamsInput, SafeBuyParams } from '@utils/models/lux/erc721Marketplace';
import { getBuyTx, getCallListTx, getListTx, getRegisterCollectionsTx, getSafeBuyTx } from '@utils/transaction/lux/erc721Marketplace';
import { getRegisterCollectionsSignatures } from '@utils/signatures/lux/erc721Marketplace';
import { getSafeBuyAnchor } from '@utils/anchor/lux/erc721Marketplace';
import { getAuthorizeManagersTxByInput, getAuthorizeModeratorsTxByInput, getUpdateCurrencyRegistriesTxByInput } from '@utils/transaction/common/admin';
import { getPauseTxByInput } from '@utils/transaction/common/pausable';

interface ERC721MarketplaceFixture {
    admin: Admin;
    feeReceiver: FeeReceiver;
    currency: Currency;
    feeReceiverCollection: MockContract<RoyaltyCollection>;
    otherCollection: MockContract<RoyaltyCollection>;
    erc721Marketplace: ERC721Marketplace;
    collections: any[];

    deployer: SignerWithAddress;
    admins: any[];
    royaltyReceiver: any;
    seller1: any;
    seller2: any;
    buyer1: any;
    buyer2: any;
    manager: any;
    moderator: any;

    failReceiver: any;
}

async function testReentrancy_ERC721Marketplace(
    erc721Marketplace: ERC721Marketplace,
    reentrancyContract: Contract,
    assertion: any,
) {
    let data = [
        erc721Marketplace.interface.encodeFunctionData("buy", [0]),
        erc721Marketplace.interface.encodeFunctionData("safeBuy", [0, 0]),
        erc721Marketplace.interface.encodeFunctionData("cancel", [0]),
    ];

    await testReentrancy(
        reentrancyContract,
        erc721Marketplace,
        data,
        assertion,
    );
}

describe('6.1. ERC721Marketplace', async () => {
    async function erc721MarketplaceFixture(): Promise<ERC721MarketplaceFixture> {
        const accounts = await ethers.getSigners();
        const deployer = accounts[0];
        const admins = [];
        for (let i = 1; i <= Constant.ADMIN_NUMBER; ++i) admins.push(accounts[i]);
        const seller1 = accounts[Constant.ADMIN_NUMBER + 1];
        const seller2 = accounts[Constant.ADMIN_NUMBER + 2];
        const buyer1 = accounts[Constant.ADMIN_NUMBER + 3];
        const buyer2 = accounts[Constant.ADMIN_NUMBER + 4];
        const manager = accounts[Constant.ADMIN_NUMBER + 5];
        const moderator = accounts[Constant.ADMIN_NUMBER + 6];
        const royaltyReceiver = accounts[Constant.ADMIN_NUMBER + 7];

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

        const SmockCollectionFactory = await smock.mock<RoyaltyCollection__factory>("RoyaltyCollection");
        const feeReceiverCollection = await SmockCollectionFactory.deploy();
        await feeReceiverCollection.initialize(
            admin.address,
            feeReceiver.address,
            ethers.utils.parseEther("0.1"),       
            'FeeReceiverCollection',
            'FRC',
        );
        const otherCollection = await SmockCollectionFactory.deploy();
        await otherCollection.initialize(
            admin.address,
            royaltyReceiver.address,
            ethers.utils.parseEther("0.2"),          
            'OtherCollection',
            'OTC',
        );

        const collections: any[] = [feeReceiverCollection, otherCollection];
        while (collections.length < 5) {
            const Collection = await ethers.getContractFactory("Collection");
            const collection = await upgrades.deployProxy(Collection, ["TestCollection", "TC"]);
            collections.push(collection);
        }

        const currency = await deployCurrency(
            deployer.address,
            'MockCurrency',
            'MCK'
        ) as Currency;
        const mockCurrencyExclusiveRate = ethers.utils.parseEther("0.3");
        await callTransaction(currency.setExclusiveDiscount(mockCurrencyExclusiveRate, Constant.COMMON_RATE_DECIMALS));

        const erc721Marketplace = await deployERC721Marketplace(
            deployer.address,
            admin.address,
            feeReceiver.address,
        ) as ERC721Marketplace;

        const failReceiver = await deployFailReceiver(deployer, false, false);

        return {
            admin,
            feeReceiver,
            currency,
            feeReceiverCollection,
            otherCollection,
            erc721Marketplace,
            collections,
            deployer,
            admins,
            seller1,
            seller2,
            buyer1,
            buyer2,
            manager,
            moderator,
            royaltyReceiver,
            failReceiver,
        };
    };

    async function beforeERC721MarketplaceTest({
        skipRegisterCollection = false,
        listSampleCurrencies = false,
        listSampleCollectionTokens = false,
        listSampleOffers = false,
        useFailRoyaltyReceiver = false,
        fundERC20ForBuyers = false,
        pause = false,
    } = {}): Promise<ERC721MarketplaceFixture> {
        const fixture = await loadFixture(erc721MarketplaceFixture);

        const {
            deployer,
            admin,
            admins,
            currency,
            erc721Marketplace,
            seller1,
            seller2,
            buyer1,
            buyer2,
            manager,
            moderator,
            feeReceiverCollection,
            otherCollection,
            failReceiver,
        } = fixture;

        await callTransaction(getAuthorizeManagersTxByInput(
            admin,
            deployer,
            {
                accounts: [manager.address],
                isManager: true,
            },
            admins,
        ));

        await callTransaction(getAuthorizeModeratorsTxByInput(
            admin,
            deployer,
            {
                accounts: [moderator.address],
                isModerator: true,
            },
            admins,
        ));

        if (!skipRegisterCollection) {
            await callERC721Marketplace_RegisterCollections(
                erc721Marketplace,
                deployer,
                admins,
                admin,
                {
                    collections: [feeReceiverCollection.address, otherCollection.address],
                    isCollection: true,
                },
            );
        }

        if (listSampleCurrencies) {
            await callTransaction(getUpdateCurrencyRegistriesTxByInput(
                admin,
                deployer,
                {
                    currencies: [ethers.constants.AddressZero, currency.address],
                    isAvailable: [true, true],
                    isExclusive: [false, true],
                },
                admins
            ));
        }

        if (listSampleCollectionTokens) {
            for(const collection of [feeReceiverCollection, otherCollection]) {
                await callTransaction(collection.mint(seller1.address, 1));
                await callTransaction(collection.mint(seller2.address, 2));

                await callTransaction(collection.connect(seller1).setApprovalForAll(erc721Marketplace.address, true));
                await callTransaction(collection.connect(seller2).setApprovalForAll(erc721Marketplace.address, true));
            }
        }

        if (useFailRoyaltyReceiver) {
            await callTransaction(feeReceiverCollection.updateRoyaltyReceiver(failReceiver.address));
        }

        if (listSampleOffers) {
            await callTransaction(erc721Marketplace.connect(seller1).list(feeReceiverCollection.address, 1, 200000, ethers.constants.AddressZero));
            await callTransaction(erc721Marketplace.connect(seller2).list(otherCollection.address, 2, 500000, currency.address));
        }

        if (fundERC20ForBuyers) {
            await prepareERC20(currency, [buyer1, buyer2], [erc721Marketplace], ethers.BigNumber.from(1e9));
        }

        if (pause) {
            await callTransaction(getPauseTxByInput(erc721Marketplace, deployer, admins, admin));
        }

        return {
            ...fixture,
        }
    }

    describe('6.1.1. initialize(address, address, address)', async () => {
        it('6.1.1.1. Deploy successfully', async () => {
            const fixture = await erc721MarketplaceFixture();
            const { admin, feeReceiver, erc721Marketplace } = fixture;

            expect(await erc721Marketplace.offerNumber()).to.equal(0);

            expect(await erc721Marketplace.admin()).to.equal(admin.address);
            expect(await erc721Marketplace.feeReceiver()).to.equal(feeReceiver.address);
        });
    });

    describe('6.1.2. getOffer(uint256)', async () => {
        it('6.1.2.1. Return successfully', async () => {
            const fixture = await beforeERC721MarketplaceTest({
                listSampleCurrencies: true,
                listSampleCollectionTokens: true,
                listSampleOffers: true,
            });
            const { erc721Marketplace } = fixture;

            expect(await erc721Marketplace.getOffer(1)).to.not.be.reverted;
            expect(await erc721Marketplace.getOffer(2)).to.not.be.reverted;
        });

        it('6.1.2.2. Revert with invalid offer id', async () => {
            const fixture = await beforeERC721MarketplaceTest({
                listSampleCurrencies: true,
                listSampleCollectionTokens: true,
                listSampleOffers: true,
            });
            const { erc721Marketplace } = fixture;

            await expectRevertWithModifierCustomError(
                erc721Marketplace,
                erc721Marketplace.getOffer(0),
                'InvalidOfferId'
            );
            await expectRevertWithModifierCustomError(
                erc721Marketplace,
                erc721Marketplace.getOffer(3),
                'InvalidOfferId'
            );
        });
    });

    describe('6.1.3. registerCollections(address[], bool, bytes[])', async () => {
        it('6.1.3.1. Register collections successfully with valid signatures', async () => {
            const { deployer, erc721Marketplace, admin, admins, collections } = await beforeERC721MarketplaceTest({
                skipRegisterCollection: true,
            });

            const toBeCollections = collections.slice(0, 3);

            const paramsInput: RegisterCollectionsParamsInput = {
                collections: toBeCollections.map(x => x.address),
                isCollection: true,
            };
            const params: RegisterCollectionsParams = {
                ...paramsInput,
                signatures: await getRegisterCollectionsSignatures(erc721Marketplace, admins, admin, paramsInput),
            };
            const tx = await getRegisterCollectionsTx(erc721Marketplace as any, deployer, params);
            await tx.wait();

            for (const collection of toBeCollections) {
                await expect(tx).to.emit(erc721Marketplace, 'CollectionRegistration').withArgs(collection.address);
            }

            for (const collection of collections) {
                const isCollection = await erc721Marketplace.isCollection(collection.address);
                if (toBeCollections.includes(collection)) {
                    expect(isCollection).to.be.true;
                } else {
                    expect(isCollection).to.be.false;
                }
            }
        });

        it('6.1.3.2. Register collections unsuccessfully with invalid signatures', async () => {
            const { deployer, erc721Marketplace, admin, admins, collections } = await beforeERC721MarketplaceTest({
                skipRegisterCollection: true,
            });

            const toBeCollections = collections.slice(0, 3);
            const paramsInput: RegisterCollectionsParamsInput = {
                collections: toBeCollections.map(x => x.address),
                isCollection: true,
            };
            const params: RegisterCollectionsParams = {
                ...paramsInput,
                signatures: await getRegisterCollectionsSignatures(erc721Marketplace, admins, admin, paramsInput, false),
            };
            await expect(getRegisterCollectionsTx(erc721Marketplace as any, deployer, params))
                .to.be.revertedWithCustomError(admin, 'FailedVerification');
        });

        it('6.1.3.3. Register collections reverted without reason with EOA', async () => {
            const { deployer, erc721Marketplace, admin, admins } = await beforeERC721MarketplaceTest({
                skipRegisterCollection: true,
            });

            const invalidCollection = randomWallet();

            const paramsInput: RegisterCollectionsParamsInput = {
                collections: [invalidCollection.address],
                isCollection: true,
            };
            const params: RegisterCollectionsParams = {
                ...paramsInput,
                signatures: await getRegisterCollectionsSignatures(erc721Marketplace, admins, admin, paramsInput),
            };

            await expect(getRegisterCollectionsTx(erc721Marketplace as any, deployer, params))
                .to.be.revertedWithCustomError(erc721Marketplace, 'InvalidCollection');
        })

        it('6.1.3.4. Register collections unsuccessfully when contract does not support IERC721 interface', async () => {
            const { deployer, erc721Marketplace, admin, admins } = await beforeERC721MarketplaceTest({
                skipRegisterCollection: true,
            });

            const invalidCollection = erc721Marketplace;
            const paramsInput: RegisterCollectionsParamsInput = {
                collections: [invalidCollection.address],
                isCollection: true,
            };
            const params: RegisterCollectionsParams = {
                ...paramsInput,
                signatures: await getRegisterCollectionsSignatures(erc721Marketplace, admins, admin, paramsInput),
            };
            await expect(getRegisterCollectionsTx(erc721Marketplace as any, deployer, params))
                .to.be.revertedWithCustomError(erc721Marketplace, 'InvalidCollection');
        })

        it('6.1.3.5. Register collections unsuccessfully when authorizing the same account twice on the same tx', async () => {
            const { deployer, erc721Marketplace, admin, admins, collections } = await beforeERC721MarketplaceTest({
                skipRegisterCollection: true,
            });

            const duplicateCollections = [collections[0], collections[1], collections[2], collections[0]];
            const paramsInput: RegisterCollectionsParamsInput = {
                collections: duplicateCollections.map(x => x.address),
                isCollection: true,
            };
            const params: RegisterCollectionsParams = {
                ...paramsInput,
                signatures: await getRegisterCollectionsSignatures(erc721Marketplace, admins, admin, paramsInput),
            };
            await expect(getRegisterCollectionsTx(erc721Marketplace as any, deployer, params))
                .to.be.revertedWithCustomError(erc721Marketplace, `RegisteredCollection`)
        });

        it('6.1.3.6. Register collections unsuccessfully when authorizing the same account twice on different txs', async () => {
            const { deployer, erc721Marketplace, admin, admins, collections } = await beforeERC721MarketplaceTest({
                skipRegisterCollection: true,
            });

            const tx1Collections = collections.slice(0, 3);
            await callERC721Marketplace_RegisterCollections(
                erc721Marketplace,
                deployer,
                admins,
                admin,
                {
                    collections: tx1Collections.map(x => x.address),
                    isCollection: true,
                }
            );

            const tx2Collections = [collections[3], collections[2], collections[4]];
            const paramsInput: RegisterCollectionsParamsInput = {
                collections: tx2Collections.map(x => x.address),
                isCollection: true,
            };
            const params: RegisterCollectionsParams = {
                ...paramsInput,
                signatures: await getRegisterCollectionsSignatures(erc721Marketplace, admins, admin, paramsInput),
            };
            await expect(getRegisterCollectionsTx(erc721Marketplace as any, deployer, params))
                .to.be.revertedWithCustomError(erc721Marketplace, `RegisteredCollection`)
        })

        it('6.1.3.7. Deregister collections successfully', async () => {
            const { deployer, erc721Marketplace, admin, admins, collections } = await beforeERC721MarketplaceTest({
                skipRegisterCollection: true,
            });

            await callERC721Marketplace_RegisterCollections(
                erc721Marketplace,
                deployer,
                admins,
                admin,
                {
                    collections: collections.map(x => x.address),
                    isCollection: true,
                }
            );

            const toDeregister = collections.slice(0, 2);

            const paramsInput: RegisterCollectionsParamsInput = {
                collections: toDeregister.map(x => x.address),
                isCollection: false,
            };
            const params: RegisterCollectionsParams = {
                ...paramsInput,
                signatures: await getRegisterCollectionsSignatures(erc721Marketplace, admins, admin, paramsInput),
            };

            const tx = await getRegisterCollectionsTx(erc721Marketplace as any, deployer, params);
            await tx.wait();

            for (const collection of toDeregister) {
                await expect(tx).to.emit(erc721Marketplace, 'CollectionDeregistration').withArgs(collection.address);
            }

            for (const collection of collections) {
                const isCollection = await erc721Marketplace.isCollection(collection.address);
                if (toDeregister.includes(collection)) {
                    expect(isCollection).to.be.false;
                } else {
                    expect(isCollection).to.be.true;
                }
            }            
        });

        it('6.1.3.8. Deregister collections unsuccessfully with unauthorized account', async () => {
            const { deployer, erc721Marketplace, admin, admins, collections } = await beforeERC721MarketplaceTest({
                skipRegisterCollection: true,
            });

            await callERC721Marketplace_RegisterCollections(
                erc721Marketplace,
                deployer,
                admins,
                admin,
                {
                    collections: collections.map(x => x.address),
                    isCollection: true,
                }
            );

            const unauthorizedAccount = randomWallet();
            const toDeauth = [collections[0], unauthorizedAccount];
            const paramsInput: RegisterCollectionsParamsInput = {
                collections: toDeauth.map(x => x.address),
                isCollection: false,
            };
            const params: RegisterCollectionsParams = {
                ...paramsInput,
                signatures: await getRegisterCollectionsSignatures(erc721Marketplace, admins, admin, paramsInput),
            };
            await expect(getRegisterCollectionsTx(erc721Marketplace as any, deployer, params))
                .to.be.revertedWithCustomError(erc721Marketplace, `NotRegisteredCollection`)
        });

        it('6.1.3.8. Deauthorize collections unsuccessfully when unauthorizing the same account twice on the same tx', async () => {
            const { deployer, erc721Marketplace, admin, admins, collections } = await beforeERC721MarketplaceTest({
                skipRegisterCollection: true,
            });

            await callERC721Marketplace_RegisterCollections(
                erc721Marketplace,
                deployer,
                admins,
                admin,
                {
                    collections: collections.map(x => x.address),
                    isCollection: true,
                }
            );

            const toDeauth = collections.slice(0, 2).concat([collections[0]]);
            const paramsInput: RegisterCollectionsParamsInput = {
                collections: toDeauth.map(x => x.address),
                isCollection: false,
            };
            const params: RegisterCollectionsParams = {
                ...paramsInput,
                signatures: await getRegisterCollectionsSignatures(erc721Marketplace, admins, admin, paramsInput),
            };
            await expect(getRegisterCollectionsTx(erc721Marketplace as any, deployer, params))
                .to.be.revertedWithCustomError(erc721Marketplace, `NotRegisteredCollection`)
        });

        it('6.1.3.9. Deauthorize collections unsuccessfully when unauthorizing the same account twice on different txs', async () => {
            const { deployer, erc721Marketplace, admin, admins, collections } = await beforeERC721MarketplaceTest({
                skipRegisterCollection: true,
            });

            await callERC721Marketplace_RegisterCollections(
                erc721Marketplace,
                deployer,
                admins,
                admin,
                {
                    collections: collections.map(x => x.address),
                    isCollection: true,
                }
            );

            const tx1Accounts = collections.slice(0, 2);
            await callERC721Marketplace_RegisterCollections(
                erc721Marketplace as any,
                deployer,
                admins,
                admin,
                {
                    collections: tx1Accounts.map(x => x.address),
                    isCollection: false,
                }
            );

            const tx2Accounts = [collections[0]];
            const paramsInput: RegisterCollectionsParamsInput = {
                collections: tx2Accounts.map(x => x.address),
                isCollection: false,
            };
            const params: RegisterCollectionsParams = {
                ...paramsInput,
                signatures: await getRegisterCollectionsSignatures(erc721Marketplace, admins, admin, paramsInput),
            };

            await expect(getRegisterCollectionsTx(erc721Marketplace as any, deployer, params))
                .to.be.revertedWithCustomError(erc721Marketplace, `NotRegisteredCollection`)
        });
    });

    describe('6.1.3. list(address, uint256, uint256, address)', async () => {
        it('6.1.3.1. List token successfully', async () => {
            const fixture = await beforeERC721MarketplaceTest({
                listSampleCurrencies: true,
                listSampleCollectionTokens: true,
            });
            const { erc721Marketplace, feeReceiverCollection, otherCollection, currency, seller1, seller2, feeReceiver, royaltyReceiver, admin } = fixture;

            // Tx1: FeeReceiverCollection, native currency
            const params1: ListParams = {
                collection: feeReceiverCollection.address,
                tokenId: BigNumber.from(1),
                price: BigNumber.from(200000),
                currency: ethers.constants.AddressZero,
            };

            const royalty1 = (await feeReceiverCollection.royaltyInfo(params1.tokenId, params1.price))[1];

            const tx1 = await getListTx(erc721Marketplace, seller1, params1);
            await tx1.wait();

            expect(tx1).to.emit(erc721Marketplace, 'NewOffer').withArgs(
                params1.collection,
                1,
                params1.tokenId,
                seller1.address,
                params1.price,
                royalty1,
                feeReceiver.address,
                params1.currency
            );

            expect(await erc721Marketplace.offerNumber()).to.equal(1);

            const offer1 = await erc721Marketplace.getOffer(1);
            expect(offer1.collection).to.equal(params1.collection);
            expect(offer1.tokenId).to.equal(params1.tokenId);
            expect(offer1.price).to.equal(params1.price);
            expect(offer1.royalty).to.equal(royalty1);
            expect(offer1.currency).to.equal(params1.currency);
            expect(offer1.state).to.equal(OfferState.Selling);
            expect(offer1.seller).to.equal(seller1.address);
            expect(offer1.royaltyReceiver).to.equal(feeReceiver.address);

            // Tx2: OtherCollection, exclusive currency
            const params2: ListParams = {
                collection: otherCollection.address,
                tokenId: BigNumber.from(2),
                price: BigNumber.from(500000),
                currency: currency.address,
            };

            const royalty2 = (await otherCollection.royaltyInfo(params2.tokenId, params2.price))[1];

            const tx2 = await getListTx(erc721Marketplace, seller2, params2);
            await tx2.wait();

            expect(tx2).to.emit(erc721Marketplace, 'NewOffer').withArgs(
                params2.collection,
                2,
                params2.tokenId,
                seller2.address,
                params2.price,
                royalty2,
                royaltyReceiver.address,
                params2.currency
            );

            expect(await erc721Marketplace.offerNumber()).to.equal(2);

            const offer2 = await erc721Marketplace.getOffer(2);
            expect(offer2.collection).to.equal(params2.collection);
            expect(offer2.tokenId).to.equal(params2.tokenId);
            expect(offer2.price).to.equal(params2.price);
            expect(offer2.royalty).to.equal(royalty2);
            expect(offer2.currency).to.equal(params2.currency);
            expect(offer2.state).to.equal(OfferState.Selling);
            expect(offer2.seller).to.equal(seller2.address);
            expect(offer2.royaltyReceiver).to.equal(royaltyReceiver.address);

            // Tx3: FeeReceiverCollection, exclusive currency
            const params3: ListParams = {
                collection: feeReceiverCollection.address,
                tokenId: BigNumber.from(1),
                price: BigNumber.from(200000),
                currency: currency.address,
            };

            let royalty3 = (await feeReceiverCollection.royaltyInfo(params3.tokenId, params3.price))[1];
            royalty3 = await applyDiscount(admin, royalty3, currency);
            
            const tx3 = await getListTx(
                erc721Marketplace,
                seller1,
                params3
            );
            await tx3.wait();

            expect(tx3).to.emit(erc721Marketplace, 'NewOffer').withArgs(
                params3.collection,
                1,
                params3.tokenId,
                seller1.address,
                params3.price,
                royalty3,
                feeReceiver.address,
                params3.currency
            );

            expect(await erc721Marketplace.offerNumber()).to.equal(3);

            const offer3 = await erc721Marketplace.getOffer(3);
            expect(offer3.collection).to.equal(params3.collection);
            expect(offer3.tokenId).to.equal(params3.tokenId);
            expect(offer3.price).to.equal(params3.price);
            expect(offer3.royalty).to.equal(royalty3);
            expect(offer3.currency).to.equal(params3.currency);
            expect(offer3.state).to.equal(OfferState.Selling);
            expect(offer3.seller).to.equal(seller1.address);
            expect(offer3.royaltyReceiver).to.equal(feeReceiver.address);
        });

        it('6.1.3.1. List token successfully when collection does not support ERC2981', async () => {
            const fixture = await beforeERC721MarketplaceTest({
                listSampleCurrencies: true,
                listSampleCollectionTokens: true,
            });
            const { deployer, erc721Marketplace, seller1, admin, admins } = fixture;

            const CollectionFactory = await ethers.getContractFactory("Collection");
            const collection = await upgrades.deployProxy(CollectionFactory, ["TestCollection", "TC"]);

            await callTransaction(collection.mint(seller1.address, 1));
            await callTransaction(collection.connect(seller1).setApprovalForAll(
                erc721Marketplace.address,
                true
            ));

            await callERC721Marketplace_RegisterCollections(
                erc721Marketplace,
                deployer,
                admins,
                admin,
                {
                    collections: [collection.address],
                    isCollection: true,
                },
            );
            
            const params: ListParams = {
                collection: collection.address,
                tokenId: BigNumber.from(1),
                price: BigNumber.from(200000),
                currency: ethers.constants.AddressZero,
            };

            const tx = await getListTx(
                erc721Marketplace,
                seller1,
                params
            );
            await tx.wait();

            expect(tx).to.emit(erc721Marketplace, 'NewOffer').withArgs(
                params.collection,
                1,
                params.tokenId,
                seller1.address,
                params.price,
                ethers.BigNumber.from(0),
                ethers.constants.AddressZero,
                params.currency
            );

            expect(await erc721Marketplace.offerNumber()).to.equal(1);

            const offer = await erc721Marketplace.getOffer(1);
            expect(offer.collection).to.equal(params.collection);
            expect(offer.tokenId).to.equal(params.tokenId);
            expect(offer.price).to.equal(params.price);
            expect(offer.royalty).to.equal(ethers.BigNumber.from(0));
            expect(offer.currency).to.equal(params.currency);
            expect(offer.state).to.equal(OfferState.Selling);
            expect(offer.seller).to.equal(seller1.address);
            expect(offer.royaltyReceiver).to.equal(ethers.constants.AddressZero);
        });

        it('6.1.3.2. List token unsuccessfully when paused', async () => {
            const fixture = await beforeERC721MarketplaceTest({
                listSampleCurrencies: true,
                listSampleCollectionTokens: true,
                pause: true,
            });
            const { erc721Marketplace, seller1, feeReceiverCollection } = fixture;

            await expect(erc721Marketplace.connect(seller1).list(feeReceiverCollection.address, 1, 200000, ethers.constants.AddressZero))
                .to.be.revertedWith('Pausable: paused');
        });

        it('6.1.3.3. List token unsuccessfully with unregistered collection', async () => {
            const fixture = await beforeERC721MarketplaceTest({
                listSampleCurrencies: true,
                listSampleCollectionTokens: true,
                skipRegisterCollection: true,
            });
            const { erc721Marketplace, seller1 } = fixture;

            const invalidCollection = randomWallet();
            await expect(erc721Marketplace.connect(seller1).list(invalidCollection.address, 1, 200000, ethers.constants.AddressZero))
                .to.be.revertedWithCustomError(erc721Marketplace, 'InvalidCollection');
        });

        it('6.1.3.4. List token unsuccessfully with invalid token id', async () => {
            const fixture = await beforeERC721MarketplaceTest({
                listSampleCurrencies: true,
                listSampleCollectionTokens: true,
            });
            const { erc721Marketplace, seller1, feeReceiverCollection } = fixture;

            await expect(erc721Marketplace.connect(seller1).list(feeReceiverCollection.address, 0, 200000, ethers.constants.AddressZero))
                .to.be.revertedWith('ERC721: invalid token ID');

            await expect(erc721Marketplace.connect(seller1).list(feeReceiverCollection.address, 3, 200000, ethers.constants.AddressZero))
                .to.be.revertedWith('ERC721: invalid token ID');
        });

        it('6.1.3.5. List token unsuccessfully by non token owner', async () => {
            const fixture = await beforeERC721MarketplaceTest({
                listSampleCurrencies: true,
                listSampleCollectionTokens: true,
            });
            const { erc721Marketplace, seller2, feeReceiverCollection } = fixture;

            await expect(erc721Marketplace.connect(seller2).list(feeReceiverCollection.address, 1, 200000, ethers.constants.AddressZero))
                .to.be.revertedWithCustomError(erc721Marketplace, 'InvalidTokenId');
        });

        it('6.1.3.6. List token unsuccessfully with zero price', async () => {
            const fixture = await beforeERC721MarketplaceTest({
                listSampleCurrencies: true,
                listSampleCollectionTokens: true,
            });
            const { erc721Marketplace, seller1, feeReceiverCollection } = fixture;

            await expect(erc721Marketplace.connect(seller1).list(feeReceiverCollection.address, 1, 0, ethers.constants.AddressZero))
                .to.be.revertedWithCustomError(erc721Marketplace, 'InvalidPrice');
        });

        it('6.1.3.7. List token unsuccessfully with invalid currency', async () => {
            const fixture = await beforeERC721MarketplaceTest({
                listSampleCollectionTokens: true,
            });
            const { erc721Marketplace, seller1, feeReceiverCollection } = fixture;

            await expect(erc721Marketplace.connect(seller1).list(feeReceiverCollection.address, 1, 200000, ethers.constants.AddressZero))
                .to.be.revertedWithCustomError(erc721Marketplace, 'InvalidCurrency');
        });
    });

    async function testBuyOffer(
        fixture: ERC721MarketplaceFixture,
        collectionSupportsERC2981: boolean,
        isERC20: boolean,
        isExclusive: boolean,
        exclusiveRate: BigNumber,
        price: BigNumber,
        optionalParams: {
            royaltyReceiver?: Wallet | Contract,
            royaltyRate?: BigNumber,    
        },
        isSafeBuy: boolean,
    ) {
        const { deployer, erc721Marketplace, seller1, buyer1, feeReceiver, admins, admin } = fixture;

        let collection;
        if (collectionSupportsERC2981) {
            const SmockCollectionFactory = await smock.mock<RoyaltyCollection__factory>("RoyaltyCollection");
            collection = await SmockCollectionFactory.deploy();
            await collection.initialize(
                admin.address,
                optionalParams.royaltyReceiver!.address,
                optionalParams.royaltyRate!,       
                'TestCollection',
                'TC',
            );
        } else {
            const CollectionFactory = await ethers.getContractFactory("Collection");
            collection = await upgrades.deployProxy(CollectionFactory, ["TestCollection", "TC"]);
        }

        await callERC721Marketplace_RegisterCollections(
            erc721Marketplace,
            deployer,
            admins,
            admin,
            {
                collections: [collection.address],
                isCollection: true,
            },
        );

        const currentTokenId = (await collection.tokenNumber()).add(1);
        const currentOfferId = (await erc721Marketplace.offerNumber()).add(1);

        let newCurrency: Currency | null = null;
        let newCurrencyAddress: string;
        if (isERC20) {
            newCurrency = await deployCurrency(
                deployer.address,
                `NewMockCurrency_${currentOfferId}`,
                `NMC_${currentOfferId}`
            ) as Currency;
            newCurrencyAddress = newCurrency.address;

            await callTransaction(newCurrency.setExclusiveDiscount(exclusiveRate, Constant.COMMON_RATE_DECIMALS));
        } else {
            newCurrencyAddress = ethers.constants.AddressZero;
        }

        await callTransaction(getUpdateCurrencyRegistriesTxByInput(
            admin,
            deployer,
            {
                currencies: [newCurrencyAddress],
                isAvailable: [true],
                isExclusive: [isExclusive],
            },
            admins
        ));

        const seller = seller1;
        const buyer = buyer1;

        await callTransaction(collection.mint(seller.address, currentTokenId));
        await callTransaction(collection.connect(seller).setApprovalForAll(erc721Marketplace.address, true));

        await callTransaction(erc721Marketplace.connect(seller).list(
            collection.address,
            currentTokenId,
            price,
            newCurrencyAddress,
        ));

        let royaltyReceiverAddress = ethers.constants.AddressZero;
        let royaltyAmount = ethers.BigNumber.from(0);
        if (collectionSupportsERC2981) {
            [royaltyReceiverAddress, royaltyAmount] = await collection.royaltyInfo(currentTokenId, price);
            if (royaltyReceiverAddress == feeReceiver.address && isExclusive) {
                royaltyAmount = remain(royaltyAmount, exclusiveRate);
            }
        }
        let total = price.add(royaltyAmount);

        let ethValue = ethers.BigNumber.from(0);
        await prepareNativeToken(ethers.provider, deployer, [buyer], ethers.utils.parseEther("1.0"));
        if (isERC20) {
            await prepareERC20(newCurrency!, [buyer], [erc721Marketplace], total);
        } else {
            ethValue = total;
            await prepareNativeToken(ethers.provider, deployer, [buyer], total);
        }

        await callTransaction(collection.connect(seller).setApprovalForAll(erc721Marketplace.address, true));

        let initBuyerBalance = await getBalance(ethers.provider, buyer.address, newCurrency);
        let initSellerBalance = await getBalance(ethers.provider, seller.address, newCurrency);
        let initRoyaltyReceiverBalance;
        if (collectionSupportsERC2981) {
            initRoyaltyReceiverBalance = await getBalance(ethers.provider, royaltyReceiverAddress, newCurrency);
        }

        const buyParams: BuyParams = {
            offerId: currentOfferId,
        };

        let tx;
        if (isSafeBuy) {
            const safeBuyParams: SafeBuyParams = {
                ...buyParams,
                anchor: await getSafeBuyAnchor(erc721Marketplace, buyParams),
            };
            tx = await getSafeBuyTx(erc721Marketplace, buyer, safeBuyParams, { value: ethValue });
        } else {
            tx = await getBuyTx(erc721Marketplace, buyer, buyParams, { value: ethValue });
        }
        const receipt = await tx.wait();

        let expectedBuyerBalance = initBuyerBalance.sub(total);
        let expectedSellerBalance = initSellerBalance.add(price);
        let expectedRoyaltyReceiverBalance = ethers.BigNumber.from(0);
        if (collectionSupportsERC2981) {
            expectedRoyaltyReceiverBalance = initRoyaltyReceiverBalance.add(royaltyAmount);
        }

        if (!isERC20) {
            const gasFee = receipt.gasUsed.mul(receipt.effectiveGasPrice);
            expectedBuyerBalance = expectedBuyerBalance.sub(gasFee);
        }

        await expect(tx).to
            .emit(erc721Marketplace, 'OfferSale')
            .withArgs(currentOfferId, buyer.address, royaltyReceiverAddress, royaltyAmount);

        let offer = await erc721Marketplace.getOffer(currentOfferId);
        expect(offer.tokenId).to.equal(currentTokenId);
        expect(offer.price).to.equal(price);
        expect(offer.currency).to.equal(newCurrencyAddress);
        expect(offer.state).to.equal(OfferState.Sold);
        expect(offer.seller).to.equal(seller.address);

        expect(await getBalance(ethers.provider, buyer.address, newCurrency)).to.equal(expectedBuyerBalance);
        expect(await getBalance(ethers.provider, seller.address, newCurrency)).to.equal(expectedSellerBalance);
        if (collectionSupportsERC2981) {
            expect(await getBalance(ethers.provider, royaltyReceiverAddress, newCurrency)).to.equal(expectedRoyaltyReceiverBalance);
        }

        expect(await collection.ownerOf(currentTokenId)).to.equal(buyer.address);

        let walletsToReset = [seller, buyer];
        if (collectionSupportsERC2981) {
            walletsToReset.push(optionalParams.royaltyReceiver!);
        }
        if (isERC20) {
            await resetERC20(newCurrency!, walletsToReset);
        } else {
            await resetNativeToken(ethers.provider, walletsToReset);
            await prepareNativeToken(ethers.provider, deployer, [seller, buyer], ethers.utils.parseEther("1.0"));
        }
    }

    describe('6.1.4. buy(uint256)', async () => {
        it('6.1.4.1. Buy token successfully (automatic test)', async () => {
            const fixture = await beforeERC721MarketplaceTest({
                listSampleCurrencies: true,
                listSampleCollectionTokens: true,
            });
            const { feeReceiverCollection, feeReceiver, royaltyReceiver, otherCollection } = fixture;
    
            await testBuyOffer(
                fixture,
                true,
                false,
                false,
                ethers.utils.parseEther("0.3"),
                ethers.BigNumber.from(200000),
                {
                    royaltyReceiver: feeReceiver,
                    royaltyRate: ethers.utils.parseEther("0.1"),
                },
                false,
            );

            await testBuyOffer(
                fixture,
                true,
                true,
                true,
                ethers.utils.parseEther("0.3"),
                ethers.BigNumber.from(500000),
                {
                    royaltyReceiver: royaltyReceiver,
                    royaltyRate: ethers.utils.parseEther("0.2"),
                },
                false,
            );
        });

        it('6.1.4.2. Buy token successfully in all native/erc20 and exclusive/non-exclusive combinations', async () => {
            const fixture = await beforeERC721MarketplaceTest({
                listSampleCurrencies: true,
                listSampleCollectionTokens: true,
            });
            const { feeReceiver, royaltyReceiver, otherCollection } = fixture;

            for (const isERC20 of [false, true]) {
                for (const isExclusive of [false, true]) {
                    if (!isERC20 && isExclusive) {
                        continue;
                    }
                    await testBuyOffer(
                        fixture,
                        true,
                        isERC20,
                        isExclusive,
                        ethers.utils.parseEther("0.3"),
                        ethers.BigNumber.from(200000),
                        {
                            royaltyReceiver: feeReceiver,
                            royaltyRate: ethers.utils.parseEther("0.1"),
                        },
                        false,
                    )
                    await testBuyOffer(
                        fixture,
                        true,
                        isERC20,
                        isExclusive,
                        ethers.utils.parseEther("0.3"),
                        ethers.BigNumber.from(200000),
                        {
                            royaltyReceiver: royaltyReceiver,
                            royaltyRate: ethers.utils.parseEther("0.2"),
                        },
                        false,
                    )
                }
            }
        });

        it('6.1.4.3. Buy token successfully with very large amount', async () => {
            const fixture = await beforeERC721MarketplaceTest({
                listSampleCurrencies: true,
                listSampleCollectionTokens: true,
            });
            
            const { feeReceiverCollection, feeReceiver, royaltyReceiver, otherCollection } = fixture;

            for (const isERC20 of [false, true]) {
                for (const isExclusive of [false, true]) {
                    if (!isERC20 && isExclusive) {
                        continue;
                    }
                    const price = ethers.BigNumber.from(2).pow(255);
                    await testBuyOffer(
                        fixture,
                        true,
                        isERC20,
                        isExclusive,
                        ethers.utils.parseEther("0.3"),
                        ethers.BigNumber.from(200000),
                        {
                            royaltyReceiver: feeReceiver,
                            royaltyRate: ethers.utils.parseEther("0.1"),
                        },
                        false,
                    )

                    await testBuyOffer(
                        fixture,
                        true,
                        isERC20,
                        isExclusive,
                        ethers.utils.parseEther("0.3"),
                        ethers.BigNumber.from(200000),
                        {
                            royaltyReceiver: royaltyReceiver,
                            royaltyRate: ethers.utils.parseEther("0.2"),
                        },
                        false,
                    )
                }
            }            
        });

        it('6.1.4.4. Buy token unsuccessfully when paused', async () => {
            const fixture = await beforeERC721MarketplaceTest({
                listSampleCurrencies: true,
                listSampleCollectionTokens: true,
                listSampleOffers: true,
                pause: true,
            });
            const { erc721Marketplace, buyer1 } = fixture;

            await expect(getBuyTx(
                erc721Marketplace,
                buyer1,
                {
                    offerId: BigNumber.from(1)
                },
                { value: 1e9 }
            )).to.be.revertedWith("Pausable: paused");
        });

        it('6.1.4.5. Buy token unsuccessfully with invalid offer id', async () => {
            const fixture = await beforeERC721MarketplaceTest({
                listSampleCurrencies: true,
                listSampleCollectionTokens: true,
                listSampleOffers: true,
            });
            const { erc721Marketplace, buyer1 } = fixture;

            await expect(getBuyTx(
                erc721Marketplace,
                buyer1,
                {
                    offerId: BigNumber.from(0)
                },
                { value: 1e9 }
            )).to.be.revertedWithCustomError(erc721Marketplace, "InvalidOfferId");

            await expect(getBuyTx(
                erc721Marketplace,
                buyer1,
                {
                    offerId: BigNumber.from(3)
                },
                { value: 1e9 }
            )).to.be.revertedWithCustomError(erc721Marketplace, "InvalidOfferId");
        });

        it('6.1.4.5. Buy token unsuccessfully when collection is deregistered', async () => {
            const fixture = await beforeERC721MarketplaceTest({
                listSampleCurrencies: true,
                listSampleCollectionTokens: true,
                listSampleOffers: true,
            });
            const { deployer, erc721Marketplace, buyer1, admins, admin, feeReceiverCollection } = fixture;

            await callERC721Marketplace_RegisterCollections(
                erc721Marketplace,
                deployer,
                admins,
                admin,
                {
                    collections: [feeReceiverCollection.address],
                    isCollection: false,
                },
            )

            await expect(erc721Marketplace.connect(buyer1).buy(1, { value: 1e9 }))
                .to.be.revertedWithCustomError(erc721Marketplace, "InvalidCollection");
        });

        it('6.1.4.6. Buy token unsuccessfully when seller buy their own token', async () => {
            const fixture = await beforeERC721MarketplaceTest({
                listSampleCurrencies: true,
                listSampleCollectionTokens: true,
                listSampleOffers: true,
            });
            const { erc721Marketplace, seller1, seller2 } = fixture;

            await expect(erc721Marketplace.connect(seller1).buy(1, { value: 1e9 }))
                .to.be.revertedWithCustomError(erc721Marketplace, "InvalidBuying");

            await expect(erc721Marketplace.connect(seller2).buy(2))
                .to.be.revertedWithCustomError(erc721Marketplace, "InvalidBuying");
        });

        it('6.1.4.7. Buy token unsuccessfully when offer is not selling', async () => {
            const fixture = await beforeERC721MarketplaceTest({
                listSampleCurrencies: true,
                listSampleCollectionTokens: true,
                listSampleOffers: true,
            });
            const { erc721Marketplace, buyer1, buyer2 } = fixture;

            await callTransaction(erc721Marketplace.connect(buyer1).buy(1, { value: 1e9 }));

            await expect(erc721Marketplace.connect(buyer2).buy(1, { value: 1e9 }))
                .to.be.revertedWithCustomError(erc721Marketplace, "InvalidBuying");
        });

        it('6.1.4.8. Buy token successfully when collection does not support ERC2981 interface', async () => {
            const fixture = await beforeERC721MarketplaceTest({
                listSampleCurrencies: true,
            });
            const { feeReceiver } = fixture;

            await testBuyOffer(
                fixture,
                false,
                false,
                false,
                ethers.utils.parseEther("0.3"),
                ethers.BigNumber.from(200000),
                {
                    royaltyReceiver: feeReceiver,
                    royaltyRate: ethers.utils.parseEther("0.1"),
                },
                false,
            );
        });

        it('6.1.4.9. Buy token unsuccessfully with insufficient native token', async () => {
            const fixture = await beforeERC721MarketplaceTest({
                listSampleCurrencies: true,
                listSampleCollectionTokens: true,
                listSampleOffers: true,
            });
            const { erc721Marketplace, buyer1 } = fixture;

            await expect(erc721Marketplace.connect(buyer1).buy(1))
                .to.be.revertedWithCustomError(erc721Marketplace, "InsufficientValue");
        });

        it('6.1.4.10. Buy token unsuccessfully when native token transfer to seller failed', async () => {
            const fixture = await beforeERC721MarketplaceTest({
                listSampleCurrencies: true,
                listSampleCollectionTokens: true,
            });
            const { erc721Marketplace, seller1, buyer1, deployer, feeReceiverCollection } = fixture;
            
            const failReceiver = await deployFailReceiver(deployer, true, false);

            await callTransaction(feeReceiverCollection.connect(seller1).transferFrom(
                seller1.address,
                failReceiver.address,
                1,
            ));

            await callTransaction(failReceiver.call(
                feeReceiverCollection.address,
                feeReceiverCollection.interface.encodeFunctionData("setApprovalForAll", [
                    erc721Marketplace.address,
                    true
                ])
            ));

            await callTransaction(getCallListTx(erc721Marketplace, failReceiver as ProxyCaller, {
                collection: feeReceiverCollection.address,
                tokenId: BigNumber.from(1),
                price: BigNumber.from(200000),
                currency: ethers.constants.AddressZero
            }));

            await expect(erc721Marketplace.connect(buyer1).buy(1, { value: 1e9 }))
                .to.be.revertedWithCustomError(erc721Marketplace, "FailedTransfer");
        });

        it('6.1.4.11. Buy token unsuccessfully when native token transfer to royalty receiver failed', async () => {
            const fixture = await beforeERC721MarketplaceTest({
                listSampleCurrencies: true,
                listSampleCollectionTokens: true,
                listSampleOffers: true,
                fundERC20ForBuyers: true,
                useFailRoyaltyReceiver: true,
            });
            const { erc721Marketplace, buyer1, failReceiver } = fixture;

            await callTransaction(failReceiver.activate(true));

            await expect(erc721Marketplace.connect(buyer1).buy(1, { value: 1e9 }))
                .to.be.revertedWithCustomError(erc721Marketplace, "FailedTransfer");
        });

        it('6.1.4.12. Buy token unsuccessfully when refund to sender failed', async () => {
            const fixture = await beforeERC721MarketplaceTest({
                listSampleCurrencies: true,
                listSampleCollectionTokens: true,
                listSampleOffers: true,
                fundERC20ForBuyers: true,
            });

            const { erc721Marketplace, failReceiver } = fixture;
            
            let data = erc721Marketplace.interface.encodeFunctionData("buy", [1]);

            await callTransaction(failReceiver.activate(true));

            await expect(failReceiver.call(erc721Marketplace.address, data, { value: 1e9 }))
                .to.be.revertedWithCustomError(erc721Marketplace, "FailedRefund");
        });

        it('6.1.4.13. Buy token unsuccessfully when the contract is reentered', async () => {
            const fixture = await beforeERC721MarketplaceTest({
                listSampleCurrencies: true,
            });
            const { deployer, feeReceiverCollection, erc721Marketplace, buyer1 } = fixture;

            const reentrancy = await deployReentrancy(deployer);

            await callTransaction(feeReceiverCollection.mint(reentrancy.address, 1));

            await callTransaction(getCallListTx(erc721Marketplace, reentrancy as ProxyCaller, {
                collection: feeReceiverCollection.address,
                tokenId: BigNumber.from(1),
                price: BigNumber.from(200000),
                currency: ethers.constants.AddressZero
            }));
            
            await callTransaction(reentrancy.call(
                feeReceiverCollection.address,
                feeReceiverCollection.interface.encodeFunctionData("setApprovalForAll", [
                    erc721Marketplace.address,
                    true
                ])
            ));

            await testReentrancy_ERC721Marketplace(
                erc721Marketplace,
                reentrancy,
                async () => {
                    await expect(erc721Marketplace.connect(buyer1).buy(1, { value: 1e9 })).to.be.revertedWithCustomError(erc721Marketplace, "FailedTransfer");
                }
            );
        });
    });

    describe('6.1.5. safeBuy(uint256, uint256)', async () => {
        it('6.1.5.1. Buy token successfully in both native and ERC20', async () => {
            const fixture = await beforeERC721MarketplaceTest({
                listSampleCurrencies: true,
                listSampleCollectionTokens: true,
            });
            const { feeReceiver, royaltyReceiver } = fixture;
    
            await testBuyOffer(
                fixture,
                true,
                false,
                false,
                ethers.utils.parseEther("0.3"),
                ethers.BigNumber.from(200000),
                {
                    royaltyReceiver: feeReceiver,
                    royaltyRate: ethers.utils.parseEther("0.1"),
                },
                true,
            );

            await testBuyOffer(
                fixture,
                true,
                true,
                true,
                ethers.utils.parseEther("0.3"),
                ethers.BigNumber.from(500000),
                {
                    royaltyReceiver: royaltyReceiver,
                    royaltyRate: ethers.utils.parseEther("0.2"),
                },
                true,
            );
        });

        it('6.1.5.2. Buy token unsuccessfully with invalid offer id', async () => {
            const fixture = await beforeERC721MarketplaceTest({
                listSampleCurrencies: true,
                listSampleCollectionTokens: true,
                listSampleOffers: true,
            });
            const { erc721Marketplace, buyer1 } = fixture;

            await expect(getSafeBuyTx(
                erc721Marketplace,
                buyer1,
                {
                    offerId: BigNumber.from(0),
                    anchor: BigNumber.from(0)
                },
                { value: 1e9 }
            )).to.be.revertedWithCustomError(erc721Marketplace, "InvalidOfferId");

            await expect(getSafeBuyTx(
                erc721Marketplace,
                buyer1,
                {
                    offerId: BigNumber.from(3),
                    anchor: BigNumber.from(0)
                },
                { value: 1e9 }
            )).to.be.revertedWithCustomError(erc721Marketplace, "InvalidOfferId");
        });

        it('6.1.5.3. Buy token unsuccessfully with invalid anchor', async () => {
            const fixture = await beforeERC721MarketplaceTest({
                listSampleCurrencies: true,
                listSampleCollectionTokens: true,
                listSampleOffers: true,
            });
            const { erc721Marketplace, buyer1, buyer2 } = fixture;

            await expect(getSafeBuyTx(
                erc721Marketplace,
                buyer1,
                {
                    offerId: BigNumber.from(1),
                    anchor: BigNumber.from(0)
                },
                { value: 1e9 }
            )).to.be.revertedWithCustomError(erc721Marketplace, "BadAnchor");

            await expect(getSafeBuyTx(
                erc721Marketplace,
                buyer2,
                {
                    offerId: BigNumber.from(2),
                    anchor: BigNumber.from(0)
                },
                { value: 1e9 }
            )).to.be.revertedWithCustomError(erc721Marketplace, "BadAnchor");
        });
    });

    describe('6.1.6. cancelOffer(uint256)', async () => {
        it('6.1.6.1. Cancel offer successfully by seller', async () => {
            const fixture = await beforeERC721MarketplaceTest({
                listSampleCurrencies: true,
                listSampleCollectionTokens: true,
                listSampleOffers: true,
                fundERC20ForBuyers: true,
            });
            const { erc721Marketplace, seller1 } = fixture;

            let tx = await erc721Marketplace.connect(seller1).cancel(1);
            await tx.wait();

            const offer = await erc721Marketplace.getOffer(1);
            expect(offer.state).to.equal(OfferState.Cancelled);

            await expect(tx).to
                .emit(erc721Marketplace, "OfferCancellation")
                .withArgs(1);
        });

        it('6.1.6.2. Cancel offer successfully by manager', async () => {
            const fixture = await beforeERC721MarketplaceTest({
                listSampleCurrencies: true,
                listSampleCollectionTokens: true,
                listSampleOffers: true,
                fundERC20ForBuyers: true,
            });
            const { erc721Marketplace, manager } = fixture;
            let tx = await erc721Marketplace.connect(manager).cancel(1);
            await tx.wait();

            const offer = await erc721Marketplace.getOffer(1);
            expect(offer.state).to.equal(OfferState.Cancelled);

            await expect(tx).to
                .emit(erc721Marketplace, "OfferCancellation")
                .withArgs(1);
        });

        it('6.1.6.3. Cancel offer unsuccessfully with invalid offer id', async () => {
            const fixture = await beforeERC721MarketplaceTest({
                listSampleCurrencies: true,
                listSampleCollectionTokens: true,
                listSampleOffers: true,
                fundERC20ForBuyers: true,
            });
            const { erc721Marketplace, manager } = fixture;

            await expect(erc721Marketplace.connect(manager).cancel(0))
                .to.be.revertedWithCustomError(erc721Marketplace, "InvalidOfferId");
            await expect(erc721Marketplace.connect(manager).cancel(3))
                .to.be.revertedWithCustomError(erc721Marketplace, "InvalidOfferId");
        });

        it('6.1.6.4. Cancel offer unsuccessfully by unauthorized user', async () => {
            const fixture = await beforeERC721MarketplaceTest({
                listSampleCurrencies: true,
                listSampleCollectionTokens: true,
                listSampleOffers: true,
                fundERC20ForBuyers: true,
            });
            const { erc721Marketplace, seller2, moderator } = fixture;

            await expect(erc721Marketplace.connect(seller2).cancel(1))
                .to.be.revertedWithCustomError(erc721Marketplace, "Unauthorized");

            await expect(erc721Marketplace.connect(moderator).cancel(1))
                .to.be.revertedWithCustomError(erc721Marketplace, "Unauthorized");
        });

        it('6.1.6.5. Cancel offer unsuccessfully when offer is already cancelled', async () => {
            const fixture = await beforeERC721MarketplaceTest({
                listSampleCurrencies: true,
                listSampleCollectionTokens: true,
                listSampleOffers: true,
                fundERC20ForBuyers: true,
            });
            const { erc721Marketplace, manager } = fixture;

            await callTransaction(erc721Marketplace.connect(manager).cancel(1));
            await expect(erc721Marketplace.connect(manager).cancel(1))
                .to.be.revertedWithCustomError(erc721Marketplace, "InvalidCancelling");
        });

        it('6.1.6.6. Cancel offer unsuccessfully when offer is sold out', async () => {
            const fixture = await beforeERC721MarketplaceTest({
                listSampleCurrencies: true,
                listSampleCollectionTokens: true,
                listSampleOffers: true,
                fundERC20ForBuyers: true,
            });
            const { erc721Marketplace, manager, buyer1 } = fixture;

            const params: BuyParams = {
                offerId: BigNumber.from(1),
            };
            const safeParams: SafeBuyParams = {
                ...params,
                anchor: await getSafeBuyAnchor(erc721Marketplace, params),
            };
            await callTransaction(erc721Marketplace.connect(buyer1).safeBuy(1, 1, { value: 1e9 }));

            await expect(erc721Marketplace.connect(manager).cancel(1))
                .to.be.revertedWithCustomError(erc721Marketplace, "InvalidCancelling");
        });
    });
});
