// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import { StakeToken } from "../../liquidity/StakeToken.sol";
import { ProxyCaller } from "../misc/utilities/ProxyCaller.sol";

/// @custom:oz-upgrades-unsafe-allow missing-initializer
contract MockStakeToken is StakeToken, ProxyCaller {}