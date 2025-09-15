// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

/// contracts/common/interfaces/
import {IReserveVault} from "../interfaces/IReserveVault.sol";

/**
 *  @author Briky Team
 *
 *  @notice Storage contract for contract `ReserveVault`.
 */
abstract contract ReserveVaultStorage is
IReserveVault {
    /// @dev    funds[fundId]
    mapping(uint256 => Fund) internal funds;


    /// @dev    isProvider[account]
    mapping(address => bool) public isProvider;


    uint256 public fundNumber;

    address public admin;

    uint256[50] private __gap;
}
