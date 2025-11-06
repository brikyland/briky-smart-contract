# Solidity API

## IDriptributor

@author Briky Team

 @notice Interface for contract `Driptributor`.
 @notice The `Driptributor` contract facilitates distribution of `PrimaryToken` through a continuous vesting mechanism.
 @notice Token allocations vest evenly on a per-second basis after distribution.
 @notice When the staking pools are opened, accounts that have unwithdrawn allocation can stake all their remain tokens.

### NewDistribution

```solidity
event NewDistribution(uint256 distributionId, address receiver, uint40 distributeAt, uint40 vestingDuration, uint256 amount, string data)
```

@notice Emitted when a new token distribution is created.

         Name                Description
 @param  distributionId      Distribution identifier.
 @param  receiver            Receiver address.
 @param  distributeAt        Distribution timestamp.
 @param  vestingDuration     Vesting duration.
 @param  amount              Distributed amount.
 @param  data                Distribution note.

### Stake

```solidity
event Stake(uint256[] distributionIds, uint256 stake1, uint256 stake2, uint256 stake3)
```

@notice Emitted when the same receiver of multiple distributions stakes unwithdrawn allocations.

         Name                Description
 @param  distributionIds     Array of distribution identifiers.
 @param  stake1              Staked amount for staking pool #1.
 @param  stake2              Staked amount for staking pool #2.
 @param  stake3              Staked amount for staking pool #3.

### Withdrawal

```solidity
event Withdrawal(uint256 distributionId, uint256 amount)
```

@notice Emitted when the receiver of a distribution withdraws vested allocation.

         Name                Description
 @param  distributionId      Distribution identifier.
 @param  amount              Withdrawn amount.

### AlreadyStaked

```solidity
error AlreadyStaked()
```

===== ERROR ===== *

### NotAssignedStakeTokens

```solidity
error NotAssignedStakeTokens()
```

### InvalidDistributionId

```solidity
error InvalidDistributionId()
```

### primaryToken

```solidity
function primaryToken() external view returns (address primaryToken)
```

Name            Description
 @return primaryToken    `PrimaryToken` contract address.

### stakeToken1

```solidity
function stakeToken1() external view returns (address stakeToken1)
```

Name            Description
 @return stakeToken1     `StakeToken` contract address #1.

### stakeToken2

```solidity
function stakeToken2() external view returns (address stakeToken2)
```

Name            Description
 @return stakeToken2     `StakeToken` contract address #2.

### stakeToken3

```solidity
function stakeToken3() external view returns (address stakeToken3)
```

Name            Description
 @return stakeToken3     `StakeToken` contract address #3.

### totalAllocation

```solidity
function totalAllocation() external view returns (uint256 totalAllocation)
```

Name                Description
 @return totalAllocation     Total tokens to distribute.

### distributedAmount

```solidity
function distributedAmount() external view returns (uint256 distributedAmount)
```

Name                Description
 @return distributedAmount   Total distributed tokens.

### distributionNumber

```solidity
function distributionNumber() external view returns (uint256 distributionNumber)
```

Name                Description
 @return distributionNumber  Number of distributions.

### getDistribution

```solidity
function getDistribution(uint256 distributionId) external view returns (struct IDistribution.Distribution distribution)
```

Name            Description
 @param  distributionId  Distribution identifier.
 @return distribution    Distribution information.

### stake

```solidity
function stake(uint256[] distributionIds, uint256 stake1, uint256 stake2) external returns (uint256 stake3)
```

@notice Stake unwithdrawn tokens from multiple distributions to staking pools.
 @notice Stake only when staking pools are opened and assigned.

         Name                Description
 @param  distributionIds     Array of distribution identifiers.
 @param  stake1              Staked amount for staking pool #1.
 @param  stake2              Staked amount for staking pool #2.
 @return stake3              Staked amount for staking pool #3, which also is the remain tokens.

### withdraw

```solidity
function withdraw(uint256[] distributionIds) external returns (uint256 totalAmount)
```

@notice Withdraw vested tokens from multiple distributions.

         Name                Description
 @param  distributionIds     Array of distribution identifiers.
 @return totalAmount         Total withdrawn amounts.

