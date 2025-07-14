// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ICommon} from "./ICommon.sol";
import {IProposal} from "./IProposal.sol";
import {IValidatable} from "./IValidatable.sol";

interface IGovernanceHub is
ICommon,
IProposal,
IValidatable {
    event FeeUpdate(uint256 newValue);

    event NewProposal(
        address indexed governor,
        uint256 indexed proposalId,
        address indexed proposer,
        bytes32 uuid,
        address operator,
        ProposalRule rule,
        uint256 quorumRate,
        uint40 duration,
        uint40 admissionExpiry
    );
    event ProposalAdmission(
        uint256 indexed proposalId,
        string metadataUri,
        string stateUri,
        uint256 totalWeight,
        uint256 quorum,
        uint256 budget,
        address currency
    );
    event ProposalBudgetContribution(
        uint256 indexed proposalId,
        address indexed contributor,
        uint256 value
    );
    event ProposalBudgetContributionWithdrawal(
        uint256 indexed proposalId,
        address indexed contributor,
        uint256 value
    );
    event ProposalDisqualification(
        uint256 indexed proposalId,
        string metadataUri,
        string stateUri
    );
    event ProposalVote(
        uint256 indexed proposalId,
        address indexed voter,
        ProposalVoteOption indexed voteOption,
        uint256 weight
    );

    event ProposalExecutionConclusion(
        uint256 indexed proposalId,
        string resultUri,
        bool isSuccessful
    );
    event ProposalExecutionConfirmation(uint256 indexed proposalId);
    event ProposalExecutionRejection(uint256 indexed proposalId);
    event ProposalExecutionUpdate(uint256 indexed proposalId, string stateUri);

    error AlreadyVoted();
    error ConflictedQuorum();
    error ConflictedWeight();
    error InvalidAdmitting();
    error InvalidBudgetContributing();
    error InvalidBudgetContributionWithdrawing();
    error InvalidDisqualifying();
    error InvalidExecutionConcluding();
    error InvalidExecutionConfirming();
    error InvalidExecutionRejecting();
    error InvalidExecutionUpdating();
    error InvalidGovernor();
    error InvalidProposalId();
    error InvalidTokenId();
    error InvalidVoting();
    error NothingToWithdraw();
    error NoVotingPower();
    error Overdue();
    error Timeout();

    function fee() external view returns (uint256 fee);
    function proposalNumber() external view returns (uint256 proposalNumber);

    function isGovernor(address account) external view returns (bool isGovernor);

    function getProposal(uint256 proposalId) external view returns (Proposal memory proposal);
    function getProposalState(uint256 proposalId) external view returns (ProposalState state);
    function getProposalVerdict(uint256 proposalId) external view returns (ProposalVerdict verdict);

    function contributions(uint256 proposalId, address account) external view returns (uint256 contribution);
    function voteOptions(uint256 proposalId, address account) external view returns (ProposalVoteOption vote);

    function propose(
        address governor,
        uint256 tokenId,
        address executor,
        bytes32 uuid,
        ProposalRule rule,
        uint256 quorum,
        uint40 duration,
        Validation calldata signature
    ) external payable returns (uint256 proposalId);

    function admit(
        uint256 proposalId,
        string calldata metadataUri,
        Validation calldata signature
    ) external;
    function contributeBudget(uint256 proposalId, uint256 value) external payable;
    function disqualify(
        uint256 proposalId,
        string calldata metadataUri,
        Validation calldata signature
    ) external;
    function vote(uint256 proposalId, ProposalVoteOption option) external returns (uint256 weight);
    function withdrawBudgetContribution(uint256 proposalId) external returns (uint256 contribution);

    function concludeExecution(
        uint256 proposalId,
        string calldata resultUri,
        bool isSuccessful,
        Validation calldata validation
    ) external;
    function confirmExecution(uint256 proposalId) external;
    function rejectExecution(uint256 proposalId) external;
    function updateExecution(
        uint256 proposalId,
        string calldata _stateUri,
        Validation calldata _validation
    ) external;

    function safeVote(
        uint256 proposalId,
        ProposalVoteOption option,
        bytes32 anchor
    ) external returns (uint256 weight);
    function safeContributeBudget(
        uint256 proposalId,
        uint256 value,
        bytes32 anchor
    ) external payable;
}
