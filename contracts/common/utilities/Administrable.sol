// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IAdmin} from "../interfaces/IAdmin.sol";
import {ICommon} from "../interfaces/ICommon.sol";

abstract contract Administrable is ICommon {
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
}
