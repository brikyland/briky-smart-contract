import { parseEther } from "./blockchain";

const MINUTE = 60;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

export const Constant = {
    // Common
    COMMON_RATE_DECIMALS: 18,
    COMMON_RATE_MAX_FRACTION: parseEther(1),

    // Admin
    ADMIN_NUMBER: 5,
    ADMIN_SIGNATURE_VERIFICATION_QUORUM: 4,

    // Estate Token
    ESTATE_TOKEN_CONFIRMATION_TIME_LIMIT: 30 * DAY,
    ESTATE_TOKEN_MAX_DECIMALS: 18,

    // Primary Token
    PRIMARY_TOKEN_BASE_DISCOUNT: parseEther(0.15),

    PRIMARY_TOKEN_MAXIMUM_SUPPLY: parseEther(20_000_000_000),
    PRIMARY_TOKEN_BACKER_ROUND: parseEther(100_000_000),
    PRIMARY_TOKEN_CORE_TEAM: parseEther(1_000_000_000),
    PRIMARY_TOKEN_EXTERNAL_TREASURY: parseEther(1_000_000_000),
    PRIMARY_TOKEN_MARKET_MAKER: parseEther(2_270_000_000),
    PRIMARY_TOKEN_PRIVATE_SALE_1: parseEther(30_000_000),
    PRIMARY_TOKEN_PRIVATE_SALE_2: parseEther(50_000_000),
    PRIMARY_TOKEN_PUBLIC_SALE: parseEther(500_000_000),
    PRIMARY_TOKEN_SEED_ROUND: parseEther(50_000_000),

    PRIMARY_TOKEN_STAKE_1_WAVE_REWARD: parseEther(2_000_000),
    PRIMARY_TOKEN_STAKE_2_WAVE_REWARD: parseEther(3_000_000),
    PRIMARY_TOKEN_STAKE_3_WAVE_REWARD: parseEther(4_000_000),

    PRIMARY_TOKEN_STAKE_1_CULMINATING_WAVE: 750,
    PRIMARY_TOKEN_STAKE_2_CULMINATING_WAVE: 1500,
    PRIMARY_TOKEN_STAKE_3_CULMINATING_WAVE: 2250,

    // Stake Token
    STAKE_TOKEN_REWARD_FETCH_COOLDOWN: DAY - 5 * MINUTE,

    // Treasury
    TREASURY_OPERATION_FUND_RATE: parseEther(0.2),
}
