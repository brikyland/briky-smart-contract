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

        /// @notice Contract has secured the collateral. The borrower waits for a lender.
        Pending,

        /// @notice A lender has supplied the principal to the borrower and waits for either repayment or foreclosure.
        Supplied,

        /// @notice The borrower has repaid the repayment to the lender and retrieve the collateral.
        Repaid,

        /// @notice The lender has foreclosed on the collateral.
        Foreclosed,

        /// @notice Cancelled.
        Cancelled
    }


    /** ===== STRUCT ===== **/
    /**
     *  @notice Mortgage information.
     */
    struct Mortgage {
        /// @notice Principal value.
        uint256 principal;

        /// @notice Repayment value.
        uint256 repayment;

        /// @notice Borrowing fee.
        uint256 fee;

        /// @notice Currency address.
        address currency;

        /// @notice Due of mortgage.
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
