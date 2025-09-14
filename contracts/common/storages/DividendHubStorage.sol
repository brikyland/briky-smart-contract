// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

/// contracts/common/interfaces/
import {IDividendHub} from "../interfaces/IDividendHub.sol";

/**
 *  @author Briky Team
 *
 *  @notice Storage contract for contract `DividendHub`.
 */
abstract contract DividendHubStorage is
IDividendHub {
    /// @dev    withdrawAt[dividendId][account]
    mapping(uint256 => mapping(address => uint256)) public withdrawAt;


    /// @dev    dividends[dividendId]
    mapping(uint256 => Dividend) internal dividends;


    uint256 public dividendNumber;

    address public admin;

    uint256[50] private __gap;
}
