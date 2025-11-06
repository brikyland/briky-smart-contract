# Solidity API

## GovernanceHub

@author Briky Team

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

### validProposal

```solidity
modifier validProposal(uint256 _proposalId)
```

@notice Verify a valid proposal identifier.

         Name            Description
 @param  _proposalId     Proposal Identifier.

### onlyOperator

```solidity
modifier onlyOperator(uint256 _proposalId)
```

@notice Verify the message sender is the operator of a proposal.

         Name            Description
 @param  _proposalId     Proposal Identifier.

### onlyRepresentative

```solidity
modifier onlyRepresentative(uint256 _proposalId)
```

@notice Verify the message sender is the representative of the asset from of a proposal.

         Name            Description
 @param  _proposalId     Proposal Identifier.

### receive

```solidity
receive() external payable
```

@notice Executed on a call to this contract with empty calldata.

### version

```solidity
function version() external pure returns (string)
```

@return Version of implementation.

### initialize

```solidity
function initialize(address _admin, address _validator, uint256 _fee) external
```

@notice Initialize the contract after deployment, serving as the constructor.

         Name        Description
 @param  _admin      `Admin` contract address.
 @param  _validator  Validator address.
 @param  _fee        Proposing fee charged in native coin.

### updateFee

```solidity
function updateFee(uint256 _fee, bytes[] _signatures) external
```

@notice Update the proposing fee.

         Name            Description
 @param  _fee            New proposing fee charged in native coin.
 @param  _signatures     Array of admin signatures.

 @dev    Administrative operator.

### getProposal

```solidity
function getProposal(uint256 _proposalId) external view returns (struct IProposal.Proposal)
```

Name            Description
 @param  _proposalId     Proposal identifier.

 @return Configuration and progress of the proposal.

### getProposalState

```solidity
function getProposalState(uint256 _proposalId) external view returns (enum IProposal.ProposalState)
```

Name            Description
 @param  _proposalId     Proposal identifier.

 @return State of the proposal.

### getProposalVerdict

```solidity
function getProposalVerdict(uint256 _proposalId) external view returns (enum IProposal.ProposalVerdict)
```

Name            Description
 @param  _proposalId     Proposal identifier.

 @return Verdict of the proposal.

### propose

```solidity
function propose(address _governor, uint256 _tokenId, address _operator, bytes32 _uuid, enum IProposal.ProposalRule _rule, uint256 _quorumRate, uint40 _duration, uint40 _admissionExpiry, struct IValidation.Validation _validation) external payable returns (uint256)
```

@notice Propose a new operation on an asset from a governor contract.

         Name                Description
 @param  _governor           Governor contract address.
 @param  _tokenId            Asset identifier from the governor contract.
 @param  _operator           Assigned operator address.
 @param  _uuid               Checksum of proposal context.
 @param  _rule               Rule to determine verdict.
 @param  _quorumRate         Fraction of total weight for quorum.
 @param  _duration           Voting duration.
 @param  _admissionExpiry    Expiration for proposal admission.
 @param  _validation         Validation package from the validator.

 @return New proposal identifier.

 @dev    Any current holder of the asset, with client-side support, can propose by submitting a full proper context to
         the server-side and forwarding only its checksum to this contract as the UUID of the new proposal. Authorized
         executives will later verify the feasibility of the proposal within a given expiration to either admit or
         disqualify it accordingly. During this process, the full context is uploaded to a public database (e.g., IPFS),
         and the link is submitted to be the URI of proposal context. This approach protects the database from external
         attacks as well as ensures proposals remain validatable and user-oriented.
 @dev    Through the validation mechanism, the server-side determines `uuid`, `quorumRate`, `duration` and
         `admissionExpiry` based on the specific supported type of proposal and its context. Operators are also required
         to be pre-registered on the server-side to ensure proper assignments.

### admit

```solidity
function admit(uint256 _proposalId, string _contextURI, string _reviewURI, address _currency, struct IValidation.Validation _validation) external
```

@notice Admit an executable proposal after review practicability.
 @notice Admit only if the proposal is in `Pending` state and before admission time limit has expired.

         Name                Description
 @param  _proposalId         Proposal identifier.
 @param  _contextURI         URI of proposal context.
 @param  _reviewURI          URI of review detail.
 @param  _currency           Budget currency address.
 @param  _validation         Validation package from the validator.

 @dev    Permissions: Asset representative of the proposal.
 @dev    As the proposal has only set `uuid` before admission, `contextURI` must be provided when admitting.

### disqualify

```solidity
function disqualify(uint256 _proposalId, string _contextURI, string _reviewURI, struct IValidation.Validation _validation) external
```

@notice Disqualify an inexecutable proposal after review practicability.
 @notice Disqualify only if the proposal is in `Pending` or `Voting` state and before the vote closes.

         Name                Description
 @param  _proposalId         Proposal identifier.
 @param  _contextURI         URI of proposal context.
 @param  _reviewURI          URI of review detail.
 @param  _validation         Validation package from the validator.

 @dev    Permission:
         - Asset representative of the proposal: during `Pending` state.
         - Managers: during `Pending` and `Voting` state.
 @dev    As the proposal has only set `uuid` before disqualification, `contextURI` must be provided when disqualifying.

### vote

```solidity
function vote(uint256 _proposalId, enum IProposal.ProposalVoteOption _voteOption) external returns (uint256)
```

@notice Vote on a proposal.
 @notice Vote only if the proposal is in `Voting` state and before the vote closes.

         Name                Description
 @param  _proposalId         Proposal identifier.
 @param  _voteOption         Vote option.

 @return Vote power.

### safeVote

```solidity
function safeVote(uint256 _proposalId, enum IProposal.ProposalVoteOption _voteOption, bytes32 _anchor) external returns (uint256)
```

@notice Vote on a proposal.
 @notice Vote only if the proposal is in `Voting` state and before the vote closes.

         Name                Description
 @param  _proposalId         Proposal identifier.
 @param  _voteOption         Vote option.
 @param  _anchor             `uuid` of the proposal.

 @return Vote power.

 @dev    Anchor enforces consistency between this contract and the client-side.

### contributeBudget

```solidity
function contributeBudget(uint256 _proposalId, uint256 _value) external payable
```

@notice Contribute to the budget of a proposal.
 @notice Contribute only before the proposal is confirmed or the confirmation time limit has expired.

         Name                Description
 @param  _proposalId         Proposal identifier.
 @param  _value              Contributed value.

### safeContributeBudget

```solidity
function safeContributeBudget(uint256 _proposalId, uint256 _value, bytes32 _anchor) external payable
```

@notice Contribute to the budget of a proposal.
 @notice Contribute only before the proposal is confirmed or the confirmation time limit has expired.

         Name                Description
 @param  _proposalId         Proposal identifier.
 @param  _value              Contributed value.
 @param  _anchor             `uuid` of the proposal.

 @dev    Anchor enforces consistency between this contract and the client-side.

### withdrawBudgetContribution

```solidity
function withdrawBudgetContribution(uint256 _proposalId) external returns (uint256)
```

@notice Withdraw contribution from a proposal which can no longer be executed.
 @notice Withdraw only if the proposal is either disapproved, disqualified or rejected, or after confirmation time limit
         has expired.

         Name                Description
 @param  _proposalId         Proposal identifier.

 @return Withdrawn value.

### confirm

```solidity
function confirm(uint256 _proposalId) external returns (uint256)
```

@notice Confirm a proposal to be executed.
 @notice Confirm only if the proposal is approved and before the confirmation time limit has expired.
 @notice On proposal confirmation, the budget is transferred to the operator.

         Name                Description
 @param  _proposalId         Proposal identifier.

 @return Contributed budget for execution.

 @dev    Permission: Managers active in the zone of the asset.

### rejectExecution

```solidity
function rejectExecution(uint256 _proposalId) external
```

@notice Reject to execute a proposal.
 @notice Reject only if the proposal is in `Voting` state.

         Name                Description
 @param  _proposalId         Proposal identifier.

 @dev    Permission: Operator of the proposal.

### logExecution

```solidity
function logExecution(uint256 _proposalId, string _logURI, struct IValidation.Validation _validation) external
```

@notice Update a proposal about the progress of execution.
 @notice Update only if the proposal is in `Executing` state.

         Name                Description
 @param  _proposalId         Proposal identifier.
 @param  _logURI             URI of execution progress log.
 @param  _validation         Validation package from the validator.

 @dev    Permission: Operator of the proposal.

### concludeExecution

```solidity
function concludeExecution(uint256 _proposalId, string _resultURI, bool _isSuccessful, struct IValidation.Validation _validation) external
```

@notice Conclude the execution of a proposal.
 @notice Conclude only if the proposal is in `Executing` state.

         Name            Description
 @param  _proposalId     Proposal identifier.
 @param  _resultURI      URI of execution result.
 @param  _isSuccessful   Whether the execution has succeeded.
 @param  _validation     Validation package from the validator.

 @dev    Permission: Asset representative of the proposal.

### _votingVerdict

```solidity
function _votingVerdict(struct IProposal.Proposal _proposal) internal view returns (enum IProposal.ProposalVerdict)
```

@notice Evaluate the verdict of the vote of a proposal

         Name            Description
 @param  _proposal       Proposal.

 @return Verdict of the proposal.

### _vote

```solidity
function _vote(uint256 _proposalId, enum IProposal.ProposalVoteOption _voteOption) internal returns (uint256)
```

@notice Vote on a proposal.

         Name                Description
 @param  _proposalId         Proposal identifier.
 @param  _voteOption         Vote option.

 @return Vote power.

### _contributeBudget

```solidity
function _contributeBudget(uint256 _proposalId, uint256 _value) internal
```

@notice Contribute to the budget of a proposal.

         Name                Description
 @param  _proposalId         Proposal identifier.
 @param  _value              Contributed value.

