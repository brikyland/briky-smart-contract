import { expect } from 'chai';
import { ethers, upgrades } from 'hardhat';
import {
    Admin,
    CommissionToken,
    Currency,
    EstateToken,
    FeeReceiver,
    IERC165Upgradeable__factory,
    IERC2981Upgradeable__factory,
    MockEstateToken,
    MockEstateForger__factory,
    EstateMarketplace,
    MockEstateToken__factory,
    MockEstateForger,
    CommissionToken__factory,
} from '@typechain-types';
import { callTransaction, getBalance, getSignatures, prepareERC20, prepareNativeToken, randomWallet, resetERC20, resetNativeToken, testReentrancy } from '@utils/blockchain';
import { Constant } from '@tests/test.constant';
import { deployAdmin } from '@utils/deployments/common/admin';
import { deployFeeReceiver } from '@utils/deployments/common/feeReceiver';
import { deployCurrency } from '@utils/deployments/common/currency';
import { deployMockEstateToken } from '@utils/deployments/mocks/mockEstateToken';
import { deployCommissionToken } from '@utils/deployments/land/commissionToken';
import { loadFixture, time } from "@nomicfoundation/hardhat-network-helpers";
import { EstateMarketplaceOfferState } from '@utils/enums';
import { MockContract, smock } from '@defi-wonderland/smock';

import {
    callAdmin_AuthorizeManagers,
    callAdmin_AuthorizeModerators,
    callAdmin_DeclareZones,
    callAdmin_UpdateCurrencyRegistries,
} from '@utils/callWithSignatures/admin';
import { BigNumber, Contract, Wallet } from 'ethers';
import { randomInt } from 'crypto';
import { getInterfaceID, randomArrayWithSum, randomBigNumber } from '@utils/utils';
import { OrderedMap } from '@utils/utils';
import { deployEstateMarketplace } from '@utils/deployments/land/estateMarketplace';
import { callEstateToken_AuthorizeTokenizers, callEstateToken_UpdateCommissionToken, callEstateToken_UpdateRoyaltyRate } from '@utils/callWithSignatures/estateToken';
import { callEstateMarketplace_Pause } from '@utils/callWithSignatures/estateMarketplace';
import { deployFailReceiver } from '@utils/deployments/mocks/failReceiver';
import { deployReentrancyERC1155Holder } from '@utils/deployments/mocks/mockReentrancy/reentrancyERC1155Holder';
import { deployReentrancy } from '@utils/deployments/mocks/mockReentrancy/reentrancy';
import { Initialization as LandInitialization } from '@tests/land/test.initialization';

interface EstateMarketplaceFixture {
    admin: Admin;
    feeReceiver: FeeReceiver;
    currency: Currency;
    estateForger: MockContract<MockEstateForger>;
    estateToken: MockContract<MockEstateToken>;
    commissionToken: MockContract<CommissionToken>;
    estateMarketplace: EstateMarketplace;

    deployer: any;
    admins: any[];
    seller1: any;
    seller2: any;
    buyer1: any;
    buyer2: any;
    commissionReceiver: any;
    manager: any;
    moderator: any;
    mockCurrencyExclusiveRate: BigNumber;
}

async function testReentrancy_Marketplace(
    estateMarketplace: EstateMarketplace,
    reentrancyContract: Contract,
    assertion: any,
) {
    let data = [
        estateMarketplace.interface.encodeFunctionData("safeBuy(uint256,uint256)", [0, 0]),
        estateMarketplace.interface.encodeFunctionData("safeBuy(uint256,uint256,uint256)", [0, 0, 0]),
        estateMarketplace.interface.encodeFunctionData("cancel", [0]),
    ];

    await testReentrancy(
        reentrancyContract,
        estateMarketplace,
        data,
        assertion,
    );
}

describe('5. EstateMarketplace', async () => {
    async function estateMarketplaceFixture(): Promise<EstateMarketplaceFixture> {
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
        await currency.setExclusiveDiscount(mockCurrencyExclusiveRate, Constant.COMMON_RATE_DECIMALS);

        const SmockEstateTokenFactory = await smock.mock<MockEstateToken__factory>('MockEstateToken');
        const estateToken = await SmockEstateTokenFactory.deploy();
        await callTransaction(estateToken.initialize(
            admin.address,
            feeReceiver.address,
            LandInitialization.ESTATE_TOKEN_BaseURI,
            LandInitialization.ESTATE_TOKEN_RoyaltyRate,
        ));        

        const SmockCommissionTokenFactory = await smock.mock<CommissionToken__factory>('CommissionToken');
        const commissionToken = await SmockCommissionTokenFactory.deploy();
        await callTransaction(commissionToken.initialize(
            admin.address,
            estateToken.address,
            feeReceiver.address,
            LandInitialization.COMMISSION_TOKEN_Name,
            LandInitialization.COMMISSION_TOKEN_Symbol,
            LandInitialization.COMMISSION_TOKEN_BaseURI,
            LandInitialization.COMMISSION_TOKEN_CommissionRate,
            LandInitialization.COMMISSION_TOKEN_RoyaltyRate,
        ));

        const SmockEstateForgerFactory = await smock.mock<MockEstateForger__factory>('MockEstateForger');
        const estateForger = await SmockEstateForgerFactory.deploy();
        await callTransaction(estateForger.initialize(
            admin.address,
            estateToken.address,
            commissionToken.address,
            feeReceiver.address,
            LandInitialization.ESTATE_FORGER_FeeRate,
            LandInitialization.ESTATE_FORGER_BaseMinUnitPrice,
            LandInitialization.ESTATE_FORGER_BaseMaxUnitPrice,
        ));

        const estateMarketplace = await deployEstateMarketplace(
            deployer.address,
            admin.address,
            estateToken.address,
            commissionToken.address,
        ) as EstateMarketplace;

        return {
            admin,
            feeReceiver,
            currency,
            estateForger,
            estateToken,
            commissionToken,
            estateMarketplace,
            deployer,
            admins,
            seller1,
            seller2,
            buyer1,
            buyer2,
            commissionReceiver,
            manager,
            moderator,
            mockCurrencyExclusiveRate,
        };
    };

    async function beforeEstateMarketplaceTest({
        listSampleCurrencies = false,
        listSampleEstateToken = false,
        listSampleOffers = false,
        fundERC20ForBuyers = false,
        pause = false,
    } = {}): Promise<EstateMarketplaceFixture> {
        const fixture = await loadFixture(estateMarketplaceFixture);

        const { admin, admins, currency, estateToken, commissionToken, estateMarketplace, seller1, seller2, buyer1, buyer2, estateForger, commissionReceiver, manager, moderator } = fixture;

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

        await callEstateToken_AuthorizeTokenizers(
            estateToken,
            admins,
            [estateForger.address],
            true,
            await admin.nonce()
        );
        await callEstateToken_UpdateCommissionToken(
            estateToken,
            admins,
            commissionToken.address,
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
        if (listSampleEstateToken) {
            currentTimestamp += 1000;

            await time.setNextBlockTimestamp(currentTimestamp);

            await estateForger.call(estateToken.address, estateToken.interface.encodeFunctionData('tokenizeEstate', [
                0,
                ethers.utils.formatBytes32String("TestZone"),
                10,
                "Token1_URI",
                currentTimestamp + 1e8,
                3,
                ethers.constants.AddressZero,
            ]));

            await estateForger.call(estateToken.address, estateToken.interface.encodeFunctionData('tokenizeEstate', [
                0,
                ethers.utils.formatBytes32String("TestZone"),
                10,
                "Token2_URI",
                currentTimestamp + 2e8,
                3,
                commissionReceiver.address,
            ]));

            estateToken.isAvailable.whenCalledWith(1).returns(true);
            estateToken.isAvailable.whenCalledWith(2).returns(true);

            await estateToken.mint(seller1.address, 1, 200_000);
            await estateToken.mint(seller2.address, 1, 300_000);

            await estateToken.mint(seller1.address, 2, 200);
            await estateToken.mint(seller2.address, 2, 300);
        }

        if (listSampleOffers) {
            await callTransaction(estateMarketplace.connect(seller1).list(
                1, 150_000, 100000, ethers.constants.AddressZero, true
            ));
            await callTransaction(estateMarketplace.connect(seller2).list(
                2, 200, 500000, currency.address, true
            ));

            await callTransaction(estateToken.connect(seller1).setApprovalForAll(estateMarketplace.address, true));
            await callTransaction(estateToken.connect(seller2).setApprovalForAll(estateMarketplace.address, true));
        }

        if (fundERC20ForBuyers) {
            await prepareERC20(
                currency,
                [buyer1, buyer2],
                [estateMarketplace],
                1e9,
            )
        }

        if (pause) {
            await callEstateMarketplace_Pause(estateMarketplace, admins, await admin.nonce());
        }

        return {
            ...fixture,
        }
    }

    describe('5.1. initialize(address, address, address)', async () => {
        it('5.1.1. Deploy successfully', async () => {
            const { admin, estateToken, commissionToken, estateMarketplace } = await beforeEstateMarketplaceTest();

            const paused = await estateMarketplace.paused();
            expect(paused).to.equal(false);

            const adminAddress = await estateMarketplace.admin();
            expect(adminAddress).to.equal(admin.address);

            const estateTokenAddress = await estateMarketplace.estateToken();
            expect(estateTokenAddress).to.equal(estateToken.address);

            const commissionTokenAddress = await estateMarketplace.commissionToken();
            expect(commissionTokenAddress).to.equal(commissionToken.address);

            const offerNumber = await estateMarketplace.offerNumber();
            expect(offerNumber).to.equal(0);
        });
    });

    // TODO: Andy
    describe('5.2. pause(bytes[])', async () => {

    });

    // TODO: Andy
    describe('5.3. unpause(bytes[])', async () => {

    });

    describe('5.4. getOffer(uint256)', async () => {
        it('5.4.1. return successfully with valid offer id', async () => {
            const { estateMarketplace, estateToken, currency, seller1, seller2 } = await beforeEstateMarketplaceTest({
                listSampleCurrencies: true,
                listSampleEstateToken: true,
                listSampleOffers: true,
            });

            await expect(estateMarketplace.getOffer(1))
                .to.not.be.reverted;

            await expect(estateMarketplace.getOffer(2))
                .to.not.be.reverted;
        });

        it('5.4.2. revert with invalid offer id', async () => {
            const { estateMarketplace } = await beforeEstateMarketplaceTest({

            });

            await expect(estateMarketplace.getOffer(0))
                .to.be.revertedWithCustomError(estateMarketplace, 'InvalidOfferId');

            await expect(estateMarketplace.getOffer(3))
                .to.be.revertedWithCustomError(estateMarketplace, 'InvalidOfferId');
        });
    });

    describe('5.5. list(uint256, uint256, uint256, address, bool)', async () => {
        it('5.5.1. list token successfully', async () => {
            const { estateMarketplace, estateToken, currency, seller1, seller2 } = await beforeEstateMarketplaceTest({
                listSampleCurrencies: true,
                listSampleEstateToken: true,
            });
            let tx = await estateMarketplace.connect(seller1).list(1, 150_000, 100000, ethers.constants.AddressZero, false);
            await tx.wait();

            expect(tx).to
                .emit(estateMarketplace, 'NewOffer')
                .withArgs(1, 1, seller1.address, 150_000, 100000, ethers.constants.AddressZero, false);

            expect(await estateMarketplace.offerNumber()).to.equal(1);

            let offer = await estateMarketplace.getOffer(1);
            expect(offer.tokenId).to.equal(1);
            expect(offer.sellingAmount).to.equal(150_000);
            expect(offer.soldAmount).to.equal(0);
            expect(offer.unitPrice).to.equal(100000);
            expect(offer.currency).to.equal(ethers.constants.AddressZero);
            expect(offer.isDivisible).to.equal(false);
            expect(offer.state).to.equal(EstateMarketplaceOfferState.Selling);
            expect(offer.seller).to.equal(seller1.address);

            tx = await estateMarketplace.connect(seller2).list(2, 200, 500000, currency.address, true);
            await tx.wait();

            expect(tx).to
                .emit(estateMarketplace, 'NewOffer')
                .withArgs(2, 2, seller2.address, 200, 500000, currency.address, true);

            expect(await estateMarketplace.offerNumber()).to.equal(2);

            offer = await estateMarketplace.getOffer(2);
            expect(offer.tokenId).to.equal(2);
            expect(offer.sellingAmount).to.equal(200);
            expect(offer.soldAmount).to.equal(0);
            expect(offer.unitPrice).to.equal(500000);
            expect(offer.currency).to.equal(currency.address);
            expect(offer.isDivisible).to.equal(true);
            expect(offer.state).to.equal(EstateMarketplaceOfferState.Selling);
            expect(offer.seller).to.equal(seller2.address);
        });

        it('5.5.2. list token unsuccessfully when paused', async () => {
            const fixture = await beforeEstateMarketplaceTest({
                listSampleCurrencies: true,
                listSampleEstateToken: true,
                pause: true,
            });
            const { estateMarketplace, seller1 } = fixture;

            await expect(estateMarketplace.connect(seller1).list(1, 100, 1000, ethers.constants.AddressZero, false))
                .to.be.revertedWith('Pausable: paused');
        });

        it('5.5.3. list token unsuccessfully with invalid token id', async () => {
            const fixture = await beforeEstateMarketplaceTest({
                listSampleCurrencies: true,
                listSampleEstateToken: true,
            });
            const { estateMarketplace, seller1 } = fixture;

            await expect(estateMarketplace.connect(seller1).list(0, 100, 1000, ethers.constants.AddressZero, false))
                .to.be.revertedWithCustomError(estateMarketplace, 'InvalidTokenId');

            await expect(estateMarketplace.connect(seller1).list(3, 100, 1000, ethers.constants.AddressZero, false))
                .to.be.revertedWithCustomError(estateMarketplace, 'InvalidTokenId');
        });

        it('5.5.4. list token unsuccessfully with zero unit price', async () => {
            const fixture = await beforeEstateMarketplaceTest({
                listSampleCurrencies: true,
                listSampleEstateToken: true,
            });
            const { estateMarketplace, seller1 } = fixture;

            await expect(estateMarketplace.connect(seller1).list(1, 100, 0, ethers.constants.AddressZero, false))
                .to.be.revertedWithCustomError(estateMarketplace, 'InvalidUnitPrice');
        });

        it('5.5.5. list token unsuccessfully with invalid currency', async () => {
            const fixture = await beforeEstateMarketplaceTest({
                listSampleEstateToken: true,
            });
            const { estateMarketplace, seller1 } = fixture;

            await expect(estateMarketplace.connect(seller1).list(1, 100, 1000, ethers.constants.AddressZero, false))
                .to.be.revertedWithCustomError(estateMarketplace, 'InvalidCurrency');
        });

        it('5.5.6. list token unsuccessfully with zero selling amount', async () => {
            const fixture = await beforeEstateMarketplaceTest({
                listSampleCurrencies: true,
                listSampleEstateToken: true,
            });
            const { estateMarketplace, seller1 } = fixture;

            await expect(estateMarketplace.connect(seller1).list(1, 0, 1000, ethers.constants.AddressZero, false))
                .to.be.revertedWithCustomError(estateMarketplace, 'InvalidSellingAmount');
        });

        it('5.5.7. list token unsuccessfully with selling amount exceeding owned amount', async () => {
            const fixture = await beforeEstateMarketplaceTest({
                listSampleCurrencies: true,
                listSampleEstateToken: true,
            });
            const { estateMarketplace, seller1 } = fixture;

            await expect(estateMarketplace.connect(seller1).list(1, 200_001, 1000, ethers.constants.AddressZero, false))
                .to.be.revertedWithCustomError(estateMarketplace, 'InvalidSellingAmount');
        });
    });

    describe('5.6. safeBuy(uint256, uint256)', async () => {
        it('5.6.1. buy token successfully', async () => {
            async function testcase1(fixture: EstateMarketplaceFixture) {
                const { estateToken, estateMarketplace, seller1, buyer1, feeReceiver } = fixture;

                let amount = (await estateMarketplace.getOffer(1)).sellingAmount;
                let decimals = (await estateToken.getEstate(1)).decimals;
                let unitPrice = (await estateMarketplace.getOffer(1)).unitPrice;
                let value = unitPrice.mul(amount).div(ethers.BigNumber.from(10).pow(decimals));
                let royaltyReceiver = feeReceiver.address;
                let royaltyAmount = value.mul(LandInitialization.ESTATE_TOKEN_RoyaltyRate).div(Constant.COMMON_RATE_MAX_FRACTION);

                let commissionReceiver = ethers.constants.AddressZero;
                let commissionAmount = 0;
                let total = value.add(royaltyAmount);

                let buyer1Balance = await ethers.provider.getBalance(buyer1.address);
                let seller1Balance = await ethers.provider.getBalance(seller1.address);
                let buyer1TokenBalance = await estateToken.balanceOf(buyer1.address, 1);
                let seller1TokenBalance = await estateToken.balanceOf(seller1.address, 1);
                let royaltyReceiverBalance = await ethers.provider.getBalance(royaltyReceiver);
                let commissionReceiverBalance = await ethers.provider.getBalance(commissionReceiver);

                let tx = await estateMarketplace.connect(buyer1)["safeBuy(uint256,uint256)"](1, 1, { value: 1e9 });
                let receipt = await tx.wait();

                let gasFee = receipt.gasUsed.mul(receipt.effectiveGasPrice);

                await expect(tx).to
                    .emit(estateMarketplace, 'OfferSale')
                    .withArgs(1, buyer1.address, amount, value, royaltyReceiver, royaltyAmount, commissionReceiver, commissionAmount);

                let offer = await estateMarketplace.getOffer(1);
                expect(offer.tokenId).to.equal(1);
                expect(offer.sellingAmount).to.equal(amount);
                expect(offer.soldAmount).to.equal(amount);
                expect(offer.unitPrice).to.equal(unitPrice);
                expect(offer.currency).to.equal(ethers.constants.AddressZero);
                expect(offer.isDivisible).to.equal(true);
                expect(offer.state).to.equal(EstateMarketplaceOfferState.Sold);
                expect(offer.seller).to.equal(seller1.address);

                expect(await ethers.provider.getBalance(seller1.address)).to.equal(seller1Balance.add(value));
                expect(await ethers.provider.getBalance(buyer1.address)).to.equal(buyer1Balance.sub(gasFee).sub(total));
                expect(await ethers.provider.getBalance(royaltyReceiver)).to.equal(royaltyReceiverBalance.add(royaltyAmount));
                expect(await ethers.provider.getBalance(commissionReceiver)).to.equal(commissionReceiverBalance.add(commissionAmount));

                expect(await estateToken.balanceOf(seller1.address, 1)).to.equal(seller1TokenBalance.sub(amount));
                expect(await estateToken.balanceOf(buyer1.address, 1)).to.equal(buyer1TokenBalance.add(amount));
            }

            async function testcase2(fixture: EstateMarketplaceFixture) {
                const { estateToken, estateMarketplace, seller2, buyer2, feeReceiver, currency, commissionReceiver } = fixture;

                let amount = (await estateMarketplace.getOffer(2)).sellingAmount;
                let decimals = (await estateToken.getEstate(2)).decimals;
                let unitPrice = (await estateMarketplace.getOffer(2)).unitPrice;
                let value = unitPrice.mul(amount).div(ethers.BigNumber.from(10).pow(decimals));
                let royaltyReceiver = feeReceiver.address;
                let royaltyAmount = value.mul(LandInitialization.ESTATE_TOKEN_RoyaltyRate).div(Constant.COMMON_RATE_MAX_FRACTION);
                royaltyAmount = royaltyAmount.sub(royaltyAmount.mul(fixture.mockCurrencyExclusiveRate).div(Constant.COMMON_RATE_MAX_FRACTION));

                let commissionAmount = royaltyAmount.mul(LandInitialization.COMMISSION_TOKEN_CommissionRate).div(Constant.COMMON_RATE_MAX_FRACTION);
                let total = value.add(royaltyAmount);

                let buyer2Balance = await currency.balanceOf(buyer2.address);
                let seller2Balance = await currency.balanceOf(seller2.address);
                let royaltyReceiverBalance = await currency.balanceOf(royaltyReceiver);
                let commissionReceiverBalance = await currency.balanceOf(commissionReceiver.address);
                let buyer2TokenBalance = await estateToken.balanceOf(buyer2.address, 2);
                let seller2TokenBalance = await estateToken.balanceOf(seller2.address, 2);

                let tx = await estateMarketplace.connect(buyer2)["safeBuy(uint256,uint256)"](2, 2);
                await tx.wait();

                let offer = await estateMarketplace.getOffer(2);
                expect(offer.tokenId).to.equal(2);
                expect(offer.sellingAmount).to.equal(amount);
                expect(offer.soldAmount).to.equal(amount);
                expect(offer.unitPrice).to.equal(unitPrice);
                expect(offer.currency).to.equal(currency.address);
                expect(offer.isDivisible).to.equal(true);
                expect(offer.state).to.equal(EstateMarketplaceOfferState.Sold);
                expect(offer.seller).to.equal(seller2.address);

                await expect(tx).to
                    .emit(estateMarketplace, 'OfferSale')
                    .withArgs(2, buyer2.address, amount, value, royaltyReceiver, royaltyAmount, commissionReceiver.address, commissionAmount);

                expect(await currency.balanceOf(buyer2.address)).to.equal(buyer2Balance.sub(total));
                expect(await currency.balanceOf(seller2.address)).to.equal(seller2Balance.add(value));
                expect(await currency.balanceOf(royaltyReceiver)).to.equal(royaltyReceiverBalance.add(royaltyAmount).sub(commissionAmount));
                expect(await currency.balanceOf(commissionReceiver.address)).to.equal(commissionReceiverBalance.add(commissionAmount));

                expect(await estateToken.balanceOf(seller2.address, 2)).to.equal(seller2TokenBalance.sub(amount));
                expect(await estateToken.balanceOf(buyer2.address, 2)).to.equal(buyer2TokenBalance.add(amount));
            }

            const fixture = await beforeEstateMarketplaceTest({
                listSampleCurrencies: true,
                listSampleEstateToken: true,
                listSampleOffers: true,
                fundERC20ForBuyers: true,
            });
            await testcase1(fixture);
            await testcase2(fixture);
        });

        async function testBuyOffer(
            fixture: EstateMarketplaceFixture,
            mockCurrencyExclusiveRate: BigNumber,
            commissionRate: BigNumber,
            estateTokenRoyaltyRate: BigNumber,
            isERC20: boolean,
            isExclusive: boolean,
            decimals: number,
            initialAmount: BigNumber,
            offerAmount: BigNumber,
            unitPrice: BigNumber,
            hasCommissionReceiver: boolean
        ) {
            const { deployer, estateForger, estateToken, estateMarketplace, seller1, buyer1, feeReceiver, commissionToken, commissionReceiver, admins, admin } = fixture;

            await callEstateToken_UpdateRoyaltyRate(estateToken, admins, estateTokenRoyaltyRate, await admin.nonce());

            const currentEstateId = (await estateToken.estateNumber()).add(1);
            const currentOfferId = (await estateMarketplace.offerNumber()).add(1);

            commissionToken.setVariable("commissionRate", commissionRate);

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
            let commissionReceiverAddress = (hasCommissionReceiver) ? commissionReceiver.address : ethers.constants.AddressZero;

            await callAdmin_UpdateCurrencyRegistries(
                admin,
                admins,
                [newCurrencyAddress],
                [true],
                [isExclusive],
                await admin.nonce(),
            );

            let currentTimestamp = await time.latest();

            const seller = seller1;
            const buyer = buyer1;

            await callTransaction(estateForger.call(estateToken.address, estateToken.interface.encodeFunctionData("tokenizeEstate", [
                0,
                ethers.utils.formatBytes32String("TestZone"),
                0,
                `Token_${currentEstateId}`,
                currentTimestamp + 1e8,
                decimals,
                commissionReceiverAddress,
            ])));
            await callTransaction(estateToken.mint(seller.address, currentEstateId, initialAmount));

            await callTransaction(estateMarketplace.connect(seller).list(
                currentEstateId,
                offerAmount,
                unitPrice,
                newCurrencyAddress,
                true,
            ));

            let value = offerAmount.mul(unitPrice).div(ethers.BigNumber.from(10).pow(decimals));
            let royaltyReceiver = feeReceiver.address;
            let royaltyAmount = value.mul(estateTokenRoyaltyRate).div(Constant.COMMON_RATE_MAX_FRACTION);
            if (isExclusive) {
                royaltyAmount = royaltyAmount.sub(royaltyAmount.mul(mockCurrencyExclusiveRate).div(Constant.COMMON_RATE_MAX_FRACTION));
            }
            let commissionAmount = ethers.BigNumber.from(0);
            if (hasCommissionReceiver) {
                commissionAmount = royaltyAmount.mul(commissionRate).div(Constant.COMMON_RATE_MAX_FRACTION);
            }
            let total = value.add(royaltyAmount);

            let ethValue = ethers.BigNumber.from(0);
            await prepareNativeToken(ethers.provider, deployer, [buyer], ethers.utils.parseEther("1.0"));
            if (isERC20) {
                await prepareERC20(newCurrency!, [buyer], [estateMarketplace], total);
            } else {
                ethValue = total;
                await prepareNativeToken(ethers.provider, deployer, [buyer], total);
            }

            await callTransaction(estateToken.connect(seller).setApprovalForAll(estateMarketplace.address, true));

            let initBuyerBalance = await getBalance(ethers.provider, buyer.address, newCurrency);
            let initSellerBalance = await getBalance(ethers.provider, seller.address, newCurrency);
            let initFeeReceiverBalance = await getBalance(ethers.provider, feeReceiver.address, newCurrency);
            let initCommissionReceiverBalance = await getBalance(ethers.provider, commissionReceiverAddress, newCurrency);

            let tx = await estateMarketplace.connect(buyer)["safeBuy(uint256,uint256)"](
                currentOfferId,
                currentEstateId,
                { value: ethValue }
            );
            const receipt = await tx.wait();

            let expectedBuyerBalance = initBuyerBalance.sub(total);
            let expectedSellerBalance = initSellerBalance.add(value);
            let expectedFeeReceiverBalance = initFeeReceiverBalance.add(royaltyAmount.sub(commissionAmount));
            let expectedCommissionReceiverBalance = initCommissionReceiverBalance.add(commissionAmount);

            if (!isERC20) {
                const gasFee = receipt.gasUsed.mul(receipt.effectiveGasPrice);
                expectedBuyerBalance = expectedBuyerBalance.sub(gasFee);
            }

            await expect(tx).to
                .emit(estateMarketplace, 'OfferSale')
                .withArgs(currentOfferId, buyer.address, offerAmount, value, royaltyReceiver, royaltyAmount, commissionReceiverAddress, commissionAmount);

            let offer = await estateMarketplace.getOffer(currentOfferId);
            expect(offer.tokenId).to.equal(currentEstateId);
            expect(offer.sellingAmount).to.equal(offerAmount);
            expect(offer.soldAmount).to.equal(offerAmount);
            expect(offer.unitPrice).to.equal(unitPrice);
            expect(offer.currency).to.equal(newCurrencyAddress);
            expect(offer.isDivisible).to.equal(true);
            expect(offer.state).to.equal(EstateMarketplaceOfferState.Sold);
            expect(offer.seller).to.equal(seller.address);

            expect(await getBalance(ethers.provider, buyer.address, newCurrency)).to.equal(expectedBuyerBalance);
            expect(await getBalance(ethers.provider, seller.address, newCurrency)).to.equal(expectedSellerBalance);
            expect(await getBalance(ethers.provider, feeReceiver.address, newCurrency)).to.equal(expectedFeeReceiverBalance);
            if (hasCommissionReceiver) {
                expect(await getBalance(ethers.provider, commissionReceiverAddress, newCurrency)).to.equal(expectedCommissionReceiverBalance);
            }

            expect(await estateToken.balanceOf(seller.address, currentEstateId)).to.equal(initialAmount.sub(offerAmount));
            expect(await estateToken.balanceOf(buyer.address, currentEstateId)).to.equal(offerAmount);

            let walletsToReset = [seller, buyer, feeReceiver];
            if (hasCommissionReceiver) {
                walletsToReset.push(commissionReceiver);
            }
            if (isERC20) {
                await resetERC20(newCurrency!, walletsToReset);
            } else {
                await resetNativeToken(ethers.provider, walletsToReset);
                await prepareNativeToken(ethers.provider, deployer, [seller, buyer], ethers.utils.parseEther("1.0"));
            }
        }

        it('5.6.2. buy token successfully (automatic test)', async () => {
            const fixture = await beforeEstateMarketplaceTest({
                listSampleCurrencies: true,
                listSampleEstateToken: true,
            });
            const { mockCurrencyExclusiveRate } = fixture;
    
            await testBuyOffer(
                fixture,
                mockCurrencyExclusiveRate,
                LandInitialization.COMMISSION_TOKEN_CommissionRate,
                LandInitialization.ESTATE_TOKEN_RoyaltyRate,
                false,
                false,
                3,
                ethers.BigNumber.from(200_000),
                ethers.BigNumber.from(100_000),
                ethers.BigNumber.from(100000),
                false,
            )

            await testBuyOffer(
                fixture,
                mockCurrencyExclusiveRate,
                LandInitialization.COMMISSION_TOKEN_CommissionRate,
                LandInitialization.ESTATE_TOKEN_RoyaltyRate,
                true,
                true,
                0,
                ethers.BigNumber.from(300),
                ethers.BigNumber.from(200),
                ethers.BigNumber.from(500),
                true,
            )
        });

        it('5.6.3. buy token successfully (all flows)', async () => {
            const fixture = await beforeEstateMarketplaceTest({
                listSampleCurrencies: true,
                listSampleEstateToken: true,
            });
            const { mockCurrencyExclusiveRate } = fixture;

            for (const comReceiver of [false, true]) {
                for (const isERC20 of [false, true]) {
                    for (const isExclusive of [false, true]) {
                        if (!isERC20 && isExclusive) {
                            continue;
                        }
                        await testBuyOffer(
                            fixture,
                            mockCurrencyExclusiveRate,
                            LandInitialization.COMMISSION_TOKEN_CommissionRate,
                            LandInitialization.ESTATE_TOKEN_RoyaltyRate,
                            isERC20,
                            isExclusive,
                            3,
                            ethers.BigNumber.from(200_000),
                            ethers.BigNumber.from(100_000),
                            ethers.BigNumber.from(100000),
                            comReceiver,
                        )
                    }
                }
            }
        });

        it('5.6.4. buy token successfully with very large amount (all flows)', async () => {
            const fixture = await beforeEstateMarketplaceTest({
                listSampleCurrencies: true,
                listSampleEstateToken: true,
            });

            for (const comReceiver of [false, true]) {
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
                            ethers.utils.parseEther("0.99"),
                            isERC20,
                            isExclusive,
                            18,
                            amount,
                            amount,
                            base,
                            comReceiver,
                        )
                    }
                }
            }
        });

        it('5.6.5. buy token unsuccessfully when paused', async () => {
            const fixture = await beforeEstateMarketplaceTest({
                listSampleCurrencies: true,
                listSampleEstateToken: true,
                listSampleOffers: true,
                fundERC20ForBuyers: true,
                pause: true,
            });
            const { estateMarketplace, buyer1 } = fixture;

            await expect(estateMarketplace.connect(buyer1)["safeBuy(uint256,uint256)"](1, 1, { value: 1e9 }))
                .to.be.revertedWith("Pausable: paused");
        });

        it('5.6.7. buy token unsuccessfully with invalid offer id', async () => {
            const fixture = await beforeEstateMarketplaceTest({
                listSampleCurrencies: true,
                listSampleEstateToken: true,
                listSampleOffers: true,
                fundERC20ForBuyers: true,
            });
            const { estateMarketplace, buyer1 } = fixture;

            await expect(estateMarketplace.connect(buyer1)["safeBuy(uint256,uint256)"](0, 1, { value: 1e9 }))
                .to.be.revertedWithCustomError(estateMarketplace, "InvalidOfferId");

            await expect(estateMarketplace.connect(buyer1)["safeBuy(uint256,uint256)"](3, 1, { value: 1e9 }))
                .to.be.revertedWithCustomError(estateMarketplace, "InvalidOfferId");
        });

        it('5.6.8. buy token unsuccessfully when seller buy their own token', async () => {
            const fixture = await beforeEstateMarketplaceTest({
                listSampleCurrencies: true,
                listSampleEstateToken: true,
                listSampleOffers: true,
                fundERC20ForBuyers: true,
            });
            const { estateMarketplace, seller1, seller2 } = fixture;

            await expect(estateMarketplace.connect(seller1)["safeBuy(uint256,uint256)"](1, 1, { value: 1e9 }))
                .to.be.revertedWithCustomError(estateMarketplace, "InvalidBuying");

            await expect(estateMarketplace.connect(seller2)["safeBuy(uint256,uint256)"](2, 2))
                .to.be.revertedWithCustomError(estateMarketplace, "InvalidBuying");
        });

        it('5.6.8. buy token unsuccessfully with invalid anchor', async () => {
            const fixture = await beforeEstateMarketplaceTest({
                listSampleCurrencies: true,
                listSampleEstateToken: true,
                listSampleOffers: true,
                fundERC20ForBuyers: true,
            });
            const { estateMarketplace, buyer1, buyer2 } = fixture;

            await expect(estateMarketplace.connect(buyer1)["safeBuy(uint256,uint256)"](1, 2, { value: 1e9 }))
                .to.be.revertedWithCustomError(estateMarketplace, "BadAnchor");

            await expect(estateMarketplace.connect(buyer2)["safeBuy(uint256,uint256)"](2, 1))
                .to.be.revertedWithCustomError(estateMarketplace, "BadAnchor");
        });

        it('5.6.9. buy token unsuccessfully when offer is not selling', async () => {
            const fixture = await beforeEstateMarketplaceTest({
                listSampleCurrencies: true,
                listSampleEstateToken: true,
                listSampleOffers: true,
                fundERC20ForBuyers: true,
            });
            const { estateMarketplace, buyer1, buyer2 } = fixture;

            await callTransaction(estateMarketplace.connect(buyer1)["safeBuy(uint256,uint256)"](1, 1, { value: 1e9 }));

            await expect(estateMarketplace.connect(buyer2)["safeBuy(uint256,uint256)"](1, 1, { value: 1e9 }))
                .to.be.revertedWithCustomError(estateMarketplace, "InvalidAmount");
        });

        it('5.6.10. buy token unsuccessfully with insufficient native token', async () => {
            const fixture = await beforeEstateMarketplaceTest({
                listSampleCurrencies: true,
                listSampleEstateToken: true,
                listSampleOffers: true,
            });
            const { estateMarketplace, buyer1 } = fixture;

            await expect(estateMarketplace.connect(buyer1)["safeBuy(uint256,uint256)"](1, 1))
                .to.be.revertedWithCustomError(estateMarketplace, "InsufficientValue");
        });

        it('5.6.11. buy token unsuccessfully when native token transfer to seller failed', async () => {
            const fixture = await beforeEstateMarketplaceTest({
                listSampleCurrencies: true,
                listSampleEstateToken: true,
            });
            const { estateMarketplace, seller1, buyer1, deployer, estateToken } = fixture;
            
            const failReceiver = await deployFailReceiver(deployer);

            await callTransaction(estateToken.connect(seller1).safeTransferFrom(
                seller1.address,
                failReceiver.address,
                1,
                200_000,
                ethers.utils.toUtf8Bytes("TestToken_1")
            ));

            let data = estateToken.interface.encodeFunctionData("setApprovalForAll", [estateMarketplace.address, true]);
            await callTransaction(failReceiver.call(estateToken.address, data));

            data = estateMarketplace.interface.encodeFunctionData("list", [1, 100_000, 1000, ethers.constants.AddressZero, true]);

            await callTransaction(failReceiver.call(estateMarketplace.address, data));

            await expect(estateMarketplace.connect(buyer1)["safeBuy(uint256,uint256)"](1, 1, { value: 1e9 }))
                .to.be.revertedWithCustomError(estateMarketplace, "FailedTransfer");
        });

        it('5.6.12. buy token unsuccessfully when native token transfer to royalty receiver failed', async () => {
            const fixture = await beforeEstateMarketplaceTest({
                listSampleCurrencies: true,
                listSampleEstateToken: true,
                listSampleOffers: true,
                fundERC20ForBuyers: true,
            });
            const { estateMarketplace, seller1, buyer1, deployer, estateToken } = fixture;

            const failReceiver = await deployFailReceiver(deployer);

            await estateToken.updateFeeReceiver(failReceiver.address);

            await expect(estateMarketplace.connect(buyer1)["safeBuy(uint256,uint256)"](1, 1, { value: 1e9 }))
                .to.be.revertedWithCustomError(estateMarketplace, "FailedTransfer");
        });

        it('5.6.13. buy token unsuccessfully when native token transfer to commission receiver failed', async () => {
            const fixture = await beforeEstateMarketplaceTest({
                listSampleCurrencies: true,
                listSampleEstateToken: true,
            });
            const { estateMarketplace, seller1, buyer1, deployer, estateToken, commissionToken, commissionReceiver } = fixture;

            const failReceiver = await deployFailReceiver(deployer);

            await callTransaction(commissionToken.connect(commissionReceiver).transferFrom(
                commissionReceiver.address,
                failReceiver.address,
                2,
            ));

            await callTransaction(estateMarketplace.connect(seller1).list(2, 200, 500000, ethers.constants.AddressZero, true));
            await callTransaction(estateToken.connect(seller1).setApprovalForAll(estateMarketplace.address, true));

            const offerId = await estateMarketplace.offerNumber();

            await expect(estateMarketplace.connect(buyer1)["safeBuy(uint256,uint256)"](offerId, 2, { value: 1e9 }))
                .to.be.revertedWithCustomError(estateMarketplace, "FailedTransfer");
        });

        it('5.6.14. buy token unsuccessfully when refund to sender failed', async () => {
            const fixture = await beforeEstateMarketplaceTest({
                listSampleCurrencies: true,
                listSampleEstateToken: true,
                listSampleOffers: true,
                fundERC20ForBuyers: true,
            });
            const { estateMarketplace, deployer } = fixture;

            const failReceiver = await deployFailReceiver(deployer);

            let data = estateMarketplace.interface.encodeFunctionData("safeBuy(uint256,uint256)", [1, 1]);

            await expect(failReceiver.call(estateMarketplace.address, data, { value: 1e9 }))
                .to.be.revertedWithCustomError(estateMarketplace, "FailedRefund");
        });

        it('5.6.15. buy token unsuccessfully when this contract is reentered', async () => {
            const fixture = await beforeEstateMarketplaceTest({
                listSampleCurrencies: true,
                listSampleEstateToken: true,
            });
            const { deployer, estateToken, estateMarketplace, buyer1 } = fixture;

            const reentrancy = await deployReentrancyERC1155Holder(deployer);

            await callTransaction(estateToken.mint(reentrancy.address, 1, 100_000));

            let data = estateMarketplace.interface.encodeFunctionData("list", [1, 100_000, 1000, ethers.constants.AddressZero, true]);
            await callTransaction(reentrancy.call(estateMarketplace.address, data));

            data = estateToken.interface.encodeFunctionData("setApprovalForAll", [estateMarketplace.address, true]);
            await callTransaction(reentrancy.call(estateToken.address, data));

            await testReentrancy_Marketplace(
                estateMarketplace,
                reentrancy,
                expect(estateMarketplace.connect(buyer1)["safeBuy(uint256,uint256)"](1, 1, { value: 1e9 })).to.be.revertedWithCustomError(estateMarketplace, "FailedTransfer"),
            );
        });
    });

    describe('5.7. safeBuy(uint256, uint256, uint256)', async () => {
        it('5.7.1. buy token successfully', async () => {
            async function testcase1(fixture: EstateMarketplaceFixture) {
                const { estateToken, estateMarketplace, seller1, buyer1, feeReceiver } = fixture;

                let totalAmount = (await estateMarketplace.getOffer(1)).sellingAmount;
                let amount_1 = ethers.BigNumber.from(100_000);

                let decimals = (await estateToken.getEstate(1)).decimals;
                let unitPrice = (await estateMarketplace.getOffer(1)).unitPrice;
                let value = unitPrice.mul(amount_1).div(ethers.BigNumber.from(10).pow(decimals));
                let royaltyReceiver = feeReceiver.address;
                let royaltyAmount = value.mul(LandInitialization.ESTATE_TOKEN_RoyaltyRate).div(Constant.COMMON_RATE_MAX_FRACTION);

                let commissionReceiver = ethers.constants.AddressZero;
                let commissionAmount = 0;
                let total = value.add(royaltyAmount);

                let buyer1Balance = await ethers.provider.getBalance(buyer1.address);
                let seller1Balance = await ethers.provider.getBalance(seller1.address);
                let buyer1TokenBalance = await estateToken.balanceOf(buyer1.address, 1);
                let seller1TokenBalance = await estateToken.balanceOf(seller1.address, 1);
                let royaltyReceiverBalance = await ethers.provider.getBalance(royaltyReceiver);
                let commissionReceiverBalance = await ethers.provider.getBalance(commissionReceiver);

                let tx = await estateMarketplace.connect(buyer1)["safeBuy(uint256,uint256,uint256)"](1, amount_1, 1, { value: 1e9 });
                let receipt = await tx.wait();

                let gasFee = receipt.gasUsed.mul(receipt.effectiveGasPrice);

                await expect(tx).to
                    .emit(estateMarketplace, 'OfferSale')
                    .withArgs(1, buyer1.address, amount_1, value, royaltyReceiver, royaltyAmount, commissionReceiver, commissionAmount);

                let offer = await estateMarketplace.getOffer(1);
                expect(offer.tokenId).to.equal(1);
                expect(offer.sellingAmount).to.equal(totalAmount);
                expect(offer.soldAmount).to.equal(amount_1);
                expect(offer.unitPrice).to.equal(unitPrice);
                expect(offer.currency).to.equal(ethers.constants.AddressZero);
                expect(offer.isDivisible).to.equal(true);
                expect(offer.state).to.equal(EstateMarketplaceOfferState.Selling);
                expect(offer.seller).to.equal(seller1.address);

                expect(await ethers.provider.getBalance(seller1.address)).to.equal(seller1Balance.add(value));
                expect(await ethers.provider.getBalance(buyer1.address)).to.equal(buyer1Balance.sub(gasFee).sub(total));
                expect(await ethers.provider.getBalance(royaltyReceiver)).to.equal(royaltyReceiverBalance.add(royaltyAmount));
                expect(await ethers.provider.getBalance(commissionReceiver)).to.equal(commissionReceiverBalance.add(commissionAmount));

                expect(await estateToken.balanceOf(seller1.address, 1)).to.equal(seller1TokenBalance.sub(amount_1));
                expect(await estateToken.balanceOf(buyer1.address, 1)).to.equal(buyer1TokenBalance.add(amount_1));

                let amount_2 = totalAmount.sub(amount_1);
                value = unitPrice.mul(amount_2).div(ethers.BigNumber.from(10).pow(decimals));
                royaltyAmount = value.mul(LandInitialization.ESTATE_TOKEN_RoyaltyRate).div(Constant.COMMON_RATE_MAX_FRACTION);

                commissionReceiver = ethers.constants.AddressZero;
                commissionAmount = 0;
                total = value.add(royaltyAmount);

                buyer1Balance = await ethers.provider.getBalance(buyer1.address);
                seller1Balance = await ethers.provider.getBalance(seller1.address);
                buyer1TokenBalance = await estateToken.balanceOf(buyer1.address, 1);
                seller1TokenBalance = await estateToken.balanceOf(seller1.address, 1);
                royaltyReceiverBalance = await ethers.provider.getBalance(royaltyReceiver);
                commissionReceiverBalance = await ethers.provider.getBalance(commissionReceiver);

                tx = await estateMarketplace.connect(buyer1)["safeBuy(uint256,uint256,uint256)"](1, amount_2, 1, { value: 1e9 });
                receipt = await tx.wait();

                gasFee = receipt.gasUsed.mul(receipt.effectiveGasPrice);

                await expect(tx).to
                    .emit(estateMarketplace, 'OfferSale')
                    .withArgs(1, buyer1.address, amount_2, value, royaltyReceiver, royaltyAmount, commissionReceiver, commissionAmount);

                offer = await estateMarketplace.getOffer(1);
                expect(offer.tokenId).to.equal(1);
                expect(offer.sellingAmount).to.equal(totalAmount);
                expect(offer.soldAmount).to.equal(amount_1.add(amount_2));
                expect(offer.unitPrice).to.equal(unitPrice);
                expect(offer.currency).to.equal(ethers.constants.AddressZero);
                expect(offer.isDivisible).to.equal(true);
                expect(offer.state).to.equal(EstateMarketplaceOfferState.Sold);
                expect(offer.seller).to.equal(seller1.address);

                expect(await ethers.provider.getBalance(seller1.address)).to.equal(seller1Balance.add(value));
                expect(await ethers.provider.getBalance(buyer1.address)).to.equal(buyer1Balance.sub(gasFee).sub(total));
                expect(await ethers.provider.getBalance(royaltyReceiver)).to.equal(royaltyReceiverBalance.add(royaltyAmount));
                expect(await ethers.provider.getBalance(commissionReceiver)).to.equal(commissionReceiverBalance.add(commissionAmount));

                expect(await estateToken.balanceOf(seller1.address, 1)).to.equal(seller1TokenBalance.sub(amount_2));
                expect(await estateToken.balanceOf(buyer1.address, 1)).to.equal(buyer1TokenBalance.add(amount_2));
            }

            async function testcase2(fixture: EstateMarketplaceFixture) {
                const { estateToken, estateMarketplace, seller2, buyer2, feeReceiver, currency, commissionReceiver } = fixture;

                let totalAmount = (await estateMarketplace.getOffer(2)).sellingAmount;

                let amount_1 = ethers.BigNumber.from(150);
                let decimals = (await estateToken.getEstate(2)).decimals;
                let unitPrice = (await estateMarketplace.getOffer(2)).unitPrice;
                let value = unitPrice.mul(amount_1).div(ethers.BigNumber.from(10).pow(decimals));
                let royaltyReceiver = feeReceiver.address;
                let royaltyAmount = value.mul(LandInitialization.ESTATE_TOKEN_RoyaltyRate).div(Constant.COMMON_RATE_MAX_FRACTION);
                royaltyAmount = royaltyAmount.sub(royaltyAmount.mul(fixture.mockCurrencyExclusiveRate).div(Constant.COMMON_RATE_MAX_FRACTION));

                let commissionAmount = royaltyAmount.mul(LandInitialization.COMMISSION_TOKEN_CommissionRate).div(Constant.COMMON_RATE_MAX_FRACTION);
                let total = value.add(royaltyAmount);

                let buyer2Balance = await currency.balanceOf(buyer2.address);
                let seller2Balance = await currency.balanceOf(seller2.address);
                let royaltyReceiverBalance = await currency.balanceOf(royaltyReceiver);
                let commissionReceiverBalance = await currency.balanceOf(commissionReceiver.address);
                let buyer2TokenBalance = await estateToken.balanceOf(buyer2.address, 2);
                let seller2TokenBalance = await estateToken.balanceOf(seller2.address, 2);

                let tx = await estateMarketplace.connect(buyer2)["safeBuy(uint256,uint256,uint256)"](2, amount_1, 2);
                await tx.wait();

                let offer = await estateMarketplace.getOffer(2);
                expect(offer.tokenId).to.equal(2);
                expect(offer.sellingAmount).to.equal(totalAmount);
                expect(offer.soldAmount).to.equal(amount_1);
                expect(offer.unitPrice).to.equal(unitPrice);
                expect(offer.currency).to.equal(currency.address);
                expect(offer.isDivisible).to.equal(true);
                expect(offer.state).to.equal(EstateMarketplaceOfferState.Selling);
                expect(offer.seller).to.equal(seller2.address);

                await expect(tx).to
                    .emit(estateMarketplace, 'OfferSale')
                    .withArgs(2, buyer2.address, amount_1, value, royaltyReceiver, royaltyAmount, commissionReceiver.address, commissionAmount);

                expect(await currency.balanceOf(buyer2.address)).to.equal(buyer2Balance.sub(total));
                expect(await currency.balanceOf(seller2.address)).to.equal(seller2Balance.add(value));
                expect(await currency.balanceOf(royaltyReceiver)).to.equal(royaltyReceiverBalance.add(royaltyAmount).sub(commissionAmount));
                expect(await currency.balanceOf(commissionReceiver.address)).to.equal(commissionReceiverBalance.add(commissionAmount));

                expect(await estateToken.balanceOf(seller2.address, 2)).to.equal(seller2TokenBalance.sub(amount_1));
                expect(await estateToken.balanceOf(buyer2.address, 2)).to.equal(buyer2TokenBalance.add(amount_1));

                let amount_2 = totalAmount.sub(amount_1);
                value = unitPrice.mul(amount_2).div(ethers.BigNumber.from(10).pow(decimals));
                royaltyAmount = value.mul(LandInitialization.ESTATE_TOKEN_RoyaltyRate).div(Constant.COMMON_RATE_MAX_FRACTION);
                royaltyAmount = royaltyAmount.sub(royaltyAmount.mul(fixture.mockCurrencyExclusiveRate).div(Constant.COMMON_RATE_MAX_FRACTION));

                commissionAmount = royaltyAmount.mul(LandInitialization.COMMISSION_TOKEN_CommissionRate).div(Constant.COMMON_RATE_MAX_FRACTION);
                total = value.add(royaltyAmount);

                buyer2Balance = await currency.balanceOf(buyer2.address);
                seller2Balance = await currency.balanceOf(seller2.address);
                royaltyReceiverBalance = await currency.balanceOf(royaltyReceiver);
                commissionReceiverBalance = await currency.balanceOf(commissionReceiver.address);
                buyer2TokenBalance = await estateToken.balanceOf(buyer2.address, 2);
                seller2TokenBalance = await estateToken.balanceOf(seller2.address, 2);

                tx = await estateMarketplace.connect(buyer2)["safeBuy(uint256,uint256,uint256)"](2, amount_2, 2);
                await tx.wait();

                offer = await estateMarketplace.getOffer(2);
                expect(offer.tokenId).to.equal(2);
                expect(offer.sellingAmount).to.equal(totalAmount);
                expect(offer.soldAmount).to.equal(amount_1.add(amount_2));
                expect(offer.unitPrice).to.equal(unitPrice);
                expect(offer.currency).to.equal(currency.address);
                expect(offer.isDivisible).to.equal(true);
                expect(offer.state).to.equal(EstateMarketplaceOfferState.Sold);
                expect(offer.seller).to.equal(seller2.address);

                await expect(tx).to
                    .emit(estateMarketplace, 'OfferSale')
                    .withArgs(2, buyer2.address, amount_2, value, royaltyReceiver, royaltyAmount, commissionReceiver.address, commissionAmount);

                expect(await currency.balanceOf(buyer2.address)).to.equal(buyer2Balance.sub(total));
                expect(await currency.balanceOf(seller2.address)).to.equal(seller2Balance.add(value));
                expect(await currency.balanceOf(royaltyReceiver)).to.equal(royaltyReceiverBalance.add(royaltyAmount).sub(commissionAmount));
                expect(await currency.balanceOf(commissionReceiver.address)).to.equal(commissionReceiverBalance.add(commissionAmount));

                expect(await estateToken.balanceOf(seller2.address, 2)).to.equal(seller2TokenBalance.sub(amount_2));
                expect(await estateToken.balanceOf(buyer2.address, 2)).to.equal(buyer2TokenBalance.add(amount_2));
            }

            const fixture = await beforeEstateMarketplaceTest({
                listSampleCurrencies: true,
                listSampleEstateToken: true,
                listSampleOffers: true,
                fundERC20ForBuyers: true,
            });
            await testcase1(fixture);
            await testcase2(fixture);
        });

        async function testBuyOffer(
            fixture: EstateMarketplaceFixture,
            mockCurrencyExclusiveRate: BigNumber,
            commissionRate: BigNumber,
            estateTokenRoyaltyRate: BigNumber,
            isERC20: boolean,
            isExclusive: boolean,
            decimals: number,
            initialAmount: BigNumber,
            offerAmount: BigNumber,
            unitPrice: BigNumber,
            seller: Wallet,
            buyRecords: {
                buyer: Wallet,
                amount: BigNumber,
            }[],
            hasCommissionReceiver: boolean
        ) {
            const { deployer, estateForger, estateToken, estateMarketplace, feeReceiver, commissionToken, commissionReceiver, admins, admin } = fixture;

            await callEstateToken_UpdateRoyaltyRate(estateToken, admins, estateTokenRoyaltyRate, await admin.nonce());

            const currentEstateId = (await estateToken.estateNumber()).add(1);
            const currentOfferId = (await estateMarketplace.offerNumber()).add(1);

            commissionToken.setVariable("commissionRate", commissionRate);

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
            let commissionReceiverAddress = (hasCommissionReceiver) ? commissionReceiver.address : ethers.constants.AddressZero;

            await callAdmin_UpdateCurrencyRegistries(
                admin,
                admins,
                [newCurrencyAddress],
                [true],
                [isExclusive],
                await admin.nonce(),
            );

            let currentTimestamp = await time.latest();

            await callTransaction(estateForger.call(estateToken.address, estateToken.interface.encodeFunctionData("tokenizeEstate", [
                0,
                ethers.utils.formatBytes32String("TestZone"),
                0,
                `Token_${currentEstateId}`,
                currentTimestamp + 1e8,
                decimals,
                commissionReceiverAddress,
            ])));
            await callTransaction(estateToken.mint(seller.address, currentEstateId, initialAmount));

            await callTransaction(estateMarketplace.connect(seller).list(
                currentEstateId,
                offerAmount,
                unitPrice,
                newCurrencyAddress,
                true,
            ));

            let totalSold = ethers.BigNumber.from(0);
            let totalBought = new Map<string, BigNumber>();

            for (const { buyer, amount } of buyRecords) {
                let value = amount.mul(unitPrice).div(ethers.BigNumber.from(10).pow(decimals));
                let royaltyReceiver = feeReceiver.address;
                let royaltyAmount = value.mul(estateTokenRoyaltyRate).div(Constant.COMMON_RATE_MAX_FRACTION);
                if (isExclusive) {
                    royaltyAmount = royaltyAmount.sub(royaltyAmount.mul(mockCurrencyExclusiveRate).div(Constant.COMMON_RATE_MAX_FRACTION));
                }
                let commissionAmount = ethers.BigNumber.from(0);
                if (hasCommissionReceiver) {
                    commissionAmount = royaltyAmount.mul(commissionRate).div(Constant.COMMON_RATE_MAX_FRACTION);
                }
                let total = value.add(royaltyAmount);

                let ethValue = ethers.BigNumber.from(0);
                await prepareNativeToken(ethers.provider, deployer, [buyer], ethers.utils.parseEther("1.0"));
                if (isERC20) {
                    await prepareERC20(newCurrency!, [buyer], [estateMarketplace], total);
                } else {
                    ethValue = total;
                    await prepareNativeToken(ethers.provider, deployer, [buyer], total);
                }

                await callTransaction(estateToken.connect(seller).setApprovalForAll(estateMarketplace.address, true));

                let initBuyerBalance = await getBalance(ethers.provider, buyer.address, newCurrency);
                let initSellerBalance = await getBalance(ethers.provider, seller.address, newCurrency);
                let initFeeReceiverBalance = await getBalance(ethers.provider, feeReceiver.address, newCurrency);
                let initCommissionReceiverBalance = await getBalance(ethers.provider, commissionReceiverAddress, newCurrency);

                let tx = await estateMarketplace.connect(buyer)["safeBuy(uint256,uint256,uint256)"](
                    currentOfferId,
                    amount,
                    currentEstateId,
                    { value: ethValue }
                );
                const receipt = await tx.wait();

                let expectedBuyerBalance = initBuyerBalance.sub(total);
                let expectedSellerBalance = initSellerBalance.add(value);
                let expectedFeeReceiverBalance = initFeeReceiverBalance.add(royaltyAmount.sub(commissionAmount));
                let expectedCommissionReceiverBalance = initCommissionReceiverBalance.add(commissionAmount);

                if (!isERC20) {
                    const gasFee = receipt.gasUsed.mul(receipt.effectiveGasPrice);
                    expectedBuyerBalance = expectedBuyerBalance.sub(gasFee);
                }

                await expect(tx).to
                    .emit(estateMarketplace, 'OfferSale')
                    .withArgs(currentOfferId, buyer.address, amount, value, royaltyReceiver, royaltyAmount, commissionReceiverAddress, commissionAmount);
                
                totalSold = totalSold.add(amount);

                let totalBoughtOfBuyer = (totalBought.get(buyer.address) || ethers.BigNumber.from(0)).add(amount);
                totalBought.set(buyer.address, totalBoughtOfBuyer);

                let offer = await estateMarketplace.getOffer(currentOfferId);
                expect(offer.tokenId).to.equal(currentEstateId);
                expect(offer.sellingAmount).to.equal(offerAmount);
                expect(offer.soldAmount).to.equal(totalSold);
                expect(offer.unitPrice).to.equal(unitPrice);
                expect(offer.currency).to.equal(newCurrencyAddress);
                expect(offer.isDivisible).to.equal(true);
                expect(offer.state).to.equal(totalSold.eq(offerAmount) ? EstateMarketplaceOfferState.Sold : EstateMarketplaceOfferState.Selling);
                expect(offer.seller).to.equal(seller.address);

                expect(await getBalance(ethers.provider, buyer.address, newCurrency)).to.equal(expectedBuyerBalance);
                expect(await getBalance(ethers.provider, seller.address, newCurrency)).to.equal(expectedSellerBalance);
                expect(await getBalance(ethers.provider, feeReceiver.address, newCurrency)).to.equal(expectedFeeReceiverBalance);
                if (hasCommissionReceiver) {
                    expect(await getBalance(ethers.provider, commissionReceiverAddress, newCurrency)).to.equal(expectedCommissionReceiverBalance);
                }

                expect(await estateToken.balanceOf(seller.address, currentEstateId)).to.equal(initialAmount.sub(totalSold));
                expect(await estateToken.balanceOf(buyer.address, currentEstateId)).to.equal(totalBoughtOfBuyer);

                let walletsToReset = [seller, buyer, feeReceiver];
                if (hasCommissionReceiver) {
                    walletsToReset.push(commissionReceiver);
                }
                if (isERC20) {
                    await resetERC20(newCurrency!, walletsToReset);
                } else {
                    await resetNativeToken(ethers.provider, walletsToReset);
                    await prepareNativeToken(ethers.provider, deployer, [seller, buyer], ethers.utils.parseEther("1.0"));
                }
            }
        }

        it('5.7.2. buy token successfully (automatic test)', async () => {
            const fixture = await beforeEstateMarketplaceTest({
                listSampleCurrencies: true,
                listSampleEstateToken: true,
            });
            const { mockCurrencyExclusiveRate, seller1, buyer1, seller2, buyer2 } = fixture;
    
            await testBuyOffer(
                fixture,
                mockCurrencyExclusiveRate,
                LandInitialization.COMMISSION_TOKEN_CommissionRate,
                LandInitialization.ESTATE_TOKEN_RoyaltyRate,
                false,
                false,
                3,
                ethers.BigNumber.from(200_000),
                ethers.BigNumber.from(150_000),
                ethers.BigNumber.from(100000),
                seller1,
                [
                    { buyer: buyer1, amount: ethers.BigNumber.from(100_000) },
                    { buyer: buyer1, amount: ethers.BigNumber.from(50_000) },
                ],
                false,
            )

            await testBuyOffer(
                fixture,
                mockCurrencyExclusiveRate,
                LandInitialization.COMMISSION_TOKEN_CommissionRate,
                LandInitialization.ESTATE_TOKEN_RoyaltyRate,
                true,
                true,
                0,
                ethers.BigNumber.from(300),
                ethers.BigNumber.from(220),
                ethers.BigNumber.from(500),
                seller2,
                [
                    { buyer: buyer2, amount: ethers.BigNumber.from(200) },
                    { buyer: buyer2, amount: ethers.BigNumber.from(20) },
                ],
                true,
            )
        });

        it('5.7.3. buy token successfully (all flows)', async () => {
            const fixture = await beforeEstateMarketplaceTest({
                listSampleCurrencies: true,
                listSampleEstateToken: true,
            });
            const { mockCurrencyExclusiveRate, seller1, buyer1 } = fixture;

            for (const comReceiver of [false, true]) {
                for (const isERC20 of [false, true]) {
                    for (const isExclusive of [false, true]) {
                        if (!isERC20 && isExclusive) {
                            continue;
                        }
                        await testBuyOffer(
                            fixture,
                            mockCurrencyExclusiveRate,
                            LandInitialization.COMMISSION_TOKEN_CommissionRate,
                            LandInitialization.ESTATE_TOKEN_RoyaltyRate,
                            isERC20,
                            isExclusive,
                            3,
                            ethers.BigNumber.from(200_000),
                            ethers.BigNumber.from(150_000),
                            ethers.BigNumber.from(120000),
                            seller1,
                            [
                                { buyer: buyer1, amount: ethers.BigNumber.from(100_000) },
                                { buyer: buyer1, amount: ethers.BigNumber.from(50_000) },
                            ],
                            comReceiver,
                        )
                    }
                }
            }
        });

        it('5.7.4. buy token successfully with very large amount (all flows)', async () => {
            const fixture = await beforeEstateMarketplaceTest({
                listSampleCurrencies: true,
                listSampleEstateToken: true,
            });
            const { seller1, buyer1 } = fixture;

            for (const comReceiver of [false, true]) {
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
                            ethers.utils.parseEther("0.99"),
                            isERC20,
                            isExclusive,
                            18,
                            amount,
                            amount,
                            base,
                            seller1,
                            [
                                { buyer: buyer1, amount: ethers.BigNumber.from(150_000) },
                                { buyer: buyer1, amount: ethers.BigNumber.from(50_000) },
                            ],
                            comReceiver,
                        )
                    }
                }
            }
        });

        it('5.7.5. buy token successfully in 10 random test cases', async () => {
            const fixture = await beforeEstateMarketplaceTest({
                listSampleCurrencies: true,
                listSampleEstateToken: true,
            });
            const { seller1, buyer1, buyer2 } = fixture;

            for (let testcase = 0; testcase < 10; testcase++) {
                const hasCommissionReceiver = Math.random() < 0.5;
                const isERC20 = Math.random() < 0.5;
                const isExclusive = Math.random() < 0.5;
                if (!isERC20 && isExclusive) {
                    --testcase; continue;
                }

                const royaltyRate = randomBigNumber(ethers.BigNumber.from(0), ethers.utils.parseEther("1"));
                const exclusiveRate = randomBigNumber(ethers.BigNumber.from(0), ethers.utils.parseEther("1"));
                const commissionRate = randomBigNumber(ethers.BigNumber.from(0), ethers.utils.parseEther("1"));

                const randomNums = []
                const decimals = randomInt(0, 19);
                for (let i = 0; i < 2; ++i) {
                    const maxSupply = ethers.BigNumber.from(2).pow(256).sub(1)
                    randomNums.push(ethers.BigNumber.from(ethers.utils.randomBytes(32)).mod(maxSupply).add(1));
                }
                randomNums.sort((a, b) => a.sub(b).lt(0) ? -1 : 1);

                const offerAmount = randomNums[0];
                const initAmount = randomNums[1];

                const unitPrice = randomBigNumber(ethers.BigNumber.from(1), ethers.BigNumber.from(2).pow(256).sub(1).div(initAmount));

                const nTx = randomInt(1, 10 + 1);
                const amounts = randomArrayWithSum(nTx, offerAmount, ethers.BigNumber.from(1));

                const seller = seller1;
                const buyRecords = [];
                for (let i = 0; i < nTx; ++i) {
                    buyRecords.push({
                        buyer: Math.random() < 0.5 ? buyer1 : buyer2,
                        amount: amounts[i],
                    });
                }

                await testBuyOffer(
                    fixture,
                    exclusiveRate,
                    commissionRate,
                    royaltyRate, 
                    isERC20,
                    isExclusive,
                    decimals,
                    initAmount,
                    offerAmount,
                    unitPrice,
                    seller,
                    buyRecords,
                    hasCommissionReceiver,
                );
            }
        });

        it('5.7.6. buy token unsuccessfully when paused', async () => {
            const fixture = await beforeEstateMarketplaceTest({
                listSampleCurrencies: true,
                listSampleEstateToken: true,
                listSampleOffers: true,
                fundERC20ForBuyers: true,
                pause: true,
            });
            const { estateMarketplace, buyer1 } = fixture;

            await expect(estateMarketplace.connect(buyer1)["safeBuy(uint256,uint256,uint256)"](1, 100_000, 1, { value: 1e9 }))
                .to.be.revertedWith("Pausable: paused");
        });

        it('5.7.7. buy token unsuccessfully with invalid offer id', async () => {
            const fixture = await beforeEstateMarketplaceTest({
                listSampleCurrencies: true,
                listSampleEstateToken: true,
                listSampleOffers: true,
                fundERC20ForBuyers: true,
            });
            const { estateMarketplace, buyer1 } = fixture;

            await expect(estateMarketplace.connect(buyer1)["safeBuy(uint256,uint256,uint256)"](0, 100_000, 1, { value: 1e9 }))
                .to.be.revertedWithCustomError(estateMarketplace, "InvalidOfferId");

            await expect(estateMarketplace.connect(buyer1)["safeBuy(uint256,uint256,uint256)"](3, 100_000, 1, { value: 1e9 }))
                .to.be.revertedWithCustomError(estateMarketplace, "InvalidOfferId");
        });

        it('5.7.8. buy token unsuccessfully when seller buy their own token', async () => {
            const fixture = await beforeEstateMarketplaceTest({
                listSampleCurrencies: true,
                listSampleEstateToken: true,
                listSampleOffers: true,
                fundERC20ForBuyers: true,
            });
            const { estateMarketplace, seller1, seller2 } = fixture;

            await expect(estateMarketplace.connect(seller1)["safeBuy(uint256,uint256,uint256)"](1, 100_000, 1, { value: 1e9 }))
                .to.be.revertedWithCustomError(estateMarketplace, "InvalidBuying");

            await expect(estateMarketplace.connect(seller2)["safeBuy(uint256,uint256,uint256)"](2, 100_000, 2))
                .to.be.revertedWithCustomError(estateMarketplace, "InvalidBuying");
        });

        it('5.7.9. buy token unsuccessfully with invalid anchor', async () => {
            const fixture = await beforeEstateMarketplaceTest({
                listSampleCurrencies: true,
                listSampleEstateToken: true,
                listSampleOffers: true,
                fundERC20ForBuyers: true,
            });
            const { estateMarketplace, buyer1, buyer2 } = fixture;

            await expect(estateMarketplace.connect(buyer1)["safeBuy(uint256,uint256,uint256)"](1, 100_000, 2, { value: 1e9 }))
                .to.be.revertedWithCustomError(estateMarketplace, "BadAnchor");

            await expect(estateMarketplace.connect(buyer2)["safeBuy(uint256,uint256,uint256)"](2, 100_000, 1))
                .to.be.revertedWithCustomError(estateMarketplace, "BadAnchor");
        });

        it('5.7.10. buy token unsuccessfully when offer is not selling', async () => {
            const fixture = await beforeEstateMarketplaceTest({
                listSampleCurrencies: true,
                listSampleEstateToken: true,
                listSampleOffers: true,
                fundERC20ForBuyers: true,
            });
            const { estateMarketplace, buyer1, buyer2 } = fixture;

            await callTransaction(estateMarketplace.connect(buyer1)["safeBuy(uint256,uint256,uint256)"](1, 150_000, 1, { value: 1e9 }));

            await expect(estateMarketplace.connect(buyer2)["safeBuy(uint256,uint256,uint256)"](1, 150_000, 1, { value: 1e9 }))
                .to.be.revertedWithCustomError(estateMarketplace, "InvalidBuying");
        });

        it('5.7.11. buy token unsuccessfully with indivisible offer', async () => {
            const fixture = await beforeEstateMarketplaceTest({
                listSampleCurrencies: true,
                listSampleEstateToken: true,
                listSampleOffers: true,
                fundERC20ForBuyers: true,
            });
            const { estateMarketplace, seller1, buyer1 } = fixture;
            
            await callTransaction(estateMarketplace.connect(seller1).list(
                1, 50_000, 100000, ethers.constants.AddressZero, false
            ));

            const offerId = await estateMarketplace.offerNumber();

            await expect(estateMarketplace.connect(buyer1)["safeBuy(uint256,uint256,uint256)"](offerId, 50_000, 1, { value: 1e9 }))
                .to.be.revertedWithCustomError(estateMarketplace, "NotDivisible");
        });

        it('5.7.12. buy token unsuccessfully when there is not enough tokens to sell', async () => {
            const fixture = await beforeEstateMarketplaceTest({
                listSampleCurrencies: true,
                listSampleEstateToken: true,
                listSampleOffers: true,
                fundERC20ForBuyers: true,
            });
            const { estateMarketplace, buyer1, buyer2 } = fixture;

            await callTransaction(estateMarketplace.connect(buyer1)["safeBuy(uint256,uint256,uint256)"](1, 100_000, 1, { value: 1e9 }));

            await expect(estateMarketplace.connect(buyer2)["safeBuy(uint256,uint256,uint256)"](1, 100_000, 1, { value: 1e9 }))
                .to.be.revertedWithCustomError(estateMarketplace, "NotEnoughTokensToSell");
        });

        it('5.7.13. buy token unsuccessfully with insufficient native token', async () => {
            const fixture = await beforeEstateMarketplaceTest({
                listSampleCurrencies: true,
                listSampleEstateToken: true,
                listSampleOffers: true,
            });
            const { estateMarketplace, buyer1 } = fixture;

            await expect(estateMarketplace.connect(buyer1)["safeBuy(uint256,uint256,uint256)"](1, 100_000, 1))
                .to.be.revertedWithCustomError(estateMarketplace, "InsufficientValue");
        });

        it('5.7.14. buy token unsuccessfully when native token transfer to seller failed', async () => {
            const fixture = await beforeEstateMarketplaceTest({
                listSampleCurrencies: true,
                listSampleEstateToken: true,
            });
            const { estateMarketplace, seller1, buyer1, deployer, estateToken } = fixture;
            
            const failReceiver = await deployFailReceiver(deployer);

            await callTransaction(estateToken.connect(seller1).safeTransferFrom(
                seller1.address,
                failReceiver.address,
                1,
                200_000,
                ethers.utils.toUtf8Bytes("TestToken_1")
            ));

            let data = estateToken.interface.encodeFunctionData("setApprovalForAll", [estateMarketplace.address, true]);
            await callTransaction(failReceiver.call(estateToken.address, data));

            data = estateMarketplace.interface.encodeFunctionData("list", [1, 100_000, 1000, ethers.constants.AddressZero, true]);

            await callTransaction(failReceiver.call(estateMarketplace.address, data));

            await expect(estateMarketplace.connect(buyer1)["safeBuy(uint256,uint256,uint256)"](1, 100_000, 1, { value: 1e9 }))
                .to.be.revertedWithCustomError(estateMarketplace, "FailedTransfer");
        });

        it('5.7.15. buy token unsuccessfully when native token transfer to royalty receiver failed', async () => {
            const fixture = await beforeEstateMarketplaceTest({
                listSampleCurrencies: true,
                listSampleEstateToken: true,
                listSampleOffers: true,
                fundERC20ForBuyers: true,
            });
            const { estateMarketplace, seller1, buyer1, deployer, estateToken } = fixture;

            const failReceiver = await deployFailReceiver(deployer);

            await estateToken.updateFeeReceiver(failReceiver.address);

            await expect(estateMarketplace.connect(buyer1)["safeBuy(uint256,uint256,uint256)"](1, 100_000, 1, { value: 1e9 }))
                .to.be.revertedWithCustomError(estateMarketplace, "FailedTransfer");
        });

        it('5.7.16. buy token unsuccessfully when native token transfer to commission receiver failed', async () => {
            const fixture = await beforeEstateMarketplaceTest({
                listSampleCurrencies: true,
                listSampleEstateToken: true,
            });
            const { estateMarketplace, seller1, buyer1, deployer, estateToken, commissionToken, commissionReceiver } = fixture;

            const failReceiver = await deployFailReceiver(deployer);

            await callTransaction(commissionToken.connect(commissionReceiver).transferFrom(
                commissionReceiver.address,
                failReceiver.address,
                2,
            ));

            await callTransaction(estateMarketplace.connect(seller1).list(2, 200, 500000, ethers.constants.AddressZero, true));
            await callTransaction(estateToken.connect(seller1).setApprovalForAll(estateMarketplace.address, true));

            const offerId = await estateMarketplace.offerNumber();

            await expect(estateMarketplace.connect(buyer1)["safeBuy(uint256,uint256,uint256)"](offerId, 100, 2, { value: 1e9 }))
                .to.be.revertedWithCustomError(estateMarketplace, "FailedTransfer");
        });

        it('5.7.17. buy token unsuccessfully when refund to sender failed', async () => {
            const fixture = await beforeEstateMarketplaceTest({
                listSampleCurrencies: true,
                listSampleEstateToken: true,
                listSampleOffers: true,
                fundERC20ForBuyers: true,
            });
            const { estateMarketplace, deployer } = fixture;

            const failReceiver = await deployFailReceiver(deployer);

            let data = estateMarketplace.interface.encodeFunctionData("safeBuy(uint256,uint256,uint256)", [1, 100_000, 1]);

            await expect(failReceiver.call(estateMarketplace.address, data, { value: 1e9 }))
                .to.be.revertedWithCustomError(estateMarketplace, "FailedRefund");
        });

        it('5.7.18. buy token unsuccessfully when this contract is reentered', async () => {
            const fixture = await beforeEstateMarketplaceTest({
                listSampleCurrencies: true,
                listSampleEstateToken: true,
            });
            const { deployer, estateToken, estateMarketplace, buyer1 } = fixture;

            const reentrancy = await deployReentrancyERC1155Holder(deployer);

            await callTransaction(estateToken.mint(reentrancy.address, 1, 100_000));

            let data = estateMarketplace.interface.encodeFunctionData("list", [1, 100_000, 1000, ethers.constants.AddressZero, true]);
            await callTransaction(reentrancy.call(estateMarketplace.address, data));

            data = estateToken.interface.encodeFunctionData("setApprovalForAll", [estateMarketplace.address, true]);
            await callTransaction(reentrancy.call(estateToken.address, data));

            await testReentrancy_Marketplace(
                estateMarketplace,
                reentrancy,
                expect(estateMarketplace.connect(buyer1)["safeBuy(uint256,uint256,uint256)"](1, 100_000, 1, { value: 1e9 })).to.be.revertedWithCustomError(estateMarketplace, "FailedTransfer"),
            );
        });
    });

    describe('5.8. cancelOffer(uint256)', async () => {
        it('5.8.1. cancel offer successfully by seller', async () => {
            const fixture = await beforeEstateMarketplaceTest({
                listSampleCurrencies: true,
                listSampleEstateToken: true,
                listSampleOffers: true,
                fundERC20ForBuyers: true,
            });
            const { estateMarketplace, seller1 } = fixture;

            let tx = await estateMarketplace.connect(seller1).cancel(1);
            await tx.wait();

            const offer = await estateMarketplace.getOffer(1);
            expect(offer.state).to.equal(EstateMarketplaceOfferState.Cancelled);

            await expect(tx).to
                .emit(estateMarketplace, "OfferCancellation")
                .withArgs(1);
        });

        it('5.8.2. cancel offer successfully by manager', async () => {
            const fixture = await beforeEstateMarketplaceTest({
                listSampleCurrencies: true,
                listSampleEstateToken: true,
                listSampleOffers: true,
                fundERC20ForBuyers: true,
            });
            const { estateMarketplace, manager } = fixture;
            let tx = await estateMarketplace.connect(manager).cancel(1);
            await tx.wait();

            const offer = await estateMarketplace.getOffer(1);
            expect(offer.state).to.equal(EstateMarketplaceOfferState.Cancelled);

            await expect(tx).to
                .emit(estateMarketplace, "OfferCancellation")
                .withArgs(1);
        });

        it('5.8.3. cancel offer unsuccessfully with invalid offer id', async () => {
            const fixture = await beforeEstateMarketplaceTest({
                listSampleCurrencies: true,
                listSampleEstateToken: true,
                listSampleOffers: true,
                fundERC20ForBuyers: true,
            });
            const { estateMarketplace, manager } = fixture;

            await expect(estateMarketplace.connect(manager).cancel(0))
                .to.be.revertedWithCustomError(estateMarketplace, "InvalidOfferId");
            await expect(estateMarketplace.connect(manager).cancel(3))
                .to.be.revertedWithCustomError(estateMarketplace, "InvalidOfferId");
        });

        it('5.8.4. cancel offer unsuccessfully by unauthorized user', async () => {
            const fixture = await beforeEstateMarketplaceTest({
                listSampleCurrencies: true,
                listSampleEstateToken: true,
                listSampleOffers: true,
                fundERC20ForBuyers: true,
            });
            const { estateMarketplace, seller2, moderator } = fixture;

            await expect(estateMarketplace.connect(seller2).cancel(1))
                .to.be.revertedWithCustomError(estateMarketplace, "Unauthorized");

            await expect(estateMarketplace.connect(moderator).cancel(1))
                .to.be.revertedWithCustomError(estateMarketplace, "Unauthorized");
        });

        it('5.8.5. cancel offer unsuccessfully when offer is already cancelled', async () => {
            const fixture = await beforeEstateMarketplaceTest({
                listSampleCurrencies: true,
                listSampleEstateToken: true,
                listSampleOffers: true,
                fundERC20ForBuyers: true,
            });
            const { estateMarketplace, manager } = fixture;

            await callTransaction(estateMarketplace.connect(manager).cancel(1));
            await expect(estateMarketplace.connect(manager).cancel(1))
                .to.be.revertedWithCustomError(estateMarketplace, "InvalidCancelling");
        });

        it('5.8.6. cancel offer unsuccessfully when offer is sold out', async () => {
            const fixture = await beforeEstateMarketplaceTest({
                listSampleCurrencies: true,
                listSampleEstateToken: true,
                listSampleOffers: true,
                fundERC20ForBuyers: true,
            });
            const { estateMarketplace, manager,buyer1 } = fixture;

            await callTransaction(estateMarketplace.connect(buyer1)["safeBuy(uint256,uint256)"](1, 1, { value: 1e9 }));

            await expect(estateMarketplace.connect(manager).cancel(1))
                .to.be.revertedWithCustomError(estateMarketplace, "InvalidCancelling");
        });
    });

});

