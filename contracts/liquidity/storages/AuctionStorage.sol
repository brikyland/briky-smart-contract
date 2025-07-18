// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IAuction} from "../../liquidity/interfaces/IAuction.sol";

abstract contract AuctionStorage is IAuction {
    mapping(address => uint256) public deposits;
    mapping(address => uint256) public withdrawnAmount;

    uint256 public totalToken;
    uint256 public totalDeposit;

    uint256 public endAt;
    uint256 public vestingDuration;

    address public admin;
    address public primaryToken;
    address public stakeToken1;
    address public stakeToken2;
    address public stakeToken3;

    uint256[50] private __gap;
}
