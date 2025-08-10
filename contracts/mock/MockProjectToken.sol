// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import { ProjectToken } from "../launch/ProjectToken.sol";
import { Revert } from "../lib/Revert.sol";
import { ProxyCaller } from "./common/ProxyCaller.sol";

contract MockProjectToken is ProjectToken, ProxyCaller {
}