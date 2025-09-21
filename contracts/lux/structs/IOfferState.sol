// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

/**
 * @author Briky Team
 * 
 * @notice Interface for enum `OfferState`.
 */
interface IOfferState {
    /** ===== ENUM ===== **/
    /**
     *  @notice Variants of state of an offer.
     */
    enum OfferState {
        /// @notice Not an offer.
        Nil,

        /// @notice Offer is selling, awaiting buyer.
        Selling,

        /// @notice Offer is sold.
        Sold,

        /// @notice Offer is cancelled.
        Cancelled
    }
}
