// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IERC1155ReceiverUpgradeable} from "@openzeppelin/contracts-upgradeable/interfaces/IERC1155ReceiverUpgradeable.sol";

import {IEstate} from "./IEstate.sol";

interface IEstateTokenReceiver is
IEstate,
IERC1155ReceiverUpgradeable {
    function estateToken() external view returns (address estateToken);
}
