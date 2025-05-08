// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IStakeToken} from "../interfaces/IStakeToken.sol";

abstract contract StakeTokenStorage is IStakeToken {
    mapping(address => uint256) internal weights;
    mapping(address => mapping(address => uint256)) public allowance;

    uint256 public returningFee;
    uint256 internal interestAccumulation;
    uint256 public totalSupply;

    string public name;
    string public symbol;

    uint256 public day;
    uint256 public lastRewardFetch;

    address public admin;
    address public primaryToken;

    uint256[50] private __gap;
}
