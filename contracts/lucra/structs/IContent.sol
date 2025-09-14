// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

/**
 *  @author Briky Team
 *
 *  @notice Interface for struct `Content`.
 */
interface IContent {
    /** ===== STRUCT ===== **/
    /**
     *  @notice Content information.
     */
    struct Content {
        /// @notice URI of content metadata.
        string uri;

        /// @notice Start timestamp of allowed minting period.
        uint40 startAt;

        /// @notice End timestamp of allowed minting period.
        uint40 endAt;
    }
}
