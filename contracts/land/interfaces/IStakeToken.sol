// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IERC20Upgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";
import {IERC20MetadataUpgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/IERC20MetadataUpgradeable.sol";

import {ICommon} from "../../common/interfaces/ICommon.sol";

interface IStakeToken is
ICommon,
IERC20Upgradeable,
IERC20MetadataUpgradeable {
    event RewardFetch(uint256 value);
    event Promotion(address indexed account, uint256 value);
    event Stake(address indexed account, uint256 value);
    event Unstake(address indexed account, uint256 value);

    error AlreadyStartedRewarding();
    error NoStakeholder();
    error NoSuccessor();
    error NotStartedRewarding();
    error NotUnlockedWithdrawing();
    error OnCoolDown();

    function admin() external view returns (address admin);
    function primaryToken() external view returns (address primaryToken);

    function lastRewardFetch() external view returns (uint256 timestamp);
    function withdrawalUnlockedAt() external view returns (uint256 timestamp);

    function fetchReward() external;
    function promote(uint256 value) external;
    function stake(address account, uint256 value) external;
    function unstake(uint256 value) external;
}
