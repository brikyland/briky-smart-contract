// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ICommon} from "./ICommon.sol";

interface IGovernanceHub is ICommon {
    enum Vote {
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
        Pending,        // admin qualifying and define budget
        Voting,         // after admin qualify/ holder voting
        Executing,      // operator executing
        Accomplished,   // operator executed successfully
        Deprecated      // admin disqualified/ failed vote/ not enough budget/ operator executed failed
    }

    enum ProposalVerdict {
        Nil,
        Unsettled,
        Passed,
        Failed
    }

    struct Proposal {
        string uuid;            // uuid -> hash(raw-context)  <- user calls
        string uri;             // uri -> raw-context   <- manager calls
        address governor;
        uint256 tokenId;
        uint256 totalWeight;
        uint256 approvalWeight;
        uint256 disapprovalWeight;
        uint256 neutralWeight;
        uint256 quorum;
        address proposer;
        uint40 permitAt;
        uint40 due;
        ProposalRule rule;
        ProposalState state;
        uint256 budget;         // required money
        uint256 fund;           // raised money
        address currency;
    }

    event FeeUpdate(uint256 newValue);
    event ValidatorUpdate(address newAddress);

    error InvalidProposalId();

    // function propose(uuid, ..., signature)
    // function permit(id, uri, budget, currency, anchor) // anchor = hash(raw-context from uri)
    // function vote(...)
    // function donate(...)
}
