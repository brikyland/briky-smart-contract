// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

/// contracts/launch/interfaces/
import {IProjectToken} from "../interfaces/IProjectToken.sol";

/**
 *  @author Briky Team
 *
 *  @notice Storage contract for contract `ProjectToken`.
 */
abstract contract ProjectTokenStorage is
IProjectToken {
    /// @dev    balanceSnapshots[projectId][account]
    mapping(uint256 => mapping(address => Uint256Snapshot[])) internal balanceSnapshots;


    /// @dev    initiatorURI[zone][account]
    mapping(bytes32 => mapping(address => string)) public initiatorURI;


    /// @dev    totalSupplySnapshots[projectId]
    mapping(uint256 => Uint256Snapshot[]) internal totalSupplySnapshots;


    /// @dev    projects[projectId]
    mapping(uint256 => Project) internal projects;


    /// @dev    zoneRoyaltyRates[zone]
    mapping(bytes32 => uint256) internal zoneRoyaltyRates;


    /// @dev    isLaunchpad[account]
    mapping(address => bool) public isLaunchpad;


    uint256 public projectNumber;

    address public admin;
    address public estateToken;
    address public feeReceiver;

    uint256[50] private __gap;
}
