# Solidity API

## IStakeToken

@author Briky Team

 @notice Interface for contract `StakeToken`.
 @notice A `StakeToken` contract is an ERC-20 token representing a staking pool of `PrimaryToken` that accrues periodic
         rewards. For each staked primary token, an equivalent amount of derived stake token is minted as a placeholder
         balance, which increases as rewards are earned. Transferring stake tokens also transfers the underlying staked
         value of primary token. After culmination of the pool, unstaking allows stakers to redeem the exact amount of
         primary tokens.
 @notice There are 3 staking pools with different configurations:
         -   Staking pool #1: Culminates in wave  750, 2,000,000 tokens each wave.
         -   Staking pool #2: Culminates in wave 1500, 3,000,000 tokens each wave.
         -   Staking pool #3: Culminates in wave 2250, 4,000,000 tokens each wave.
 @notice Each rewarding wave has 1-day cooldown and the reward is distributed among stakers in proportion to their balances.
 @notice After all three staking pool have culminated, the staking pool #3 may still fetch new wave with the reward capped
         at the lesser between its standard wave reward and the remaining mintable tokens to reach the maximum supply cap.
 @notice Before a staking pool culminates, unstaking is prohibited, but stakers may promote their position into the
         successor staking pool. After culmination, unstaking is permitted while new staking incurs a fee that is
         contributed to the treasury liquidity.
 @notice Exclusive Discount: `15% + primaryDiscount * (globalStake - totalSupply) / (2 * globalStake)`.
         Note:   `primaryDiscount` is the exclusive discount of the primary token.
                 `globalStake` is the total tokens staked in 3 pools.
 @notice Staking fee after culmination: `value / totalSupply * treasuryLiquidity * feeRate`.
         Note:   `value` is the staking value that derives fee.
                 `treasuryLiquidity` is the liquidity reserved in the treasury.
                 `feeRate` is an admin-adjustable subunitary value.

### FeeRateUpdate

```solidity
event FeeRateUpdate(struct IRate.Rate newRate)
```

@notice Emitted when the staking fee rate is updated.

         Name        Description
 @param  newRate     New staking fee rate.

### RewardFetch

```solidity
event RewardFetch(uint256 value)
```

@notice Emitted when staking reward is fetched from the primary token contract.

         Name        Description
 @param  value       Staking reward value.

### Promotion

```solidity
event Promotion(address account, uint256 value)
```

@notice Emitted when a staker promotes their stake to a successor staking pool contract.

         Name        Description
 @param  account     Staker address.
 @param  value       Amount of tokens promoted to successor contract.

### Stake

```solidity
event Stake(address account, uint256 value, uint256 fee)
```

@notice Emitted when primary tokens are staked into stake tokens.
 @notice After culmination, new staking incurs a fee that is contributed to the treasury liquidity.

         Name        Description
 @param  account     Staker address.
 @param  value       Staked value.
 @param  fee         Applicable staking fee

### Unstake

```solidity
event Unstake(address account, uint256 value)
```

@notice Emitted when stake tokens are unstaked back to primary tokens.

         Name        Description
 @param  account     Unstaker address.
 @param  value       Unstaked value.

### AlreadyStartedRewarding

```solidity
error AlreadyStartedRewarding()
```

===== ERROR ===== *

### InvalidPromoting

```solidity
error InvalidPromoting()
```

### NoStake

```solidity
error NoStake()
```

### NoSuccessor

```solidity
error NoSuccessor()
```

### NotStartedRewarding

```solidity
error NotStartedRewarding()
```

### NotCulminated

```solidity
error NotCulminated()
```

### OnCoolDown

```solidity
error OnCoolDown()
```

### primaryToken

```solidity
function primaryToken() external view returns (address primaryToken)
```

Name            Description
 @return primaryToken    `PrimaryToken` contract address.

### successor

```solidity
function successor() external view returns (address successor)
```

Name            Description
 @return successor       Successor `StakeToken` contract address.

### lastRewardFetch

```solidity
function lastRewardFetch() external view returns (uint256 timestamp)
```

Name        Description
 @return timestamp   Last reward fetch timestamp.

### getFeeRate

```solidity
function getFeeRate() external view returns (struct IRate.Rate rate)
```

Name    Description
 @return rate    Staking fee rate.

### fetchReward

```solidity
function fetchReward() external
```

@notice Fetch reward tokens from the primary token contract based on the wave progression.

 @dev    Reward fetching may be subject to cooldown periods and wave limitations.

### promote

```solidity
function promote(uint256 value) external
```

@notice Promote staked tokens to a successor stake token contract for enhanced benefits.
 @notice Promote only if the successor address is assigned and before culmination.

         Name        Description
 @param  value       Promoted value.

### stake

```solidity
function stake(address account, uint256 value) external
```

@notice Stake primary tokens into this contract to receive stake tokens with interest accumulation.
 @notice Staking fee after culmination: `value / totalSupply * treasuryLiquidity * feeRate`.
         Note:   `value` is the staking value that derives fee.
                 `treasuryLiquidity` is the liquidity reserved in the treasury.
                 `feeRate` is an admin-adjustable subunitary value.

         Name        Description
 @param  account    Staker address.
 @param  value      Staked value.

 @dev    The contract secures primary tokens and mints the exact amount of stake tokens to staker.

### unstake

```solidity
function unstake(uint256 value) external
```

@notice Unstake tokens back to primary tokens with accumulated interest.
 @notice Unstake only after culmination.

         Name        Description
 @param  value       Unstaked value.

 @dev    The contract returns primary tokens and burns the exact amount of stake tokens to the unstaker.

