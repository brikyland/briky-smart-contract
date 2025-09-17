// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

/// contracts/land/interfaces/
import {IEstateToken} from "../interfaces/IEstateToken.sol";

/**
 *  @author Briky Team
 *
 *  @notice Storage contract for contract `EstateToken`.
 */
abstract contract EstateTokenStorage is
IEstateToken {
    /// @dev    balanceSnapshots[estateId][account]
    mapping(uint256 => mapping(address => Uint256Snapshot[])) internal balanceSnapshots;


    /// @dev    custodianURI[zone][account]
    mapping(bytes32 => mapping(address => string)) public custodianURIs;


    /// @dev    estates[estateId]
    mapping(uint256 => Estate) internal estates;


    /// @dev    zoneRoyaltyRates[zone]
    mapping(bytes32 => uint256) internal zoneRoyaltyRates;


    /// @dev    isExtractor[account]
    mapping(address => bool) public isExtractor;

    /// @dev    isTokenizer[account]
    mapping(address => bool) public isTokenizer;


    uint256 public estateNumber;

    address public admin;
    address public commissionToken;
    address public feeReceiver;

    uint256[50] private __gap;
}
