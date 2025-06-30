// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IPromotionToken} from "../interfaces/IPromotionToken.sol";

abstract contract PromotionTokenStorage is IPromotionToken {
    mapping(address => mapping(uint256 => uint256)) public mintCounts;

    mapping(uint256 => Content) internal contents;

    mapping(uint256 => uint256) internal tokenContents;

    uint256 public contentNumber;
    uint256 public tokenNumber;

    uint256 public fee;
    uint256 public royaltyRate;

    address public admin;

    uint256[50] private __gap;
}
