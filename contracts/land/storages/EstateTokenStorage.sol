// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IEstateToken} from "../interfaces/IEstateToken.sol";

abstract contract EstateTokenStorage is IEstateToken {
    mapping(uint256 => mapping(address => Snapshot[])) internal balanceSnapshots;

    mapping(bytes32 => mapping(address => string)) public operatorURIs;

    mapping(uint256 => Estate) internal estates;
    mapping(uint256 => Extraction) internal extractions;

    mapping(address => bool) public isTokenizer;

    uint256 public estateNumber;
    uint256 public extractionNumber;

    uint256 internal royaltyRate;

    address public admin;
    address public commissionToken;
    address public feeReceiver;
    address public governanceHub;
    address public paymentHub;

    uint256[50] private __gap;
}
