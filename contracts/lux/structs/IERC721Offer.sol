// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// contracts/lux/structs/
import {IOfferState} from "../structs/IOfferState.sol";

/**
 *  @author Briky Team
 *
 *  @notice Interface for struct `ERC721Offer`.
 */
interface IERC721Offer is
IOfferState {
    /** ===== STRUCT ===== **/
    /**
     *  @notice An offer to sell an ERC721 token.
     */
    struct ERC721Offer {
        /// @notice Token collection contract address.
        /// @dev    The collection must support interface `IERC721Upgradeable`.
        address collection;

        /// @notice Token identifier.
        uint256 tokenId;

        /// @notice Sale value.
        uint256 price;

        /// @notice Royalty charged on the offer.
        uint256 royalty;

        /// @notice Sale currency address.
        address currency;

        /// @notice Current state.
        OfferState state;

        /// @notice Seller address.
        address seller;

        /// @notice Royalty receiver address.
        address royaltyReceiver;
    }
}
