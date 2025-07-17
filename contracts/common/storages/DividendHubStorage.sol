// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IDividendHub} from "../interfaces/IDividendHub.sol";

abstract contract DividendHubStorage is IDividendHub {
    mapping(uint256 => mapping(address => bool)) public hasWithdrawn;

    mapping(uint256 => Dividend) internal dividends;

    uint256 public dividendNumber;

    address public admin;

    uint256[50] private __gap;
}
