import { expect } from 'chai';
import { ethers } from 'hardhat';
import { Admin, Currency, MockPrimaryToken, Treasury } from '@typechain-types';
import { getSignatures, prepareERC20 } from '@utils/blockchain';
import { deployAdmin } from '@utils/deployments/common/admin';
import { Constant } from '@tests/test.constant';
import { loadFixture } from '@nomicfoundation/hardhat-network-helpers';
import { deployCurrency } from '@utils/deployments/common/currency';
import { deployTreasury } from '@utils/deployments/liquidity/treasury';
import { deployMockPrimaryToken } from '@utils/deployments/mock/mockPrimaryToken';
import { Initialization as LiquidityInitialization } from '@tests/liquidity/test.initialization';
import { callPausable_Pause } from '@utils/callWithSignatures/Pausable';

interface TreasuryFixture {
    deployer: any;
    admins: any[];
    admin: Admin;
    treasury: Treasury;
    currency: Currency;
    primaryToken: MockPrimaryToken;
    receiver: any;
}

describe('4.6. Treasury', async () => {
    async function treasuryFixture(): Promise<TreasuryFixture> {
        const accounts = await ethers.getSigners();
        const deployer = accounts[0];
        const admins = [];
        for (let i = 1; i <= Constant.ADMIN_NUMBER; ++i) admins.push(accounts[i]);
        const receiver = accounts[Constant.ADMIN_NUMBER + 1];

        const adminAddresses: string[] = admins.map(signer => signer.address);
        const admin = await deployAdmin(
            deployer.address,
            adminAddresses[0],
            adminAddresses[1],
            adminAddresses[2],
            adminAddresses[3],
            adminAddresses[4],
        ) as Admin;
        
        const currency = await deployCurrency(
            deployer.address,
            'MockCurrency',
            'MCK'
        ) as Currency;
        
        const primaryToken = await deployMockPrimaryToken(
            deployer,
            admin.address,
            LiquidityInitialization.PRIMARY_TOKEN_Name,
            LiquidityInitialization.PRIMARY_TOKEN_Symbol,
            LiquidityInitialization.PRIMARY_TOKEN_LiquidationUnlockedAt,
        ) as MockPrimaryToken;
        
        const treasury = await deployTreasury(
            deployer,
            admin.address,
            currency.address,
            primaryToken.address,
        ) as Treasury;

        return {
            deployer,
            admins,
            admin,
            treasury,
            currency,
            primaryToken,
            receiver,
        };
    };

    async function setupBeforeTest({
        prepareLiquidity = false,
        pause = false,
    } = {}): Promise<TreasuryFixture> {
        const fixture = await loadFixture(treasuryFixture);

        const { deployer, treasury, admin, admins, currency, primaryToken } = fixture;

        if (prepareLiquidity) {
            await prepareERC20(currency, [deployer], [treasury as any], ethers.utils.parseEther("1000000"));
            await treasury.provideLiquidity(ethers.utils.parseEther("1000000"));
        }

        if (pause) {
            await callPausable_Pause(treasury, admins, admin);
        }

        return {
            ...fixture,
        }
    }

    describe('4.6.1. initialize(address, address, address)', async () => {
        it('4.6.1.1. Deploy successfully', async () => {
            const { treasury, admin, currency, primaryToken } = await setupBeforeTest();

            expect(await treasury.admin()).to.equal(admin.address);
            expect(await treasury.currency()).to.equal(currency.address);
            expect(await treasury.primaryToken()).to.equal(primaryToken.address);

            expect(await treasury.liquidity()).to.equal(0);
            expect(await treasury.operationFund()).to.equal(0);
        });
    });

    describe('4.6.2. withdrawOperationFund(uint256, address, bytes[])', async () => {
        it('4.6.2.1. withdrawOperationFund successfully with valid signatures', async () => {
            const { treasury, admin, admins, currency, primaryToken, receiver } = await setupBeforeTest({
                prepareLiquidity: true,
            });

            const value1 = ethers.utils.parseEther("100");

            const initialTreasuryBalance = await currency.balanceOf(treasury.address);
            const initialOperationFund = await treasury.operationFund();

            const message1 = ethers.utils.defaultAbiCoder.encode(
                ["address", "string", "uint256", "address"],
                [treasury.address, "withdrawOperationFund", value1, receiver.address]
            );

            const signatures1 = await getSignatures(message1, admins, await admin.nonce());
            const tx1 = await treasury.withdrawOperationFund(value1, receiver.address, signatures1);
            await tx1.wait();

            await expect(tx1).to
                .emit(treasury, "OperationFundWithdrawal")
                .withArgs(value1, receiver.address);

            expect(await treasury.operationFund()).to.equal(initialOperationFund.sub(value1));
            expect(await currency.balanceOf(treasury.address)).to.equal(initialTreasuryBalance.sub(value1));
            expect(await currency.balanceOf(receiver.address)).to.equal(value1);

            const value2 = ethers.utils.parseEther("1000");

            const message2 = ethers.utils.defaultAbiCoder.encode(
                ["address", "string", "uint256", "address"],
                [treasury.address, "withdrawOperationFund", value2, receiver.address]
            );

            const signatures2 = await getSignatures(message2, admins, await admin.nonce());
            const tx2 = await treasury.withdrawOperationFund(value2, receiver.address, signatures2);
            await tx2.wait();

            await expect(tx2).to
                .emit(treasury, "OperationFundWithdrawal")
                .withArgs(value2, receiver.address);

            expect(await treasury.operationFund()).to.equal(initialOperationFund.sub(value1).sub(value2));
            expect(await currency.balanceOf(treasury.address)).to.equal(initialTreasuryBalance.sub(value1).sub(value2));
            expect(await currency.balanceOf(receiver.address)).to.equal(value1.add(value2));
        });

        it('4.6.2.2. withdrawOperationFund unsuccessfully with invalid signatures', async () => {
            const { treasury, admin, admins, currency, primaryToken, receiver } = await setupBeforeTest({
                prepareLiquidity: true,
            });

            const value = ethers.utils.parseEther("100");

            let message = ethers.utils.defaultAbiCoder.encode(
                ["address", "string", "uint256", "address"],
                [treasury.address, "withdrawOperationFund", value, receiver.address]
            );
            let invalidSignatures = await getSignatures(message, admins, (await admin.nonce()).add(1));

            await expect(treasury.withdrawOperationFund(value, receiver.address, invalidSignatures))
                .to.be.revertedWithCustomError(admin, "FailedVerification");
        });

        it('4.6.2.3. withdrawOperationFund unsuccessfully with insufficient funds', async () => {
            const { treasury, admin, admins, currency, primaryToken, receiver } = await setupBeforeTest({
                prepareLiquidity: true,
            });

            const operationFund = await treasury.operationFund();
            const value = operationFund.add(1);

            let message = ethers.utils.defaultAbiCoder.encode(
                ["address", "string", "uint256", "address"],
                [treasury.address, "withdrawOperationFund", value, receiver.address]
            );
            let signatures = await getSignatures(message, admins, await admin.nonce());

            await expect(treasury.withdrawOperationFund(value, receiver.address, signatures))
                .to.be.revertedWithCustomError(treasury, "InsufficientFunds");
        });
    });

    describe('4.6.3. withdrawLiquidity(uint256)', async () => {
        it('4.6.3.1. withdrawLiquidity successfully', async () => {
            const { treasury, admin, admins, currency, primaryToken, receiver } = await setupBeforeTest({
                prepareLiquidity: true,
            });

            const value1 = ethers.utils.parseEther("100");

            const initialTreasuryBalance = await currency.balanceOf(treasury.address);
            const initialOperationFund = await treasury.operationFund();
            const initialLiquidity = await treasury.liquidity();

            const tx1 = await primaryToken.call(treasury.address, treasury.interface.encodeFunctionData("withdrawLiquidity", [
                receiver.address,
                value1
            ]))
            await tx1.wait();

            await expect(tx1).to
                .emit(treasury, "LiquidityWithdrawal")
                .withArgs(receiver.address, value1);

            expect(await treasury.liquidity()).to.equal(initialLiquidity.sub(value1));
            expect(await treasury.operationFund()).to.equal(initialOperationFund);
            expect(await currency.balanceOf(treasury.address)).to.equal(initialTreasuryBalance.sub(value1));
            expect(await currency.balanceOf(receiver.address)).to.equal(value1);

            const value2 = ethers.utils.parseEther("1000");

            const tx2 = await primaryToken.call(treasury.address, treasury.interface.encodeFunctionData("withdrawLiquidity", [
                receiver.address,
                value2
            ]))
            await tx2.wait();

            await expect(tx2).to
                .emit(treasury, "LiquidityWithdrawal")
                .withArgs(receiver.address, value2);

            expect(await treasury.liquidity()).to.equal(initialLiquidity.sub(value1).sub(value2));
            expect(await treasury.operationFund()).to.equal(initialOperationFund);
            expect(await currency.balanceOf(treasury.address)).to.equal(initialTreasuryBalance.sub(value1).sub(value2));
        });

        it('4.6.3.2. withdrawLiquidity unsuccessfully when paused', async () => {
            const { treasury, primaryToken, receiver } = await setupBeforeTest({
                prepareLiquidity: true,
                pause: true,
            });

            const value = ethers.utils.parseEther("100");
            
            await expect(primaryToken.call(treasury.address, treasury.interface.encodeFunctionData("withdrawLiquidity", [
                receiver.address,
                value
            ]))).to.be.revertedWith("Pausable: paused");
        });

        it('4.6.3.3. withdrawLiquidity unsuccessfully by unauthorized user', async () => {
            const { treasury, primaryToken, receiver } = await setupBeforeTest({
                prepareLiquidity: true,
            });

            const value = ethers.utils.parseEther("100");

            await expect(treasury.withdrawLiquidity(receiver.address, value))
                .to.be.revertedWithCustomError(treasury, "Unauthorized");
        });

        it('4.6.3.4. withdrawLiquidity unsuccessfully with insufficient funds', async () => {
            const { treasury, primaryToken, receiver } = await setupBeforeTest({
                prepareLiquidity: true,
            });

            const value = (await treasury.liquidity()).add(1);
            
            await expect(primaryToken.call(treasury.address, treasury.interface.encodeFunctionData("withdrawLiquidity", [
                receiver.address,
                value
            ]))).to.be.revertedWithCustomError(treasury, "InsufficientFunds");
        });
    });

    describe('4.6.4. provideLiquidity(uint256)', async () => {
        it('4.6.4.1. provideLiquidity successfully', async () => {
            const { treasury, admin, admins, currency, primaryToken, receiver } = await setupBeforeTest();

            const value1 = ethers.utils.parseEther("100");
            const value2 = ethers.utils.parseEther("1000");

            await prepareERC20(currency, [receiver], [treasury as any], value1.add(value2));

            const initialTreasuryBalance = await currency.balanceOf(treasury.address);
            const initialOperationFund = await treasury.operationFund();

            const feeAmount1 = value1.mul(Constant.TREASURY_OPERATION_FUND_RATE).div(Constant.COMMON_RATE_MAX_FRACTION);
            const valueAfterFee1 = value1.sub(feeAmount1);

            const tx1 = await treasury.connect(receiver).provideLiquidity(value1);
            await tx1.wait();

            await expect(tx1).to
                .emit(treasury, "LiquidityProvision")
                .withArgs(receiver.address, value1, feeAmount1);
    
            expect(await treasury.liquidity()).to.equal(valueAfterFee1);
            expect(await treasury.operationFund()).to.equal(feeAmount1);
            expect(await currency.balanceOf(treasury.address)).to.equal(initialTreasuryBalance.add(value1));

            const tx2 = await treasury.connect(receiver).provideLiquidity(value2);
            await tx2.wait();

            const feeAmount2 = value2.mul(Constant.TREASURY_OPERATION_FUND_RATE).div(Constant.COMMON_RATE_MAX_FRACTION);
            const valueAfterFee2 = value2.sub(feeAmount2);
    
            await expect(tx2).to
                .emit(treasury, "LiquidityProvision")
                .withArgs(receiver.address, value2, feeAmount2);

            expect(await treasury.liquidity()).to.equal(valueAfterFee1.add(valueAfterFee2));
            expect(await treasury.operationFund()).to.equal(feeAmount1.add(feeAmount2));
            expect(await currency.balanceOf(treasury.address)).to.equal(initialTreasuryBalance.add(value1).add(value2));
        });

        it('4.6.4.2. provideLiquidity unsuccessfully when paused', async () => {
            const { treasury, receiver } = await setupBeforeTest({
                prepareLiquidity: true,
                pause: true,
            });

            const value = ethers.utils.parseEther("100");

            await expect(treasury.connect(receiver).provideLiquidity(value))
                .to.be.revertedWith("Pausable: paused");
        });
    });
});
