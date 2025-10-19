// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import { StakeToken } from "../../liquidity/StakeToken.sol";
import { ProxyCaller } from "../utilities/ProxyCaller.sol";

contract MockStakeToken is StakeToken, ProxyCaller {}