// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IFeeReceiver} from "../interfaces/IFeeReceiver.sol";

abstract contract FeeReceiverStorage is IFeeReceiver {
    address public admin;

    uint256[50] private __gap;
}
