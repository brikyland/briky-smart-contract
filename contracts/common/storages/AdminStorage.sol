// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

/// contracts/common/interfaces/
import {IAdmin} from "../interfaces/IAdmin.sol";

/**
 *  @author Briky Team
 *
 *  @notice Storage contract for contract `Admin`.
 */
abstract contract AdminStorage is
IAdmin {
    /// @dev    DEPRECATED!
    mapping(address => uint256) private currencyUnitPriceLimits;


    /// @dev    isManager[account]
    mapping(address => bool) public isManager;


    uint256 public nonce;

    address public admin1;
    address public admin2;
    address public admin3;
    address public admin4;
    address public admin5;


    /** ===== UPGRADE ===== **/
    /// @dev    isModerator[account]
    mapping(address => bool) public isModerator;


    /// @dev    currencyRegistries[currency]
    mapping(address => CurrencyRegistry) internal currencyRegistries;


    /// @dev    isZone[zone]
    mapping(bytes32 => bool) public isZone;


    /// @dev    isActiveIn[zone][account]
    mapping(bytes32 => mapping(address => bool)) public isActiveIn;


    /// @dev    isGovernor[account]
    mapping(address => bool) public isGovernor;


    uint256[45] private __gap;
}
