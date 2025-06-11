// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IERC165Upgradeable} from "@openzeppelin/contracts-upgradeable/interfaces/IERC165Upgradeable.sol";
import {ERC165Upgradeable} from "@openzeppelin/contracts-upgradeable/utils/introspection/ERC165Upgradeable.sol";

import {IEstateTokenReceiver} from "../interfaces/IEstateTokenReceiver.sol";

abstract contract EstateTokenReceiver is
IEstateTokenReceiver,
ERC165Upgradeable {
    function onERC1155Received(
        address,
        address,
        uint256,
        uint256,
        bytes calldata
    ) public virtual override returns (bytes4) {
        return msg.sender == this.estateToken() ? this.onERC1155Received.selector : bytes4(0);
    }

    function onERC1155BatchReceived(
        address,
        address,
        uint256[] calldata,
        uint256[] calldata,
        bytes calldata
    ) public virtual override returns (bytes4) {
        return msg.sender == this.estateToken() ? this.onERC1155BatchReceived.selector : bytes4(0);
    }

    function supportsInterface(bytes4 _interfaceId)
    public view virtual override(
        IERC165Upgradeable,
        ERC165Upgradeable
    ) returns (bool) {
        return _interfaceId == type(IEstateTokenReceiver).interfaceId || super.supportsInterface(_interfaceId);
    }
}
