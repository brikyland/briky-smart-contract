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

interface PrimaryTokenFixture {
    deployer: any;
    admins: any[];
    admin: Admin;
    treasury: Treasury;
    currency: Currency;
    stakeToken1: StakeToken;
    stakeToken2: StakeToken;
    stakeToken3: StakeToken;
    primaryToken: PrimaryToken;
}

describe('9. PrimaryToken', async () => {
    async function primaryTokenFixture(): Promise<PrimaryTokenFixture> {
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
            treasury,
            currency,
            primaryToken,
            stakeToken1,
            stakeToken2,
            stakeToken3,
        };
    };

    async function setupBeforeTest(): Promise<PrimaryTokenFixture> {
        return await loadFixture(primaryTokenFixture);
    }

    describe('9.1. initialize(address, address, address)', async () => {
        it('9.1.1. Deploy successfully', async () => {

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

    // TODO: Andy
    describe('9.4. updateTreasury(address)', async () => {
        it('9.4.1. updateTreasury successfully', async () => {

        });

        it('9.4.2. updateTreasury unsuccessfully with invalid signatures', async () => {

        });

        it('9.4.3. updateTreasury unsuccessfully when already updated', async () => {

        });
    });

    describe('9.5. updateStakeToken1(address)', async () => {
        it('9.5.1. updateStakeToken1 successfully', async () => {

        });

        it('9.5.2. updateStakeToken1 unsuccessfully with invalid signatures', async () => {

        });

        it('9.5.3. updateStakeToken1 unsuccessfully when already updated', async () => {

        });
    });

    // TODO: Andy
    describe('9.6. updateStakeToken2(address)', async () => {
        it('9.6.1. updateStakeToken2 successfully', async () => {

        });

        it('9.6.2. updateStakeToken2 unsuccessfully with invalid signatures', async () => {

        });

        it('9.6.3. updateStakeToken2 unsuccessfully when already updated', async () => {

        });
    });

    // TODO: Andy
    describe('9.7. updateStakeToken3(address)', async () => {
        it('9.7.1. updateStakeToken3 successfully', async () => {

        });

        it('9.7.2. updateStakeToken3 unsuccessfully with invalid signatures', async () => {

        });

        it('9.7.3. updateStakeToken3 unsuccessfully when already updated', async () => {

        });
    });

    describe('9.8. totalStake(address)', async () => {
        it('9.8.1. return correct total stake', async () => {

        });
    });

    describe('9.9. isStakeRewardingCompleted(address)', async () => {
        it('9.9.1. return corrent value when sender is stake token 1', async () => {

        });

        it('9.9.2. return corrent value when sender is stake token 2', async () => {

        });

        it('9.9.3. return corrent value when sender is stake token 3', async () => {

        });

        it('9.9.4. revert when sender is unauthorized', async () => {

        });
    });

    describe('9.10. unlockForBackerRound(address, bytes[])', async () => {
        it('9.10.1. unlockForBackerRound successfully', async () => {

        });

        it('9.10.2. unlockForBackerRound unsuccessfully with invalid signatures', async () => {

        });

        it('9.10.3. unlockForBackerRound unsuccessfully when already unlocked', async () => {

        });

        it('9.10.4. unlockForBackerRound unsuccessfully when the contract is reentered', async () => {

        });
    });

    describe('9.11. unlockForSeedRound(address, bytes[])', async () => {
        it('9.11.1. unlockForSeedRound successfully', async () => {

        });

        it('9.11.2. unlockForSeedRound unsuccessfully with invalid signatures', async () => {

        });

        it('9.11.3. unlockForSeedRound unsuccessfully when already unlocked', async () => {

        });

        it('9.11.4. unlockForSeedRound unsuccessfully when the contract is reentered', async () => {

        });
    });

    describe('9.12. unlockForPrivateSale1(address, bytes[])', async () => {
        it('9.12.1. unlockForPrivateSale1 successfully', async () => {

        });

        it('9.12.2. unlockForPrivateSale1 unsuccessfully with invalid signatures', async () => {

        });

        it('9.12.3. unlockForPrivateSale1 unsuccessfully when already unlocked', async () => {

        });

        it('9.12.4. unlockForPrivateSale1 unsuccessfully when the contract is reentered', async () => {

        });
    });

    describe('9.13. unlockForPrivateSale2(address, bytes[])', async () => {
        it('9.13.1. unlockForPrivateSale2 successfully', async () => {

        });

        it('9.13.2. unlockForPrivateSale2 unsuccessfully with invalid signatures', async () => {

        });

        it('9.13.3. unlockForPrivateSale2 unsuccessfully when already unlocked', async () => {

        });

        it('9.13.4. unlockForPrivateSale2 unsuccessfully when the contract is reentered', async () => {

        });
    });

    describe('9.14. unlockForPublicSale(address, bytes[])', async () => {
        it('9.14.1. unlockForPublicSale successfully', async () => {

        });

        it('9.14.2. unlockForPublicSale unsuccessfully with invalid signatures', async () => {

        });

        it('9.14.3. unlockForPublicSale unsuccessfully when already unlocked', async () => {

        });

        it('9.14.4. unlockForPublicSale unsuccessfully when the contract is reentered', async () => {

        });
    });

    describe('9.15. unlockForCoreTeam(address, bytes[])', async () => {
        it('9.15.1. unlockForCoreTeam successfully', async () => {

        });

        it('9.15.2. unlockForCoreTeam unsuccessfully with invalid signatures', async () => {

        });

        it('9.15.3. unlockForCoreTeam unsuccessfully when already unlocked', async () => {

        });

        it('9.16.4. unlockForMarketMaker unsuccessfully when the contract is reentered', async () => {

        });
    });

    describe('9.16. unlockForMarketMaker(address, bytes[])', async () => {
        it('9.16.1. unlockForMarketMaker successfully', async () => {

        });

        it('9.16.2. unlockForMarketMaker unsuccessfully with invalid signatures', async () => {

        });

        it('9.16.3. unlockForMarketMaker unsuccessfully when already unlocked', async () => {

        });
    });

    describe('9.17. unlockForExternalTreasury(address, bytes[])', async () => {
        it('9.17.1. unlockForExternalTreasury successfully', async () => {

        });

        it('9.17.2. unlockForExternalTreasury unsuccessfully with invalid signatures', async () => {

        });

        it('9.17.3. unlockForExternalTreasury unsuccessfully when already unlocked', async () => {

        });

        it('9.17.4. unlockForExternalTreasury unsuccessfully when the contract is reentered', async () => {

        });
    });

    describe('9.18. contributeLiquidityFromBackerRound(uint256)', async () => {
        it('9.18.1. contributeLiquidityFromBackerRound successfully', async () => {

        });

        it('9.18.2. contributeLiquidityFromBackerRound unsuccessfully when the contract is reentered', async () => {

        });
    });

    describe('9.19. contributeLiquidityFromSeedRound(uint256)', async () => {
        it('9.19.1. contributeLiquidityFromSeedRound successfully', async () => {

        });

        it('9.19.2. contributeLiquidityFromSeedRound unsuccessfully when the contract is reentered', async () => {

        });        
    });

    describe('9.20. contributeLiquidityFromPrivateSale1(uint256)', async () => {
        it('9.20.1. contributeLiquidityFromPrivateSale1 successfully', async () => {

        });

        it('9.20.2. contributeLiquidityFromPrivateSale1 unsuccessfully when the contract is reentered', async () => {

        });
    });

    describe('9.21. contributeLiquidityFromPrivateSale2(uint256)', async () => {
        it('9.21.1. contributeLiquidityFromPrivateSale2 successfully', async () => {

        });

        it('9.21.2. contributeLiquidityFromPrivateSale2 unsuccessfully when the contract is reentered', async () => {

        });
    });

    describe('9.22. contributeLiquidityFromPublicSale(uint256)', async () => {
        it('9.22.1. contributeLiquidityFromPublicSale successfully', async () => {

        });

        it('9.22.2. contributeLiquidityFromPublicSale unsuccessfully when the contract is reentered', async () => {

        });
    });

    describe('9.23. contributeLiquidityFromMarketMaker(uint256)', async () => {
        it('9.23.1. contributeLiquidityFromMarketMaker successfully', async () => {

        });

        it('9.23.2. contributeLiquidityFromMarketMaker unsuccessfully when the contract is reentered', async () => {

        });
    });

    describe('9.24. contributeLiquidityFromExternalTreasury(uint256)', async () => {
        it('9.24.1. contributeLiquidityFromExternalTreasury successfully', async () => {

        });

        it('9.24.2. contributeLiquidityFromExternalTreasury unsuccessfully when the contract is reentered', async () => {

        });
    });

    describe('9.25. contributeLiquidityFromStakeToken(uint256, address)', async () => {
        it('9.25.1. contributeLiquidityFromStakeToken successfully from stake token 1', async () => {

        });

        it('9.25.2. contributeLiquidityFromStakeToken successfully from stake token 2', async () => {

        });

        it('9.25.3. contributeLiquidityFromStakeToken successfully from stake token 3', async () => {

        });

        it('9.25.2. contributeLiquidityFromStakeToken unsuccessfully when the contract is reentered', async () => {

        });
    });

    describe('9.26. mintForStake()', async () => {
        it('9.26.1. mintForStake successfully by stake token 1', async () => {

        });

        it('9.26.2. mintForStake unsuccessfully by stake token 1 when all stake reward is minted', async () => {

        });

        it('9.26.3. mintForStake successfully by stake token 2', async () => {

        });

        it('9.26.4. mintForStake unsuccessfully by stake token 2 when all stake reward is minted', async () => {

        });

        it('9.26.5. mintForStake successfully by stake token 3', async () => {

        });

        it('9.26.6. mintForStake unsuccessfully by stake token 3 when all stake reward is minted', async () => {

        });
        
        it('9.26.7. mintForStake unsuccessfully by unauthorized user', async () => {

        });
    });

    describe('9.27. liquidate(uint256)', async () => {
        it('9.27.1. liquidate successfully', async () => {

        });

        it('9.27.2. liquidate unsuccessfully when liquidation is not unlocked', async () => {

        });

        it('9.27.3. liquidate unsuccessfully when the contract is paused', async () => {

        });

        it('9.27.4. liquidate unsuccessfully when the contract is reentered', async () => {

        });

        it('9.27.5. liquidate unsuccessfully when the amount is greater than the balance', async () => {

        });
    });

    describe('9.28. exclusiveDiscount()', async () => {
        it('9.28.1. return correct value', async () => {

        });
    });
});
