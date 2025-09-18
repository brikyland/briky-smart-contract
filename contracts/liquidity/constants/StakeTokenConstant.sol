// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

/**
 *  @author Briky Team
 *
 *  @notice Constant library for contract `StakeToken`.
 */
library StakeTokenConstant {
    /** ===== CONSTANT ===== **/
    /// @notice Minimal time gap between two consecutive staking reward waves, about 1 day.
    uint256 internal constant REWARD_FETCH_COOLDOWN = 1 days - 5 minutes;
}
