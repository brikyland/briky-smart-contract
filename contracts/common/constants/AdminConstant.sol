// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 *  @author Briky Team
 *
 *  @notice Constant library for contract `Admin`.
 */
library AdminConstant {
    /** ===== CONSTANT ===== **/
    /// @notice Minimum number of correct signatures required for administrative verifications.
    uint256 internal constant SIGNATURE_VERIFICATION_QUORUM = 4;
}
