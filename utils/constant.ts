import { ethers } from 'hardhat';

const DAY_LENGTH = 24 * 60 * 60;

export const Constant = {
    // Common
    COMMON_PERCENTAGE_DENOMINATOR: 100_00,

    // Admin
    ADMIN_NUMBER: 5,
    ADMIN_VERIFICATION_QUORUM: 4,

    // Commission Token
    COMMISSION_TOKEN_INITIAL_Name: 'Briky Commission',
    COMMISSION_TOKEN_INITIAL_Symbol: 'COMIKY',
    COMMISSION_TOKEN_INITIAL_BaseURI: '',
    COMMISSION_TOKEN_INITIAL_RoyaltyRate: 6_00,

    // Estate Forger
    ESTATE_FORGER_INITIAL_FeeRate: 10,
    ESTATE_FORGER_INITIAL_ExclusiveRate: 80_00,
    ESTATE_FORGER_INITIAL_CommissionRate: 30_00,

    // Estate Marketplace
    ESTATE_MARKETPLACE_INITIAL_ExclusiveRate: 80_00,
    ESTATE_MARKETPLACE_INITIAL_CommissionRate: 30_00,

    // Estate Token
    ESTATE_TOKEN_DECIMALS_LIMIT: 18,
    ESTATE_TOKEN_OWNERSHIP_TRANSFERRING_TIME_LIMIT: 30 * DAY_LENGTH,

    ESTATE_TOKEN_INITIAL_BaseURI: '',
    ESTATE_TOKEN_INITIAL_RoyaltyRate: 3,

    // Primary Token
    PRIMARY_TOKEN_DECIMALS: 18,

    PRIMARY_TOKEN_MAXIMUM_SUPPLY: ethers.utils.parseEther(String(20_000_000_000)),

    PRIMARY_TOKEN_BACKER_ROUND: ethers.utils.parseEther(String(100_000_000)),
    PRIMARY_TOKEN_CORE_TEAM: ethers.utils.parseEther(String(1_000_000_000)),
    PRIMARY_TOKEN_EXTERNAL_TREASURY: ethers.utils.parseEther(String(1_000_000_000)),
    PRIMARY_TOKEN_MARKET_MAKER: ethers.utils.parseEther(String(2_270_000_000)),
    PRIMARY_TOKEN_PRIVATE_SALE_1: ethers.utils.parseEther(String(30_000_000)),
    PRIMARY_TOKEN_PRIVATE_SALE_2: ethers.utils.parseEther(String(50_000_000)),
    PRIMARY_TOKEN_PUBLIC_SALE: ethers.utils.parseEther(String(500_000_000)),
    PRIMARY_TOKEN_SEED_ROUND: ethers.utils.parseEther(String(50_000_000)),

    PRIMARY_TOKEN_DAILY_STAKE_REWARD_LIMIT: ethers.utils.parseEther(String(7_000_000)),

    PRIMARY_TOKEN_INITIAL_Name: "Briky Currency",
    PRIMARY_TOKEN_INITIAL_Symbol: 'BRIK',
    PRIMARY_TOKEN_INITIAL_LiquidationUnlockedAt: Date.parse('2026-01-01T00:00:00') / 1000,

    // Stake Token
    STAKE_TOKEN_DAY_LENGTH: DAY_LENGTH - 600,
    STAKE_TOKEN_UNSTAKING_FEE_INITIAL_PERCENTAGE: 50_00,
    STAKE_TOKEN_UNSTAKING_FEE_ZEROING_DAYS: 1095,

    STAKE_TOKEN_INITIAL_Name: 'Briky Stake',
    STAKE_TOKEN_INITIAL_Symbol: 'BRISTAKE',

    // Treasury
    TREASURY_OPERATION_FUND_PERCENTAGE: 0.2,

    // Mortgage Token
    MORTGAGE_TOKEN_INITIAL_Name: 'Briky Mortgage',
    MORTGAGE_TOKEN_INITIAL_Symbol: 'MORTY',
    MORTGAGE_TOKEN_INITIAL_BaseURI: '',
    MORTGAGE_TOKEN_INITIAL_RoyaltyRate: 3,
    MORTGAGE_TOKEN_INITIAL_FeeRate: 2_00,
    MORTGAGE_TOKEN_INITIAL_ExclusiveRate: 80_00,
    MORTGAGE_TOKEN_INITIAL_CommissionRate: 30_00,
}
