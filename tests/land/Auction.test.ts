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

interface AuctionFixture {
    deployer: any;
    admins: any[];
    admin: Admin;
    treasury: Treasury;
    currency: Currency;
    primaryToken: PrimaryToken;
    stakeToken1: StakeToken;
    stakeToken2: StakeToken;
    stakeToken3: StakeToken;
}

describe('13. Auction', async () => {
    async function auctionFixture(): Promise<AuctionFixture> {
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

        const stakeToken1 = await deployStakeToken(
            deployer,
            admin.address,
            primaryToken.address,
            LandInitialization.STAKE_TOKEN_Name_1,
            LandInitialization.STAKE_TOKEN_Symbol_1,
        ) as StakeToken;

        const stakeToken2 = await deployStakeToken(
            deployer,
            admin.address,
            primaryToken.address,
            LandInitialization.STAKE_TOKEN_Name_2,
            LandInitialization.STAKE_TOKEN_Symbol_2,
        ) as StakeToken;

        const stakeToken3 = await deployStakeToken(
            deployer,
            admin.address,
            primaryToken.address,
            LandInitialization.STAKE_TOKEN_Name_3,
            LandInitialization.STAKE_TOKEN_Symbol_3,
        ) as StakeToken;
        
        return {
            deployer,
            admins,
            admin,
            treasury,
            currency,
            primaryToken,
            stakeToken1,
            stakeToken2,
            stakeToken3,
        };
    };

    async function setupBeforeTest(): Promise<AuctionFixture> {
        return await loadFixture(auctionFixture);
    }

    describe('13.1. initialize(address, address, address, address, address)', async () => {
        it('13.1.1. Deploy successfully', async () => {

        });
    });

    // TODO: Andy
    describe('13.2. pause(bytes[])', async () => {

    });

    // TODO: Andy
    describe('13.3. unpause(bytes[])', async () => {

    });
});
