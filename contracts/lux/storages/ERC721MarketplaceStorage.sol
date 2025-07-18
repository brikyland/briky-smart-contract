// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IERC721Marketplace} from "../../lux/interfaces/IERC721Marketplace.sol";

abstract contract ERC721MarketplaceStorage is IERC721Marketplace {
    mapping(uint256 => Offer) internal offers;

    address public admin;
    address public feeReceiver;
    uint256 public offerNumber;

    uint256[50] private __gap;
}
