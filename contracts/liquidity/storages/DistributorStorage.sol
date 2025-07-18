// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IDistributor} from "../../liquidity/interfaces/IDistributor.sol";

abstract contract DistributorStorage is IDistributor {
    address public admin;
    address public primaryToken;
    address public treasury;

    mapping(address => uint256) public distributedTokens;

    uint256[50] private __gap;
}


