// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import { EstateForger } from "../../land/EstateForger.sol";
import { ProxyCaller } from "../utilities/ProxyCaller.sol";

contract MockEstateForger is EstateForger, ProxyCaller {
    function setFeeReceiver(address _feeReceiver) external {
        feeReceiver = _feeReceiver;
    }
}