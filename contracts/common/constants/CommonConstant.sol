// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

library CommonConstant {
    uint40 internal constant COMMON_INFINITE_TIMESTAMP = type(uint40).max;
    uint8 internal constant COMMON_RATE_DECIMALS = 18;
    uint256 internal constant COMMON_RATE_MAX_FRACTION = 10 ** COMMON_RATE_DECIMALS;
}
