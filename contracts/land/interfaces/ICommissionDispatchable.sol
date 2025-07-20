// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface ICommissionDispatchable {
    event CommissionDispatch(
        address indexed receiver,
        uint256 value,
        address currency
    );

    function commissionToken() external view returns (address commissionToken);
}
