# IAuction

Interface for contract `Auction`.

The `Auction` contract facilitates public distribution of `PrimaryToken`. Accounts can deposit to acquire tokens,
which are distributed proportionally to their deposit and can be withdrawn with a continuous vesting mechanism. All
the deposit will be contributed to the liquidity of the `Treasury`.

Token allocations vest evenly on a per-second basis after the auction ends.

When the staking pools are opened, accounts that have unwithdrawn allocation can stake all their remain tokens.

Auction currency is the stablecoin currency of the treasury.

## Deposit

```solidity
event Deposit(address depositor, uint256 value)
```

Emitted when an account deposits.

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| depositor | address | EVM address. |
| value | uint256 | Deposited value. |

## Stake

```solidity
event Stake(address staker, uint256 stake1, uint256 stake2, uint256 stake3)
```

Emitted when an account stakes unwithdrawn allocation.

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| staker | address | Staker address. |
| stake1 | uint256 | Staked amount for staking pool #1. |
| stake2 | uint256 | Staked amount for staking pool #2. |
| stake3 | uint256 | Staked amount for staking pool #3. |

## Withdrawal

```solidity
event Withdrawal(address withdrawer, uint256 amount)
```

Emitted when an account withdraws vested allocation.

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| withdrawer | address | Withdrawer address. |
| amount | uint256 | Withdrawn amount. |

## AlreadyEnded

```solidity
error AlreadyEnded()
```

===== ERROR ===== *

## AlreadyStarted

```solidity
error AlreadyStarted()
```

## NotAssignedStakeTokens

```solidity
error NotAssignedStakeTokens()
```

## NotEnded

```solidity
error NotEnded()
```

## NotStarted

```solidity
error NotStarted()
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

## endAt

```solidity
function endAt() external view returns (uint256 endAt)
```

### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| endAt | uint256 | Auction end timestamp. |

## totalDeposit

```solidity
function totalDeposit() external view returns (uint256 totalDeposit)
```

### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| totalDeposit | uint256 | Total deposited value. |

## totalToken

```solidity
function totalToken() external view returns (uint256 totalToken)
```

### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| totalToken | uint256 | Total tokens to auction. |

## vestingDuration

```solidity
function vestingDuration() external view returns (uint256 vestingDuration)
```

### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| vestingDuration | uint256 | Vesting duration after the auction ends. |

## deposits

```solidity
function deposits(address account) external view returns (uint256 deposit)
```

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| account | address | EVM address. |

### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| deposit | uint256 | Deposited value of the account. |

## withdrawnAmount

```solidity
function withdrawnAmount(address account) external view returns (uint256 amount)
```

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| account | address | EVM address. |

### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| amount | uint256 | Withdrawn tokens of the account. |

## allocationOf

```solidity
function allocationOf(address account) external view returns (uint256 amount)
```

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| account | address | EVM address. |

### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| amount | uint256 | Tokens allocated in proportion to deposit of the account relative to all others. |

## deposit

```solidity
function deposit(uint256 value) external
```

Deposit value into the auction.

Deposit only before the auction ends.

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| value | uint256 | Deposited value. |

## stake

```solidity
function stake(uint256 stake1, uint256 stake2) external returns (uint256 stake3)
```

Stake unwithdrawn tokens to staking pools.

Stake only when staking pools are opened and assigned.

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| stake1 | uint256 | Staked amount for staking pool #1. |
| stake2 | uint256 | Staked amount for staking pool #2. |

### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| stake3 | uint256 | Staked amount for staking pool #3, which also is the remain tokens. |

## withdraw

```solidity
function withdraw() external returns (uint256 amount)
```

Withdraw vested tokens.

Withdraw only after auction ends.

### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| amount | uint256 | Withdrawn amount. |

