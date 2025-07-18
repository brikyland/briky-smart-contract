// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IPassportToken} from "../interfaces/IPassportToken.sol";

abstract contract PassportTokenStorage is IPassportToken {
    mapping(address => bool) public hasMinted;

    string internal baseURI;

    uint256 public tokenNumber;

    uint256 public fee;

    address public admin;
    // deprecated
    address public feeReceiver;

    uint256[50] private __gap;
}
