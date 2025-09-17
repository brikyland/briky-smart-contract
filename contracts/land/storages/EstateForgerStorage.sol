// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

/// contracts/land/interfaces/
import {IEstateForger} from "../interfaces/IEstateForger.sol";

/**
 *  @author Briky Team
 *
 *  @notice Storage contract for contract `EstateForger`.
 */
abstract contract EstateForgerStorage is
IEstateForger {
    /// @dev    deposits[requestId][account]
    mapping(uint256 => mapping(address => uint256)) public deposits;

    /// @dev    withdrawAt[requestId][account]
    mapping(uint256 => mapping(address => uint256)) public withdrawAt;


    /// @dev    isWhitelistedFor[requestId][account]
    mapping(uint256 => mapping(address => bool)) public isWhitelistedFor;


    /// @dev    requests[requestId]
    mapping(uint256 => EstateForgerRequest) internal requests;


    /// @dev    isWhitelisted[account]
    mapping(address => bool) public isWhitelisted;


    uint256 public requestNumber;

    uint256 public baseMinUnitPrice;
    uint256 public baseMaxUnitPrice;

    address public admin;
    address public estateToken;
    address public feeReceiver;
    address public priceWatcher;
    address public reserveVault;

    uint256[50] private __gap;
}
