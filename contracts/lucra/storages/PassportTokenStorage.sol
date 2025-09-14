// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

/// contracts/lucra/interfaces/
import {IPassportToken} from "../interfaces/IPassportToken.sol";

/**
 *  @author Briky Team
 *
 *  @notice Storage contract for contract `PassportToken`.
 */
abstract contract PassportTokenStorage is
IPassportToken {
    /// @dev    hasMinted[account]
    mapping(address => bool) public hasMinted;

    string internal baseURI;

    uint256 public tokenNumber;

    uint256 public fee;

    uint256 internal royaltyRate;

    address public admin;

    uint256[50] private __gap;
}
