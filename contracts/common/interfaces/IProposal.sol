// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IProposal {
    enum ProposalVoteOption {
        Nil,
        Approval,
        Disapproval
    }

    enum ProposalRule {
        ApprovalBeyondQuorum,
        DisapprovalBeyondQuorum
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
        string metadataUri;
        string stateUri;
        address governor;
        uint256 tokenId;
        uint256 totalWeight;
        uint256 approvalWeight;
        uint256 disapprovalWeight;
        uint256 quorum;
        address proposer;
        address operator;
        uint40 timePivot;
        uint40 due;
        ProposalRule rule;
        ProposalState state;
        uint256 budget;
        address currency;
    }
}
