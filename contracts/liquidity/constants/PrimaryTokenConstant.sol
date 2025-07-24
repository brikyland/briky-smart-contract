// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

library PrimaryTokenConstant {
    uint256 internal constant BASE_DISCOUNT = 0.15 ether;

    uint256 internal constant MAX_SUPPLY = 20_000_000_000 ether;
    uint256 internal constant BACKER_ROUND_ALLOCATION = 100_000_000 ether;
    uint256 internal constant CORE_TEAM_ALLOCATION = 1_000_000_000 ether;
    uint256 internal constant EXTERNAL_TREASURY_ALLOCATION = 1_000_000_000 ether;
    uint256 internal constant MARKET_MAKER_ALLOCATION = 2_270_000_000 ether;
    uint256 internal constant PRIVATE_SALE_1_ALLOCATION = 30_000_000 ether;
    uint256 internal constant PRIVATE_SALE_2_ALLOCATION = 50_000_000 ether;
    uint256 internal constant PUBLIC_SALE_ALLOCATION = 500_000_000 ether;
    uint256 internal constant SEED_ROUND_ALLOCATION = 50_000_000 ether;

    uint256 internal constant STAKE_1_WAVE_REWARD = 2_000_000 ether;
    uint256 internal constant STAKE_2_WAVE_REWARD = 3_000_000 ether;
    uint256 internal constant STAKE_3_WAVE_REWARD = 4_000_000 ether;

    uint256 internal constant STAKE_1_CULMINATING_WAVE = 750;
    uint256 internal constant STAKE_2_CULMINATING_WAVE = 1500;
    uint256 internal constant STAKE_3_CULMINATING_WAVE = 2250;
}
