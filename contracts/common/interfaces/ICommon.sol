// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface ICommon {
    struct CurrencyRegistry {
        uint256 unitPriceLowerBound; // deprecated
        uint256 unitPriceUpperBound; // deprecated
        bool isAvailable;
        bool isExclusive;
    }
    
    error InsufficientFunds();
    error InvalidCurrency();
    error InvalidInput();
    error InvalidPercentage();
    error InvalidUpdating();
    error Unauthorized();

    function version() external pure returns (string memory version);
}
