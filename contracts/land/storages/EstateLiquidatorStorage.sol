// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

/// contracts/land/interfaces/
import {IEstateLiquidator} from "../interfaces/IEstateLiquidator.sol";

/**
 *  @author Briky Team
 *
 *  @notice Storage contract for contract `EstateLiquidator`.
 */
abstract contract EstateLiquidatorStorage is
IEstateLiquidator {
    /// @dev    requests[requestId]
    mapping(uint256 => EstateLiquidatorRequest) internal requests;

    uint256 public requestNumber;

    address public admin;
    address public dividendHub;
    address public estateToken;
    address public feeReceiver;
    address public governanceHub;

    uint256[50] private __gap;
}
