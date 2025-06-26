// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import { Revert } from "../../lib/Revert.sol";

contract Reentrancy {
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

    function call(address _to, bytes calldata _data) external payable {
        (bool success, bytes memory res) = _to.call{value: msg.value}(_data);
        if (!success) {
            Revert.revertFromReturnedData(res);
        }
    }
}
