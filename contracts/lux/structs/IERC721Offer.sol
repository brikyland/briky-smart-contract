// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

/// contracts/lux/structs/
import {IOfferState} from "../structs/IOfferState.sol";

/**
 *  @author Briky Team
 *
 *  @notice Interface for struct `ERC721Offer`.
 *
 *  @dev    ERC-20 tokens are identified by their contract addresses.
 *          Native coin is represented by the zero address (0x0000000000000000000000000000000000000000).
 */
interface IERC721Offer is
IOfferState {
    /** ===== STRUCT ===== **/
    /**
     *  @notice An offer to sell an ERC-721 token.
     */
    struct ERC721Offer {
        /// @notice Collection contract address.
        /// @dev    The collection must support interface `IERC721Upgradeable`.
        address collection;

        /// @notice Token identifier.
        uint256 tokenId;

        /// @notice Sale value.
        uint256 price;

        /// @notice Royalty derived from the sale value.
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
