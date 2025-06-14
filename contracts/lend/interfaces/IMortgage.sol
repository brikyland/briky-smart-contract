// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IMortgage {
    enum LoanState {
        Nil,
        Pending,
        Supplied,
        Repaid,
        Foreclosed,
        Cancelled
    }

    struct Loan {
        uint256 estateId;
        uint256 mortgageAmount;
        uint256 principal;
        uint256 repayment;
        address currency;
        uint40 due;
        LoanState state;
        address borrower;
        address lender;
    }
}
