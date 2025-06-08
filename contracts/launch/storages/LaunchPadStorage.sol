// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ILaunchPad} from "../interfaces/ILaunchPad.sol";

abstract contract LaunchPadStorage is ILaunchPad {
    mapping(uint256 => mapping(uint256 => mapping(address => uint256))) internal pushes;
    mapping(uint256 => mapping(uint256 => mapping(address => bool))) internal hasWithdrawn;

    mapping(uint256 => mapping(address => Snapshot[])) internal balanceSnapshots;

    mapping(uint256 => mapping(uint256 => Round)) internal rounds;

    mapping(uint256 => Project) internal projects;

    uint256 public projectNumber;

    uint256 internal feeRate;
    uint256 internal royaltyRate;

    address public admin;
    address public feeReceiver;
    address public estateToken;

    uint256[50] private __gap;
}
