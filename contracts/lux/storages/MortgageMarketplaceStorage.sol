// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IMortgageMarketplace} from "../../lux/interfaces/IMortgageMarketplace.sol";

abstract contract MortgageMarketplaceStorage is IMortgageMarketplace {
    mapping(uint256 => Offer) internal offers;

    uint256 public offerNumber;

    address public admin;
    address public mortgageToken;

    uint256[50] private __gap;
}
