// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ReentrancyGuardUpgradeable} from "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";

import {Constant} from "../lib/Constant.sol";
import {CurrencyHandler} from "../lib/CurrencyHandler.sol";
import {Signature} from "../lib/Signature.sol";

import {IAdmin} from "./interfaces/IAdmin.sol";
import {IGovernor} from "./interfaces/IGovernor.sol";

import {GovernanceHubStorage} from "./storages/GovernanceHubStorage.sol";

import {Administrable} from "./utilities/Administrable.sol";
import {Pausable} from "./utilities/Pausable.sol";

abstract contract GovernanceHub is
GovernanceHubStorage,
Administrable,
Pausable,
ReentrancyGuardUpgradeable {
    using CurrencyHandler for uint256;

    string constant private VERSION = "v1.1.1";

    modifier validProposal(uint256 _proposalId) {
        if (_proposalId == 0 || _proposalId > proposalNumber) {
            revert InvalidProposalId();
        }
        _;
    }

    modifier onlyExecutor(uint256 _proposalId) {
        if (msg.sender != proposals[_proposalId].executor) {
            revert Unauthorized();
        }
        _;
    }

    receive() external payable {}

    function initialize(
        address _admin,
        address _validator,
        uint256 _fee
    ) external initializer {
        __Pausable_init();
        __ReentrancyGuard_init();

        admin = _admin;
        validator = _validator;
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

    function getProposalVerdict(uint256 _proposalId)
    external view validProposal(_proposalId) returns (ProposalVerdict) {
        return _votingVerdict(proposals[_proposalId]);
    }

    function propose(
        uint256 _tokenId,
        address _proposer,
        address _executor,
        bytes32 _uuid,
        ProposalRule _rule,
        uint256 _quorum,
        uint40 _duration,
        uint256 _nonce,
        uint256 _expiry,
        bytes calldata _signature
    ) external payable whenNotPaused returns (uint256) {
        if (!IAdmin(admin).isGovernor(msg.sender)) {
            revert Unauthorized();
        }

        _validate(
            abi.encode(
                msg.sender,
                _tokenId,
                _proposer,
                _executor,
                _uuid,
                _rule,
                _quorum,
                _duration
            ),
            _nonce,
            _expiry,
            _signature
        );

        if (!IGovernor(msg.sender).isAvailable(_tokenId)) {
            revert InvalidTokenId();
        }

        CurrencyHandler.receiveNative(fee);

        uint256 proposalId = ++proposalNumber;
        Proposal storage proposal = proposals[proposalId];

        proposal.governor = msg.sender;
        proposal.tokenId = _tokenId;
        proposal.proposer = _proposer;
        proposal.executor = _executor;
        proposal.uuid = _uuid;
        proposal.rule = _rule;
        proposal.quorum = _quorum;
        proposal.due = _duration;
        proposal.state = ProposalState.Pending;

        emit NewProposal(
            msg.sender,
            proposalId,
            _proposer,
            _executor,
            _uuid,
            _rule,
            _quorum,
            _duration
        );

        return proposalId;
    }

    function admit(
        uint256 _proposalId,
        string calldata _uri,
        address _currency,
        uint256 _nonce,
        uint256 _expiry,
        bytes calldata _signature
    ) external onlyExecutive validProposal(_proposalId) whenNotPaused {
        _validate(
            abi.encode(
                _proposalId,
                _uri,
                _currency
            ),
            _nonce,
            _expiry,
            _signature
        );

        Proposal storage proposal = proposals[_proposalId];
        if (proposal.state != ProposalState.Pending) {
            revert InvalidAdmitting();
        }

        IGovernor governorContract = IGovernor(proposal.governor);
        if (governorContract.isAvailable(proposal.tokenId)) {
            revert InvalidTokenId();
        }

        IAdmin adminContract = IAdmin(admin);
        uint256 tokenId = proposal.tokenId;
        if (!adminContract.getZoneEligibility(governorContract.zoneOf(tokenId), msg.sender)) {
            revert Unauthorized();
        }

        uint256 totalWeight = IGovernor(proposal.governor).totalVoteAt(tokenId, block.timestamp);
        if (totalWeight < proposal.quorum) {
            revert ConflictedQuorum();
        }

        proposal.uri = _uri;
        proposal.totalWeight = totalWeight;
        proposal.admitAt = uint40(block.timestamp);
        proposal.state = ProposalState.Voting;
        proposal.currency = _currency;
        proposal.due += uint40(block.timestamp);

        emit ProposalAdmission(
            _proposalId,
            _uri,
            totalWeight,
            block.timestamp,
            _currency
        );
    }

    function disqualify(
        uint256 _proposalId,
        string calldata _uri,
        uint256 _nonce,
        uint256 _expiry,
        bytes calldata _signature
    ) external onlyExecutive validProposal(_proposalId) whenNotPaused {
        _validate(
            abi.encode(
                _proposalId,
                _uri
            ),
            _nonce,
            _expiry,
            _signature
        );

        Proposal storage proposal = proposals[_proposalId];
        if (proposal.state != ProposalState.Pending
            && proposal.state != ProposalState.Voting
            && proposal.state != ProposalState.Executing) {
            revert InvalidDisqualifying();
        }

        proposal.uri = _uri;
        proposal.state = ProposalState.Disqualified;

        emit ProposalDisqualification(_proposalId, _uri);
    }

    function vote(uint256 _proposalId, ProposalVoteOption _option)
    external validProposal(_proposalId) whenNotPaused returns (uint256) {
        return _vote(_proposalId, _option);
    }

    function safeVote(
        uint256 _proposalId,
        ProposalVoteOption _option,
        bytes32 _anchor
    ) external validProposal(_proposalId) whenNotPaused returns (uint256) {
        if (_anchor != proposals[_proposalId].uuid) {
            revert BadAnchor();
        }

        return _vote(_proposalId, _option);
    }

    function contributeBudget(uint256 _proposalId, uint256 _value)
    external payable validProposal(_proposalId) {
        _contributeBudget(_proposalId, _value);
    }

    function safeContributeBudget(
        uint256 _proposalId,
        uint256 _value,
        bytes32 _anchor
    ) external payable validProposal(_proposalId) {
        if (_anchor != proposals[_proposalId].uuid) {
            revert BadAnchor();
        }

        _contributeBudget(_proposalId, _value);
    }

    function withdrawBudgetContribution(uint256 _proposalId)
    external nonReentrant validProposal(_proposalId) whenNotPaused returns (uint256) {
        uint256 contribution = contributions[_proposalId][msg.sender];

        if (contribution == 0) {
            revert NothingToWithdraw();
        }
        contributions[_proposalId][msg.sender] = 0;

        CurrencyHandler.sendCurrency(proposals[_proposalId].currency, msg.sender, contribution);

        emit ProposalBudgetContributionWithdrawal(
            _proposalId,
            msg.sender,
            contribution
        );

        return contribution;
    }

    function confirmExecution(uint256 _proposalId)
    external nonReentrant validProposal(_proposalId) onlyExecutor(_proposalId) whenNotPaused {
        Proposal storage proposal = proposals[_proposalId];
        if (proposal.state != ProposalState.Voting
            || _votingVerdict(proposal) != ProposalVerdict.Passed) {
            revert InvalidExecutionConfirming();
        }

        proposal.state = ProposalState.Executing;
        CurrencyHandler.sendCurrency(proposal.currency, msg.sender, proposal.budget);

        emit ProposalExecutionConfirmation(_proposalId);
    }

    function rejectExecution(uint256 _proposalId)
    external validProposal(_proposalId) onlyExecutor(_proposalId) whenNotPaused {
        Proposal storage proposal = proposals[_proposalId];
        ProposalState state = proposal.state;
        if (state != ProposalState.Pending && state != ProposalState.Voting) {
            revert InvalidExecutionRejecting();
        }
        proposal.state = ProposalState.Rejected;

        emit ProposalExecutionRejection(_proposalId);
    }

    function concludeExecution(uint256 _proposalId, bool _isSuccessful)
    external onlyManager validProposal(_proposalId) whenNotPaused {
        Proposal storage proposal = proposals[_proposalId];
        if (proposal.state != ProposalState.Executing) {
            revert InvalidExecutionConcluding();
        }
        proposal.state = _isSuccessful ? ProposalState.SuccessfulExecuted : ProposalState.UnsuccessfulExecuted;

        emit ProposalExecutionConclusion(_proposalId, _isSuccessful);
    }

    function _votingVerdict(Proposal storage _proposal) private view returns (ProposalVerdict) {
        ProposalState state = _proposal.state;
        if (state == ProposalState.Pending) {
            return ProposalVerdict.Unsettled;
        }
        if (state == ProposalState.Disqualified
            || state == ProposalState.Rejected) {
            return ProposalVerdict.Failed;
        }

        ProposalRule rule = _proposal.rule;
        unchecked {
            if (rule == ProposalRule.ApprovalBeyondQuorum) {
                if (_proposal.approvalWeight >= _proposal.quorum) {
                    return ProposalVerdict.Passed;
                }
            }
            if (rule == ProposalRule.ApprovalBelowQuorum) {
                if (_proposal.disapprovalWeight + _proposal.neutralWeight >= _proposal.totalWeight - _proposal.quorum) {
                    return ProposalVerdict.Failed;
                }
            }
            if (rule == ProposalRule.DisapprovalBeyondQuorum) {
                if (_proposal.disapprovalWeight >= _proposal.quorum) {
                    return ProposalVerdict.Failed;
                }
            }
            if (rule == ProposalRule.DisapprovalBelowQuorum) {
                if (_proposal.approvalWeight + _proposal.neutralWeight >= _proposal.totalWeight - _proposal.quorum) {
                    return ProposalVerdict.Passed;
                }
            }
        }

        return (state == ProposalState.Voting && _proposal.due <= block.timestamp)
            ? ProposalVerdict.Failed
            : ProposalVerdict.Unsettled;
    }

    function _vote(uint256 _proposalId, ProposalVoteOption _option) private whenNotPaused returns (uint256) {
        Proposal storage proposal = proposals[_proposalId];
        if (proposal.state != ProposalState.Voting) {
            revert InvalidVoting();
        }

        if (proposal.due <= block.timestamp) {
            revert Overdue();
        }

        uint256 weight = IGovernor(proposal.governor).voteOfAt(
            msg.sender,
            proposal.tokenId,
            proposal.admitAt
        );
        if (weight == 0) {
            revert NoVotingPower();
        }

        if (_option == ProposalVoteOption.Approval) {
            uint256 newWeight = proposal.approvalWeight + weight;
            if (newWeight + proposal.disapprovalWeight + proposal.neutralWeight > proposal.totalWeight) {
                revert ConflictedWeight();
            }
            proposal.approvalWeight = newWeight;
        } else if (_option == ProposalVoteOption.Disapproval) {
            uint256 newWeight = proposal.disapprovalWeight + weight;
            if (newWeight + proposal.approvalWeight + proposal.neutralWeight > proposal.totalWeight) {
                revert ConflictedWeight();
            }
            proposal.disapprovalWeight = newWeight;
        } else if (_option == ProposalVoteOption.Neutral) {
            uint256 newWeight = proposal.neutralWeight + weight;
            if (newWeight + proposal.approvalWeight + proposal.disapprovalWeight > proposal.totalWeight) {
                revert ConflictedWeight();
            }
            proposal.neutralWeight = newWeight;
        }

        emit ProposalVote(
            _proposalId,
            msg.sender,
            _option,
            weight
        );

        return weight;
    }

    function _contributeBudget(uint256 _proposalId, uint256 _value)
    private nonReentrant whenNotPaused {
        Proposal storage proposal = proposals[_proposalId];
        if (proposal.state != ProposalState.Voting) {
            revert InvalidBudgetContributing();
        }

        CurrencyHandler.receiveCurrency(proposal.currency, _value);

        proposal.budget += _value;
        contributions[_proposalId][msg.sender] += _value;

        emit ProposalBudgetContribution(
            _proposalId,
            msg.sender,
            _value
        );
    }

    function _validate(
        bytes memory _data,
        uint256 _nonce,
        uint256 _expiry,
        bytes calldata _signature
    ) private {
        if (_expiry <= block.timestamp + Constant.GOVERNANCE_HUB_SIGNATURE_TTL) {
            revert ExpiredSignature();
        }

        if (isNonceUsed[_nonce]) {
            revert InvalidNonce();
        }

        isNonceUsed[_nonce] = true;

        if (!Signature.verify(
            validator,
            abi.encode(address(this), _data, _nonce, _expiry),
            _nonce,
            _signature)
        ) {
            revert InvalidSignature();
        }
    }
}
