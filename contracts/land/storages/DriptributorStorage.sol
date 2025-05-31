// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IDriptributor} from "../interfaces/IDriptributor.sol";

abstract contract DriptributorStorage is IDriptributor {
    mapping(uint256 => Distribution) internal distributions;

    uint256 public distributionNumber;

    uint256 internal totalAmount;
    uint256 public distributedAmount;

    address public admin;
    address public primaryToken;
    address public stakeToken1;
    address public stakeToken2;
    address public stakeToken3;

    uint256[50] private __gap;
}
