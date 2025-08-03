// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IProjectToken} from "../interfaces/IProjectToken.sol";

abstract contract ProjectTokenStorage is IProjectToken {
    mapping(uint256 => mapping(address => Snapshot[])) internal balanceSnapshots;

    mapping(bytes32 => mapping(address => string)) public initiatorURI;

    mapping(uint256 => mapping(address => uint256)) public withdrawAt;

    mapping(uint256 => Snapshot[]) internal totalSupplySnapshots;

    mapping(uint256 => Project) internal projects;

    mapping(address => bool) public isLaunchpad;

    uint256 public projectNumber;

    address public admin;
    address public estateToken;
    address public feeReceiver;

    uint256[50] private __gap;
}
