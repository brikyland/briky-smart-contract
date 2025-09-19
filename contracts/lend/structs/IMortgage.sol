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
     *  @notice Mortgage configuration and progress.
     */
    struct Mortgage {
        /// @notice Principal value.
        uint256 principal;

        /// @notice Repayment value.
        uint256 repayment;

        /// @notice Mortgaging fee.
        uint256 fee;

        /// @notice Currency address.
        address currency;

        /// @notice Maturity timestamp.
        /// @dev    In `Pending` state, `due` is the borrowing duration.
        /// @dev    After the mortgage is lent, `due` is set to the maturity timestamp.
        uint40 due;

        /// @notice Current state.
        MortgageState state;

        /// @notice Borrower address.
        address borrower;

        /// @notice Lender address.
        address lender;
    }
}
