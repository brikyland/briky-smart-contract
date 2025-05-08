// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ICommon} from "./ICommon.sol";

interface IFeeReceiver is ICommon {
    event Withdrawal(
        address indexed receiver,
        address currency,
        uint256 value
    );

    function version() external pure returns (string memory version);

    function admin() external view returns (address admin);
}
