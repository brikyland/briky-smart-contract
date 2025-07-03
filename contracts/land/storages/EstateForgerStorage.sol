// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IEstateForger} from "../interfaces/IEstateForger.sol";

abstract contract EstateForgerStorage is IEstateForger {
    mapping(bytes32 => mapping(address => bool)) public isActiveSellerIn;

    mapping(uint256 => mapping(address => uint256)) public deposits;
    mapping(uint256 => mapping(address => bool)) public hasWithdrawn;

    mapping(address => bool) public isWhitelisted;

    mapping(uint256 => Request) internal requests;

    uint256 public requestNumber;

    uint256 public baseMinUnitPrice;
    uint256 public baseMaxUnitPrice;

    uint256 internal feeRate;

    address public admin;
    address public commissionToken;
    address public estateToken;
    address public feeReceiver;
    address public priceWatcher;
    address public reserveVault;

    uint256[50] private __gap;
}
