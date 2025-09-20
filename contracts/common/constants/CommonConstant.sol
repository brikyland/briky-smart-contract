// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

/**
 *  @author Briky Team
 *
 *  @notice Constant library for common usage.
 */
library CommonConstant {
    /** ===== CONSTANT ===== **/
    /* --- Timestamp --- */
    /// @notice Most timestamps in contracts are of type `uint40` so the maximum value of `uint40` is conventionally defined as
    ///         the infinite timestamp.
    uint40 internal constant INFINITE_TIMESTAMP = type(uint40).max;


    /* --- Rate --- */
    /// @notice Rate denominator is `10 ** RATE_DECIMALS`.
    uint8 internal constant RATE_DECIMALS = 18;

    /// @notice A rate representing a fraction of an arbitrary value cannot exceed 1.0.
    uint256 internal constant RATE_MAX_SUBUNIT = 10 ** RATE_DECIMALS;
}
