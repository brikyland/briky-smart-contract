// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IERC1155ReceiverUpgradeable} from "@openzeppelin/contracts-upgradeable/interfaces/IERC1155ReceiverUpgradeable.sol";

interface IProjectTokenReceiver is IERC1155ReceiverUpgradeable {
    function projectToken() external view returns (address projectToken);
}
