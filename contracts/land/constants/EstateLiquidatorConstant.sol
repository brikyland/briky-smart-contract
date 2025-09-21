// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

/**
 *  @author Briky Team
 *
 *  @notice Constant library for contract `EstateLiquidator`.
 */
library EstateLiquidatorConstant {
    /** ===== CONSTANT ===== **/
    /// @notice Duration of the guard period right after tokenization, during which estate liquidation requires unanimous
    ///         approval of all holders.
    uint256 internal constant UNANIMOUS_GUARD_DURATION = 365 days;

    /// @notice Quorum threshold set at 100% for estate liquidation proposals within the guard period.
    /// @dev    Percentage: 100%
    uint256 internal constant UNANIMOUS_QUORUM_RATE = 1 ether;

    /// @notice Quorum threshold reduced to 75% for estate liquidation proposals after the guard period.
    /// @dev    Percentage: 75%
    uint256 internal constant MAJORITY_QUORUM_RATE = 0.75 ether;


    /// @notice Extraction proposal vote duration.
    uint40 internal constant VOTE_DURATION = 30 days;


    /// @notice Note for dividend issuance from liquidation.
    string internal constant DIVIDEND_ISSUANCE_DATA = "LIQUIDATED";
}
