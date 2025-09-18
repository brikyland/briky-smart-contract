// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

/**
 *  @author Briky Team
 *
 *  @notice Constant library for contract `EstateForger`.
 */
library EstateForgerConstant {
    /** ===== CONSTANT ===== **/
    /// @notice Minimum sale duration in total, include private sale and public sale.
    uint40 internal constant SALE_MINIMUM_DURATION = 7 days;

    /// @notice Cannot confirm a request once the time limit expires after the sale ends.
    uint40 internal constant SALE_CONFIRMATION_TIME_LIMIT = 30 days;
}
