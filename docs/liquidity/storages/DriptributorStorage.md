# Solidity API

## DriptributorStorage

@author Briky Team

 @notice Storage contract for contract `Driptributor`.

### distributions

```solidity
mapping(uint256 => struct IDistribution.Distribution) distributions
```

_distributions[distributionId]_

### distributionNumber

```solidity
uint256 distributionNumber
```

Name                Description
 @return distributionNumber  Number of distributions.

### totalAllocation

```solidity
uint256 totalAllocation
```

Name                Description
 @return totalAllocation     Total tokens to distribute.

### distributedAmount

```solidity
uint256 distributedAmount
```

Name                Description
 @return distributedAmount   Total distributed tokens.

### admin

```solidity
address admin
```

Name        Description
 @return admin       `Admin` contract address.

### primaryToken

```solidity
address primaryToken
```

Name            Description
 @return primaryToken    `PrimaryToken` contract address.

### stakeToken1

```solidity
address stakeToken1
```

Name            Description
 @return stakeToken1     `StakeToken` contract address #1.

### stakeToken2

```solidity
address stakeToken2
```

Name            Description
 @return stakeToken2     `StakeToken` contract address #2.

### stakeToken3

```solidity
address stakeToken3
```

Name            Description
 @return stakeToken3     `StakeToken` contract address #3.

