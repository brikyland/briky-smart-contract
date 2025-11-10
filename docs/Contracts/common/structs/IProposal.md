# IProposal

Interface for struct `Proposal`.

{% hint style="info" %}
Implementation involves server-side support.

{% endhint %}

{% hint style="info" %}
ERC-20 tokens are identified by their contract addresses.
Native coin is represented by the zero address (0x0000000000000000000000000000000000000000).
{% endhint %}

## ProposalVoteOption

Variants of vote option of an account for a proposal.

```solidity
enum ProposalVoteOption {
  Nil,
  Approval,
  Disapproval
}
```

## ProposalRule

Variants of rule to determine the verdict of a proposal.

```solidity
enum ProposalRule {
  ApprovalBeyondQuorum,
  DisapprovalBeyondQuorum
}
```

## ProposalState

Variants of state of a proposal.

```solidity
enum ProposalState {
  Nil,
  Pending,
  Voting,
  Executing,
  SuccessfulExecuted,
  UnsuccessfulExecuted,
  Disqualified,
  Rejected
}
```

## ProposalVerdict

Variants of verdict of a proposal.

```solidity
enum ProposalVerdict {
  Unsettled,
  Passed,
  Failed
}
```

## Proposal

A proposal will be executed on an asset by an assigned operator if approved through votes by its holders.

The proposal might require a budget to execute, which should be suggested in the context and contributed by
holders under their own arrangements.

{% hint style="info" %}
Any current holder of the asset, with client-side support, can propose by submitting a full proper context to
the server-side and forwarding only its checksum to this contract as the UUID of the new proposal. Authorized
executives will later verify the feasibility of the proposal within a given expiration to either admit or
disqualify it accordingly. During this process, the full context is uploaded to a public database (e.g., IPFS),
and the link is submitted to be the URI of proposal context. This approach protects the database from external
attacks as well as ensures proposals remain validatable and user-oriented.
{% endhint %}

```solidity
struct Proposal {
  bytes32 uuid;
  string contextURI;
  string logURI;
  address governor;
  uint256 tokenId;
  uint256 totalWeight;
  uint256 approvalWeight;
  uint256 disapprovalWeight;
  uint256 quorum;
  address proposer;
  address operator;
  uint40 due;
  uint40 timePivot;
  enum IProposal.ProposalRule rule;
  enum IProposal.ProposalState state;
  uint256 budget;
  address currency;
}
```

