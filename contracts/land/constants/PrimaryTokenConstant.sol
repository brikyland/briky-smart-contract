// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

library PrimaryTokenConstant {
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
}
