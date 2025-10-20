// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {ERC1155HolderUpgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC1155/utils/ERC1155HolderUpgradeable.sol";

import {ReentrancyBase} from "./utilities/ReentrancyBase.sol";

contract ReentrancyReceiver is
ReentrancyBase,
ERC1155HolderUpgradeable {
    bool public isTriggeredOnReceive;
    bool public isTriggeredOnERC1155Receive;

    function initialize(
        bool _isTriggeredOnReceive,
        bool _isTriggeredOnERC1155Receive
    ) public initializer {
        isTriggeredOnReceive = _isTriggeredOnReceive;
        isTriggeredOnERC1155Receive = _isTriggeredOnERC1155Receive;
    }

    receive() external payable {
        if (isTriggeredOnReceive) {
            _reentrancy();
        }
    }

    function onERC1155Received(
        address _operator,
        address _from,
        uint256 _id,
        uint256 _value,
        bytes memory _data
    ) public override returns (bytes4) {
        if (isTriggeredOnERC1155Receive) {
            _reentrancy();
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
        if (isTriggeredOnERC1155Receive) {
            _reentrancy();
        }
        return super.onERC1155BatchReceived(_operator, _from, _ids, _values, _data);
    }
}
