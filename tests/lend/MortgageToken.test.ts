import { expect } from 'chai';
import { ethers, upgrades } from 'hardhat';
import {
    Admin,
    CommissionToken,
    Currency,
    FeeReceiver,
    IERC165Upgradeable__factory,
    IERC2981Upgradeable__factory,
    MockEstateToken,
    MockEstateForger__factory,
    MortgageToken,
    MockEstateForger,
    CommissionToken__factory,
    IEstateTokenReceiver__factory,
    IERC1155ReceiverUpgradeable__factory,
    ICommon__factory,
    IRoyaltyRateProposer__factory,
    IERC721MetadataUpgradeable__factory,
    IERC721Upgradeable__factory,
    PriceWatcher,
    ReserveVault,
} from '@typechain-types';
import { callTransaction, getBalance, getSignatures, prepareERC20, prepareNativeToken, randomWallet, resetERC20, resetNativeToken, testReentrancy } from '@utils/blockchain';
import { Constant } from '@tests/test.constant';
import { deployAdmin } from '@utils/deployments/common/admin';
import { deployFeeReceiver } from '@utils/deployments/common/feeReceiver';
import { deployCurrency } from '@utils/deployments/common/currency';
import { loadFixture, time } from "@nomicfoundation/hardhat-network-helpers";

import { MockContract, smock } from '@defi-wonderland/smock';

import {
    callAdmin_ActivateIn,
    callAdmin_AuthorizeManagers,
    callAdmin_AuthorizeModerators,
    callAdmin_DeclareZones,
    callAdmin_UpdateCurrencyRegistries,
} from '@utils/callWithSignatures/admin';
import { BigNumber, Contract } from 'ethers';
import { getBytes4Hex, getInterfaceID, randomBigNumber, structToObject } from '@utils/utils';
import { deployMortgageToken } from '@utils/deployments/lend/mortgageToken';
import { callEstateToken_AuthorizeTokenizers, callEstateToken_UpdateCommissionToken, callEstateToken_UpdateZoneRoyaltyRate } from '@utils/callWithSignatures/estateToken';
import { callMortgageToken_Pause, callMortgageToken_UpdateFeeRate } from '@utils/callWithSignatures/mortgageToken';
import { deployFailReceiver } from '@utils/deployments/mock/failReceiver';
import { deployReentrancyERC1155Holder } from '@utils/deployments/mock/mockReentrancy/reentrancyERC1155Holder';
import { deployReentrancy } from '@utils/deployments/mock/mockReentrancy/reentrancy';
import { LoanState } from '@utils/models/enums';
import { Initialization as LandInitialization } from '@tests/land/test.initialization';
import { Initialization as LendInitialization } from '@tests/lend/test.initialization';
import { deployReserveVault } from '@utils/deployments/common/reserveVault';
import { deployPriceWatcher } from '@utils/deployments/common/priceWatcher';
import { MockValidator } from '@utils/mockValidator';
import { getCallTokenizeEstateTx, getRegisterCustodianTx } from '@utils/transaction/EstateToken';
import { RegisterCustodianParams } from '@utils/models/EstateToken';
import { getRegisterBrokerTx } from '@utils/transaction/CommissionToken';


async function testReentrancy_mortgageToken(
    mortgageToken: MortgageToken,
    reentrancyContract: Contract,
    assertion: any,
) {
    let data = [
        mortgageToken.interface.encodeFunctionData("lend", [0]),
        mortgageToken.interface.encodeFunctionData("repay", [0]),
        mortgageToken.interface.encodeFunctionData("safeLend", [0, 0]),
        mortgageToken.interface.encodeFunctionData("safeRepay", [0, 0]),
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
    priceWatcher: PriceWatcher;
    reserveVault: ReserveVault;
    currency: Currency;
    estateToken: MockContract<MockEstateToken>;
    commissionToken: MockContract<CommissionToken>;
    mortgageToken: MortgageToken;
    estateForger: MockContract<MockEstateForger>;
    validator: MockValidator;

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
    mortgageTokenOwner: any;

    zone1: string;
    zone2: string;

    mockCurrencyExclusiveRate: BigNumber;
}

describe('3.1. MortgageToken', async () => {
    async function mortgageTokenFixture(): Promise<MortgageTokenFixture> {
        const accounts = await ethers.getSigners();
        const deployer = accounts[0];
        const admins = [];
        for (let i = 1; i <= Constant.ADMIN_NUMBER; ++i) admins.push(accounts[i]);
        const lender1 = accounts[Constant.ADMIN_NUMBER + 1];
        const lender2 = accounts[Constant.ADMIN_NUMBER + 2];
        const borrower1 = accounts[Constant.ADMIN_NUMBER + 3];
        const borrower2 = accounts[Constant.ADMIN_NUMBER + 4];
        const manager = accounts[Constant.ADMIN_NUMBER + 5];
        const moderator = accounts[Constant.ADMIN_NUMBER + 6];
        const mortgageTokenOwner = accounts[Constant.ADMIN_NUMBER + 8];
        const custodian1 = accounts[Constant.ADMIN_NUMBER + 9];
        const custodian2 = accounts[Constant.ADMIN_NUMBER + 10];
        const broker1 = accounts[Constant.ADMIN_NUMBER + 11];
        const broker2 = accounts[Constant.ADMIN_NUMBER + 12];

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
            admin.address
        ) as PriceWatcher;

        const reserveVault = await deployReserveVault(
            deployer.address,
            admin.address
        ) as ReserveVault;

        const validator = new MockValidator(deployer as any);

        const currency = await deployCurrency(
            deployer.address,
            'MockCurrency',
            'MCK'
        ) as Currency;
        const mockCurrencyExclusiveRate = ethers.utils.parseEther('0.3');
        await callTransaction(currency.setExclusiveDiscount(mockCurrencyExclusiveRate, Constant.COMMON_RATE_DECIMALS));

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

        const MockEstateForgerFactory = await smock.mock<MockEstateForger__factory>('MockEstateForger');
        const estateForger = await MockEstateForgerFactory.deploy();
        await callTransaction(estateForger.initialize(
            admin.address,
            estateToken.address,
            commissionToken.address,
            priceWatcher.address,
            feeReceiver.address,
            reserveVault.address,
            validator.getAddress(),
            LandInitialization.ESTATE_FORGER_BaseMinUnitPrice,
            LandInitialization.ESTATE_FORGER_BaseMaxUnitPrice,
        ));

        const mortgageToken = await deployMortgageToken(
            deployer.address,
            admin.address,
            estateToken.address,
            commissionToken.address,
            feeReceiver.address,
            LendInitialization.MORTGAGE_TOKEN_Name,
            LendInitialization.MORTGAGE_TOKEN_Symbol,
            LendInitialization.MORTGAGE_TOKEN_BaseURI,
            LendInitialization.MORTGAGE_TOKEN_FeeRate,
        ) as MortgageToken;

        const zone1 = ethers.utils.formatBytes32String("TestZone1");
        const zone2 = ethers.utils.formatBytes32String("TestZone2");

        return {
            admin,
            feeReceiver,
            priceWatcher,
            reserveVault,
            currency,
            estateToken,
            commissionToken,
            mortgageToken,
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
            mockCurrencyExclusiveRate,
            mortgageTokenOwner,
            zone1,
            zone2,
        };
    };

    async function beforeMortgageTokenTest({
        listSampleCurrencies = false,
        listEstateToken = false,
        listSampleLoan = false,
        listSampleLending = false,
        pause = false,
    } = {}): Promise<MortgageTokenFixture> {
        const fixture = await loadFixture(mortgageTokenFixture);

        const {
            admin,
            admins,
            currency,
            estateToken,
            commissionToken,
            mortgageToken,
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
            zone2 
        } = fixture;

        await callAdmin_AuthorizeManagers(
            admin,
            admins,
            [manager.address],
            true,
            await admin.nonce()
        );

        await callAdmin_AuthorizeModerators(
            admin,
            admins,
            [moderator.address],
            true,
            await admin.nonce()
        );

        await callAdmin_DeclareZones(
            admin,
            admins,
            [zone1, zone2],
            true,
            await fixture.admin.nonce()
        );

        for (const zone of [zone1, zone2]) {
            await callAdmin_ActivateIn(
                admin,
                admins,
                zone,
                [manager.address, moderator.address],
                true,
                await admin.nonce(),
            );
        }

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
            await admin.nonce()
        );

        for (const zone of [zone1, zone2]) {
            for (const custodian of [custodian1, custodian2]) {
                const params: RegisterCustodianParams = {
                    zone,
                    custodian: custodian.address,
                    uri: "TestURI",
                };
                await callTransaction(getRegisterCustodianTx(estateToken as any, validator, manager, params))
            }
        }

        await callTransaction(getRegisterBrokerTx(commissionToken as any, manager, {
            zone: zone1,
            broker: broker1.address,
            commissionRate: ethers.utils.parseEther('0.1'),
        }));
        await callTransaction(getRegisterBrokerTx(commissionToken as any, manager, {
            zone: zone2,
            broker: broker2.address,
            commissionRate: ethers.utils.parseEther('0.2'),
        }));

        let currentTimestamp = await time.latest();

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
            currentTimestamp += 1000;

            await time.setNextBlockTimestamp(currentTimestamp);

            await callTransaction(getCallTokenizeEstateTx(estateToken as any, estateForger, {
                totalSupply: BigNumber.from(10_000),
                zone: zone1,
                tokenizationId: BigNumber.from(10),
                uri: "Token1_URI",
                expireAt: currentTimestamp + 1e8,
                custodian: custodian1.address,
                broker: broker1.address,
            }));
            await callTransaction(getCallTokenizeEstateTx(estateToken as any, estateForger, {
                totalSupply: BigNumber.from(10_000),
                zone: zone2,
                tokenizationId: BigNumber.from(10),
                uri: "Token2_URI",
                expireAt: currentTimestamp + 2e8,
                custodian: custodian2.address,
                broker: broker2.address,
            }));

            estateToken.isAvailable.whenCalledWith(1).returns(true);
            estateToken.isAvailable.whenCalledWith(2).returns(true);

            await estateToken.mint(borrower1.address, 1, 200_000);
            await estateToken.mint(borrower2.address, 1, 300_000);

            await estateToken.mint(borrower1.address, 2, 200);
            await estateToken.mint(borrower2.address, 2, 300);
        }

        if (listSampleLoan) {
            await callTransaction(mortgageToken.connect(borrower1).borrow(
                1,
                150_000,
                10e5,
                11e5,
                ethers.constants.AddressZero,
                1000
            ));
            await callTransaction(estateToken.connect(borrower1).setApprovalForAll(mortgageToken.address, true));
    
            await callTransaction(mortgageToken.connect(borrower2).borrow(
                2,
                200,
                100000,
                110000,
                currency.address,
                1000
            ));
            await callTransaction(estateToken.connect(borrower2).setApprovalForAll(mortgageToken.address, true));
            
            await prepareERC20(
                currency,
                [borrower1, borrower2, lender1, lender2],
                [mortgageToken],
                1e9
            );
        }
        
        if (listSampleLending) {
            currentTimestamp += 100;
            await time.setNextBlockTimestamp(currentTimestamp);
            await callTransaction(mortgageToken.connect(lender1).lend(1, { value: 1e9 }));

            currentTimestamp += 100;
            await time.setNextBlockTimestamp(currentTimestamp);
            await callTransaction(mortgageToken.connect(lender2).lend(2));
        }

        if (pause) {
            await callMortgageToken_Pause(
                mortgageToken,
                admins,
                await admin.nonce()
            );
        }

        return {
            ...fixture,
        }
    }

    describe('3.1.1. initialize(address, address, address, address, string, string, string, uint256, uint256)', async () => {
        it('3.1.1.1. Deploy successfully', async () => {
            const { admin, estateToken, feeReceiver, commissionToken, mortgageToken } = await beforeMortgageTokenTest();

            const tx = mortgageToken.deployTransaction;
            await expect(tx).to.emit(mortgageToken, "BaseURIUpdate").withArgs(LendInitialization.MORTGAGE_TOKEN_BaseURI);
            await expect(tx).to.emit(mortgageToken, "FeeRateUpdate").withArgs(
                (rate: any) => {
                    expect(structToObject(rate)).to.deep.equal({
                        value: LendInitialization.MORTGAGE_TOKEN_FeeRate,
                        decimals: Constant.COMMON_RATE_DECIMALS,
                    });
                    return true;
                }
            );

            expect(await mortgageToken.loanNumber()).to.equal(0);

            const feeRate = await mortgageToken.getFeeRate();
            expect(structToObject(feeRate)).to.deep.equal({
                value: LendInitialization.MORTGAGE_TOKEN_FeeRate,
                decimals: Constant.COMMON_RATE_DECIMALS,
            });

            expect(await mortgageToken.admin()).to.equal(admin.address);
            expect(await mortgageToken.estateToken()).to.equal(estateToken.address);
            expect(await mortgageToken.feeReceiver()).to.equal(feeReceiver.address);
            expect(await mortgageToken.commissionToken()).to.equal(commissionToken.address);            
        });


        it('3.1.1.2. Deploy unsuccessfully with invalid fee rate', async () => {
            const { deployer, admin, estateToken, feeReceiver, commissionToken } = await beforeMortgageTokenTest();

            const MortgageToken = await ethers.getContractFactory('MortgageToken', deployer);

            await expect(upgrades.deployProxy(MortgageToken, [
                admin.address,
                estateToken.address,
                commissionToken.address,
                feeReceiver.address,
                LendInitialization.MORTGAGE_TOKEN_Name,
                LendInitialization.MORTGAGE_TOKEN_Symbol,
                LendInitialization.MORTGAGE_TOKEN_BaseURI,
                Constant.COMMON_RATE_MAX_FRACTION.add(1),
            ])).to.be.reverted;
        });
    });

    describe('3.1.2. updateBaseURI(string, bytes[])', async () => {
        it('3.1.2.1. updateBaseURI successfully with valid signatures', async () => {
            const { mortgageToken, admin, admins } = await beforeMortgageTokenTest({});

            const message = ethers.utils.defaultAbiCoder.encode(
                ["address", "string", "string"],
                [mortgageToken.address, "updateBaseURI", "NewBaseURI:"]
            );
            const signatures = await getSignatures(message, admins, await admin.nonce());

            const tx = await mortgageToken.updateBaseURI("NewBaseURI:", signatures);
            await tx.wait();

            await expect(tx).to
                .emit(mortgageToken, 'BaseURIUpdate')
                .withArgs("NewBaseURI:");

            expect(await mortgageToken.tokenURI(1)).to.equal("NewBaseURI:");
            expect(await mortgageToken.tokenURI(2)).to.equal("NewBaseURI:");
        });

        it('3.1.2.2. updateBaseURI unsuccessfully with invalid signatures', async () => {
            const { mortgageToken, admin, admins } = await beforeMortgageTokenTest({});

            const message = ethers.utils.defaultAbiCoder.encode(
                ["address", "string", "string"],
                [mortgageToken.address, "updateBaseURI", "NewBaseURI:"]
            );
            const invalidSignatures = await getSignatures(message, admins, (await admin.nonce()).add(1));

            await expect(mortgageToken.updateBaseURI(
                "NewBaseURI:",
                invalidSignatures
            )).to.be.revertedWithCustomError(admin, 'FailedVerification');
        });
    });

    describe('3.1.3. updateFeeRate(uint256, bytes[])', async () => {
        it('3.1.3.1. updateFeeRate successfully with valid signatures', async () => {
            const { mortgageToken, admin, admins } = await beforeMortgageTokenTest({});

            const rateValue = ethers.utils.parseEther('0.2');

            const message = ethers.utils.defaultAbiCoder.encode(
                ["address", "string", "uint256"],
                [mortgageToken.address, "updateFeeRate", rateValue]
            );

            const signatures = await getSignatures(message, admins, await admin.nonce());

            const tx = await mortgageToken.updateFeeRate(rateValue, signatures);
            await tx.wait();

            await expect(tx).to
                .emit(mortgageToken, 'FeeRateUpdate')
                .withArgs(
                    (rate: any) => {
                        expect(structToObject(rate)).to.deep.equal({
                            value: rateValue,
                            decimals: Constant.COMMON_RATE_DECIMALS,
                        });
                        return true;
                    }
                );

            const feeRate = await mortgageToken.getFeeRate();
            expect(structToObject(feeRate)).to.deep.equal({
                value: rateValue,
                decimals: Constant.COMMON_RATE_DECIMALS,
            });
        });

        it('3.1.3.2. updateFeeRate unsuccessfully with invalid signatures', async () => {
            const { mortgageToken, admin, admins } = await beforeMortgageTokenTest({});

            const message = ethers.utils.defaultAbiCoder.encode(
                ["address", "string", "uint256"],
                [mortgageToken.address, "updateFeeRate", ethers.utils.parseEther('0.2')]
            );
            const invalidSignatures = await getSignatures(message, admins, (await admin.nonce()).add(1));

            await expect(mortgageToken.updateFeeRate(
                ethers.utils.parseEther('0.2'),
                invalidSignatures
            )).to.be.revertedWithCustomError(admin, 'FailedVerification');
        });

        it('3.1.3.3. updateFeeRate unsuccessfully with invalid rate', async () => {
            const { mortgageToken, admin, admins } = await beforeMortgageTokenTest({});

            let message = ethers.utils.defaultAbiCoder.encode(
                ["address", "string", "uint256"],
                [mortgageToken.address, "updateFeeRate", Constant.COMMON_RATE_MAX_FRACTION.add(1)]
            );
            const signatures = await getSignatures(message, admins, await admin.nonce());

            await expect(mortgageToken.updateFeeRate(
                Constant.COMMON_RATE_MAX_FRACTION.add(1),
                signatures
            )).to.be.revertedWithCustomError(mortgageToken, 'InvalidRate');
        });
    });

    describe('3.1.4. borrow(uint256, uint256, uint256, uint256, address, uint40)', async () => {
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

        it('3.1.4.1. create loan successfully', async () => {
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

            expect(await mortgageToken.tokenURI(1)).to.equal(LendInitialization.MORTGAGE_TOKEN_BaseURI);

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

            expect(await mortgageToken.tokenURI(2)).to.equal(LendInitialization.MORTGAGE_TOKEN_BaseURI);
        });

        it('3.1.4.2. create loan unsuccessfully when paused', async () => {
            const fixture = await beforeMortgageTokenTest({
                listSampleCurrencies: true,
                listEstateToken: true,
                pause: true
            });
            const { mortgageToken, borrower1 } = fixture;

            await expect(mortgageToken.connect(borrower1).borrow(1, 150_000, 10e5, 11e5, ethers.constants.AddressZero, 1000))
                .to.be.revertedWith('Pausable: paused');
        });

        it('3.1.4.3. create loan unsuccessfully with invalid estate id', async () => {
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

        it('3.1.4.4. create loan unsuccessfully with invalid currency', async () => {
            const fixture = await beforeMortgageTokenTest({
                listEstateToken: true,
            });
            const { mortgageToken, borrower1 } = fixture;
            const { defaultParams } = await beforeBorrowTest(fixture);

            await revertedWithCustomError(mortgageToken, borrower1, defaultParams, 'InvalidCurrency');
        });

        it('3.1.4.5. create loan unsuccessfully with invalid mortgage amount', async () => {
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

        it('3.1.4.6. create loan unsuccessfully with invalid principal', async () => {
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

        it('3.1.4.7. create loan unsuccessfully with invalid repayment', async () => {
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

    describe('3.1.5. cancel(uint256)', async () => {
        it('3.1.5.1. cancel loan successfully by borrower', async () => {
            const fixture = await beforeMortgageTokenTest({
                listSampleCurrencies: true,
                listEstateToken: true,
                listSampleLoan: true,
            });
            const { mortgageToken, borrower1 } = fixture;

            let tx = await mortgageToken.connect(borrower1).cancel(1);
            await tx.wait();

            expect(tx).to
                .emit(mortgageToken, 'LoanCancellation')
                .withArgs(1);

            expect(await mortgageToken.loanNumber()).to.equal(2);

            let loan = await mortgageToken.getLoan(1);
            expect(loan.estateId).to.equal(1);
            expect(loan.mortgageAmount).to.equal(150_000);
            expect(loan.principal).to.equal(10e5);
            expect(loan.repayment).to.equal(11e5);
            expect(loan.currency).to.equal(ethers.constants.AddressZero);
            expect(loan.due).to.equal(1000);
            expect(loan.state).to.equal(LoanState.Cancelled);
            expect(loan.borrower).to.equal(borrower1.address);
            expect(loan.lender).to.equal(ethers.constants.AddressZero);
        });

        it('3.1.5.2. cancel loan successfully by manager', async () => {
            const fixture = await beforeMortgageTokenTest({
                listSampleCurrencies: true,
                listEstateToken: true,
                listSampleLoan: true,
            });
            const { mortgageToken, borrower2, manager, currency } = fixture;

            let tx = await mortgageToken.connect(manager).cancel(2);
            await tx.wait();

            expect(tx).to
                .emit(mortgageToken, 'LoanCancellation')
                .withArgs(2);

            expect(await mortgageToken.loanNumber()).to.equal(2);

            let loan = await mortgageToken.getLoan(2);
            expect(loan.estateId).to.equal(2);
            expect(loan.mortgageAmount).to.equal(200);
            expect(loan.principal).to.equal(100000);
            expect(loan.repayment).to.equal(110000);
            expect(loan.currency).to.equal(currency.address);
            expect(loan.due).to.equal(1000);
            expect(loan.state).to.equal(LoanState.Cancelled);
            expect(loan.borrower).to.equal(borrower2.address);
            expect(loan.lender).to.equal(ethers.constants.AddressZero);
        });

        it('3.1.5.3. cancel loan unsuccessfully by unauthorized user', async () => {
            const fixture = await beforeMortgageTokenTest({
                listSampleCurrencies: true,
                listEstateToken: true,
                listSampleLoan: true,
            });
            const { mortgageToken, lender1, moderator } = fixture;
            await expect(mortgageToken.connect(lender1).cancel(1))
                .to.be.revertedWithCustomError(mortgageToken, 'Unauthorized');
            await expect(mortgageToken.connect(moderator).cancel(1))
                .to.be.revertedWithCustomError(mortgageToken, 'Unauthorized');
        });

        it('3.1.5.4. cancel loan unsuccessfully with invalid loan id', async () => {
            const fixture = await beforeMortgageTokenTest({
                listSampleCurrencies: true,
                listEstateToken: true,
                listSampleLoan: true,
            });
            const { mortgageToken, borrower1 } = fixture;
            await expect(mortgageToken.connect(borrower1).cancel(0))
                .to.be.revertedWithCustomError(mortgageToken, 'InvalidLoanId');

            await expect(mortgageToken.connect(borrower1).cancel(3))
                .to.be.revertedWithCustomError(mortgageToken, 'InvalidLoanId');
        });

        it('3.1.5.5. cancel loan unsuccessfully with cancelled loan', async () => {
            const fixture = await beforeMortgageTokenTest({
                listSampleCurrencies: true,
                listEstateToken: true,
                listSampleLoan: true,
            });
            const { mortgageToken, borrower1 } = fixture;
            await callTransaction(mortgageToken.connect(borrower1).cancel(1));

            await expect(mortgageToken.connect(borrower1).cancel(1))
                .to.be.revertedWithCustomError(mortgageToken, 'InvalidCancelling');
        });

        it('3.1.5.6. cancel loan unsuccessfully with supplied loan', async () => {
            const fixture = await beforeMortgageTokenTest({
                listSampleCurrencies: true,
                listEstateToken: true,
                listSampleLoan: true,
            });
            const { mortgageToken, borrower1, lender1 } = fixture;

            await callTransaction(mortgageToken.connect(lender1).lend(1, { value: 1e9 }));

            await expect(mortgageToken.connect(borrower1).cancel(1))
                .to.be.revertedWithCustomError(mortgageToken, 'InvalidCancelling');
        });

        it('3.1.5.7. cancel loan unsuccessfully with foreclosed loan', async () => {
            const fixture = await beforeMortgageTokenTest({
                listSampleCurrencies: true,
                listEstateToken: true,
                listSampleLoan: true,
            });
            const { mortgageToken, borrower1, lender1 } = fixture;

            await callTransaction(mortgageToken.connect(lender1).lend(1, { value: 1e9 }));

            const due = (await mortgageToken.getLoan(1)).due;

            await time.setNextBlockTimestamp(due);
            await callTransaction(mortgageToken.connect(lender1).foreclose(1));

            await expect(mortgageToken.connect(borrower1).cancel(1))
                .to.be.revertedWithCustomError(mortgageToken, 'InvalidCancelling');
        });

        it('3.1.5.8. cancel loan unsuccessfully with repaid loan', async () => {
            const fixture = await beforeMortgageTokenTest({
                listSampleCurrencies: true,
                listEstateToken: true,
                listSampleLoan: true,
            });
            const { mortgageToken, borrower1, lender1 } = fixture;

            await callTransaction(mortgageToken.connect(lender1).lend(1, { value: 1e9 }));

            await callTransaction(mortgageToken.connect(borrower1).repay(1, { value: 1e9 }));

            await expect(mortgageToken.connect(borrower1).cancel(1))
                .to.be.revertedWithCustomError(mortgageToken, 'InvalidCancelling');
        });
    });


    describe('3.1.6. lend(uint256)', async () => {
        async function testLend(
            fixture: MortgageTokenFixture,
            currencyExclusiveRate: BigNumber,
            commissionTokenRate: BigNumber,
            mortgageTokenFeeRate: BigNumber,
            isERC20: boolean,
            isExclusive: boolean,
            initialAmount: BigNumber,
            mortgageAmount: BigNumber,
            principal: BigNumber,
            repayment: BigNumber,
        ) {
            const { mortgageToken, admin, admins, commissionToken, deployer, estateToken, estateForger, borrower1, lender1, feeReceiver, custodian1, manager, zone1 } = fixture;

            const currentLoanId = (await mortgageToken.loanNumber()).add(1);
            const currentTokenizationId = 0 // Does not matter
            const zone = zone1;
            const borrower = borrower1;
            const lender = lender1;
            const broker = randomWallet();
            
            await callMortgageToken_UpdateFeeRate(mortgageToken, admins, mortgageTokenFeeRate, await admin.nonce());

            await callTransaction(getRegisterBrokerTx(commissionToken as any, manager, {
                zone,
                broker: broker.address,
                commissionRate: commissionTokenRate,
            }));

            let newCurrency: Currency | undefined;
            let newCurrencyAddress: string;
            if (isERC20) {
                newCurrency = await deployCurrency(
                    deployer.address,
                    `NewMockCurrency_${currentLoanId}`,
                    `NMC_${currentLoanId}`
                ) as Currency;
                await newCurrency.setExclusiveDiscount(currencyExclusiveRate, Constant.COMMON_RATE_DECIMALS);
                newCurrencyAddress = newCurrency.address;
            } else {
                newCurrencyAddress = ethers.constants.AddressZero;
            }
            

            await callAdmin_UpdateCurrencyRegistries(
                admin,
                admins,
                [newCurrencyAddress],
                [true],
                [isExclusive],
                await admin.nonce()
            );

            let currentTimestamp = await time.latest() + 10;

            await callTransaction(estateForger.call(estateToken.address, estateToken.interface.encodeFunctionData("tokenizeEstate", [
                0,
                zone,
                currentTokenizationId,
                "TestURI",
                currentTimestamp + 1e9,
                custodian1.address,
                broker.address,
            ])));

            const currentEstateId = await estateToken.estateNumber();

            await callTransaction(estateToken.mint(borrower.address, currentEstateId, initialAmount));
            await callTransaction(estateToken.connect(borrower).setApprovalForAll(mortgageToken.address, true));

            const walletsToReset = [feeReceiver, broker];
            if (isERC20) {
                await resetERC20(newCurrency!, walletsToReset);
            } else {
                await resetNativeToken(ethers.provider, walletsToReset);
            }

            const due = 1000;

            let receipt = await callTransaction(mortgageToken.connect(borrower).borrow(
                currentLoanId,
                mortgageAmount,
                principal,
                repayment,
                newCurrencyAddress,
                due
            ));

            let fee = principal.mul(mortgageTokenFeeRate).div(Constant.COMMON_RATE_MAX_FRACTION);
            if (isExclusive) {
                fee = fee.sub(fee.mul(currencyExclusiveRate).div(Constant.COMMON_RATE_MAX_FRACTION));
            }
            let commissionAmount = fee.mul(commissionTokenRate).div(Constant.COMMON_RATE_MAX_FRACTION);

            let ethValue = ethers.BigNumber.from(0);
            await prepareNativeToken(ethers.provider, deployer, [lender], ethers.utils.parseEther("1.0"));
            if (isERC20) {
                await prepareERC20(newCurrency!, [lender], [mortgageToken], principal);
            } else {
                ethValue = principal;
                await prepareNativeToken(ethers.provider, deployer, [lender], principal);
            }

            let currentTotalSupply = await mortgageToken.totalSupply();

            let initBorrowerBalance = await getBalance(ethers.provider, borrower.address, newCurrency);
            let initLenderBalance = await getBalance(ethers.provider, lender.address, newCurrency);
            let initFeeReceiverBalance = await getBalance(ethers.provider, feeReceiver.address, newCurrency);
            let initBrokerBalance = await getBalance(ethers.provider, broker.address, newCurrency);

            currentTimestamp += 100;
            await time.setNextBlockTimestamp(currentTimestamp);

            let tx = await mortgageToken.connect(lender).lend(
                currentLoanId,
                { value: ethValue }
            );
            receipt = await tx.wait();

            let expectedBorrowerBalance = initBorrowerBalance.add(principal).sub(fee);
            let expectedLenderBalance = initLenderBalance.sub(principal);
            let expectedFeeReceiverBalance = initFeeReceiverBalance.add(fee.sub(commissionAmount));
            let expectedBrokerBalance = initBrokerBalance.add(commissionAmount);

            if (!isERC20) {
                const gasFee = receipt.gasUsed.mul(receipt.effectiveGasPrice);
                expectedLenderBalance = expectedLenderBalance.sub(gasFee);
            }

            await expect(tx).to.emit(mortgageToken, 'NewToken').withArgs(
                currentLoanId,
                lender.address,
                currentTimestamp + due,
                fee,
            );
            await expect(tx).to.emit(mortgageToken, 'CommissionDispatch').withArgs(
                broker.address,
                commissionAmount,
                newCurrencyAddress
            );

            let loan = await mortgageToken.getLoan(currentLoanId);
            expect(loan.estateId).to.equal(currentEstateId);
            expect(loan.mortgageAmount).to.equal(mortgageAmount);
            expect(loan.principal).to.equal(principal);
            expect(loan.repayment).to.equal(repayment);
            expect(loan.currency).to.equal(newCurrencyAddress);
            expect(loan.due).to.equal(currentTimestamp + due);
            expect(loan.state).to.equal(LoanState.Supplied);
            expect(loan.borrower).to.equal(borrower.address);
            expect(loan.lender).to.equal(lender.address);

            expect(await mortgageToken.totalSupply()).to.equal(currentTotalSupply.add(1));

            expect(await getBalance(ethers.provider, borrower.address, newCurrency)).to.equal(expectedBorrowerBalance);
            expect(await getBalance(ethers.provider, lender.address, newCurrency)).to.equal(expectedLenderBalance);
            expect(await getBalance(ethers.provider, feeReceiver.address, newCurrency)).to.equal(expectedFeeReceiverBalance);
            expect(await getBalance(ethers.provider, broker.address, newCurrency)).to.equal(expectedBrokerBalance);

            expect(await estateToken.balanceOf(borrower.address, currentEstateId)).to.equal(initialAmount.sub(mortgageAmount));
            expect(await estateToken.balanceOf(mortgageToken.address, currentEstateId)).to.equal(mortgageAmount);

            expect(await mortgageToken.ownerOf(currentLoanId)).to.equal(lender.address);

            if (isERC20) {
                await resetERC20(newCurrency!, [borrower, lender, feeReceiver, broker]);
            } else {
                await resetNativeToken(ethers.provider, [borrower, lender, feeReceiver, broker]);
                await prepareNativeToken(ethers.provider, deployer, [borrower, lender], ethers.utils.parseEther("1.0"));
            }
        }

        it('3.1.6.1. lend successfully in native and erc20 token', async () => {
            const fixture = await beforeMortgageTokenTest({});
            await testLend(
                fixture,
                fixture.mockCurrencyExclusiveRate,
                ethers.utils.parseEther('0.1'),
                LendInitialization.MORTGAGE_TOKEN_FeeRate,
                false,
                false,
                ethers.BigNumber.from(200_000),
                ethers.BigNumber.from(150_000),
                ethers.BigNumber.from(10e5),
                ethers.BigNumber.from(11e5),
            )

            await testLend(
                fixture,
                fixture.mockCurrencyExclusiveRate,
                ethers.utils.parseEther('0.1'),
                LendInitialization.MORTGAGE_TOKEN_FeeRate,
                true,
                true,
                ethers.BigNumber.from(300),
                ethers.BigNumber.from(200),
                ethers.BigNumber.from(100000),
                ethers.BigNumber.from(110000),
            )
        });

        it('3.1.6.2. lend successfully in all native/erc20 and exclusive/non-exclusive combinations', async () => {
            const fixture = await beforeMortgageTokenTest({});
            for (const isERC20 of [false, true]) {
                for (const isExclusive of [false, true]) {
                    if (isExclusive && !isERC20) {
                        continue;
                    }
                    await testLend(
                        fixture,
                        fixture.mockCurrencyExclusiveRate,
                        ethers.utils.parseEther('0.1'),
                        LendInitialization.MORTGAGE_TOKEN_FeeRate,
                        isERC20,
                        isExclusive,
                        ethers.BigNumber.from(200_000),
                        ethers.BigNumber.from(150_000),
                        ethers.BigNumber.from(10e5),
                        ethers.BigNumber.from(11e5),
                    )
                }
            }
        });

        it('3.1.6.3. lend successfully with very large amount in all native/erc20 and exclusive/non-exclusive combinations', async () => {
            const fixture = await beforeMortgageTokenTest({});
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
                        ethers.utils.parseEther("0.99"),
                        ethers.utils.parseEther("0.99"),
                        ethers.utils.parseEther("0.99"),
                        isERC20,
                        isExclusive,
                        amount.add(1),
                        amount,
                        principal,
                        repayment,
                    )
                }
            }
        });

        it('3.1.6.4. lend successfully in 100 random test cases', async () => {
            const fixture = await beforeMortgageTokenTest({});
            for (let testcase = 0; testcase < 100; testcase++) {
                const isERC20 = Math.random() < 0.5;
                const isExclusive = Math.random() < 0.5;
                const feeRate = randomBigNumber(ethers.constants.Zero, ethers.utils.parseEther("1.0"));
                const exclusiveRate = randomBigNumber(ethers.constants.Zero, ethers.utils.parseEther("1.0"));
                const commissionRate = randomBigNumber(ethers.constants.Zero, ethers.utils.parseEther("1.0"));

                if (isExclusive && !isERC20) {
                    --testcase;
                    continue;
                }

                let randomNums = []
                for (let i = 0; i < 2; ++i) {
                    const maxSupply = ethers.BigNumber.from(2).pow(255);
                    randomNums.push(ethers.BigNumber.from(ethers.utils.randomBytes(32)).mod(maxSupply).add(1));
                }
                randomNums.sort((a, b) => a.sub(b).lt(0) ? -1 : 1);

                const initAmount = randomNums[1];
                const mortgageAmount = randomNums[0];

                randomNums = [];
                for (let i = 0; i < 2; ++i) {
                    const maxSupply = ethers.BigNumber.from(2).pow(255);
                    randomNums.push(ethers.BigNumber.from(ethers.utils.randomBytes(32)).mod(maxSupply).add(1));
                }
                randomNums.sort((a, b) => a.sub(b).lt(0) ? -1 : 1);

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
                    mortgageAmount,
                    principal,
                    repayment,
                );
            }
        });

        it('3.1.6.5. lend unsuccessfully when paused', async () => {
            const fixture = await beforeMortgageTokenTest({
                listSampleCurrencies: true,
                listEstateToken: true,
                listSampleLoan: true,
                pause: true,
            });
            const { mortgageToken, borrower1 } = fixture;

            await expect(mortgageToken.connect(borrower1).lend(1, { value: 1e9 }))
                .to.be.revertedWith("Pausable: paused");
        });

        it('3.1.6.6. lend unsuccessfully with invalid loan id', async () => {
            const fixture = await beforeMortgageTokenTest({
                listSampleCurrencies: true,
                listEstateToken: true,
                listSampleLoan: true,
            });
            const { mortgageToken, borrower1 } = fixture;

            await expect(mortgageToken.connect(borrower1).lend(0, { value: 1e9 }))
                .to.be.revertedWithCustomError(mortgageToken, "InvalidLoanId");

            await expect(mortgageToken.connect(borrower1).lend(3, { value: 1e9 }))
                .to.be.revertedWithCustomError(mortgageToken, "InvalidLoanId");
        });

        it('3.1.6.7. lend unsuccessfully when borrower lend their own loan', async () => {
            const fixture = await beforeMortgageTokenTest({
                listSampleCurrencies: true,
                listEstateToken: true,
                listSampleLoan: true,
            });
            const { mortgageToken, borrower1, borrower2 } = fixture;

            await expect(mortgageToken.connect(borrower1).lend(1, { value: 1e9 }))
                .to.be.revertedWithCustomError(mortgageToken, "InvalidLending");

            await expect(mortgageToken.connect(borrower2).lend(2, { value: 1e9 }))
                .to.be.revertedWithCustomError(mortgageToken, "InvalidLending");
        });

        it('3.1.6.8. lend unsuccessfully with supplied loan', async () => {
            const fixture = await beforeMortgageTokenTest({
                listSampleCurrencies: true,
                listEstateToken: true,
                listSampleLoan: true,
            });
            const { mortgageToken, borrower1, lender1, lender2 } = fixture;

            await callTransaction(mortgageToken.connect(lender1).lend(1, { value: 1e9 }));

            await expect(mortgageToken.connect(lender1).lend(1, { value: 1e9 }))
                .to.be.revertedWithCustomError(mortgageToken, "InvalidLending");
            await expect(mortgageToken.connect(lender2).lend(1, { value: 1e9 }))
                .to.be.revertedWithCustomError(mortgageToken, "InvalidLending");
        });

        it('3.1.6.9. lend unsuccessfully with repaid loan', async () => {
            const fixture = await beforeMortgageTokenTest({
                listSampleCurrencies: true,
                listEstateToken: true,
                listSampleLoan: true,
            });
            const { mortgageToken, borrower1, lender1, lender2 } = fixture;

            await callTransaction(mortgageToken.connect(lender1).lend(1, { value: 1e9 }));

            await callTransaction(mortgageToken.connect(borrower1).repay(1, { value: 1e9 }));

            await expect(mortgageToken.connect(lender1).lend(1, { value: 1e9 }))
                .to.be.revertedWithCustomError(mortgageToken, "InvalidLending");
            await expect(mortgageToken.connect(lender2).lend(1, { value: 1e9 }))
                .to.be.revertedWithCustomError(mortgageToken, "InvalidLending");
        });

        it('3.1.6.10. lend unsuccessfully with cancelled loan', async () => {
            const fixture = await beforeMortgageTokenTest({
                listSampleCurrencies: true,
                listEstateToken: true,
                listSampleLoan: true,
            });
            const { mortgageToken, borrower1, lender1 } = fixture;

            await callTransaction(mortgageToken.connect(borrower1).cancel(1));

            await expect(mortgageToken.connect(lender1).lend(1, { value: 1e9 }))
                .to.be.revertedWithCustomError(mortgageToken, "InvalidLending");
        });

        it('3.1.6.11. lend unsuccessfully with foreclosed loan', async () => {
            const fixture = await beforeMortgageTokenTest({
                listSampleCurrencies: true,
                listEstateToken: true,
                listSampleLoan: true,
            });
            const { mortgageToken, lender1, lender2 } = fixture;

            await callTransaction(mortgageToken.connect(lender1).lend(1, { value: 1e9 }));

            const due = (await mortgageToken.getLoan(1)).due;
            await time.setNextBlockTimestamp(due);

            await callTransaction(mortgageToken.connect(lender1).foreclose(1));

            await expect(mortgageToken.connect(lender1).lend(1, { value: 1e9 }))
                .to.be.revertedWithCustomError(mortgageToken, "InvalidLending");
            await expect(mortgageToken.connect(lender2).lend(1, { value: 1e9 }))
                .to.be.revertedWithCustomError(mortgageToken, "InvalidLending");
        });

        it('3.1.6.12. lend unsuccessfully with insufficient native token', async () => {
            const fixture = await beforeMortgageTokenTest({
                listSampleCurrencies: true,
                listEstateToken: true,
                listSampleLoan: true,
            });
            const { mortgageToken, lender1 } = fixture;

            await expect(mortgageToken.connect(lender1).lend(1))
                .to.be.revertedWithCustomError(mortgageToken, "FailedTransfer");
        });

        it('3.1.6.13. lend unsuccessfully when native token transfer to borrower failed', async () => {
            const fixture = await beforeMortgageTokenTest({
                listSampleCurrencies: true,
                listEstateToken: true,
            });
            const { mortgageToken, lender1, deployer, estateToken } = fixture;

            const failReceiver = await deployFailReceiver(deployer, true, false);

            await callTransaction(estateToken.mint(failReceiver.address, 1, 200_000));
            await callTransaction(estateToken.setApprovalForAll(mortgageToken.address, true));

            const data = mortgageToken.interface.encodeFunctionData("borrow", [1, 150_000, 10e5, 11e5, ethers.constants.AddressZero, 1000]);
            await callTransaction(failReceiver.call(mortgageToken.address, data));

            await expect(mortgageToken.connect(lender1).lend(1, { value: 1e9 }))
                .to.be.revertedWithCustomError(mortgageToken, "FailedTransfer");
        });

        it('3.1.6.14. lend unsuccessfully when native token transfer to commission receiver failed', async () => {
            const fixture = await beforeMortgageTokenTest({
                listSampleCurrencies: true,
                listEstateToken: true,
            });
            const { mortgageToken, borrower2, lender1, deployer, estateToken, commissionToken, broker2 } = fixture;

            const failReceiver = await deployFailReceiver(deployer, true, false);

            await callTransaction(mortgageToken.connect(borrower2).borrow(
                2,
                200,
                100000,
                110000,
                ethers.constants.AddressZero,
                1000
            ));
            await callTransaction(estateToken.connect(borrower2).setApprovalForAll(mortgageToken.address, true));
            
            await callTransaction(commissionToken.connect(broker2).transferFrom(
                broker2.address,
                failReceiver.address,
                2,
            ));

            await expect(mortgageToken.connect(lender1).lend(1, { value: 1e9 }))
                .to.be.revertedWithCustomError(mortgageToken, "FailedTransfer");
        });

        it('3.1.6.15. buy token unsuccessfully when refund to lender failed', async () => {
            const fixture = await beforeMortgageTokenTest({
                listSampleCurrencies: true,
                listEstateToken: true,
                listSampleLoan: true,
            });
            const { mortgageToken, deployer } = fixture;
            const failReceiver = await deployFailReceiver(deployer, true, false);

            let data = mortgageToken.interface.encodeFunctionData("lend", [1]);

            await expect(failReceiver.call(mortgageToken.address, data, { value: 1e9 }))
                .to.be.revertedWithCustomError(mortgageToken, "FailedRefund");
        });

        it('3.1.6.16. buy token unsuccessfully when borrower reenter this function', async () => {
            const fixture = await beforeMortgageTokenTest({
                listSampleCurrencies: true,
                listEstateToken: true,
            });
            const { mortgageToken, deployer, estateToken, lender1 } = fixture;

            const reentrancy = await deployReentrancyERC1155Holder(deployer);

            await callTransaction(estateToken.mint(reentrancy.address, 1, 100_000));

            let data = mortgageToken.interface.encodeFunctionData("borrow", [1, 100_000, 10e5, 11e5, ethers.constants.AddressZero, 1000]);
            await callTransaction(reentrancy.call(mortgageToken.address, data));

            const loanId = 1;

            data = estateToken.interface.encodeFunctionData("setApprovalForAll", [mortgageToken.address, true]);
            await callTransaction(reentrancy.call(estateToken.address, data));

            await testReentrancy_mortgageToken(
                mortgageToken,
                reentrancy,
                async () => {
                    await expect(mortgageToken.connect(lender1).lend(loanId, { value: 1e9 }))
                        .to.be.revertedWithCustomError(mortgageToken, "FailedTransfer");
                },
            );
        });
    });

    describe('3.1.7. safeLend(uint256, uint256)', async () => {
        it('3.1.7.1. safe lend successfully', async () => {
            const fixture = await beforeMortgageTokenTest({
                listSampleCurrencies: true,
                listEstateToken: true,
                listSampleLoan: true,
            });
            const { mortgageToken, borrower1, borrower2 } = fixture;

            await expect(mortgageToken.connect(borrower2).safeLend(1, 1, { value: 1e9 }))
                .to.not.be.reverted;

            await expect(mortgageToken.connect(borrower1).safeLend(2, 2))
                .to.not.be.reverted;
        });

        it('3.1.7.2. safe lend unsuccessfully with invalid loan id', async () => {
            const fixture = await beforeMortgageTokenTest({
                listSampleCurrencies: true,
                listEstateToken: true,
                listSampleLoan: true,
            });
            const { mortgageToken, borrower1 } = fixture;

            await expect(mortgageToken.connect(borrower1).safeLend(0, 1, { value: 1e9 }))
                .to.be.revertedWithCustomError(mortgageToken, "InvalidLoanId");

            await expect(mortgageToken.connect(borrower1).safeLend(3, 1, { value: 1e9 }))
                .to.be.revertedWithCustomError(mortgageToken, "InvalidLoanId");
        });


        it('3.1.7.3. safe lend unsuccessfully with bad anchor', async () => {
            const fixture = await beforeMortgageTokenTest({
                listSampleCurrencies: true,
                listEstateToken: true,
                listSampleLoan: true,
            });
            const { mortgageToken, lender1 } = fixture;

            await expect(mortgageToken.connect(lender1).safeLend(1, 2, { value: 1e9 }))
                .to.be.revertedWithCustomError(mortgageToken, "BadAnchor");

            await expect(mortgageToken.connect(lender1).safeLend(2, 1, { value: 1e9 }))
                .to.be.revertedWithCustomError(mortgageToken, "BadAnchor");
        });
    });
    
    describe('3.1.8. repay(uint256)', () => {
        it('3.1.8.1. repay successfully', async () => {
            const fixture = await beforeMortgageTokenTest({
                listSampleCurrencies: true,
                listEstateToken: true,
                listSampleLoan: true,
                listSampleLending: true,
            });
            const { mortgageToken, borrower1, borrower2, lender1, lender2, estateToken, currency, mortgageTokenOwner } = fixture;

            let currentTimestamp = await time.latest() + 10;
            await time.setNextBlockTimestamp(currentTimestamp);

            let due = (await mortgageToken.getLoan(1)).due;
            let lender1NativeBalance = await ethers.provider.getBalance(lender1.address);
            let borrower1NativeBalance = await ethers.provider.getBalance(borrower1.address);
            let borrower1Balance = await estateToken.balanceOf(borrower1.address, 1);
            let mortgageTokenBalance = await estateToken.balanceOf(mortgageToken.address, 1);
            let currentTotalSupply = await mortgageToken.totalSupply();

            let tx = await mortgageToken.connect(borrower1).repay(1, { value: 1e9 });
            let receipt = await tx.wait();
            let gasFee = receipt.gasUsed.mul(receipt.effectiveGasPrice);

            await expect(tx)
                .to.emit(mortgageToken, 'LoanRepayment')
                .withArgs(1);

            let loan = await mortgageToken.getLoan(1);
            expect(loan.estateId).to.equal(1);
            expect(loan.mortgageAmount).to.equal(150_000);
            expect(loan.principal).to.equal(10e5);
            expect(loan.repayment).to.equal(11e5);
            expect(loan.currency).to.equal(ethers.constants.AddressZero);
            expect(loan.due).to.equal(due);
            expect(loan.state).to.equal(LoanState.Repaid);
            expect(loan.borrower).to.equal(borrower1.address);
            expect(loan.lender).to.equal(lender1.address);

            expect(await mortgageToken.balanceOf(borrower1.address)).to.equal(0);

            expect(await mortgageToken.totalSupply()).to.equal(currentTotalSupply.sub(1));

            expect(await estateToken.balanceOf(borrower1.address, 1)).to.equal(borrower1Balance.add(150_000));
            expect(await estateToken.balanceOf(mortgageToken.address, 1)).to.equal(mortgageTokenBalance.sub(150_000));

            expect(await ethers.provider.getBalance(borrower1.address)).to.equal(borrower1NativeBalance.sub(gasFee).sub(11e5));
            expect(await ethers.provider.getBalance(lender1.address)).to.equal(lender1NativeBalance.add(11e5));

            await callTransaction(mortgageToken.connect(lender2).transferFrom(
                lender2.address,
                mortgageTokenOwner.address,
                2
            ));

            due = (await mortgageToken.getLoan(2)).due;
            let borrower2CurrencyBalance = await currency.balanceOf(borrower2.address);
            let lender2CurrencyBalance = await currency.balanceOf(lender2.address);
            let mortgageTokenOwnerBalance = await currency.balanceOf(mortgageTokenOwner.address);
            let borrower2Balance = await estateToken.balanceOf(borrower2.address, 2);
            mortgageTokenBalance = await estateToken.balanceOf(mortgageToken.address, 2);

            tx = await mortgageToken.connect(borrower2).repay(2, { value: 1e9 });
            await tx.wait();

            await expect(tx)
                .to.emit(mortgageToken, 'LoanRepayment')
                .withArgs(2);

            loan = await mortgageToken.getLoan(2);
            expect(loan.estateId).to.equal(2);
            expect(loan.mortgageAmount).to.equal(200);
            expect(loan.principal).to.equal(100000);
            expect(loan.repayment).to.equal(110000);
            expect(loan.currency).to.equal(currency.address);
            expect(loan.due).to.equal(due);
            expect(loan.state).to.equal(LoanState.Repaid);
            expect(loan.borrower).to.equal(borrower2.address);
            expect(loan.lender).to.equal(lender2.address);

            expect(await mortgageToken.balanceOf(borrower2.address)).to.equal(0);
            expect(await mortgageToken.totalSupply()).to.equal(currentTotalSupply.sub(2));

            expect(await estateToken.balanceOf(borrower2.address, 2)).to.equal(borrower2Balance.add(200));
            expect(await estateToken.balanceOf(mortgageToken.address, 2)).to.equal(mortgageTokenBalance.sub(200));

            expect(await currency.balanceOf(borrower2.address)).to.equal(borrower2CurrencyBalance.sub(110000));
            expect(await currency.balanceOf(lender2.address)).to.equal(lender2CurrencyBalance);
            expect(await currency.balanceOf(mortgageTokenOwner.address)).to.equal(mortgageTokenOwnerBalance.add(110000));
        });

        it('3.1.8.2. repay unsuccessfully when paused', async () => {
            const fixture = await beforeMortgageTokenTest({
                listSampleCurrencies: true,
                listEstateToken: true,
                listSampleLoan: true,
                listSampleLending: true,
                pause: true,
            });
            const { mortgageToken, borrower1 } = fixture;

            await expect(mortgageToken.connect(borrower1).repay(1, { value: 1e9 }))
                .to.be.revertedWith("Pausable: paused");
        });

        it('3.1.8.3. repay unsuccessfully with invalid loan id', async () => {
            const fixture = await beforeMortgageTokenTest({
                listSampleCurrencies: true,
                listEstateToken: true,
                listSampleLoan: true,
                listSampleLending: true,
            });
            const { mortgageToken, borrower1 } = fixture;

            await expect(mortgageToken.connect(borrower1).repay(0))
                .to.be.revertedWithCustomError(mortgageToken, "InvalidLoanId");

            await expect(mortgageToken.connect(borrower1).repay(3))
                .to.be.revertedWithCustomError(mortgageToken, "InvalidLoanId");
        });

        it('3.1.8.4. repay unsuccessfully with overdue loan', async () => {
            const fixture = await beforeMortgageTokenTest({
                listSampleCurrencies: true,
                listEstateToken: true,
                listSampleLoan: true,
                listSampleLending: true,
            });
            const { mortgageToken, borrower1, borrower2 } = fixture;

            const due1 = (await mortgageToken.getLoan(1)).due;
            await time.setNextBlockTimestamp(due1);

            await expect(mortgageToken.connect(borrower1).repay(1, { value: 1e9 }))
                .to.be.revertedWithCustomError(mortgageToken, "Overdue");

            const due2 = (await mortgageToken.getLoan(2)).due;
            await time.setNextBlockTimestamp(due2);

            await expect(mortgageToken.connect(borrower2).repay(2))
                .to.be.revertedWithCustomError(mortgageToken, "Overdue");
        });

        it('3.1.8.5. repay unsuccessfully with pending loan', async () => {
            const fixture = await beforeMortgageTokenTest({
                listSampleCurrencies: true,
                listEstateToken: true,
                listSampleLoan: true,
            });
            const { mortgageToken, borrower1, borrower2 } = fixture;

            await expect(mortgageToken.connect(borrower1).repay(1, { value: 1e9 }))
                .to.be.revertedWithCustomError(mortgageToken, "InvalidRepaying");
            await expect(mortgageToken.connect(borrower2).repay(2))
                .to.be.revertedWithCustomError(mortgageToken, "InvalidRepaying");
        });

        it('3.1.8.6. repay unsuccessfully with already repaid loan', async () => {
            const fixture = await beforeMortgageTokenTest({
                listSampleCurrencies: true,
                listEstateToken: true,
                listSampleLoan: true,
                listSampleLending: true,
            });
            const { mortgageToken, borrower1, borrower2 } = fixture;

            await callTransaction(mortgageToken.connect(borrower1).repay(1, { value: 1e9 }));
            await callTransaction(mortgageToken.connect(borrower2).repay(2));

            await expect(mortgageToken.connect(borrower1).repay(1, { value: 1e9 }))
                .to.be.revertedWithCustomError(mortgageToken, "InvalidRepaying");
            await expect(mortgageToken.connect(borrower2).repay(2))
                .to.be.revertedWithCustomError(mortgageToken, "InvalidRepaying");
        });

        it('3.1.8.7. repay unsuccessfully with foreclosed loan', async () => {
            const fixture = await beforeMortgageTokenTest({
                listSampleCurrencies: true,
                listEstateToken: true,
                listSampleLoan: true,
                listSampleLending: true,
            });
            const { mortgageToken, borrower1, borrower2 } = fixture;

            const due = (await mortgageToken.getLoan(2)).due;
            await time.setNextBlockTimestamp(due);

            await callTransaction(mortgageToken.connect(borrower1).foreclose(1));
            await callTransaction(mortgageToken.connect(borrower2).foreclose(2));

            await expect(mortgageToken.connect(borrower1).repay(1, { value: 1e9 }))
                .to.be.revertedWithCustomError(mortgageToken, "InvalidRepaying");
            await expect(mortgageToken.connect(borrower2).repay(2))
                .to.be.revertedWithCustomError(mortgageToken, "InvalidRepaying");
        });

        it('3.1.8.8. repay unsuccessfully with cancelled loan', async () => {
            const fixture = await beforeMortgageTokenTest({
                listSampleCurrencies: true,
                listEstateToken: true,
                listSampleLoan: true,
            });
            const { mortgageToken, borrower1, borrower2 } = fixture;

            await callTransaction(mortgageToken.connect(borrower1).cancel(1));
            await callTransaction(mortgageToken.connect(borrower2).cancel(2));

            await expect(mortgageToken.connect(borrower1).repay(1, { value: 1e9 }))
                .to.be.revertedWithCustomError(mortgageToken, "InvalidRepaying");
            await expect(mortgageToken.connect(borrower2).repay(2))
                .to.be.revertedWithCustomError(mortgageToken, "InvalidRepaying");
        });

        it('3.1.8.9. repay unsuccessfully with insufficient funds', async () => {
            const fixture = await beforeMortgageTokenTest({
                listSampleCurrencies: true,
                listEstateToken: true,
                listSampleLoan: true,
                listSampleLending: true,
            });
            const { mortgageToken, borrower1, borrower2, currency } = fixture;

            await expect(mortgageToken.connect(borrower1).repay(1))
                .to.be.revertedWithCustomError(mortgageToken, "InsufficientValue");

            await resetERC20(currency, [borrower2])
            await expect(mortgageToken.connect(borrower2).repay(2))
                .to.be.revertedWith("ERC20: transfer amount exceeds balance");
        });

        it('3.1.8.10. repay unsuccessfully native token transfer to lender failed', async () => {
            const fixture = await beforeMortgageTokenTest({
                listSampleCurrencies: true,
                listEstateToken: true,
                listSampleLoan: true,
            });
            const { mortgageToken, borrower1, deployer } = fixture;

            const failReceiver = await deployFailReceiver(deployer, true, false);

            const principal = (await mortgageToken.getLoan(1)).principal;

            let data = mortgageToken.interface.encodeFunctionData("lend", [1]);
            await callTransaction(failReceiver.call(mortgageToken.address, data, { value: principal }));

            await expect(mortgageToken.connect(borrower1).repay(1, { value: 1e9 }))
                .to.be.revertedWithCustomError(mortgageToken, "FailedTransfer");
        });

        it('3.1.8.11. repay unsuccessfully when this contract is reentered', async () => {
            const fixture = await beforeMortgageTokenTest({
                listSampleCurrencies: true,
                listEstateToken: true,
                listSampleLoan: true,
            });
            const { mortgageToken, borrower1, deployer } = fixture;

            const reentrancy = await deployReentrancy(deployer);

            const principal = (await mortgageToken.getLoan(1)).principal;

            let data = mortgageToken.interface.encodeFunctionData("lend", [1]);
            await callTransaction(reentrancy.call(mortgageToken.address, data, { value: principal }));

            await testReentrancy_mortgageToken(
                mortgageToken,
                reentrancy,
                async () => {
                    await expect(mortgageToken.connect(borrower1).repay(1, { value: 1e9 }))
                        .to.be.revertedWithCustomError(mortgageToken, "FailedTransfer");
                },
            );
        });
    });
    
    describe('3.1.9. safeRepay(uint256, uint256)', () => {
        it('3.1.9.1. safe repay successfully', async () => {
            const fixture = await beforeMortgageTokenTest({
                listSampleCurrencies: true,
                listEstateToken: true,
                listSampleLoan: true,
                listSampleLending: true,
            });
            const { mortgageToken, borrower1, borrower2 } = fixture;

            await expect(mortgageToken.connect(borrower1).safeRepay(1, 1, { value: 1e9 }))
                .to.not.be.reverted;

            await expect(mortgageToken.connect(borrower2).safeRepay(2, 2))
                .to.not.be.reverted;
        });

        it('3.1.9.2. safe repay unsuccessfully with invalid loan id', async () => {
            const fixture = await beforeMortgageTokenTest({
                listSampleCurrencies: true,
                listEstateToken: true,
                listSampleLoan: true,
                listSampleLending: true,
            });
            const { mortgageToken, borrower1 } = fixture;

            await expect(mortgageToken.connect(borrower1).safeRepay(0, 0))
                .to.be.revertedWithCustomError(mortgageToken, "InvalidLoanId");

            await expect(mortgageToken.connect(borrower1).safeRepay(3, 3))
                .to.be.revertedWithCustomError(mortgageToken, "InvalidLoanId");
        });

        it('3.1.9.3. repay unsuccessfully with invalid anchor', async () => {
            const fixture = await beforeMortgageTokenTest({
                listSampleCurrencies: true,
                listEstateToken: true,
                listSampleLoan: true,
                listSampleLending: true,
            });
            const { mortgageToken, borrower1 } = fixture;

            await expect(mortgageToken.connect(borrower1).safeRepay(1, 2))
                .to.be.revertedWithCustomError(mortgageToken, "BadAnchor");

            await expect(mortgageToken.connect(borrower1).safeRepay(2, 1))
                .to.be.revertedWithCustomError(mortgageToken, "BadAnchor");
        });
    });

    describe('3.1.10. foreclose(uint256)', () => {
        it('3.1.10.1. foreclose successfully', async () => {
            const fixture = await beforeMortgageTokenTest({
                listSampleCurrencies: true,
                listEstateToken: true,
                listSampleLoan: true,
                listSampleLending: true,
            });
            const { mortgageToken, borrower1, borrower2, lender1, lender2, estateToken, currency, mortgageTokenOwner } = fixture;

            let lender1Balance = await estateToken.balanceOf(lender1.address, 1);
            let mortgageContractBalance = await estateToken.balanceOf(mortgageToken.address, 1);
            let currentTotalSupply = await mortgageToken.totalSupply();

            const due1 = (await mortgageToken.getLoan(1)).due;
            await time.setNextBlockTimestamp(due1);

            let tx = await mortgageToken.foreclose(1);
            await tx.wait();

            await expect(tx)
                .to.emit(mortgageToken, 'LoanForeclosure')
                .withArgs(1, lender1.address);

            let loan = await mortgageToken.getLoan(1);
            expect(loan.estateId).to.equal(1);
            expect(loan.mortgageAmount).to.equal(150_000);
            expect(loan.principal).to.equal(10e5);
            expect(loan.repayment).to.equal(11e5);
            expect(loan.currency).to.equal(ethers.constants.AddressZero);
            expect(loan.due).to.equal(due1);
            expect(loan.state).to.equal(LoanState.Foreclosed);
            expect(loan.borrower).to.equal(borrower1.address);
            expect(loan.lender).to.equal(lender1.address);

            expect(await mortgageToken.balanceOf(lender1.address)).to.equal(0);

            expect(await mortgageToken.totalSupply()).to.equal(currentTotalSupply.sub(1));

            expect(await estateToken.balanceOf(lender1.address, 1)).to.equal(lender1Balance.add(150_000));
            expect(await estateToken.balanceOf(mortgageToken.address, 1)).to.equal(mortgageContractBalance.sub(150_000));

            await callTransaction(mortgageToken.connect(lender2).transferFrom(
                lender2.address,
                mortgageTokenOwner.address,
                2
            ));

            const due2 = (await mortgageToken.getLoan(2)).due;
            await time.setNextBlockTimestamp(due2);

            let lender2Balance = await estateToken.balanceOf(lender2.address, 2);
            mortgageContractBalance = await estateToken.balanceOf(mortgageToken.address, 2);
            let mortgageTokenOwnerBalance = await estateToken.balanceOf(mortgageTokenOwner.address, 2);

            tx = await mortgageToken.foreclose(2);
            await tx.wait();

            await expect(tx)
                .to.emit(mortgageToken, 'LoanForeclosure')
                .withArgs(2, mortgageTokenOwner.address);

            loan = await mortgageToken.getLoan(2);
            expect(loan.estateId).to.equal(2);
            expect(loan.mortgageAmount).to.equal(200);
            expect(loan.principal).to.equal(100000);
            expect(loan.repayment).to.equal(110000);
            expect(loan.currency).to.equal(currency.address);
            expect(loan.due).to.equal(due2);
            expect(loan.state).to.equal(LoanState.Foreclosed);
            expect(loan.borrower).to.equal(borrower2.address);
            expect(loan.lender).to.equal(lender2.address);

            expect(await mortgageToken.balanceOf(lender2.address)).to.equal(0);

            expect(await mortgageToken.totalSupply()).to.equal(currentTotalSupply.sub(2));

            expect(await estateToken.balanceOf(lender2.address, 2)).to.equal(lender2Balance);
            expect(await estateToken.balanceOf(mortgageTokenOwner.address, 2)).to.equal(mortgageTokenOwnerBalance.add(200));
            expect(await estateToken.balanceOf(mortgageToken.address, 2)).to.equal(mortgageContractBalance.sub(200));
        });

        it('3.1.10.2. foreclose unsuccessfully when paused', async () => {
            const fixture = await beforeMortgageTokenTest({
                listSampleCurrencies: true,
                listEstateToken: true,
                listSampleLoan: true,
                listSampleLending: true,
                pause: true,
            });
            const { mortgageToken } = fixture;

            await expect(mortgageToken.foreclose(1))
                .to.be.revertedWith("Pausable: paused");
        });

        it('3.1.10.3. foreclose unsuccessfully with invalid loan id', async () => {
            const fixture = await beforeMortgageTokenTest({
                listSampleCurrencies: true,
                listEstateToken: true,
                listSampleLoan: true,
                listSampleLending: true,
            });
            const { mortgageToken } = fixture;

            await expect(mortgageToken.foreclose(0))
                .to.be.revertedWithCustomError(mortgageToken, "InvalidLoanId");

            await expect(mortgageToken.foreclose(3))
                .to.be.revertedWithCustomError(mortgageToken, "InvalidLoanId");
        });

        it('3.1.10.4. foreclose unsuccessfully when loan is not overdue', async () => {
            const fixture = await beforeMortgageTokenTest({
                listSampleCurrencies: true,
                listEstateToken: true,
                listSampleLoan: true,
                listSampleLending: true,
            });
            const { mortgageToken, borrower1, borrower2 } = fixture;

            await expect(mortgageToken.foreclose(1))
                .to.be.revertedWithCustomError(mortgageToken, "InvalidForeclosing");
        });

        it('3.1.10.5. foreclose unsuccessfully with pending loan', async () => {
            const fixture = await beforeMortgageTokenTest({
                listSampleCurrencies: true,
                listEstateToken: true,
                listSampleLoan: true,
            });
            const { mortgageToken } = fixture;

            await expect(mortgageToken.foreclose(1))
                .to.be.revertedWithCustomError(mortgageToken, "InvalidForeclosing");
        });

        it('3.1.10.6. foreclose unsuccessfully with repaid loan', async () => {
            const fixture = await beforeMortgageTokenTest({
                listSampleCurrencies: true,
                listEstateToken: true,
                listSampleLoan: true,
                listSampleLending: true,
            });
            const { mortgageToken, borrower1 } = fixture;

            await callTransaction(mortgageToken.connect(borrower1).repay(1, { value: 1e9 }));

            const due = (await mortgageToken.getLoan(1)).due;
            await time.setNextBlockTimestamp(due);

            await expect(mortgageToken.foreclose(1))
                .to.be.revertedWithCustomError(mortgageToken, "InvalidForeclosing");
        });

        it('3.1.10.7. foreclose unsuccessfully with foreclosed loan', async () => {
            const fixture = await beforeMortgageTokenTest({
                listSampleCurrencies: true,
                listEstateToken: true,
                listSampleLoan: true,
                listSampleLending: true,
            });
            const { mortgageToken, lender1 } = fixture;

            const due = (await mortgageToken.getLoan(1)).due;
            await time.setNextBlockTimestamp(due);

            await callTransaction(mortgageToken.connect(lender1).foreclose(1));

            await expect(mortgageToken.foreclose(1))
                .to.be.revertedWithCustomError(mortgageToken, "InvalidForeclosing");
        });

        it('3.1.10.8. foreclose unsuccessfully with cancelled loan', async () => {
            const fixture = await beforeMortgageTokenTest({
                listSampleCurrencies: true,
                listEstateToken: true,
                listSampleLoan: true,
            });
            const { mortgageToken, borrower1 } = fixture;

            await callTransaction(mortgageToken.connect(borrower1).cancel(1));

            await expect(mortgageToken.foreclose(1))
                .to.be.revertedWithCustomError(mortgageToken, "InvalidForeclosing");
        });
    });

    describe('3.1.11. royaltyInfo(uint256, uint256)', () => {
        it('3.1.11.1. return correct royalty info', async () => {
            const fixture = await beforeMortgageTokenTest({
                listSampleCurrencies: true,
                listEstateToken: true,
                listSampleLoan: true,
                listSampleLending: true,
            });
            const { mortgageToken, feeReceiver, estateToken, admin, admins, zone1, zone2 } = fixture;

            const zone1RoyaltyRate = ethers.utils.parseEther('0.1');
            const zone2RoyaltyRate = ethers.utils.parseEther('0.2');
            
            await callEstateToken_UpdateZoneRoyaltyRate(
                estateToken,
                admins,
                zone1,
                zone1RoyaltyRate,
                await admin.nonce(),
            );
            
            await callEstateToken_UpdateZoneRoyaltyRate(
                estateToken,
                admins,
                zone2,
                zone2RoyaltyRate,
                await admin.nonce(),
            );

            const salePrice = ethers.BigNumber.from(1e6);
            
            const royaltyInfo1 = await mortgageToken.royaltyInfo(1, salePrice);
            const royaltyFee1 = salePrice.mul(zone1RoyaltyRate).div(Constant.COMMON_RATE_MAX_FRACTION);
            expect(royaltyInfo1[0]).to.equal(feeReceiver.address);
            expect(royaltyInfo1[1]).to.equal(royaltyFee1);

            const royaltyInfo2 = await mortgageToken.royaltyInfo(2, salePrice);
            const royaltyFee2 = salePrice.mul(zone2RoyaltyRate).div(Constant.COMMON_RATE_MAX_FRACTION);
            expect(royaltyInfo2[0]).to.equal(feeReceiver.address);
            expect(royaltyInfo2[1]).to.equal(royaltyFee2);
        });

        it('3.1.11.2. revert with invalid token id', async () => {
            const fixture = await beforeMortgageTokenTest({
                listSampleCurrencies: true,
                listEstateToken: true,
                listSampleLoan: true,
            });
            const { mortgageToken } = fixture;

            const salePrice = ethers.utils.parseEther('10');

            await expect(mortgageToken.royaltyInfo(0, salePrice))
                .to.be.revertedWith("ERC721: invalid token ID");
            await expect(mortgageToken.royaltyInfo(100, salePrice))
                .to.be.revertedWith("ERC721: invalid token ID");

            await expect(mortgageToken.royaltyInfo(1, salePrice))
                .to.be.revertedWith("ERC721: invalid token ID");
            await expect(mortgageToken.royaltyInfo(2, salePrice))
                .to.be.revertedWith("ERC721: invalid token ID");
        });
    });

    describe('3.1.12. getRoyaltyRate(uint256)', () => {
        it('3.1.12.1. return correct royalty rate', async () => {
            const fixture = await beforeMortgageTokenTest({
                listSampleCurrencies: true,
                listEstateToken: true,
                listSampleLoan: true,
                listSampleLending: true,
            });
            const { mortgageToken, estateToken, admin, admins, zone1, zone2 } = fixture;
           
            const zone1RoyaltyRate = ethers.utils.parseEther('0.1');
            const zone2RoyaltyRate = ethers.utils.parseEther('0.2');
            
            await callEstateToken_UpdateZoneRoyaltyRate(
                estateToken,
                admins,
                zone1,
                zone1RoyaltyRate,
                await admin.nonce(),
            );
            
            await callEstateToken_UpdateZoneRoyaltyRate(
                estateToken,
                admins,
                zone2,
                zone2RoyaltyRate,
                await admin.nonce(),
            );

            expect(structToObject(await mortgageToken.getRoyaltyRate(1))).to.deep.equal({
                value: zone1RoyaltyRate,
                decimals: Constant.COMMON_RATE_DECIMALS,
            });
            expect(structToObject(await mortgageToken.getRoyaltyRate(2))).to.deep.equal({
                value: zone2RoyaltyRate,
                decimals: Constant.COMMON_RATE_DECIMALS,
            });
        });

        it('3.1.12.2. revert with invalid token id', async () => {
            const fixture = await beforeMortgageTokenTest({
                listSampleCurrencies: true,
                listEstateToken: true,
                listSampleLoan: true,
            });
            const { mortgageToken } = fixture;

            await expect(mortgageToken.getRoyaltyRate(0))
                .to.be.revertedWith("ERC721: invalid token ID");
            await expect(mortgageToken.getRoyaltyRate(100))
                .to.be.revertedWith("ERC721: invalid token ID");

            await expect(mortgageToken.getRoyaltyRate(1))
                .to.be.revertedWith("ERC721: invalid token ID");
            await expect(mortgageToken.getRoyaltyRate(2))
                .to.be.revertedWith("ERC721: invalid token ID");
        });
    });

    describe('3.1.13. supportsInterface(bytes4)', () => {
        it('3.1.13.1. return true for appropriate interface', async () => {
            const fixture = await beforeMortgageTokenTest();
            const { mortgageToken } = fixture;

            const IERC165Upgradeable = IERC165Upgradeable__factory.createInterface();
            const IERC2981Upgradeable = IERC2981Upgradeable__factory.createInterface();
            const IERC1155ReceiverUpgradeable = IERC1155ReceiverUpgradeable__factory.createInterface();
            const ICommon = ICommon__factory.createInterface();
            const IRoyaltyRateProposer = IRoyaltyRateProposer__factory.createInterface();
            const IEstateTokenReceiver = IEstateTokenReceiver__factory.createInterface();
            const IERC721Upgradeable = IERC721Upgradeable__factory.createInterface();
            const IERC721MetadataUpgradeable = IERC721MetadataUpgradeable__factory.createInterface();

            const IERC165UpgradeableInterfaceId = getInterfaceID(IERC165Upgradeable, []);
            const IERC2981UpgradeableInterfaceId = getInterfaceID(IERC2981Upgradeable, [IERC165Upgradeable]);
            const IEstateTokenReceiverInterfaceId = getInterfaceID(IEstateTokenReceiver, [IERC1155ReceiverUpgradeable]);
            const IRoyaltyRateProposerInterfaceId = getInterfaceID(IRoyaltyRateProposer, [ICommon, IERC165Upgradeable, IERC2981Upgradeable]);
            const IERC721UpgradeableInterfaceId = getInterfaceID(IERC721Upgradeable, [IERC165Upgradeable]);
            const IERC721MetadataUpgradeableInterfaceId = getInterfaceID(IERC721MetadataUpgradeable, [IERC721Upgradeable]);

            expect(await mortgageToken.supportsInterface(getBytes4Hex(IERC165UpgradeableInterfaceId))).to.equal(true);
            expect(await mortgageToken.supportsInterface(getBytes4Hex(IEstateTokenReceiverInterfaceId))).to.equal(true);
            expect(await mortgageToken.supportsInterface(getBytes4Hex(IERC2981UpgradeableInterfaceId))).to.equal(true);
            expect(await mortgageToken.supportsInterface(getBytes4Hex(IRoyaltyRateProposerInterfaceId))).to.equal(true);
            expect(await mortgageToken.supportsInterface(getBytes4Hex(IERC721UpgradeableInterfaceId))).to.equal(true);
            expect(await mortgageToken.supportsInterface(getBytes4Hex(IERC721MetadataUpgradeableInterfaceId))).to.equal(true);
        });
    });
});
