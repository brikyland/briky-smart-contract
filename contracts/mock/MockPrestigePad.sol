// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import { PrestigePad } from "../launch/PrestigePad.sol";
import { Revert } from "../lib/Revert.sol";
import { ProxyCaller } from "./common/ProxyCaller.sol";

contract MockPrestigePad is PrestigePad, ProxyCaller {}