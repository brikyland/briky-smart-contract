// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IGovernanceHub} from "../interfaces/IGovernanceHub.sol";

abstract contract GovernanceHubStorage is IGovernanceHub {
    mapping(uint256 => mapping(address => uint256)) public contributions;
    mapping(uint256 => mapping(address => ProposalVoteOption)) public voteOptions;

    mapping(uint256 => Proposal) internal proposals;

    uint256 public fee;

    uint256 public proposalNumber;

    address public admin;

    uint256[50] private __gap;
}
