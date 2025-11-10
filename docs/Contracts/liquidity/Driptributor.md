# Solidity API

## Driptributor

Interface for contract `Driptributor`.
The `Driptributor` contract facilitates distribution of `PrimaryToken` through a continuous vesting mechanism.
Token allocations vest evenly on a per-second basis after distribution.
When the staking pools are opened, accounts that have unwithdrawn allocation can stake all their remain tokens.

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
function initialize(address _admin, address _primaryToken, uint256 _totalAllocation) external
```

Initialize the contract after deployment, serving as the constructor.

Name                Description

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _admin | address | `Admin` contract address. |
| _primaryToken | address | `PrimaryToken` contract address. |
| _totalAllocation | uint256 | Total tokens to distribute. |

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

### distributeTokensWithDuration

```solidity
function distributeTokensWithDuration(address[] _receivers, uint256[] _amounts, uint40[] _durations, string[] _notes, bytes[] _signatures) external
```

Distribute tokens to multiple receivers with vesting duration.

Name                Description

_Administrative operator._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _receivers | address[] | Array of receiver addresses, respective to each distribution. |
| _amounts | uint256[] | Array of distributed amounts, respective to each distribution. |
| _durations | uint40[] | Array of vesting durations, respective to each distribution. |
| _notes | string[] | Array of distribution notes, respective to each distribution. |
| _signatures | bytes[] | Array of admin signatures. |

### distributeTokensWithTimestamp

```solidity
function distributeTokensWithTimestamp(address[] _receivers, uint256[] _amounts, uint40[] _endAts, string[] _notes, bytes[] _signatures) external
```

Distribute tokens to multiple receivers with vesting end timestamp.

Name            Description

_Administrative operator._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _receivers | address[] | Array of receiver addresses, respective to each distribution. |
| _amounts | uint256[] | Array of distributed amounts, respective to each distribution. |
| _endAts | uint40[] | Array of vesting end timestamps, respective to each distribution. |
| _notes | string[] | Array of distribution notes, respective to each distribution. |
| _signatures | bytes[] | Array of admin signatures. |

### getDistribution

```solidity
function getDistribution(uint256 _distributionId) public view returns (struct IDistribution.Distribution)
```

Name                Description

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _distributionId | uint256 | Distribution identifier. |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | struct IDistribution.Distribution | Distribution information. |

### withdraw

```solidity
function withdraw(uint256[] _distributionIds) external returns (uint256)
```

Withdraw vested tokens from multiple distributions.

Name                Description

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _distributionIds | uint256[] | Array of distribution identifiers. |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint256 | Total withdrawn amounts. |

### stake

```solidity
function stake(uint256[] _distributionIds, uint256 _stake1, uint256 _stake2) external returns (uint256)
```

Stake unwithdrawn tokens from multiple distributions to staking pools.
Stake only when staking pools are opened and assigned.

Name                Description

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _distributionIds | uint256[] | Array of distribution identifiers. |
| _stake1 | uint256 | Staked amount for staking pool #1. |
| _stake2 | uint256 | Staked amount for staking pool #2. |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint256 | Staked amount for staking pool #3, which also is the remain tokens. |

