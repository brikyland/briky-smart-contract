// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

library CommonConstant {
    uint40 internal constant INFINITE_TIMESTAMP = type(uint40).max;
    uint8 internal constant RATE_DECIMALS = 18;
    uint256 internal constant RATE_MAX_FRACTION = 10 ** RATE_DECIMALS;
}
