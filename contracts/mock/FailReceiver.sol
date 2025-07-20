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

    function initialize(bool _isActive) external initializer {
        isActive = _isActive;
    }

    receive() external payable {
        if (isActive) {
            revert("Fail");
        }
    }

    function activate(bool _isActive) external {
        isActive = _isActive;
    }
}
