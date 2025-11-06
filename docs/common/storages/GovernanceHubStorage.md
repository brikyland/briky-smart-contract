# Solidity API

## GovernanceHubStorage

@author Briky Team

 @notice Storage contract for contract `GovernanceHub`.

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
 @return fee             Proposing fee charged in native coin.

### proposalNumber

```solidity
uint256 proposalNumber
```

Name            Description
 @return proposalNumber  Number of proposals.

### admin

```solidity
address admin
```

Name        Description
 @return admin       `Admin` contract address.

