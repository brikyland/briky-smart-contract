// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 *  @author Briky Team
 *
 *  @notice Interface for struct `Proposal`.
 *
 *  @dev    Implementation involves server-side support.
 *  @dev    ERC-20 tokens are identified by their contract addresses.
 *          Native coin is represented by the zero address (0x0000000000000000000000000000000000000000).
 */
interface IProposal {
    /** ===== ENUM ===== **/
    /**
     *  @notice Variants of vote option of an address for a proposal.
     */
    enum ProposalVoteOption {
        /// @notice Not voted.
        Nil,

        /// @notice Agree with the proposal.
        Approval,

        /// @notice Disagree with the proposal.
        Disapproval
    }

    /**
     *  @notice Variants of rule to determine the verdict of a proposal.
     */
    enum ProposalRule {
        /// @notice Total approval must meet the quorum in order for the proposal to pass.
        /// @notice Absent vote is counted as disapproval.
        ApprovalBeyondQuorum,

        /// @notice Total disapproval must meet the quorum in order for the proposal to fail.
        /// @notice Absent vote is counted as approval.
        DisapprovalBeyondQuorum
    }

    /**
     *  @notice Variants of state of a proposal.
     */
    enum ProposalState {
        /// @notice Not a proposal.
        Nil,

        /// @notice Awaiting admission.
        Pending,

        /// @notice Either being votable or awaiting confirmation to be executed.
        Voting,

        /// @notice Operator is executing the proposal.
        Executing,

        /// @notice Operator executed the proposal successfully.
        SuccessfulExecuted,

        /// @notice Operator executed the proposal unsuccessfully.
        UnsuccessfulExecuted,

        /// @notice Executives of the system disqualified the proposal.
        Disqualified,

        /// @notice Operator rejected executing the proposal.
        Rejected
    }

    /**
     *  @notice Variants of verdict of a proposal.
     */
    enum ProposalVerdict {
        /// @notice Not determined.
        Unsettled,

        /// @notice Passed due to the proposal rule.
        Passed,

        /// @notice Failed due to the proposal rule.
        Failed
    }


    /** ===== STRUCT ===== **/
    /**
     *  @notice A proposal will be executed on an asset by an assigned operator if approved through votes by its holders.
     *  @notice The proposal might require a budget to execute, which should be suggested in the context and contributed by
     *          holders under their own arrangements.
     *  @dev    Any current holder of the asset, with client-side support, can propose by submitting a full proper context to
     *          the server-side and forwarding only its checksum to the contract as the UUID of the new proposal. Authorized
     *          executives will later verify the feasibility of the proposal within a given expiration to either admit or
     *          disqualify it accordingly. During this process, the full context is uploaded to a public database (e.g., IPFS),
     *          and the link is submitted to be the URI of proposal context. This approach protects the database from external
     *          attacks as well as ensures proposals remains validatable and user-oriented.
     */
    struct Proposal {
        /// @notice Checksum of proposal context.
        bytes32 uuid;

        /// @notice URI of proposal context.
        /// @dev    The checksum of data from the URI should match `uuid`. Contract cannot validate this but defects are
        ///         detectable. Checksum algorithm must be declared in the context.
        string contextURI;

        /// @notice URI of description about the progress of execution.
        string logURI;

        /// @notice Governor contract address.
        /// @dev    This contract must support interface `IGovernor`.
        address governor;

        /// @notice Asset identifier from the governor contract.
        uint256 tokenId;

        /// @notice Total weight of the asset at the admission timestamp.
        uint256 totalWeight;

        /// @notice Total weight voted by approving holders with their voting power at the admission timestamp.
        uint256 approvalWeight;

        /// @notice Total weight voted by disapproving holders with their voting power at the admission timestamp.
        uint256 disapprovalWeight;

        /// @notice Quorum to determine verdict.
        /// @dev    In `Pending` state, `quorum` is a fraction value but since being admitted, the `totalWeight` is determined
        ///         so `quorum` is converted to vote metric.
        uint256 quorum;

        /// @notice Proposer address.
        address proposer;

        /// @notice Assigned operator address.
        address operator;

        /// @notice Due of vote.
        /// @dev    In `Pending` state, `due` indicates vote duration but since being admitted, `due` is the timestamp of vote
        ///         closure.
        uint40 due;

        /// @notice Time pivot of either the proposal is admitted or is no longer admittable.
        /// @dev    In `Pending` state, `timePivot` indicates when the proposal is expired for admission but since the being
        ///         admitted, `timePivot` snapshots the `block.timestamp` as reference for evaluating vote power.
        uint40 timePivot;

        /// @notice Rule to determine verdict.
        ProposalRule rule;

        /// @notice Current state.
        ProposalState state;

        /// @notice Contributed budget for execution.
        uint256 budget;

        /// @notice Budget currency address.
        address currency;
    }
}
