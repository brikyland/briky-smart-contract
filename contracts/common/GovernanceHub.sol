// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ReentrancyGuardUpgradeable} from "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";

import {CurrencyHandler} from "../lib/CurrencyHandler.sol";

import {IAdmin} from "./interfaces/IAdmin.sol";
import {IGovernor} from "./interfaces/IGovernor.sol";

import {GovernanceHubStorage} from "./storages/GovernanceHubStorage.sol";

import {Pausable} from "./utilities/Pausable.sol";
import {Administrable} from "../common/utilities/Administrable.sol";

abstract contract GovernanceHub is
GovernanceHubStorage,
Administrable,
Pausable,
ReentrancyGuardUpgradeable {
    string constant private VERSION = "v1.1.1";

    modifier validProposal(uint256 _proposalId) {
        if (_proposalId == 0 || _proposalId > proposalNumber) {
            revert InvalidProposalId();
        }
        _;
    }

    receive() external payable {}

    function initialize(
        address _admin,
        uint256 _fee
    ) external initializer {
        __Pausable_init();
        __ReentrancyGuard_init();

        admin = _admin;
        fee = _fee;
    }

    function version() external pure returns (string memory) {
        return VERSION;
    }

    function updateFee(
        uint256 _fee,
        bytes[] calldata _signature
    ) external {
        IAdmin(admin).verifyAdminSignatures(
            abi.encode(
                address(this),
                "updateFee",
                _fee
            ),
            _signature
        );
        fee = _fee;
        emit FeeUpdate(_fee);
    }

    function updateValidator(
        address _validator,
        bytes[] calldata _signature
    ) external {
        IAdmin(admin).verifyAdminSignatures(
            abi.encode(
                address(this),
                "updateValidator",
                _validator
            ),
            _signature
        );
        validator = _validator;
        emit ValidatorUpdate(_validator);
    }

    function getProposal(uint256 _proposalId)
    external view validProposal(_proposalId) returns (Proposal memory) {
        return proposals[_proposalId];
    }

    // TODO: is nonReentrant needed?
    function propose(
        string memory _uuid,
        uint256 _tokenId,
        uint256 _quorum,
        address _proposer,
        uint40 _votingDuration,
        uint40 _executingDuration,
        ProposalRule _rule,
        bytes memory _signature
    ) external whenNotPaused returns (uint256) {
        if (!IAdmin(admin).isGovernor(msg.sender)) {
            revert Unauthorized();
        }

        if (!IGovernor(msg.sender).isAvailable(_tokenId)) {
            revert InvalidTokenId();
        }

        // TODO: check _quorum > 0?

        uint256 proposalId = ++proposalNumber;

        Proposal storage proposal = proposals[proposalId];
        proposal.uuid = _uuid;
        proposal.governor = msg.sender;
        proposal.tokenId = _tokenId;
        proposal.quorum = _quorum;
        proposal.proposer = _proposer;
        proposal.rule = _rule;
        proposal.state = ProposalState.Pending;
        proposal.votingDue = _votingDuration;
        proposal.executingDue = _executingDuration;

        emit NewProposal(
            proposalId,
            _uuid,
            msg.sender,
            _tokenId,
            _quorum,
            _proposer,
            _rule,
            _votingDuration,
            _executingDuration
        );

        return proposalId;
    }

    // TODO: is nonReentrant needed?
    function permit(
        uint256 _proposalId,
        string memory _uri,
        uint256 _budget,
        address _currency,
        string calldata _anchor
    ) external onlyManager validProposal(_proposalId) whenNotPaused {
        Proposal storage proposal = proposals[_proposalId];

        if (keccak256(bytes(_anchor)) != keccak256(bytes(proposal.uuid))) {
            revert BadAnchor();
        }
        if (proposal.state != ProposalState.Pending) {
            revert InvalidPermitting();
        }

        // TODO: check _budget > 0?

        uint256 totalWeight = IGovernor(proposal.governor).totalVoteAt(
            proposal.tokenId,
            block.timestamp
        );

        proposal.uri = _uri;
        proposal.totalWeight = totalWeight;
        proposal.permitAt = uint40(block.timestamp);
        proposal.state = ProposalState.Voting;
        proposal.budget = _budget;
        proposal.currency = _currency;
        proposal.votingDue = uint40(block.timestamp) + proposal.votingDue;

        emit ProposalPermit(
            _proposalId,
            _uri,
            totalWeight,
            block.timestamp,
            _budget,
            _currency
        );
    }

    function reject(
        uint256 _proposalId,
        string memory _uri,
        string memory _anchor
    ) external onlyManager validProposal(_proposalId) whenNotPaused {
        Proposal storage proposal = proposals[_proposalId];

        if (keccak256(bytes(_anchor)) != keccak256(bytes(proposal.uuid))) {
            revert BadAnchor();
        }
        if (proposal.state != ProposalState.Pending) {
            revert InvalidRejecting();
        }

        proposal.uri = _uri;
        proposal.state = ProposalState.Deprecated;

        emit ProposalReject(
            _proposalId,
            _uri
        );
    }

    // TODO: is nonReentrant needed?
    function vote(
        uint256 _proposalId,
        Vote _vote,
        string memory _anchor
    ) external validProposal(_proposalId) whenNotPaused {
        Proposal storage proposal = proposals[_proposalId];

        if (keccak256(bytes(_anchor)) != keccak256(bytes(proposal.uuid))) {
            revert BadAnchor();
        }
        if (proposal.state != ProposalState.Voting || _vote == Vote.Nil) {
            revert InvalidVoting();
        }
        if (proposal.votingDue <= block.timestamp) {
            revert VotingEnded();
        }

        uint256 weight = IGovernor(proposal.governor).voteOfAt(
            msg.sender,
            proposal.tokenId,
            proposal.permitAt
        );
        if (weight == 0) {
            revert NoVotingPower();
        }

        if (_vote == Vote.Approval) {
            proposal.approvalWeight += weight;
        } else if (_vote == Vote.Disapproval) {
            proposal.disapprovalWeight += weight;
        } else if (_vote == Vote.Neutral) {
            proposal.neutralWeight += weight;
        }

        ProposalVerdict verdict = _calculateVerdict(
            proposal.totalWeight,
            proposal.approvalWeight,
            proposal.disapprovalWeight,
            proposal.neutralWeight,
            proposal.quorum,
            proposal.rule
        );

        if (verdict == ProposalVerdict.Passed) {
            proposal.state = ProposalState.Executing;
            proposal.executingDue = uint40(block.timestamp) + proposal.executingDue;
        } else if (verdict == ProposalVerdict.Failed) {
            proposal.state = ProposalState.Deprecated;
        }

        emit ProposalVote(
            _proposalId,
            msg.sender,
            _vote,
            verdict
        );
    }

    function closeVoting(
        uint256 _proposalId
    ) external validProposal(_proposalId) whenNotPaused {
        Proposal storage proposal = proposals[_proposalId];
        if (proposal.state != ProposalState.Voting) {
            revert InvalidClosing();
        }
        if (proposal.votingDue > block.timestamp) {
            revert VotingNotEnded();
        }
        proposal.state = ProposalState.Deprecated;
        emit ProposalVotingClose(_proposalId);
    }

    function contribute(
        uint256 _proposalId,
        uint256 _value
    ) external payable nonReentrant validProposal(_proposalId) whenNotPaused {
        Proposal storage proposal = proposals[_proposalId];
        if (proposal.state != ProposalState.Executing) {
            revert InvalidContributing();
        }
        if (proposal.executingDue <= block.timestamp) {
            revert ExecutingEnded();
        }

        address currency = proposal.currency;        
        if (currency == address(0)) {
            CurrencyHandler.receiveNative(_value);
        } else {
            CurrencyHandler.receiveERC20(currency, _value);
        }
        proposal.fund += _value;

        emit ProposalContribute(
            _proposalId,
            _value
        );
    }

    function _calculateVerdict(
        uint256 _totalWeight,
        uint256 _approvalWeight,
        uint256 _disapprovalWeight,
        uint256 _neutralWeight,
        uint256 _quorum,
        ProposalRule _rule
    ) internal pure returns (ProposalVerdict) {
        if (_rule == ProposalRule.ApprovalBeyondQuorum && _approvalWeight >= _quorum) {
            return ProposalVerdict.Passed;
        }
        if (_rule == ProposalRule.ApprovalBelowQuorum && _disapprovalWeight + _neutralWeight > _totalWeight - _quorum) {
            return ProposalVerdict.Failed;
        }
        if (_rule == ProposalRule.DisapprovalBeyondQuorum && _disapprovalWeight >= _quorum) {
            return ProposalVerdict.Failed;
        }
        if (_rule == ProposalRule.DisapprovalBelowQuorum && _approvalWeight + _neutralWeight > _totalWeight - _quorum) {
            return ProposalVerdict.Passed;
        }
        return ProposalVerdict.Unsettled;
    }
}
