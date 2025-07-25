// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IEstateLiquidator} from "../interfaces/IEstateLiquidator.sol";

abstract contract EstateLiquidatorStorage is IEstateLiquidator {
    mapping(uint256 => mapping(address => uint256)) public withdrawAt;

    mapping(uint256 => EstateLiquidatorRequest) internal requests;

    uint256 public requestNumber;

    uint256 internal feeRate;

    address public admin;
    address public dividendHub;
    address public estateToken;
    address public feeReceiver;
    address public governanceHub;

    uint256[50] private __gap;
}
