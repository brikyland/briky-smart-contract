import { expect } from 'chai';
import { ethers } from 'hardhat';

// @typechain-types
import { Currency, Airdrop } from '@typechain-types';

// @utils
import { callTransaction, prepareERC20, prepareNativeToken, resetNativeToken } from '@utils/blockchain';

// @utils/deployments/common
import { deployAirdrop } from '@utils/deployments/common/airdrop';
import { deployCurrency } from '@utils/deployments/common/currency';

// @utils/transaction/common
import { getAirdropTx_Airdrop } from '@utils/transaction/common/airdrop';

interface AirdropFixture {
    deployer: any;
    sender1: any;
    sender2: any;
    receiver1: any;
    receiver2: any;
    receiver3: any;

    currency: Currency;
    airdrop: Airdrop;
}

describe('1.3. Airdrop', async () => {
    async function airdropFixture(): Promise<AirdropFixture> {
        const [deployer, sender1, sender2, receiver1, receiver2, receiver3] = await ethers.getSigners();

        const currency = (await deployCurrency(deployer, 'Mock Currency', 'TEST')) as Currency;
        const airdrop = (await deployAirdrop(deployer)) as Airdrop;

        return {
            deployer,
            sender1,
            sender2,
            receiver1,
            receiver2,
            receiver3,
            currency,
            airdrop,
        };
    }

    async function beforeAirdropTest({ skipPrepareERC20ForSender = false } = {}): Promise<AirdropFixture> {
        const fixture = await airdropFixture();
        const { sender1, sender2, currency, airdrop } = fixture;

        if (!skipPrepareERC20ForSender) {
            await prepareERC20(currency, [sender1, sender2], [airdrop], ethers.utils.parseEther('10000'));
        }

        return fixture;
    }

    /* --- Initialization --- */
    describe('1.3.1. initialize()', async () => {
        it('1.3.1.1. Deploy successfully', async () => {
            await beforeAirdropTest();
        });
    });

    /* --- Command --- */
    describe('1.3.2. airdrop(address[],uint256[],address)', async () => {
        it('1.3.2.1. Airdrop successfully with native token', async () => {
            const { sender1, sender2, receiver1, receiver2, receiver3, airdrop } = await beforeAirdropTest({
                skipPrepareERC20ForSender: true,
            });

            const sender1InitBalance = await ethers.provider.getBalance(sender1.address);
            const sender2InitBalance = await ethers.provider.getBalance(sender2.address);
            const receiver1InitBalance = await ethers.provider.getBalance(receiver1.address);
            const receiver2InitBalance = await ethers.provider.getBalance(receiver2.address);
            const receiver3InitBalance = await ethers.provider.getBalance(receiver3.address);

            const accounts1 = [receiver1.address, receiver2.address];
            const amount1_receiver1 = ethers.utils.parseEther('1');
            const amount1_receiver2 = ethers.utils.parseEther('2');
            const amounts1 = [amount1_receiver1, amount1_receiver2];
            const total1 = amount1_receiver1.add(amount1_receiver2);

            const tx1 = await getAirdropTx_Airdrop(
                airdrop,
                sender1,
                {
                    receivers: accounts1,
                    amounts: amounts1,
                    currency: ethers.constants.AddressZero,
                },
                { value: total1 }
            );
            const receipt1 = await tx1.wait();

            const tx1GasFee = receipt1.gasUsed.mul(receipt1.effectiveGasPrice);

            expect(await ethers.provider.getBalance(sender1.address)).to.equal(
                sender1InitBalance.sub(tx1GasFee).sub(total1)
            );
            expect(await ethers.provider.getBalance(receiver1.address)).to.equal(
                receiver1InitBalance.add(amount1_receiver1)
            );
            expect(await ethers.provider.getBalance(receiver2.address)).to.equal(
                receiver2InitBalance.add(amount1_receiver2)
            );

            const accounts2 = [receiver1.address, receiver3.address];
            const amount2_receiver1 = ethers.utils.parseEther('4');
            const amount2_receiver3 = ethers.utils.parseEther('8');
            const amounts2 = [amount2_receiver1, amount2_receiver3];
            const total2 = amount2_receiver1.add(amount2_receiver3);

            // Should refund when value is more than needed
            const tx2 = await getAirdropTx_Airdrop(
                airdrop,
                sender2,
                {
                    receivers: accounts2,
                    amounts: amounts2,
                    currency: ethers.constants.AddressZero,
                },
                { value: total2.add(ethers.utils.parseEther('1')) }
            );
            const receipt2 = await tx2.wait();
            const tx2GasFee = receipt2.gasUsed.mul(receipt2.effectiveGasPrice);

            expect(await ethers.provider.getBalance(sender2.address)).to.equal(
                sender2InitBalance.sub(tx2GasFee).sub(total2)
            );
            expect(await ethers.provider.getBalance(receiver1.address)).to.equal(
                receiver1InitBalance.add(amount1_receiver1).add(amount2_receiver1)
            );
            expect(await ethers.provider.getBalance(receiver3.address)).to.equal(
                receiver3InitBalance.add(amount2_receiver3)
            );
        });

        it('1.3.2.2. Airdrop successfully with ERC20 token', async () => {
            const { sender1, sender2, receiver1, receiver2, receiver3, currency, airdrop } = await beforeAirdropTest();

            const sender1InitBalance = await currency.balanceOf(sender1.address);
            const sender2InitBalance = await currency.balanceOf(sender2.address);
            const receiver1InitBalance = await currency.balanceOf(receiver1.address);
            const receiver2InitBalance = await currency.balanceOf(receiver2.address);
            const receiver3InitBalance = await currency.balanceOf(receiver3.address);

            const accounts1 = [receiver1.address, receiver2.address];
            const amount1_receiver1 = ethers.utils.parseEther('1');
            const amount1_receiver2 = ethers.utils.parseEther('2');
            const amounts1 = [amount1_receiver1, amount1_receiver2];
            const total1 = amount1_receiver1.add(amount1_receiver2);

            await callTransaction(
                getAirdropTx_Airdrop(airdrop, sender1, {
                    receivers: accounts1,
                    amounts: amounts1,
                    currency: currency.address,
                })
            );

            expect(await currency.balanceOf(sender1.address)).to.equal(sender1InitBalance.sub(total1));
            expect(await currency.balanceOf(receiver1.address)).to.equal(receiver1InitBalance.add(amount1_receiver1));
            expect(await currency.balanceOf(receiver2.address)).to.equal(receiver2InitBalance.add(amount1_receiver2));

            const accounts2 = [receiver1.address, receiver3.address];
            const amount2_receiver1 = ethers.utils.parseEther('4');
            const amount2_receiver3 = ethers.utils.parseEther('8');
            const amounts2 = [amount2_receiver1, amount2_receiver3];
            const total2 = amount2_receiver1.add(amount2_receiver3);

            // Should refund when value is more than needed
            await callTransaction(
                getAirdropTx_Airdrop(airdrop, sender2, {
                    receivers: accounts2,
                    amounts: amounts2,
                    currency: currency.address,
                })
            );

            expect(await currency.balanceOf(sender2.address)).to.equal(sender2InitBalance.sub(total2));
            expect(await currency.balanceOf(receiver1.address)).to.equal(
                receiver1InitBalance.add(amount1_receiver1).add(amount2_receiver1)
            );
            expect(await currency.balanceOf(receiver3.address)).to.equal(receiver3InitBalance.add(amount2_receiver3));
        });

        it('1.3.2.3. Airdrop unsuccessfully with invalid input', async () => {
            const { sender1, receiver1, receiver2, airdrop } = await beforeAirdropTest({
                skipPrepareERC20ForSender: true,
            });

            await expect(
                getAirdropTx_Airdrop(airdrop, sender1, {
                    receivers: [receiver1.address, receiver2.address],
                    amounts: [ethers.utils.parseEther('1'), ethers.utils.parseEther('2'), ethers.utils.parseEther('3')],
                    currency: ethers.constants.AddressZero,
                })
            ).to.be.revertedWith('invalid input');
        });

        it('1.3.2.4. Airdrop unsuccessfully with insufficient native balance', async () => {
            const { sender1, receiver1, deployer, airdrop } = await beforeAirdropTest({
                skipPrepareERC20ForSender: true,
            });

            await resetNativeToken(ethers.provider, [sender1]);
            await prepareNativeToken(ethers.provider, deployer, [sender1], ethers.utils.parseEther('1'));

            await expect(
                getAirdropTx_Airdrop(airdrop, sender1, {
                    receivers: [receiver1.address],
                    amounts: [ethers.utils.parseEther('100')],
                    currency: ethers.constants.AddressZero,
                })
            ).to.be.revertedWithCustomError(airdrop, 'InsufficientValue');
        });

        it('1.3.2.5. Airdrop unsuccessfully with insufficient ERC20 balance', async () => {
            const { sender1, receiver1, currency, airdrop } = await beforeAirdropTest({
                skipPrepareERC20ForSender: true,
            });

            await expect(
                getAirdropTx_Airdrop(airdrop, sender1, {
                    receivers: [receiver1.address],
                    amounts: [ethers.utils.parseEther('100')],
                    currency: currency.address,
                })
            ).to.be.revertedWith('ERC20: insufficient allowance');
        });

        it('1.3.2.6. Airdrop unsuccessfully with invalid address', async () => {
            const { sender1, receiver1, airdrop } = await beforeAirdropTest({
                skipPrepareERC20ForSender: true,
            });

            await expect(
                getAirdropTx_Airdrop(airdrop, sender1, {
                    receivers: [receiver1.address, ethers.constants.AddressZero],
                    amounts: [ethers.utils.parseEther('1'), ethers.utils.parseEther('2')],
                    currency: ethers.constants.AddressZero,
                })
            ).to.be.revertedWith('invalid address');
        });

        it('1.3.2.7. Airdrop unsuccessfully with invalid amount', async () => {
            const { sender1, receiver1, receiver2, airdrop } = await beforeAirdropTest({
                skipPrepareERC20ForSender: true,
            });

            await expect(
                getAirdropTx_Airdrop(airdrop, sender1, {
                    receivers: [receiver1.address, receiver2.address],
                    amounts: [ethers.utils.parseEther('1'), ethers.constants.Zero],
                    currency: ethers.constants.AddressZero,
                })
            ).to.be.revertedWith('invalid amount');
        });
    });
});
