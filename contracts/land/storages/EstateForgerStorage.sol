// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IEstateForger} from "../interfaces/IEstateForger.sol";

abstract contract EstateForgerStorage is IEstateForger {
    mapping(uint256 => mapping(address => uint256)) public deposits;
    mapping(uint256 => mapping(address => bool)) public hasWithdrawn;

    uint256 public baseMinUnitPrice;
    uint256 public baseMaxUnitPrice;

    mapping(address => PriceFeed) internal priceFeeds;
    mapping(uint256 => Request) internal requests;

    uint256 public commissionRate;
    uint256 public exclusiveRate;
    uint256 public feeRate;

    uint256 public requestNumber;

    address public admin;
    address public feeReceiver;
    address public commissionToken;
    address public estateToken;

    uint256[50] private __gap;
}
