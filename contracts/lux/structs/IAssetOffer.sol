// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// contracts/lux/structs/
import {IOfferState} from "../structs/IOfferState.sol";

/**
 *  @author Briky Team
 *
 *  @notice Interface for struct `AssetOffer`.
 */
interface IAssetOffer is
IOfferState {
    /** ===== STRUCT ===== **/
    /**
     *  @notice An offer to sell an amount of asset tokens.
     */
    struct AssetOffer {
        /// @notice Asset identifier.
        uint256 tokenId;

        /// @notice Amount of tokens to be sold.
        uint256 sellingAmount;

        /// @notice Amount of tokens that has been bought.
        uint256 soldAmount;

        /// @notice Sale value of each token.
        uint256 unitPrice;

        /// @notice Royalty charged on each token.
        uint256 royaltyDenomination;

        /// @notice Sale currency address.
        address currency;

        /// @notice Whether the offer can be bought partially.
        bool isDivisible;

        /// @notice Current state.
        OfferState state;

        /// @notice Seller address.
        address seller;

        /// @notice Royalty receiver address.
        address royaltyReceiver;
    }
}