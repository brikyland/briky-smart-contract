// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IERC165Upgradeable} from "@openzeppelin/contracts-upgradeable/interfaces/IERC165Upgradeable.sol";
import {ERC165Upgradeable} from "@openzeppelin/contracts-upgradeable/utils/introspection/ERC165Upgradeable.sol";

import {IAdmin} from "../../common/interfaces/IAdmin.sol";

import {IEstateTokenizer} from "../interfaces/IEstateTokenizer.sol";

abstract contract EstateTokenizer is
IEstateTokenizer,
ERC165Upgradeable {
    modifier onlyManager() {
        if (!IAdmin(this.admin()).isManager(msg.sender)) {
            revert Unauthorized();
        }
        _;
    }

    modifier onlyExecutive() {
        if (!IAdmin(this.admin()).isExecutive(msg.sender)) {
            revert Unauthorized();
        }
        _;
    }

    function onERC1155Received(
        address _operator,
        address _from,
        uint256 _id,
        uint256 _value,
        bytes calldata _data
    ) public virtual override returns (bytes4) {
        return msg.sender == this.estateToken() ? this.onERC1155Received.selector : bytes4(0);
    }

    function onERC1155BatchReceived(
        address _operator,
        address _from,
        uint256[] calldata _ids,
        uint256[] calldata _values,
        bytes calldata _data
    ) public virtual override returns (bytes4) {
        return msg.sender == this.estateToken() ? this.onERC1155BatchReceived.selector : bytes4(0);
    }

    function supportsInterface(bytes4 _interfaceId)
    public view virtual override(IERC165Upgradeable, ERC165Upgradeable) returns (bool) {
        return _interfaceId == type(IEstateTokenizer).interfaceId || super.supportsInterface(_interfaceId);
    }
}
