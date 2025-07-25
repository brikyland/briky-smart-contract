// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IReserveVault} from "../interfaces/IReserveVault.sol";

abstract contract ReserveVaultStorage is IReserveVault {
    mapping(address => bool) public isProvider;

    mapping(uint256 => Fund) internal funds;

    uint256 public fundNumber;

    address public admin;

    uint256[50] private __gap;
}
