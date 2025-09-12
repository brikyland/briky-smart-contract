// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IEstateToken} from "../interfaces/IEstateToken.sol";

abstract contract EstateTokenStorage is IEstateToken {
    mapping(uint256 => mapping(address => Uint256Snapshot[])) internal balanceSnapshots;

    mapping(bytes32 => mapping(address => string)) public custodianURI;

    mapping(bytes32 => uint256) internal zoneRoyaltyRates;

    mapping(uint256 => Estate) internal estates;

    mapping(address => bool) public isExtractor;
    mapping(address => bool) public isTokenizer;

    uint256 public estateNumber;

    address public admin;
    address public commissionToken;
    address public feeReceiver;

    uint256[50] private __gap;
}
