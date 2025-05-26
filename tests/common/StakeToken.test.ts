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

interface StakeTokenFixture {
    deployer: any;
    admins: any[];
    admin: Admin;
    currency: Currency;
    primaryToken: PrimaryToken;
    stakeToken1: StakeToken;
    stakeToken2: StakeToken;
    stakeToken3: StakeToken;
}

describe('10. StakeToken', async () => {
    async function stakeTokenFixture(): Promise<StakeTokenFixture> {
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
        
        const stakeToken1 = await deployStakeToken(
            deployer,
            admin.address,
            primaryToken.address,
            Constant.STAKE_TOKEN_INITIAL_Name_1,
            Constant.STAKE_TOKEN_INITIAL_Symbol_1,
        ) as StakeToken;

        const stakeToken2 = await deployStakeToken(
            deployer,
            admin.address,
            primaryToken.address,
            Constant.STAKE_TOKEN_INITIAL_Name_2,
            Constant.STAKE_TOKEN_INITIAL_Symbol_2,
        ) as StakeToken;

        const stakeToken3 = await deployStakeToken(
            deployer,
            admin.address,
            primaryToken.address,
            Constant.STAKE_TOKEN_INITIAL_Name_3,
            Constant.STAKE_TOKEN_INITIAL_Symbol_3,
        ) as StakeToken;
        
        return {
            deployer,
            admins,
            admin,
            currency,
            primaryToken,
            stakeToken1,
            stakeToken2,
            stakeToken3,
        };
    };

    async function setupBeforeTest(): Promise<StakeTokenFixture> {
        return await loadFixture(stakeTokenFixture);
    }

    describe('10.1. initialize(address, address, address)', async () => {
        it('10.1.1. Deploy successfully', async () => {

        });
    });

    // TODO: Andy
    describe('10.2. pause(bytes[])', async () => {

    });

    // TODO: Andy
    describe('10.3. unpause(bytes[])', async () => {

    });

    // TODO: Andy
    describe('10.4. initializeRewarding(uint256, address, bytes[])', async () => {

    });

    // TODO: Andy
    describe('10.5. updateFeeRate(uint256, bytes[])', async () => {

    });
});
