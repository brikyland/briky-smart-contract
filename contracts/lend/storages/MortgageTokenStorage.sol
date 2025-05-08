// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IMortgageToken} from "../interfaces/IMortgageToken.sol";

abstract contract MortgageTokenStorage is IMortgageToken {
    mapping(uint256 => Loan) internal loans;

    uint256 public loanNumber;

    uint256 public commissionRate;
    uint256 public exclusiveRate;
    uint256 public feeRate;
    uint256 public royaltyRate;

    string internal baseURI;

    address public admin;
    address public commissionToken;
    address public estateToken;
    address public feeReceiver;

    uint256[50] private __gap;
}
