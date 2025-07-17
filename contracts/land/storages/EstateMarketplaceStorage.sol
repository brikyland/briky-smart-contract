// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IEstateMarketplace} from "../interfaces/IEstateMarketplace.sol";

abstract contract EstateMarketplaceStorage is IEstateMarketplace {
    mapping(uint256 => Offer) internal offers;

    uint256 public offerNumber;

    address public admin;
    address public estateToken;

    uint256[50] private __gap;
}
