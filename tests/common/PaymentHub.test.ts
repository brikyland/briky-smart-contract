import { ethers } from 'hardhat';
import {
    Admin,
    Currency,
    PaymentHub,
} from '@typechain-types';
import { Constant } from '@tests/test.constant';
import { deployAdmin } from '@utils/deployments/common/admin';
import { deployCurrency } from '@utils/deployments/common/currency';
import { deployReentrancyERC20 } from '@utils/deployments/mocks/mockReentrancy/reentrancyERC20';
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { deployPaymentHub } from '@utils/deployments/common/paymentHub';
import { callPaymentHub_Pause } from '@utils/callWithSignatures/paymentHub';

interface PaymentHubFixture {
    admin: Admin;
    paymentHub: PaymentHub;
    currencies: Currency[];
    reentrancyERC20: any;

    deployer: any;
    admins: any[];
    funder1: any;
    funder2: any;
    withdrawer1: any;
    withdrawer2: any;
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
        
        const adminAddresses: string[] = admins.map(signer => signer.address);
        const admin = await deployAdmin(
            deployer.address,
            adminAddresses[0],
            adminAddresses[1],
            adminAddresses[2],
            adminAddresses[3],
            adminAddresses[4],
        ) as Admin;

        const currency1 = await deployCurrency(deployer.address, 'MockCurrency1', 'MCK1') as Currency;
        const currency2 = await deployCurrency(deployer.address, 'MockCurrency2', 'MCK2') as Currency;
        const currency3 = await deployCurrency(deployer.address, 'MockCurrency3', 'MCK3') as Currency;
        const currency4 = await deployCurrency(deployer.address, 'MockCurrency4', 'MCK4') as Currency;
        const currencies = [currency1, currency2, currency3, currency4];

        const reentrancyERC20 = await deployReentrancyERC20(deployer); 

        const paymentHub = await deployPaymentHub(deployer.address) as PaymentHub;

        return {
            admin,
            paymentHub,
            currencies,
            deployer,
            admins,
            funder1,
            funder2,
            withdrawer1,
            withdrawer2,
            reentrancyERC20,
        };
    };

    async function beforePaymentHubTest({
        pause = false,
    } = {}): Promise<PaymentHubFixture> {
        const fixture = await loadFixture(paymentHubFixture);
        const { deployer, admin, admins, paymentHub, currencies, reentrancyERC20 } = fixture;

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

        });
    });

    describe('22.2. issuePayment(address, uint256, uint256, address)', async () => {
        it('22.2.1. Issue payment successfully with native token', async () => {

        });

        it('22.2.2. Issue payment successfully with ERC20 token', async () => {

        });

        it('22.2.3. Issue payment unsuccessfully when paused', async () => {

        });

        it('22.2.4. Issue payment unsuccessfully with invalid governor', async () => {

        });

        it('22.2.5. Issue payment unsuccessfully with invalid token id', async () => {

        });

        it('22.2.6. Issue payment unsuccessfully with unavailable currency', async () => {

        });

        it('22.2.7. Issue payment unsuccessfully with insufficient balance', async () => {

        });

        it('22.2.8. Issue payment unsuccessfully with invalid value', async () => {

        });

        it('22.2.9. Issue payment unsuccessfully with insufficient native token', async () => {

        });

        it('22.2.10. Issue payment unsuccessfully with insufficient erc20 token', async () => {

        });

        it('22.2.11. Issue payment unsuccessfully when this contract is reentered', async () => {

        });
    });

    describe('22.3. withdraw(address, uint256)', async () => {
        it('22.3.1. Withdraw successfully with native token', async () => {

        });

        it('22.3.2. Withdraw successfully with ERC20 token', async () => {

        });

        it('22.3.3. Withdraw unsuccessfully when paused', async () => {

        });

        it('22.3.4. Withdraw unsuccessfully with invalid payment id', async () => {

        });

        it('22.3.5. Withdraw unsuccessfully with already withdrawn user', async () => {

        });

        it('22.3.6. Withdraw unsuccessfully with zero weight', async () => {

        });

        it('22.3.7. Withdraw unsuccessfully with insufficient remaining funds', async () => {

        });

        it('22.3.8. Withdraw unsuccessfully when receiving native token failed', async () => {

        });

        it('22.3.9. Withdraw unsuccessfully when this contract is reentered', async () => {

        });
    });

    describe('22.4. getPayment(uint256)', async () => {
        it('22.4.1. return correct payment', async () => {

        });

        it('22.4.2. revert with invalid payment id', async () => {

        });
    });
});
