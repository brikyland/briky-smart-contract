// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

/// contracts/lux/structs/
import {IOfferState} from "../structs/IOfferState.sol";

/**
 *  @author Briky Team
 *
 *  @notice Interface for struct `AssetOffer`.
 *
 *  @dev    ERC-20 tokens are identified by their contract addresses.
 *          Native coin is represented by the zero address (0x0000000000000000000000000000000000000000).
 */
interface IAssetOffer is
IOfferState {
    /** ===== STRUCT ===== **/
    /**
     *  @notice An offer to sell an amount of `IAssetToken`.
     */
    struct AssetOffer {
        /// @notice Asset identifier.
        uint256 tokenId;

        /// @notice Selling amount.
        uint256 sellingAmount;

        /// @notice Sold amount.
        uint256 soldAmount;

        /// @notice Sale value of each token unit.
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