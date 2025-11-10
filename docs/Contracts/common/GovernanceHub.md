# Solidity API

## GovernanceHub

The `GovernanceHub` contract facilitates voting among holders of an asset from governor contracts to decide on
proposals that affects the asset.

_With client-side support, accounts can propose by submitting a full proper context to the server-side and
forwarding only its checksum to the contract as the UUID of the new proposal. Authorized executives will later
verify the feasibility of the proposal within a given expiration to either admit or disqualify it accordingly.
During this process, the full context is uploaded to a public database (e.g., IPFS), and the link is submitted to
be the URI of proposal context. This approach protects the database from external attacks as well as ensures
proposals remain validatable and user-oriented.
   Implementation involves server-side support.
   ERC-20 tokens are identified by their contract addresses.
Native coin is represented by the zero address (0x0000000000000000000000000000000000000000)._

### validProposal

```solidity
modifier validProposal(uint256 _proposalId)
```

Verify a valid proposal identifier.

Name            Description

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _proposalId | uint256 | Proposal Identifier. |

### onlyOperator

```solidity
modifier onlyOperator(uint256 _proposalId)
```

Verify the message sender is the operator of a proposal.

Name            Description

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _proposalId | uint256 | Proposal Identifier. |

### onlyRepresentative

```solidity
modifier onlyRepresentative(uint256 _proposalId)
```

Verify the message sender is the representative of the asset from of a proposal.

Name            Description

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _proposalId | uint256 | Proposal Identifier. |

### receive

```solidity
receive() external payable
```

Executed on a call to this contract with empty calldata.

### version

```solidity
function version() external pure returns (string)
```

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | string | Version of implementation. |

### initialize

```solidity
function initialize(address _admin, address _validator, uint256 _fee) external
```

Initialize the contract after deployment, serving as the constructor.

Name        Description

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _admin | address | `Admin` contract address. |
| _validator | address | Validator address. |
| _fee | uint256 | Proposing fee charged in native coin. |

### updateFee

```solidity
function updateFee(uint256 _fee, bytes[] _signatures) external
```

Update the proposing fee.

Name            Description

_Administrative operator._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _fee | uint256 | New proposing fee charged in native coin. |
| _signatures | bytes[] | Array of admin signatures. |

### getProposal

```solidity
function getProposal(uint256 _proposalId) external view returns (struct IProposal.Proposal)
```

Name            Description

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _proposalId | uint256 | Proposal identifier. |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | struct IProposal.Proposal | Configuration and progress of the proposal. |

### getProposalState

```solidity
function getProposalState(uint256 _proposalId) external view returns (enum IProposal.ProposalState)
```

Name            Description

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _proposalId | uint256 | Proposal identifier. |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | enum IProposal.ProposalState | State of the proposal. |

### getProposalVerdict

```solidity
function getProposalVerdict(uint256 _proposalId) external view returns (enum IProposal.ProposalVerdict)
```

Name            Description

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _proposalId | uint256 | Proposal identifier. |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | enum IProposal.ProposalVerdict | Verdict of the proposal. |

### propose

```solidity
function propose(address _governor, uint256 _tokenId, address _operator, bytes32 _uuid, enum IProposal.ProposalRule _rule, uint256 _quorumRate, uint40 _duration, uint40 _admissionExpiry, struct IValidation.Validation _validation) external payable returns (uint256)
```

Propose a new operation on an asset from a governor contract.

Name                Description

_Any current holder of the asset, with client-side support, can propose by submitting a full proper context to
the server-side and forwarding only its checksum to this contract as the UUID of the new proposal. Authorized
executives will later verify the feasibility of the proposal within a given expiration to either admit or
disqualify it accordingly. During this process, the full context is uploaded to a public database (e.g., IPFS),
and the link is submitted to be the URI of proposal context. This approach protects the database from external
attacks as well as ensures proposals remain validatable and user-oriented.
   Through the validation mechanism, the server-side determines `uuid`, `quorumRate`, `duration` and
`admissionExpiry` based on the specific supported type of proposal and its context. Operators are also required
to be pre-registered on the server-side to ensure proper assignments._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _governor | address | Governor contract address. |
| _tokenId | uint256 | Asset identifier from the governor contract. |
| _operator | address | Assigned operator address. |
| _uuid | bytes32 | Checksum of proposal context. |
| _rule | enum IProposal.ProposalRule | Rule to determine verdict. |
| _quorumRate | uint256 | Fraction of total weight for quorum. |
| _duration | uint40 | Voting duration. |
| _admissionExpiry | uint40 | Expiration for proposal admission. |
| _validation | struct IValidation.Validation | Validation package from the validator. |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint256 | New proposal identifier. |

### admit

```solidity
function admit(uint256 _proposalId, string _contextURI, string _reviewURI, address _currency, struct IValidation.Validation _validation) external
```

Admit an executable proposal after review practicability.
Admit only if the proposal is in `Pending` state and before admission time limit has expired.

Name                Description

_Permissions: Asset representative of the proposal.
   As the proposal has only set `uuid` before admission, `contextURI` must be provided when admitting._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _proposalId | uint256 | Proposal identifier. |
| _contextURI | string | URI of proposal context. |
| _reviewURI | string | URI of review detail. |
| _currency | address | Budget currency address. |
| _validation | struct IValidation.Validation | Validation package from the validator. |

### disqualify

```solidity
function disqualify(uint256 _proposalId, string _contextURI, string _reviewURI, struct IValidation.Validation _validation) external
```

Disqualify an inexecutable proposal after review practicability.
Disqualify only if the proposal is in `Pending` or `Voting` state and before the vote closes.

Name                Description

_Permission:
- Asset representative of the proposal: during `Pending` state.
- Managers: during `Pending` and `Voting` state.
   As the proposal has only set `uuid` before disqualification, `contextURI` must be provided when disqualifying._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _proposalId | uint256 | Proposal identifier. |
| _contextURI | string | URI of proposal context. |
| _reviewURI | string | URI of review detail. |
| _validation | struct IValidation.Validation | Validation package from the validator. |

### vote

```solidity
function vote(uint256 _proposalId, enum IProposal.ProposalVoteOption _voteOption) external returns (uint256)
```

Vote on a proposal.
Vote only if the proposal is in `Voting` state and before the vote closes.

Name                Description

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _proposalId | uint256 | Proposal identifier. |
| _voteOption | enum IProposal.ProposalVoteOption | Vote option. |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint256 | Vote power. |

### safeVote

```solidity
function safeVote(uint256 _proposalId, enum IProposal.ProposalVoteOption _voteOption, bytes32 _anchor) external returns (uint256)
```

Vote on a proposal.
Vote only if the proposal is in `Voting` state and before the vote closes.

Name                Description

_Anchor enforces consistency between this contract and the client-side._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _proposalId | uint256 | Proposal identifier. |
| _voteOption | enum IProposal.ProposalVoteOption | Vote option. |
| _anchor | bytes32 | `uuid` of the proposal. |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint256 | Vote power. |

### contributeBudget

```solidity
function contributeBudget(uint256 _proposalId, uint256 _value) external payable
```

Contribute to the budget of a proposal.
Contribute only before the proposal is confirmed or the confirmation time limit has expired.

Name                Description

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _proposalId | uint256 | Proposal identifier. |
| _value | uint256 | Contributed value. |

### safeContributeBudget

```solidity
function safeContributeBudget(uint256 _proposalId, uint256 _value, bytes32 _anchor) external payable
```

Contribute to the budget of a proposal.
Contribute only before the proposal is confirmed or the confirmation time limit has expired.

Name                Description

_Anchor enforces consistency between this contract and the client-side._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _proposalId | uint256 | Proposal identifier. |
| _value | uint256 | Contributed value. |
| _anchor | bytes32 | `uuid` of the proposal. |

### withdrawBudgetContribution

```solidity
function withdrawBudgetContribution(uint256 _proposalId) external returns (uint256)
```

Withdraw contribution from a proposal which can no longer be executed.
Withdraw only if the proposal is either disapproved, disqualified or rejected, or after confirmation time limit
has expired.

Name                Description

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _proposalId | uint256 | Proposal identifier. |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint256 | Withdrawn value. |

### confirm

```solidity
function confirm(uint256 _proposalId) external returns (uint256)
```

Confirm a proposal to be executed.
Confirm only if the proposal is approved and before the confirmation time limit has expired.
On proposal confirmation, the budget is transferred to the operator.

Name                Description

_Permission: Managers active in the zone of the asset._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _proposalId | uint256 | Proposal identifier. |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint256 | Contributed budget for execution. |

### rejectExecution

```solidity
function rejectExecution(uint256 _proposalId) external
```

Reject to execute a proposal.
Reject only if the proposal is in `Voting` state.

Name                Description

_Permission: Operator of the proposal._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _proposalId | uint256 | Proposal identifier. |

### logExecution

```solidity
function logExecution(uint256 _proposalId, string _logURI, struct IValidation.Validation _validation) external
```

Update a proposal about the progress of execution.
Update only if the proposal is in `Executing` state.

Name                Description

_Permission: Operator of the proposal._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _proposalId | uint256 | Proposal identifier. |
| _logURI | string | URI of execution progress log. |
| _validation | struct IValidation.Validation | Validation package from the validator. |

### concludeExecution

```solidity
function concludeExecution(uint256 _proposalId, string _resultURI, bool _isSuccessful, struct IValidation.Validation _validation) external
```

Conclude the execution of a proposal.
Conclude only if the proposal is in `Executing` state.

Name            Description

_Permission: Asset representative of the proposal._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _proposalId | uint256 | Proposal identifier. |
| _resultURI | string | URI of execution result. |
| _isSuccessful | bool | Whether the execution has succeeded. |
| _validation | struct IValidation.Validation | Validation package from the validator. |

### _votingVerdict

```solidity
function _votingVerdict(struct IProposal.Proposal _proposal) internal view returns (enum IProposal.ProposalVerdict)
```

Evaluate the verdict of the vote of a proposal

Name            Description

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _proposal | struct IProposal.Proposal | Proposal. |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | enum IProposal.ProposalVerdict | Verdict of the proposal. |

### _vote

```solidity
function _vote(uint256 _proposalId, enum IProposal.ProposalVoteOption _voteOption) internal returns (uint256)
```

Vote on a proposal.

Name                Description

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _proposalId | uint256 | Proposal identifier. |
| _voteOption | enum IProposal.ProposalVoteOption | Vote option. |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint256 | Vote power. |

### _contributeBudget

```solidity
function _contributeBudget(uint256 _proposalId, uint256 _value) internal
```

Contribute to the budget of a proposal.

Name                Description

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _proposalId | uint256 | Proposal identifier. |
| _value | uint256 | Contributed value. |

