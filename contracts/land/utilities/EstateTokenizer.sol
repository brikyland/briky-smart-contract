// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IERC165Upgradeable} from "@openzeppelin/contracts-upgradeable/interfaces/IERC165Upgradeable.sol";

import {IAdmin} from "../../common/interfaces/IAdmin.sol";

import {IEstateTokenizer} from "../interfaces/IEstateTokenizer.sol";

import {EstateTokenReceiver} from "./EstateTokenReceiver.sol";

abstract contract EstateTokenizer is
IEstateTokenizer,
EstateTokenReceiver {
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

    function supportsInterface(bytes4 _interfaceId)
    public view virtual override(IERC165Upgradeable, EstateTokenReceiver) returns (bool) {
        return _interfaceId == type(IEstateTokenizer).interfaceId || super.supportsInterface(_interfaceId);
    }
}
