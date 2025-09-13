// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @openzeppelin/contracts-upgradeable/
import {ReentrancyGuardUpgradeable} from "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";

/// contracts/common/constants/
import {CommonConstant} from "./constants/CommonConstant.sol";
import {GovernanceHubConstant} from "./constants/GovernanceHubConstant.sol";

/// contracts/common/interfaces/
import {IAdmin} from "./interfaces/IAdmin.sol";
import {IGovernor} from "./interfaces/IGovernor.sol";

/// contracts/common/storages/
import {GovernanceHubStorage} from "./storages/GovernanceHubStorage.sol";

/// contracts/common/utilities/
import {Administrable} from "./utilities/Administrable.sol";
import {CurrencyHandler} from "./utilities/CurrencyHandler.sol";
import {Formula} from "./utilities/Formula.sol";
import {Pausable} from "./utilities/Pausable.sol";
import {Signature} from "./utilities/Signature.sol";
import {Validatable} from "./utilities/Validatable.sol";

/**
 *  @author Briky Team
 *
 *  @notice The `GovernanceHub` contract conducts voting among holders of an asset from governor contracts to decide on
 *          proposals that affects the asset.
 *
 *  @dev    Any current holder of the asset, with client-side support, can propose by submitting a full proper context to the
 *          server-side and forwarding only its checksum to the contract as the UUID of the new proposal. Authorized executives
 *          will later verify the feasibility of the proposal within a given expiration to either admit or disqualify it
 *          accordingly. During this process, the full context is uploaded to a public database (e.g., IPFS), and the link is
 *          submitted to be the URI of proposal context. This approach protects the database from external attacks as well as
 *          ensures proposals remains validatable and user-oriented.
 *  @dev    Implementation involves server-side support.
 *  @dev    ERC-20 tokens are identified by their contract addresses.
 *          Native coin is represented by the zero address (0x0000000000000000000000000000000000000000).
 */
contract GovernanceHub is
GovernanceHubStorage,
Administrable,
Pausable,
Validatable,
ReentrancyGuardUpgradeable {
    /** ===== LIBRARY ===== **/
    using CurrencyHandler for uint256;
    using Formula for uint256;


    /** ===== CONSTANT ===== **/
    string constant private VERSION = "v1.2.1";


    /** ===== MODIFIER ===== **/
    /**
     *  @notice Verify a valid proposal.
     *
     *          Name            Description
     *  @param  _proposalId     Proposal Identifier.
     */
    modifier validProposal(uint256 _proposalId) {
        if (_proposalId == 0 || _proposalId > proposalNumber) {
            revert InvalidProposalId();
        }
        _;
    }

    modifier onlyOperator(uint256 _proposalId) {
        if (msg.sender != proposals[_proposalId].operator) {
            revert Unauthorized();
        }
        _;
    }


    /** ===== FUNCTION ===== **/
    /* --- Special --- */
    /**
     *  @notice Executed on a call to the contract with empty calldata.
     */
    receive() external payable {}

    /**
     *          Name        Description
     *  @return version     Version of implementation.
     */
    function version() external pure returns (string memory) {
        return VERSION;
    }


    /* --- Initializer --- */
    /**
     *  @notice Invoked after deployment for initialization, serving as a constructor.
     */
    function initialize(
        address _admin,
        address _validator,
        uint256 _fee
    ) external initializer {
        /// @dev    Inherited initializer.
        __Pausable_init();
        __ReentrancyGuard_init();

        __Validatable_init(_validator);

        /// @dev    Dependency
        admin = _admin;

        /// @dev    Configuration
        fee = _fee;
        emit FeeUpdate(_fee);
    }


    /* --- Administration --- */
    /**
     *  @notice Update proposal fee.
     *
     *          Name            Description
     *  @param  _fee            New proposal fee.
     *  @param  _signatures     Array of admin signatures.
     *
     *  @dev    Administrative configuration.
     */
    function updateFee(
        uint256 _fee,
        bytes[] calldata _signatures
    ) external {
        IAdmin(admin).verifyAdminSignatures(
            abi.encode(
                address(this),
                "updateFee",
                _fee
            ),
            _signatures
        );

        fee = _fee;
        emit FeeUpdate(_fee);
    }


    /* --- Query --- */
    /**
     *          Name            Description
     *  @param  _proposalId     Proposal identifier.
     *
     *  @return Information and progress of the proposal.
     */
    function getProposal(
        uint256 _proposalId
    ) external view
    validProposal(_proposalId)
    returns (Proposal memory) {
        return proposals[_proposalId];
    }

    /**
     *          Name            Description
     *  @param  _proposalId     Proposal identifier.
     *
     *  @return State of the proposal.
     */
    function getProposalState(
        uint256 _proposalId
    ) external view
    validProposal(_proposalId)
    returns (ProposalState) {
        if (proposals[_proposalId].state == ProposalState.Voting
            && proposals[_proposalId].due + GovernanceHubConstant.VOTE_CONFIRMATION_TIME_LIMIT <= block.timestamp) {
            return ProposalState.Disqualified;
        }

        return proposals[_proposalId].state;
    }

    /**
     *          Name            Description
     *  @param  _proposalId     Proposal identifier.
     *
     *  @return Verdict of the proposal.
     */
    function getProposalVerdict(
        uint256 _proposalId
    ) external view
    validProposal(_proposalId)
    returns (ProposalVerdict) {
        return _votingVerdict(proposals[_proposalId]);
    }


    /* --- Command --- */
    /**
     *  @notice Propose a new operation on an asset from a governor contract.
     *
     *          Name                Description
     *  @param  _governor           Governor contract address.
     *  @param  _tokenId            Asset identifier from the governor contract.
     *  @param  _operator           Assigned operator address.
     *  @param  _uuid               Checksum of proposal context.
     *  @param  _rule               Rule to determine verdict.
     *  @param  _rule               Rule to determine verdict.
     *  @param  _quorumRate         Fraction of total weight for quorum.
     *  @param  _duration           Voting duration.
     *  @param  _admissionExpiry    Expiration for moderators to admit the proposal.
     *  @param  _validation         Validation package from the validator.
     *
     *  @return New proposal identifier.
     *
     *  @dev    Any current holder of the asset, with client-side support, can propose by submitting a full proper context to
     *          the server-side and forwarding only its checksum to the contract as the UUID of the new proposal. Authorized
     *          executives will later verify the feasibility of the proposal within a given expiration to either admit or
     *          disqualify it accordingly. During this process, the full context is uploaded to a public database (e.g., IPFS),
     *          and the link is submitted to be the URI of proposal context. This approach protects the database from external
     *          attacks as well as ensures proposals remains validatable and user-oriented.
     *  @dev    Through the validation mechanism, the server-side determines `uuid`, `quorumRate`, `duration` and
     *          `admissionExpiry` based on the specific supported type of proposal and its context. Operators are also required
     *          to be pre-registered on the server-side to ensure proper assignments.
     */
    function propose(
        address _governor,
        uint256 _tokenId,
        address _operator,
        bytes32 _uuid,
        ProposalRule _rule,
        uint256 _quorumRate,
        uint40 _duration,
        uint40 _admissionExpiry,
        Validation calldata _validation
    ) external payable
    nonReentrant
    onlyGovernor(_governor)
    whenNotPaused
    returns (uint256) {
        _validate(
            abi.encode(
                _governor,
                _tokenId,
                msg.sender,
                _uuid,
                _operator,
                _rule,
                _quorumRate,
                _duration,
                _admissionExpiry
            ),
            _validation
        );

        if (!IGovernor(_governor).isAvailable(_tokenId)) {
            revert UnavailableToken();
        }

        if (_quorumRate > CommonConstant.RATE_MAX_FRACTION) {
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
        proposal.operator = _operator;
        proposal.rule = _rule;
        proposal.quorum = _quorumRate;

        /// @dev    In `Pending` state, `due` indicates vote duration but since being admitted, `due` is the timestamp of vote
        ///         closure.
        proposal.due = _duration;
        /// @dev    In `Pending` state, `timePivot` indicates when the proposal is expired for admission but since the being
        ///         admitted, `timePivot` snapshots the `block.timestamp` as reference for evaluating vote power.
        proposal.timePivot = _admissionExpiry;

        proposal.state = ProposalState.Pending;

        emit NewProposal(
            _governor,
            proposalId,
            msg.sender,
            _tokenId,
            _uuid,
            _operator,
            _rule,
            _quorumRate,
            _duration,
            _admissionExpiry
        );

        return proposalId;
    }

    /**
     *  @notice Admit an executable proposal after review.
     *
     *          Name            Description
     *  @param  _proposalId     Proposal identifier.
     *  @param  _contextURI     URI of proposal context.
     *  @param  _reviewURI      URI of review detail.
     *  @param  _currency       Budget currency address.
     *  @param  _validation     Validation package from the validator.
     *
     *  @dev    Permission: managers.
     *  @dev    As the proposal has only set `uuid` before admission, `contextURI` must be provided when admitting.
     */
    function admit(
        uint256 _proposalId,
        string calldata _contextURI,
        string calldata _reviewURI,
        address _currency,
        Validation calldata _validation
    ) external
    whenNotPaused
    onlyExecutive
    validProposal(_proposalId) {
        _validate(
            abi.encode(
                _proposalId,
                _contextURI,
                _reviewURI,
                _currency
            ),
            _validation
        );

        Proposal storage proposal = proposals[_proposalId];
        if (proposal.state != ProposalState.Pending) {
            revert InvalidAdmitting();
        }

        if (proposal.timePivot <= block.timestamp) {
            revert Timeout();
        }

        IGovernor governorContract = IGovernor(proposal.governor);
        uint256 tokenId = proposal.tokenId;
        if (!governorContract.isAvailable(tokenId)) {
            revert UnavailableToken();
        }

        IAdmin adminContract = IAdmin(admin);
        if (!adminContract.isActiveIn(governorContract.zoneOf(tokenId), msg.sender)) {
            revert Unauthorized();
        }

        uint256 totalWeight = IGovernor(proposal.governor).totalEquityAt(tokenId, block.timestamp);
        if (totalWeight == 0) {
            revert NoVotingPower();
        }

        uint256 quorum = totalWeight.scale(
            proposal.quorum,
            CommonConstant.RATE_MAX_FRACTION
        );

        proposal.contextURI = _contextURI;
        proposal.logURI = _reviewURI;
        proposal.totalWeight = totalWeight;
        proposal.quorum = quorum;
        proposal.timePivot = uint40(block.timestamp);
        proposal.state = ProposalState.Voting;
        proposal.currency = _currency;
        proposal.due += uint40(block.timestamp);

        emit ProposalAdmission(
            _proposalId,
            _contextURI,
            _reviewURI,
            totalWeight,
            quorum,
            _currency
        );
    }

    function disqualify(
        uint256 _proposalId,
        string calldata _contextURI,
        string calldata _reviewURI,
        Validation calldata _validation
    ) external validProposal(_proposalId) whenNotPaused {
        _validate(
            abi.encode(
                _proposalId,
                _contextURI,
                _reviewURI
            ),
            _validation
        );

        Proposal storage proposal = proposals[_proposalId];
        if (!IAdmin(admin).isActiveIn(
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

        proposal.contextURI = _contextURI;
        proposal.logURI = _reviewURI;
        proposal.state = ProposalState.Disqualified;

        emit ProposalDisqualification(
            _proposalId,
            _contextURI,
            _reviewURI
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
        if (!(state == ProposalState.Voting && proposal.due + GovernanceHubConstant.VOTE_CONFIRMATION_TIME_LIMIT <= block.timestamp)
            && _votingVerdict(proposal) != ProposalVerdict.Failed) {
            revert InvalidWithdrawing();
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

    function confirm(uint256 _proposalId)
    external nonReentrant validProposal(_proposalId) onlyManager whenNotPaused returns (uint256) {
        Proposal storage proposal = proposals[_proposalId];
        uint256 tokenId = proposal.tokenId;
        IGovernor governorContract = IGovernor(proposal.governor);
        if (!governorContract.isAvailable(tokenId)) {
            revert UnavailableToken();
        }

        if (!IAdmin(admin).isActiveIn(governorContract.zoneOf(tokenId), msg.sender)) {
            revert Unauthorized();
        }

        if (proposal.state != ProposalState.Voting
            || proposal.due + GovernanceHubConstant.VOTE_CONFIRMATION_TIME_LIMIT <= block.timestamp
            || _votingVerdict(proposal) != ProposalVerdict.Passed) {
            revert InvalidConfirming();
        }

        proposal.state = ProposalState.Executing;

        uint256 budget = proposal.budget;
        CurrencyHandler.sendCurrency(
            proposal.currency,
            proposal.operator,
            budget
        );

        emit ProposalConfirmation(
            _proposalId,
            budget
        );

        return budget;
    }

    function rejectExecution(uint256 _proposalId)
    external validProposal(_proposalId) onlyOperator(_proposalId) whenNotPaused {
        Proposal storage proposal = proposals[_proposalId];
        ProposalState state = proposal.state;

        if (state != ProposalState.Voting) {
            revert InvalidRejecting();
        }

        proposal.state = ProposalState.Rejected;

        emit ProposalExecutionRejection(_proposalId);
    }

    function logExecution(
        uint256 _proposalId,
        string calldata _logURI,
        Validation calldata _validation
    ) external validProposal(_proposalId) onlyOperator(_proposalId) whenNotPaused {
        _validate(
            abi.encode(
                _proposalId,
                _logURI
            ),
            _validation
        );

        if (proposals[_proposalId].state != ProposalState.Executing) {
            revert InvalidUpdating();
        }

        proposals[_proposalId].logURI = _logURI;

        emit ProposalExecutionLog(_proposalId, _logURI);
    }

    function concludeExecution(
        uint256 _proposalId,
        string calldata _logURI,
        bool _isSuccessful,
        Validation calldata _validation
    ) external validProposal(_proposalId) onlyManager whenNotPaused {
        _validate(
            abi.encode(
                _proposalId,
                _logURI,
                _isSuccessful
            ),
            _validation
        );

        Proposal storage proposal = proposals[_proposalId];
        uint256 tokenId = proposal.tokenId;
        IGovernor governorContract = IGovernor(proposal.governor);
        if (!governorContract.isAvailable(tokenId)) {
            revert UnavailableToken();
        }

        if (!IAdmin(admin).isActiveIn(governorContract.zoneOf(tokenId), msg.sender)) {
            revert Unauthorized();
        }

        if (proposal.state != ProposalState.Executing) {
            revert InvalidConcluding();
        }

        proposal.logURI = _logURI;
        proposal.state = _isSuccessful ? ProposalState.SuccessfulExecuted : ProposalState.UnsuccessfulExecuted;

        emit ProposalExecutionConclusion(
            _proposalId,
            _logURI,
            _isSuccessful
        );
    }

    function _votingVerdict(Proposal storage _proposal) internal view returns (ProposalVerdict) {
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
        uint256 quorum = _proposal.quorum;
        if (rule == ProposalRule.ApprovalBeyondQuorum) {
            if (_proposal.approvalWeight >= quorum) {
                return ProposalVerdict.Passed;
            }
            if (_proposal.disapprovalWeight > _proposal.totalWeight - quorum) {
                return ProposalVerdict.Failed;
            }
            return _proposal.due <= block.timestamp
                ? ProposalVerdict.Failed
                : ProposalVerdict.Unsettled;
        } else {
            if (_proposal.disapprovalWeight >= quorum) {
                return ProposalVerdict.Failed;
            }
            if (_proposal.approvalWeight > _proposal.totalWeight - quorum) {
                return ProposalVerdict.Passed;
            }
            return _proposal.due <= block.timestamp
                ? ProposalVerdict.Passed
                : ProposalVerdict.Unsettled;
        }
    }

    function _vote(uint256 _proposalId, ProposalVoteOption _voteOption) internal whenNotPaused returns (uint256) {
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

        uint256 tokenId = proposal.tokenId;
        IGovernor governorContract = IGovernor(proposal.governor);
        if (!governorContract.isAvailable(tokenId)) {
            revert UnavailableToken();
        }

        uint256 weight = governorContract.equityOfAt(
            msg.sender,
            tokenId,
            proposal.timePivot
        );
        if (weight == 0) {
            revert NoVotingPower();
        }

        voteOptions[_proposalId][msg.sender] = _voteOption;

        if (_voteOption == ProposalVoteOption.Approval) {
            uint256 newWeight = proposal.approvalWeight + weight;
            if (newWeight + proposal.disapprovalWeight > proposal.totalWeight) {
                revert ConflictedWeight();
            }
            proposal.approvalWeight = newWeight;
        } else if (_voteOption == ProposalVoteOption.Disapproval) {
            uint256 newWeight = proposal.disapprovalWeight + weight;
            if (newWeight + proposal.approvalWeight > proposal.totalWeight) {
                revert ConflictedWeight();
            }
            proposal.disapprovalWeight = newWeight;
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
    internal nonReentrant whenNotPaused {
        Proposal storage proposal = proposals[_proposalId];
        ProposalState state = proposal.state;
        if (state != ProposalState.Voting) {
            revert InvalidContributing();
        }

        if (proposal.due + GovernanceHubConstant.VOTE_CONFIRMATION_TIME_LIMIT <= block.timestamp) {
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
