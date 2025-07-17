// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ICommon} from "../../common/interfaces/ICommon.sol";

interface ICommissionDispatchable is ICommon {
    event CommissionDispatch(
        address indexed receiver,
        uint256 value,
        address currency
    );

    function commissionToken() external view returns (address commissionToken);
}
