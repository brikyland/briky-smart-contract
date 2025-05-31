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
    MockPriceFeed,
} from '@typechain-types';
import { callTransaction, getSignatures, prepareNativeToken, randomWallet, testReentrancy } from '@utils/blockchain';
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
    callAdmin_UpdateCurrencyRegistries,
} from '@utils/callWithSignatures/admin';
import { BigNumber, Contract } from 'ethers';
import { randomInt } from 'crypto';
import { getInterfaceID, randomBigNumber } from '@utils/utils';
import { OrderedMap } from '@utils/utils';
import { deployMortgageToken } from '@utils/deployments/lend/mortgageToken';
import { deployMockPriceFeed } from '@utils/deployments/mocks/mockPriceFeed';
import { addCurrency } from '@utils/callWithSignatures/common';


enum LoanState {
    Nil,
    Pending,
    Supplied,
    Repaid,
    Foreclosed,
    Cancelled
}

async function testReentrancy_mortgageToken(
    mortgageToken: MortgageToken,
    reentrancyContract: Contract,
    assertion: any,
) {
    let data = [
        mortgageToken.interface.encodeFunctionData("lend", [0, 0]),
        mortgageToken.interface.encodeFunctionData("repay", [0]),
        mortgageToken.interface.encodeFunctionData("foreclose", [0]),
    ];

    await testReentrancy(
        reentrancyContract,
        mortgageToken,
        data,
        assertion,
    );
}


interface MortgageTokenFixture {
    admin: Admin;
    feeReceiver: FeeReceiver;
    currency: Currency;
    estateToken: MockContract<MockEstateToken>;
    commissionToken: CommissionToken;
    mortgageToken: MortgageToken;

    deployer: any;
    admins: any[];
    lender1: any;
    lender2: any;
    borrower1: any;
    borrower2: any;

    mockCurrencyExclusiveRate: BigNumber;
}

describe('14. MortgageToken', async () => {
    async function mortgageTokenFixture(): Promise<MortgageTokenFixture> {
        const accounts = await ethers.getSigners();
        const deployer = accounts[0];
        const admins = [];
        for (let i = 1; i <= Constant.ADMIN_NUMBER; ++i) admins.push(accounts[i]);
        const lender1 = accounts[Constant.ADMIN_NUMBER + 1];
        const lender2 = accounts[Constant.ADMIN_NUMBER + 2];
        const borrower1 = accounts[Constant.ADMIN_NUMBER + 3];
        const borrower2 = accounts[Constant.ADMIN_NUMBER + 4];
        
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
        const mockCurrencyExclusiveRate = ethers.utils.parseEther('0.3');
        await callTransaction(currency.setExclusiveDiscount(mockCurrencyExclusiveRate, Constant.COMMON_RATE_DECIMALS));

        const MockEstateTokenFactory = await smock.mock('EstateToken') as any;
        const estateToken = await MockEstateTokenFactory.deploy() as MockContract<EstateToken>;
        await estateToken.initialize(
            admin.address,
            feeReceiver.address,
            Constant.ESTATE_TOKEN_INITIAL_BaseURI,
            Constant.ESTATE_TOKEN_INITIAL_RoyaltyRate,
        );   

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

        const mortgageToken = await deployMortgageToken(
            deployer.address,
            admin.address,
            estateToken.address,
            commissionToken.address,
            feeReceiver.address,
            Constant.MORTGAGE_TOKEN_INITIAL_Name,
            Constant.MORTGAGE_TOKEN_INITIAL_Symbol,
            Constant.MORTGAGE_TOKEN_INITIAL_BaseURI,
            Constant.MORTGAGE_TOKEN_INITIAL_FeeRate,
            Constant.MORTGAGE_TOKEN_INITIAL_RoyaltyRate,
        ) as MortgageToken;

        return {
            admin,
            feeReceiver,
            currency,
            estateToken,
            commissionToken,
            mortgageToken,
            deployer,
            admins,
            lender1,
            lender2,
            borrower1,
            borrower2,
            mockCurrencyExclusiveRate,
        };
    };

    async function beforeMortgageTokenTest({
        listSampleCurrencies = false,
        listEstateToken = false,
        listSampleLoan = false,
        pause = false,
    } = {}): Promise<MortgageTokenFixture> {
        const fixture = await loadFixture(mortgageTokenFixture);

        const { admin, admins, currency, estateToken, feeReceiver, commissionToken, mortgageToken, borrower1, borrower2 } = fixture;

        if (listSampleCurrencies) {
            await callAdmin_UpdateCurrencyRegistries(
                admin,
                admins,
                [ethers.constants.AddressZero],
                [true],
                [false],
                await admin.nonce()
            );
            
            await callAdmin_UpdateCurrencyRegistries(
                admin,
                admins,
                [currency.address],
                [true],
                [true],
                await admin.nonce()
            );
        }

        if (listEstateToken) {
            estateToken.isAvailable.whenCalledWith(1).returns(true);
            estateToken.isAvailable.whenCalledWith(2).returns(true);

            await estateToken.mint(borrower1.address, 1, 200_000);
            await estateToken.mint(borrower2.address, 1, 300_000);

            await estateToken.mint(borrower1.address, 2, 200);
            await estateToken.mint(borrower2.address, 2, 300);
        }

        return {
            ...fixture,
        }
    }

    describe('14.1. initialize(address, address, address, address, string, string, string, uint256, uint256)', async () => {
        it('14.1.1. Deploy successfully', async () => {
            const { deployer, admin, estateToken, feeReceiver, commissionToken } = await beforeMortgageTokenTest();

            const MortgageToken = await ethers.getContractFactory('MortgageToken', deployer);

            const mortgageToken = await upgrades.deployProxy(
                MortgageToken,
                [
                    admin.address,
                    estateToken.address,
                    commissionToken.address,
                    feeReceiver.address,
                    Constant.MORTGAGE_TOKEN_INITIAL_Name,
                    Constant.MORTGAGE_TOKEN_INITIAL_Symbol,
                    Constant.MORTGAGE_TOKEN_INITIAL_BaseURI,
                    Constant.MORTGAGE_TOKEN_INITIAL_FeeRate,
                    Constant.MORTGAGE_TOKEN_INITIAL_RoyaltyRate,
                ]
            );
            await mortgageToken.deployed();

            expect(await mortgageToken.loanNumber()).to.equal(0);

            const feeRate = await mortgageToken.getFeeRate();
            expect(feeRate.value).to.equal(Constant.MORTGAGE_TOKEN_INITIAL_FeeRate);
            expect(feeRate.decimals).to.equal(Constant.COMMON_RATE_DECIMALS);

            const royaltyRate = await mortgageToken.getRoyaltyRate();
            expect(royaltyRate.value).to.equal(Constant.MORTGAGE_TOKEN_INITIAL_RoyaltyRate);
            expect(royaltyRate.decimals).to.equal(Constant.COMMON_RATE_DECIMALS);

            expect(await mortgageToken.admin()).to.equal(admin.address);
            expect(await mortgageToken.estateToken()).to.equal(estateToken.address);
            expect(await mortgageToken.feeReceiver()).to.equal(feeReceiver.address);
            expect(await mortgageToken.commissionToken()).to.equal(commissionToken.address);            
        });


        it('14.1.2. Deploy unsuccessfully with invalid fee rate', async () => {
            const { deployer, admin, estateToken, feeReceiver, commissionToken } = await beforeMortgageTokenTest();

            const MortgageToken = await ethers.getContractFactory('MortgageToken', deployer);

            await expect(upgrades.deployProxy(MortgageToken, [
                admin.address,
                estateToken.address,
                commissionToken.address,
                feeReceiver.address,
                Constant.MORTGAGE_TOKEN_INITIAL_Name,
                Constant.MORTGAGE_TOKEN_INITIAL_Symbol,
                Constant.MORTGAGE_TOKEN_INITIAL_BaseURI,
                Constant.COMMON_RATE_MAX_FRACTION.add(1),
                Constant.MORTGAGE_TOKEN_INITIAL_RoyaltyRate,
            ])).to.be.reverted;
        });

        it('14.1.3. Deploy unsuccessfully with invalid royalty rate', async () => {
            const { deployer, admin, estateToken, feeReceiver, commissionToken } = await beforeMortgageTokenTest();

            const MortgageToken = await ethers.getContractFactory('MortgageToken', deployer);

            await expect(upgrades.deployProxy(MortgageToken, [
                admin.address,
                estateToken.address,
                commissionToken.address,
                feeReceiver.address,
                Constant.MORTGAGE_TOKEN_INITIAL_Name,
                Constant.MORTGAGE_TOKEN_INITIAL_Symbol,
                Constant.MORTGAGE_TOKEN_INITIAL_BaseURI,
                Constant.MORTGAGE_TOKEN_INITIAL_FeeRate,
                Constant.COMMON_RATE_MAX_FRACTION.add(1),
            ])).to.be.reverted;
        });
    });

    // TODO: Andy
    describe('14.2. pause(bytes[])', async () => {

    });

    // TODO: Andy
    describe('14.3. unpause(bytes[])', async () => {

    });

    // TODO: Andy
    describe('14.4. updateBaseURI(string, bytes[])', async () => {

    });

    // TODO: Andy
    describe('14.5. updateRoyaltyRate(string, bytes[])', async () => {

    });

    // TODO: Andy
    describe('14.6. updateFeeRate(uint256, bytes[])', async () => {

    });

    describe('14.7. borrow(uint256, uint256, uint256, uint256, address, uint40)', async () => {
        interface BorrowParams {
            estateId: number;
            mortgageAmount: number;
            principal: number;
            repayment: number;
            currency: string;
            due: number;
        }

        async function revertedWithCustomError(mortgageToken: MortgageToken, borrower: any, params: BorrowParams, error: string) {
            await expect(mortgageToken.connect(borrower).borrow(
                params.estateId,
                params.mortgageAmount,
                params.principal,
                params.repayment,
                params.currency,
                params.due
            )).to.be.revertedWithCustomError(mortgageToken, error);
        }

        async function beforeBorrowTest(fixture: MortgageTokenFixture): Promise<{ defaultParams: BorrowParams }> {
            return {
                defaultParams: {
                    estateId: 1,
                    mortgageAmount: 150_000,
                    principal: 10e5,
                    repayment: 11e5,
                    currency: ethers.constants.AddressZero,
                    due: 1000,
                }
            }
        }

        it('14.7.1. create loan successfully', async () => {
            const fixture = await beforeMortgageTokenTest({
                listSampleCurrencies: true,
                listEstateToken: true,
            });
            const { mortgageToken, estateToken, lender1, lender2, borrower1, borrower2, admins } = fixture;

            let tx = await mortgageToken.connect(borrower1).borrow(1, 150_000, 10e5, 11e5, ethers.constants.AddressZero, 1000);
            await tx.wait();

            expect(tx).to
                .emit(mortgageToken, 'NewLoan')
                .withArgs(1, 150_000, 10e5, 11e5, ethers.constants.AddressZero, 1000);

            expect(await mortgageToken.loanNumber()).to.equal(1);

            let loan = await mortgageToken.getLoan(1);
            expect(loan.estateId).to.equal(1);
            expect(loan.mortgageAmount).to.equal(150_000);
            expect(loan.principal).to.equal(10e5);
            expect(loan.repayment).to.equal(11e5);
            expect(loan.currency).to.equal(ethers.constants.AddressZero);
            expect(loan.due).to.equal(1000);
            expect(loan.state).to.equal(LoanState.Pending);
            expect(loan.borrower).to.equal(borrower1.address);
            expect(loan.lender).to.equal(ethers.constants.AddressZero);

            tx = await mortgageToken.connect(borrower2).borrow(2, 200, 100000, 110000, ethers.constants.AddressZero, 1000);
            await tx.wait();

            expect(tx).to
                .emit(mortgageToken, 'NewLoan')
                .withArgs(2, 200, 100000, 110000, ethers.constants.AddressZero, 1000);

            expect(await mortgageToken.loanNumber()).to.equal(2);

            loan = await mortgageToken.getLoan(2);
            expect(loan.estateId).to.equal(2);
            expect(loan.mortgageAmount).to.equal(200);
            expect(loan.principal).to.equal(100000);
            expect(loan.repayment).to.equal(110000);
            expect(loan.currency).to.equal(ethers.constants.AddressZero);
            expect(loan.due).to.equal(1000);
            expect(loan.state).to.equal(LoanState.Pending);
            expect(loan.borrower).to.equal(borrower2.address);
            expect(loan.lender).to.equal(ethers.constants.AddressZero);
        });

        it('14.7.2. create loan unsuccessfully when paused', async () => {
            const fixture = await beforeMortgageTokenTest({
                listSampleCurrencies: true,
                listEstateToken: true,
                pause: true
            });
            const { mortgageToken, borrower1 } = fixture;

            await expect(mortgageToken.connect(borrower1).borrow(1, 150_000, 10e5, 11e5, ethers.constants.AddressZero, 1000))
                .to.be.revertedWith('Pausable: paused');
        });

        it('14.7.3. create loan unsuccessfully with invalid estate id', async () => {
            const fixture = await beforeMortgageTokenTest({
                listSampleCurrencies: true,
                listEstateToken: true,
            });
            const { mortgageToken, estateToken, borrower1 } = fixture;

            await expect(mortgageToken.connect(borrower1).borrow(0, 150_000, 10e5, 11e5, ethers.constants.AddressZero, 1000))
                .to.be.revertedWithCustomError(mortgageToken, 'InvalidEstateId');

            await expect(mortgageToken.connect(borrower1).borrow(3, 150_000, 10e5, 11e5, ethers.constants.AddressZero, 1000))
                .to.be.revertedWithCustomError(mortgageToken, 'InvalidEstateId');

            estateToken.isAvailable.whenCalledWith(1).returns(false);

            await expect(mortgageToken.connect(borrower1).borrow(1, 150_000, 10e5, 11e5, ethers.constants.AddressZero, 1000))
                .to.be.revertedWithCustomError(mortgageToken, 'InvalidEstateId');
        });

        it('14.7.4. create loan unsuccessfully with invalid currency', async () => {
            const fixture = await beforeMortgageTokenTest({
                listEstateToken: true,
            });
            const { mortgageToken, borrower1 } = fixture;
            const { defaultParams } = await beforeBorrowTest(fixture);

            await revertedWithCustomError(mortgageToken, borrower1, defaultParams, 'InvalidCurrency');
        });

        it('14.7.5. create loan unsuccessfully with invalid mortgage amount', async () => {
            const fixture = await beforeMortgageTokenTest({
                listSampleCurrencies: true,
                listEstateToken: true,
            });
            const { mortgageToken, estateToken, borrower1 } = fixture;
            const { defaultParams } = await beforeBorrowTest(fixture);

            const borrowerBalance = await estateToken.balanceOf(borrower1.address, defaultParams.estateId);

            await revertedWithCustomError(mortgageToken, borrower1, {
                ...defaultParams,
                mortgageAmount: borrowerBalance.add(1),
            }, 'InvalidMortgageAmount');
        });

        it('14.7.6. create loan unsuccessfully with invalid principal', async () => {
            const fixture = await beforeMortgageTokenTest({
                listSampleCurrencies: true,
                listEstateToken: true,
            });
            const { mortgageToken, estateToken, borrower1 } = fixture;
            const { defaultParams } = await beforeBorrowTest(fixture);

            await revertedWithCustomError(mortgageToken, borrower1, {
                ...defaultParams,
                principal: 0,
            }, 'InvalidPrincipal');
        });

        it('14.7.7. create loan unsuccessfully with invalid repayment', async () => {
            const fixture = await beforeMortgageTokenTest({
                listSampleCurrencies: true,
                listEstateToken: true,
            });
            const { mortgageToken, borrower1 } = fixture;
            const { defaultParams } = await beforeBorrowTest(fixture);

            await revertedWithCustomError(mortgageToken, borrower1, {
                ...defaultParams,
                repayment: defaultParams.principal - 1,
            }, 'InvalidRepayment');
        });
    });
});
