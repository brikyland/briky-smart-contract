import { expect } from 'chai';
import { BigNumber } from 'ethers';
import { ethers } from 'hardhat';

// @nomicfoundation/hardhat-network-helpers
import { loadFixture } from '@nomicfoundation/hardhat-network-helpers';

// @typechain-types
import { Admin, Currency, FeeReceiver } from '@typechain-types';

// @utils
import { callTransaction, getSignatures, randomWallet } from '@utils/blockchain';

// @utils/deployments/common
import { deployAdmin } from '@utils/deployments/common/admin';
import { deployFeeReceiver } from '@utils/deployments/common/feeReceiver';
import { deployCurrency } from '@utils/deployments/common/currency';

// @utils/deployments/mock
import { deployReentrancyERC20 } from '@utils/deployments/mock/reentrancy/reentrancyERC20';
import { deployFailReceiver } from '@utils/deployments/mock/utilities/failReceiver';

// @utils/models/common
import { WithdrawParams, WithdrawParamsInput } from '@utils/models/common/feeReceiver';

// @utils/signatures/common
import { getWithdrawSignatures } from '@utils/signatures/common/feeReceiver';

// @utils/transaction/common
import { getFeeReceiverTx_Withdraw, getFeeReceiverTxByInput_Withdraw } from '@utils/transaction/common/feeReceiver';

interface FeeReceiverFixture {
    deployer: any;
    admins: any[];

    admin: Admin;
    currency1: Currency;
    currency2: Currency;
    feeReceiver: FeeReceiver;
}

describe('1.5. FeeReceiver', async () => {
    async function feeReceiverFixture(): Promise<FeeReceiverFixture> {
        const [deployer, admin1, admin2, admin3, admin4, admin5] = await ethers.getSigners();
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

        const currency1 = (await deployCurrency(deployer.address, 'MockCurrency1', 'MCK1')) as Currency;

        const currency2 = (await deployCurrency(deployer.address, 'MockCurrency2', 'MCK2')) as Currency;

        const feeReceiver = (await deployFeeReceiver(deployer.address, admin.address)) as FeeReceiver;

        return {
            deployer,
            admins,
            admin,
            currency1,
            currency2,
            feeReceiver,
        };
    }

    async function setupBeforeTest(): Promise<FeeReceiverFixture> {
        return await loadFixture(feeReceiverFixture);
    }

    /* --- Initialization --- */
    describe('1.5.1. initialize(address)', async () => {
        it('1.5.1.1. Deploy successfully', async () => {
            const { admin, feeReceiver } = await setupBeforeTest();
            const adminAddress = await feeReceiver.admin();
            expect(adminAddress).to.equal(admin.address);
        });
    });

    /* --- Command --- */
    describe('1.5.2. withdraw(address,address[],uint256[],bytes[])', async () => {
        it('1.5.2.1. Withdraw native tokens successfully', async () => {
            const { deployer, admins, admin, feeReceiver } = await setupBeforeTest();

            let receiver = randomWallet();

            await callTransaction(
                deployer.sendTransaction({
                    to: feeReceiver.address,
                    value: 2000,
                })
            );

            let balance = await ethers.provider.getBalance(feeReceiver.address);
            expect(balance).to.equal(2000);

            const paramsInput1: WithdrawParamsInput = {
                receiver: receiver.address,
                currencies: [ethers.constants.AddressZero],
                values: [BigNumber.from(1200)],
            };
            const tx1 = await getFeeReceiverTxByInput_Withdraw(feeReceiver, deployer, paramsInput1, admin, admins);
            await tx1.wait();

            await expect(tx1)
                .to.emit(feeReceiver, 'Withdrawal')
                .withArgs(receiver.address, ethers.constants.AddressZero, 1200);

            balance = await ethers.provider.getBalance(feeReceiver.address);
            expect(balance).to.equal(800);

            balance = await ethers.provider.getBalance(receiver.address);
            expect(balance).to.equal(1200);

            await callTransaction(
                deployer.sendTransaction({
                    to: feeReceiver.address,
                    value: 3000,
                })
            );

            balance = await ethers.provider.getBalance(feeReceiver.address);
            expect(balance).to.equal(3800);

            const paramsInput2: WithdrawParamsInput = {
                receiver: receiver.address,
                currencies: [ethers.constants.AddressZero],
                values: [BigNumber.from(3800)],
            };
            const tx2 = await getFeeReceiverTxByInput_Withdraw(feeReceiver, deployer, paramsInput2, admin, admins);
            await tx2.wait();

            await expect(tx2)
                .to.emit(feeReceiver, 'Withdrawal')
                .withArgs(receiver.address, ethers.constants.AddressZero, 3800);

            balance = await ethers.provider.getBalance(feeReceiver.address);
            expect(balance).to.equal(0);

            balance = await ethers.provider.getBalance(receiver.address);
            expect(balance).to.equal(5000);
        });

        it('1.5.2.2. Withdraw ERC-20 tokens successfully', async () => {
            const { deployer, admins, admin, feeReceiver, currency1, currency2 } = await setupBeforeTest();

            let receiver = randomWallet();

            await callTransaction(currency1.mint(feeReceiver.address, 1000));
            await callTransaction(currency2.mint(feeReceiver.address, ethers.constants.MaxUint256));

            expect(await currency1.balanceOf(feeReceiver.address)).to.equal(1000);
            expect(await currency2.balanceOf(feeReceiver.address)).to.equal(ethers.constants.MaxUint256);
            expect(await currency1.balanceOf(receiver.address)).to.equal(0);
            expect(await currency2.balanceOf(receiver.address)).to.equal(0);

            const paramsInput1: WithdrawParamsInput = {
                receiver: receiver.address,
                currencies: [currency1.address, currency2.address],
                values: [BigNumber.from(700), ethers.constants.MaxUint256],
            };
            const tx = await getFeeReceiverTxByInput_Withdraw(feeReceiver, deployer, paramsInput1, admin, admins);
            await tx.wait();

            await expect(tx)
                .to.emit(feeReceiver, 'Withdrawal')
                .withArgs(receiver.address, currency2.address, ethers.constants.MaxUint256)
                .emit(feeReceiver, 'Withdrawal')
                .withArgs(receiver.address, currency1.address, 700);

            expect(await currency1.balanceOf(feeReceiver.address)).to.equal(300);
            expect(await currency2.balanceOf(feeReceiver.address)).to.equal(0);
            expect(await currency1.balanceOf(receiver.address)).to.equal(700);
            expect(await currency2.balanceOf(receiver.address)).to.equal(ethers.constants.MaxUint256);
        });

        it('1.5.2.3. Withdraw token successfully multiple times in the same tx', async () => {
            const { deployer, admins, admin, currency1, feeReceiver } = await setupBeforeTest();

            let receiver = randomWallet();

            await callTransaction(
                deployer.sendTransaction({
                    to: feeReceiver.address,
                    value: 2000,
                })
            );

            await callTransaction(currency1.mint(feeReceiver.address, 1000));

            expect(await currency1.balanceOf(feeReceiver.address)).to.equal(1000);
            expect(await currency1.balanceOf(receiver.address)).to.equal(0);

            const currencies = [
                ethers.constants.AddressZero,
                ethers.constants.AddressZero,
                currency1.address,
                currency1.address,
            ];
            const amounts = [BigNumber.from(100), BigNumber.from(200), BigNumber.from(300), BigNumber.from(400)];

            const paramsInput: WithdrawParamsInput = {
                receiver: receiver.address,
                currencies: currencies,
                values: amounts,
            };
            const tx = await getFeeReceiverTxByInput_Withdraw(feeReceiver, deployer, paramsInput, admin, admins);
            await tx.wait();

            await expect(tx)
                .to.emit(feeReceiver, 'Withdrawal')
                .withArgs(receiver.address, currencies[0], amounts[0])
                .emit(feeReceiver, 'Withdrawal')
                .withArgs(receiver.address, currencies[1], amounts[1])
                .emit(feeReceiver, 'Withdrawal')
                .withArgs(receiver.address, currencies[2], amounts[2])
                .emit(feeReceiver, 'Withdrawal')
                .withArgs(receiver.address, currencies[3], amounts[3]);

            expect(await ethers.provider.getBalance(feeReceiver.address)).to.equal(1700);
            expect(await ethers.provider.getBalance(receiver.address)).to.equal(300);

            expect(await currency1.balanceOf(feeReceiver.address)).to.equal(300);
            expect(await currency1.balanceOf(receiver.address)).to.equal(700);
        });

        it('1.5.2.4. Withdraw unsuccessfully with invalid signatures', async () => {
            const { deployer, admins, admin, feeReceiver } = await setupBeforeTest();

            const paramsInput: WithdrawParamsInput = {
                receiver: deployer.address,
                currencies: [ethers.constants.AddressZero],
                values: [BigNumber.from(1000)],
            };
            const params: WithdrawParams = {
                ...paramsInput,
                signatures: await getWithdrawSignatures(feeReceiver, paramsInput, admin, admins, false),
            };

            await expect(getFeeReceiverTx_Withdraw(feeReceiver, deployer, params)).to.be.revertedWithCustomError(admin, 'FailedVerification');
        });

        it('1.5.2.5. Withdraw unsuccessfully with insufficient native tokens', async () => {
            const { deployer, admins, admin, feeReceiver } = await setupBeforeTest();

            await expect(
                getFeeReceiverTxByInput_Withdraw(
                    feeReceiver,
                    deployer,
                    {
                        receiver: deployer.address,
                        currencies: [ethers.constants.AddressZero],
                        values: [BigNumber.from(1000)],
                    },
                    admin,
                    admins
                )
            ).to.be.revertedWithCustomError(feeReceiver, 'FailedTransfer');
        });

        it('1.5.2.6. Withdraw unsuccessfully with insufficient ERC20 tokens', async () => {
            const { deployer, admins, admin, feeReceiver, currency1 } = await setupBeforeTest();

            await expect(
                getFeeReceiverTxByInput_Withdraw(
                    feeReceiver,
                    deployer,
                    {
                        receiver: deployer.address,
                        currencies: [currency1.address],
                        values: [BigNumber.from(1000)],
                    },
                    admin,
                    admins
                )
            ).to.be.revertedWith('ERC20: transfer amount exceeds balance');
        });

        it('1.5.2.7. Withdraw unsuccessfully when transferring native token to withdrawer failed', async () => {
            const { deployer, admins, admin, feeReceiver } = await setupBeforeTest();

            const failReceiver = await deployFailReceiver(deployer, true, false);

            await callTransaction(
                deployer.sendTransaction({
                    to: feeReceiver.address,
                    value: 1000,
                })
            );

            await expect(
                getFeeReceiverTxByInput_Withdraw(
                    feeReceiver,
                    deployer,
                    {
                        receiver: failReceiver.address,
                        currencies: [ethers.constants.AddressZero],
                        values: [BigNumber.from(1000)],
                    },
                    admin,
                    admins
                )
            ).to.be.revertedWithCustomError(feeReceiver, 'FailedTransfer');
        });

        it('1.5.2.8. Withdraw unsuccessfully when the contract is reentered', async () => {
            const { deployer, admins, admin, feeReceiver } = await setupBeforeTest();

            const reentrancyERC20 = await deployReentrancyERC20(deployer, true, false);

            await callTransaction(reentrancyERC20.mint(feeReceiver.address, 1000));

            let message = ethers.utils.defaultAbiCoder.encode(
                ['address', 'string', 'address', 'address[]', 'uint256[]'],
                [feeReceiver.address, 'withdraw', reentrancyERC20.address, [reentrancyERC20.address], [200]]
            );

            await callTransaction(
                reentrancyERC20.updateReentrancyPlan(
                    feeReceiver.address,
                    feeReceiver.interface.encodeFunctionData('withdraw', [
                        reentrancyERC20.address,
                        [reentrancyERC20.address],
                        [200],
                        await getSignatures(message, admins, (await admin.nonce()).add(1)),
                    ])
                )
            );

            await expect(
                reentrancyERC20.call(
                    feeReceiver.address,
                    feeReceiver.interface.encodeFunctionData('withdraw', [
                        reentrancyERC20.address,
                        [reentrancyERC20.address],
                        [200],
                        await getSignatures(message, admins, await admin.nonce()),
                    ])
                )
            ).to.be.revertedWith('ReentrancyGuard: reentrant call');

            const balance = await reentrancyERC20.balanceOf(feeReceiver.address);
            expect(balance).to.equal(1000);
        });
    });
});
