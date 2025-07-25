// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IStakeToken} from "../../liquidity/interfaces/IStakeToken.sol";

abstract contract StakeTokenStorage is IStakeToken {
    mapping(address => uint256) internal weights;

    uint256 public lastRewardFetch;

    uint256 internal feeRate;
    uint256 internal interestAccumulation;
    uint256 internal totalStake;

    address public admin;
    address public primaryToken;
    address public successor;

    uint256[50] private __gap;
}
