// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts-upgradeable/token/ERC1155/utils/ERC1155HolderUpgradeable.sol";

import "../interfaces/ICommonEvents.sol";
import {Revert} from "../../lib/Revert.sol";

contract ReentrancyERC1155Holder is ERC1155HolderUpgradeable, IMockCommon {
    address public reentrancyTarget;
    bytes public reentrancyData;

    function initialize() public initializer {}

    function updateReentrancyPlan(address _reentrancyTarget, bytes memory _reentrancyData) external {
        reentrancyTarget = _reentrancyTarget;
        reentrancyData = _reentrancyData;
    }

    receive() external payable {
        (bool success, bytes memory res) = reentrancyTarget.call{value: msg.value}(reentrancyData);
        if (!success) {
            Revert.revertFromReturnedData(res);
        }
    }

    function call(address _to, bytes calldata _data) external payable {
        (bool success, bytes memory res) = _to.call{value: msg.value}(_data);
        if (!success) {
            Revert.revertFromReturnedData(res);
        }
    }
}
