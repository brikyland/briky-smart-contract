// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

library Constant {
    // Common
    uint8 internal constant COMMON_RATE_DECIMALS = 18;
    uint256 internal constant COMMON_RATE_MAX_FRACTION = 10 ** COMMON_RATE_DECIMALS;

    // Admin
    uint256 internal constant ADMIN_SIGNATURE_VERIFICATION_QUORUM = 4;

    // Estate Token
    uint256 internal constant ESTATE_TOKEN_CONFIRMATION_TIME_LIMIT = 30 days;
    uint8 internal constant ESTATE_TOKEN_MAX_DECIMALS = 18;

    // Primary Token
    uint256 internal constant PRIMARY_TOKEN_BASE_DISCOUNT = 15 ether;
    uint8 internal constant PRIMARY_TOKEN_DISCOUNT_DECIMALS = 18;

    uint256 internal constant PRIMARY_TOKEN_MAX_SUPPLY = 20_000_000_000 ether;
    uint256 internal constant PRIMARY_TOKEN_BACKER_ROUND = 100_000_000 ether;
    uint256 internal constant PRIMARY_TOKEN_CORE_TEAM = 1_000_000_000 ether;
    uint256 internal constant PRIMARY_TOKEN_EXTERNAL_TREASURY = 1_000_000_000 ether;
    uint256 internal constant PRIMARY_TOKEN_MARKET_MAKER = 2_270_000_000 ether;
    uint256 internal constant PRIMARY_TOKEN_PRIVATE_SALE_1 = 30_000_000 ether;
    uint256 internal constant PRIMARY_TOKEN_PRIVATE_SALE_2 = 50_000_000 ether;
    uint256 internal constant PRIMARY_TOKEN_PUBLIC_SALE = 500_000_000 ether;
    uint256 internal constant PRIMARY_TOKEN_SEED_ROUND = 50_000_000 ether;

    uint256 internal constant PRIMARY_TOKEN_STAKE_REWARD_1 = 1_500_000 ether;
    uint256 internal constant PRIMARY_TOKEN_STAKE_REWARD_2 = 4_500_000 ether;

    uint256 internal constant PRIMARY_TOKEN_DAILY_STAKE_REWARD_LIMIT_1 = 2_000_000 ether;
    uint256 internal constant PRIMARY_TOKEN_DAILY_STAKE_REWARD_LIMIT_2 = 3_000_000 ether;
    uint256 internal constant PRIMARY_TOKEN_DAILY_STAKE_REWARD_LIMIT_3 = 4_000_000 ether;

    // Stake Token
    uint256 internal constant STAKE_TOKEN_DAY_LENGTH = 1 days - 5 minutes;

    // Treasury
    uint256 internal constant TREASURY_OPERATION_FUND_RATE = 0.2 ether;
}
