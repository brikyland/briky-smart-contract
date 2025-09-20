// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

/// @openzeppelin/contracts-upgradeable/
import {IERC1155ReceiverUpgradeable} from "@openzeppelin/contracts-upgradeable/interfaces/IERC1155ReceiverUpgradeable.sol";

/**
 *  @author Briky Team
 *
 *  @notice Interface for contract `EstateTokenReceiver`.
 * 
 *  @notice A `EstateTokenReceiver` contract always accepts ERC-1155 income tokens from the `EstateToken` contract.
 */
interface IEstateTokenReceiver is
IERC1155ReceiverUpgradeable {
    /** ===== FUNCTION ===== **/
    /* --- Dependency --- */
    /**
     *          Name            Description
     *  @return estateToken     `EstateToken` contract address.
     */
    function estateToken() external view returns (address estateToken);
}
