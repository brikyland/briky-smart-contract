// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

/**
 *  @author Briky Team
 *
 *  @notice Constant library for contract `StakeToken`.
 */
library TreasuryConstant {
    /** ===== CONSTANT ===== **/
    /// @notice Fraction from provided liquidity to fund system operations.
    /// @dev    Percentage: 20%
    uint256 internal constant OPERATION_FUND_RATE = 0.2 ether;
}
