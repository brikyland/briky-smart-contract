# Solidity API

## IGovernanceHub

@author Briky Team

 @notice Interface for contract `GovernanceHub`.
 @notice The `GovernanceHub` contract facilitates voting among holders of an asset from governor contracts to decide on
         proposals that affects the asset.

 @dev    With client-side support, accounts can propose by submitting a full proper context to the server-side and
         forwarding only its checksum to the contract as the UUID of the new proposal. Authorized executives will later
         verify the feasibility of the proposal within a given expiration to either admit or disqualify it accordingly.
         During this process, the full context is uploaded to a public database (e.g., IPFS), and the link is submitted to
         be the URI of proposal context. This approach protects the database from external attacks as well as ensures
         proposals remain validatable and user-oriented.
 @dev    Implementation involves server-side support.
 @dev    ERC-20 tokens are identified by their contract addresses.
         Native coin is represented by the zero address (0x0000000000000000000000000000000000000000).

### FeeUpdate

```solidity
event FeeUpdate(uint256 newValue)
```

@notice Emitted when the proposing fee is updated.

         Name        Description
 @param  newValue    New proposing fee charged in native coin.

### NewProposal

```solidity
event NewProposal(address governor, uint256 proposalId, address proposer, uint256 tokenId, address operator, bytes32 uuid, enum IProposal.ProposalRule rule, uint256 quorumRate, uint40 duration, uint40 admissionExpiry)
```

@notice Emitted when a new proposal is submitted.

         Name                Description
 @param  governor            Governor contract address.
 @param  proposalId          Proposal identifier.
 @param  proposer            Proposer address.
 @param  tokenId             Asset identifier from the governor contract.
 @param  uuid                Checksum of proposal context.
 @param  operator            Operator address.
 @param  rule                Rule to determine verdict.
 @param  quorumRate          Fraction of total weight for quorum.
 @param  duration            Voting duration.
 @param  admissionExpiry     Expiration for proposal admission.

### ProposalAdmission

```solidity
event ProposalAdmission(uint256 proposalId, string contextURI, string reviewURI, address currency, uint256 totalWeight, uint256 quorum)
```

@notice Emitted when a proposal is admitted.

         Name            Description
 @param  proposalId      Proposal identifier.
 @param  contextURI      URI of proposal context.
 @param  reviewURI       URI of review detail.
 @param  totalWeight     Total weight of the asset at the admission timestamp.
 @param  quorum          Quorum to determine verdict calculated from the initiated quorum rate and the total weight.
 @param  currency        Budget currency address.

 @dev    The checksum of data from the `contextURI` should match `uuid`. Contract cannot validate this but defects are
         detectable. Checksum algorithm must be declared in the context.

### ProposalBudgetContribution

```solidity
event ProposalBudgetContribution(uint256 proposalId, address contributor, uint256 value)
```

@notice Emitted when the budget of a proposal is contributed.

         Name            Description
 @param  proposalId      Proposal identifier.
 @param  contributor     Contributor address.
 @param  value           Contributed value.

### ProposalBudgetContributionWithdrawal

```solidity
event ProposalBudgetContributionWithdrawal(uint256 proposalId, address contributor, uint256 value)
```

@notice Emitted when the contribution of a contributor is withdrawn from the budget of a proposal.

         Name            Description
 @param  proposalId      Proposal identifier.
 @param  contributor     Contributor address.
 @param  value           Withdrawn value.

### ProposalConfirmation

```solidity
event ProposalConfirmation(uint256 proposalId, uint256 budget)
```

@notice Emitted when a proposal is confirmed to be executed.

         Name            Description
 @param  proposalId      Proposal identifier.
 @param  budget          Contributed budget for execution.

### ProposalDisqualification

```solidity
event ProposalDisqualification(uint256 proposalId, string contextURI, string reviewURI)
```

@notice Emitted when a proposal is disqualified.

         Name            Description
 @param  proposalId      Proposal identifier.
 @param  contextURI      URI of proposal context.
 @param  reviewURI       URI of review detail.

 @dev    The checksum of data from the `contextURI` should match `uuid`. Contract cannot validate this but defects are
         detectable. Checksum algorithm must be declared in the context.

### ProposalVote

```solidity
event ProposalVote(uint256 proposalId, address voter, enum IProposal.ProposalVoteOption voteOption, uint256 weight)
```

@notice Emitted when a proposal receives a vote.

         Name            Description
 @param  proposalId      Proposal identifier.
 @param  voter           Voter address.
 @param  voteOption      Vote option.
 @param  weight          Vote power at the admission timestamp.

### ProposalExecutionConclusion

```solidity
event ProposalExecutionConclusion(uint256 proposalId, string resultURI, bool isSuccessful)
```

@notice Emitted when the execution of a proposal is concluded.

         Name            Description
 @param  proposalId      Proposal identifier.
 @param  resultURI       URI of execution result.
 @param  isSuccessful    Whether the execution has succeeded.

### ProposalExecutionRejection

```solidity
event ProposalExecutionRejection(uint256 proposalId)
```

@notice Emitted when the execution of a proposal is rejected.

         Name            Description
 @param  proposalId      Proposal identifier.

### ProposalExecutionLog

```solidity
event ProposalExecutionLog(uint256 proposalId, string logURI)
```

@notice Emitted when execution progress of a proposal is updated.

         Name            Description
 @param  proposalId      Proposal identifier.
 @param  logURI          URI of execution progress log.

### AlreadyVoted

```solidity
error AlreadyVoted()
```

===== ERROR ===== *

### ConflictedQuorum

```solidity
error ConflictedQuorum()
```

### ConflictedWeight

```solidity
error ConflictedWeight()
```

### InvalidAdmitting

```solidity
error InvalidAdmitting()
```

### InvalidConcluding

```solidity
error InvalidConcluding()
```

### InvalidConfirming

```solidity
error InvalidConfirming()
```

### InvalidContributing

```solidity
error InvalidContributing()
```

### InvalidDisqualifying

```solidity
error InvalidDisqualifying()
```

### InvalidProposalId

```solidity
error InvalidProposalId()
```

### InvalidRejecting

```solidity
error InvalidRejecting()
```

### InvalidTokenId

```solidity
error InvalidTokenId()
```

### InvalidVoting

```solidity
error InvalidVoting()
```

### InvalidWithdrawing

```solidity
error InvalidWithdrawing()
```

### NothingToWithdraw

```solidity
error NothingToWithdraw()
```

### NoVotingPower

```solidity
error NoVotingPower()
```

### Overdue

```solidity
error Overdue()
```

### Timeout

```solidity
error Timeout()
```

### UnavailableToken

```solidity
error UnavailableToken()
```

### fee

```solidity
function fee() external view returns (uint256 fee)
```

Name            Description
 @return fee             Proposing fee charged in native coin.

### proposalNumber

```solidity
function proposalNumber() external view returns (uint256 proposalNumber)
```

Name            Description
 @return proposalNumber  Number of proposals.

### getProposal

```solidity
function getProposal(uint256 proposalId) external view returns (struct IProposal.Proposal proposal)
```

Name            Description
 @param  proposalId      Proposal identifier.
 @return proposal        Configuration and progress of the proposal.

### getProposalState

```solidity
function getProposalState(uint256 proposalId) external view returns (enum IProposal.ProposalState state)
```

Name            Description
 @param  proposalId      Proposal identifier.
 @return state           State of the proposal.

### getProposalVerdict

```solidity
function getProposalVerdict(uint256 proposalId) external view returns (enum IProposal.ProposalVerdict verdict)
```

Name            Description
 @param  proposalId      Proposal identifier.
 @return verdict         Verdict of the proposal.

### contributions

```solidity
function contributions(uint256 proposalId, address account) external view returns (uint256 contribution)
```

Name            Description
 @param  proposalId      Proposal identifier.
 @param  account         EVM address.
 @return contribution    Budget contribution of the account.

### voteOptions

```solidity
function voteOptions(uint256 proposalId, address account) external view returns (enum IProposal.ProposalVoteOption voteOption)
```

Name            Description
 @param  proposalId      Proposal identifier.
 @param  account         EVM address.
 @return voteOption      Vote option of the account.

### propose

```solidity
function propose(address governor, uint256 tokenId, address operator, bytes32 uuid, enum IProposal.ProposalRule rule, uint256 quorumRate, uint40 duration, uint40 admissionExpiry, struct IValidation.Validation validation) external payable returns (uint256 proposalId)
```

@notice Propose a new operation on an asset from a governor contract.

         Name                Description
 @param  governor            Governor contract address.
 @param  tokenId             Asset identifier from the governor contract.
 @param  operator            Assigned operator address.
 @param  uuid                Checksum of proposal context.
 @param  rule                Rule to determine verdict.
 @param  quorumRate          Fraction of total weight for quorum.
 @param  duration            Voting duration.
 @param  admissionExpiry     Expiration for proposal admission.
 @param  validation          Validation package from the validator.
 @return proposalId          New proposal identifier.

 @dev    Any current holder of the asset, with client-side support, can propose by submitting a full proper context to
         the server-side and forwarding only its checksum to this contract as the UUID of the new proposal. Authorized
         executives will later verify the feasibility of the proposal within a given expiration to either admit or
         disqualify it accordingly. During this process, the full context is uploaded to a public database (e.g., IPFS),
         and the link is submitted to be the URI of proposal context. This approach protects the database from external
         attacks as well as ensures proposals remain validatable and user-oriented.
 @dev    Through the validation mechanism, the server-side determines `uuid`, `quorumRate`, `duration` and
         `admissionExpiry` based on the specific supported type of proposal and its context. Operators are also required
         to be pre-registered on the server-side to ensure proper assignments.
 @dev    Validation data:
         ```
         data = abi.encode(
             governor,
             tokenId,
             msg.sender,
             uuid,
             operator,
             rule,
             quorumRate,
             duration,
             admissionExpiry
         );
         ```

### admit

```solidity
function admit(uint256 proposalId, string contextURI, string reviewURI, address currency, struct IValidation.Validation validation) external
```

@notice Admit an executable proposal after review practicability.
 @notice Admit only if the proposal is in `Pending` state and before admission time limit has expired.

         Name            Description
 @param  proposalId      Proposal identifier.
 @param  contextURI      URI of proposal context.
 @param  reviewURI       URI of review detail.
 @param  currency        Budget currency address.
 @param  validation      Validation package from the validator.

 @dev    Permissions: Asset representative of the proposal.
 @dev    As the proposal has only set `uuid` before admission, `contextURI` must be provided when admitting.
 @dev    Validation data:
         ```
         data = abi.encode(
             proposalId,
             contextURI,
             reviewURI,
             currency
         );
         ```

### confirm

```solidity
function confirm(uint256 proposalId) external returns (uint256 budget)
```

@notice Confirm a proposal to be executed.
 @notice Confirm only if the proposal is approved and before the confirmation time limit has expired.
 @notice On proposal confirmation, the budget is transferred to the operator.

         Name            Description
 @param  proposalId      Proposal identifier.
 @return budget          Contributed budget for execution.

 @dev    Permission: Managers active in the zone of the asset.

### contributeBudget

```solidity
function contributeBudget(uint256 proposalId, uint256 value) external payable
```

@notice Contribute to the budget of a proposal.
 @notice Contribute only before the proposal is confirmed or the confirmation time limit has expired.

         Name            Description
 @param  proposalId      Proposal identifier.
 @param  value           Contributed value.

### disqualify

```solidity
function disqualify(uint256 proposalId, string contextURI, string reviewURI, struct IValidation.Validation validation) external
```

@notice Disqualify an inexecutable proposal after review practicability.
 @notice Disqualify only if the proposal is in `Pending` or `Voting` state and before the vote closes.

         Name            Description
 @param  proposalId      Proposal identifier.
 @param  contextURI      URI of proposal context.
 @param  reviewURI       URI of review detail.
 @param  validation      Validation package from the validator.

 @dev    Permission:
         - Asset representative of the proposal: during `Pending` state.
         - Managers: during `Pending` and `Voting` state.
 @dev    As the proposal has only set `uuid` before disqualification, `contextURI` must be provided when disqualifying.

### vote

```solidity
function vote(uint256 proposalId, enum IProposal.ProposalVoteOption voteOption) external returns (uint256 weight)
```

@notice Vote on a proposal.
 @notice Vote only if the proposal is in `Voting` state and before the vote closes.

         Name            Description
 @param  proposalId      Proposal identifier.
 @param  voteOption      Vote option.
 @return weight          Vote power.

### withdrawBudgetContribution

```solidity
function withdrawBudgetContribution(uint256 proposalId) external returns (uint256 contribution)
```

@notice Withdraw contribution from a proposal which can no longer be executed.
 @notice Withdraw only if the proposal is either disapproved, disqualified or rejected, or after confirmation time limit
         has expired.

         Name            Description
 @param  proposalId      Proposal identifier.
 @return contribution    Withdrawn value.

### concludeExecution

```solidity
function concludeExecution(uint256 proposalId, string resultURI, bool isSuccessful, struct IValidation.Validation validation) external
```

@notice Conclude the execution of a proposal.
 @notice Conclude only if the proposal is in `Executing` state.

         Name            Description
 @param  proposalId      Proposal identifier.
 @param  resultURI       URI of execution result.
 @param  isSuccessful    Whether the execution has succeeded.
 @param  validation      Validation package from the validator.

 @dev    Permission: Asset representative of the proposal.
 @dev    Validation data:
         ```
         data = abi.encode(
             proposalId,
             resultURI,
             isSuccessful
         );
         ```

### logExecution

```solidity
function logExecution(uint256 proposalId, string logURI, struct IValidation.Validation validation) external
```

@notice Update a proposal about the progress of execution.
 @notice Update only if the proposal is in `Executing` state.

         Name            Description
 @param  proposalId      Proposal identifier.
 @param  logURI          URI of execution progress log.
 @param  validation      Validation package from the validator.

 @dev    Permission: Operator of the proposal.
 @dev    Validation data:
         ```
         data = abi.encode(
             proposalId,
             logURI
         );
         ```

### rejectExecution

```solidity
function rejectExecution(uint256 proposalId) external
```

@notice Reject to execute a proposal.
 @notice Reject only if the proposal is in `Voting` state.

         Name            Description
 @param  proposalId      Proposal identifier.

 @dev    Permission: Operator of the proposal.

### safeVote

```solidity
function safeVote(uint256 proposalId, enum IProposal.ProposalVoteOption voteOption, bytes32 anchor) external returns (uint256 weight)
```

@notice Vote on a proposal.
 @notice Vote only if the proposal is in `Voting` state and before the vote closes.

         Name        Description
 @param  proposalId  Proposal identifier.
 @param  voteOption  Vote option.
 @param  anchor      `uuid` of the proposal.
 @return weight      Vote power.

 @dev    Anchor enforces consistency between this contract and the client-side.

### safeContributeBudget

```solidity
function safeContributeBudget(uint256 proposalId, uint256 value, bytes32 anchor) external payable
```

@notice Contribute to the budget of a proposal.
 @notice Contribute only before the proposal is confirmed or the confirmation time limit has expired.

         Name        Description
 @param  proposalId  Proposal identifier.
 @param  value       Contributed value.
 @param  anchor      `uuid` of the proposal.

 @dev    Anchor enforces consistency between this contract and the client-side.

