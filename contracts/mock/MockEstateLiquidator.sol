// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import { EstateLiquidator } from "../land/EstateLiquidator.sol";
import { Revert } from "../common/utilities/Revert.sol";
import { ProxyCaller } from "./common/ProxyCaller.sol";

contract MockEstateLiquidator is EstateLiquidator, ProxyCaller {
    function setFeeReceiver(address _feeReceiver) external {
        feeReceiver = _feeReceiver;
    }
}