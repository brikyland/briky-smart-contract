import { ethers } from 'hardhat';
import {
    Admin,
    Currency,
    FailReceiver,
    Governor,
    Governor__factory,
    PaymentHub,
    ReentrancyERC20,
} from '@typechain-types';
import { Constant } from '@tests/test.constant';
import { deployAdmin } from '@utils/deployments/common/admin';
import { deployCurrency } from '@utils/deployments/common/currency';
import { deployReentrancyERC20 } from '@utils/deployments/mocks/mockReentrancy/reentrancyERC20';
import { loadFixture, time } from "@nomicfoundation/hardhat-network-helpers";
import { deployPaymentHub } from '@utils/deployments/common/paymentHub';
import { callPaymentHub_Pause } from '@utils/callWithSignatures/paymentHub';
import { callAdmin_AuthorizeGovernor, callAdmin_UpdateCurrencyRegistries } from '@utils/callWithSignatures/admin';
import { expect } from 'chai';
import { callTransaction, prepareERC20, prepareNativeToken } from '@utils/blockchain';
import { deployGovernor } from '@utils/deployments/common/governor';
import { BigNumber } from 'ethers';
import { deployFailReceiver } from '@utils/deployments/mocks/failReceiver';
import { MockContract, smock } from '@defi-wonderland/smock';

interface PaymentHubFixture {
    admin: Admin;
    paymentHub: PaymentHub;
    currencies: Currency[];
    governor: MockContract<Governor>;
    reentrancyERC20: ReentrancyERC20;
    failReceiver: FailReceiver;

    deployer: any;
    admins: any[];
    funder1: any;
    funder2: any;
    withdrawer1: any;
    withdrawer2: any;
    issuer1: any;
    issuer2: any;
    receiver1: any;
    receiver2: any;
    receiver3: any;
    zone: string;
}

describe('22. PaymentHub', async () => {
    async function paymentHubFixture(): Promise<PaymentHubFixture> {
        const accounts = await ethers.getSigners();
        const deployer = accounts[0];
        const admins = [];
        for (let i = 1; i <= Constant.ADMIN_NUMBER; ++i) admins.push(accounts[i]);
        const funder1 = accounts[Constant.ADMIN_NUMBER + 1];
        const funder2 = accounts[Constant.ADMIN_NUMBER + 2];
        const withdrawer1 = accounts[Constant.ADMIN_NUMBER + 3];
        const withdrawer2 = accounts[Constant.ADMIN_NUMBER + 4];
        const issuer1 = accounts[Constant.ADMIN_NUMBER + 5];
        const issuer2 = accounts[Constant.ADMIN_NUMBER + 6];
        const receiver1 = accounts[Constant.ADMIN_NUMBER + 7];
        const receiver2 = accounts[Constant.ADMIN_NUMBER + 8];
        const receiver3 = accounts[Constant.ADMIN_NUMBER + 9];

        const adminAddresses: string[] = admins.map(signer => signer.address);
        const admin = await deployAdmin(
            deployer.address,
            adminAddresses[0],
            adminAddresses[1],
            adminAddresses[2],
            adminAddresses[3],
            adminAddresses[4],
        ) as Admin;

        const SmockGovernor = await smock.mock<Governor__factory>('Governor');
        const governor = await SmockGovernor.deploy();
        await governor.initialize(admin.address);

        const currency1 = await deployCurrency(deployer.address, 'MockCurrency1', 'MCK1') as Currency;
        const currency2 = await deployCurrency(deployer.address, 'MockCurrency2', 'MCK2') as Currency;
        const currency3 = await deployCurrency(deployer.address, 'MockCurrency3', 'MCK3') as Currency;
        const currency4 = await deployCurrency(deployer.address, 'MockCurrency4', 'MCK4') as Currency;
        const currencies = [currency1, currency2, currency3, currency4];

        const reentrancyERC20 = await deployReentrancyERC20(deployer) as ReentrancyERC20;

        const failReceiver = await deployFailReceiver(deployer, false) as FailReceiver;

        const paymentHub = await deployPaymentHub(deployer.address, admin.address) as PaymentHub;

        const zone = ethers.utils.formatBytes32String("TestZone");

        return {
            admin,
            paymentHub,
            currencies,
            governor,
            failReceiver,
            deployer,
            admins,
            funder1,
            funder2,
            withdrawer1,
            withdrawer2,
            reentrancyERC20,
            zone,
            issuer1,
            issuer2,
            receiver1,
            receiver2,
            receiver3,
        };
    };

    async function beforePaymentHubTest({
        registerCurrencies = false,
        authorizeGovernor = false,
        fundERC20ForIssuer = false,
        initGovernorTokens = false,
        useReentrancyERC20 = false,
        useFailReceiver = false,
        issueSamplePayments = false,
        pause = false,
    } = {}): Promise<PaymentHubFixture> {
        const fixture = await loadFixture(paymentHubFixture);
        const { admin, admins, paymentHub, governor, zone, receiver1, receiver2, receiver3, issuer1, issuer2, reentrancyERC20, failReceiver } = fixture;
        let { currencies } = fixture;

        if (useReentrancyERC20) {
            currencies = [reentrancyERC20 as any, ...currencies];
        }

        if (registerCurrencies) {
            await callAdmin_UpdateCurrencyRegistries(
                admin,
                admins,
                [ethers.constants.AddressZero, ...currencies.map(currency => currency.address)],
                [true, ...currencies.map(_ => true)],
                [false, ...currencies.map(_ => true)],
                await admin.nonce(),
            )
        }

        if (authorizeGovernor) {
            await callAdmin_AuthorizeGovernor(
                admin,
                admins,
                [governor.address],
                true,
                await admin.nonce(),
            )
        }

        if (fundERC20ForIssuer) {
            await prepareERC20(
                currencies[0],
                [issuer1, issuer2, receiver1, receiver2, receiver3],
                [paymentHub],
                ethers.utils.parseEther(String(1e9)),
            )
        }

        if (initGovernorTokens) {
            if (useFailReceiver) {
                await callTransaction(governor.connect(receiver1).mint(1, ethers.utils.parseEther('2')));
            } else {
                await callTransaction(governor.connect(receiver1).mint(1, ethers.utils.parseEther('2')));
            }
            await callTransaction(governor.connect(receiver2).mint(1, ethers.utils.parseEther('3')));
            await callTransaction(governor.connect(receiver3).mint(1, ethers.utils.parseEther('5')));

            if (useFailReceiver) {
                await callTransaction(governor.connect(receiver1).mint(1, ethers.utils.parseEther('100')));
            } else {
                await callTransaction(governor.connect(receiver1).mint(1, ethers.utils.parseEther('100')));
            }
            await callTransaction(governor.connect(receiver2).mint(2, ethers.utils.parseEther('300')));
        }

        if (issueSamplePayments) {
            await callTransaction(paymentHub.connect(issuer1).issuePayment(
                governor.address,
                1,
                ethers.utils.parseEther('1000'),
                ethers.constants.AddressZero,
                { value: ethers.utils.parseEther('1000') },
            ));
            await callTransaction(paymentHub.connect(issuer2).issuePayment(
                governor.address,
                1,
                ethers.utils.parseEther('100'),
                ethers.constants.AddressZero,
                { value: ethers.utils.parseEther('100') },
            ));
            await callTransaction(paymentHub.connect(issuer2).issuePayment(
                governor.address,
                2,
                ethers.utils.parseEther('2000'),
                currencies[0].address,
            ));
        }

        if (pause) {
            await callPaymentHub_Pause(
                paymentHub,
                admins,
                await admin.nonce(),
            )
        }

        return {
            ...fixture,
        }
    }

    describe('22.1. initialize(address)', async () => {
        it('22.1.1. Deploy successfully', async () => {
            const fixture = await loadFixture(paymentHubFixture);
            const { admin, paymentHub } = fixture;

            expect(await paymentHub.admin()).to.equal(admin.address);
        });
    });

    describe('22.2. issuePayment(address, uint256, uint256, address)', async () => {
        it('22.2.1. Issue payment successfully', async () => {
            const fixture = await beforePaymentHubTest({
                registerCurrencies: true,
                authorizeGovernor: true,
                fundERC20ForIssuer: true,
                initGovernorTokens: true,
            });
            const { paymentHub, currencies, reentrancyERC20, issuer1, issuer2, governor } = fixture;

            const tokenId1 = 1;
            const value1 = ethers.utils.parseEther('1000');
            const totalVote = await governor.totalSupply(tokenId1);

            let issuer1InitBalance = await ethers.provider.getBalance(issuer1.address);
            let paymentHubInitBalance = await ethers.provider.getBalance(paymentHub.address);

            let timestamp = await time.latest() + 10;
            await time.setNextBlockTimestamp(timestamp);
            const tx1 = await paymentHub.connect(issuer1).issuePayment(
                governor.address,
                tokenId1,
                value1,
                ethers.constants.AddressZero,
                { value: value1.add(ethers.utils.parseEther('1')) },
            );
            const receipt1 = await tx1.wait();
            const gasFee1 = receipt1.gasUsed.mul(receipt1.effectiveGasPrice);
 
            await expect(tx1).to.emit(paymentHub, 'NewPayment').withArgs(
                governor.address,
                tokenId1,
                issuer1.address,
                totalVote,
                value1,
                ethers.constants.AddressZero,
            );

            const payment = await paymentHub.getPayment(tokenId1);
            expect(payment.tokenId).to.equal(tokenId1);
            expect(payment.remainWeight).to.equal(totalVote);
            expect(payment.remainValue).to.equal(value1);
            expect(payment.currency).to.equal(ethers.constants.AddressZero);
            expect(payment.at(4)).to.equal(timestamp);
            expect(payment.governor).to.equal(governor.address);

            expect(await ethers.provider.getBalance(issuer1.address)).to.equal(issuer1InitBalance.sub(gasFee1).sub(value1));
            expect(await ethers.provider.getBalance(paymentHub.address)).to.equal(paymentHubInitBalance.add(value1));

            const tokenId2 = 2;
            const currency = currencies[0];
            const value2 = ethers.utils.parseEther('2000');
            const totalVote2 = await governor.totalSupply(tokenId2);

            let issuer2InitBalance = await currency.balanceOf(issuer2.address);
            paymentHubInitBalance = await currency.balanceOf(paymentHub.address);

            timestamp += 10;
            await time.setNextBlockTimestamp(timestamp);
            const tx2 = await paymentHub.connect(issuer2).issuePayment(
                governor.address,
                tokenId2,
                value2,
                currency.address,
            );
            await tx2.wait();

            await expect(tx2).to.emit(paymentHub, 'NewPayment').withArgs(
                governor.address,
                tokenId2,
                issuer2.address,
                totalVote2,
                value2,
                currency.address,
            );

            const payment2 = await paymentHub.getPayment(tokenId2);
            expect(payment2.tokenId).to.equal(tokenId2);
            expect(payment2.remainWeight).to.equal(totalVote2);
            expect(payment2.remainValue).to.equal(value2);
            expect(payment2.currency).to.equal(currency.address);
            expect(payment2.at(4)).to.equal(timestamp);
            expect(payment2.governor).to.equal(governor.address);

            expect(await currency.balanceOf(issuer2.address)).to.equal(issuer2InitBalance.sub(value2));
            expect(await currency.balanceOf(paymentHub.address)).to.equal(paymentHubInitBalance.add(value2));
        });

        it('22.2.3. Issue payment unsuccessfully when paused', async () => {
            const fixture = await beforePaymentHubTest({
                registerCurrencies: true,
                authorizeGovernor: true,
                fundERC20ForIssuer: true,
                initGovernorTokens: true,
                pause: true,
            });
            const { paymentHub, issuer1, governor } = fixture;

            const tokenId = 1;
            const value = ethers.utils.parseEther('1000');
            
            await expect(paymentHub.connect(issuer1).issuePayment(
                governor.address,
                tokenId,
                value,
                ethers.constants.AddressZero,
            )).to.be.revertedWith('Pausable: paused');
        });

        it('22.2.4. Issue payment unsuccessfully with unauthorized governor', async () => {
            const fixture = await beforePaymentHubTest({
                registerCurrencies: true,
                fundERC20ForIssuer: true,
                initGovernorTokens: true,
            });
            const { paymentHub, issuer1, governor } = fixture;

            const tokenId = 1;
            const value = ethers.utils.parseEther('1000');
            
            await expect(paymentHub.connect(issuer1).issuePayment(
                governor.address,
                tokenId,
                value,
                ethers.constants.AddressZero,
            )).to.be.revertedWithCustomError(paymentHub, 'InvalidGovernor');
        });

        it('22.2.5. Issue payment unsuccessfully with invalid token id', async () => {
            const fixture = await beforePaymentHubTest({
                registerCurrencies: true,
                authorizeGovernor: true,
                fundERC20ForIssuer: true,
                initGovernorTokens: true,
            });
            const { paymentHub, issuer1, governor } = fixture;

            const tokenId = 0;
            const value = ethers.utils.parseEther('1000');
            
            await expect(paymentHub.connect(issuer1).issuePayment(
                governor.address,
                tokenId,
                value,
                ethers.constants.AddressZero,
            )).to.be.revertedWithCustomError(paymentHub, 'InvalidTokenId');
        });

        it('22.2.6. Issue payment unsuccessfully with unavailable currency', async () => {
            const fixture = await beforePaymentHubTest({
                authorizeGovernor: true,
                fundERC20ForIssuer: true,
                initGovernorTokens: true,
            });
            const { paymentHub, issuer1, governor, currencies } = fixture;

            const tokenId = 1;
            const value = ethers.utils.parseEther('1000');
            await expect(paymentHub.connect(issuer1).issuePayment(
                governor.address,
                tokenId,
                value,
                ethers.constants.AddressZero,
            )).to.be.revertedWithCustomError(paymentHub, 'InvalidCurrency');
        });

        it('22.2.7. Issue payment unsuccessfully with insufficient balance', async () => {
            const fixture = await beforePaymentHubTest({
                authorizeGovernor: true,
                fundERC20ForIssuer: true,
                initGovernorTokens: true,
            });
            const { paymentHub, issuer1, governor } = fixture;

            const tokenId = 1;
            const value = ethers.utils.parseEther('1000');
            await expect(paymentHub.connect(issuer1).issuePayment(
                governor.address,
                tokenId,
                value,
                ethers.constants.AddressZero,
            )).to.be.revertedWithCustomError(paymentHub, 'InvalidCurrency');
        });

        it('22.2.8. Issue payment unsuccessfully with invalid value', async () => {
            const fixture = await beforePaymentHubTest({
                registerCurrencies: true,
                authorizeGovernor: true,
                fundERC20ForIssuer: true,
                initGovernorTokens: true,
            });
            const { paymentHub, issuer1, governor } = fixture;

            const tokenId = 1;
            const value = 0;
            await expect(paymentHub.connect(issuer1).issuePayment(
                governor.address,
                tokenId,
                value,
                ethers.constants.AddressZero,
            )).to.be.revertedWithCustomError(paymentHub, 'InvalidInput');
        });

        it('22.2.9. Issue payment unsuccessfully with insufficient native token', async () => {
            const fixture = await beforePaymentHubTest({
                registerCurrencies: true,
                authorizeGovernor: true,
                fundERC20ForIssuer: true,
                initGovernorTokens: true,
            });
            const { paymentHub, issuer1, governor } = fixture;

            const tokenId = 1;
            const value = ethers.utils.parseEther('1000');
            
            await expect(paymentHub.connect(issuer1).issuePayment(
                governor.address,
                tokenId,
                value,
                ethers.constants.AddressZero,
            )).to.be.revertedWithCustomError(paymentHub, 'InsufficientValue');
        });

        it('22.2.10. Issue payment unsuccessfully with insufficient erc20 token', async () => {
            const fixture = await beforePaymentHubTest({
                registerCurrencies: true,
                authorizeGovernor: true,
                initGovernorTokens: true,
            });
            const { paymentHub, issuer1, governor, currencies } = fixture;

            const tokenId = 1;
            const value = ethers.utils.parseEther('1000');
            const currency = currencies[0];

            await expect(paymentHub.connect(issuer1).issuePayment(
                governor.address,
                tokenId,
                value,
                currency.address,
            )).to.be.revertedWith('ERC20: insufficient allowance');
        });

        it('22.2.11. Issue payment unsuccessfully when receiving native token failed', async () => {
            const fixture = await beforePaymentHubTest({
                registerCurrencies: true,
                authorizeGovernor: true,
                fundERC20ForIssuer: true,
                initGovernorTokens: true,
            });

            const { deployer, paymentHub, governor } = fixture;

            const failReceiver = await deployFailReceiver(deployer.address, false);
            await prepareNativeToken(ethers.provider, deployer, [failReceiver], ethers.utils.parseEther('10000'));
            await callTransaction(failReceiver.activate(true));

            const callData = paymentHub.interface.encodeFunctionData('issuePayment', [
                governor.address,
                1,
                ethers.utils.parseEther('100'),
                ethers.constants.AddressZero,
            ]);

            await expect(failReceiver.call(
                paymentHub.address,
                callData,
                { value: ethers.utils.parseEther('1000') },
            )).to.be.revertedWithCustomError(paymentHub, 'FailedRefund');
        });

        it('22.2.11. Issue payment unsuccessfully when this contract is reentered', async () => {
            const fixture = await beforePaymentHubTest({
                registerCurrencies: true,
                authorizeGovernor: true,
                fundERC20ForIssuer: true,
                initGovernorTokens: true,
                useReentrancyERC20: true,
            });
            const { paymentHub, issuer1, governor, reentrancyERC20 } = fixture;

            const callData = paymentHub.interface.encodeFunctionData('issuePayment', [
                governor.address,
                1,
                ethers.utils.parseEther('1000'),
                reentrancyERC20.address,
            ]);

            await callTransaction(reentrancyERC20.updateReentrancyPlan(paymentHub.address, callData));

            await expect(paymentHub.connect(issuer1).issuePayment(
                governor.address,
                2,
                ethers.utils.parseEther('1000'),
                reentrancyERC20.address,
            )).to.be.revertedWith('ReentrancyGuard: reentrant call');
        });
    });

    describe.only('22.3. withdraw(address, uint256)', async () => {
        it('22.3.1. Withdraw successfully', async () => {
            const fixture = await beforePaymentHubTest({
                registerCurrencies: true,
                authorizeGovernor: true,
                fundERC20ForIssuer: true,
                initGovernorTokens: true,
                issueSamplePayments: true,
            });
            const { paymentHub, governor, receiver1, receiver2, receiver3, currencies } = fixture;

            const tokenId1 = 1;
            const paymentId1 = 1;
            const totalValue1 = (await paymentHub.getPayment(paymentId1)).remainValue;
            const totalWeight1 = (await paymentHub.getPayment(paymentId1)).remainWeight;
            const receiver1Weight1 = await governor.balanceOf(receiver1.address, tokenId1);
            const receiver2Weight1 = await governor.balanceOf(receiver2.address, tokenId1);
            const receiver3Weight1 = await governor.balanceOf(receiver3.address, tokenId1);
            const receiver1Value1 = receiver1Weight1.mul(totalValue1).div(totalWeight1);
            const receiver2Value1 = receiver2Weight1.mul(totalValue1).div(totalWeight1);
            const receiver3Value1 = receiver3Weight1.mul(totalValue1).div(totalWeight1);

            // Tx1: Receiver 1 withdraw payment 1 (native token)
            let paymentHubInitBalance = await ethers.provider.getBalance(paymentHub.address);
            let receiver1InitBalance = await ethers.provider.getBalance(receiver1.address);

            const tx1 = await paymentHub.connect(receiver1).withdraw(paymentId1);
            const receipt1 = await tx1.wait();
            const gasFee1 = receipt1.gasUsed.mul(receipt1.effectiveGasPrice);

            await expect(tx1).to.emit(paymentHub, 'Withdrawal').withArgs(
                paymentId1,
                receiver1.address,
                receiver1Value1,
            );

            expect(await ethers.provider.getBalance(paymentHub.address)).to.equal(paymentHubInitBalance.sub(receiver1Value1));
            expect(await ethers.provider.getBalance(receiver1.address)).to.equal(receiver1InitBalance.add(receiver1Value1).sub(gasFee1));

            let payment = await paymentHub.getPayment(paymentId1);
            expect(payment.remainWeight).to.equal(totalWeight1.sub(receiver1Weight1));
            expect(payment.remainValue).to.equal(totalValue1.sub(receiver1Value1));

            // Tx2: Receiver 2 withdraw payment 1 (native token)
            paymentHubInitBalance = await ethers.provider.getBalance(paymentHub.address);
            let receiver2InitBalance = await ethers.provider.getBalance(receiver2.address);

            const tx2 = await paymentHub.connect(receiver2).withdraw(paymentId1);
            const receipt2 = await tx2.wait();
            const gasFee2 = receipt2.gasUsed.mul(receipt2.effectiveGasPrice);

            await expect(tx2).to.emit(paymentHub, 'Withdrawal').withArgs(
                paymentId1,
                receiver2.address,
                receiver2Value1,
            );

            expect(await ethers.provider.getBalance(paymentHub.address)).to.equal(paymentHubInitBalance.sub(receiver2Value1));
            expect(await ethers.provider.getBalance(receiver2.address)).to.equal(receiver2InitBalance.add(receiver2Value1).sub(gasFee2));

            payment = await paymentHub.getPayment(paymentId1);
            expect(payment.remainWeight).to.equal(totalWeight1.sub(receiver1Weight1).sub(receiver2Weight1));
            expect(payment.remainValue).to.equal(totalValue1.sub(receiver1Value1).sub(receiver2Value1));

            // Tx3: Receiver 3 withdraw payment 1 (native token)
            paymentHubInitBalance = await ethers.provider.getBalance(paymentHub.address);
            let receiver3InitBalance = await ethers.provider.getBalance(receiver3.address);

            const tx3 = await paymentHub.connect(receiver3).withdraw(paymentId1);
            const receipt3 = await tx3.wait();
            const gasFee3 = receipt3.gasUsed.mul(receipt3.effectiveGasPrice);

            await expect(tx3).to.emit(paymentHub, 'Withdrawal').withArgs(
                paymentId1,
                receiver3.address,
                receiver3Value1,
            );

            expect(await ethers.provider.getBalance(paymentHub.address)).to.equal(paymentHubInitBalance.sub(receiver3Value1));
            expect(await ethers.provider.getBalance(receiver3.address)).to.equal(receiver3InitBalance.add(receiver3Value1).sub(gasFee3));

            payment = await paymentHub.getPayment(paymentId1);
            expect(payment.remainWeight).to.equal(0);
            expect(payment.remainValue).to.equal(0);

            // Tx4: Receiver 1 withdraw payment 2 (native token)
            const tokenId2 = 1;
            const paymentId2 = 2;
            const totalValue2 = (await paymentHub.getPayment(paymentId2)).remainValue;
            const totalWeight2 = (await paymentHub.getPayment(paymentId2)).remainWeight;
            const receiver1Weight2 = await governor.balanceOf(receiver1.address, tokenId2);
            const receiver1Value2 = receiver1Weight2.mul(totalValue2).div(totalWeight2);

            paymentHubInitBalance = await ethers.provider.getBalance(paymentHub.address);
            receiver1InitBalance = await ethers.provider.getBalance(receiver1.address);

            const tx4 = await paymentHub.connect(receiver1).withdraw(paymentId2);
            const receipt4 = await tx4.wait();
            const gasFee4 = receipt4.gasUsed.mul(receipt4.effectiveGasPrice);

            await expect(tx4).to.emit(paymentHub, 'Withdrawal').withArgs(
                paymentId2,
                receiver1.address,
                receiver1Value2,
            );

            expect(await ethers.provider.getBalance(paymentHub.address)).to.equal(paymentHubInitBalance.sub(receiver1Value2));
            expect(await ethers.provider.getBalance(receiver1.address)).to.equal(receiver1InitBalance.add(receiver1Value2).sub(gasFee4));

            payment = await paymentHub.getPayment(paymentId2);
            expect(payment.remainWeight).to.equal(totalWeight2.sub(receiver1Weight2));
            expect(payment.remainValue).to.equal(totalValue2.sub(receiver1Value2));

            // Tx5: Receiver 2 withdraw payment 3 (erc20 token)
            const currency = currencies[0];
            const tokenId3 = 2;
            const paymentId3 = 3;
            const totalValue3 = (await paymentHub.getPayment(paymentId3)).remainValue;
            const totalWeight3 = (await paymentHub.getPayment(paymentId3)).remainWeight;
            const receiver2Weight3 = await governor.balanceOf(receiver2.address, tokenId3);
            const receiver2Value3 = receiver2Weight3.mul(totalValue3).div(totalWeight3);

            paymentHubInitBalance = await currency.balanceOf(paymentHub.address);
            receiver2InitBalance = await currency.balanceOf(receiver2.address);

            const tx5 = await paymentHub.connect(receiver2).withdraw(paymentId3);
            await tx5.wait();

            await expect(tx5).to.emit(paymentHub, 'Withdrawal').withArgs(
                paymentId3,
                receiver2.address,
                receiver2Value3,
            );

            expect(await currency.balanceOf(paymentHub.address)).to.equal(paymentHubInitBalance.sub(receiver2Value3));
            expect(await currency.balanceOf(receiver2.address)).to.equal(receiver2InitBalance.add(receiver2Value3));

            payment = await paymentHub.getPayment(paymentId3);
            expect(payment.remainWeight).to.equal(totalWeight3.sub(receiver2Weight3));
            expect(payment.remainValue).to.equal(totalValue3.sub(receiver2Value3));
        });

        it('22.3.3. Withdraw unsuccessfully when paused', async () => {
            const fixture = await beforePaymentHubTest({
                registerCurrencies: true,
                authorizeGovernor: true,
                fundERC20ForIssuer: true,
                initGovernorTokens: true,
                issueSamplePayments: true,
                pause: true,
            });
            const { paymentHub, receiver1 } = fixture;

            await expect(paymentHub.connect(receiver1).withdraw(1))
                .to.be.revertedWith('Pausable: paused');
        });

        it('22.3.4. Withdraw unsuccessfully with invalid payment id', async () => {
            const fixture = await beforePaymentHubTest({
                registerCurrencies: true,
                authorizeGovernor: true,
                fundERC20ForIssuer: true,
                initGovernorTokens: true,
                issueSamplePayments: true,
            });
            const { paymentHub, receiver1 } = fixture;

            await expect(paymentHub.connect(receiver1).withdraw(0))
                .to.be.revertedWithCustomError(paymentHub, 'InvalidPaymentId');
            await expect(paymentHub.connect(receiver1).withdraw(4))
                .to.be.revertedWithCustomError(paymentHub, 'InvalidPaymentId');
        });

        it('22.3.5. Withdraw unsuccessfully with already withdrawn user', async () => {
            const fixture = await beforePaymentHubTest({
                registerCurrencies: true,
                authorizeGovernor: true,
                fundERC20ForIssuer: true,
                initGovernorTokens: true,
                issueSamplePayments: true,
            });
            const { paymentHub, receiver1 } = fixture;

            await callTransaction(paymentHub.connect(receiver1).withdraw(1));

            await expect(paymentHub.connect(receiver1).withdraw(1))
                .to.be.revertedWithCustomError(paymentHub, 'AlreadyWithdrawn');
        });

        it('22.3.6. Withdraw unsuccessfully with zero weight', async () => {
            const fixture = await beforePaymentHubTest({
                registerCurrencies: true,
                authorizeGovernor: true,
                fundERC20ForIssuer: true,
                initGovernorTokens: true,
                issueSamplePayments: true,
            });
            const { paymentHub, receiver3 } = fixture;

            await callTransaction(paymentHub.connect(receiver3).withdraw(3));

            await expect(paymentHub.connect(receiver3).withdraw(3))
                .to.be.revertedWithCustomError(paymentHub, 'InvalidWithdrawing');
        });

        it('22.3.7. Withdraw unsuccessfully with insufficient remaining funds', async () => {
            const fixture = await beforePaymentHubTest({
                registerCurrencies: true,
                authorizeGovernor: true,
                fundERC20ForIssuer: true,
                initGovernorTokens: true,
            });

            const { governor, issuer1, paymentHub, receiver1 } = fixture;

            governor.totalVoteAt.whenCalledWith(1).returns(ethers.utils.parseEther('1'));
            governor.totalVoteAt.whenCalledWith(2).returns(ethers.utils.parseEther('1'));

            await callTransaction(paymentHub.connect(issuer1).issuePayment(
                governor.address,
                1,
                ethers.utils.parseEther('1000'),
                ethers.constants.AddressZero,
            ));

            await expect(paymentHub.connect(receiver1).withdraw(1))
                .to.be.revertedWithCustomError(paymentHub, 'InsufficientFunds');
        });

        it('22.3.8. Withdraw unsuccessfully when receiving native token failed', async () => {
            const fixture = await beforePaymentHubTest({
                registerCurrencies: true,
                authorizeGovernor: true,
                fundERC20ForIssuer: true,
                initGovernorTokens: true,
                useFailReceiver: true,
                issueSamplePayments: true,
            });

            const { governor, issuer1, paymentHub, failReceiver } = fixture;

            await callTransaction(paymentHub.connect(issuer1).issuePayment(
                governor.address,
                1,
                ethers.utils.parseEther('1000'),
                ethers.constants.AddressZero,
            ));

            await expect(failReceiver.call(
                paymentHub.address,
                paymentHub.interface.encodeFunctionData('withdraw', [1]),
            )).to.be.revertedWithCustomError(paymentHub, 'FailedTransfer');
        });

        it('22.3.9. Withdraw unsuccessfully when this contract is reentered', async () => {
            const fixture = await beforePaymentHubTest({
                registerCurrencies: true,
                authorizeGovernor: true,
                fundERC20ForIssuer: true,
                initGovernorTokens: true,
                useReentrancyERC20: true,
            });
            const { paymentHub, issuer1, governor, reentrancyERC20, receiver1 } = fixture;

            await callTransaction(paymentHub.connect(issuer1).issuePayment(
                governor.address,
                2,
                ethers.utils.parseEther('1000'),
                reentrancyERC20.address,
            ));

            const callData = paymentHub.interface.encodeFunctionData('withdraw', [1]);

            await callTransaction(reentrancyERC20.updateReentrancyPlan(paymentHub.address, callData));

            await expect(paymentHub.connect(receiver1).withdraw(1))
                .to.be.revertedWith('ReentrancyGuard: reentrant call');
        });
    });

    describe.only('22.4. getPayment(uint256)', async () => {
        it('22.4.1. return correct payment', async () => {
            const fixture = await beforePaymentHubTest({
                registerCurrencies: true,
                authorizeGovernor: true,
                fundERC20ForIssuer: true,
                initGovernorTokens: true,
            });

            const { paymentHub, issuer1, governor } = fixture;

            const tokenId1 = 1;
            const value1 = ethers.utils.parseEther('1000');
            const totalVote = await governor.totalSupply(tokenId1);

            let timestamp = await time.latest() + 10;
            await time.setNextBlockTimestamp(timestamp);
            await callTransaction(paymentHub.connect(issuer1).issuePayment(
                governor.address,
                tokenId1,
                value1,
                ethers.constants.AddressZero,
                { value: value1.add(ethers.utils.parseEther('1')) },
            ));
 
            const payment = await paymentHub.getPayment(tokenId1);
            expect(payment.tokenId).to.equal(tokenId1);
            expect(payment.remainWeight).to.equal(totalVote);
            expect(payment.remainValue).to.equal(value1);
            expect(payment.currency).to.equal(ethers.constants.AddressZero);
            expect(payment.at(4)).to.equal(timestamp);
            expect(payment.governor).to.equal(governor.address);
        });

        it('22.4.2. revert with invalid payment id', async () => {
            const fixture = await beforePaymentHubTest({
                registerCurrencies: true,
                authorizeGovernor: true,
                fundERC20ForIssuer: true,
                initGovernorTokens: true,
                issueSamplePayments: true,
            });
            const { paymentHub, receiver1 } = fixture;

            await expect(paymentHub.connect(receiver1).getPayment(0))
                .to.be.revertedWithoutReason();
            await expect(paymentHub.connect(receiver1).getPayment(4))
                .to.be.revertedWithoutReason();
        });
    });
});
