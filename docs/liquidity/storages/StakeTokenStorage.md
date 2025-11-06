# Solidity API

## StakeTokenStorage

@author Briky Team

 @notice Storage contract for contract `StakeToken`.

### weights

```solidity
mapping(address => uint256) weights
```

_weights[account]_

### lastRewardFetch

```solidity
uint256 lastRewardFetch
```

Name        Description
 @return timestamp   Last reward fetch timestamp.

### feeRate

```solidity
uint256 feeRate
```

### interestAccumulation

```solidity
uint256 interestAccumulation
```

### totalStake

```solidity
uint256 totalStake
```

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

### successor

```solidity
address successor
```

Name            Description
 @return successor       Successor `StakeToken` contract address.

