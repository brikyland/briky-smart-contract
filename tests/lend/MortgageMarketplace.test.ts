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
    MortgageToken,
    MortgageMarketplace,
    MortgageToken__factory,
    MockMortgageToken,
} from '@typechain-types';
import { callTransaction, getSignatures, prepareNativeToken, randomWallet } from '@utils/blockchain';
import { Constant } from '@tests/test.constant';
import { deployAdmin } from '@utils/deployments/common/admin';
import { deployFeeReceiver } from '@utils/deployments/common/feeReceiver';
import { deployCurrency } from '@utils/deployments/common/currency';
import { deployMockEstateToken } from '@utils/deployments/mocks/mockEstateToken';
import { deployCommissionToken } from '@utils/deployments/land/commissionToken';
import { loadFixture, time } from "@nomicfoundation/hardhat-network-helpers";

import { MockContract, smock } from '@defi-wonderland/smock';

import {
    callAdmin_AuthorizeManagers,
    callAdmin_AuthorizeModerators,
} from '@utils/callWithSignatures/admin';
import { BigNumber } from 'ethers';
import { randomInt } from 'crypto';
import { getInterfaceID, randomBigNumber } from '@utils/utils';
import { OrderedMap } from '@utils/utils';
import { deployMortgageToken } from '@utils/deployments/lend/mortgageToken';
import { deployMortgageMarketplace } from '@utils/deployments/lend/mortgageMarketplace';
import { callMortgageMarketplace_Pause } from '@utils/callWithSignatures/mortgageMarketplace';

interface MortgageMarketplaceFixture {
    admin: Admin;
    feeReceiver: FeeReceiver;
    currency: Currency;
    commissionToken: CommissionToken;
    mortgageToken: MockContract<MockMortgageToken>;
    mortgageMarketplace: MortgageMarketplace;

    deployer: any;
    admins: any[];
    borrower1: any;
    borrower2: any;
    lender1: any;
    lender2: any;
}

describe('15. MortgageMarketplace', async () => {
    async function mortgageMarketplaceFixture(): Promise<MortgageMarketplaceFixture> {
        const accounts = await ethers.getSigners();
        const deployer = accounts[0];
        const admins = [];
        for (let i = 1; i <= Constant.ADMIN_NUMBER; ++i) admins.push(accounts[i]);
        
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

        const estateToken = await deployMockEstateToken(
            deployer.address,
            admin.address,
            feeReceiver.address,
            Constant.ESTATE_TOKEN_INITIAL_BaseURI,
            Constant.ESTATE_TOKEN_INITIAL_RoyaltyRate,
        ) as MockEstateToken;        

        const commissionToken = await deployCommissionToken(
            deployer.address,
            admin.address,
            estateToken.address,
            feeReceiver.address,
            Constant.COMMISSION_TOKEN_INITIAL_Name,
            Constant.COMMISSION_TOKEN_INITIAL_Symbol,
            Constant.COMMISSION_TOKEN_INITIAL_BaseURI,
            Constant.COMMISSION_TOKEN_INITIAL_CommissionRate,
            Constant.COMMISSION_TOKEN_INITIAL_RoyaltyRate,
        ) as CommissionToken;

        const SmockMortgageTokenFactory = await smock.mock<MortgageToken__factory>('MockMortgageToken');
        const mortgageToken = await SmockMortgageTokenFactory.deploy();
        await mortgageToken.initialize(
            admin.address,
            estateToken.address,
            commissionToken.address,
            feeReceiver.address,
            Constant.MORTGAGE_TOKEN_INITIAL_Name,
            Constant.MORTGAGE_TOKEN_INITIAL_Symbol,
            Constant.MORTGAGE_TOKEN_INITIAL_BaseURI,
            Constant.MORTGAGE_TOKEN_INITIAL_FeeRate,
            Constant.MORTGAGE_TOKEN_INITIAL_RoyaltyRate,
        );

        const mortgageMarketplace = await deployMortgageMarketplace(
            deployer.address,
            admin.address,
            mortgageToken.address,
            commissionToken.address,
        ) as MortgageMarketplace;

        return {
            admin,
            feeReceiver,
            currency,
            commissionToken,
            mortgageToken,
            mortgageMarketplace,
            deployer,
            admins,
        };
    };

    async function beforeMortgageMarketplaceTest({
        pause = false,
        listSampleMortgageToken = false,
    } = {}): Promise<MortgageMarketplaceFixture> {
        const fixture = await loadFixture(mortgageMarketplaceFixture);
        const { admin, admins, mortgageToken, mortgageMarketplace, borrower1, borrower2, lender1, lender2 } = fixture;

        let currentTimestamp = await time.latest();

        if (listSampleMortgageToken) {
            await mortgageToken.setVariable('loanNumber', 2);
            await mortgageToken.setVariable('loans', {
                1: {
                    id: 1,
                    mortgageAmount: 150_000,
                    principal: 10e5,
                    repayment: 11e5,
                    currency: ethers.constants.AddressZero,
                    due: currentTimestamp + 1000,
                    state: LoanState.Supplied,
                    borrower: borrower1.address,
                    lender: lender1.address,
                },
                2: {
                    id: 2,
                    mortgageAmount: 200,
                    principal: 100000,
                    repayment: 110000,
                    currency: ethers.constants.AddressZero,
                    due: currentTimestamp + 1100,
                    state: LoanState.Supplied,
                    borrower: borrower2.address,
                    lender: lender2.address,
                },
            });

            await callTransaction(mortgageToken.mint(lender1.address, 1));
            await callTransaction(mortgageToken.mint(lender2.address, 2));
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

    describe('15.1. initialize(address, address, address, address)', async () => {
        it('15.1.1. Deploy successfully', async () => {
            const { mortgageMarketplace, admin, commissionToken, mortgageToken } = await beforeMortgageMarketplaceTest();

            expect(await mortgageMarketplace.offerNumber()).to.equal(0);

            expect(await mortgageMarketplace.admin()).to.equal(admin.address);
            expect(await mortgageMarketplace.commissionToken()).to.equal(commissionToken.address);
            expect(await mortgageMarketplace.mortgageToken()).to.equal(mortgageToken.address);
        });
    });

    // TODO: Andy
    describe('15.2. pause(bytes[])', async () => {

    });

    // TODO: Andy
    describe('15.3. unpause(bytes[])', async () => {

    });

    describe('15.4. listToken(uint256, uint256, address)', async () => {
        it('15.4.1. list token successfully', async () => {
            const { mortgageMarketplace, lender1 } = await beforeMortgageMarketplaceTest({
                listSampleMortgageToken: true,
            });

            let tx = await mortgageMarketplace.connect(lender1).list(1, 1000, ethers.constants.AddressZero);
            await tx.wait();

            expect(tx).to
                .emit(marketplace, 'NewOffer')
                .withArgs(1, 100, 1000, ethers.constants.AddressZero, false);

            expect(await marketplace.offerNumber()).to.equal(1);

            let offer = await marketplace.getOffer(1);
            expect(offer.tokenId).to.equal(1);
            expect(offer.sellingAmount).to.equal(100);
            expect(offer.soldAmount).to.equal(0);
            expect(offer.unitPrice).to.equal(1000);
            expect(offer.currency).to.equal(ethers.constants.AddressZero);
            expect(offer.isDivisible).to.equal(false);
            expect(offer.state).to.equal(OfferState.Selling);
            expect(offer.seller).to.equal(depositor1.address);

            tx = await marketplace.connect(depositor1).listToken(2, 200, 500, currency.address, true);
            await tx.wait();

            expect(tx).to
                .emit(marketplace, 'NewOffer')
                .withArgs(2, 200, 500, currency.address, true);

            expect(await marketplace.offerNumber()).to.equal(2);

            offer = await marketplace.getOffer(2);
            expect(offer.tokenId).to.equal(2);
            expect(offer.sellingAmount).to.equal(200);
            expect(offer.soldAmount).to.equal(0);
            expect(offer.unitPrice).to.equal(500);
            expect(offer.currency).to.equal(currency.address);
            expect(offer.isDivisible).to.equal(true);
            expect(offer.state).to.equal(OfferState.Selling);
            expect(offer.seller).to.equal(depositor1.address);
        });

        it('5.7.2. list token unsuccessfully when paused', async () => {
            await callMarketPlace_Pause(marketplace, admins, nonce++);

            await expect(marketplace.connect(depositor1).listToken(1, 100, 1000, ethers.constants.AddressZero, false))
                .to.be.revertedWith('Pausable: paused');
        });

        it('5.7.3. list token unsuccessfully with invalid token id', async () => {
            await expect(marketplace.connect(depositor1).listToken(0, 100, 1000, ethers.constants.AddressZero, false))
                .to.be.revertedWithCustomError(marketplace, 'InvalidTokenId');

            await expect(marketplace.connect(depositor1).listToken(3, 100, 1000, ethers.constants.AddressZero, false))
                .to.be.revertedWithCustomError(marketplace, 'InvalidTokenId');
        });

        it('5.7.4. list token unsuccessfully with zero unit price', async () => {
            await expect(marketplace.connect(depositor1).listToken(1, 100, 0, ethers.constants.AddressZero, false))
                .to.be.revertedWithCustomError(marketplace, 'InvalidUnitPrice');
        });

        it('5.7.5. list token unsuccessfully with invalid currency', async () => {
            const newCurrency = randomWallet()
            await expect(marketplace.connect(depositor1).listToken(1, 100, 1000, newCurrency.address, false))
                .to.be.revertedWithCustomError(marketplace, 'InvalidCurrency');
        });

        it('5.7.6. list token unsuccessfully with zero selling amount', async () => {
            await expect(marketplace.connect(depositor1).listToken(1, 0, 1000, ethers.constants.AddressZero, false))
                .to.be.revertedWithCustomError(marketplace, 'InvalidSellingAmount');
        });

        it('5.7.7. list token unsuccessfully with selling amount exceeding owned amount', async () => {
            await expect(marketplace.connect(depositor1).listToken(1, 200_001, 1000, ethers.constants.AddressZero, false))
                .to.be.revertedWithCustomError(marketplace, 'InvalidSellingAmount');
        });
    });

    
});
