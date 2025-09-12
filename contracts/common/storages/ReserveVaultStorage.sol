// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// contracts/common/interfaces/
import {IReserveVault} from "../interfaces/IReserveVault.sol";

/**
 *  @author Briky Team
 *
 *  @notice Storage contract for contract `ReserveVault`.
 */
abstract contract ReserveVaultStorage is IReserveVault {
    /// @dev    isProvider[account]
    mapping(address => bool) public isProvider;

    /// @dev    funds[fundId]
    mapping(uint256 => Fund) internal funds;

    uint256 public fundNumber;

    address public admin;

    uint256[50] private __gap;
}
