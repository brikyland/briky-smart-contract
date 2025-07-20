// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IERC165Upgradeable} from "@openzeppelin/contracts-upgradeable/interfaces/IERC165Upgradeable.sol";

import {Administrable} from "../../common/utilities/Administrable.sol";

import {IProjectLaunchpad} from "../interfaces/IProjectLaunchpad.sol";

import {ProjectTokenReceiver} from "./ProjectTokenReceiver.sol";

abstract contract ProjectLaunchpad is
IProjectLaunchpad,
Administrable,
ProjectTokenReceiver {
    function supportsInterface(bytes4 _interfaceId)
    public view virtual override(IERC165Upgradeable, ProjectTokenReceiver) returns (bool) {
        return _interfaceId == type(IProjectLaunchpad).interfaceId || super.supportsInterface(_interfaceId);
    }
}
