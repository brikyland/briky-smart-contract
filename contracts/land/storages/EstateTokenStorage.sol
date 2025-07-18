// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IEstateToken} from "../interfaces/IEstateToken.sol";

abstract contract EstateTokenStorage is IEstateToken {
    mapping(uint256 => mapping(address => Snapshot[])) internal balanceSnapshots;

    mapping(uint256 => Estate) internal estates;

    mapping(address => bool) public isExtractor;
    mapping(address => bool) public isTokenizer;

    uint256 public estateNumber;

    address public admin;
    address public commissionToken;
    address public feeReceiver;

    uint256[50] private __gap;
}
