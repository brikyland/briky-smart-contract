# Solidity API

## Auction

The `Auction` contract facilitates public distribution of `PrimaryToken`. Accounts can deposit to acquire tokens,
which are distributed proportionally to their deposit and can be withdrawn with a continuous vesting mechanism. All
the deposit will be contributed to the liquidity of the `Treasury`.
Token allocations vest evenly on a per-second basis after the auction ends
When the staking pools are opened, accounts that have unwithdrawn allocation can stake all their remain tokens.
Auction currency is the stablecoin currency of the treasury.

### receive

```solidity
receive() external payable
```

Executed on a call to this contract with empty calldata.

### version

```solidity
function version() external pure returns (string)
```

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | string | Version of implementation. |

### initialize

```solidity
function initialize(address _admin, address _primaryToken) external
```

Initialize the contract after deployment, serving as the constructor.

Name            Description

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _admin | address | `Admin` contract address. |
| _primaryToken | address | `PrimaryToken` contract address. |

### updateStakeTokens

```solidity
function updateStakeTokens(address _stakeToken1, address _stakeToken2, address _stakeToken3, bytes[] _signatures) external
```

Update staking pools contract.

Name            Description

_Administrative operator._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _stakeToken1 | address | `StakeToken` contract address #1. |
| _stakeToken2 | address | `StakeToken` contract address #2. |
| _stakeToken3 | address | `StakeToken` contract address #3. |
| _signatures | bytes[] | Array of admin signatures. |

### startAuction

```solidity
function startAuction(uint256 _endAt, uint256 _vestingDuration, bytes[] _signatures) external
```

Start the auction with specific end timestamp and vesting duration.

Name                Description

_Administrative operator._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _endAt | uint256 | Auction end timestamp. |
| _vestingDuration | uint256 | Vesting duration. |
| _signatures | bytes[] | Array of admin signatures. |

### allocationOf

```solidity
function allocationOf(address _account) public view returns (uint256)
```

Name        Description

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _account | address | EVM address. |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint256 | Tokens allocated in proportion to deposit of the account relative to all others. |

### deposit

```solidity
function deposit(uint256 _value) external
```

Deposit value into the auction.
Deposit only before the auction ends.

Name        Description

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _value | uint256 | Deposited value. |

### withdraw

```solidity
function withdraw() external returns (uint256)
```

Withdraw vested tokens.
Withdraw only after auction ends.

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint256 | Withdrawn amount. |

### stake

```solidity
function stake(uint256 _stake1, uint256 _stake2) external returns (uint256)
```

Stake unwithdrawn tokens to staking pools.
Stake only when staking pools are opened and assigned.

Name        Description

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _stake1 | uint256 | Staked amount for staking pool #1. |
| _stake2 | uint256 | Staked amount for staking pool #2. |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint256 | Staked amount for staking pool #3, which also is the remain tokens. |

