# IGovernanceHub

Interface for contract `GovernanceHub`.

The `GovernanceHub` contract facilitates voting among holders of an asset from governor contracts to decide on
proposals that affects the asset.

{% hint style="info" %}
With client-side support, accounts can propose by submitting a full proper context to the server-side and
forwarding only its checksum to the contract as the UUID of the new proposal. Authorized executives will later
verify the feasibility of the proposal within a given expiration to either admit or disqualify it accordingly.
During this process, the full context is uploaded to a public database (e.g., IPFS), and the link is submitted to
be the URI of proposal context. This approach protects the database from external attacks as well as ensures
proposals remain validatable and user-oriented.

{% endhint %}

{% hint style="info" %}
Implementation involves server-side support.

{% endhint %}

{% hint style="info" %}
ERC-20 tokens are identified by their contract addresses.
Native coin is represented by the zero address (0x0000000000000000000000000000000000000000).
{% endhint %}

## FeeUpdate

```solidity
event FeeUpdate(uint256 newValue)
```

Emitted when the proposing fee is updated.

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| newValue | uint256 | New proposing fee charged in native coin. |

## NewProposal

```solidity
event NewProposal(address governor, uint256 proposalId, address proposer, uint256 tokenId, address operator, bytes32 uuid, enum IProposal.ProposalRule rule, uint256 quorumRate, uint40 duration, uint40 admissionExpiry)
```

Emitted when a new proposal is submitted.

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| governor | address | Governor contract address. |
| proposalId | uint256 | Proposal identifier. |
| proposer | address | Proposer address. |
| tokenId | uint256 | Asset identifier from the governor contract. |
| operator | address | Operator address. |
| uuid | bytes32 | Checksum of proposal context. |
| rule | enum IProposal.ProposalRule | Rule to determine verdict. |
| quorumRate | uint256 | Fraction of total weight for quorum. |
| duration | uint40 | Voting duration. |
| admissionExpiry | uint40 | Expiration for proposal admission. |

## ProposalAdmission

```solidity
event ProposalAdmission(uint256 proposalId, string contextURI, string reviewURI, address currency, uint256 totalWeight, uint256 quorum)
```

Emitted when a proposal is admitted.

{% hint style="info" %}
The checksum of data from the `contextURI` should match `uuid`. Contract cannot validate this but defects are
detectable. Checksum algorithm must be declared in the context.
{% endhint %}

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| proposalId | uint256 | Proposal identifier. |
| contextURI | string | URI of proposal context. |
| reviewURI | string | URI of review detail. |
| currency | address | Budget currency address. |
| totalWeight | uint256 | Total weight of the asset at the admission timestamp. |
| quorum | uint256 | Quorum to determine verdict calculated from the initiated quorum rate and the total weight. |

## ProposalBudgetContribution

```solidity
event ProposalBudgetContribution(uint256 proposalId, address contributor, uint256 value)
```

Emitted when the budget of a proposal is contributed.

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| proposalId | uint256 | Proposal identifier. |
| contributor | address | Contributor address. |
| value | uint256 | Contributed value. |

## ProposalBudgetContributionWithdrawal

```solidity
event ProposalBudgetContributionWithdrawal(uint256 proposalId, address contributor, uint256 value)
```

Emitted when the contribution of a contributor is withdrawn from the budget of a proposal.

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| proposalId | uint256 | Proposal identifier. |
| contributor | address | Contributor address. |
| value | uint256 | Withdrawn value. |

## ProposalConfirmation

```solidity
event ProposalConfirmation(uint256 proposalId, uint256 budget)
```

Emitted when a proposal is confirmed to be executed.

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| proposalId | uint256 | Proposal identifier. |
| budget | uint256 | Contributed budget for execution. |

## ProposalDisqualification

```solidity
event ProposalDisqualification(uint256 proposalId, string contextURI, string reviewURI)
```

Emitted when a proposal is disqualified.

{% hint style="info" %}
The checksum of data from the `contextURI` should match `uuid`. Contract cannot validate this but defects are
detectable. Checksum algorithm must be declared in the context.
{% endhint %}

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| proposalId | uint256 | Proposal identifier. |
| contextURI | string | URI of proposal context. |
| reviewURI | string | URI of review detail. |

## ProposalVote

```solidity
event ProposalVote(uint256 proposalId, address voter, enum IProposal.ProposalVoteOption voteOption, uint256 weight)
```

Emitted when a proposal receives a vote.

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| proposalId | uint256 | Proposal identifier. |
| voter | address | Voter address. |
| voteOption | enum IProposal.ProposalVoteOption | Vote option. |
| weight | uint256 | Vote power at the admission timestamp. |

## ProposalExecutionConclusion

```solidity
event ProposalExecutionConclusion(uint256 proposalId, string resultURI, bool isSuccessful)
```

Emitted when the execution of a proposal is concluded.

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| proposalId | uint256 | Proposal identifier. |
| resultURI | string | URI of execution result. |
| isSuccessful | bool | Whether the execution has succeeded. |

## ProposalExecutionRejection

```solidity
event ProposalExecutionRejection(uint256 proposalId)
```

Emitted when the execution of a proposal is rejected.

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| proposalId | uint256 | Proposal identifier. |

## ProposalExecutionLog

```solidity
event ProposalExecutionLog(uint256 proposalId, string logURI)
```

Emitted when execution progress of a proposal is updated.

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| proposalId | uint256 | Proposal identifier. |
| logURI | string | URI of execution progress log. |

## AlreadyVoted

```solidity
error AlreadyVoted()
```

===== ERROR ===== *

## ConflictedQuorum

```solidity
error ConflictedQuorum()
```

## ConflictedWeight

```solidity
error ConflictedWeight()
```

## InvalidAdmitting

```solidity
error InvalidAdmitting()
```

## InvalidConcluding

```solidity
error InvalidConcluding()
```

## InvalidConfirming

```solidity
error InvalidConfirming()
```

## InvalidContributing

```solidity
error InvalidContributing()
```

## InvalidDisqualifying

```solidity
error InvalidDisqualifying()
```

## InvalidProposalId

```solidity
error InvalidProposalId()
```

## InvalidRejecting

```solidity
error InvalidRejecting()
```

## InvalidTokenId

```solidity
error InvalidTokenId()
```

## InvalidVoting

```solidity
error InvalidVoting()
```

## InvalidWithdrawing

```solidity
error InvalidWithdrawing()
```

## NothingToWithdraw

```solidity
error NothingToWithdraw()
```

## NoVotingPower

```solidity
error NoVotingPower()
```

## Overdue

```solidity
error Overdue()
```

## Timeout

```solidity
error Timeout()
```

## UnavailableToken

```solidity
error UnavailableToken()
```

## fee

```solidity
function fee() external view returns (uint256 fee)
```

### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| fee | uint256 | Proposing fee charged in native coin. |

## proposalNumber

```solidity
function proposalNumber() external view returns (uint256 proposalNumber)
```

### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| proposalNumber | uint256 | Number of proposals. |

## getProposal

```solidity
function getProposal(uint256 proposalId) external view returns (struct IProposal.Proposal proposal)
```

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| proposalId | uint256 | Proposal identifier. |

### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| proposal | struct IProposal.Proposal | Configuration and progress of the proposal. |

## getProposalState

```solidity
function getProposalState(uint256 proposalId) external view returns (enum IProposal.ProposalState state)
```

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| proposalId | uint256 | Proposal identifier. |

### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| state | enum IProposal.ProposalState | State of the proposal. |

## getProposalVerdict

```solidity
function getProposalVerdict(uint256 proposalId) external view returns (enum IProposal.ProposalVerdict verdict)
```

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| proposalId | uint256 | Proposal identifier. |

### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| verdict | enum IProposal.ProposalVerdict | Verdict of the proposal. |

## contributions

```solidity
function contributions(uint256 proposalId, address account) external view returns (uint256 contribution)
```

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| proposalId | uint256 | Proposal identifier. |
| account | address | EVM address. |

### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| contribution | uint256 | Budget contribution of the account. |

## voteOptions

```solidity
function voteOptions(uint256 proposalId, address account) external view returns (enum IProposal.ProposalVoteOption voteOption)
```

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| proposalId | uint256 | Proposal identifier. |
| account | address | EVM address. |

### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| voteOption | enum IProposal.ProposalVoteOption | Vote option of the account. |

## propose

```solidity
function propose(address governor, uint256 tokenId, address operator, bytes32 uuid, enum IProposal.ProposalRule rule, uint256 quorumRate, uint40 duration, uint40 admissionExpiry, struct IValidation.Validation validation) external payable returns (uint256 proposalId)
```

Propose a new operation on an asset from a governor contract.

{% hint style="info" %}
Any current holder of the asset, with client-side support, can propose by submitting a full proper context to
the server-side and forwarding only its checksum to this contract as the UUID of the new proposal. Authorized
executives will later verify the feasibility of the proposal within a given expiration to either admit or
disqualify it accordingly. During this process, the full context is uploaded to a public database (e.g., IPFS),
and the link is submitted to be the URI of proposal context. This approach protects the database from external
attacks as well as ensures proposals remain validatable and user-oriented.

{% endhint %}

{% hint style="info" %}
Through the validation mechanism, the server-side determines `uuid`, `quorumRate`, `duration` and
`admissionExpiry` based on the specific supported type of proposal and its context. Operators are also required
to be pre-registered on the server-side to ensure proper assignments.

{% endhint %}

{% hint style="info" %}
Validation data:
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
{% endhint %}

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| governor | address | Governor contract address. |
| tokenId | uint256 | Asset identifier from the governor contract. |
| operator | address | Assigned operator address. |
| uuid | bytes32 | Checksum of proposal context. |
| rule | enum IProposal.ProposalRule | Rule to determine verdict. |
| quorumRate | uint256 | Fraction of total weight for quorum. |
| duration | uint40 | Voting duration. |
| admissionExpiry | uint40 | Expiration for proposal admission. |
| validation | struct IValidation.Validation | Validation package from the validator. |

### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| proposalId | uint256 | New proposal identifier. |

## admit

```solidity
function admit(uint256 proposalId, string contextURI, string reviewURI, address currency, struct IValidation.Validation validation) external
```

Admit an executable proposal after review practicability.

Admit only if the proposal is in `Pending` state and before admission time limit has expired.

{% hint style="info" %}
Permissions: Asset representative of the proposal.

{% endhint %}

{% hint style="info" %}
As the proposal has only set `uuid` before admission, `contextURI` must be provided when admitting.

{% endhint %}

{% hint style="info" %}
Validation data:
```
data = abi.encode(
    proposalId,
    contextURI,
    reviewURI,
    currency
);
```
{% endhint %}

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| proposalId | uint256 | Proposal identifier. |
| contextURI | string | URI of proposal context. |
| reviewURI | string | URI of review detail. |
| currency | address | Budget currency address. |
| validation | struct IValidation.Validation | Validation package from the validator. |

## confirm

```solidity
function confirm(uint256 proposalId) external returns (uint256 budget)
```

Confirm a proposal to be executed.

Confirm only if the proposal is approved and before the confirmation time limit has expired.

On proposal confirmation, the budget is transferred to the operator.

{% hint style="info" %}
Permission: Managers active in the zone of the asset.
{% endhint %}

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| proposalId | uint256 | Proposal identifier. |

### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| budget | uint256 | Contributed budget for execution. |

## contributeBudget

```solidity
function contributeBudget(uint256 proposalId, uint256 value) external payable
```

Contribute to the budget of a proposal.

Contribute only before the proposal is confirmed or the confirmation time limit has expired.

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| proposalId | uint256 | Proposal identifier. |
| value | uint256 | Contributed value. |

## disqualify

```solidity
function disqualify(uint256 proposalId, string contextURI, string reviewURI, struct IValidation.Validation validation) external
```

Disqualify an inexecutable proposal after review practicability.

Disqualify only if the proposal is in `Pending` or `Voting` state and before the vote closes.

{% hint style="info" %}
Permission:
- Asset representative of the proposal: during `Pending` state.
- Managers: during `Pending` and `Voting` state.

{% endhint %}

{% hint style="info" %}
As the proposal has only set `uuid` before disqualification, `contextURI` must be provided when disqualifying.
{% endhint %}

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| proposalId | uint256 | Proposal identifier. |
| contextURI | string | URI of proposal context. |
| reviewURI | string | URI of review detail. |
| validation | struct IValidation.Validation | Validation package from the validator. |

## vote

```solidity
function vote(uint256 proposalId, enum IProposal.ProposalVoteOption voteOption) external returns (uint256 weight)
```

Vote on a proposal.

Vote only if the proposal is in `Voting` state and before the vote closes.

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| proposalId | uint256 | Proposal identifier. |
| voteOption | enum IProposal.ProposalVoteOption | Vote option. |

### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| weight | uint256 | Vote power. |

## withdrawBudgetContribution

```solidity
function withdrawBudgetContribution(uint256 proposalId) external returns (uint256 contribution)
```

Withdraw contribution from a proposal which can no longer be executed.

Withdraw only if the proposal is either disapproved, disqualified or rejected, or after confirmation time limit
has expired.

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| proposalId | uint256 | Proposal identifier. |

### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| contribution | uint256 | Withdrawn value. |

## concludeExecution

```solidity
function concludeExecution(uint256 proposalId, string resultURI, bool isSuccessful, struct IValidation.Validation validation) external
```

Conclude the execution of a proposal.

Conclude only if the proposal is in `Executing` state.

{% hint style="info" %}
Permission: Asset representative of the proposal.

{% endhint %}

{% hint style="info" %}
Validation data:
```
data = abi.encode(
    proposalId,
    resultURI,
    isSuccessful
);
```
{% endhint %}

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| proposalId | uint256 | Proposal identifier. |
| resultURI | string | URI of execution result. |
| isSuccessful | bool | Whether the execution has succeeded. |
| validation | struct IValidation.Validation | Validation package from the validator. |

## logExecution

```solidity
function logExecution(uint256 proposalId, string logURI, struct IValidation.Validation validation) external
```

Update a proposal about the progress of execution.

Update only if the proposal is in `Executing` state.

{% hint style="info" %}
Permission: Operator of the proposal.

{% endhint %}

{% hint style="info" %}
Validation data:
```
data = abi.encode(
    proposalId,
    logURI
);
```
{% endhint %}

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| proposalId | uint256 | Proposal identifier. |
| logURI | string | URI of execution progress log. |
| validation | struct IValidation.Validation | Validation package from the validator. |

## rejectExecution

```solidity
function rejectExecution(uint256 proposalId) external
```

Reject to execute a proposal.

Reject only if the proposal is in `Voting` state.

{% hint style="info" %}
Permission: Operator of the proposal.
{% endhint %}

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| proposalId | uint256 | Proposal identifier. |

## safeVote

```solidity
function safeVote(uint256 proposalId, enum IProposal.ProposalVoteOption voteOption, bytes32 anchor) external returns (uint256 weight)
```

Vote on a proposal.

Vote only if the proposal is in `Voting` state and before the vote closes.

{% hint style="info" %}
Anchor enforces consistency between this contract and the client-side.
{% endhint %}

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| proposalId | uint256 | Proposal identifier. |
| voteOption | enum IProposal.ProposalVoteOption | Vote option. |
| anchor | bytes32 | `uuid` of the proposal. |

### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| weight | uint256 | Vote power. |

## safeContributeBudget

```solidity
function safeContributeBudget(uint256 proposalId, uint256 value, bytes32 anchor) external payable
```

Contribute to the budget of a proposal.

Contribute only before the proposal is confirmed or the confirmation time limit has expired.

{% hint style="info" %}
Anchor enforces consistency between this contract and the client-side.
{% endhint %}

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| proposalId | uint256 | Proposal identifier. |
| value | uint256 | Contributed value. |
| anchor | bytes32 | `uuid` of the proposal. |

