// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

/**
 *  @author Briky Team
 *
 *  @notice Interface for contract `CommissionDispatchable`.
 *  @notice A `CommissionDispatchable` contract allows sharing a portion of incomes as affiliate commission, according to the
 *          commission token.
 */
interface ICommissionDispatchable {
    /** ===== EVENT ===== **/
    /**
     *  @notice Emitted when a commission is dispatched.
     *
     *          Name        Description
     *  @param  receiver    Receiver address.
     *  @param  value       Commission derived from the value.
     *  @param  currency    Currency address.
     */
    event CommissionDispatch(
        address indexed receiver,
        uint256 value,
        address currency
    );


    /** ===== FUNCTION ===== **/
    /* --- Dependency --- */
    /**
     *          Name               Description
     *  @return commissionToken    `CommissionToken` contract address.
     */
    function commissionToken() external view returns (address commissionToken);
}
