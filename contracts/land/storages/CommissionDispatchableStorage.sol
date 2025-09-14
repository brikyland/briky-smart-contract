// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

/// contracts/land/interfaces/
import {ICommissionDispatchable} from "../interfaces/ICommissionDispatchable.sol";

/**
 *  @author Briky Team
 *
 *  @notice Storage contract for contract `CommissionDispatchable`.
 */
abstract contract CommissionDispatchableStorage is
ICommissionDispatchable {
    address public commissionToken;

    uint256[50] private __gap;
}
