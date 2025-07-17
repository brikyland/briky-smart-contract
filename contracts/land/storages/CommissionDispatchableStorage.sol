// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ICommissionDispatchable} from "../interfaces/ICommissionDispatchable.sol";

abstract contract CommissionDispatchableStorage is ICommissionDispatchable {
    address public commissionToken;

    uint256[50] private __gap;
}
