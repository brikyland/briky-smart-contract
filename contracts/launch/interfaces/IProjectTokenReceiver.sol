// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

/// @openzeppelin/contracts-upgradeable
import {IERC1155ReceiverUpgradeable} from "@openzeppelin/contracts-upgradeable/interfaces/IERC1155ReceiverUpgradeable.sol";

/**
 *  @author Briky Team
 *
 *  @notice Interface for contract `ProjectTokenReceiver`.
 * 
 *  @notice A `ProjectTokenReceiver` contract always accepts ERC-1155 income tokens from the `ProjectToken` contract.
 */
interface IProjectTokenReceiver is
IERC1155ReceiverUpgradeable {
    /** ===== FUNCTION ===== **/
    /* --- Dependency --- */
    /**
     *          Name            Description
     *  @return projectToken    `ProjectToken` contract address.
     */
    function projectToken() external view returns (address projectToken);
}
