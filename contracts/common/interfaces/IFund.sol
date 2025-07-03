// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IFund {
    struct Fund {
        address[] currencies;
        uint256[] denominations;
        uint256 totalQuantity;
        address initiator;
        bool isSufficient;
    }
}
