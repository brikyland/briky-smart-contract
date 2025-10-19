// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import { Revert } from "../../common/utilities/Revert.sol";

import { ProxyCaller } from "../utilities/ProxyCaller.sol";

contract MockProvider is ProxyCaller {
    receive() external payable {}
}
