# Solidity API

## GovernanceHubStorage

Storage contract for contract `GovernanceHub`.

### voteOptions

```solidity
mapping(uint256 => mapping(address => enum IProposal.ProposalVoteOption)) voteOptions
```

_voteOptions[proposalId][account]_

### contributions

```solidity
mapping(uint256 => mapping(address => uint256)) contributions
```

_contributions[proposalId][account]_

### proposals

```solidity
mapping(uint256 => struct IProposal.Proposal) proposals
```

_proposals[proposalId]_

### fee

```solidity
uint256 fee
```

Name            Description

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |

### proposalNumber

```solidity
uint256 proposalNumber
```

Name            Description

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |

### admin

```solidity
address admin
```

Name        Description

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |

