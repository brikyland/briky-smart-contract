import { expect } from 'chai';
import { ethers } from 'hardhat';
import { Admin, Currency, PrimaryToken, Treasury } from '@typechain-types';
import { callTransaction, getSignatures, randomWallet } from '@utils/blockchain';
import { deployAdmin } from '@utils/deployments/common/admin';
import { Constant } from '@tests/test.constant';
import { loadFixture } from '@nomicfoundation/hardhat-network-helpers';
import { deployCurrency } from '@utils/deployments/common/currency';
import { deployPrimaryToken } from '@utils/deployments/land/primaryToken';
import { deployTreasury } from '@utils/deployments/land/treasury';

interface TreasuryFixture {
    deployer: any;
    admins: any[];
    admin: Admin;
    treasury: Treasury;
    currency: Currency;
    primaryToken: PrimaryToken;
}

describe('8. Treasury', async () => {
    async function treasuryFixture(): Promise<TreasuryFixture> {
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
        
        const currency = await deployCurrency(
            deployer.address,
            'MockCurrency',
            'MCK'
        ) as Currency;
        
        const primaryToken = await deployPrimaryToken(
            deployer,
            admin.address,
            Constant.PRIMARY_TOKEN_INITIAL_Name,
            Constant.PRIMARY_TOKEN_INITIAL_Symbol,
            Constant.PRIMARY_TOKEN_INITIAL_LiquidationUnlockedAt,
        ) as PrimaryToken;
        
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
        };
    };

    async function setupBeforeTest(): Promise<TreasuryFixture> {
        return await loadFixture(treasuryFixture);
    }

    describe('8.1. initialize(address, address, address)', async () => {
        it('8.1.1. Deploy successfully', async () => {

        });
    });

    // TODO: Andy
    describe('9.2. pause(bytes[])', async () => {
        it('9.2.1. pause successfully with valid signatures', async () => {

        });

        it('9.2.2. pause unsuccessfully with invalid signatures', async () => {

        });

        it('9.2.3. pause unsuccessfully when already paused', async () => {

        });
    });

    // TODO: Andy
    describe('9.3. unpause(bytes[])', async () => {
        it('9.3.1. unpause successfully with valid signatures', async () => {

        });

        it('9.3.2. unpause unsuccessfully with invalid signatures', async () => {

        });

        it('9.3.3. unpause unsuccessfully when not paused', async () => {

        });
    });
    
    describe('8.4. withdrawOperationFund(uint256, address, bytes[])', async () => {
        it('8.4.1. withdrawOperationFund successfully with valid signatures', async () => {

        });

        it('8.4.2. withdrawOperationFund unsuccessfully with invalid signatures', async () => {

        });

        it('8.4.3. withdrawOperationFund unsuccessfully with insufficient funds', async () => {

        });

        it('8.4.4. withdrawOperationFund unsuccessfully when the contract is reentered', async () => {

        });
    });

    describe('8.5. withdrawLiquidity(uint256)', async () => {
        it('8.5.1. withdrawLiquidity successfully', async () => {

        });

        it('8.5.2. withdrawLiquidity unsuccessfully when paused', async () => {

        });

        it('8.5.3. withdrawLiquidity unsuccessfully by unauthorized user', async () => {

        });

        it('8.5.4. withdrawLiquidity unsuccessfully with insufficient funds', async () => {

        });

        it('8.5.5. withdrawLiquidity unsuccessfully when the contract is reentered', async () => {

        });
    });

    describe('8.6. provideLiquidity(uint256)', async () => {
        it('8.6.1. provideLiquidity successfully', async () => {

        });

        it('8.6.2. provideLiquidity unsuccessfully when paused', async () => {

        });

        it('8.6.3. provideLiquidity unsuccessfully when the contract is reentered', async () => {

        });
    });
});
