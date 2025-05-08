// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IERC20Upgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";
import {IERC20MetadataUpgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/IERC20MetadataUpgradeable.sol";

import {ICommon} from "../../common/interfaces/ICommon.sol";

interface IStakeToken is
ICommon,
IERC20Upgradeable,
IERC20MetadataUpgradeable {
    event RewardFetch(uint256 indexed day, uint256 value, uint256 returningFee);
    event Stake(address indexed account, uint256 value);
    event Unstake(address indexed account, uint256 value, uint256 fee);

    error AlreadyStartedRewarding();
    error BalanceExceeded();
    error NoStakeholder();
    error NotStartedRewarding();
    error OnCoolDown();

    function admin() external view returns (address admin);
    function primaryToken() external view returns (address primaryToken);

    function day() external view returns (uint256 day);
    function lastRewardFetch() external view returns (uint256 timestamp);
    function returningFee() external view returns (uint256 fee);

    function unstakingFeePercentage() external view returns (uint256 feePercentage);

    function fetchReward() external;
    function stake(address account, uint256 value) external;
    function unstake(uint256 value) external returns (uint256 valueAfterFee);
}
