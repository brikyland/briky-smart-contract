// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ICommissionToken} from "../interfaces/ICommissionToken.sol";

abstract contract CommissionTokenStorage is ICommissionToken {
    mapping(bytes32 => mapping(address => Rate)) internal brokerCommissionRates;

    mapping(bytes32 => mapping(address => bool)) public isActiveIn;

    mapping(uint256 => Rate) internal commissionRates;

    string internal baseURI;

    uint256 internal royaltyRate;

    uint256 public totalSupply;

    address public admin;
    address public estateToken;
    address public feeReceiver;

    uint256[50] private __gap;
}
