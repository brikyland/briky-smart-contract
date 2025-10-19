// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import { ProxyCaller } from "../utilities/ProxyCaller.sol";

contract MockProvider is ProxyCaller {
    receive() external payable {}
}
