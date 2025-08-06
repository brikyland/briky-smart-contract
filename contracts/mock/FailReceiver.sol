// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts-upgradeable/token/ERC1155/utils/ERC1155HolderUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC721/utils/ERC721HolderUpgradeable.sol";

import { Revert } from "../lib/Revert.sol";
import { ProxyCaller } from "./common/ProxyCaller.sol";

contract FailReceiver is
ERC1155HolderUpgradeable,
ERC721HolderUpgradeable,
ProxyCaller {
    bool isActive;
    bool isActiveRejectERC1155;

    function initialize(bool _isActive, bool _isActiveRejectERC1155) external initializer {
        isActive = _isActive;
        isActiveRejectERC1155 = _isActiveRejectERC1155;
    }

    receive() external payable {
        if (isActive) {
            revert("Fail");
        }
    }

    function activate(bool _isActive) external {
        isActive = _isActive;
    }
    
    function onERC1155Received(
        address,
        address,
        uint256,
        uint256,
        bytes memory
    ) public view override returns (bytes4) {
        if (isActiveRejectERC1155) {
            revert("Fail");
        }
        return this.onERC1155Received.selector;
    }

    function onERC1155BatchReceived(
        address,
        address,
        uint256[] memory,
        uint256[] memory,
        bytes memory
    ) public view override returns (bytes4) {
        if (isActiveRejectERC1155) {
            revert("Fail");
        }
        return this.onERC1155BatchReceived.selector;
    }
}
