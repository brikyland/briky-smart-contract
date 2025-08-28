import { expect } from 'chai';
import { ethers, upgrades } from 'hardhat';
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
} from '@typechain-types';
import { callTransaction, getBalance, prepareERC20, prepareNativeToken, resetERC20, resetNativeToken, testReentrancy } from '@utils/blockchain';
import { Constant } from '@tests/test.constant';
import { deployAdmin } from '@utils/deployments/common/admin';
import { deployFeeReceiver } from '@utils/deployments/common/feeReceiver';
import { deployCurrency } from '@utils/deployments/common/currency';
import { loadFixture, time } from "@nomicfoundation/hardhat-network-helpers";
import { ProjectMarketplaceOfferState } from '@utils/models/enums';
import { MockContract, smock } from '@defi-wonderland/smock';

import {
    callAdmin_ActivateIn,
    callAdmin_AuthorizeManagers,
    callAdmin_AuthorizeModerators,
    callAdmin_DeclareZones,
    callAdmin_UpdateCurrencyRegistries,
} from '@utils/callWithSignatures/admin';
import { BigNumber, Contract, Wallet } from 'ethers';
import { randomInt } from 'crypto';
import { getInterfaceID, randomArrayWithSum, randomBigNumber } from '@utils/utils';
import { OrderedMap } from '@utils/utils';
import { deployProjectMarketplace } from '@utils/deployments/lux/projectMarketplace';
import { callEstateToken_AuthorizeTokenizers, callEstateToken_UpdateCommissionToken, callEstateToken_UpdateRoyaltyRate } from '@utils/callWithSignatures/estateToken';
import { callProjectMarketplace_Pause } from '@utils/callWithSignatures/projectMarketplace';
import { deployFailReceiver } from '@utils/deployments/mock/failReceiver';
import { deployReentrancyERC1155Holder } from '@utils/deployments/mock/mockReentrancy/reentrancyERC1155Holder';
import { deployReentrancy } from '@utils/deployments/mock/mockReentrancy/reentrancy';
import { Initialization as LandInitialization } from '@tests/land/test.initialization';
import { deployPriceWatcher } from '@utils/deployments/common/priceWatcher';
import { deployReserveVault } from '@utils/deployments/common/reserveVault';
import { MockValidator } from '@utils/mockValidator';
import { RegisterCustodianParams } from '@utils/models/EstateToken';
import { getRegisterCustodianTx } from '@utils/transaction/EstateToken';
import { Initialization as LaunchInitialization } from '@tests/launch/test.initialization';
import { callProjectToken_AuthorizeLaunchpads, callProjectToken_UpdateRoyaltyRate } from '@utils/callWithSignatures/projectToken';
import { getCallLaunchProjectTx, getCallMintTx } from '@utils/transaction/ProjectToken';
import { deployMockPrestigePad } from '@utils/deployments/mock/mockPrestigePad';

interface ProjectMarketplaceFixture {
    admin: Admin;
    feeReceiver: FeeReceiver;
    currency: Currency;
    priceWatcher: PriceWatcher;
    reserveVault: ReserveVault;
    estateToken: MockContract<MockEstateToken>;
    prestigePad: MockPrestigePad;
    projectToken: MockContract<MockProjectToken>;
    projectMarketplace: ProjectMarketplace;
    validator: MockValidator;

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
    mockCurrencyExclusiveRate: BigNumber;
}

async function testReentrancy_Marketplace(
    projectMarketplace: ProjectMarketplace,
    reentrancyContract: Contract,
    assertion: any,
) {
    let data = [
        projectMarketplace.interface.encodeFunctionData("buy(uint256)", [0]),
        projectMarketplace.interface.encodeFunctionData("buy(uint256,uint256)", [0, 0]),
        projectMarketplace.interface.encodeFunctionData("safeBuy(uint256,uint256)", [0, 0]),
        projectMarketplace.interface.encodeFunctionData("safeBuy(uint256,uint256,uint256)", [0, 0, 0]),
        projectMarketplace.interface.encodeFunctionData("cancel", [0]),
    ];

    await testReentrancy(
        reentrancyContract,
        projectMarketplace,
        data,
        assertion,
    );
}

describe('6.4. ProjectMarketplace', async () => {
    async function projectMarketplaceFixture(): Promise<ProjectMarketplaceFixture> {
        const accounts = await ethers.getSigners();
        const deployer = accounts[0];
        const admins = [];
        for (let i = 1; i <= Constant.ADMIN_NUMBER; ++i) admins.push(accounts[i]);
        const seller1 = accounts[Constant.ADMIN_NUMBER + 1];
        const seller2 = accounts[Constant.ADMIN_NUMBER + 2];
        const buyer1 = accounts[Constant.ADMIN_NUMBER + 3];
        const buyer2 = accounts[Constant.ADMIN_NUMBER + 4];
        const commissionReceiver = accounts[Constant.ADMIN_NUMBER + 5];
        const manager = accounts[Constant.ADMIN_NUMBER + 6];
        const moderator = accounts[Constant.ADMIN_NUMBER + 7];
        const initiator1 = accounts[Constant.ADMIN_NUMBER + 8];
        const initiator2 = accounts[Constant.ADMIN_NUMBER + 9];

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

        const validator = new MockValidator(deployer as any);

        const currency = await deployCurrency(
            deployer.address,
            'MockCurrency',
            'MCK'
        ) as Currency;

        const mockCurrencyExclusiveRate = ethers.utils.parseEther("0.3");
        await currency.setExclusiveDiscount(mockCurrencyExclusiveRate, Constant.COMMON_RATE_DECIMALS);

        const SmockEstateTokenFactory = await smock.mock<MockEstateToken__factory>('MockEstateToken');
        const estateToken = await SmockEstateTokenFactory.deploy();
        await callTransaction(estateToken.initialize(
            admin.address,
            feeReceiver.address,
            validator.getAddress(),
            LandInitialization.ESTATE_TOKEN_BaseURI,
        ));        

        const SmockProjectTokenFactory = await smock.mock<MockProjectToken__factory>('MockProjectToken');
        const projectToken = await SmockProjectTokenFactory.deploy();
        await callTransaction(projectToken.initialize(
            admin.address,
            estateToken.address,
            feeReceiver.address,
            validator.getAddress(),
            LaunchInitialization.PROJECT_TOKEN_BaseURI,
        ));

        const prestigePad = await deployMockPrestigePad(
            deployer.address,
            admin.address,
            projectToken.address,
            priceWatcher.address,
            feeReceiver.address,
            reserveVault.address,
            validator.getAddress(),
            LaunchInitialization.PRESTIGE_PAD_BaseMinUnitPrice,
            LaunchInitialization.PRESTIGE_PAD_BaseMaxUnitPrice,
        ) as MockPrestigePad;

        const projectMarketplace = await deployProjectMarketplace(
            deployer.address,
            admin.address,
            projectToken.address,
        ) as ProjectMarketplace;

        return {
            admin,
            feeReceiver,
            currency,
            priceWatcher,
            reserveVault,
            estateToken,
            prestigePad,
            projectToken,
            projectMarketplace,
            validator,
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
            mockCurrencyExclusiveRate,
        };
    };

    async function beforeProjectMarketplaceTest({
        listSampleCurrencies = false,
        listSampleProjectToken = false,
        listSampleOffers = false,
        fundERC20ForBuyers = false,
        pause = false,
    } = {}): Promise<ProjectMarketplaceFixture> {
        const fixture = await loadFixture(projectMarketplaceFixture);

        const {
            admin,
            admins,
            currency,
            estateToken,
            prestigePad,
            projectToken,
            projectMarketplace,
            seller1,
            seller2,
            buyer1,
            buyer2,
            commissionReceiver,
            manager,
            moderator,
            initiator1,
            initiator2,
            validator
        } = fixture;

        await callAdmin_DeclareZones(
            admin,
            admins,
            [ethers.utils.formatBytes32String("TestZone")],
            true,
            await admin.nonce(),
        );
        await callAdmin_AuthorizeManagers(
            admin,
            admins,
            [manager.address],
            true,
            await admin.nonce(),
        );
        await callAdmin_AuthorizeModerators(
            admin,
            admins,
            [moderator.address],
            true,
            await admin.nonce(),
        );

        await callProjectToken_AuthorizeLaunchpads(
            projectToken,
            admins,
            [prestigePad.address],
            true,
            await admin.nonce()
        );

        await callAdmin_ActivateIn(
            admin,
            admins,
            ethers.utils.formatBytes32String("TestZone"),
            [manager.address, moderator.address],
            true,
            await admin.nonce(),
        );

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
        if (listSampleProjectToken) {
            currentTimestamp += 1000;

            await time.setNextBlockTimestamp(currentTimestamp);

            await callTransaction(getCallLaunchProjectTx(projectToken as any, prestigePad, {
                zone: ethers.utils.formatBytes32String("TestZone"),
                launchId: BigNumber.from(10),
                initiator: initiator1.address,
                uri: "Token1_URI",
            }));

            await callTransaction(getCallLaunchProjectTx(projectToken as any, prestigePad, {
                zone: ethers.utils.formatBytes32String("TestZone"),
                launchId: BigNumber.from(20),
                initiator: initiator2.address,
                uri: "Token2_URI",
            }));

            await callTransaction(projectToken.mintTo(seller1.address, 1, 200_000));
            await callTransaction(projectToken.mintTo(seller2.address, 1, 300_000));
            await callTransaction(projectToken.mintTo(seller1.address, 2, 200));
            await callTransaction(projectToken.mintTo(seller2.address, 2, 300));
        }

        if (listSampleOffers) {
            await callTransaction(projectMarketplace.connect(seller1).list(
                1, 150_000, ethers.utils.parseEther("100"), ethers.constants.AddressZero, true
            ));
            await callTransaction(projectMarketplace.connect(seller2).list(
                2, 200, ethers.utils.parseEther("500000"), currency.address, true
            ));

            await callTransaction(projectToken.connect(seller1).setApprovalForAll(projectMarketplace.address, true));
            await callTransaction(projectToken.connect(seller2).setApprovalForAll(projectMarketplace.address, true));
        }

        if (fundERC20ForBuyers) {
            await prepareERC20(
                currency,
                [buyer1, buyer2],
                [projectMarketplace],
                1e9,
            )
        }

        if (pause) {
            await callProjectMarketplace_Pause(projectMarketplace, admins, await admin.nonce());
        }

        return {
            ...fixture,
        }
    }

    describe('6.4.1. initialize(address, address, address)', async () => {
        it('6.4.1.1. Deploy successfully', async () => {
            const { admin, projectToken, projectMarketplace } = await beforeProjectMarketplaceTest();

            const paused = await projectMarketplace.paused();
            expect(paused).to.equal(false);

            const adminAddress = await projectMarketplace.admin();
            expect(adminAddress).to.equal(admin.address);

            const projectTokenAddress = await projectMarketplace.projectToken();
            expect(projectTokenAddress).to.equal(projectToken.address);


            const offerNumber = await projectMarketplace.offerNumber();
            expect(offerNumber).to.equal(0);
        });
    });

    describe('6.4.2. getOffer(uint256)', async () => {
        it('6.4.2.1. return successfully with valid offer id', async () => {
            const { projectMarketplace, projectToken, currency, seller1, seller2 } = await beforeProjectMarketplaceTest({
                listSampleCurrencies: true,
                listSampleProjectToken: true,
                listSampleOffers: true,
            });

            await expect(projectMarketplace.getOffer(1))
                .to.not.be.reverted;

            await expect(projectMarketplace.getOffer(2))
                .to.not.be.reverted;
        });

        it('6.4.2.2. revert with invalid offer id', async () => {
            const { projectMarketplace } = await beforeProjectMarketplaceTest({
                listSampleCurrencies: true,
                listSampleProjectToken: true,
                listSampleOffers: true,
            });

            // TODO: Why it doesn't revert with InvalidOfferId custom error?

            await expect(projectMarketplace.getOffer(0))
                .to.be.revertedWithoutReason();

            await expect(projectMarketplace.getOffer(3))
                .to.be.revertedWithoutReason();
        });
    });

    describe('6.4.3. list(uint256, uint256, uint256, address, bool)', async () => {
        it('6.4.3.1. list token successfully', async () => {
            const { projectMarketplace, projectToken, currency, seller1, seller2 } = await beforeProjectMarketplaceTest({
                listSampleCurrencies: true,
                listSampleProjectToken: true,
            });
            let tx = await projectMarketplace.connect(seller1).list(
                1,
                150_000,
                ethers.utils.parseEther("100"),
                ethers.constants.AddressZero,
                false
            );
            await tx.wait();

            expect(tx).to
                .emit(projectMarketplace, 'NewOffer')
                .withArgs(
                    1,
                    1,
                    seller1.address,
                    150_000,
                    ethers.utils.parseEther("100"),
                    ethers.constants.AddressZero,
                    false
                );

            expect(await projectMarketplace.offerNumber()).to.equal(1);

            let offer = await projectMarketplace.getOffer(1);
            expect(offer.tokenId).to.equal(1);
            expect(offer.sellingAmount).to.equal(150_000);
            expect(offer.soldAmount).to.equal(0);
            expect(offer.unitPrice).to.equal(ethers.utils.parseEther("100"));
            expect(offer.currency).to.equal(ethers.constants.AddressZero);
            expect(offer.isDivisible).to.equal(false);
            expect(offer.state).to.equal(ProjectMarketplaceOfferState.Selling);
            expect(offer.seller).to.equal(seller1.address);

            tx = await projectMarketplace.connect(seller2).list(
                2,
                200,
                ethers.utils.parseEther("500000"),
                currency.address,
                true
            );
            await tx.wait();

            expect(tx).to
                .emit(projectMarketplace, 'NewOffer')
                .withArgs(
                    2,
                    2,
                    seller2.address,
                    200,
                    ethers.utils.parseEther("500000"),
                    currency.address,
                    true
                );

            expect(await projectMarketplace.offerNumber()).to.equal(2);

            offer = await projectMarketplace.getOffer(2);
            expect(offer.tokenId).to.equal(2);
            expect(offer.sellingAmount).to.equal(200);
            expect(offer.soldAmount).to.equal(0);
            expect(offer.unitPrice).to.equal(ethers.utils.parseEther("500000"));
            expect(offer.currency).to.equal(currency.address);
            expect(offer.isDivisible).to.equal(true);
            expect(offer.state).to.equal(ProjectMarketplaceOfferState.Selling);
            expect(offer.seller).to.equal(seller2.address);
        });

        it('6.4.3.2. list token unsuccessfully when paused', async () => {
            const fixture = await beforeProjectMarketplaceTest({
                listSampleCurrencies: true,
                listSampleProjectToken: true,
                pause: true,
            });
            const { projectMarketplace, seller1 } = fixture;

            await expect(projectMarketplace.connect(seller1).list(1, 100, 1000, ethers.constants.AddressZero, false))
                .to.be.revertedWith('Pausable: paused');
        });

        it('6.4.3.3. list token unsuccessfully with invalid token id', async () => {
            const fixture = await beforeProjectMarketplaceTest({
                listSampleCurrencies: true,
                listSampleProjectToken: true,
            });
            const { projectMarketplace, seller1 } = fixture;

            await expect(projectMarketplace.connect(seller1).list(0, 100, 1000, ethers.constants.AddressZero, false))
                .to.be.revertedWithCustomError(projectMarketplace, 'InvalidTokenId');

            await expect(projectMarketplace.connect(seller1).list(3, 100, 1000, ethers.constants.AddressZero, false))
                .to.be.revertedWithCustomError(projectMarketplace, 'InvalidTokenId');
        });

        it('6.4.3.4. list token unsuccessfully with zero unit price', async () => {
            const fixture = await beforeProjectMarketplaceTest({
                listSampleCurrencies: true,
                listSampleProjectToken: true,
            });
            const { projectMarketplace, seller1 } = fixture;

            await expect(projectMarketplace.connect(seller1).list(1, 100, 0, ethers.constants.AddressZero, false))
                .to.be.revertedWithCustomError(projectMarketplace, 'InvalidUnitPrice');
        });

        it('6.4.3.5. list token unsuccessfully with invalid currency', async () => {
            const fixture = await beforeProjectMarketplaceTest({
                listSampleProjectToken: true,
            });
            const { projectMarketplace, seller1 } = fixture;

            await expect(projectMarketplace.connect(seller1).list(1, 100, 1000, ethers.constants.AddressZero, false))
                .to.be.revertedWithCustomError(projectMarketplace, 'InvalidCurrency');
        });

        it('6.4.3.6. list token unsuccessfully with zero selling amount', async () => {
            const fixture = await beforeProjectMarketplaceTest({
                listSampleCurrencies: true,
                listSampleProjectToken: true,
            });
            const { projectMarketplace, seller1 } = fixture;

            await expect(projectMarketplace.connect(seller1).list(1, 0, 1000, ethers.constants.AddressZero, false))
                .to.be.revertedWithCustomError(projectMarketplace, 'InvalidSellingAmount');
        });

        it('6.4.3.7. list token unsuccessfully with selling amount exceeding owned amount', async () => {
            const fixture = await beforeProjectMarketplaceTest({
                listSampleCurrencies: true,
                listSampleProjectToken: true,
            });
            const { projectMarketplace, seller1 } = fixture;

            await expect(projectMarketplace.connect(seller1).list(1, 200_001, 1000, ethers.constants.AddressZero, false))
                .to.be.revertedWithCustomError(projectMarketplace, 'InvalidSellingAmount');
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
            buyer: Wallet,
            amount: BigNumber | null,
        }[],
        isDivisible: boolean,
        isSafeBuy: boolean,
    ) {
        const { deployer, prestigePad, projectToken, projectMarketplace, feeReceiver, commissionReceiver, admins, admin, initiator1 } = fixture;
        const decimals = Constant.PROJECT_TOKEN_MAX_DECIMALS;

        await callProjectToken_UpdateRoyaltyRate(projectToken, admins, projectTokenRoyaltyRate, await admin.nonce());

        const currentProjectId = (await projectToken.projectNumber()).add(1);
        const currentOfferId = (await projectMarketplace.offerNumber()).add(1);

        let newCurrency: Currency | undefined;
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

        await callTransaction(getCallLaunchProjectTx(projectToken as any, prestigePad, {
            zone: ethers.utils.formatBytes32String("TestZone"),
            launchId: BigNumber.from(0),
            initiator: initiator1.address,
            uri: "Token1_URI",
        }));

        await callTransaction(projectToken.mintTo(seller.address, currentProjectId, initialAmount));
        
        await callTransaction(projectMarketplace.connect(seller).list(
            currentProjectId,
            offerAmount,
            unitPrice,
            newCurrencyAddress,
            isDivisible,
        ));

        let totalSold = ethers.BigNumber.from(0);
        let totalBought = new Map<string, BigNumber>();

        for (const { buyer, amount: ogAmount } of buyRecords) {
            const amount = ogAmount || offerAmount.sub(totalSold);

            let value = amount.mul(unitPrice).div(ethers.BigNumber.from(10).pow(decimals));
            let royaltyReceiver = feeReceiver.address;
            let royaltyAmount = value.mul(projectTokenRoyaltyRate).div(Constant.COMMON_RATE_MAX_FRACTION);
            if (isExclusive) {
                royaltyAmount = royaltyAmount.sub(royaltyAmount.mul(mockCurrencyExclusiveRate).div(Constant.COMMON_RATE_MAX_FRACTION));
            }
            let commissionAmount = ethers.BigNumber.from(0);
            let total = value.add(royaltyAmount);

            let ethValue = ethers.BigNumber.from(0);
            await prepareNativeToken(ethers.provider, deployer, [buyer], ethers.utils.parseEther("1.0"));
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
                if (isSafeBuy) {
                    tx = await projectMarketplace.connect(buyer)["safeBuy(uint256,uint256)"](
                        currentOfferId,
                        currentProjectId,
                        { value: ethValue }
                    );
                } else {
                    tx = await projectMarketplace.connect(buyer)["buy(uint256)"](
                        currentOfferId,
                        { value: ethValue }
                    );
                }
            } else {
                if (isSafeBuy) {
                    tx = await projectMarketplace.connect(buyer)["safeBuy(uint256,uint256,uint256)"](
                        currentOfferId,
                        amount,
                        currentProjectId,
                        { value: ethValue }
                    );
                } else {
                    tx = await projectMarketplace.connect(buyer)["buy(uint256,uint256)"](
                        currentOfferId,
                        amount,
                        { value: ethValue }
                    );
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

            await expect(tx).to.emit(projectMarketplace, 'OfferSale').withArgs(
                currentOfferId,
                buyer.address,
                amount,
                value,
            );
            
            totalSold = totalSold.add(amount);

            let totalBoughtOfBuyer = (totalBought.get(buyer.address) || ethers.BigNumber.from(0)).add(amount);
            totalBought.set(buyer.address, totalBoughtOfBuyer);

            let offer = await projectMarketplace.getOffer(currentOfferId);
            expect(offer.tokenId).to.equal(currentProjectId);
            expect(offer.sellingAmount).to.equal(offerAmount);
            expect(offer.soldAmount).to.equal(totalSold);
            expect(offer.unitPrice).to.equal(unitPrice);
            expect(offer.currency).to.equal(newCurrencyAddress);
            expect(offer.isDivisible).to.equal(isDivisible);
            expect(offer.state).to.equal(totalSold.eq(offerAmount) ? ProjectMarketplaceOfferState.Sold : ProjectMarketplaceOfferState.Selling);
            expect(offer.seller).to.equal(seller.address);

            expect(await getBalance(ethers.provider, buyer.address, newCurrency)).to.equal(expectedBuyerBalance);
            expect(await getBalance(ethers.provider, seller.address, newCurrency)).to.equal(expectedSellerBalance);
            expect(await getBalance(ethers.provider, feeReceiver.address, newCurrency)).to.equal(expectedFeeReceiverBalance);
            
            expect(await projectToken.balanceOf(seller.address, currentProjectId)).to.equal(initialAmount.sub(totalSold));
            expect(await projectToken.balanceOf(buyer.address, currentProjectId)).to.equal(totalBoughtOfBuyer);

            let walletsToReset = [seller, buyer, feeReceiver];
            if (isERC20) {
                await resetERC20(newCurrency!, walletsToReset);
            } else {
                await resetNativeToken(ethers.provider, walletsToReset);
                await prepareNativeToken(ethers.provider, deployer, [seller, buyer], ethers.utils.parseEther("1.0"));
            }
        }
    }

    describe('6.4.4. buy(uint256)', async () => {
        it('6.4.4.1. buy token successfully in all native/erc20 and exclusive/non-exclusive combinations', async () => {
            const fixture = await beforeProjectMarketplaceTest({
                listSampleCurrencies: true,
                listSampleProjectToken: true,
            });
            const { mockCurrencyExclusiveRate, seller1, buyer1 } = fixture;

            for (const isERC20 of [false, true]) {
                for (const isExclusive of [false, true]) {
                    if (!isERC20 && isExclusive) {
                        continue;
                    }
                    await testBuyOffer(
                        fixture,
                        mockCurrencyExclusiveRate,
                        LaunchInitialization.PROJECT_TOKEN_RoyaltyRate,
                        isERC20,
                        isExclusive,
                        ethers.BigNumber.from(200_000),
                        ethers.BigNumber.from(100_000),
                        ethers.utils.parseEther("100"),
                        seller1,
                        [{ buyer: buyer1, amount: null }],
                        true,
                        false,
                    )
                }
            }
        });

        it('6.4.4.2. buy token successfully at very large amount', async () => {
            const fixture = await beforeProjectMarketplaceTest({
                listSampleCurrencies: true,
                listSampleProjectToken: true,
            });
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
                        ethers.utils.parseEther("0.99"),
                        ethers.utils.parseEther("0.99"),
                        isERC20,
                        isExclusive,
                        amount,
                        amount,
                        base,
                        seller1,
                        [{ buyer: buyer1, amount: null }],
                        true,
                        false,
                    )
                }
            }
        });
        
        it('6.4.4.3. buy token successfully with indivisible offer', async () => {
            const fixture = await beforeProjectMarketplaceTest({
                listSampleCurrencies: true,
                listSampleProjectToken: true,
            });
            const { mockCurrencyExclusiveRate, seller1, buyer1 } = fixture;
    
            await testBuyOffer(
                fixture,
                mockCurrencyExclusiveRate,
                LaunchInitialization.PROJECT_TOKEN_RoyaltyRate,
                false,
                false,
                ethers.BigNumber.from(200_000),
                ethers.BigNumber.from(100_000),
                ethers.BigNumber.from("100"),
                seller1,
                [{ buyer: buyer1, amount: null }],
                false,
                false,
            )

            await testBuyOffer(
                fixture,
                mockCurrencyExclusiveRate,
                LaunchInitialization.PROJECT_TOKEN_RoyaltyRate,
                true,
                true,
                ethers.BigNumber.from(300),
                ethers.BigNumber.from(200),
                ethers.utils.parseEther("500000"),
                seller1,
                [{ buyer: buyer1, amount: null }],
                false,
                false,
            )
        });

        it('6.4.4.4. buy token successfully in 10 random test cases', async () => {
            const fixture = await beforeProjectMarketplaceTest({
                listSampleCurrencies: true,
                listSampleProjectToken: true,
            });
            const { seller1, buyer1, buyer2 } = fixture;

            for (let testcase = 0; testcase < 10; testcase++) {
                const isERC20 = Math.random() < 0.5;
                const isExclusive = Math.random() < 0.5;
                if (!isERC20 && isExclusive) {
                    --testcase; continue;
                }

                const royaltyRate = randomBigNumber(ethers.BigNumber.from(0), ethers.utils.parseEther("1"));
                const exclusiveRate = randomBigNumber(ethers.BigNumber.from(0), ethers.utils.parseEther("1"));

                const randomNums = []
                for (let i = 0; i < 2; ++i) {
                    const maxSupply = ethers.BigNumber.from(2).pow(256).sub(1)
                    randomNums.push(ethers.BigNumber.from(ethers.utils.randomBytes(32)).mod(maxSupply).add(1));
                }
                randomNums.sort((a, b) => a.sub(b).lt(0) ? -1 : 1);

                const offerAmount = randomNums[0];
                const initAmount = randomNums[1];

                const unitPrice = randomBigNumber(ethers.BigNumber.from(1), ethers.BigNumber.from(2).pow(256).sub(1).div(initAmount));

                const seller = seller1;
                const buyRecords = [{
                    buyer: Math.random() < 0.5 ? buyer1 : buyer2,
                    amount: null,
                }];
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
                    false,
                );
            }
        });

        it('6.4.4.5. buy token unsuccessfully with invalid offer id', async () => {
            const fixture = await beforeProjectMarketplaceTest({
                listSampleCurrencies: true,
                listSampleProjectToken: true,
                listSampleOffers: true,
                fundERC20ForBuyers: true,
            });
            const { projectMarketplace, buyer1 } = fixture;

            await expect(projectMarketplace.connect(buyer1)["buy(uint256)"](0, { value: 1e9 }))
                .to.be.revertedWithCustomError(projectMarketplace, "InvalidOfferId");

            await expect(projectMarketplace.connect(buyer1)["buy(uint256)"](3, { value: 1e9 }))
                .to.be.revertedWithCustomError(projectMarketplace, "InvalidOfferId");
        });
    });

    describe('6.4.5. buy(uint256, uint256)', async () => {
        it('6.4.5.1. buy token successfully in all native/erc20 and exclusive/non-exclusive combinations', async () => {
            const fixture = await beforeProjectMarketplaceTest({
                listSampleCurrencies: true,
                listSampleProjectToken: true,
            });
            const { mockCurrencyExclusiveRate, seller1, buyer1 } = fixture;

            for (const isERC20 of [false, true]) {
                for (const isExclusive of [false, true]) {
                    if (!isERC20 && isExclusive) {
                        continue;
                    }
                    await testBuyOffer(
                        fixture,
                        mockCurrencyExclusiveRate,
                        LaunchInitialization.PROJECT_TOKEN_RoyaltyRate,
                        isERC20,
                        isExclusive,
                        ethers.BigNumber.from(200_000),
                        ethers.BigNumber.from(150_000),
                        ethers.BigNumber.from("120"),
                        seller1,
                        [
                            { buyer: buyer1, amount: ethers.BigNumber.from(100_000) },
                            { buyer: buyer1, amount: ethers.BigNumber.from(50_000) },
                        ],
                        true,
                        false,
                    )
                }
            }
        });

        it('6.4.5.2. buy token successfully at very large amount in all native/erc20 and exclusive/non-exclusive combinations', async () => {
            const fixture = await beforeProjectMarketplaceTest({
                listSampleCurrencies: true,
                listSampleProjectToken: true,
            });
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
                        ethers.utils.parseEther("0.99"),
                        ethers.utils.parseEther("0.99"),
                        isERC20,
                        isExclusive,
                        amount,
                        amount,
                        base,
                        seller1,
                        [
                            { buyer: buyer1, amount: ethers.BigNumber.from(150_000) },
                            { buyer: buyer1, amount: ethers.BigNumber.from(50_000) },
                        ],
                        true,
                        false,
                    )
                }
            }            
        });

        it('6.4.5.3. buy token successfully in 10 random test cases', async () => {
            const fixture = await beforeProjectMarketplaceTest({
                listSampleCurrencies: true,
                listSampleProjectToken: true,
            });
            const { seller1, buyer1, buyer2 } = fixture;

            for (let testcase = 0; testcase < 10; testcase++) {
                const isERC20 = Math.random() < 0.5;
                const isExclusive = Math.random() < 0.5;
                if (!isERC20 && isExclusive) {
                    --testcase; continue;
                }

                const royaltyRate = randomBigNumber(ethers.BigNumber.from(0), ethers.utils.parseEther("1"));
                const exclusiveRate = randomBigNumber(ethers.BigNumber.from(0), ethers.utils.parseEther("1"));

                const randomNums = []
                for (let i = 0; i < 2; ++i) {
                    const maxSupply = ethers.BigNumber.from(2).pow(256).sub(1)
                    randomNums.push(ethers.BigNumber.from(ethers.utils.randomBytes(32)).mod(maxSupply).add(1));
                }
                randomNums.sort((a, b) => a.sub(b).lt(0) ? -1 : 1);

                const offerAmount = randomNums[0];
                const initAmount = randomNums[1];

                const unitPrice = randomBigNumber(ethers.BigNumber.from(1), ethers.BigNumber.from(2).pow(256).sub(1).div(initAmount));

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
                    false,
                );
            }
        });

        it('6.4.5.4. buy token unsuccessfully when paused', async () => {
            const fixture = await beforeProjectMarketplaceTest({
                listSampleCurrencies: true,
                listSampleProjectToken: true,
                listSampleOffers: true,
                fundERC20ForBuyers: true,
                pause: true,
            });
            const { projectMarketplace, buyer1 } = fixture;

            await expect(projectMarketplace.connect(buyer1)["buy(uint256,uint256)"](1, 100_000, { value: 1e9 }))
                .to.be.revertedWith("Pausable: paused");
        });

        it('6.4.5.5. buy token unsuccessfully with invalid offer id', async () => {
            const fixture = await beforeProjectMarketplaceTest({
                listSampleCurrencies: true,
                listSampleProjectToken: true,
                listSampleOffers: true,
                fundERC20ForBuyers: true,
            });
            const { projectMarketplace, buyer1 } = fixture;

            await expect(projectMarketplace.connect(buyer1)["buy(uint256,uint256)"](0, 100_000, { value: 1e9 }))
                .to.be.revertedWithCustomError(projectMarketplace, "InvalidOfferId");

            await expect(projectMarketplace.connect(buyer1)["buy(uint256,uint256)"](3, 100_000, { value: 1e9 }))
                .to.be.revertedWithCustomError(projectMarketplace, "InvalidOfferId");
        });

        it('6.4.5.6. buy token unsuccessfully when seller buy their own token', async () => {
            const fixture = await beforeProjectMarketplaceTest({
                listSampleCurrencies: true,
                listSampleProjectToken: true,
                listSampleOffers: true,
                fundERC20ForBuyers: true,
            });
            const { projectMarketplace, seller1, seller2 } = fixture;

            await expect(projectMarketplace.connect(seller1)["buy(uint256,uint256)"](1, 100_000, { value: 1e9 }))
                .to.be.revertedWithCustomError(projectMarketplace, "InvalidBuying");

            await expect(projectMarketplace.connect(seller2)["buy(uint256,uint256)"](2, 100_000))
                .to.be.revertedWithCustomError(projectMarketplace, "InvalidBuying");
        });

        it('6.4.5.7. buy token unsuccessfully when offer is not selling', async () => {
            const fixture = await beforeProjectMarketplaceTest({
                listSampleCurrencies: true,
                listSampleProjectToken: true,
                listSampleOffers: true,
                fundERC20ForBuyers: true,
            });
            const { projectMarketplace, buyer1, buyer2 } = fixture;

            await callTransaction(projectMarketplace.connect(buyer1)["buy(uint256,uint256)"](1, 150_000, { value: 1e9 }));

            await expect(projectMarketplace.connect(buyer2)["buy(uint256,uint256)"](1, 150_000, { value: 1e9 }))
                .to.be.revertedWithCustomError(projectMarketplace, "InvalidBuying");
        });

        it('6.4.5.8. buy token unsuccessfully with indivisible offer', async () => {
            const fixture = await beforeProjectMarketplaceTest({
                listSampleCurrencies: true,
                listSampleProjectToken: true,
                listSampleOffers: true,
                fundERC20ForBuyers: true,
            });
            const { projectMarketplace, seller1, buyer1 } = fixture;
            
            await callTransaction(projectMarketplace.connect(seller1).list(
                1, 50_000, ethers.utils.parseEther("100"), ethers.constants.AddressZero, false
            ));

            const offerId = await projectMarketplace.offerNumber();

            await expect(projectMarketplace.connect(buyer1)["buy(uint256,uint256)"](offerId, 50_000, { value: 1e9 }))
                .to.be.revertedWithCustomError(projectMarketplace, "NotDivisible");
        });

        it('6.4.5.9. buy token unsuccessfully when there is not enough tokens to sell', async () => {
            const fixture = await beforeProjectMarketplaceTest({
                listSampleCurrencies: true,
                listSampleProjectToken: true,
                listSampleOffers: true,
                fundERC20ForBuyers: true,
            });
            const { projectMarketplace, buyer1, buyer2 } = fixture;

            await callTransaction(projectMarketplace.connect(buyer1)["buy(uint256,uint256)"](1, 100_000, { value: 1e9 }));

            await expect(projectMarketplace.connect(buyer2)["buy(uint256,uint256)"](1, 100_000, { value: 1e9 }))
                .to.be.revertedWithCustomError(projectMarketplace, "NotEnoughTokensToSell");
        });

        it('6.4.5.10. buy token unsuccessfully with insufficient native token', async () => {
            const fixture = await beforeProjectMarketplaceTest({
                listSampleCurrencies: true,
                listSampleProjectToken: true,
                listSampleOffers: true,
            });
            const { projectMarketplace, buyer1 } = fixture;

            await expect(projectMarketplace.connect(buyer1)["buy(uint256,uint256)"](1, 100_000))
                .to.be.revertedWithCustomError(projectMarketplace, "InsufficientValue");
        });

        it('6.4.5.11. buy token unsuccessfully when native token transfer to seller failed', async () => {
            const fixture = await beforeProjectMarketplaceTest({
                listSampleCurrencies: true,
                listSampleProjectToken: true,
            });
            const { projectMarketplace, seller1, buyer1, deployer, projectToken } = fixture;
            
            const failReceiver = await deployFailReceiver(deployer, true, false);

            await callTransaction(projectToken.connect(seller1).safeTransferFrom(
                seller1.address,
                failReceiver.address,
                1,
                200_000,
                ethers.utils.toUtf8Bytes("TestToken_1")
            ));

            let data = projectToken.interface.encodeFunctionData("setApprovalForAll", [projectMarketplace.address, true]);
            await callTransaction(failReceiver.call(projectToken.address, data));

            data = projectMarketplace.interface.encodeFunctionData("list", [1, 100_000, 1000, ethers.constants.AddressZero, true]);

            await callTransaction(failReceiver.call(projectMarketplace.address, data));

            await expect(projectMarketplace.connect(buyer1)["buy(uint256,uint256)"](1, 100_000, { value: 1e9 }))
                .to.be.revertedWithCustomError(projectMarketplace, "FailedTransfer");
        });

        it('6.4.5.12. buy token unsuccessfully when native token transfer to royalty receiver failed', async () => {
            const fixture = await beforeProjectMarketplaceTest({
                listSampleCurrencies: true,
                listSampleProjectToken: true,
                listSampleOffers: true,
                fundERC20ForBuyers: true,
            });
            const { projectMarketplace, seller1, buyer1, deployer, projectToken } = fixture;

            const failReceiver = await deployFailReceiver(deployer, true, false);

            await callTransaction(projectToken.updateFeeReceiver(failReceiver.address));

            await expect(projectMarketplace.connect(buyer1)["buy(uint256,uint256)"](1, 100_000, { value: 1e9 }))
                .to.be.revertedWithCustomError(projectMarketplace, "FailedTransfer");
        });

        it('6.4.5.13. buy token unsuccessfully when refund to sender failed', async () => {
            const fixture = await beforeProjectMarketplaceTest({
                listSampleCurrencies: true,
                listSampleProjectToken: true,
                listSampleOffers: true,
                fundERC20ForBuyers: true,
            });
            const { projectMarketplace, deployer } = fixture;

            const failReceiver = await deployFailReceiver(deployer, true, false);

            let data = projectMarketplace.interface.encodeFunctionData("buy(uint256,uint256)", [1, 100_000]);

            await expect(failReceiver.call(projectMarketplace.address, data, { value: 1e9 }))
                .to.be.revertedWithCustomError(projectMarketplace, "FailedRefund");
        });

        it('6.4.5.14. buy token unsuccessfully when this contract is reentered', async () => {
            const fixture = await beforeProjectMarketplaceTest({
                listSampleCurrencies: true,
                listSampleProjectToken: true,
            });
            const { deployer, projectToken, projectMarketplace, buyer1 } = fixture;

            const reentrancy = await deployReentrancyERC1155Holder(deployer);

            await callTransaction(projectToken.mintTo(reentrancy.address, 1, 100_000));

            let data = projectMarketplace.interface.encodeFunctionData("list", [1, 100_000, 1000, ethers.constants.AddressZero, true]);
            await callTransaction(reentrancy.call(projectMarketplace.address, data));

            data = projectToken.interface.encodeFunctionData("setApprovalForAll", [projectMarketplace.address, true]);
            await callTransaction(reentrancy.call(projectToken.address, data));

            await testReentrancy_Marketplace(
                projectMarketplace,
                reentrancy,
                async () => {
                    await expect(projectMarketplace.connect(buyer1)["buy(uint256,uint256)"](1, 100_000, { value: 1e9 }))
                        .to.be.revertedWithCustomError(projectMarketplace, "FailedTransfer");
                },
            );
        });
    });

    describe('6.4.6. safeBuy(uint256, uint256)', async () => {
        it('6.4.6.1. buy token successfully in both native and ERC20', async () => {
            const fixture = await beforeProjectMarketplaceTest({
                listSampleCurrencies: true,
                listSampleProjectToken: true,
            });
            const { mockCurrencyExclusiveRate, seller1, buyer1 } = fixture;

            for (const isERC20 of [false, true]) {
                for (const isExclusive of [false, true]) {
                    if (!isERC20 && isExclusive) {
                        continue;
                    }
                    await testBuyOffer(
                        fixture,
                        mockCurrencyExclusiveRate,
                        LaunchInitialization.PROJECT_TOKEN_RoyaltyRate,
                        isERC20,
                        isExclusive,
                        ethers.BigNumber.from(200_000),
                        ethers.BigNumber.from(100_000),
                        ethers.utils.parseEther("100"),
                        seller1,
                        [{ buyer: buyer1, amount: null }],
                        true,
                        false,
                    )
                }
            }
        });

        it('6.4.6.2. buy token unsuccessfully with invalid offer id', async () => {
            const fixture = await beforeProjectMarketplaceTest({
                listSampleCurrencies: true,
                listSampleProjectToken: true,
                listSampleOffers: true,
                fundERC20ForBuyers: true,
            });
            const { projectMarketplace, buyer1 } = fixture;

            await expect(projectMarketplace.connect(buyer1)["safeBuy(uint256,uint256)"](0, 1, { value: 1e9 }))
                .to.be.revertedWithCustomError(projectMarketplace, "InvalidOfferId");

            await expect(projectMarketplace.connect(buyer1)["safeBuy(uint256,uint256)"](3, 1, { value: 1e9 }))
                .to.be.revertedWithCustomError(projectMarketplace, "InvalidOfferId");
        });

        it('6.4.6.3. buy token unsuccessfully with invalid anchor', async () => {
            const fixture = await beforeProjectMarketplaceTest({
                listSampleCurrencies: true,
                listSampleProjectToken: true,
                listSampleOffers: true,
                fundERC20ForBuyers: true,
            });
            const { projectMarketplace, buyer1, buyer2 } = fixture;

            await expect(projectMarketplace.connect(buyer1)["safeBuy(uint256,uint256)"](1, 2, { value: 1e9 }))
                .to.be.revertedWithCustomError(projectMarketplace, "BadAnchor");

            await expect(projectMarketplace.connect(buyer2)["safeBuy(uint256,uint256)"](2, 1))
                .to.be.revertedWithCustomError(projectMarketplace, "BadAnchor");
        });
    });

    describe('6.4.7. safeBuy(uint256, uint256, uint256)', async () => {
        it('6.4.7.1. buy token successfully in both native and ERC20', async () => {
            const fixture = await beforeProjectMarketplaceTest({
                listSampleCurrencies: true,
                listSampleProjectToken: true,
            });
            const { mockCurrencyExclusiveRate, seller1, buyer1 } = fixture;

            for (const isERC20 of [false, true]) {
                for (const isExclusive of [false, true]) {
                    if (!isERC20 && isExclusive) {
                        continue;
                    }
                    await testBuyOffer(
                        fixture,
                        mockCurrencyExclusiveRate,
                        LaunchInitialization.PROJECT_TOKEN_RoyaltyRate,
                        isERC20,
                        isExclusive,
                        ethers.BigNumber.from(200_000),
                        ethers.BigNumber.from(150_000),
                        ethers.BigNumber.from("120"),
                        seller1,
                        [
                            { buyer: buyer1, amount: ethers.BigNumber.from(100_000) },
                            { buyer: buyer1, amount: ethers.BigNumber.from(50_000) },
                        ],
                        true,
                        true,
                    )
                }
            }
        });

        it('6.4.7.2. buy token unsuccessfully with invalid offer id', async () => {
            const fixture = await beforeProjectMarketplaceTest({
                listSampleCurrencies: true,
                listSampleProjectToken: true,
                listSampleOffers: true,
                fundERC20ForBuyers: true,
            });
            const { projectMarketplace, buyer1 } = fixture;

            await expect(projectMarketplace.connect(buyer1)["safeBuy(uint256,uint256,uint256)"](0, 100_000, 1, { value: 1e9 }))
                .to.be.revertedWithCustomError(projectMarketplace, "InvalidOfferId");

            await expect(projectMarketplace.connect(buyer1)["safeBuy(uint256,uint256,uint256)"](3, 100_000, 1, { value: 1e9 }))
                .to.be.revertedWithCustomError(projectMarketplace, "InvalidOfferId");
        });

        it('6.4.7.3. buy token unsuccessfully with invalid anchor', async () => {
            const fixture = await beforeProjectMarketplaceTest({
                listSampleCurrencies: true,
                listSampleProjectToken: true,
                listSampleOffers: true,
                fundERC20ForBuyers: true,
            });
            const { projectMarketplace, buyer1, buyer2 } = fixture;

            await expect(projectMarketplace.connect(buyer1)["safeBuy(uint256,uint256,uint256)"](1, 100_000, 2, { value: 1e9 }))
                .to.be.revertedWithCustomError(projectMarketplace, "BadAnchor");

            await expect(projectMarketplace.connect(buyer2)["safeBuy(uint256,uint256,uint256)"](2, 100_000, 1))
                .to.be.revertedWithCustomError(projectMarketplace, "BadAnchor");
        });
    });

    describe('6.4.8. cancelOffer(uint256)', async () => {
        it('6.4.8.1. cancel offer successfully by seller', async () => {
            const fixture = await beforeProjectMarketplaceTest({
                listSampleCurrencies: true,
                listSampleProjectToken: true,
                listSampleOffers: true,
                fundERC20ForBuyers: true,
            });
            const { projectMarketplace, seller1 } = fixture;

            let tx = await projectMarketplace.connect(seller1).cancel(1);
            await tx.wait();

            const offer = await projectMarketplace.getOffer(1);
            expect(offer.state).to.equal(ProjectMarketplaceOfferState.Cancelled);

            await expect(tx).to
                .emit(projectMarketplace, "OfferCancellation")
                .withArgs(1);
        });

        it('6.4.8.2. cancel offer successfully by manager', async () => {
            const fixture = await beforeProjectMarketplaceTest({
                listSampleCurrencies: true,
                listSampleProjectToken: true,
                listSampleOffers: true,
                fundERC20ForBuyers: true,
            });
            const { projectMarketplace, manager } = fixture;
            let tx = await projectMarketplace.connect(manager).cancel(1);
            await tx.wait();

            const offer = await projectMarketplace.getOffer(1);
            expect(offer.state).to.equal(ProjectMarketplaceOfferState.Cancelled);

            await expect(tx).to
                .emit(projectMarketplace, "OfferCancellation")
                .withArgs(1);
        });

        it('6.4.8.3. cancel offer unsuccessfully with invalid offer id', async () => {
            const fixture = await beforeProjectMarketplaceTest({
                listSampleCurrencies: true,
                listSampleProjectToken: true,
                listSampleOffers: true,
                fundERC20ForBuyers: true,
            });
            const { projectMarketplace, manager } = fixture;

            await expect(projectMarketplace.connect(manager).cancel(0))
                .to.be.revertedWithCustomError(projectMarketplace, "InvalidOfferId");
            await expect(projectMarketplace.connect(manager).cancel(3))
                .to.be.revertedWithCustomError(projectMarketplace, "InvalidOfferId");
        });

        it('6.4.8.4. cancel offer unsuccessfully by unauthorized user', async () => {
            const fixture = await beforeProjectMarketplaceTest({
                listSampleCurrencies: true,
                listSampleProjectToken: true,
                listSampleOffers: true,
                fundERC20ForBuyers: true,
            });
            const { projectMarketplace, seller2, moderator } = fixture;

            await expect(projectMarketplace.connect(seller2).cancel(1))
                .to.be.revertedWithCustomError(projectMarketplace, "Unauthorized");

            await expect(projectMarketplace.connect(moderator).cancel(1))
                .to.be.revertedWithCustomError(projectMarketplace, "Unauthorized");
        });

        it('6.4.8.5. cancel offer unsuccessfully when offer is already cancelled', async () => {
            const fixture = await beforeProjectMarketplaceTest({
                listSampleCurrencies: true,
                listSampleProjectToken: true,
                listSampleOffers: true,
                fundERC20ForBuyers: true,
            });
            const { projectMarketplace, manager } = fixture;

            await callTransaction(projectMarketplace.connect(manager).cancel(1));
            await expect(projectMarketplace.connect(manager).cancel(1))
                .to.be.revertedWithCustomError(projectMarketplace, "InvalidCancelling");
        });

        it('6.4.8.6. cancel offer unsuccessfully when offer is sold out', async () => {
            const fixture = await beforeProjectMarketplaceTest({
                listSampleCurrencies: true,
                listSampleProjectToken: true,
                listSampleOffers: true,
                fundERC20ForBuyers: true,
            });
            const { projectMarketplace, manager,buyer1 } = fixture;

            await callTransaction(projectMarketplace.connect(buyer1)["safeBuy(uint256,uint256)"](1, 1, { value: 1e9 }));

            await expect(projectMarketplace.connect(manager).cancel(1))
                .to.be.revertedWithCustomError(projectMarketplace, "InvalidCancelling");
        });
    });
});

