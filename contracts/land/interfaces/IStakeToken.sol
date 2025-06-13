// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IExclusiveToken} from "./IExclusiveToken.sol";

interface IStakeToken is IExclusiveToken {
    event FeeRateUpdate(uint256 newValue);

    event RewardFetch(uint256 value);
    event Promotion(address indexed account, uint256 value);
    event Stake(address indexed account, uint256 value);
    event Unstake(address indexed account, uint256 value);

    error AlreadyStartedRewarding();
    error InvalidPromoting();
    error NoStakeholder();
    error NoSuccessor();
    error NotStartedRewarding();
    error NotCompletedRewarding();
    error OnCoolDown();

    function primaryToken() external view returns (address primaryToken);

    function lastRewardFetch() external view returns (uint256 timestamp);

    function getFeeRate() external view returns (Rate memory rate);

    function fetchReward() external;

    function promote(uint256 value) external;
    function stake(address account, uint256 value) external;
    function unstake(uint256 value) external;
}
