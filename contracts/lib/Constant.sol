// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

library Constant {
    // Common
    uint40 internal constant COMMON_INFINITE_TIMESTAMP = type(uint40).max;

    uint8 internal constant COMMON_RATE_DECIMALS = 18;
    uint256 internal constant COMMON_RATE_MAX_FRACTION = 10 ** COMMON_RATE_DECIMALS;

    uint256 internal constant COMMON_VALIDATION_SIGNATURE_TTL = 10 minutes;

    // Admin
    uint256 internal constant ADMIN_SIGNATURE_VERIFICATION_QUORUM = 4;

    // Estate Token
    uint8 internal constant ESTATE_TOKEN_DECIMALS = 18;
    uint256 internal constant ESTATE_TOKEN_UNIT = 10 ** ESTATE_TOKEN_DECIMALS;
    uint256 internal constant ESTATE_TOKEN_TOTAL_QUANTITY_LIMIT = type(uint256).max / ESTATE_TOKEN_UNIT;

    uint40 internal constant ESTATE_TOKEN_CONFIRMATION_TIME_LIMIT = 30 days;

    uint256 internal constant ESTATE_TOKEN_EXTRACTION_UNANIMOUS_GUARD_DURATION = 365 days;
    uint256 internal constant ESTATE_TOKEN_EXTRACTION_UNANIMOUS_QUORUM_RATE = 1 ether;
    uint256 internal constant ESTATE_TOKEN_EXTRACTION_MAJORITY_QUORUM_RATE = 0.75 ether;
    uint40 internal constant ESTATE_TOKEN_EXTRACTION_VOTING_DURATION = 30 days;

    // Governance Hub
    uint40 internal constant GOVERNANCE_HUB_CONFIRMATION_TIME_LIMIT = 30 days;

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
