// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IAdmin} from "../interfaces/IAdmin.sol";

abstract contract AdminStorage is IAdmin {
    // deprecated
    mapping(address => uint256) private currencyUnitPriceLimits;
    mapping(address => bool) public isManager;

    uint256 public nonce;

    address public admin1;
    address public admin2;
    address public admin3;
    address public admin4;
    address public admin5;

    mapping(address => bool) public isModerator;
    
    mapping(address => CurrencyRegistry) internal currencyRegistries;

    mapping(bytes32 => bool) public isZone;
    mapping(bytes32 => mapping(address => bool)) public isActiveIn;

    mapping(address => bool) public isGovernor;

    uint256[45] private __gap;
}
