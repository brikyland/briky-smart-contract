// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {Revert} from "../../misc/utilities/Revert.sol";
import {ProxyCaller} from "../../misc/utilities/ProxyCaller.sol";

abstract contract ReentrancyBase is ProxyCaller {
    address public reentrancyTarget;
    bytes public reentrancyData;

    function updateReentrancyPlan(address _reentrancyTarget, bytes memory _reentrancyData) external {        
        reentrancyTarget = _reentrancyTarget;
        reentrancyData = _reentrancyData;
    }

    function _reentrancy() internal returns (bool) {
        if (reentrancyTarget != address(0)) {
            (bool success, bytes memory res) = reentrancyTarget.call{value: msg.value}(reentrancyData);
            if (!success) {
                Revert.revertFromReturnedData(res);
            }
            return success;
        }
        return true;
    }
}
