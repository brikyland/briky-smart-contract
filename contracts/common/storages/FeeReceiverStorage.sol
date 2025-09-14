// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

/// contracts/common/interfaces/
import {IFeeReceiver} from "../interfaces/IFeeReceiver.sol";

/**
 *  @author Briky Team
 *
 *  @notice Storage contract for contract `FeeReceiver`.
 */
abstract contract FeeReceiverStorage is
IFeeReceiver {
    address public admin;

    uint256[50] private __gap;
}
