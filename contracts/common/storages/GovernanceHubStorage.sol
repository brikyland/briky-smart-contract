// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IGovernanceHub} from "../interfaces/IGovernanceHub.sol";

abstract contract GovernanceHubStorage is IGovernanceHub {
    mapping(uint256 => mapping(address => uint256)) public contributions;
    mapping(uint256 => mapping(address => ProposalVoteOption)) public votes;

    mapping(uint256 => bool) public isNonceUsed;
    mapping(uint256 => bool) public isGovernor;

    mapping(uint256 => Proposal) internal proposals;

    uint256 public fee;

    uint256 public proposalNumber;

    address public admin;
    address public validator;

    uint256[50] private __gap;
}
