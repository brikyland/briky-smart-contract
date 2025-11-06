# Solidity API

## IAuction

@author Briky Team

 @notice Interface for contract `Auction`.
 @notice The `Auction` contract facilitates public distribution of `PrimaryToken`. Accounts can deposit to acquire tokens,
         which are distributed proportionally to their deposit and can be withdrawn with a continuous vesting mechanism. All
         the deposit will be contributed to the liquidity of the `Treasury`.
 @notice Token allocations vest evenly on a per-second basis after the auction ends.
 @notice When the staking pools are opened, accounts that have unwithdrawn allocation can stake all their remain tokens.
 @notice Auction currency is the stablecoin currency of the treasury.

### Deposit

```solidity
event Deposit(address depositor, uint256 value)
```

@notice Emitted when an account deposits.

         Name        Description
 @param  depositor   EVM address.
 @param  value       Deposited value.

### Stake

```solidity
event Stake(address staker, uint256 stake1, uint256 stake2, uint256 stake3)
```

@notice Emitted when an account stakes unwithdrawn allocation.

         Name        Description
 @param  staker      Staker address.
 @param  stake1      Staked amount for staking pool #1.
 @param  stake2      Staked amount for staking pool #2.
 @param  stake3      Staked amount for staking pool #3.

### Withdrawal

```solidity
event Withdrawal(address withdrawer, uint256 amount)
```

@notice Emitted when an account withdraws vested allocation.

         Name        Description
 @param  withdrawer  Withdrawer address.
 @param  amount      Withdrawn amount.

### AlreadyEnded

```solidity
error AlreadyEnded()
```

===== ERROR ===== *

### AlreadyStarted

```solidity
error AlreadyStarted()
```

### NotAssignedStakeTokens

```solidity
error NotAssignedStakeTokens()
```

### NotEnded

```solidity
error NotEnded()
```

### NotStarted

```solidity
error NotStarted()
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

### endAt

```solidity
function endAt() external view returns (uint256 endAt)
```

Name    Description
 @return endAt   Auction end timestamp.

### totalDeposit

```solidity
function totalDeposit() external view returns (uint256 totalDeposit)
```

Name            Description
 @return totalDeposit    Total deposited value.

### totalToken

```solidity
function totalToken() external view returns (uint256 totalToken)
```

Name            Description
 @return totalToken      Total tokens to auction.

### vestingDuration

```solidity
function vestingDuration() external view returns (uint256 vestingDuration)
```

Name                Description
 @return vestingDuration     Vesting duration after the auction ends.

### deposits

```solidity
function deposits(address account) external view returns (uint256 deposit)
```

Name        Description
 @param  account     EVM address.
 @return deposit     Deposited value of the account.

### withdrawnAmount

```solidity
function withdrawnAmount(address account) external view returns (uint256 amount)
```

Name        Description
 @param  account     EVM address.
 @return amount      Withdrawn tokens of the account.

### allocationOf

```solidity
function allocationOf(address account) external view returns (uint256 amount)
```

Name        Description
 @param  account     EVM address.
 @return amount      Tokens allocated in proportion to deposit of the account relative to all others.

### deposit

```solidity
function deposit(uint256 value) external
```

@notice Deposit value into the auction.
 @notice Deposit only before the auction ends.

         Name        Description
 @param  value       Deposited value.

### stake

```solidity
function stake(uint256 stake1, uint256 stake2) external returns (uint256 stake3)
```

@notice Stake unwithdrawn tokens to staking pools.
 @notice Stake only when staking pools are opened and assigned.

         Name        Description
 @param  stake1      Staked amount for staking pool #1.
 @param  stake2      Staked amount for staking pool #2.
 @return stake3      Staked amount for staking pool #3, which also is the remain tokens.

### withdraw

```solidity
function withdraw() external returns (uint256 amount)
```

@notice Withdraw vested tokens.
 @notice Withdraw only after auction ends.

         Name        Description
 @return amount      Withdrawn amount.

