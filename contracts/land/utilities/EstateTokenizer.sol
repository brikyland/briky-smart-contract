// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import {ERC165Upgradeable} from "@openzeppelin/contracts-upgradeable/utils/introspection/ERC165Upgradeable.sol";
import {IERC165Upgradeable} from "@openzeppelin/contracts-upgradeable/utils/introspection/IERC165Upgradeable.sol";

import {IEstateTokenizer} from "../interfaces/IEstateTokenizer.sol";

abstract contract EstateTokenizer is
IEstateTokenizer,
ERC165Upgradeable {
    function supportsInterface(bytes4 _interfaceId) public view virtual
    override(IERC165Upgradeable, ERC165Upgradeable) returns (bool) {
        return _interfaceId == type(IEstateTokenizer).interfaceId || super.supportsInterface(_interfaceId);
    }
}
