// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ICommon} from "../../common/interfaces/ICommon.sol";

interface IAuction is ICommon {
    struct Depositor {
        uint256 deposit;
        bool hasWithdrawn;
    }

    event Deposit(address indexed account, uint256 value);
    event Stake(address indexed account, uint256 amount);
    event Withdrawal(address indexed account, uint256 amount);

    error Ended();
    error NotEnded();
    error NotStarted();
    error Started();

    function admin() external view returns (address admin);
    function primaryToken() external view returns (address primaryToken);
    function stakeToken() external view returns (address stakeToken);

    function endAt() external view returns (uint256 endAt);
    function totalDeposit() external view returns (uint256 totalDeposit);
    function totalToken() external view returns (uint256 totalToken);
    function vestingDuration() external view returns (uint256 vestingDuration);

    function deposits(address account) external view returns (uint256 deposit);
    function withdrawnAmount(address account) external view returns (uint256 amount);

    function evaluatedAllocationOf(address account) external view returns (uint256 amount);

    function deposit(uint256 value) external;
    function stake() external;
    function withdraw() external;
}
