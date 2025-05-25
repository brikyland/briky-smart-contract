// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IStakeToken} from "../interfaces/IStakeToken.sol";

abstract contract StakeTokenStorage is IStakeToken {
    mapping(address => uint256) internal weights;
    mapping(address => mapping(address => uint256)) public allowance;

    string public name;
    string public symbol;

    uint256 internal interestAccumulation;

    uint256 public totalSupply;
    uint256 public lastRewardFetch;
    uint256 internal feeRate;

    address public admin;
    address public primaryToken;
    address public successor;

    uint256[50] private __gap;
}
