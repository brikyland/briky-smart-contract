# IDriptributor

Interface for contract `Driptributor`.

The `Driptributor` contract facilitates distribution of `PrimaryToken` through a continuous vesting mechanism.

Token allocations vest evenly on a per-second basis after distribution.

When the staking pools are opened, accounts that have unwithdrawn allocation can stake all their remain tokens.

## NewDistribution

```solidity
event NewDistribution(uint256 distributionId, address receiver, uint40 distributeAt, uint40 vestingDuration, uint256 amount, string data)
```

Emitted when a new token distribution is created.

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| distributionId | uint256 | Distribution identifier. |
| receiver | address | Receiver address. |
| distributeAt | uint40 | Distribution timestamp. |
| vestingDuration | uint40 | Vesting duration. |
| amount | uint256 | Distributed amount. |
| data | string | Distribution note. |

## Stake

```solidity
event Stake(uint256[] distributionIds, uint256 stake1, uint256 stake2, uint256 stake3)
```

Emitted when the same receiver of multiple distributions stakes unwithdrawn allocations.

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| distributionIds | uint256[] | Array of distribution identifiers. |
| stake1 | uint256 | Staked amount for staking pool #1. |
| stake2 | uint256 | Staked amount for staking pool #2. |
| stake3 | uint256 | Staked amount for staking pool #3. |

## Withdrawal

```solidity
event Withdrawal(uint256 distributionId, uint256 amount)
```

Emitted when the receiver of a distribution withdraws vested allocation.

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| distributionId | uint256 | Distribution identifier. |
| amount | uint256 | Withdrawn amount. |

## AlreadyStaked

```solidity
error AlreadyStaked()
```

===== ERROR ===== *

## NotAssignedStakeTokens

```solidity
error NotAssignedStakeTokens()
```

## InvalidDistributionId

```solidity
error InvalidDistributionId()
```

## primaryToken

```solidity
function primaryToken() external view returns (address primaryToken)
```

### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| primaryToken | address | `PrimaryToken` contract address. |

## stakeToken1

```solidity
function stakeToken1() external view returns (address stakeToken1)
```

### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| stakeToken1 | address | `StakeToken` contract address #1. |

## stakeToken2

```solidity
function stakeToken2() external view returns (address stakeToken2)
```

### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| stakeToken2 | address | `StakeToken` contract address #2. |

## stakeToken3

```solidity
function stakeToken3() external view returns (address stakeToken3)
```

### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| stakeToken3 | address | `StakeToken` contract address #3. |

## totalAllocation

```solidity
function totalAllocation() external view returns (uint256 totalAllocation)
```

### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| totalAllocation | uint256 | Total tokens to distribute. |

## distributedAmount

```solidity
function distributedAmount() external view returns (uint256 distributedAmount)
```

### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| distributedAmount | uint256 | Total distributed tokens. |

## distributionNumber

```solidity
function distributionNumber() external view returns (uint256 distributionNumber)
```

### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| distributionNumber | uint256 | Number of distributions. |

## getDistribution

```solidity
function getDistribution(uint256 distributionId) external view returns (struct IDistribution.Distribution distribution)
```

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| distributionId | uint256 | Distribution identifier. |

### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| distribution | struct IDistribution.Distribution | Distribution information. |

## stake

```solidity
function stake(uint256[] distributionIds, uint256 stake1, uint256 stake2) external returns (uint256 stake3)
```

Stake unwithdrawn tokens from multiple distributions to staking pools.

Stake only when staking pools are opened and assigned.

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| distributionIds | uint256[] | Array of distribution identifiers. |
| stake1 | uint256 | Staked amount for staking pool #1. |
| stake2 | uint256 | Staked amount for staking pool #2. |

### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| stake3 | uint256 | Staked amount for staking pool #3, which also is the remain tokens. |

## withdraw

```solidity
function withdraw(uint256[] distributionIds) external returns (uint256 totalAmount)
```

Withdraw vested tokens from multiple distributions.

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| distributionIds | uint256[] | Array of distribution identifiers. |

### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| totalAmount | uint256 | Total withdrawn amounts. |

