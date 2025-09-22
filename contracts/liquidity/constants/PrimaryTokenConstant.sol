// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

/**
 *  @author Briky Team
 *
 *  @notice Constant library for contract `PrimaryToken`.
 */
library PrimaryTokenConstant {
    /** ===== CONSTANT ===== **/
    /// @notice Base discount rate coefficient.
    /// @dev    Percentage: 15%
    uint256 internal constant BASE_DISCOUNT = 0.15 ether;


    /// @notice Maximum value of total supply.
    uint256 internal constant MAX_SUPPLY = 20_000_000_000 ether;


    /// @notice Allocation of Backer Round.
    uint256 internal constant BACKER_ROUND_ALLOCATION = 100_000_000 ether;

    /// @notice Allocation of Private Sale #1.
    uint256 internal constant PRIVATE_SALE_1_ALLOCATION = 30_000_000 ether;

    /// @notice Allocation of Private Sale #2.
    uint256 internal constant PRIVATE_SALE_2_ALLOCATION = 50_000_000 ether;

    /// @notice Allocation of Public Sale.
    uint256 internal constant PUBLIC_SALE_ALLOCATION = 500_000_000 ether;

    /// @notice Allocation of Seed Round.
    uint256 internal constant SEED_ROUND_ALLOCATION = 50_000_000 ether;


    /// @notice Allocation of Core Team.
    uint256 internal constant CORE_TEAM_ALLOCATION = 1_000_000_000 ether;

    /// @notice Allocation of External Treasury.
    uint256 internal constant EXTERNAL_TREASURY_ALLOCATION = 1_000_000_000 ether;

    /// @notice Allocation of Market Maker.
    uint256 internal constant MARKET_MAKER_ALLOCATION = 2_270_000_000 ether;


    /// @notice Reward for a wave of staking pool #1. After culmination, no more wave and reward.
    uint256 internal constant STAKE_1_WAVE_REWARD = 2_000_000 ether;

    /// @notice Reward for a wave of staking pool #2. After culmination, no more wave and reward.
    uint256 internal constant STAKE_2_WAVE_REWARD = 3_000_000 ether;

    /// @notice Reward for a wave of staking pool #3. After culmination, reward is the lesser between this value and the remain
    ///         mintable tokens to reach the maximum supply cap.
    uint256 internal constant STAKE_3_WAVE_REWARD = 4_000_000 ether;


    /// @notice Wave index that culminates staking pool #1. After the wave, staking costs fee and reward stops.
    uint256 internal constant STAKE_1_CULMINATING_WAVE = 750;

    /// @notice Wave index that culminates staking pool #2. After the wave, staking costs fee and reward stops.
    uint256 internal constant STAKE_2_CULMINATING_WAVE = 1500;

    /// @notice Wave index that culminates staking pool #3. After the wave, staking costs fee but reward can still be minted
    ///         only if the total supply has not exceeded its cap.
    uint256 internal constant STAKE_3_CULMINATING_WAVE = 2250;
}
