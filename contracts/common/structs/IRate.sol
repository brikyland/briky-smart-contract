// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

interface IRate {
    struct Rate {
        uint256 value;
        uint8 decimals;
    }

    error InvalidRate();
}
