// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IMortgage {
    enum MortgageState {
        Nil,
        Pending,
        Supplied,
        Repaid,
        Foreclosed,
        Cancelled
    }

    struct Mortgage {
        uint256 tokenId;
        uint256 amount;
        uint256 principal;
        uint256 repayment;
        address currency;
        uint40 due;
        MortgageState state;
        address borrower;
        address lender;
    }
}