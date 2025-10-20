// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import { EstateLiquidator } from "../../land/EstateLiquidator.sol";
import { ProxyCaller } from "../misc/utilities/ProxyCaller.sol";

/// @custom:oz-upgrades-unsafe-allow missing-initializer
contract MockEstateLiquidator is EstateLiquidator, ProxyCaller {
    function setFeeReceiver(address _feeReceiver) external {
        feeReceiver = _feeReceiver;
    }
}