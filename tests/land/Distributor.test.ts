import { expect } from 'chai';
import { ethers } from 'hardhat';
import { Admin, Currency, PrimaryToken, StakeToken, Treasury } from '@typechain-types';
import { callTransaction, getSignatures, randomWallet } from '@utils/blockchain';
import { deployAdmin } from '@utils/deployments/common/admin';
import { Constant } from '@tests/test.constant';
import { loadFixture } from '@nomicfoundation/hardhat-network-helpers';
import { deployCurrency } from '@utils/deployments/common/currency';
import { deployPrimaryToken } from '@utils/deployments/land/primaryToken';
import { deployTreasury } from '@utils/deployments/land/treasury';
import { deployStakeToken } from '@utils/deployments/land/stakeToken';
import { Initialization as LandInitialization } from '@tests/land/test.initialization';

interface DistributorFixture {
    deployer: any;
    admins: any[];
    admin: Admin;
    treasury: Treasury;
    currency: Currency;
    primaryToken: PrimaryToken;
}

describe('11. Distributor', async () => {
    async function distributorFixture(): Promise<DistributorFixture> {
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
            LandInitialization.PRIMARY_TOKEN_Name,
            LandInitialization.PRIMARY_TOKEN_Symbol,
            LandInitialization.PRIMARY_TOKEN_LiquidationUnlockedAt,
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

    async function setupBeforeTest(): Promise<DistributorFixture> {
        return await loadFixture(distributorFixture);
    }

    describe('11.1. initialize(address, address, address)', async () => {
        it('11.1.1. Deploy successfully', async () => {

        });
    });

    describe('11.2. distributeToken(address[], uint256[], string, bytes[])', async () => {

    });
});
