// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ReentrancyGuardUpgradeable} from "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";

import {Constant} from "../lib/Constant.sol";
import {CurrencyHandler} from "../lib/CurrencyHandler.sol";
import {Formula} from "../lib/Formula.sol";
import {Signature} from "../lib/Signature.sol";

import {IAdmin} from "./interfaces/IAdmin.sol";
import {IGovernor} from "./interfaces/IGovernor.sol";

import {GovernanceHubStorage} from "./storages/GovernanceHubStorage.sol";

import {Administrable} from "./utilities/Administrable.sol";
import {Pausable} from "./utilities/Pausable.sol";
import {Validatable} from "./utilities/Validatable.sol";

abstract contract GovernanceHub is
GovernanceHubStorage,
Administrable,
Pausable,
Validatable,
ReentrancyGuardUpgradeable {
    using CurrencyHandler for uint256;
    using Formula for uint256;

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

        __Validatable_init(_validator);

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

    function getProposal(uint256 _proposalId)
    external view validProposal(_proposalId) returns (Proposal memory) {
        return proposals[_proposalId];
    }

    function getProposalVerdict(uint256 _proposalId)
    external view validProposal(_proposalId) returns (ProposalVerdict) {
        return _votingVerdict(proposals[_proposalId]);
    }

    function getProposalState(uint256 _proposalId)
    external view validProposal(_proposalId) returns (ProposalState) {
        if (proposals[_proposalId].state == ProposalState.Voting
            && proposals[_proposalId].due + Constant.GOVERNANCE_HUB_CONFIRMATION_TIME_LIMIT <= block.timestamp) {
            return ProposalState.Disqualified;
        }

        return proposals[_proposalId].state;
    }

    function propose(
        address _governor,
        uint256 _tokenId,
        address _executor,
        bytes32 _uuid,
        ProposalRule _rule,
        uint256 _quorumRate,
        uint40 _duration,
        uint40 _admissionExpiry,
        Validation calldata _signature
    ) external payable whenNotPaused returns (uint256) {
        _validate(
            abi.encode(
                _governor,
                _tokenId,
                msg.sender,
                _uuid,
                _executor,
                _rule,
                _quorumRate,
                _duration,
                _admissionExpiry
            ),
            _signature
        );

        if (!IAdmin(admin).isGovernor(_governor)) {
            revert InvalidGovernor();
        }

        if (!IGovernor(msg.sender).isAvailable(_tokenId)) {
            revert InvalidTokenId();
        }

        if (_quorumRate > Constant.COMMON_RATE_MAX_FRACTION) {
            revert InvalidInput();
        }

        if (_admissionExpiry <= block.timestamp) {
            revert InvalidTimestamp();
        }

        CurrencyHandler.receiveNative(fee);

        uint256 proposalId = ++proposalNumber;
        Proposal storage proposal = proposals[proposalId];

        proposal.governor = _governor;
        proposal.tokenId = _tokenId;
        proposal.proposer = msg.sender;
        proposal.uuid = _uuid;
        proposal.executor = _executor;
        proposal.rule = _rule;
        proposal.quorum = _quorumRate;
        proposal.due = _duration;
        proposal.timePivot = _admissionExpiry;

        proposal.state = ProposalState.Pending;


        emit NewProposal(
            _governor,
            proposalId,
            msg.sender,
            _uuid,
            _executor,
            _rule,
            _quorumRate,
            _duration,
            _admissionExpiry
        );

        return proposalId;
    }

    function admit(
        uint256 _proposalId,
        string calldata _metadataUri,
        string calldata _stateUri,
        address _currency,
        Validation calldata _signature
    ) external validProposal(_proposalId) onlyExecutive whenNotPaused {
        _validate(
            abi.encode(
                _proposalId,
                _metadataUri,
                _stateUri,
                _currency
            ),
            _signature
        );

        Proposal storage proposal = proposals[_proposalId];
        if (proposal.state != ProposalState.Pending) {
            revert InvalidAdmitting();
        }

        if (proposal.timePivot <= block.timestamp) {
            revert Timeout();
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
        uint256 quorum = totalWeight.scale(
            proposal.quorum,
            Constant.COMMON_RATE_MAX_FRACTION
        );

        proposal.metadataUri = _metadataUri;
        proposal.stateUri = _stateUri;
        proposal.totalWeight = totalWeight;
        proposal.quorum = quorum;
        proposal.timePivot = uint40(block.timestamp);
        proposal.state = ProposalState.Voting;
        proposal.currency = _currency;
        proposal.due += uint40(block.timestamp);

        emit ProposalAdmission(
            _proposalId,
            _metadataUri,
            _stateUri,
            totalWeight,
            quorum,
            block.timestamp,
            _currency
        );
    }

    function disqualify(
        uint256 _proposalId,
        string calldata _metadataUri,
        string calldata _stateUri,
        Validation calldata _validation
    ) external validProposal(_proposalId) whenNotPaused {
        _validate(
            abi.encode(
                _proposalId,
                _metadataUri,
                _stateUri
            ),
            _validation
        );

        Proposal storage proposal = proposals[_proposalId];
        if (!IAdmin(admin).getZoneEligibility(
            IGovernor(proposal.governor).zoneOf(proposal.tokenId),
            msg.sender
        )) {
            revert Unauthorized();
        }

        IAdmin adminContract = IAdmin(admin);
        ProposalState state = proposal.state;
        if (!(state == ProposalState.Pending && adminContract.isExecutive(msg.sender))
            && !(state == ProposalState.Voting && adminContract.isManager(msg.sender))) {
            revert InvalidDisqualifying();
        }

        proposal.metadataUri = _metadataUri;
        proposal.stateUri = _stateUri;
        proposal.state = ProposalState.Disqualified;

        emit ProposalDisqualification(
            _proposalId,
            _metadataUri,
            _stateUri
        );
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
        Proposal storage proposal = proposals[_proposalId];
        ProposalState state = proposal.state;
        if (!(state == ProposalState.Voting && proposal.due + Constant.GOVERNANCE_HUB_CONFIRMATION_TIME_LIMIT <= block.timestamp)
            && _votingVerdict(proposal) != ProposalVerdict.Failed) {
            revert InvalidBudgetContributionWithdrawing();
        }
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
    external nonReentrant validProposal(_proposalId) onlyManager whenNotPaused {
        Proposal storage proposal = proposals[_proposalId];
        if (!IAdmin(admin).getZoneEligibility(
            IGovernor(proposal.governor).zoneOf(proposal.tokenId),
            msg.sender
        )) {
            revert Unauthorized();
        }

        if (proposal.state != ProposalState.Voting
            || proposal.due + Constant.GOVERNANCE_HUB_CONFIRMATION_TIME_LIMIT <= block.timestamp
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

        if (state != ProposalState.Voting) {
            revert InvalidExecutionRejecting();
        }

        proposal.state = ProposalState.Rejected;

        emit ProposalExecutionRejection(_proposalId);
    }

    function updateExecution(
        uint256 _proposalId,
        string calldata _stateUri,
        Validation calldata _validation
    ) external validProposal(_proposalId) onlyExecutor(_proposalId) whenNotPaused {
        _validate(
            abi.encode(
                _proposalId,
                _stateUri
            ),
            _validation
        );

        if (proposals[_proposalId].state != ProposalState.Executing) {
            revert InvalidExecutionUpdating();
        }

        proposals[_proposalId].stateUri = _stateUri;

        emit ProposalExecutionUpdate(_proposalId, _stateUri);
    }

    function concludeExecution(
        uint256 _proposalId,
        string calldata _stateUri,
        bool _isSuccessful,
        Validation calldata _validation
    ) external validProposal(_proposalId) onlyManager whenNotPaused {
        _validate(
            abi.encode(
                _proposalId,
                _stateUri,
                _isSuccessful
            ),
            _validation
        );

        Proposal storage proposal = proposals[_proposalId];
        if (!IAdmin(admin).getZoneEligibility(
            IGovernor(proposal.governor).zoneOf(proposal.tokenId),
            msg.sender
        )) {
            revert Unauthorized();
        }

        if (proposal.state != ProposalState.Executing) {
            revert InvalidExecutionConcluding();
        }

        proposal.stateUri = _stateUri;
        proposal.state = _isSuccessful ? ProposalState.SuccessfulExecuted : ProposalState.UnsuccessfulExecuted;

        emit ProposalExecutionConclusion(
            _proposalId,
            _stateUri,
            _isSuccessful
        );
    }

    function _votingVerdict(Proposal storage _proposal) private view returns (ProposalVerdict) {
        ProposalState state = _proposal.state;
        if (state == ProposalState.Nil
            || state == ProposalState.Pending) {
            return ProposalVerdict.Unsettled;
        }
        if (state == ProposalState.Executing
            || state == ProposalState.SuccessfulExecuted
            || state == ProposalState.UnsuccessfulExecuted) {
            return ProposalVerdict.Passed;
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
                return _proposal.due <= block.timestamp
                    ? ProposalVerdict.Failed
                    : ProposalVerdict.Unsettled;
            } else if (rule == ProposalRule.ApprovalBelowQuorum) {
                uint256 approvalWeight = _proposal.approvalWeight;
                uint256 remain = _proposal.due > block.timestamp
                    ? _proposal.totalWeight
                        - approvalWeight
                        - _proposal.disapprovalWeight
                        - _proposal.neutralWeight
                    : 0;
                return approvalWeight + remain < _proposal.quorum
                    ? ProposalVerdict.Failed
                    : ProposalVerdict.Unsettled;
            } else if (rule == ProposalRule.DisapprovalBeyondQuorum) {
                if (_proposal.disapprovalWeight >= _proposal.quorum) {
                    return ProposalVerdict.Failed;
                }
                return _proposal.due <= block.timestamp
                    ? ProposalVerdict.Passed
                    : ProposalVerdict.Unsettled;
            } else {
                uint256 disapprovalWeight = _proposal.disapprovalWeight;
                uint256 remain = _proposal.due > block.timestamp
                    ? _proposal.totalWeight
                        - _proposal.approvalWeight
                        - disapprovalWeight
                        - _proposal.neutralWeight
                    : 0;
                return disapprovalWeight + remain < _proposal.quorum
                    ? ProposalVerdict.Passed
                    : ProposalVerdict.Unsettled;
            }
        }
    }

    function _vote(uint256 _proposalId, ProposalVoteOption _voteOption) private whenNotPaused returns (uint256) {
        Proposal storage proposal = proposals[_proposalId];
        if (proposal.state != ProposalState.Voting) {
            revert InvalidVoting();
        }

        if (proposal.due <= block.timestamp) {
            revert Overdue();
        }

        if (voteOptions[_proposalId][msg.sender] != ProposalVoteOption.Nil) {
            revert AlreadyVoted();
        }

        uint256 weight = IGovernor(proposal.governor).voteOfAt(
            msg.sender,
            proposal.tokenId,
            proposal.timePivot
        );
        if (weight == 0) {
            revert NoVotingPower();
        }

        voteOptions[_proposalId][msg.sender] = _voteOption;

        if (_voteOption == ProposalVoteOption.Approval) {
            uint256 newWeight = proposal.approvalWeight + weight;
            if (newWeight + proposal.disapprovalWeight + proposal.neutralWeight > proposal.totalWeight) {
                revert ConflictedWeight();
            }
            proposal.approvalWeight = newWeight;
        } else if (_voteOption == ProposalVoteOption.Disapproval) {
            uint256 newWeight = proposal.disapprovalWeight + weight;
            if (newWeight + proposal.approvalWeight + proposal.neutralWeight > proposal.totalWeight) {
                revert ConflictedWeight();
            }
            proposal.disapprovalWeight = newWeight;
        } else if (_voteOption == ProposalVoteOption.Neutral) {
            uint256 newWeight = proposal.neutralWeight + weight;
            if (newWeight + proposal.approvalWeight + proposal.disapprovalWeight > proposal.totalWeight) {
                revert ConflictedWeight();
            }
            proposal.neutralWeight = newWeight;
        }

        emit ProposalVote(
            _proposalId,
            msg.sender,
            _voteOption,
            weight
        );

        return weight;
    }

    function _contributeBudget(uint256 _proposalId, uint256 _value)
    private nonReentrant whenNotPaused {
        Proposal storage proposal = proposals[_proposalId];
        ProposalState state = proposal.state;
        if (state != ProposalState.Voting) {
            revert InvalidBudgetContributing();
        }

        if (proposal.due + Constant.GOVERNANCE_HUB_CONFIRMATION_TIME_LIMIT <= block.timestamp) {
            revert Overdue();
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
}
