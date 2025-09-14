// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

/**
 *  @author Briky Team
 *
 *  @notice Interface for struct `Mortgage`.
 */
interface IMortgage {
    /** ===== ENUM ===== **/
    /**
     *  @notice Variants of state of a mortgage.
     */
    enum MortgageState {
        /// @notice Not a mortgage.
        Nil,

        /// @notice Mortgage is created, awaiting supply.
        Pending,

        /// @notice Mortgage is supplied, awaiting either repayment or foreclosure.
        Supplied,

        /// @notice Mortgage is repaid.
        Repaid,

        /// @notice Mortgage is foreclosed.
        Foreclosed,

        /// @notice Mortgage is cancelled.
        Cancelled
    }

    /** ===== STRUCT ===== **/
    /**
     *  @notice A mortgage.
     */
    struct Mortgage {
        /// @notice Principal value.
        uint256 principal;

        /// @notice Repayment value.
        uint256 repayment;

        /// @notice Fee.
        uint256 fee;

        /// @notice Loan currency address.
        address currency;

        /// @notice Repayment due date.
        uint40 due;

        /// @notice Current state.
        MortgageState state;

        /// @notice Borrower address.
        address borrower;

        /// @notice Lender address.
        address lender;
    }
}
