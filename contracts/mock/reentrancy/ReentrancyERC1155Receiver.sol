// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {ERC1155HolderUpgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC1155/utils/ERC1155HolderUpgradeable.sol";

import {Revert} from "../../common/utilities/Revert.sol";
import {ProxyCaller} from "./../common/ProxyCaller.sol";

contract ReentrancyERC1155Receiver is ERC1155HolderUpgradeable, ProxyCaller {
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

    function onERC1155Received(
        address,
        address,
        uint256,
        uint256,
        bytes memory
    ) public override returns (bytes4) {
        _reentrancy();
        return this.onERC1155Received.selector;
    }

    function onERC1155BatchReceived(
        address,
        address,
        uint256[] memory,
        uint256[] memory,
        bytes memory
    ) public override returns (bytes4) {
        _reentrancy();
        return this.onERC1155BatchReceived.selector;
    }
}
