import { ethers } from 'hardhat';

const DAY_LENGTH = 24 * 60 * 60;

export const Constant = {
    // Common
    COMMON_RATE_DECIMALS: 18,
    COMMON_RATE_MAX_FRACTION: ethers.utils.parseEther(String(1)),

    // Admin
    ADMIN_NUMBER: 5,
    ADMIN_SIGNATURE_VERIFICATION_QUORUM: 4,

    // Commission Token
    COMMISSION_TOKEN_INITIAL_Name: 'Briky Commission',
    COMMISSION_TOKEN_INITIAL_Symbol: 'COMIKY',
    COMMISSION_TOKEN_INITIAL_BaseURI: '',
    COMMISSION_TOKEN_INITIAL_CommissionRate: ethers.utils.parseEther(String(0.3)),
    COMMISSION_TOKEN_INITIAL_RoyaltyRate: ethers.utils.parseEther(String(0.06)),

    // Estate Forger
    ESTATE_FORGER_INITIAL_FeeRate: ethers.utils.parseEther(String(0.001)),
    ESTATE_FORGER_INITIAL_BaseMinUnitPrice: ethers.utils.parseEther(String(100)),
    ESTATE_FORGER_INITIAL_BaseMaxUnitPrice: ethers.utils.parseEther(String(1_000)),

    // Estate Token
    ESTATE_TOKEN_CONFIRMATION_TIME_LIMIT: 30 * DAY_LENGTH,
    ESTATE_TOKEN_MAX_DECIMALS: 18,

    ESTATE_TOKEN_INITIAL_BaseURI: '',
    ESTATE_TOKEN_INITIAL_RoyaltyRate: ethers.utils.parseEther(String(0.003)),

    // Primary Token
    PRIMARY_TOKEN_BASE_DISCOUNT: ethers.utils.parseEther(String(0.15)),
    PRIMARY_TOKEN_DISCOUNT_DECIMALS: 18,

    PRIMARY_TOKEN_MAXIMUM_SUPPLY: ethers.utils.parseEther(String(20_000_000_000)),
    PRIMARY_TOKEN_BACKER_ROUND: ethers.utils.parseEther(String(100_000_000)),
    PRIMARY_TOKEN_CORE_TEAM: ethers.utils.parseEther(String(1_000_000_000)),
    PRIMARY_TOKEN_EXTERNAL_TREASURY: ethers.utils.parseEther(String(1_000_000_000)),
    PRIMARY_TOKEN_MARKET_MAKER: ethers.utils.parseEther(String(2_270_000_000)),
    PRIMARY_TOKEN_PRIVATE_SALE_1: ethers.utils.parseEther(String(30_000_000)),
    PRIMARY_TOKEN_PRIVATE_SALE_2: ethers.utils.parseEther(String(50_000_000)),
    PRIMARY_TOKEN_PUBLIC_SALE: ethers.utils.parseEther(String(500_000_000)),
    PRIMARY_TOKEN_SEED_ROUND: ethers.utils.parseEther(String(50_000_000)),

    PRIMARY_TOKEN_STAKE_REWARD_1: ethers.utils.parseEther(String(1_500_000)),
    PRIMARY_TOKEN_STAKE_REWARD_2: ethers.utils.parseEther(String(4_500_000)),

    PRIMARY_TOKEN_DAILY_STAKE_REWARD_LIMIT_1: ethers.utils.parseEther(String(2_000_000)),
    PRIMARY_TOKEN_DAILY_STAKE_REWARD_LIMIT_2: ethers.utils.parseEther(String(3_000_000)),
    PRIMARY_TOKEN_DAILY_STAKE_REWARD_LIMIT_3: ethers.utils.parseEther(String(4_000_000)),

    PRIMARY_TOKEN_INITIAL_Name: "Briky Capital",
    PRIMARY_TOKEN_INITIAL_Symbol: 'BRIK',
    PRIMARY_TOKEN_INITIAL_LiquidationUnlockedAt: Date.parse('2026-01-01T00:00:00') / 1000,

    // Stake Token
    STAKE_TOKEN_DAY_LENGTH: DAY_LENGTH - 5 * 60,

    STAKE_TOKEN_INITIAL_Name_1: 'Briky Stake 2028',
    STAKE_TOKEN_INITIAL_Symbol_1: 'BRISTAKE-28',

    STAKE_TOKEN_INITIAL_Name_2: 'Briky Stake 2030',
    STAKE_TOKEN_INITIAL_Symbol_2: 'BRISTAKE-30',

    STAKE_TOKEN_INITIAL_Name_3: 'Briky Stake 2032',
    STAKE_TOKEN_INITIAL_Symbol_3: 'BRISTAKE-32',

    // Treasury
    TREASURY_OPERATION_FUND_RATE: ethers.utils.parseEther(String(0.2)),

    // Mortgage Token
    MORTGAGE_TOKEN_INITIAL_Name: 'Briky Mortgage',
    MORTGAGE_TOKEN_INITIAL_Symbol: 'MORTY',
    MORTGAGE_TOKEN_INITIAL_BaseURI: '',
    MORTGAGE_TOKEN_INITIAL_FeeRate: ethers.utils.parseEther(String(0.002)),
    MORTGAGE_TOKEN_INITIAL_RoyaltyRate: ethers.utils.parseEther(String(0.03)),
}
