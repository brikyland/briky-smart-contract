// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// contracts/common/interfaces/
import {IGovernanceHub} from "../interfaces/IGovernanceHub.sol";

/**
 *  @author Briky Team
 *
 *  @notice Storage contract for contract `GovernanceHub`.
 */
abstract contract GovernanceHubStorage is IGovernanceHub {
    /// @dev    contributions[proposalId][account]
    mapping(uint256 => mapping(address => uint256)) public contributions;

    /// @dev    voteOptions[proposalId][account]
    mapping(uint256 => mapping(address => ProposalVoteOption)) public voteOptions;


    /// @dev    proposals[proposalId]
    mapping(uint256 => Proposal) internal proposals;

    uint256 public fee;

    uint256 public proposalNumber;

    address public admin;

    uint256[50] private __gap;
}
