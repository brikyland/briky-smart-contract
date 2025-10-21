// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts-upgradeable/token/ERC1155/utils/ERC1155HolderUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC721/utils/ERC721HolderUpgradeable.sol";

import { ProxyCaller } from "../misc/utilities/ProxyCaller.sol";

contract FailReceiver is
ERC1155HolderUpgradeable,
ERC721HolderUpgradeable,
ProxyCaller {
    bool public isActive;
    bool public isActiveRejectERC1155;

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

    function activateRejectERC1155(bool _isActiveRejectERC1155) external {
        isActiveRejectERC1155 = _isActiveRejectERC1155;
    }
    
    function onERC1155Received(
        address _operator,
        address _from,
        uint256 _id,
        uint256 _value,
        bytes memory _data
    ) public override returns (bytes4) {
        if (isActiveRejectERC1155) {
            revert("Fail");
        }
        return super.onERC1155Received(_operator, _from, _id, _value, _data);
    }

    function onERC1155BatchReceived(
        address _operator,
        address _from,
        uint256[] memory _ids,
        uint256[] memory _values,
        bytes memory _data
    ) public override returns (bytes4) {
        if (isActiveRejectERC1155) {
            revert("Fail");
        }
        return super.onERC1155BatchReceived(_operator, _from, _ids, _values, _data);
    }
}
