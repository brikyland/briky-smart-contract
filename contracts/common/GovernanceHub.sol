// SPDX-License-Identifier: UNLICENSED
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
 *  @notice The `GovernanceHub` contract facilitates voting among holders of an asset from governor contracts to decide on
 *          proposals that affects the asset.
 *
 *  @dev    With client-side support, accounts can propose by submitting a full proper context to the server-side and
 *          forwarding only its checksum to the contract as the UUID of the new proposal. Authorized executives will later
 *          verify the feasibility of the proposal within a given expiration to either admit or disqualify it accordingly.
 *          During this process, the full context is uploaded to a public database (e.g., IPFS), and the link is submitted to
 *          be the URI of proposal context. This approach protects the database from external attacks as well as ensures
 *          proposals remain validatable and user-oriented.
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
     *  @notice Verify a valid proposal identifier.
     *
     *          Name            Description
     *  @param  _proposalId     Proposal Identifier.
     */
    modifier validProposal(
        uint256 _proposalId
    ) {
        if (_proposalId == 0
            || _proposalId > proposalNumber) {
            revert InvalidProposalId();
        }
        _;
    }

    /**
     *  @notice Verify the message sender is the operator of a proposal.
     *
     *          Name            Description
     *  @param  _proposalId     Proposal Identifier.
     */
    modifier onlyOperator(
        uint256 _proposalId
    ) {
        if (msg.sender != proposals[_proposalId].operator) {
            revert Unauthorized();
        }
        _;
    }

    /**
     *  @notice Verify the message sender is the representative of the asset from of a proposal.
     *
     *          Name            Description
     *  @param  _proposalId     Proposal Identifier.
     */
    modifier onlyRepresentative(
        uint256 _proposalId
    ) {
        Proposal storage proposal = proposals[_proposalId];
        if (msg.sender != IGovernor(proposal.governor).getRepresentative(proposal.tokenId)) {
            revert Unauthorized();
        }
        _;
    }


    /** ===== FUNCTION ===== **/
    /* --- Common --- */
    /**
     *  @notice Executed on a call to this contract with empty calldata.
     */
    receive() external payable {}

    /**
     *  @return Version of implementation.
     */
    function version() external pure returns (string memory) {
        return VERSION;
    }


    /* --- Initialization --- */
    /**
     *  @notice Initialize the contract after deployment, serving as the constructor.
     *
     *          Name        Description
     *  @param  _admin      `Admin` contract address.
     *  @param  _validator  Validator address.
     *  @param  _fee        Proposing fee charged in native coin.
     */
    function initialize(
        address _admin,
        address _validator,
        uint256 _fee
    ) external
    initializer {
        /// Initializer
        __Pausable_init();
        __Validatable_init(_validator);
        __ReentrancyGuard_init();

        /// Dependency
        admin = _admin;

        /// Configuration
        fee = _fee;
        emit FeeUpdate(_fee);
    }


    /* --- Administration --- */
    /**
     *  @notice Update the proposing fee.
     *
     *          Name            Description
     *  @param  _fee            New proposing fee charged in native coin.
     *  @param  _signatures     Array of admin signatures.
     *
     *  @dev    Administrative operator.
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
     *  @return Configuration and progress of the proposal.
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
     *  @param  _quorumRate         Fraction of total weight for quorum.
     *  @param  _duration           Voting duration.
     *  @param  _admissionExpiry    Expiration for proposal admission.
     *  @param  _validation         Validation package from the validator.
     *
     *  @return New proposal identifier.
     *
     *  @dev    Any current holder of the asset, with client-side support, can propose by submitting a full proper context to
     *          the server-side and forwarding only its checksum to this contract as the UUID of the new proposal. Authorized
     *          executives will later verify the feasibility of the proposal within a given expiration to either admit or
     *          disqualify it accordingly. During this process, the full context is uploaded to a public database (e.g., IPFS),
     *          and the link is submitted to be the URI of proposal context. This approach protects the database from external
     *          attacks as well as ensures proposals remain validatable and user-oriented.
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
    whenNotPaused
    nonReentrant
    validGovernor(_governor)
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

        if (_quorumRate > CommonConstant.RATE_MAX_SUBUNIT) {
            revert InvalidInput();
        }

        if (_admissionExpiry <= block.timestamp) {
            revert InvalidTimestamp();
        }

        /// @dev    Proposing fee is charged in native coin.
        CurrencyHandler.receiveNative(fee);

        uint256 proposalId = ++proposalNumber;
        Proposal storage proposal = proposals[proposalId];

        proposal.governor = _governor;
        proposal.tokenId = _tokenId;
        proposal.proposer = msg.sender;
        proposal.uuid = _uuid;
        proposal.operator = _operator;
        proposal.rule = _rule;
        /// @dev    In `Pending` state, `quorum` is a fractional rate.
        proposal.quorum = _quorumRate;
        /// @dev    In `Pending` state, `due` is set to the vote duration.
        proposal.due = _duration;
        /// @dev    In `Pending` state, `timePivot` is set to the admission expiration timestamp.
        proposal.timePivot = _admissionExpiry;

        proposal.state = ProposalState.Pending;

        emit NewProposal(
            _governor,
            proposalId,
            msg.sender,
            _tokenId,
            _operator,
            _uuid,
            _rule,
            _quorumRate,
            _duration,
            _admissionExpiry
        );

        return proposalId;
    }

    /**
     *  @notice Admit an executable proposal after review practicability.
     *  @notice Admit only if the proposal is in `Pending` state and before admission time limit has expired.
     *
     *          Name                Description
     *  @param  _proposalId         Proposal identifier.
     *  @param  _contextURI         URI of proposal context.
     *  @param  _reviewURI          URI of review detail.
     *  @param  _currency           Budget currency address.
     *  @param  _validation         Validation package from the validator.
     *
     *  @dev    Permissions: Asset representative of the proposal.
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
    nonReentrant
    validProposal(_proposalId)
    validGovernor(proposals[_proposalId].governor)
    onlyRepresentative(_proposalId) {
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

        /// @dev    The voting power corresponds to equity at admission timestamp.
        uint256 totalWeight = governorContract.totalEquityAt(tokenId, block.timestamp);
        if (totalWeight == 0) {
            revert NoVotingPower();
        }

        uint256 quorumWeight = totalWeight.scale(proposal.quorum, CommonConstant.RATE_MAX_SUBUNIT);

        proposal.contextURI = _contextURI;
        /// @dev    Log the review detail.
        proposal.logURI = _reviewURI;
        proposal.totalWeight = totalWeight;
        /// @dev    `quorum` is converted to weight.
        proposal.quorum = quorumWeight;
        /// @dev    `timePivot` is set to the admission timestamp.
        proposal.timePivot = uint40(block.timestamp);
        proposal.currency = _currency;
        /// @dev    `due` is set to the vote closure timestamp.
        proposal.due += uint40(block.timestamp);

        proposal.state = ProposalState.Voting;

        emit ProposalAdmission(
            _proposalId,
            _contextURI,
            _reviewURI,
            _currency,
            totalWeight,
            quorumWeight
        );
    }

    /**
     *  @notice Disqualify an inexecutable proposal after review practicability.
     *  @notice Disqualify only if the proposal is in `Pending` or `Voting` state and before the vote closes.
     *
     *          Name                Description
     *  @param  _proposalId         Proposal identifier.
     *  @param  _contextURI         URI of proposal context.
     *  @param  _reviewURI          URI of review detail.
     *  @param  _validation         Validation package from the validator.
     *
     *  @dev    Permission:
     *          - Asset representative of the proposal: during `Pending` state.
     *          - Managers: during `Pending` and `Voting` state.
     *  @dev    As the proposal has only set `uuid` before disqualification, `contextURI` must be provided when disqualifying.
     */
    function disqualify(
        uint256 _proposalId,
        string calldata _contextURI,
        string calldata _reviewURI,
        Validation calldata _validation
    ) external
    whenNotPaused
    validProposal(_proposalId) {
        _validate(
            abi.encode(
                _proposalId,
                _contextURI,
                _reviewURI
            ),
            _validation
        );

        Proposal storage proposal = proposals[_proposalId];
        IGovernor governorContract = IGovernor(proposal.governor);

        IAdmin adminContract = IAdmin(admin);
        ProposalState state = proposal.state;
        uint256 tokenId = proposal.tokenId;
        if (adminContract.isManager(msg.sender)
            && adminContract.isActiveIn(governorContract.zoneOf(tokenId), msg.sender)) {
            if (state != ProposalState.Pending && state != ProposalState.Voting) {
                revert Unauthorized();
            }
        } else if (msg.sender == governorContract.getRepresentative(tokenId)) {
            if (state != ProposalState.Pending) {
                revert Unauthorized();
            }
        } else {
            revert Unauthorized();
        }

        proposal.contextURI = _contextURI;
        /// @dev    Log the review detail.
        proposal.logURI = _reviewURI;
        proposal.state = ProposalState.Disqualified;

        emit ProposalDisqualification(
            _proposalId,
            _contextURI,
            _reviewURI
        );
    }

    /**
     *  @notice Vote on a proposal.
     *  @notice Vote only if the proposal is in `Voting` state and before the vote closes.
     *
     *          Name                Description
     *  @param  _proposalId         Proposal identifier.
     *  @param  _voteOption         Vote option.
     *
     *  @return Vote power.
     */
    function vote(
        uint256 _proposalId,
        ProposalVoteOption _voteOption
    ) external
    whenNotPaused
    validProposal(_proposalId)
    returns (uint256) {
        return _vote(_proposalId, _voteOption);
    }

    /**
     *  @notice Vote on a proposal.
     *  @notice Vote only if the proposal is in `Voting` state and before the vote closes.
     *
     *          Name                Description
     *  @param  _proposalId         Proposal identifier.
     *  @param  _voteOption         Vote option.
     *  @param  _anchor             `uuid` of the proposal.
     *
     *  @return Vote power.
     *
     *  @dev    Anchor enforces consistency between this contract and the client-side.
     */
    function safeVote(
        uint256 _proposalId,
        ProposalVoteOption _voteOption,
        bytes32 _anchor
    ) external
    whenNotPaused
    validProposal(_proposalId)
    returns (uint256) {
        if (_anchor != proposals[_proposalId].uuid) {
            revert BadAnchor();
        }

        return _vote(_proposalId, _voteOption);
    }

    /**
     *  @notice Contribute to the budget of a proposal.
     *  @notice Contribute only before the proposal is confirmed or the confirmation time limit has expired.
     *
     *          Name                Description
     *  @param  _proposalId         Proposal identifier.
     *  @param  _value              Contributed value.
     */
    function contributeBudget(
        uint256 _proposalId,
        uint256 _value
    ) external payable
    whenNotPaused
    validProposal(_proposalId) {
        _contributeBudget(_proposalId, _value);
    }

    /**
     *  @notice Contribute to the budget of a proposal.
     *  @notice Contribute only before the proposal is confirmed or the confirmation time limit has expired.
     *
     *          Name                Description
     *  @param  _proposalId         Proposal identifier.
     *  @param  _value              Contributed value.
     *  @param  _anchor             `uuid` of the proposal.
     *
     *  @dev    Anchor enforces consistency between this contract and the client-side.
     */
    function safeContributeBudget(
        uint256 _proposalId,
        uint256 _value,
        bytes32 _anchor
    ) external payable
    whenNotPaused
    validProposal(_proposalId) {
        if (_anchor != proposals[_proposalId].uuid) {
            revert BadAnchor();
        }

        _contributeBudget(_proposalId, _value);
    }

    /**
     *  @notice Withdraw contribution from a proposal which can no longer be executed.
     *  @notice Withdraw only if the proposal is either disapproved, disqualified or rejected, or after confirmation time limit
     *          has expired.
     *
     *          Name                Description
     *  @param  _proposalId         Proposal identifier.
     *
     *  @return Withdrawn value.
     */
    function withdrawBudgetContribution(
        uint256 _proposalId
    ) external
    whenNotPaused
    nonReentrant
    validProposal(_proposalId)
    returns (uint256) {
        Proposal storage proposal = proposals[_proposalId];
        ProposalState state = proposal.state;
        if (!(state == ProposalState.Voting
                && proposal.due + GovernanceHubConstant.VOTE_CONFIRMATION_TIME_LIMIT <= block.timestamp)
            && _votingVerdict(proposal) != ProposalVerdict.Failed) {
            revert InvalidWithdrawing();
        }

        uint256 contribution = contributions[_proposalId][msg.sender];
        if (contribution == 0) {
            revert NothingToWithdraw();
        }

        contributions[_proposalId][msg.sender] = 0;
        CurrencyHandler.sendCurrency(
            proposals[_proposalId].currency,
            msg.sender,
            contribution
        );

        emit ProposalBudgetContributionWithdrawal(
            _proposalId,
            msg.sender,
            contribution
        );

        return contribution;
    }

    /**
     *  @notice Confirm a proposal to be executed.
     *  @notice Confirm only if the proposal is approved and before the confirmation time limit has expired.
     *  @notice On proposal confirmation, the budget is transferred to the operator.
     *
     *          Name                Description
     *  @param  _proposalId         Proposal identifier.
     *
     *  @return Contributed budget for execution.
     *
     *  @dev    Permission: Managers active in the zone of the asset.
     */
    function confirm(
        uint256 _proposalId
    ) external
    whenNotPaused
    nonReentrant
    validProposal(_proposalId)
    validGovernor(proposals[_proposalId].governor)
    onlyManager
    returns (uint256) {
        Proposal storage proposal = proposals[_proposalId];
        uint256 tokenId = proposal.tokenId;
        IGovernor governorContract = IGovernor(proposal.governor);
        if (!governorContract.isAvailable(tokenId)) {
            revert UnavailableToken();
        }

        IAdmin adminContract = IAdmin(admin);
        if (!adminContract.isActiveIn(governorContract.zoneOf(tokenId), msg.sender)) {
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

    /**
     *  @notice Reject to execute a proposal.
     *  @notice Reject only if the proposal is in `Voting` state.
     *
     *          Name                Description
     *  @param  _proposalId         Proposal identifier.
     *
     *  @dev    Permission: Operator of the proposal.
     */
    function rejectExecution(
        uint256 _proposalId
    ) external
    whenNotPaused
    validProposal(_proposalId)
    onlyOperator(_proposalId) {
        Proposal storage proposal = proposals[_proposalId];
        ProposalState state = proposal.state;

        if (state != ProposalState.Voting) {
            revert InvalidRejecting();
        }

        proposal.state = ProposalState.Rejected;

        emit ProposalExecutionRejection(_proposalId);
    }

    /**
     *  @notice Update a proposal about the progress of execution.
     *  @notice Update only if the proposal is in `Executing` state.
     *
     *          Name                Description
     *  @param  _proposalId         Proposal identifier.
     *  @param  _logURI             URI of execution progress log.
     *  @param  _validation         Validation package from the validator.
     *
     *  @dev    Permission: Operator of the proposal.
     */
    function logExecution(
        uint256 _proposalId,
        string calldata _logURI,
        Validation calldata _validation
    ) external
    whenNotPaused
    nonReentrant
    validProposal(_proposalId)
    validGovernor(proposals[_proposalId].governor)
    onlyOperator(_proposalId) {
        _validate(
            abi.encode(
                _proposalId,
                _logURI
            ),
            _validation
        );

        Proposal storage proposal = proposals[_proposalId];
        if (!IGovernor(proposal.governor).isAvailable(proposal.tokenId)) {
            revert UnavailableToken();
        }

        if (proposals[_proposalId].state != ProposalState.Executing) {
            revert InvalidUpdating();
        }

        proposals[_proposalId].logURI = _logURI;

        emit ProposalExecutionLog(
            _proposalId,
            _logURI
        );
    }

    /**
     *  @notice Conclude the execution of a proposal.
     *  @notice Conclude only if the proposal is in `Executing` state.
     *
     *          Name            Description
     *  @param  _proposalId     Proposal identifier.
     *  @param  _resultURI      URI of execution result.
     *  @param  _isSuccessful   Whether the execution has succeeded.
     *  @param  _validation     Validation package from the validator.
     *
     *  @dev    Permission: Asset representative of the proposal.
     */
    function concludeExecution(
        uint256 _proposalId,
        string calldata _resultURI,
        bool _isSuccessful,
        Validation calldata _validation
    ) external
    whenNotPaused
    nonReentrant
    validProposal(_proposalId)
    validGovernor(proposals[_proposalId].governor)
    onlyRepresentative(_proposalId) {
        _validate(
            abi.encode(
                _proposalId,
                _resultURI,
                _isSuccessful
            ),
            _validation
        );

        Proposal storage proposal = proposals[_proposalId];
        uint256 tokenId = proposal.tokenId;
        if (!IGovernor(proposal.governor).isAvailable(tokenId)) {
            revert UnavailableToken();
        }

        if (proposal.state != ProposalState.Executing) {
            revert InvalidConcluding();
        }

        proposal.logURI = _resultURI;
        proposal.state = _isSuccessful ? ProposalState.SuccessfulExecuted : ProposalState.UnsuccessfulExecuted;

        emit ProposalExecutionConclusion(
            _proposalId,
            _resultURI,
            _isSuccessful
        );
    }


    /* --- Helper --- */
    /**
     *  @notice Evaluate the verdict of the vote of a proposal
     *
     *          Name            Description
     *  @param  _proposal       Proposal.
     *
     *  @return Verdict of the proposal.
     */
    function _votingVerdict(
        Proposal storage _proposal
    ) internal view returns (ProposalVerdict) {
        ProposalState state = _proposal.state;
        /// @dev    The proposal has not been admitted for vote yet.
        if (state == ProposalState.Nil
            || state == ProposalState.Pending) {
            return ProposalVerdict.Unsettled;
        }

        /// @dev    The proposal has been confirmed to be executed.
        if (state == ProposalState.Executing
            || state == ProposalState.SuccessfulExecuted
            || state == ProposalState.UnsuccessfulExecuted) {
            return ProposalVerdict.Passed;
        }

        /// @dev    The proposal can never be executed.
        if (state == ProposalState.Disqualified
            || state == ProposalState.Rejected) {
            return ProposalVerdict.Failed;
        }

        ProposalRule rule = _proposal.rule;
        uint256 quorum = _proposal.quorum;
        if (rule == ProposalRule.ApprovalBeyondQuorum) {
            /// @dev    Meet the quorum.
            if (_proposal.approvalWeight >= quorum) {
                return ProposalVerdict.Passed;
            }

            /// @dev    Not enough unvoted weight to meet the quorum.
            if (_proposal.disapprovalWeight > _proposal.totalWeight - quorum) {
                return ProposalVerdict.Failed;
            }

            /// @dev    Only determined after due.
            return _proposal.due <= block.timestamp
                ? ProposalVerdict.Failed
                : ProposalVerdict.Unsettled;
        } else {
            /// @dev    Meet the quorum.
            if (_proposal.disapprovalWeight >= quorum) {
                return ProposalVerdict.Failed;
            }

            /// @dev    Not enough unvoted weight to meet the quorum.
            if (_proposal.approvalWeight > _proposal.totalWeight - quorum) {
                return ProposalVerdict.Passed;
            }

            /// @dev    Only determined after due.
            return _proposal.due <= block.timestamp
                ? ProposalVerdict.Passed
                : ProposalVerdict.Unsettled;
        }
    }
    
    /**
     *  @notice Vote on a proposal.
     *
     *          Name                Description
     *  @param  _proposalId         Proposal identifier.
     *  @param  _voteOption         Vote option.
     *
     *  @return Vote power.
     */
    function _vote(
        uint256 _proposalId,
        ProposalVoteOption _voteOption
    ) internal
    nonReentrant
    validGovernor(proposals[_proposalId].governor)
    returns (uint256) {
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

        /// @dev The voting power corresponds to equity at admission timestamp.
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
            /// @dev    Absent vote is counted as disapproval.
            if (newWeight + proposal.disapprovalWeight > proposal.totalWeight) {
                revert ConflictedWeight();
            }
            proposal.approvalWeight = newWeight;
        } else if (_voteOption == ProposalVoteOption.Disapproval) {
            uint256 newWeight = proposal.disapprovalWeight + weight;
            /// @dev    Absent vote is counted as approval.
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

    /**
     *  @notice Contribute to the budget of a proposal.
     *
     *          Name                Description
     *  @param  _proposalId         Proposal identifier.
     *  @param  _value              Contributed value.
     */
    function _contributeBudget(
        uint256 _proposalId,
        uint256 _value
    ) internal
    nonReentrant
    validGovernor(proposals[_proposalId].governor) {
        Proposal storage proposal = proposals[_proposalId];
        ProposalState state = proposal.state;
        if (state != ProposalState.Voting) {
            revert InvalidContributing();
        }

        if (proposal.due + GovernanceHubConstant.VOTE_CONFIRMATION_TIME_LIMIT <= block.timestamp) {
            revert Timeout();
        }

        CurrencyHandler.receiveCurrency(
            proposal.currency,
            _value
        );

        proposal.budget += _value;
        contributions[_proposalId][msg.sender] += _value;

        emit ProposalBudgetContribution(
            _proposalId,
            msg.sender,
            _value
        );
    }
}
