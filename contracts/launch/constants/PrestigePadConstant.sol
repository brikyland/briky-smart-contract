// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

/**
 *  @author Briky Team
 *
 *  @notice Constant library for contract `PrestigePad`.
 */
library PrestigePadConstant {
    /** ===== CONSTANT ===== **/
    /// @notice Minimum raise duration.
    uint256 internal constant RAISE_MINIMUM_DURATION = 7 days;

    /// @notice Cannot confirm a round once the time limit expires after the raise ends.
    uint256 internal constant RAISE_CONFIRMATION_TIME_LIMIT = 30 days;
}
