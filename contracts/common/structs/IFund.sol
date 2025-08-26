// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IFund {
    struct Fund {
        address[] extraCurrencies;
        uint256[] extraDenominations;
        address mainCurrency;
        uint256 mainDenomination;
        uint256 quantity;
        address provider;
        bool isSufficient;
    }
}
