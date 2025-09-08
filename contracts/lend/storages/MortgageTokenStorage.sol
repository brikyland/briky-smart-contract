// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IMortgageToken} from "../interfaces/IMortgageToken.sol";

abstract contract MortgageTokenStorage is IMortgageToken {
    mapping(uint256 => Mortgage) internal mortgages;

    uint256 public totalSupply;
    uint256 public mortgageNumber;

    uint256 internal feeRate;

    string internal baseURI;

    address public admin;
    address public feeReceiver;

    uint256[50] private __gap;
}
