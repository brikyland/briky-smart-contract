import { expect } from 'chai';
import { ethers } from 'hardhat';

// @nomicfoundation/hardhat-network-helpers
import { loadFixture } from '@nomicfoundation/hardhat-network-helpers';

// @tests
import { Constant } from '@tests/test.constant';

// @tests/liquidity
import { Initialization as LiquidityInitialization } from '@tests/liquidity/test.initialization';

// @typechain-types
import { Admin, Currency, MockPrimaryToken, Treasury } from '@typechain-types';

// @utils
import { callTransaction, prepareERC20 } from '@utils/blockchain';

// @utils/deployments/common
import { deployAdmin } from '@utils/deployments/common/admin';
import { deployCurrency } from '@utils/deployments/common/currency';

// @utils/deployments/liquidity
import { deployTreasury } from '@utils/deployments/liquidity/treasury';

// @utils/deployments/mock
import { deployMockPrimaryToken } from '@utils/deployments/mock/liquidity/mockPrimaryToken';

// @utils/models/liquidity
import { WithdrawOperationFundParams, WithdrawOperationFundParamsInput } from '@utils/models/liquidity/treasury';

// @utils/signatures/liquidity
import { getWithdrawOperationFundSignatures } from '@utils/signatures/liquidity/treasury';

// @utils/transaction/common
import { getPausableTxByInput_Pause } from '@utils/transaction/common/pausable';

// @utils/transaction/liquidity
import {
    getCallTreasuryTx_WithdrawLiquidity,
    getTreasuryTx_ProvideLiquidity,
    getTreasuryTx_WithdrawLiquidity,
    getTreasuryTx_WithdrawOperationFund,
    getTreasuryTxByInput_WithdrawOperationFund,
} from '@utils/transaction/liquidity/treasury';

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
        const [deployer, admin1, admin2, admin3, admin4, admin5, receiver] = await ethers.getSigners();
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

        const currency = (await deployCurrency(deployer.address, 'MockCurrency', 'MCK')) as Currency;

        const primaryToken = (await deployMockPrimaryToken(
            deployer,
            admin.address,
            LiquidityInitialization.PRIMARY_TOKEN_Name,
            LiquidityInitialization.PRIMARY_TOKEN_Symbol,
            LiquidityInitialization.PRIMARY_TOKEN_LiquidationUnlockedAt
        )) as MockPrimaryToken;

        const treasury = (await deployTreasury(
            deployer,
            admin.address,
            currency.address,
            primaryToken.address
        )) as Treasury;

        return {
            deployer,
            admins,
            admin,
            treasury,
            currency,
            primaryToken,
            receiver,
        };
    }

    async function setupBeforeTest({ skipPrepareLiquidity = false, pause = false } = {}): Promise<TreasuryFixture> {
        const fixture = await loadFixture(treasuryFixture);

        const { deployer, treasury, admin, admins, currency } = fixture;

        if (!skipPrepareLiquidity) {
            await prepareERC20(currency, [deployer], [treasury as any], ethers.utils.parseEther('1000000'));
            await callTransaction(
                getTreasuryTx_ProvideLiquidity(treasury, deployer, {
                    value: ethers.utils.parseEther('1000000'),
                })
            );
        }

        if (pause) {
            await callTransaction(getPausableTxByInput_Pause(treasury as any, deployer, admin, admins));
        }

        return {
            ...fixture,
        };
    }

    /* --- Initialization --- */
    describe('4.6.1. initialize(address,address,address)', async () => {
        it('4.6.1.1. Deploy successfully', async () => {
            const { treasury, admin, currency, primaryToken } = await setupBeforeTest({
                skipPrepareLiquidity: true,
            });

            expect(await treasury.admin()).to.equal(admin.address);
            expect(await treasury.currency()).to.equal(currency.address);
            expect(await treasury.primaryToken()).to.equal(primaryToken.address);

            expect(await treasury.liquidity()).to.equal(0);
            expect(await treasury.operationFund()).to.equal(0);
        });
    });

    /* --- Administration --- */
    describe('4.6.2. withdrawOperationFund(uint256,address,bytes[])', async () => {
        it('4.6.2.1. Withdraw operation fund successfully with valid signatures', async () => {
            const { deployer, treasury, admin, admins, currency, receiver } = await setupBeforeTest();

            const value1 = ethers.utils.parseEther('100');

            const initialTreasuryBalance = await currency.balanceOf(treasury.address);
            const initialOperationFund = await treasury.operationFund();

            const paramsInput1: WithdrawOperationFundParamsInput = {
                operator: receiver.address,
                value: value1,
            };
            const tx1 = await getTreasuryTxByInput_WithdrawOperationFund(
                treasury,
                deployer,
                paramsInput1,
                admin,
                admins
            );
            await tx1.wait();

            await expect(tx1).to.emit(treasury, 'OperationFundWithdrawal').withArgs(receiver.address, value1);

            expect(await treasury.operationFund()).to.equal(initialOperationFund.sub(value1));
            expect(await currency.balanceOf(treasury.address)).to.equal(initialTreasuryBalance.sub(value1));
            expect(await currency.balanceOf(receiver.address)).to.equal(value1);

            const value2 = ethers.utils.parseEther('1000');

            const paramsInput2: WithdrawOperationFundParamsInput = {
                operator: receiver.address,
                value: value2,
            };
            const tx2 = await getTreasuryTxByInput_WithdrawOperationFund(
                treasury,
                deployer,
                paramsInput2,
                admin,
                admins
            );
            await tx2.wait();

            await expect(tx2).to.emit(treasury, 'OperationFundWithdrawal').withArgs(receiver.address, value2);

            expect(await treasury.operationFund()).to.equal(initialOperationFund.sub(value1).sub(value2));
            expect(await currency.balanceOf(treasury.address)).to.equal(initialTreasuryBalance.sub(value1).sub(value2));
            expect(await currency.balanceOf(receiver.address)).to.equal(value1.add(value2));
        });

        it('4.6.2.2. Withdraw operation fund unsuccessfully with invalid signatures', async () => {
            const { deployer, treasury, admin, admins, receiver } = await setupBeforeTest();

            const value = ethers.utils.parseEther('100');

            const paramsInput: WithdrawOperationFundParamsInput = {
                operator: receiver.address,
                value: value,
            };
            const params: WithdrawOperationFundParams = {
                ...paramsInput,
                signatures: await getWithdrawOperationFundSignatures(treasury, paramsInput, admin, admins, false),
            };
            await expect(getTreasuryTx_WithdrawOperationFund(treasury, deployer, params)).to.be.revertedWithCustomError(
                admin,
                'FailedVerification'
            );
        });

        it('4.6.2.3. Withdraw operation fund unsuccessfully with insufficient funds', async () => {
            const { deployer, treasury, admin, admins, receiver } = await setupBeforeTest({
                skipPrepareLiquidity: true,
            });

            const operationFund = await treasury.operationFund();
            const value = operationFund.add(1);

            await expect(
                getTreasuryTxByInput_WithdrawOperationFund(
                    treasury,
                    deployer,
                    {
                        operator: receiver.address,
                        value: value,
                    },
                    admin,
                    admins
                )
            ).to.be.revertedWithCustomError(treasury, 'InsufficientFunds');
        });
    });

    /* --- Command --- */
    describe('4.6.3. withdrawLiquidity(address,uint256)', async () => {
        it('4.6.3.1. Withdraw liquidity successfully', async () => {
            const { treasury, currency, primaryToken, receiver } = await setupBeforeTest();

            const value1 = ethers.utils.parseEther('100');

            const initialTreasuryBalance = await currency.balanceOf(treasury.address);
            const initialOperationFund = await treasury.operationFund();
            const initialLiquidity = await treasury.liquidity();

            const tx1 = await getCallTreasuryTx_WithdrawLiquidity(treasury, primaryToken as any, {
                withdrawer: receiver.address,
                value: value1,
            });
            await tx1.wait();

            await expect(tx1).to.emit(treasury, 'LiquidityWithdrawal').withArgs(receiver.address, value1);

            expect(await treasury.liquidity()).to.equal(initialLiquidity.sub(value1));
            expect(await treasury.operationFund()).to.equal(initialOperationFund);
            expect(await currency.balanceOf(treasury.address)).to.equal(initialTreasuryBalance.sub(value1));
            expect(await currency.balanceOf(receiver.address)).to.equal(value1);

            const value2 = ethers.utils.parseEther('1000');

            const tx2 = await getCallTreasuryTx_WithdrawLiquidity(treasury, primaryToken as any, {
                withdrawer: receiver.address,
                value: value2,
            });
            await tx2.wait();

            await expect(tx2).to.emit(treasury, 'LiquidityWithdrawal').withArgs(receiver.address, value2);

            expect(await treasury.liquidity()).to.equal(initialLiquidity.sub(value1).sub(value2));
            expect(await treasury.operationFund()).to.equal(initialOperationFund);
            expect(await currency.balanceOf(treasury.address)).to.equal(initialTreasuryBalance.sub(value1).sub(value2));
        });

        it('4.6.3.2. Withdraw liquidity unsuccessfully when paused', async () => {
            const { treasury, primaryToken, receiver } = await setupBeforeTest({
                pause: true,
            });

            const value = ethers.utils.parseEther('100');

            await expect(
                getCallTreasuryTx_WithdrawLiquidity(treasury, primaryToken as any, {
                    withdrawer: receiver.address,
                    value: value,
                })
            ).to.be.revertedWith('Pausable: paused');
        });

        it('4.6.3.3. Withdraw liquidity unsuccessfully by unauthorized user', async () => {
            const { deployer, treasury, receiver } = await setupBeforeTest();

            const value = ethers.utils.parseEther('100');

            await expect(
                getTreasuryTx_WithdrawLiquidity(treasury, deployer, {
                    withdrawer: receiver.address,
                    value: value,
                })
            ).to.be.revertedWithCustomError(treasury, 'Unauthorized');
        });

        it('4.6.3.4. Withdraw liquidity unsuccessfully with insufficient funds', async () => {
            const { treasury, primaryToken, receiver } = await setupBeforeTest();

            const value = (await treasury.liquidity()).add(1);

            await expect(
                getCallTreasuryTx_WithdrawLiquidity(treasury, primaryToken as any, {
                    withdrawer: receiver.address,
                    value: value,
                })
            ).to.be.revertedWithCustomError(treasury, 'InsufficientFunds');
        });
    });

    describe('4.6.4. provideLiquidity(uint256)', async () => {
        it('4.6.4.1. Provide liquidity successfully', async () => {
            const { treasury, currency, receiver } = await setupBeforeTest({
                skipPrepareLiquidity: true,
            });

            const value1 = ethers.utils.parseEther('100');
            const value2 = ethers.utils.parseEther('1000');

            await prepareERC20(currency, [receiver], [treasury as any], value1.add(value2));

            const initialTreasuryBalance = await currency.balanceOf(treasury.address);

            const feeAmount1 = value1.mul(Constant.TREASURY_OPERATION_FUND_RATE).div(Constant.COMMON_RATE_MAX_FRACTION);
            const valueAfterFee1 = value1.sub(feeAmount1);

            const tx1 = await getTreasuryTx_ProvideLiquidity(treasury, receiver, { value: value1 });
            await tx1.wait();

            await expect(tx1).to.emit(treasury, 'LiquidityProvision').withArgs(receiver.address, value1, feeAmount1);

            expect(await treasury.liquidity()).to.equal(valueAfterFee1);
            expect(await treasury.operationFund()).to.equal(feeAmount1);
            expect(await currency.balanceOf(treasury.address)).to.equal(initialTreasuryBalance.add(value1));

            const tx2 = await getTreasuryTx_ProvideLiquidity(treasury, receiver, { value: value2 });
            await tx2.wait();

            const feeAmount2 = value2.mul(Constant.TREASURY_OPERATION_FUND_RATE).div(Constant.COMMON_RATE_MAX_FRACTION);
            const valueAfterFee2 = value2.sub(feeAmount2);

            await expect(tx2).to.emit(treasury, 'LiquidityProvision').withArgs(receiver.address, value2, feeAmount2);

            expect(await treasury.liquidity()).to.equal(valueAfterFee1.add(valueAfterFee2));
            expect(await treasury.operationFund()).to.equal(feeAmount1.add(feeAmount2));
            expect(await currency.balanceOf(treasury.address)).to.equal(initialTreasuryBalance.add(value1).add(value2));
        });

        it('4.6.4.2. Provide liquidity unsuccessfully when paused', async () => {
            const { treasury, receiver } = await setupBeforeTest({
                pause: true,
            });

            const value = ethers.utils.parseEther('100');

            await expect(
                getTreasuryTx_ProvideLiquidity(treasury, receiver, {
                    value: value,
                })
            ).to.be.revertedWith('Pausable: paused');
        });
    });
});
