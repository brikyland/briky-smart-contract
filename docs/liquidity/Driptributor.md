# Solidity API

## Driptributor

@author Briky Team

 @notice Interface for contract `Driptributor`.
 @notice The `Driptributor` contract facilitates distribution of `PrimaryToken` through a continuous vesting mechanism.
 @notice Token allocations vest evenly on a per-second basis after distribution.
 @notice When the staking pools are opened, accounts that have unwithdrawn allocation can stake all their remain tokens.

### receive

```solidity
receive() external payable
```

@notice Executed on a call to this contract with empty calldata.

### version

```solidity
function version() external pure returns (string)
```

@return Version of implementation.

### initialize

```solidity
function initialize(address _admin, address _primaryToken, uint256 _totalAllocation) external
```

@notice Initialize the contract after deployment, serving as the constructor.

         Name                Description
 @param  _admin              `Admin` contract address.
 @param  _primaryToken       `PrimaryToken` contract address.
 @param  _totalAllocation    Total tokens to distribute.

### updateStakeTokens

```solidity
function updateStakeTokens(address _stakeToken1, address _stakeToken2, address _stakeToken3, bytes[] _signatures) external
```

@notice Update staking pools contract.

         Name            Description
 @param  _stakeToken1    `StakeToken` contract address #1.
 @param  _stakeToken2    `StakeToken` contract address #2.
 @param  _stakeToken3    `StakeToken` contract address #3.
 @param  _signatures     Array of admin signatures.

 @dev    Administrative operator.

### distributeTokensWithDuration

```solidity
function distributeTokensWithDuration(address[] _receivers, uint256[] _amounts, uint40[] _durations, string[] _notes, bytes[] _signatures) external
```

@notice Distribute tokens to multiple receivers with vesting duration.

         Name                Description
 @param  _receivers          Array of receiver addresses, respective to each distribution.
 @param  _amounts            Array of distributed amounts, respective to each distribution.
 @param  _durations          Array of vesting durations, respective to each distribution.
 @param  _notes              Array of distribution notes, respective to each distribution.
 @param  _signatures         Array of admin signatures.

 @dev    Administrative operator.

### distributeTokensWithTimestamp

```solidity
function distributeTokensWithTimestamp(address[] _receivers, uint256[] _amounts, uint40[] _endAts, string[] _notes, bytes[] _signatures) external
```

@notice Distribute tokens to multiple receivers with vesting end timestamp.

         Name            Description
 @param  _receivers      Array of receiver addresses, respective to each distribution.
 @param  _amounts        Array of distributed amounts, respective to each distribution.
 @param  _endAts         Array of vesting end timestamps, respective to each distribution.
 @param  _notes          Array of distribution notes, respective to each distribution.
 @param  _signatures     Array of admin signatures.

 @dev    Administrative operator.

### getDistribution

```solidity
function getDistribution(uint256 _distributionId) public view returns (struct IDistribution.Distribution)
```

Name                Description
 @param  _distributionId     Distribution identifier.

 @return Distribution information.

### withdraw

```solidity
function withdraw(uint256[] _distributionIds) external returns (uint256)
```

@notice Withdraw vested tokens from multiple distributions.

         Name                Description
 @param  _distributionIds    Array of distribution identifiers.

 @return Total withdrawn amounts.

### stake

```solidity
function stake(uint256[] _distributionIds, uint256 _stake1, uint256 _stake2) external returns (uint256)
```

@notice Stake unwithdrawn tokens from multiple distributions to staking pools.
 @notice Stake only when staking pools are opened and assigned.

         Name                Description
 @param  _distributionIds    Array of distribution identifiers.
 @param  _stake1             Staked amount for staking pool #1.
 @param  _stake2             Staked amount for staking pool #2.

 @return Staked amount for staking pool #3, which also is the remain tokens.

