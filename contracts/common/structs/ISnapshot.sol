// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

/**
 *  @author Briky Team
 *
 *  @notice Interface for snapshot structs.
 */
interface ISnapshot {
    /** ===== STRUCT ===== **/
    /**
     *  @notice Capture of a mutable value of type `uint256` at a specific timestamp.
     */
    struct Uint256Snapshot {
        /// @notice Value at the reference timestamp.
        uint256 value;

        /// @notice Reference timestamp.
        uint256 timestamp;
    }
}
