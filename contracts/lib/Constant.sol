// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

library Constant {
    // Common
    uint256 internal constant COMMON_PERCENTAGE_DENOMINATOR = 100_00;

    // Admin
    uint256 internal constant ADMIN_SIGNATURE_VERIFICATION_QUORUM = 4;

    // Estate Token
    uint256 internal constant ESTATE_TOKEN_DECIMALS_LIMIT = 18;
    uint256 internal constant ESTATE_TOKEN_CONFIRMATION_TIME_LIMIT = 30 days;

    // Primary Token
    uint256 internal constant PRIMARY_TOKEN_MAXIMUM_SUPPLY = 20_000_000_000 ether;

    uint256 internal constant PRIMARY_TOKEN_BACKER_ROUND = 100_000_000 ether;
    uint256 internal constant PRIMARY_TOKEN_CORE_TEAM = 1_000_000_000 ether;
    uint256 internal constant PRIMARY_TOKEN_EXTERNAL_TREASURY = 1_000_000_000 ether;
    uint256 internal constant PRIMARY_TOKEN_MARKET_MAKER = 2_270_000_000 ether;
    uint256 internal constant PRIMARY_TOKEN_PRIVATE_SALE_1 = 30_000_000 ether;
    uint256 internal constant PRIMARY_TOKEN_PRIVATE_SALE_2 = 50_000_000 ether;
    uint256 internal constant PRIMARY_TOKEN_PUBLIC_SALE = 500_000_000 ether;
    uint256 internal constant PRIMARY_TOKEN_SEED_ROUND = 50_000_000 ether;

    uint256 internal constant PRIMARY_TOKEN_DAILY_STAKE_REWARD_LIMIT = 7_000_000 ether;

    // Stake Token
    uint256 internal constant STAKE_TOKEN_DAY_LENGTH = 1 days - 10 minutes;

    uint256 internal constant STAKE_TOKEN_UNSTAKING_FEE_INITIAL_PERCENTAGE = 50_00;
    uint256 internal constant STAKE_TOKEN_UNSTAKING_FEE_ZEROING_DAYS = 1095;

    // Treasury
    uint256 internal constant TREASURY_OPERATION_FUND_PERCENTAGE = 20_00;
}
