// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {PausableUpgradeable} from "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";

import {IAdmin} from "../interfaces/IAdmin.sol";
import {ICommon} from "../interfaces/ICommon.sol";

abstract contract Pausable is
ICommon,
PausableUpgradeable {
    function pause(bytes[] calldata _signatures) external whenNotPaused {
        IAdmin(this.admin()).verifyAdminSignatures(
            abi.encode(address(this), "pause"),
            _signatures
        );
        _pause();
    }

    function unpause(bytes[] calldata _signatures) external whenPaused {
        IAdmin(this.admin()).verifyAdminSignatures(
            abi.encode(address(this), "unpause"),
            _signatures
        );
        _unpause();
    }
}
