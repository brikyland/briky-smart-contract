import { expect } from 'chai';
import { ethers } from 'hardhat';
import {
    Currency,
    Airdrop,
} from '@typechain-types';
import { prepareERC20, prepareNativeToken, resetNativeToken } from '@utils/blockchain';
import { deployAirdrop } from '@utils/deployments/lucra/airdrop';
import { deployCurrency } from '@utils/deployments/mock/currency';

interface AirdropFixture {
    airdrop: Airdrop;
    currency: Currency;

    deployer: any;
    sender1: any;
    sender2: any;
    sender3: any;
    receiver1: any;
    receiver2: any;
    receiver3: any;
}

describe('1.3. Airdrop', async () => {
    async function airdropFixture(): Promise<AirdropFixture> {
        const accounts = await ethers.getSigners();
        const deployer = accounts[0];
        const sender1 = accounts[1];
        const sender2 = accounts[2];
        const sender3 = accounts[3];
        const receiver1 = accounts[4];
        const receiver2 = accounts[5];
        const receiver3 = accounts[6];
        
        const airdrop = await deployAirdrop(deployer) as Airdrop;
        const currency = await deployCurrency(
            deployer,
            'Mock Currency',
            'TEST'
        ) as Currency;

        return {
            airdrop,
            currency,
            deployer,
            sender1,
            sender2,
            sender3,
            receiver1,
            receiver2,
            receiver3,
        };
    };

    async function beforeAirdropTest({
        prepareERC20ForSender = false,
    } = {}): Promise<AirdropFixture> {
        const fixture = await airdropFixture();
        const { currency, sender1, sender2, sender3, airdrop } = fixture;
        
        if (prepareERC20ForSender) {
            await prepareERC20(currency, [sender1, sender2, sender3], [airdrop], ethers.utils.parseEther('10000'));
        }

        return fixture;
    }

    describe('1.3.1. initialize(address, address, string, string, string, uint256, uint256)', async () => {
        it('1.3.1.1. Deploy successfully', async () => {
            await beforeAirdropTest();
        });
    });

    describe('1.3.2. airdrop(address[], uint256[], currency)', async () => {
        it('1.3.2.1. airdrop successfully with native token', async () => {
            const { airdrop, sender1, sender2, receiver1, receiver2, receiver3 } = await beforeAirdropTest();

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

            const tx1 = await airdrop.connect(sender1).airdrop(accounts1, amounts1, ethers.constants.AddressZero, { value: total1 });
            const receipt1 = await tx1.wait();

            const tx1GasFee = receipt1.gasUsed.mul(receipt1.effectiveGasPrice);

            expect(await ethers.provider.getBalance(sender1.address)).to.equal(sender1InitBalance.sub(tx1GasFee).sub(total1));
            expect(await ethers.provider.getBalance(receiver1.address)).to.equal(receiver1InitBalance.add(amount1_receiver1));
            expect(await ethers.provider.getBalance(receiver2.address)).to.equal(receiver2InitBalance.add(amount1_receiver2));

            const accounts2 = [receiver1.address, receiver3.address];
            const amount2_receiver1 = ethers.utils.parseEther('4');
            const amount2_receiver3 = ethers.utils.parseEther('8');
            const amounts2 = [amount2_receiver1, amount2_receiver3];
            const total2 = amount2_receiver1.add(amount2_receiver3);

            // Should refund when value is more than needed
            const tx2 = await airdrop.connect(sender2).airdrop(accounts2, amounts2, ethers.constants.AddressZero, { value: total2.add(ethers.utils.parseEther('1')) });
            const receipt2 = await tx2.wait();
            const tx2GasFee = receipt2.gasUsed.mul(receipt2.effectiveGasPrice);

            expect(await ethers.provider.getBalance(sender2.address)).to.equal(sender2InitBalance.sub(tx2GasFee).sub(total2));
            expect(await ethers.provider.getBalance(receiver1.address)).to.equal(receiver1InitBalance.add(amount1_receiver1).add(amount2_receiver1));
            expect(await ethers.provider.getBalance(receiver3.address)).to.equal(receiver3InitBalance.add(amount2_receiver3));
        });

        it('1.3.2.2. airdrop successfully with ERC20 token', async () => {
            const { airdrop, currency, sender1, sender2, receiver1, receiver2, receiver3 } = await beforeAirdropTest({
                prepareERC20ForSender: true,
            });

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

            const tx1 = await airdrop.connect(sender1).airdrop(accounts1, amounts1, currency.address);

            expect(await currency.balanceOf(sender1.address)).to.equal(sender1InitBalance.sub(total1));
            expect(await currency.balanceOf(receiver1.address)).to.equal(receiver1InitBalance.add(amount1_receiver1));
            expect(await currency.balanceOf(receiver2.address)).to.equal(receiver2InitBalance.add(amount1_receiver2));

            const accounts2 = [receiver1.address, receiver3.address];
            const amount2_receiver1 = ethers.utils.parseEther('4');
            const amount2_receiver3 = ethers.utils.parseEther('8');
            const amounts2 = [amount2_receiver1, amount2_receiver3];
            const total2 = amount2_receiver1.add(amount2_receiver3);

            // Should refund when value is more than needed
            const tx2 = await airdrop.connect(sender2).airdrop(accounts2, amounts2, currency.address);

            expect(await currency.balanceOf(sender2.address)).to.equal(sender2InitBalance.sub(total2));
            expect(await currency.balanceOf(receiver1.address)).to.equal(receiver1InitBalance.add(amount1_receiver1).add(amount2_receiver1));
            expect(await currency.balanceOf(receiver3.address)).to.equal(receiver3InitBalance.add(amount2_receiver3));
        });

        it('1.3.2.3. aidrop unsuccessfully with invalid input', async () => {
            const { airdrop, sender1, receiver1, receiver2 } = await beforeAirdropTest();

            const accounts = [receiver1.address, receiver2.address];
            const amounts = [ethers.utils.parseEther('1'), ethers.utils.parseEther('2'), ethers.utils.parseEther('3')];

            await expect(airdrop.connect(sender1).airdrop(accounts, amounts, ethers.constants.AddressZero))
                .to.be.revertedWith('invalid input');
        });

        it('1.3.2.4. airdrop unsuccessfully with insufficient native balance', async () => {
            const { airdrop, sender1, receiver1, receiver2, deployer } = await beforeAirdropTest();

            await resetNativeToken(ethers.provider, [sender1]);
            await prepareNativeToken(ethers.provider, deployer, [sender1], ethers.utils.parseEther('1'));

            const accounts = [receiver1.address];
            const amounts = [ethers.utils.parseEther('100')];

            await expect(airdrop.connect(sender1).airdrop(accounts, amounts, ethers.constants.AddressZero))
                .to.be.revertedWithCustomError(airdrop, 'InsufficientValue');
        });

        it('1.3.2.5. airdrop unsuccessfully with insufficient ERC20 balance', async () => {
            const { airdrop, currency, sender1, receiver1 } = await beforeAirdropTest();

            const accounts = [receiver1.address];
            const amounts = [ethers.utils.parseEther('100')];

            await expect(airdrop.connect(sender1).airdrop(accounts, amounts, currency.address))
                .to.be.revertedWith('ERC20: insufficient allowance');
        });
        
        it('1.3.2.6. airdrop unsuccessfully with invalid address', async () => {
            const { airdrop, sender1, receiver1 } = await beforeAirdropTest();

            const accounts = [receiver1.address, ethers.constants.AddressZero];
            const amounts = [ethers.utils.parseEther('1'), ethers.utils.parseEther('2')];

            await expect(airdrop.connect(sender1).airdrop(accounts, amounts, ethers.constants.AddressZero))
                .to.be.revertedWith('invalid address');
        });

        it('1.3.2.7. airdrop unsuccessfully with invalid amount', async () => {
            const { airdrop, sender1, receiver1, receiver2 } = await beforeAirdropTest();

            const accounts = [receiver1.address, receiver2.address];
            const amounts = [ethers.utils.parseEther('1'), ethers.constants.Zero];

            await expect(airdrop.connect(sender1).airdrop(accounts, amounts, ethers.constants.AddressZero))
                .to.be.revertedWith('invalid amount');
        });
    });
});
