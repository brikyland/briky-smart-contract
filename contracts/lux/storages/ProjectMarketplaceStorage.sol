// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IProjectMarketplace} from "../../lux/interfaces/IProjectMarketplace.sol";

abstract contract ProjectMarketplaceStorage is IProjectMarketplace {
    mapping(uint256 => Offer) internal offers;

    uint256 public offerNumber;

    address public admin;
    address public projectToken;

    uint256[50] private __gap;
}
