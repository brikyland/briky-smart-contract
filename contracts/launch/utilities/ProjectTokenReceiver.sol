// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IERC165Upgradeable} from "@openzeppelin/contracts-upgradeable/interfaces/IERC165Upgradeable.sol";
import {ERC165Upgradeable} from "@openzeppelin/contracts-upgradeable/utils/introspection/ERC165Upgradeable.sol";

import {IProjectTokenReceiver} from "../../launch/interfaces/IProjectTokenReceiver.sol";

abstract contract ProjectTokenReceiver is
IProjectTokenReceiver,
ERC165Upgradeable {
    function onERC1155Received(
        address,
        address,
        uint256,
        uint256,
        bytes calldata
    ) public virtual override returns (bytes4) {
        return msg.sender == this.projectToken() ? this.onERC1155Received.selector : bytes4(0);
    }

    function onERC1155BatchReceived(
        address,
        address,
        uint256[] calldata,
        uint256[] calldata,
        bytes calldata
    ) public virtual override returns (bytes4) {
        return msg.sender == this.projectToken() ? this.onERC1155BatchReceived.selector : bytes4(0);
    }

    function supportsInterface(bytes4 _interfaceId)
    public view virtual override(
        IERC165Upgradeable,
        ERC165Upgradeable
    ) returns (bool) {
        return _interfaceId == type(IProjectTokenReceiver).interfaceId || super.supportsInterface(_interfaceId);
    }
}
