// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {Revert} from "../../common/utilities/Revert.sol";
import {ProxyCaller} from "../common/ProxyCaller.sol";

contract Reentrancy is ProxyCaller {
    address public reentrancyTarget;
    bytes public reentrancyData;

    constructor() {}

    function updateReentrancyPlan(address _reentrancyTarget, bytes memory _reentrancyData) external {        
        reentrancyTarget = _reentrancyTarget;
        reentrancyData = _reentrancyData;
    }

    receive() external payable {
        if (reentrancyTarget != address(0)) {
            (bool success, bytes memory res) = reentrancyTarget.call{value: msg.value}(reentrancyData);
            if (!success) {
                Revert.revertFromReturnedData(res);
            }
        }
    }
}
