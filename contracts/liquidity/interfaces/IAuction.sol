// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ICommon} from "../../common/interfaces/ICommon.sol";

interface IAuction is ICommon {
    event StakeTokensUpdate(
        address newAddress1,
        address newAddress2,
        address newAddress3
    );

    event Deposit(address indexed account, uint256 value);
    event Stake(
        address indexed account,
        uint256 stake1,
        uint256 stake2,
        uint256 stake3
    );
    event Withdrawal(address indexed account, uint256 amount);

    error AlreadyEnded();
    error AlreadyStarted();
    error NotAssignedStakeTokens();
    error NotEnded();
    error NotStarted();

    function primaryToken() external view returns (address primaryToken);
    function stakeToken1() external view returns (address stakeToken1);
    function stakeToken2() external view returns (address stakeToken2);
    function stakeToken3() external view returns (address stakeToken3);

    function endAt() external view returns (uint256 endAt);
    function totalDeposit() external view returns (uint256 totalDeposit);
    function totalToken() external view returns (uint256 totalToken);
    function vestingDuration() external view returns (uint256 vestingDuration);

    function deposits(address account) external view returns (uint256 deposit);
    function withdrawnAmount(address account) external view returns (uint256 amount);

    function allocationOf(address account) external view returns (uint256 amount);

    function deposit(uint256 value) external;
    function stake(uint256 stake1, uint256 stake2) external returns (uint256 stake3);
    function withdraw() external returns (uint256 amount);
}
