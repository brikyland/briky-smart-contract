// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

/**
 *  @author Briky Team
 *
 *  @notice Constant library for contract `GovernanceHub`.
 */
library GovernanceHubConstant {
    /** ===== CONSTANT ===== **/
    /// @notice Cannot confirm a proposal after time limit has expired after the vote ends.
    uint40 internal constant VOTE_CONFIRMATION_TIME_LIMIT = 30 days;
}
