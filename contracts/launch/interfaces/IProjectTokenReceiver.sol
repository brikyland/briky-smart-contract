// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import {IERC1155ReceiverUpgradeable} from "@openzeppelin/contracts-upgradeable/interfaces/IERC1155ReceiverUpgradeable.sol";

/**
 *  @author Briky Team
 *
 *  @notice Interface for contract `ProjectTokenReceiver`.
 * 
 *  @notice TODO:
 */
interface IProjectTokenReceiver is
IERC1155ReceiverUpgradeable {
    /**
     *          Name            Description
     *  @return projectToken    Project token contract address.
     */
    function projectToken() external view returns (address projectToken);
}
