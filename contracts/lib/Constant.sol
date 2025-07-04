// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

library Constant {
    // Common
    uint8 internal constant COMMON_RATE_DECIMALS = 18;
    uint256 internal constant COMMON_RATE_MAX_FRACTION = 10 ** COMMON_RATE_DECIMALS;

    // Admin
    uint256 internal constant ADMIN_SIGNATURE_VERIFICATION_QUORUM = 4;

    // Estate Token
    uint8 internal constant ESTATE_TOKEN_DECIMALS = 18;
    uint256 internal constant ESTATE_TOKEN_UNIT = 10 ** ESTATE_TOKEN_DECIMALS;
    uint256 internal constant ESTATE_TOKEN_TOTAL_QUANTITY_LIMIT = type(uint256).max / ESTATE_TOKEN_UNIT;

    uint256 internal constant ESTATE_TOKEN_CONFIRMATION_TIME_LIMIT = 60 days;

    // Primary Token
    uint256 internal constant PRIMARY_TOKEN_BASE_DISCOUNT = 0.15 ether;

    uint256 internal constant PRIMARY_TOKEN_MAX_SUPPLY = 20_000_000_000 ether;
    uint256 internal constant PRIMARY_TOKEN_BACKER_ROUND = 100_000_000 ether;
    uint256 internal constant PRIMARY_TOKEN_CORE_TEAM = 1_000_000_000 ether;
    uint256 internal constant PRIMARY_TOKEN_EXTERNAL_TREASURY = 1_000_000_000 ether;
    uint256 internal constant PRIMARY_TOKEN_MARKET_MAKER = 2_270_000_000 ether;
    uint256 internal constant PRIMARY_TOKEN_PRIVATE_SALE_1 = 30_000_000 ether;
    uint256 internal constant PRIMARY_TOKEN_PRIVATE_SALE_2 = 50_000_000 ether;
    uint256 internal constant PRIMARY_TOKEN_PUBLIC_SALE = 500_000_000 ether;
    uint256 internal constant PRIMARY_TOKEN_SEED_ROUND = 50_000_000 ether;

    uint256 internal constant PRIMARY_TOKEN_STAKE_1_WAVE_REWARD = 2_000_000 ether;
    uint256 internal constant PRIMARY_TOKEN_STAKE_2_WAVE_REWARD = 3_000_000 ether;
    uint256 internal constant PRIMARY_TOKEN_STAKE_3_WAVE_REWARD = 4_000_000 ether;

    uint256 internal constant PRIMARY_TOKEN_STAKE_1_CULMINATING_WAVE = 750;
    uint256 internal constant PRIMARY_TOKEN_STAKE_2_CULMINATING_WAVE = 1500;
    uint256 internal constant PRIMARY_TOKEN_STAKE_3_CULMINATING_WAVE = 2250;

    // Stake Token
    uint256 internal constant STAKE_TOKEN_REWARD_FETCH_COOLDOWN = 1 days - 5 minutes;

    // Treasury
    uint256 internal constant TREASURY_OPERATION_FUND_RATE = 0.2 ether;
}
