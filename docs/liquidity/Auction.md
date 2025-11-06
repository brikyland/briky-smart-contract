# Solidity API

## Auction

@author Briky Team

 @notice The `Auction` contract facilitates public distribution of `PrimaryToken`. Accounts can deposit to acquire tokens,
         which are distributed proportionally to their deposit and can be withdrawn with a continuous vesting mechanism. All
         the deposit will be contributed to the liquidity of the `Treasury`.
 @notice Token allocations vest evenly on a per-second basis after the auction ends
 @notice When the staking pools are opened, accounts that have unwithdrawn allocation can stake all their remain tokens.
 @notice Auction currency is the stablecoin currency of the treasury.

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
function initialize(address _admin, address _primaryToken) external
```

@notice Initialize the contract after deployment, serving as the constructor.

         Name            Description
 @param  _admin          `Admin` contract address.
 @param  _primaryToken   `PrimaryToken` contract address.

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

### startAuction

```solidity
function startAuction(uint256 _endAt, uint256 _vestingDuration, bytes[] _signatures) external
```

@notice Start the auction with specific end timestamp and vesting duration.

         Name                Description
 @param  _endAt              Auction end timestamp.
 @param  _vestingDuration    Vesting duration.
 @param  _signatures         Array of admin signatures.

 @dev    Administrative operator.

### allocationOf

```solidity
function allocationOf(address _account) public view returns (uint256)
```

Name        Description
 @param  _account    EVM address.

 @return Tokens allocated in proportion to deposit of the account relative to all others.

### deposit

```solidity
function deposit(uint256 _value) external
```

@notice Deposit value into the auction.
 @notice Deposit only before the auction ends.

         Name        Description
 @param  _value      Deposited value.

### withdraw

```solidity
function withdraw() external returns (uint256)
```

@notice Withdraw vested tokens.
 @notice Withdraw only after auction ends.

 @return Withdrawn amount.

### stake

```solidity
function stake(uint256 _stake1, uint256 _stake2) external returns (uint256)
```

@notice Stake unwithdrawn tokens to staking pools.
 @notice Stake only when staking pools are opened and assigned.

         Name        Description
 @param  _stake1     Staked amount for staking pool #1.
 @param  _stake2     Staked amount for staking pool #2.

 @return Staked amount for staking pool #3, which also is the remain tokens.

