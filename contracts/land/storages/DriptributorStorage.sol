// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IDriptributor} from "../interfaces/IDriptributor.sol";

abstract contract DriptributorStorage is IDriptributor {
    mapping(uint256 => Distribution) internal distributions;

    uint256 public totalAmount;
    uint256 public distributedAmount;
    uint256 public distributionNumber;

    address public admin;
    address public primaryToken;
    address public stakeToken;

    uint256[50] private __gap;
}
