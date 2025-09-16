// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

/// contracts/lux/interfaces/
import {IERC721Marketplace} from "../../lux/interfaces/IERC721Marketplace.sol";

/**
 *  @author Briky Team
 *
 *  @notice Storage contract for contract `ERC721Marketplace`.
 */
abstract contract ERC721MarketplaceStorage is
IERC721Marketplace {
    /// @dev    offers[offerId]
    mapping(uint256 => ERC721Offer) internal offers;


    /// @dev    isCollection[collection]
    mapping(address => bool) public isCollection;

    address public admin;
    address public feeReceiver;
    uint256 public offerNumber;

    uint256[50] private __gap;
}
