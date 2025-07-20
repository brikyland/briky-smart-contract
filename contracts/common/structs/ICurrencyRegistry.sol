// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface ICurrencyRegistry {
    struct CurrencyRegistry {
        uint256 minUnitPrice; // deprecated
        uint256 maxUnitPrice; // deprecated
        bool isAvailable;
        bool isExclusive;
    }
}
