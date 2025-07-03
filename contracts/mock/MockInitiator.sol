// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import { Revert } from "../lib/Revert.sol";

import { ProxyCaller } from "./ProxyCaller.sol";

contract MockInitiator is ProxyCaller {
    receive() external payable {}
}
