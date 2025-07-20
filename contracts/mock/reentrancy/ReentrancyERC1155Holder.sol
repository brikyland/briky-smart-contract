// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {ERC1155HolderUpgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC1155/utils/ERC1155HolderUpgradeable.sol";

import {Revert} from "../../lib/Revert.sol";

contract ReentrancyERC1155Holder is ERC1155HolderUpgradeable {
    address public reentrancyTarget;
    bytes public reentrancyData;

    function initialize() public initializer {}

    function updateReentrancyPlan(address _reentrancyTarget, bytes memory _reentrancyData) external {
        reentrancyTarget = _reentrancyTarget;
        reentrancyData = _reentrancyData;
    }

    receive() external payable {
        _reentrancy();
    }

    function _reentrancy() internal {
        if (reentrancyTarget != address(0)) {
            (bool success, bytes memory res) = reentrancyTarget.call{value: msg.value}(reentrancyData);
            if (!success) {
                Revert.revertFromReturnedData(res);
            }
        }
    }
}
