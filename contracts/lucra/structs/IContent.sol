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
     *  @notice Content for `PromotionToken`.
     */
    struct Content {
        /// @notice URI of content metadata.
        string uri;

        /// @notice Start timestamp for minting.
        uint40 startAt;

        /// @notice End timestamp for minting.
        uint40 endAt;
    }
}
