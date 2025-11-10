# Solidity API

## IStakeToken

Interface for contract `StakeToken`.
A `StakeToken` contract is an ERC-20 token representing a staking pool of `PrimaryToken` that accrues periodic
rewards. For each staked primary token, an equivalent amount of derived stake token is minted as a placeholder
balance, which increases as rewards are earned. Transferring stake tokens also transfers the underlying staked
value of primary token. After culmination of the pool, unstaking allows stakers to redeem the exact amount of
primary tokens.
There are 3 staking pools with different configurations:
-   Staking pool #1: Culminates in wave  750, 2,000,000 tokens each wave.
-   Staking pool #2: Culminates in wave 1500, 3,000,000 tokens each wave.
-   Staking pool #3: Culminates in wave 2250, 4,000,000 tokens each wave.
Each rewarding wave has 1-day cooldown and the reward is distributed among stakers in proportion to their balances.
After all three staking pool have culminated, the staking pool #3 may still fetch new wave with the reward capped
at the lesser between its standard wave reward and the remaining mintable tokens to reach the maximum supply cap.
Before a staking pool culminates, unstaking is prohibited, but stakers may promote their position into the
successor staking pool. After culmination, unstaking is permitted while new staking incurs a fee that is
contributed to the treasury liquidity.
Exclusive Discount: `15% + primaryDiscount * (globalStake - totalSupply) / (2 * globalStake)`.
Note:   `primaryDiscount` is the exclusive discount of the primary token.
`globalStake` is the total tokens staked in 3 pools.
Staking fee after culmination: `value / totalSupply * treasuryLiquidity * feeRate`.
Note:   `value` is the staking value that derives fee.
`treasuryLiquidity` is the liquidity reserved in the treasury.
`feeRate` is an admin-adjustable subunitary value.

### FeeRateUpdate

```solidity
event FeeRateUpdate(struct IRate.Rate newRate)
```

Emitted when the staking fee rate is updated.

Name        Description

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| newRate | struct IRate.Rate | New staking fee rate. |

### RewardFetch

```solidity
event RewardFetch(uint256 value)
```

Emitted when staking reward is fetched from the primary token contract.

Name        Description

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| value | uint256 | Staking reward value. |

### Promotion

```solidity
event Promotion(address account, uint256 value)
```

Emitted when a staker promotes their stake to a successor staking pool contract.

Name        Description

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| account | address | Staker address. |
| value | uint256 | Amount of tokens promoted to successor contract. |

### Stake

```solidity
event Stake(address account, uint256 value, uint256 fee)
```

Emitted when primary tokens are staked into stake tokens.
After culmination, new staking incurs a fee that is contributed to the treasury liquidity.

Name        Description

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| account | address | Staker address. |
| value | uint256 | Staked value. |
| fee | uint256 | Applicable staking fee |

### Unstake

```solidity
event Unstake(address account, uint256 value)
```

Emitted when stake tokens are unstaked back to primary tokens.

Name        Description

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| account | address | Unstaker address. |
| value | uint256 | Unstaked value. |

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

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| primaryToken | address | `PrimaryToken` contract address. |

### successor

```solidity
function successor() external view returns (address successor)
```

Name            Description

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| successor | address | Successor `StakeToken` contract address. |

### lastRewardFetch

```solidity
function lastRewardFetch() external view returns (uint256 timestamp)
```

Name        Description

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| timestamp | uint256 | Last reward fetch timestamp. |

### getFeeRate

```solidity
function getFeeRate() external view returns (struct IRate.Rate rate)
```

Name    Description

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| rate | struct IRate.Rate | Staking fee rate. |

### fetchReward

```solidity
function fetchReward() external
```

Fetch reward tokens from the primary token contract based on the wave progression.

_Reward fetching may be subject to cooldown periods and wave limitations._

### promote

```solidity
function promote(uint256 value) external
```

Promote staked tokens to a successor stake token contract for enhanced benefits.
Promote only if the successor address is assigned and before culmination.

Name        Description

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| value | uint256 | Promoted value. |

### stake

```solidity
function stake(address account, uint256 value) external
```

Stake primary tokens into this contract to receive stake tokens with interest accumulation.
Staking fee after culmination: `value / totalSupply * treasuryLiquidity * feeRate`.
Note:   `value` is the staking value that derives fee.
`treasuryLiquidity` is the liquidity reserved in the treasury.
`feeRate` is an admin-adjustable subunitary value.

Name        Description

_The contract secures primary tokens and mints the exact amount of stake tokens to staker._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| account | address | Staker address. |
| value | uint256 | Staked value. |

### unstake

```solidity
function unstake(uint256 value) external
```

Unstake tokens back to primary tokens with accumulated interest.
Unstake only after culmination.

Name        Description

_The contract returns primary tokens and burns the exact amount of stake tokens to the unstaker._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| value | uint256 | Unstaked value. |

