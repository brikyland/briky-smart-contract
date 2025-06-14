// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ICommissionMarketplace} from "../interfaces/ICommissionMarketplace.sol";

abstract contract CommissionMarketplaceStorage is ICommissionMarketplace {
    mapping(uint256 => Offer) internal offers;

    uint256 public offerNumber;

    address public admin;
    address public commissionToken;

    uint256[50] private __gap;
}
