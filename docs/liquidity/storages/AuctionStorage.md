# Solidity API

## AuctionStorage

@author Briky Team

 @notice Storage contract for contract `Auction`.

### deposits

```solidity
mapping(address => uint256) deposits
```

_deposits[account]_

### withdrawnAmount

```solidity
mapping(address => uint256) withdrawnAmount
```

_withdrawnAmount[account]_

### totalToken

```solidity
uint256 totalToken
```

Name            Description
 @return totalToken      Total tokens to auction.

### totalDeposit

```solidity
uint256 totalDeposit
```

Name            Description
 @return totalDeposit    Total deposited value.

### endAt

```solidity
uint256 endAt
```

Name    Description
 @return endAt   Auction end timestamp.

### vestingDuration

```solidity
uint256 vestingDuration
```

Name                Description
 @return vestingDuration     Vesting duration after the auction ends.

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

