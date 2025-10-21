import { expect } from 'chai';
import { randomInt } from 'crypto';
import { BigNumber, Contract, Wallet } from 'ethers';
import { ethers } from 'hardhat';

// @defi-wonderland/smock
import { MockContract, smock } from '@defi-wonderland/smock';

// @nomicfoundation/hardhat-network-helpers
import { loadFixture, time } from '@nomicfoundation/hardhat-network-helpers';

// @typechain-types
import {
    Admin,
    Currency,
    FeeReceiver,
    MockEstateToken,
    ProjectMarketplace,
    MockEstateToken__factory,
    PriceWatcher,
    ReserveVault,
    MockPrestigePad,
    MockProjectToken,
    MockProjectToken__factory,
    ProxyCaller,
    FailReceiver,
} from '@typechain-types';

// @tests
import { Constant } from '@tests/test.constant';

// @tests/land
import { Initialization as LandInitialization } from '@tests/land/test.initialization';

// @tests/launch
import { Initialization as LaunchInitialization } from '@tests/launch/test.initialization';

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
import { applyDiscount } from '@utils/formula';
import { MockValidator } from '@utils/mockValidator';
import { randomArrayWithSum, randomBigNumber } from '@utils/utils';

// @utils/deployments/common
import { deployAdmin } from '@utils/deployments/common/admin';
import { deployCurrency } from '@utils/deployments/common/currency';
import { deployFeeReceiver } from '@utils/deployments/common/feeReceiver';
import { deployPriceWatcher } from '@utils/deployments/common/priceWatcher';
import { deployReserveVault } from '@utils/deployments/common/reserveVault';

// @utils/deployments/mock
import { deployFailReceiver } from '@utils/deployments/mock/utilities/failReceiver';
import { deployMockPrestigePad } from '@utils/deployments/mock/launch/mockPrestigePad';
import { deployReentrancyReceiver } from '@utils/deployments/mock/reentrancy/reentrancyReceiver';

// @utils/deployments/lux
import { deployProjectMarketplace } from '@utils/deployments/lux/projectMarketplace';

// @utils/models/lux
import { BuyParams, BuyPartParams, ListParams } from '@utils/models/lux/assetMarketplace';
import { OfferState } from '@utils/models/lux/offerState';

// @utils/transaction/common
import {
    getAdminTxByInput_ActivateIn,
    getAdminTxByInput_AuthorizeManagers,
    getAdminTxByInput_AuthorizeModerators,
    getAdminTxByInput_DeclareZone,
    getAdminTxByInput_UpdateCurrencyRegistries,
} from '@utils/transaction/common/admin';
import { getPausableTxByInput_Pause } from '@utils/transaction/common/pausable';

// @utils/transaction/land
import { getEstateTokenTxByInput_UpdateZoneRoyaltyRate } from '@utils/transaction/land/estateToken';
import {
    getProjectTokenTxByInput_AuthorizeLaunchpad,
    getCallProjectTokenTx_LaunchProject,
} from '@utils/transaction/launch/projectToken';

// @utils/transaction/lux
import {
    getAssetMarketplaceTx_BuyPart,
    getAssetMarketplaceTx_Buy,
    getCallAssetMarketplaceTx_List,
    getAssetMarketplaceTx_List,
    getAssetMarketplaceTx_SafeBuy,
    getAssetMarketplaceTxByParams_SafeBuy,
    getAssetMarketplaceTxByParams_SafeBuyPart,
    getAssetMarketplaceTx_Cancel, getAssetMarketplaceTx_SafeBuyPart,
} from '@utils/transaction/lux/assetMarketplace';

interface ProjectMarketplaceFixture {
    deployer: any;
    admins: any[];
    seller1: any;
    seller2: any;
    buyer1: any;
    buyer2: any;
    initiator1: any;
    initiator2: any;
    commissionReceiver: any;
    manager: any;
    moderator: any;
    validator: MockValidator;

    admin: Admin;
    currency: Currency;
    feeReceiver: FeeReceiver;
    priceWatcher: PriceWatcher;
    reserveVault: ReserveVault;
    estateToken: MockContract<MockEstateToken>;
    prestigePad: MockPrestigePad;
    projectToken: MockContract<MockProjectToken>;
    projectMarketplace: ProjectMarketplace;

    zone1: string;
    zone2: string;
    failReceiver: any;
}

async function testReentrancy_Marketplace(
    projectMarketplace: ProjectMarketplace,
    reentrancyContract: Contract,
    assertion: any
) {
    let data = [
        projectMarketplace.interface.encodeFunctionData('buy(uint256)', [0]),
        projectMarketplace.interface.encodeFunctionData('buy(uint256,uint256)', [0, 0]),
        projectMarketplace.interface.encodeFunctionData('safeBuy(uint256,bytes32)', [0, ethers.constants.HashZero]),
        projectMarketplace.interface.encodeFunctionData('safeBuy(uint256,uint256,bytes32)', [
            0,
            0,
            ethers.constants.HashZero,
        ]),
        projectMarketplace.interface.encodeFunctionData('cancel', [0]),
    ];

    await testReentrancy(reentrancyContract, projectMarketplace, data, assertion);
}

describe('6.4. ProjectMarketplace', async () => {
    afterEach(async () => {
        const fixture = await loadFixture(projectMarketplaceFixture);
        const { projectToken } = fixture;
        projectToken.isAvailable.reset();
    });

    async function projectMarketplaceFixture(): Promise<ProjectMarketplaceFixture> {
        const [
            deployer,
            admin1,
            admin2,
            admin3,
            admin4,
            admin5,
            seller1,
            seller2,
            buyer1,
            buyer2,
            commissionReceiver,
            manager,
            moderator,
            initiator1,
            initiator2,
        ] = await ethers.getSigners();
        const admins = [admin1, admin2, admin3, admin4, admin5];

        const validator = new MockValidator(deployer as any);

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

        const feeReceiver = (await deployFeeReceiver(deployer.address, admin.address)) as FeeReceiver;

        const priceWatcher = (await deployPriceWatcher(deployer.address, admin.address)) as PriceWatcher;

        const reserveVault = (await deployReserveVault(deployer.address, admin.address)) as ReserveVault;

        await callTransaction(
            currency.setExclusiveDiscount(ethers.utils.parseEther('0.3'), Constant.COMMON_RATE_DECIMALS)
        );

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

        const SmockProjectTokenFactory = await smock.mock<MockProjectToken__factory>('MockProjectToken');
        const projectToken = await SmockProjectTokenFactory.deploy();
        await callTransaction(
            projectToken.initialize(
                admin.address,
                estateToken.address,
                feeReceiver.address,
                validator.getAddress(),
                LaunchInitialization.PROJECT_TOKEN_BaseURI
            )
        );

        const prestigePad = (await deployMockPrestigePad(
            deployer.address,
            admin.address,
            projectToken.address,
            priceWatcher.address,
            feeReceiver.address,
            reserveVault.address,
            validator.getAddress(),
            LaunchInitialization.PRESTIGE_PAD_BaseMinUnitPrice,
            LaunchInitialization.PRESTIGE_PAD_BaseMaxUnitPrice
        )) as MockPrestigePad;

        const projectMarketplace = (await deployProjectMarketplace(
            deployer.address,
            admin.address,
            projectToken.address
        )) as ProjectMarketplace;

        const zone1 = ethers.utils.formatBytes32String('TestZone1');
        const zone2 = ethers.utils.formatBytes32String('TestZone2');

        const failReceiver = (await deployFailReceiver(deployer.address, false, false)) as FailReceiver;

        return {
            deployer,
            admins,
            seller1,
            seller2,
            buyer1,
            buyer2,
            initiator1,
            initiator2,
            commissionReceiver,
            manager,
            moderator,
            validator,
            admin,
            feeReceiver,
            currency,
            priceWatcher,
            reserveVault,
            estateToken,
            prestigePad,
            projectToken,
            projectMarketplace,
            zone1,
            zone2,
            failReceiver,
        };
    }

    async function beforeProjectMarketplaceTest({
        skipListSampleCurrencies = false,
        skipListSampleProjectToken = false,
        skipFundERC20ForBuyers = false,
        listSampleOffers = false,
        useFailRoyaltyReceiver = false,
        pause = false,
    } = {}): Promise<ProjectMarketplaceFixture> {
        const fixture = await loadFixture(projectMarketplaceFixture);

        const {
            deployer,
            admin,
            admins,
            currency,
            prestigePad,
            projectToken,
            projectMarketplace,
            seller1,
            seller2,
            buyer1,
            buyer2,
            manager,
            moderator,
            initiator1,
            initiator2,
            zone1,
            zone2,
            failReceiver,
        } = fixture;

        for (const zone of [zone1, zone2]) {
            await callTransaction(getAdminTxByInput_DeclareZone(admin, deployer, { zone }, admins));
        }

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

        if (useFailRoyaltyReceiver) {
            await callTransaction(projectToken.updateFeeReceiver(failReceiver.address));
        }

        if (!skipListSampleProjectToken) {
            currentTimestamp += 1000;

            await time.setNextBlockTimestamp(currentTimestamp);

            await callTransaction(
                getCallProjectTokenTx_LaunchProject(projectToken as any, prestigePad, {
                    zone: zone1,
                    launchId: BigNumber.from(10),
                    initiator: initiator1.address,
                    uri: 'Token1_URI',
                })
            );

            await callTransaction(
                getCallProjectTokenTx_LaunchProject(projectToken as any, prestigePad, {
                    zone: zone2,
                    launchId: BigNumber.from(20),
                    initiator: initiator2.address,
                    uri: 'Token2_URI',
                })
            );

            await callTransaction(projectToken.mintTo(seller1.address, 1, 200_000));
            await callTransaction(projectToken.mintTo(seller2.address, 1, 300_000));
            await callTransaction(projectToken.mintTo(seller1.address, 2, 200));
            await callTransaction(projectToken.mintTo(seller2.address, 2, 300));
        }

        if (!skipFundERC20ForBuyers) {
            await prepareERC20(currency, [buyer1, buyer2], [projectMarketplace], 1e9);
        }

        if (listSampleOffers) {
            const params1: ListParams = {
                tokenId: BigNumber.from(1),
                sellingAmount: BigNumber.from(150_000),
                unitPrice: ethers.utils.parseEther('100'),
                currency: ethers.constants.AddressZero,
                isDivisible: true,
            };
            await callTransaction(getAssetMarketplaceTx_List(projectMarketplace, seller1, params1));

            const params2: ListParams = {
                tokenId: BigNumber.from(2),
                sellingAmount: BigNumber.from(200),
                unitPrice: ethers.utils.parseEther('500000'),
                currency: currency.address,
                isDivisible: true,
            };
            await callTransaction(getAssetMarketplaceTx_List(projectMarketplace, seller2, params2));

            await callTransaction(projectToken.connect(seller1).setApprovalForAll(projectMarketplace.address, true));
            await callTransaction(projectToken.connect(seller2).setApprovalForAll(projectMarketplace.address, true));
        }

        if (pause) {
            await callTransaction(getPausableTxByInput_Pause(projectMarketplace, deployer, admin, admins));
        }

        return {
            ...fixture,
        };
    }

    /* --- Initialization --- */
    describe('6.4.1. initialize(address,address,address)', async () => {
        it('6.4.1.1. Deploy successfully', async () => {
            const { admin, projectToken, projectMarketplace } = await beforeProjectMarketplaceTest();

            const paused = await projectMarketplace.paused();
            expect(paused).to.equal(false);

            const adminAddress = await projectMarketplace.admin();
            expect(adminAddress).to.equal(admin.address);

            const projectTokenAddress = await projectMarketplace.collection();
            expect(projectTokenAddress).to.equal(projectToken.address);

            const offerNumber = await projectMarketplace.offerNumber();
            expect(offerNumber).to.equal(0);
        });
    });

    /* --- Query --- */
    describe('6.4.2. getOffer(uint256)', async () => {
        it('6.4.2.1. Return successfully with valid offer id', async () => {
            const { projectMarketplace } = await beforeProjectMarketplaceTest({
                listSampleOffers: true,
            });

            await expect(projectMarketplace.getOffer(1)).to.not.be.reverted;

            await expect(projectMarketplace.getOffer(2)).to.not.be.reverted;
        });

        it('6.4.2.2. Revert with invalid offer id', async () => {
            const { projectMarketplace } = await beforeProjectMarketplaceTest({
                listSampleOffers: true,
            });

            await expectRevertWithModifierCustomError(
                projectMarketplace,
                projectMarketplace.getOffer(0),
                'InvalidOfferId'
            );
            await expectRevertWithModifierCustomError(
                projectMarketplace,
                projectMarketplace.getOffer(3),
                'InvalidOfferId'
            );
        });
    });

    /* --- Command --- */
    describe('6.4.3. list(uint256,uint256,uint256,address,bool)', async () => {
        async function beforeListTest(fixture: ProjectMarketplaceFixture): Promise<{ defaultParams: ListParams }> {
            const defaultParams = {
                tokenId: BigNumber.from(1),
                sellingAmount: BigNumber.from(150_000),
                unitPrice: ethers.utils.parseEther('100'),
                currency: ethers.constants.AddressZero,
                isDivisible: false,
            };
            return { defaultParams };
        }

        it('6.4.3.1. List token successfully', async () => {
            const { projectMarketplace, projectToken, currency, seller1, seller2, feeReceiver } =
                await beforeProjectMarketplaceTest();

            const params1: ListParams = {
                tokenId: BigNumber.from(1),
                sellingAmount: BigNumber.from(150_000),
                unitPrice: ethers.utils.parseEther('100'),
                currency: ethers.constants.AddressZero,
                isDivisible: false,
            };
            const tx1 = await getAssetMarketplaceTx_List(projectMarketplace, seller1, params1);
            await tx1.wait();

            const royaltyDenomination1 = (await projectToken.royaltyInfo(params1.tokenId, params1.unitPrice))[1];

            expect(tx1)
                .to.emit(projectMarketplace, 'NewOffer')
                .withArgs(
                    1,
                    params1.tokenId,
                    seller1.address,
                    params1.sellingAmount,
                    params1.unitPrice,
                    params1.currency,
                    params1.isDivisible,
                    royaltyDenomination1,
                    feeReceiver.address
                );

            expect(await projectMarketplace.offerNumber()).to.equal(1);

            const offer1 = await projectMarketplace.getOffer(1);
            expect(offer1.tokenId).to.equal(params1.tokenId);
            expect(offer1.sellingAmount).to.equal(params1.sellingAmount);
            expect(offer1.soldAmount).to.equal(0);
            expect(offer1.unitPrice).to.equal(params1.unitPrice);
            expect(offer1.royaltyDenomination).to.equal(royaltyDenomination1);
            expect(offer1.currency).to.equal(params1.currency);
            expect(offer1.isDivisible).to.equal(params1.isDivisible);
            expect(offer1.state).to.equal(OfferState.Selling);
            expect(offer1.seller).to.equal(seller1.address);
            expect(offer1.royaltyReceiver).to.equal(feeReceiver.address);

            const params2: ListParams = {
                tokenId: BigNumber.from(2),
                sellingAmount: BigNumber.from(200),
                unitPrice: ethers.utils.parseEther('500000'),
                currency: currency.address,
                isDivisible: true,
            };

            const tx2 = await getAssetMarketplaceTx_List(projectMarketplace, seller2, params2);
            await tx2.wait();

            const royaltyDenomination2 = (await projectToken.royaltyInfo(params2.tokenId, params2.unitPrice))[1];

            expect(tx2)
                .to.emit(projectMarketplace, 'NewOffer')
                .withArgs(
                    2,
                    params2.tokenId,
                    seller2.address,
                    params2.sellingAmount,
                    params2.unitPrice,
                    params2.currency,
                    params2.isDivisible,
                    royaltyDenomination2,
                    feeReceiver.address
                );

            expect(await projectMarketplace.offerNumber()).to.equal(2);

            const offer2 = await projectMarketplace.getOffer(2);
            expect(offer2.tokenId).to.equal(params2.tokenId);
            expect(offer2.sellingAmount).to.equal(params2.sellingAmount);
            expect(offer2.soldAmount).to.equal(0);
            expect(offer2.unitPrice).to.equal(params2.unitPrice);
            expect(offer2.royaltyDenomination).to.equal(royaltyDenomination2);
            expect(offer2.currency).to.equal(params2.currency);
            expect(offer2.isDivisible).to.equal(params2.isDivisible);
            expect(offer2.state).to.equal(OfferState.Selling);
            expect(offer2.seller).to.equal(seller2.address);
            expect(offer2.royaltyReceiver).to.equal(feeReceiver.address);
        });

        it('6.4.3.2. List token unsuccessfully when paused', async () => {
            const fixture = await beforeProjectMarketplaceTest({
                pause: true,
            });
            const { projectMarketplace, seller1 } = fixture;

            const { defaultParams } = await beforeListTest(fixture);

            await expect(getAssetMarketplaceTx_List(projectMarketplace, seller1, defaultParams)).to.be.revertedWith(
                'Pausable: paused'
            );
        });

        it('6.4.3.3. List token unsuccessfully with invalid token id', async () => {
            const fixture = await beforeProjectMarketplaceTest();
            const { projectMarketplace, seller1 } = fixture;

            const { defaultParams } = await beforeListTest(fixture);

            await expect(
                getAssetMarketplaceTx_List(projectMarketplace, seller1, {
                    ...defaultParams,
                    tokenId: BigNumber.from(0),
                })
            ).to.be.revertedWithCustomError(projectMarketplace, 'InvalidTokenId');

            await expect(
                getAssetMarketplaceTx_List(projectMarketplace, seller1, {
                    ...defaultParams,
                    tokenId: BigNumber.from(3),
                })
            ).to.be.revertedWithCustomError(projectMarketplace, 'InvalidTokenId');
        });

        it('6.4.3.4. List token unsuccessfully when token is not available', async () => {
            const fixture = await beforeProjectMarketplaceTest();
            const { projectMarketplace, seller2, projectToken } = fixture;

            projectToken.isAvailable.whenCalledWith(1).returns(false);

            const { defaultParams } = await beforeListTest(fixture);

            await expect(
                getAssetMarketplaceTx_List(projectMarketplace, seller2, defaultParams)
            ).to.be.revertedWithCustomError(projectMarketplace, 'InvalidTokenId');
            ``;
        });

        it('6.4.3.5. List token unsuccessfully with zero unit price', async () => {
            const fixture = await beforeProjectMarketplaceTest();
            const { projectMarketplace, seller1 } = fixture;

            const { defaultParams } = await beforeListTest(fixture);

            await expect(
                getAssetMarketplaceTx_List(projectMarketplace, seller1, {
                    ...defaultParams,
                    unitPrice: BigNumber.from(0),
                })
            ).to.be.revertedWithCustomError(projectMarketplace, 'InvalidUnitPrice');
        });

        it('6.4.3.6. List token unsuccessfully with invalid currency', async () => {
            const fixture = await beforeProjectMarketplaceTest({
                skipListSampleCurrencies: true,
            });
            const { projectMarketplace, seller1 } = fixture;

            const { defaultParams } = await beforeListTest(fixture);

            await expect(
                getAssetMarketplaceTx_List(projectMarketplace, seller1, defaultParams)
            ).to.be.revertedWithCustomError(projectMarketplace, 'InvalidCurrency');
        });

        it('6.4.3.7. List token unsuccessfully with zero selling amount', async () => {
            const fixture = await beforeProjectMarketplaceTest();
            const { projectMarketplace, seller1 } = fixture;

            const { defaultParams } = await beforeListTest(fixture);

            const params: ListParams = {
                ...defaultParams,
                sellingAmount: BigNumber.from(0),
            };
            await expect(getAssetMarketplaceTx_List(projectMarketplace, seller1, params)).to.be.revertedWithCustomError(
                projectMarketplace,
                'InvalidSellingAmount'
            );
        });

        it('6.4.3.8. List token unsuccessfully with selling amount exceeding owned amount', async () => {
            const fixture = await beforeProjectMarketplaceTest();
            const { projectMarketplace, seller1 } = fixture;

            const { defaultParams } = await beforeListTest(fixture);

            await expect(
                getAssetMarketplaceTx_List(projectMarketplace, seller1, {
                    ...defaultParams,
                    sellingAmount: BigNumber.from(200_001),
                })
            ).to.be.revertedWithCustomError(projectMarketplace, 'InvalidSellingAmount');
        });
    });

    async function testBuyOffer(
        fixture: ProjectMarketplaceFixture,
        mockCurrencyExclusiveRate: BigNumber,
        projectTokenRoyaltyRate: BigNumber,
        isERC20: boolean,
        isExclusive: boolean,
        initialAmount: BigNumber,
        offerAmount: BigNumber,
        unitPrice: BigNumber,
        seller: Wallet,
        buyRecords: {
            buyer: Wallet;
            amount: BigNumber | null;
        }[],
        isDivisible: boolean,
        isSafeBuy: boolean
    ) {
        const {
            deployer,
            prestigePad,
            projectToken,
            projectMarketplace,
            feeReceiver,
            admins,
            admin,
            initiator1,
            zone1,
        } = fixture;
        const decimals = Constant.PROJECT_TOKEN_MAX_DECIMALS;

        const zone = zone1;

        await callTransaction(
            getEstateTokenTxByInput_UpdateZoneRoyaltyRate(
                projectToken as any,
                deployer,
                {
                    zone: zone,
                    royaltyRate: projectTokenRoyaltyRate,
                },
                admin,
                admins
            )
        );

        const currentProjectId = (await projectToken.projectNumber()).add(1);
        const currentOfferId = (await projectMarketplace.offerNumber()).add(1);

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

        await callTransaction(
            getCallProjectTokenTx_LaunchProject(projectToken as any, prestigePad, {
                zone: zone,
                launchId: BigNumber.from(0),
                initiator: initiator1.address,
                uri: 'Token1_URI',
            })
        );

        await callTransaction(projectToken.mintTo(seller.address, currentProjectId, initialAmount));

        const params: ListParams = {
            tokenId: currentProjectId,
            sellingAmount: offerAmount,
            unitPrice: unitPrice,
            currency: newCurrencyAddress,
            isDivisible: isDivisible,
        };
        await callTransaction(getAssetMarketplaceTx_List(projectMarketplace, seller as any, params));

        let totalSold = ethers.BigNumber.from(0);
        let totalBought = new Map<string, BigNumber>();

        for (const { buyer, amount: ogAmount } of buyRecords) {
            const amount = ogAmount || offerAmount.sub(totalSold);

            let value = amount.mul(unitPrice).div(ethers.BigNumber.from(10).pow(decimals));

            let [royaltyReceiver, royaltyDenomination] = await projectToken.royaltyInfo(currentProjectId, unitPrice);
            royaltyDenomination = await applyDiscount(admin, royaltyDenomination, newCurrency);

            const royaltyAmount = royaltyDenomination.mul(amount).div(ethers.BigNumber.from(10).pow(decimals));

            let commissionAmount = ethers.BigNumber.from(0);

            let total = value.add(royaltyAmount);

            let ethValue = ethers.BigNumber.from(0);
            await prepareNativeToken(ethers.provider, deployer, [buyer], ethers.utils.parseEther('1.0'));
            if (isERC20) {
                await prepareERC20(newCurrency!, [buyer], [projectMarketplace], total);
            } else {
                ethValue = total;
                await prepareNativeToken(ethers.provider, deployer, [buyer], total);
            }

            await callTransaction(projectToken.connect(seller).setApprovalForAll(projectMarketplace.address, true));

            let initBuyerBalance = await getBalance(ethers.provider, buyer.address, newCurrency);
            let initSellerBalance = await getBalance(ethers.provider, seller.address, newCurrency);
            let initFeeReceiverBalance = await getBalance(ethers.provider, feeReceiver.address, newCurrency);

            let tx;
            if (ogAmount === null) {
                const buyParams: BuyParams = {
                    offerId: currentOfferId,
                };
                if (isSafeBuy) {
                    tx = await getAssetMarketplaceTxByParams_SafeBuy(projectMarketplace, buyer as any, buyParams, {
                        value: ethValue,
                    });
                } else {
                    tx = await getAssetMarketplaceTx_Buy(projectMarketplace, buyer as any, buyParams, {
                        value: ethValue,
                    });
                }
            } else {
                const buyPartParams: BuyPartParams = {
                    offerId: currentOfferId,
                    amount: amount,
                };
                if (isSafeBuy) {
                    tx = await getAssetMarketplaceTxByParams_SafeBuyPart(
                        projectMarketplace,
                        buyer as any,
                        buyPartParams,
                        { value: ethValue }
                    );
                } else {
                    tx = await getAssetMarketplaceTx_BuyPart(projectMarketplace, buyer as any, buyPartParams, {
                        value: ethValue,
                    });
                }
            }
            const receipt = await tx.wait();

            let expectedBuyerBalance = initBuyerBalance.sub(total);
            let expectedSellerBalance = initSellerBalance.add(value);
            let expectedFeeReceiverBalance = initFeeReceiverBalance.add(royaltyAmount.sub(commissionAmount));

            if (!isERC20) {
                const gasFee = receipt.gasUsed.mul(receipt.effectiveGasPrice);
                expectedBuyerBalance = expectedBuyerBalance.sub(gasFee);
            }

            await expect(tx)
                .to.emit(projectMarketplace, 'OfferSale')
                .withArgs(currentOfferId, buyer.address, amount, value, royaltyAmount, royaltyReceiver);

            totalSold = totalSold.add(amount);

            let totalBoughtOfBuyer = (totalBought.get(buyer.address) || ethers.BigNumber.from(0)).add(amount);
            totalBought.set(buyer.address, totalBoughtOfBuyer);

            const offer = await projectMarketplace.getOffer(currentOfferId);
            expect(offer.tokenId).to.equal(currentProjectId);
            expect(offer.sellingAmount).to.equal(offerAmount);
            expect(offer.soldAmount).to.equal(totalSold);
            expect(offer.unitPrice).to.equal(unitPrice);
            expect(offer.currency).to.equal(newCurrencyAddress);
            expect(offer.isDivisible).to.equal(isDivisible);
            expect(offer.state).to.equal(totalSold.eq(offerAmount) ? OfferState.Sold : OfferState.Selling);
            expect(offer.seller).to.equal(seller.address);

            expect(await getBalance(ethers.provider, buyer.address, newCurrency)).to.equal(expectedBuyerBalance);
            expect(await getBalance(ethers.provider, seller.address, newCurrency)).to.equal(expectedSellerBalance);
            expect(await getBalance(ethers.provider, feeReceiver.address, newCurrency)).to.equal(
                expectedFeeReceiverBalance
            );

            expect(await projectToken.balanceOf(seller.address, currentProjectId)).to.equal(
                initialAmount.sub(totalSold)
            );
            expect(await projectToken.balanceOf(buyer.address, currentProjectId)).to.equal(totalBoughtOfBuyer);

            let walletsToReset = [seller, buyer, feeReceiver];
            if (isERC20) {
                await resetERC20(newCurrency!, walletsToReset);
            } else {
                await resetNativeToken(ethers.provider, walletsToReset);
                await prepareNativeToken(ethers.provider, deployer, [seller, buyer], ethers.utils.parseEther('1.0'));
            }
        }
    }

    describe('6.4.4. buy(uint256)', async () => {
        it('6.4.4.1. Buy token successfully in all native/erc20 and exclusive/non-exclusive combinations', async () => {
            const fixture = await beforeProjectMarketplaceTest();
            const { seller1, buyer1 } = fixture;

            for (const isERC20 of [false, true]) {
                for (const isExclusive of [false, true]) {
                    if (!isERC20 && isExclusive) {
                        continue;
                    }
                    await testBuyOffer(
                        fixture,
                        ethers.utils.parseEther('0.3'),
                        ethers.utils.parseEther('0.1'),
                        isERC20,
                        isExclusive,
                        ethers.BigNumber.from(200_000),
                        ethers.BigNumber.from(100_000),
                        ethers.utils.parseEther('100'),
                        seller1,
                        [{ buyer: buyer1, amount: null }],
                        true,
                        false
                    );
                }
            }
        });

        it('6.4.4.2. Buy token successfully at very large amount', async () => {
            const fixture = await beforeProjectMarketplaceTest();
            const { seller1, buyer1 } = fixture;

            for (const isERC20 of [false, true]) {
                for (const isExclusive of [false, true]) {
                    if (!isERC20 && isExclusive) {
                        continue;
                    }
                    const amount = ethers.BigNumber.from(2).pow(255);
                    const base = ethers.BigNumber.from(10).pow(18);
                    await testBuyOffer(
                        fixture,
                        ethers.utils.parseEther('0.99'),
                        ethers.utils.parseEther('0.99'),
                        isERC20,
                        isExclusive,
                        amount,
                        amount,
                        base,
                        seller1,
                        [{ buyer: buyer1, amount: null }],
                        true,
                        false
                    );
                }
            }
        });

        it('6.4.4.3. Buy token successfully with indivisible offer', async () => {
            const fixture = await beforeProjectMarketplaceTest();
            const { seller1, buyer1 } = fixture;

            await testBuyOffer(
                fixture,
                ethers.utils.parseEther('0.3'),
                ethers.utils.parseEther('0.1'),
                false,
                false,
                ethers.BigNumber.from(200_000),
                ethers.BigNumber.from(100_000),
                ethers.BigNumber.from('100'),
                seller1,
                [{ buyer: buyer1, amount: null }],
                false,
                false
            );

            await testBuyOffer(
                fixture,
                ethers.utils.parseEther('0.3'),
                ethers.utils.parseEther('0.1'),
                true,
                true,
                ethers.BigNumber.from(300),
                ethers.BigNumber.from(200),
                ethers.utils.parseEther('500000'),
                seller1,
                [{ buyer: buyer1, amount: null }],
                false,
                false
            );
        });

        it('6.4.4.4. Buy token successfully in 10 random test cases', async () => {
            const fixture = await beforeProjectMarketplaceTest();
            const { seller1, buyer1, buyer2 } = fixture;

            for (let testcase = 0; testcase < 10; testcase++) {
                const isERC20 = Math.random() < 0.5;
                const isExclusive = Math.random() < 0.5;
                if (!isERC20 && isExclusive) {
                    --testcase;
                    continue;
                }

                const royaltyRate = randomBigNumber(ethers.BigNumber.from(0), ethers.utils.parseEther('1'));
                const exclusiveRate = randomBigNumber(ethers.BigNumber.from(0), ethers.utils.parseEther('1'));

                const randomNums = [];
                for (let i = 0; i < 2; ++i) {
                    const maxSupply = ethers.BigNumber.from(2).pow(256).sub(1);
                    randomNums.push(ethers.BigNumber.from(ethers.utils.randomBytes(32)).mod(maxSupply).add(1));
                }
                randomNums.sort((a, b) => (a.sub(b).lt(0) ? -1 : 1));

                const offerAmount = randomNums[0];
                const initAmount = randomNums[1];

                const unitPrice = randomBigNumber(
                    ethers.BigNumber.from(1),
                    ethers.BigNumber.from(2).pow(256).sub(1).div(initAmount)
                );

                const seller = seller1;
                const buyRecords = [
                    {
                        buyer: Math.random() < 0.5 ? buyer1 : buyer2,
                        amount: null,
                    },
                ];
                const isDivisible = Math.random() < 0.5;

                await testBuyOffer(
                    fixture,
                    exclusiveRate,
                    royaltyRate,
                    isERC20,
                    isExclusive,
                    initAmount,
                    offerAmount,
                    unitPrice,
                    seller,
                    buyRecords,
                    isDivisible,
                    false
                );
            }
        });

        it('6.4.4.5. Buy token unsuccessfully with invalid offer id', async () => {
            const fixture = await beforeProjectMarketplaceTest({
                listSampleOffers: true,
            });
            const { projectMarketplace, buyer1 } = fixture;

            await expect(
                getAssetMarketplaceTx_Buy(
                    projectMarketplace,
                    buyer1,
                    {
                        offerId: BigNumber.from(0),
                    },
                    { value: 1e9 }
                )
            ).to.be.revertedWithCustomError(projectMarketplace, 'InvalidOfferId');

            await expect(
                getAssetMarketplaceTx_Buy(
                    projectMarketplace,
                    buyer1,
                    {
                        offerId: BigNumber.from(3),
                    },
                    { value: 1e9 }
                )
            ).to.be.revertedWithCustomError(projectMarketplace, 'InvalidOfferId');
        });
    });

    describe('6.4.5. buy(uint256,uint256)', async () => {
        it('6.4.5.1. Buy token successfully in all native/erc20 and exclusive/non-exclusive combinations', async () => {
            const fixture = await beforeProjectMarketplaceTest();
            const { seller1, buyer1 } = fixture;

            for (const isERC20 of [false, true]) {
                for (const isExclusive of [false, true]) {
                    if (!isERC20 && isExclusive) {
                        continue;
                    }
                    await testBuyOffer(
                        fixture,
                        ethers.utils.parseEther('0.3'),
                        ethers.utils.parseEther('0.1'),
                        isERC20,
                        isExclusive,
                        ethers.BigNumber.from(200_000),
                        ethers.BigNumber.from(150_000),
                        ethers.BigNumber.from('120'),
                        seller1,
                        [
                            {
                                buyer: buyer1,
                                amount: ethers.BigNumber.from(100_000),
                            },
                            {
                                buyer: buyer1,
                                amount: ethers.BigNumber.from(50_000),
                            },
                        ],
                        true,
                        false
                    );
                }
            }
        });

        it('6.4.5.2. Buy token successfully at very large amount in all native/erc20 and exclusive/non-exclusive combinations', async () => {
            const fixture = await beforeProjectMarketplaceTest();
            const { seller1, buyer1 } = fixture;

            for (const isERC20 of [false, true]) {
                for (const isExclusive of [false, true]) {
                    if (!isERC20 && isExclusive) {
                        continue;
                    }
                    const amount = ethers.BigNumber.from(2).pow(255);
                    const base = ethers.BigNumber.from(10).pow(18);
                    await testBuyOffer(
                        fixture,
                        ethers.utils.parseEther('0.99'),
                        ethers.utils.parseEther('0.99'),
                        isERC20,
                        isExclusive,
                        amount,
                        amount,
                        base,
                        seller1,
                        [
                            {
                                buyer: buyer1,
                                amount: ethers.BigNumber.from(150_000),
                            },
                            {
                                buyer: buyer1,
                                amount: ethers.BigNumber.from(50_000),
                            },
                        ],
                        true,
                        false
                    );
                }
            }
        });

        it('6.4.5.3. Buy token successfully in 10 random test cases', async () => {
            const fixture = await beforeProjectMarketplaceTest();
            const { seller1, buyer1, buyer2 } = fixture;

            for (let testcase = 0; testcase < 10; testcase++) {
                const isERC20 = Math.random() < 0.5;
                const isExclusive = Math.random() < 0.5;
                if (!isERC20 && isExclusive) {
                    --testcase;
                    continue;
                }

                const royaltyRate = randomBigNumber(ethers.BigNumber.from(0), ethers.utils.parseEther('1'));
                const exclusiveRate = randomBigNumber(ethers.BigNumber.from(0), ethers.utils.parseEther('1'));

                const randomNums = [];
                for (let i = 0; i < 2; ++i) {
                    const maxSupply = ethers.BigNumber.from(2).pow(256).sub(1);
                    randomNums.push(ethers.BigNumber.from(ethers.utils.randomBytes(32)).mod(maxSupply).add(1));
                }
                randomNums.sort((a, b) => (a.sub(b).lt(0) ? -1 : 1));

                const offerAmount = randomNums[0];
                const initAmount = randomNums[1];

                const unitPrice = randomBigNumber(
                    ethers.BigNumber.from(1),
                    ethers.BigNumber.from(2).pow(256).sub(1).div(initAmount)
                );

                const nTx = randomInt(2, 10 + 1);
                const amounts = randomArrayWithSum(nTx, offerAmount, ethers.BigNumber.from(1));

                const seller = seller1;
                const buyRecords = [];
                for (let i = 0; i < nTx; ++i) {
                    if (i < nTx - 1) {
                        buyRecords.push({
                            buyer: Math.random() < 0.5 ? buyer1 : buyer2,
                            amount: amounts[i],
                        });
                    } else {
                        buyRecords.push({
                            buyer: Math.random() < 0.5 ? buyer1 : buyer2,
                            amount: null,
                        });
                    }
                }

                await testBuyOffer(
                    fixture,
                    exclusiveRate,
                    royaltyRate,
                    isERC20,
                    isExclusive,
                    initAmount,
                    offerAmount,
                    unitPrice,
                    seller,
                    buyRecords,
                    true,
                    false
                );
            }
        });

        it('6.4.5.4. Buy token unsuccessfully when paused', async () => {
            const fixture = await beforeProjectMarketplaceTest({
                listSampleOffers: true,
                pause: true,
            });
            const { projectMarketplace, buyer1 } = fixture;

            await expect(
                getAssetMarketplaceTx_BuyPart(
                    projectMarketplace,
                    buyer1,
                    {
                        offerId: BigNumber.from(1),
                        amount: BigNumber.from(100_000),
                    },
                    { value: 1e9 }
                )
            ).to.be.revertedWith('Pausable: paused');
        });

        it('6.4.5.5. Buy token unsuccessfully with invalid offer id', async () => {
            const fixture = await beforeProjectMarketplaceTest({
                listSampleOffers: true,
            });
            const { projectMarketplace, buyer1 } = fixture;

            await expect(
                getAssetMarketplaceTx_BuyPart(
                    projectMarketplace,
                    buyer1,
                    {
                        offerId: BigNumber.from(0),
                        amount: BigNumber.from(100_000),
                    },
                    { value: 1e9 }
                )
            ).to.be.revertedWithCustomError(projectMarketplace, 'InvalidOfferId');

            await expect(
                getAssetMarketplaceTx_BuyPart(
                    projectMarketplace,
                    buyer1,
                    {
                        offerId: BigNumber.from(3),
                        amount: BigNumber.from(100_000),
                    },
                    { value: 1e9 }
                )
            ).to.be.revertedWithCustomError(projectMarketplace, 'InvalidOfferId');
        });

        it('6.4.5.6. Buy token unsuccessfully when token is not available', async () => {
            const fixture = await beforeProjectMarketplaceTest({
                listSampleOffers: true,
            });
            const { projectMarketplace, buyer1, projectToken } = fixture;

            projectToken.isAvailable.whenCalledWith(1).returns(false);

            await expect(
                getAssetMarketplaceTx_BuyPart(
                    projectMarketplace,
                    buyer1,
                    {
                        offerId: BigNumber.from(1),
                        amount: BigNumber.from(100_000),
                    },
                    { value: 1e9 }
                )
            ).to.be.revertedWithCustomError(projectMarketplace, 'InvalidTokenId');
        });

        it('6.4.5.7. Buy token unsuccessfully when seller buy their own token', async () => {
            const fixture = await beforeProjectMarketplaceTest({
                listSampleOffers: true,
            });
            const { projectMarketplace, seller1, seller2 } = fixture;

            await expect(
                getAssetMarketplaceTx_BuyPart(
                    projectMarketplace,
                    seller1,
                    {
                        offerId: BigNumber.from(1),
                        amount: BigNumber.from(100_000),
                    },
                    { value: 1e9 }
                )
            ).to.be.revertedWithCustomError(projectMarketplace, 'InvalidBuying');

            await expect(
                getAssetMarketplaceTx_BuyPart(
                    projectMarketplace,
                    seller2,
                    {
                        offerId: BigNumber.from(2),
                        amount: BigNumber.from(100_000),
                    },
                    { value: 1e9 }
                )
            ).to.be.revertedWithCustomError(projectMarketplace, 'InvalidBuying');
        });

        it('6.4.5.8. Buy token unsuccessfully when offer is not selling', async () => {
            const fixture = await beforeProjectMarketplaceTest({
                listSampleOffers: true,
            });
            const { projectMarketplace, buyer1, buyer2 } = fixture;

            await callTransaction(
                getAssetMarketplaceTx_BuyPart(
                    projectMarketplace,
                    buyer1,
                    {
                        offerId: BigNumber.from(1),
                        amount: BigNumber.from(150_000),
                    },
                    { value: 1e9 }
                )
            );

            await expect(
                getAssetMarketplaceTx_BuyPart(
                    projectMarketplace,
                    buyer2,
                    {
                        offerId: BigNumber.from(1),
                        amount: BigNumber.from(150_000),
                    },
                    { value: 1e9 }
                )
            ).to.be.revertedWithCustomError(projectMarketplace, 'InvalidBuying');
        });

        it('6.4.5.9. Buy token unsuccessfully with indivisible offer', async () => {
            const fixture = await beforeProjectMarketplaceTest({
                listSampleOffers: true,
            });
            const { projectMarketplace, seller1, buyer1 } = fixture;

            const listParams: ListParams = {
                tokenId: BigNumber.from(1),
                sellingAmount: BigNumber.from(50_000),
                unitPrice: ethers.utils.parseEther('100'),
                currency: ethers.constants.AddressZero,
                isDivisible: false,
            };
            await callTransaction(getAssetMarketplaceTx_List(projectMarketplace, seller1, listParams));

            const offerId = await projectMarketplace.offerNumber();

            await expect(
                getAssetMarketplaceTx_BuyPart(
                    projectMarketplace,
                    buyer1,
                    {
                        offerId: BigNumber.from(offerId),
                        amount: BigNumber.from(50_000),
                    },
                    { value: 1e9 }
                )
            ).to.be.revertedWithCustomError(projectMarketplace, 'NotDivisible');
        });

        it('6.4.5.10. Buy token unsuccessfully when there is not enough tokens to sell', async () => {
            const fixture = await beforeProjectMarketplaceTest({
                listSampleOffers: true,
            });
            const { projectMarketplace, buyer1, buyer2 } = fixture;

            await callTransaction(
                getAssetMarketplaceTx_BuyPart(
                    projectMarketplace,
                    buyer1,
                    {
                        offerId: BigNumber.from(1),
                        amount: BigNumber.from(100_000),
                    },
                    { value: 1e9 }
                )
            );

            await expect(
                getAssetMarketplaceTx_BuyPart(
                    projectMarketplace,
                    buyer2,
                    {
                        offerId: BigNumber.from(1),
                        amount: BigNumber.from(100_000),
                    },
                    { value: 1e9 }
                )
            ).to.be.revertedWithCustomError(projectMarketplace, 'NotEnoughTokensToSell');
        });

        it('6.4.5.11. Buy token unsuccessfully with insufficient native token', async () => {
            const fixture = await beforeProjectMarketplaceTest({
                listSampleOffers: true,
            });
            const { projectMarketplace, buyer1 } = fixture;

            await expect(
                getAssetMarketplaceTx_BuyPart(projectMarketplace, buyer1, {
                    offerId: BigNumber.from(1),
                    amount: BigNumber.from(100_000),
                })
            ).to.be.revertedWithCustomError(projectMarketplace, 'InsufficientValue');
        });

        it('6.4.5.12. Buy token unsuccessfully when transferring native token to seller failed', async () => {
            const fixture = await beforeProjectMarketplaceTest();
            const { projectMarketplace, seller1, buyer1, projectToken, failReceiver } = fixture;

            await callTransaction(
                projectToken
                    .connect(seller1)
                    .safeTransferFrom(
                        seller1.address,
                        failReceiver.address,
                        1,
                        200_000,
                        ethers.utils.toUtf8Bytes('TestToken_1')
                    )
            );

            await callTransaction(
                failReceiver.call(
                    projectToken.address,
                    projectToken.interface.encodeFunctionData('setApprovalForAll', [projectMarketplace.address, true])
                )
            );

            const params: ListParams = {
                tokenId: BigNumber.from(1),
                sellingAmount: BigNumber.from(100_000),
                unitPrice: BigNumber.from(1000),
                currency: ethers.constants.AddressZero,
                isDivisible: true,
            };
            await callTransaction(
                getCallAssetMarketplaceTx_List(projectMarketplace, failReceiver as ProxyCaller, params)
            );

            await callTransaction(failReceiver.activate(true));

            await expect(
                getAssetMarketplaceTx_BuyPart(
                    projectMarketplace,
                    buyer1,
                    {
                        offerId: BigNumber.from(1),
                        amount: BigNumber.from(100_000),
                    },
                    { value: 1e9 }
                )
            ).to.be.revertedWithCustomError(projectMarketplace, 'FailedTransfer');
        });

        it('6.4.5.13. Buy token unsuccessfully when transferring native token to royalty receiver failed', async () => {
            const fixture = await beforeProjectMarketplaceTest({
                listSampleOffers: true,
                useFailRoyaltyReceiver: true,
            });
            const { projectMarketplace, buyer1, failReceiver } = fixture;

            await callTransaction(failReceiver.activate(true));

            await expect(
                getAssetMarketplaceTx_BuyPart(
                    projectMarketplace,
                    buyer1,
                    {
                        offerId: BigNumber.from(1),
                        amount: BigNumber.from(100_000),
                    },
                    { value: 1e9 }
                )
            ).to.be.revertedWithCustomError(projectMarketplace, 'FailedTransfer');
        });

        it('6.4.5.14. Buy token unsuccessfully when refunding to sender failed', async () => {
            const fixture = await beforeProjectMarketplaceTest({
                listSampleOffers: true,
            });
            const { projectMarketplace, deployer } = fixture;

            const failReceiver = await deployFailReceiver(deployer, true, false);

            await expect(
                failReceiver.call(
                    projectMarketplace.address,
                    projectMarketplace.interface.encodeFunctionData('buy(uint256,uint256)', [1, 100_000]),
                    { value: 1e9 }
                )
            ).to.be.revertedWithCustomError(projectMarketplace, 'FailedRefund');
        });

        it('6.4.5.15. Buy token unsuccessfully when the contract is reentered', async () => {
            const fixture = await beforeProjectMarketplaceTest();
            const { deployer, projectToken, projectMarketplace, buyer1 } = fixture;

            const reentrancy = await deployReentrancyReceiver(deployer, true, false);

            await callTransaction(projectToken.mintTo(reentrancy.address, 1, 100_000));

            const params: ListParams = {
                tokenId: BigNumber.from(1),
                sellingAmount: BigNumber.from(100_000),
                unitPrice: BigNumber.from(1000),
                currency: ethers.constants.AddressZero,
                isDivisible: true,
            };
            await callTransaction(
                getCallAssetMarketplaceTx_List(projectMarketplace, reentrancy as ProxyCaller, params)
            );

            await callTransaction(
                reentrancy.call(
                    projectToken.address,
                    projectToken.interface.encodeFunctionData('setApprovalForAll', [projectMarketplace.address, true])
                )
            );

            await testReentrancy_Marketplace(projectMarketplace, reentrancy, async () => {
                await expect(
                    getAssetMarketplaceTx_BuyPart(
                        projectMarketplace,
                        buyer1,
                        {
                            offerId: BigNumber.from(1),
                            amount: BigNumber.from(100_000),
                        },
                        { value: 1e9 }
                    )
                ).to.be.revertedWithCustomError(projectMarketplace, 'FailedTransfer');
            });
        });
    });

    describe('6.4.6. cancel(uint256)', async () => {
        it('6.4.6.1. Cancel offer successfully by seller', async () => {
            const fixture = await beforeProjectMarketplaceTest({
                listSampleOffers: true,
            });
            const { projectMarketplace, seller1 } = fixture;

            let tx = await getAssetMarketplaceTx_Cancel(projectMarketplace, seller1, {
                offerId: BigNumber.from(1),
            });
            await tx.wait();

            const offer = await projectMarketplace.getOffer(1);
            expect(offer.state).to.equal(OfferState.Cancelled);

            await expect(tx).to.emit(projectMarketplace, 'OfferCancellation').withArgs(1);
        });

        it('6.4.6.2. Cancel offer successfully by manager', async () => {
            const fixture = await beforeProjectMarketplaceTest({
                listSampleOffers: true,
            });
            const { projectMarketplace, manager } = fixture;

            let tx = await getAssetMarketplaceTx_Cancel(projectMarketplace, manager, {
                offerId: BigNumber.from(1),
            });
            await tx.wait();

            const offer = await projectMarketplace.getOffer(1);
            expect(offer.state).to.equal(OfferState.Cancelled);

            await expect(tx).to.emit(projectMarketplace, 'OfferCancellation').withArgs(1);
        });

        it('6.4.6.3. Cancel offer unsuccessfully with invalid offer id', async () => {
            const fixture = await beforeProjectMarketplaceTest({
                listSampleOffers: true,
            });
            const { projectMarketplace, manager } = fixture;

            await expect(
                getAssetMarketplaceTx_Cancel(projectMarketplace, manager, {
                    offerId: BigNumber.from(0),
                })
            ).to.be.revertedWithCustomError(projectMarketplace, 'InvalidOfferId');
            await expect(
                getAssetMarketplaceTx_Cancel(projectMarketplace, manager, {
                    offerId: BigNumber.from(3),
                })
            ).to.be.revertedWithCustomError(projectMarketplace, 'InvalidOfferId');
        });

        it('6.4.6.4. Cancel offer unsuccessfully by unauthorized user', async () => {
            const fixture = await beforeProjectMarketplaceTest({
                listSampleOffers: true,
            });
            const { projectMarketplace, seller2, moderator } = fixture;

            await expect(
                getAssetMarketplaceTx_Cancel(projectMarketplace, seller2, {
                    offerId: BigNumber.from(1),
                })
            ).to.be.revertedWithCustomError(projectMarketplace, 'Unauthorized');

            await expect(
                getAssetMarketplaceTx_Cancel(projectMarketplace, moderator, {
                    offerId: BigNumber.from(1),
                })
            ).to.be.revertedWithCustomError(projectMarketplace, 'Unauthorized');
        });

        it('6.4.6.5. Cancel offer unsuccessfully when offer has already been cancelled', async () => {
            const fixture = await beforeProjectMarketplaceTest({
                listSampleOffers: true,
            });
            const { projectMarketplace, manager } = fixture;

            await callTransaction(
                getAssetMarketplaceTx_Cancel(projectMarketplace, manager, {
                    offerId: BigNumber.from(1),
                })
            );
            await expect(
                getAssetMarketplaceTx_Cancel(projectMarketplace, manager, {
                    offerId: BigNumber.from(1),
                })
            ).to.be.revertedWithCustomError(projectMarketplace, 'InvalidCancelling');
        });

        it('6.4.6.6. Cancel offer unsuccessfully when offer is sold out', async () => {
            const fixture = await beforeProjectMarketplaceTest({
                listSampleOffers: true,
            });
            const { projectMarketplace, manager, buyer1 } = fixture;

            await callTransaction(
                getAssetMarketplaceTx_Buy(projectMarketplace, buyer1, { offerId: BigNumber.from(1) }, { value: 1e9 })
            );

            await expect(
                getAssetMarketplaceTx_Cancel(projectMarketplace, manager, {
                    offerId: BigNumber.from(1),
                })
            ).to.be.revertedWithCustomError(projectMarketplace, 'InvalidCancelling');
        });
    });

    describe('6.4.7. safeBuy(uint256,bytes32)', async () => {
        it('6.4.7.1. Buy token successfully in both native and ERC20', async () => {
            const fixture = await beforeProjectMarketplaceTest();
            const { seller1, buyer1 } = fixture;

            for (const isERC20 of [false, true]) {
                for (const isExclusive of [false, true]) {
                    if (!isERC20 && isExclusive) {
                        continue;
                    }
                    await testBuyOffer(
                        fixture,
                        ethers.utils.parseEther('0.3'),
                        ethers.utils.parseEther('0.1'),
                        isERC20,
                        isExclusive,
                        ethers.BigNumber.from(200_000),
                        ethers.BigNumber.from(100_000),
                        ethers.utils.parseEther('100'),
                        seller1,
                        [{ buyer: buyer1, amount: null }],
                        true,
                        true
                    );
                }
            }
        });

        it('6.4.7.2. Buy token unsuccessfully with invalid offer id', async () => {
            const fixture = await beforeProjectMarketplaceTest({
                listSampleOffers: true,
            });
            const { projectMarketplace, buyer1 } = fixture;

            await expect(
                getAssetMarketplaceTx_SafeBuy(
                    projectMarketplace,
                    buyer1,
                    {
                        offerId: BigNumber.from(0),
                        anchor: ethers.constants.HashZero,
                    },
                    { value: 1e9 }
                )
            ).to.be.revertedWithCustomError(projectMarketplace, 'InvalidOfferId');

            await expect(
                getAssetMarketplaceTx_SafeBuy(
                    projectMarketplace,
                    buyer1,
                    {
                        offerId: BigNumber.from(3),
                        anchor: ethers.constants.HashZero,
                    },
                    { value: 1e9 }
                )
            ).to.be.revertedWithCustomError(projectMarketplace, 'InvalidOfferId');
        });

        it('6.4.7.3. Buy token unsuccessfully with invalid anchor', async () => {
            const fixture = await beforeProjectMarketplaceTest({
                listSampleOffers: true,
            });
            const { projectMarketplace, buyer1, buyer2 } = fixture;

            await expect(
                getAssetMarketplaceTx_SafeBuy(
                    projectMarketplace,
                    buyer1,
                    {
                        offerId: BigNumber.from(1),
                        anchor: ethers.constants.HashZero,
                    },
                    { value: 1e9 }
                )
            ).to.be.revertedWithCustomError(projectMarketplace, 'BadAnchor');

            await expect(
                getAssetMarketplaceTx_SafeBuy(
                    projectMarketplace,
                    buyer2,
                    {
                        offerId: BigNumber.from(2),
                        anchor: ethers.constants.HashZero,
                    },
                    { value: 1e9 }
                )
            ).to.be.revertedWithCustomError(projectMarketplace, 'BadAnchor');
        });
    });

    describe('6.4.8. safeBuy(uint256,uint256,bytes32)', async () => {
        it('6.4.8.1. Buy token successfully in both native and ERC20', async () => {
            const fixture = await beforeProjectMarketplaceTest();
            const { seller1, buyer1 } = fixture;

            for (const isERC20 of [false, true]) {
                for (const isExclusive of [false, true]) {
                    if (!isERC20 && isExclusive) {
                        continue;
                    }
                    await testBuyOffer(
                        fixture,
                        ethers.utils.parseEther('0.3'),
                        ethers.utils.parseEther('0.1'),
                        isERC20,
                        isExclusive,
                        ethers.BigNumber.from(200_000),
                        ethers.BigNumber.from(150_000),
                        ethers.BigNumber.from('120'),
                        seller1,
                        [
                            {
                                buyer: buyer1,
                                amount: ethers.BigNumber.from(100_000),
                            },
                            {
                                buyer: buyer1,
                                amount: ethers.BigNumber.from(50_000),
                            },
                        ],
                        true,
                        true
                    );
                }
            }
        });

        it('6.4.8.2. Buy token unsuccessfully with invalid offer id', async () => {
            const fixture = await beforeProjectMarketplaceTest({
                listSampleOffers: true,
            });
            const { projectMarketplace, buyer1 } = fixture;

            await expect(
                getAssetMarketplaceTx_SafeBuyPart(
                    projectMarketplace,
                    buyer1,
                    {
                        offerId: BigNumber.from(0),
                        amount: BigNumber.from(100_000),
                        anchor: ethers.constants.HashZero,
                    },
                    { value: 1e9 }
                )
            ).to.be.revertedWithCustomError(projectMarketplace, 'InvalidOfferId');

            await expect(
                getAssetMarketplaceTx_SafeBuyPart(
                    projectMarketplace,
                    buyer1,
                    {
                        offerId: BigNumber.from(3),
                        amount: BigNumber.from(100_000),
                        anchor: ethers.constants.HashZero,
                    },
                    { value: 1e9 }
                )
            ).to.be.revertedWithCustomError(projectMarketplace, 'InvalidOfferId');
        });

        it('6.4.8.3. Buy token unsuccessfully with invalid anchor', async () => {
            const fixture = await beforeProjectMarketplaceTest({
                listSampleOffers: true,
            });
            const { projectMarketplace, buyer1, buyer2 } = fixture;

            await expect(
                getAssetMarketplaceTx_SafeBuyPart(
                    projectMarketplace,
                    buyer1,
                    {
                        offerId: BigNumber.from(1),
                        amount: BigNumber.from(100_000),
                        anchor: ethers.constants.HashZero,
                    },
                    { value: 1e9 }
                )
            ).to.be.revertedWithCustomError(projectMarketplace, 'BadAnchor');

            await expect(
                getAssetMarketplaceTx_SafeBuyPart(
                    projectMarketplace,
                    buyer2,
                    {
                        offerId: BigNumber.from(2),
                        amount: BigNumber.from(100_000),
                        anchor: ethers.constants.HashZero,
                    },
                    { value: 1e9 }
                )
            ).to.be.revertedWithCustomError(projectMarketplace, 'BadAnchor');
        });
    });
});
