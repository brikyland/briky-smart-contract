// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ICommissionToken} from "../interfaces/ICommissionToken.sol";

abstract contract CommissionTokenStorage is ICommissionToken {
    uint256 public royaltyRate;

    string internal baseURI;

    address public admin;
    address public estateToken;
    address public feeReceiver;

    uint256[50] private __gap;
}
