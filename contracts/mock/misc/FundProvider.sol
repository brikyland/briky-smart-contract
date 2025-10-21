// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import { ProxyCaller } from "../misc/utilities/ProxyCaller.sol";

contract FundProvider is ProxyCaller {
    receive() external payable {}
}
