// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 *  @author Briky Team
 *
 *  @notice Constant library for contract `EstateLiquidator`.
 */
library EstateLiquidatorConstant {
    /** ===== CONSTANT ===== **/

    /// @notice During the initial guard period after tokenization, estate liquidation requires approval of all holders.
    uint256 internal constant UNANIMOUS_GUARD_DURATION = 365 days;

    /// @notice Quorum threshold of 100% for estate liquidation within the guard period.
    uint256 internal constant UNANIMOUS_QUORUM_RATE = 1 ether;

    /// @notice Quorum threshold of 75% for estate liquidation after the guard period.
    uint256 internal constant MAJORITY_QUORUM_RATE = 0.75 ether;


    /// @notice Extraction proposal admission duration.
    uint40 internal constant ADMISSION_DURATION = 30 days;

    /// @notice Extraction proposal vote duration.
    uint40 internal constant VOTE_DURATION = 30 days;


    /// @notice Note for dividend issuance from extraction.
    string internal constant DIVIDEND_ISSUANCE_DATA = "Extraction";
}
