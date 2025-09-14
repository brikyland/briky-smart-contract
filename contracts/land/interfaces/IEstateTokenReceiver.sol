// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

/// @openzeppelin/contracts-upgradeable/
import {IERC1155ReceiverUpgradeable} from "@openzeppelin/contracts-upgradeable/interfaces/IERC1155ReceiverUpgradeable.sol";

/**
 *  @author Briky Team
 *
 *  @notice Interface for contract `EstateTokenReceiver`.
 * 
 *  @notice TODO:
 */
interface IEstateTokenReceiver is IERC1155ReceiverUpgradeable {
    /** ===== FUNCTION ===== **/
    /**
     *          Name            Description
     *  @return estateToken     Estate token contract address.
     */
    function estateToken() external view returns (address estateToken);
}
