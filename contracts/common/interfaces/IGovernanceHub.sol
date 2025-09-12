// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// contracts/common/structs/
import {IProposal} from "../structs/IProposal.sol";

/// contracts/common/interfaces/
import {ICommon} from "./ICommon.sol";
import {IValidatable} from "./IValidatable.sol";

/**
 *  @author Briky Team
 *
 *  @notice Interface for contract `GovernanceHub`.
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
interface IGovernanceHub is
IProposal,
ICommon,
IValidatable {
    /** ===== EVENT ===== **/
    /**
     *  @notice Emitted when proposal fee is updated.
     *
     *          Name        Description
     *  @param  newValue    New proposal fee.
     */
    event FeeUpdate(uint256 newValue);

    /**
     *  @notice Emitted when a new proposal is submitted.
     *
     *          Name                Description
     *  @param  governor            Governor contract address.
     *  @param  proposalId          Proposal identifier.
     *  @param  proposer            Proposer address.
     *  @param  tokenId             Asset identifier from the governor contract.
     *  @param  uuid                Checksum of proposal context.
     *  @param  operator            Operator address.
     *  @param  rule                Rule to determine verdict.
     *  @param  quorumRate          Fraction of total weight for quorum.
     *  @param  duration            Voting duration.
     *  @param  admissionExpiry     Expiration for moderators to admit the proposal.
     */
    event NewProposal(
        address indexed governor,
        uint256 indexed proposalId,
        address indexed proposer,
        uint256 tokenId,
        bytes32 uuid,
        address operator,
        ProposalRule rule,
        uint256 quorumRate,
        uint40 duration,
        uint40 admissionExpiry
    );


    /**
     *  @notice Emitted when a proposal is admitted.
     *
     *          Name                Description
     *  @param  proposalId          Proposal identifier.
     *  @param  contextURI          URI of proposal context.
     *  @param  reviewURI           URI of review detail.
     *  @param  totalWeight         Total weight of the asset at the admission timestamp.
     *  @param  quorum              Quorum to determine verdict calculated from the initiated quorum rate and the total weight.
     *  @param  currency            Budget currency address.
     *
     *  @dev    The checksum of data from the `contextURI` should match `uuid`. Contract cannot validate this but defects are
     *          detectable. Checksum algorithm must be declared in the context.
     */
    event ProposalAdmission(
        uint256 indexed proposalId,
        string contextURI,
        string reviewURI,
        uint256 totalWeight,
        uint256 quorum,
        address currency
    );

    /**
     *  @notice Emitted when the budget of a proposal is contributed.
     *
     *          Name                Description
     *  @param  proposalId          Proposal identifier.
     *  @param  contributor         Contributor address.
     *  @param  value               Contributed value.
     */
    event ProposalBudgetContribution(
        uint256 indexed proposalId,
        address indexed contributor,
        uint256 value
    );

    /**
     *  @notice Emitted when the budget of a proposal has a contributor withdrawn the contribution.
     *
     *          Name                Description
     *  @param  proposalId          Proposal identifier.
     *  @param  contributor         Contributor address.
     *  @param  value               Withdrawn value.
     */
    event ProposalBudgetContributionWithdrawal(
        uint256 indexed proposalId,
        address indexed contributor,
        uint256 value
    );

    /**
     *  @notice Emitted when a proposal is confirmed to be executed.
     *
     *          Name                Description
     *  @param  proposalId          Proposal identifier.
     *  @param  budget              Contributed budget for execution.
     */
    event ProposalConfirmation(
        uint256 indexed proposalId,
        uint256 budget
    );


    /**
     *  @notice Emitted when a proposal is disqualified.
     *
     *          Name                Description
     *  @param  proposalId          Proposal identifier.
     *  @param  contextURI          URI of proposal context.
     *  @param  reviewURI           URI of review detail.
     *
     *  @dev    The checksum of data from the `contextURI` should match `uuid`. Contract cannot validate this but defects are
     *          detectable. Checksum algorithm must be declared in the context.
     */
    event ProposalDisqualification(
        uint256 indexed proposalId,
        string contextURI,
        string reviewURI
    );

    /**
     *  @notice Emitted when a proposal receives a vote.
     *
     *          Name                Description
     *  @param  proposalId          Proposal identifier.
     *  @param  voter               Voter address.
     *  @param  voteOption          Vote option.
     *  @param  weight              Vote power at the admission timestamp.
     *
     *  @dev    The checksum of data from the `contextURI` should match `uuid`. Contract cannot validate this but defects are
     *          detectable. Checksum algorithm must be declared in the context.
     */
    event ProposalVote(
        uint256 indexed proposalId,
        address indexed voter,
        ProposalVoteOption indexed voteOption,
        uint256 weight
    );


    /**
     *  @notice Emitted when the execution of a proposal is concluded.
     *
     *          Name                Description
     *  @param  proposalId          Proposal identifier.
     *  @param  resultURI           URI of final execution result.
     *  @param  isSuccessful        Whether the execution has succeeded.
     */
    event ProposalExecutionConclusion(
        uint256 indexed proposalId,
        string resultURI,
        bool isSuccessful
    );

    /**
     *  @notice Emitted when the execution of a proposal is rejected.
     *
     *          Name                Description
     *  @param  proposalId          Proposal identifier.
     */
    event ProposalExecutionRejection(
        uint256 indexed proposalId
    );

    /**
     *  @notice Emitted when execution progress for a proposal is updated.
     *
     *          Name                Description
     *  @param  proposalId          Proposal identifier.
     *  @param  logURI              URI of description about the progress of execution.
     */
    event ProposalExecutionLog(
        uint256 indexed proposalId,
        string logURI
    );

    /** ===== ERROR ===== **/
    error AlreadyVoted();
    error ConflictedQuorum();
    error ConflictedWeight();
    error InvalidAdmitting();
    error InvalidConcluding();
    error InvalidConfirming();
    error InvalidContributing();
    error InvalidDisqualifying();
    error InvalidProposalId();
    error InvalidRejecting();
    error InvalidTokenId();
    error InvalidVoting();
    error InvalidWithdrawing();
    error NothingToWithdraw();
    error NoVotingPower();
    error Overdue();
    error Timeout();
    error UnavailableToken();

    /** ===== FUNCTION ===== **/
    /* --- Query --- */
    /**
     *          Name            Description
     *  @return fee             Proposal fee charged in native coin.
     */
    function fee() external view returns (uint256 fee);

    /**
     *          Name            Description
     *  @return proposalNumber  Number of proposals.
     */
    function proposalNumber() external view returns (uint256 proposalNumber);


    /**
     *          Name            Description
     *  @param  proposalId      Proposal identifier.
     *  @return proposal        Information and progress of the proposal.
     */
    function getProposal(
        uint256 proposalId
    ) external view returns (Proposal memory proposal);

    /**
     *          Name            Description
     *  @param  proposalId      Proposal identifier.
     *  @return state           State of the proposal.
     */
    function getProposalState(
        uint256 proposalId
    ) external view returns (ProposalState state);

    /**
     *          Name            Description
     *  @param  proposalId      Proposal identifier.
     *  @return verdict         Verdict of the proposal.
     */
    function getProposalVerdict(
        uint256 proposalId
    ) external view returns (ProposalVerdict verdict);

    /**
     *          Name            Description
     *  @param  proposalId      Proposal identifier.
     *  @param  account         EVM address.
     *  @return contribution    Budget contribution of the account.
     */
    function contributions(
        uint256 proposalId,
        address account
    ) external view returns (uint256 contribution);

    /**
     *          Name            Description
     *  @param  proposalId      Proposal identifier.
     *  @param  account         EVM address.
     *  @return option          Vote option of the account.
     */
    function voteOptions(
        uint256 proposalId,
        address account
    ) external view returns (ProposalVoteOption option);

    /* --- Command --- */
    /**
     *  @notice Propose a new operation on an asset from a governor contract.
     *
     *          Name                Description
     *  @param  governor            Governor contract address.
     *  @param  tokenId             Asset identifier from the governor contract.
     *  @param  operator            Assigned operator address.
     *  @param  uuid                Checksum of proposal context.
     *  @param  rule                Rule to determine verdict.
     *  @param  rule                Rule to determine verdict.
     *  @param  quorumRate          Fraction of total weight for quorum.
     *  @param  duration            Voting duration.
     *  @param  admissionExpiry     Expiration for moderators to admit the proposal.
     *  @param  validation          Validation package from the validator.
     *  @return proposalId          New proposal identifier.
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
     *  @dev    Validation data:
     *          ```
     *          data = abi.encode(
     *              governor,
     *              tokenId,
     *              msg.sender,
     *              uuid,
     *              operator,
     *              rule,
     *              quorumRate,
     *              duration,
     *              admissionExpiry
     *          )
     *          ```
     */
    function propose(
        address governor,
        uint256 tokenId,
        address operator,
        bytes32 uuid,
        ProposalRule rule,
        uint256 quorumRate,
        uint40 duration,
        uint40 admissionExpiry,
        Validation calldata validation
    ) external payable returns (uint256 proposalId);


    /**
     *  @notice Admit an executable proposal after review.
     *
     *          Name            Description
     *  @param  proposalId      Proposal identifier.
     *  @param  contextURI      URI of proposal context.
     *  @param  reviewURI       URI of review detail.
     *  @param  currency        Budget currency address.
     *  @param  validation      Validation package from the validator.
     *
     *  @dev    Permission: managers.
     *  @dev    As the proposal has only set `uuid` before admission, `contextURI` must be provided when admitting.
     *  @dev    Validation data:
     *          ```
     *          data = abi.encode(
     *              contextURI,
     *              reviewURI,
     *              currency
     *          )
     *          ```
     */
    function admit(
        uint256 proposalId,
        string calldata contextURI,
        string calldata reviewURI,
        address currency,
        Validation calldata validation
    ) external;

    /**
     *  @notice Confirm a proposal to be executed.
     *
     *          Name            Description
     *  @param  proposalId      Proposal identifier.
     *  @return budget          Contributed budget for execution.
     *
     *  @dev    Permission: managers.
     */
    function confirm(
        uint256 proposalId
    ) external returns (uint256 budget);

    /**
     *  @notice Contribute to the budget of a proposal.
     *
     *          Name            Description
     *  @param  proposalId      Proposal identifier.
     *  @param  value           Contributed value.
     */
    function contributeBudget(
        uint256 proposalId,
        uint256 value
    ) external payable;

    /**
     *  @notice Disqualify an inexecutable proposal after review.
     *
     *          Name            Description
     *  @param  proposalId      Proposal identifier.
     *  @param  contextURI      URI of proposal context.
     *  @param  reviewURI       URI of review detail.
     *  @param  validation      Validation package from the validator.
     *
     *  @dev    Permission: managers.
     *  @dev    As the proposal has only set `uuid` before disqualification, `contextURI` must be provided when disqualifying.
     */
    function disqualify(
        uint256 proposalId,
        string calldata contextURI,
        string calldata reviewURI,
        Validation calldata validation
    ) external;

    /**
     *  @notice Vote on a proposal.
     *
     *          Name            Description
     *  @param  proposalId      Proposal identifier.
     *  @param  option          Vote option.
     *  @return weight          Vote power.
     */
    function vote(
        uint256 proposalId,
        ProposalVoteOption option
    ) external returns (uint256 weight);

    /**
     *  @notice Withdraw contribution from a proposal which is either disqualified or rejected.
     *
     *          Name            Description
     *  @param  proposalId      Proposal identifier.
     *  @return contribution    Withdrawn value.
     */
    function withdrawBudgetContribution(
        uint256 proposalId
    ) external returns (uint256 contribution);


    /**
     *  @notice Conclude the execution of a proposal.
     *
     *          Name            Description
     *  @param  proposalId      Proposal identifier.
     *  @param  resultURI       URI of final execution result.
     *  @param  isSuccessful    Whether the execution has succeeded.
     *  @param  validation      Validation package from the validator.
     *
     *  @dev    Permission: proposal's operators.
     *  @dev    Validation data:
     *          ```
     *          data = abi.encode(resultURI)
     *          ```
     */
    function concludeExecution(
        uint256 proposalId,
        string calldata resultURI,
        bool isSuccessful,
        Validation calldata validation
    ) external;

    /**
     *  @notice Update a proposal about the progress of execution.
     *
     *          Name            Description
     *  @param  proposalId      Proposal identifier.
     *  @param  logURI          URI of description about the progress of execution.
     *  @param  validation      Validation package from the validator.
     *
     *  @dev    Permission: managers.
     *  @dev    Validation data:
     *          ```
     *          data = abi.encode(logURI)
     *          ```
     */
    function logExecution(
        uint256 proposalId,
        string calldata logURI,
        Validation calldata validation
    ) external;

    /**
     *  @notice Reject to execute a proposal.
     *
     *          Name            Description
     *  @param  proposalId      Proposal identifier.
     *
     *  @dev    Permission: proposal's operator.
     */
    function rejectExecution(
        uint256 proposalId
    ) external;

    /* --- Safe Command --- */
    /**
     *  @notice Vote on a proposal.
     *
     *          Name        Description
     *  @param  proposalId  Proposal identifier.
     *  @param  option      Vote option.
     *  @param  anchor      `uuid` of the proposal.
     *  @return weight      Vote power.
     */
    function safeVote(
        uint256 proposalId,
        ProposalVoteOption option,
        bytes32 anchor
    ) external returns (uint256 weight);

    /**
     *  @notice Contribute to the budget of a proposal.
     *
     *          Name        Description
     *  @param  proposalId  Proposal identifier.
     *  @param  value       Contributed value.
     *  @param  anchor      `uuid` of the proposal.
     */
    function safeContributeBudget(
        uint256 proposalId,
        uint256 value,
        bytes32 anchor
    ) external payable;
}
