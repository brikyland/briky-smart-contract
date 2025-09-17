// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

/// contracts/land/interfaces/
import {ICommissionToken} from "../interfaces/ICommissionToken.sol";

/**
 *  @author Briky Team
 *
 *  @notice Storage contract for contract `CommissionToken`.
 */
abstract contract CommissionTokenStorage is
ICommissionToken {
    /// @dev    brokerCommissionRates[zone][account]
    mapping(bytes32 => mapping(address => Rate)) internal brokerCommissionRates;


    /// @dev    isActiveIn[zone][account]
    mapping(bytes32 => mapping(address => bool)) public isActiveIn;


    /// @dev    commissionRates[tokenId]
    mapping(uint256 => Rate) internal commissionRates;


    string internal baseURI;

    uint256 internal royaltyRate;

    uint256 public totalSupply;

    address public admin;
    address public estateToken;
    address public feeReceiver;

    uint256[50] private __gap;
}
