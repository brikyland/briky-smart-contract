// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {PausableUpgradeable} from "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";

import {Pausable} from "../common/utilities/Pausable.sol";
import {IAdmin} from "../common/interfaces/IAdmin.sol";

contract MockPausable is Pausable {
    address public admin;

    string constant private VERSION = "v1.1.1";

    function initialize(address _admin) external initializer {
        admin = _admin;
    }

    function version() external pure override returns (string memory) {
        return VERSION;
    }
}
