// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IEstateToken} from "../interfaces/IEstateToken.sol";

abstract contract EstateTokenStorage is IEstateToken {
    mapping(uint256 => mapping(address => Snapshot[])) internal balanceSnapshots;

    mapping(address => bool) public isTokenizer;

    mapping(uint256 => Estate) internal estates;

    uint256 internal royaltyRate;

    uint256 public estateNumber;

    address public admin;
    address public feeReceiver;
    address public commissionToken;

    uint256[50] private __gap;
}
