// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IEstateForger} from "../interfaces/IEstateForger.sol";

abstract contract EstateForgerStorage is IEstateForger {
    mapping(uint256 => mapping(address => uint256)) public deposits;
    mapping(uint256 => mapping(address => bool)) public hasWithdrawn;

    mapping(address => PriceFeed) internal priceFeeds;
    mapping(address => Rate) internal defaultRates;
    mapping(uint256 => Request) internal requests;

    uint256 public requestNumber;

    uint256 public baseMinUnitPrice;
    uint256 public baseMaxUnitPrice;

    uint256 internal feeRate;

    address public admin;
    address public feeReceiver;
    address public commissionToken;
    address public estateToken;

    uint256[50] private __gap;
}
