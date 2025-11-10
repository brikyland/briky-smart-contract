# GovernanceHubStorage

Storage contract for contract `GovernanceHub`.

## voteOptions

```solidity
mapping(uint256 => mapping(address => enum IProposal.ProposalVoteOption)) voteOptions
```

{% hint style="info" %}
voteOptions[proposalId][account]
{% endhint %}

## contributions

```solidity
mapping(uint256 => mapping(address => uint256)) contributions
```

{% hint style="info" %}
contributions[proposalId][account]
{% endhint %}

## proposals

```solidity
mapping(uint256 => struct IProposal.Proposal) proposals
```

{% hint style="info" %}
proposals[proposalId]
{% endhint %}

## fee

```solidity
uint256 fee
```

### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |

## proposalNumber

```solidity
uint256 proposalNumber
```

### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |

## admin

```solidity
address admin
```

### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |

