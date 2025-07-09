// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ICommon} from "./ICommon.sol";

interface IGovernanceHub is ICommon {
    enum ProposalVoteOption {
        Nil,
        Approval,
        Disapproval,
        Neutral
    }

    enum ProposalRule {
        ApprovalBeyondQuorum,         // approval >= quorum
        ApprovalBelowQuorum,          // approval < quorum
        DisapprovalBeyondQuorum,      // disapproval >= quorum
        DisapprovalBelowQuorum        // disapproval < quorum
    }

    enum ProposalState {
        Nil,
        Pending,
        Voting,
        Executing,
        SuccessfulExecuted,
        UnsuccessfulExecuted,
        Disqualified,
        Rejected
    }

    enum ProposalVerdict {
        Unsettled,
        Passed,
        Failed
    }

    struct Proposal {
        bytes32 uuid;
        string uri;
        address governor;
        uint256 tokenId;
        uint256 totalWeight;
        uint256 approvalWeight;
        uint256 disapprovalWeight;
        uint256 neutralWeight;
        uint256 quorum;
        address proposer;
        address executor;
        uint40 admitAt;
        uint40 due;
        ProposalRule rule;
        ProposalState state;
        uint256 budget;
        address currency;
    }

    event FeeUpdate(uint256 newValue);
    event ValidatorUpdate(address newAddress);

    event NewProposal(
        address indexed governor,
        uint256 indexed proposalId,
        address indexed proposer,
        address executor,
        bytes32 uuid,
        ProposalRule rule,
        uint256 quorum,
        uint40 duration
    );
    event ProposalAdmission(
        uint256 indexed proposalId,
        string uri,
        uint256 totalWeight,
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
    event ProposalDisqualification(uint256 indexed proposalId, string uri);

    event ProposalExecutionConclusion(uint256 indexed proposalId, bool isSuccessful);
    event ProposalExecutionConfirmation(uint256 indexed proposalId);
    event ProposalExecutionRejection(uint256 indexed proposalId);
    event ProposalVote(
        uint256 indexed proposalId,
        address indexed voter,
        ProposalVoteOption indexed vote,
        uint256 weight
    );

    error ConflictedQuorum();
    error ConflictedWeight();
    error ExpiredSignature();
    error InvalidAdmitting();
    error InvalidBudgetContributing();
    error InvalidDisqualifying();
    error InvalidExecutionConcluding();
    error InvalidExecutionConfirming();
    error InvalidExecutionRejecting();
    error InvalidNonce();
    error InvalidProposalId();
    error InvalidSignature();
    error InvalidTokenId();
    error InvalidVoting();
    error NothingToWithdraw();
    error NoVotingPower();
    error Overdue();
    error Timeout();

    function fee() external view returns (uint256 fee);
    function proposalNumber() external view returns (uint256 proposalNumber);

    function validator() external view returns (address validator);

    function isNonceUsed() external view returns (bool isNonceUsed);
    function isGovernor() external view returns (bool isGovernor);

    function getProposal(uint256 proposalId) external view returns (Proposal memory proposal);
    function getProposalVerdict(uint256 proposalId) external view returns (ProposalVerdict verdict);

    function contributions(uint256 proposalId, address account) external view returns (uint256 contribution);
    function votes(uint256 proposalId, address account) external view returns (ProposalVoteOption vote);

    function admit(
        uint256 proposalId,
        string calldata uri,
        address currency,
        uint256 expiry,
        bytes calldata signature
    ) external;
    function contributeBudget(uint256 proposalId, uint256 value) external payable;
    function disqualify(
        uint256 proposalId,
        string calldata uri,
        uint256 nonce,
        uint256 expiry,
        bytes calldata signature
    ) external;
    function propose(
        uint256 tokenId,
        address proposer,
        address executor,
        bytes32 uuid,
        ProposalRule rule,
        uint256 quorum,
        uint40 duration,
        uint256 nonce,
        uint256 expiry,
        bytes calldata signature
    ) external payable returns (uint256 proposalId);
    function vote(uint256 proposalId, ProposalVoteOption option) external returns (uint256 weight);
    function withdrawBudgetContribution(uint256 proposalId) external returns (uint256 contribution);

    function concludeExecution(uint256 proposalId, bool isSuccessful) external;
    function confirmExecution(uint256 proposalId) external;
    function rejectExecution(uint256 proposalId) external;

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
