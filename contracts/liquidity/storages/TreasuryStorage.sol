// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ITreasury} from "../../liquidity/interfaces/ITreasury.sol";

abstract contract TreasuryStorage is ITreasury {
    uint256 public liquidity;
    uint256 public operationFund;

    address public admin;
    address public currency;
    address public primaryToken;

    uint256[50] private __gap;
}
