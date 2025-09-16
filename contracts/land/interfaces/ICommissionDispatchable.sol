// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

/**
 *  @author Briky Team
 *
 *  @notice TODO: A `CommissionDispatchable` contract dispatches commissions to the receiver corresponding to the commission token.
 */
interface ICommissionDispatchable {
    /** ===== EVENT ===== **/
    /**
     *  @notice Emitted when a commission is dispatched.
     *
     *          Name        Description
     *  @param  receiver    Receiver address.
     *  @param  value       Commission value.
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
     *  @notice Get the commission token contract address.
     *
     *          Name               Description
     *  @return commissionToken    Commission token contract address.
     */
    function commissionToken() external view returns (address commissionToken);
}
