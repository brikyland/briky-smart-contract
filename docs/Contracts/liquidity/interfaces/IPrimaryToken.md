# Solidity API

## IPrimaryToken

Interface for contract `PrimaryToken`.
The `PrimaryToken` is an ERC-20 token circulating as the exclusive currency of the system.
The maximum supply is 20,000,000,000 tokens.
Tokens are distributed through 5 rounds:
-   Backer Round:         100,000,000 tokens
-   Seed Round:            50,000,000 tokens
-   Private Sale #1:       30,000,000 tokens
-   Private Sale #2:       50,000,000 tokens
-   Public Sale:          500,000,000 tokens
Tokens are reserved in 3 funds:
-   Core Team:          1,000,000,000 tokens
-   Market Marker:      2,270,000,000 tokens
-   External Treasury:  1,000,000,000 tokens
Tokens are periodically rewarded in 3 staking pools:
-   Staking pool #1:    Culminates in wave  750, 2,000,000 tokens each wave.
-   Staking pool #2:    Culminates in wave 1500, 3,000,000 tokens each wave.
-   Staking pool #3:    Culminates in wave 2250, 4,000,000 tokens each wave.
After all three staking pool have culminated, the staking pool #3 may still fetch new wave with the reward capped
at the lesser between its standard wave reward and the remaining mintable tokens to reach the maximum supply cap.
Token liquidation is backed by a stablecoin treasury. Holders may burn tokens to redeem value once liquidation is
unlocked.
Exclusive Discount: `15% * (1 + globalStake/totalSupply)`.
Note:   `globalStake` is the total tokens staked in 3 pools.

### BackerRoundTokensUnlock

```solidity
event BackerRoundTokensUnlock()
```

Emitted when Backer Round tokens are unlocked to a distributor.

### CoreTeamTokensUnlock

```solidity
event CoreTeamTokensUnlock()
```

Emitted when Core Team tokens are unlocked to a distributor.

### ExternalTreasuryTokensUnlock

```solidity
event ExternalTreasuryTokensUnlock()
```

Emitted when External Treasury tokens are unlocked to a distributor.

### MarketMakerTokensUnlock

```solidity
event MarketMakerTokensUnlock()
```

Emitted when Market Maker tokens are unlocked to a distributor.

### PrivateSale1TokensUnlock

```solidity
event PrivateSale1TokensUnlock()
```

Emitted when Private Sale #1 tokens are unlocked to a distributor.

### PrivateSale2TokensUnlock

```solidity
event PrivateSale2TokensUnlock()
```

Emitted when Private Sale #2 tokens are unlocked to a distributor.

### PublicSaleTokensUnlock

```solidity
event PublicSaleTokensUnlock()
```

Emitted when Public Sale tokens are unlocked to a distributor.

### SeedRoundTokensUnlock

```solidity
event SeedRoundTokensUnlock()
```

Emitted when Seed Round tokens are unlocked to a distributor.

### Stake1WaveReward

```solidity
event Stake1WaveReward(uint256 wave, uint256 reward)
```

Emitted when a wave of reward tokens are minted for staking pool #1.

Name    Description

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| wave | uint256 | Current wave number. |
| reward | uint256 | Staking reward. |

### Stake2WaveReward

```solidity
event Stake2WaveReward(uint256 wave, uint256 reward)
```

Emitted when a wave of reward tokens are minted for staking pool #2.

Name    Description

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| wave | uint256 | Current wave number. |
| reward | uint256 | Staking reward. |

### Stake3WaveReward

```solidity
event Stake3WaveReward(uint256 wave, uint256 reward)
```

Emitted when a wave of reward tokens are minted for staking pool #3.

Name    Description

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| wave | uint256 | Current wave number. |
| reward | uint256 | Staking reward. |

### LiquidityContributionFromBackerRound

```solidity
event LiquidityContributionFromBackerRound(uint256 liquidity)
```

Emitted when liquidity is contributed from Backer Round operating.

Name        Description

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| liquidity | uint256 | Contributed liquidity. |

### LiquidityContributionFromExternalTreasury

```solidity
event LiquidityContributionFromExternalTreasury(uint256 liquidity)
```

Emitted when liquidity is contributed from External Treasury operating.

Name        Description

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| liquidity | uint256 | Contributed liquidity. |

### LiquidityContributionFromMarketMaker

```solidity
event LiquidityContributionFromMarketMaker(uint256 liquidity)
```

Emitted when liquidity is contributed from Market Maker operating.

Name        Description

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| liquidity | uint256 | Contributed liquidity. |

### LiquidityContributionFromPrivateSale1

```solidity
event LiquidityContributionFromPrivateSale1(uint256 liquidity)
```

Emitted when liquidity is contributed from Private Sale #1 operating.

Name        Description

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| liquidity | uint256 | Contributed liquidity. |

### LiquidityContributionFromPrivateSale2

```solidity
event LiquidityContributionFromPrivateSale2(uint256 liquidity)
```

Emitted when liquidity is contributed from Private Sale #2 operating.

Name        Description

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| liquidity | uint256 | Contributed liquidity. |

### LiquidityContributionFromPublicSale

```solidity
event LiquidityContributionFromPublicSale(uint256 liquidity)
```

Emitted when liquidity is contributed from Public Sale operating.

Name        Description

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| liquidity | uint256 | Contributed liquidity. |

### LiquidityContributionFromSeedRound

```solidity
event LiquidityContributionFromSeedRound(uint256 liquidity)
```

Emitted when liquidity is contributed from Seed Round operating.

Name        Description

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| liquidity | uint256 | Contributed liquidity. |

### LiquidityContributionFromStakeToken1

```solidity
event LiquidityContributionFromStakeToken1(uint256 liquidity)
```

Emitted when liquidity is contributed from staking pool #1 contract.

Name        Description

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| liquidity | uint256 | Contributed liquidity. |

### LiquidityContributionFromStakeToken2

```solidity
event LiquidityContributionFromStakeToken2(uint256 liquidity)
```

Emitted when liquidity is contributed from staking pool #2 contract.

Name        Description

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| liquidity | uint256 | Contributed liquidity. |

### LiquidityContributionFromStakeToken3

```solidity
event LiquidityContributionFromStakeToken3(uint256 liquidity)
```

Emitted when liquidity is contributed from staking pool #3 contract.

Name        Description

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| liquidity | uint256 | Contributed liquidity. |

### Liquidation

```solidity
event Liquidation(address account, uint256 amount, uint256 liquidity)
```

Emitted when tokens are liquidated.

Name        Description

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| account | address | EVM address. |
| amount | uint256 | Liquidated token amount. |
| liquidity | uint256 | Liquidation value. |

### AllStakeRewardMinted

```solidity
error AllStakeRewardMinted()
```

===== ERROR ===== *

### AlreadyUnlockedTokens

```solidity
error AlreadyUnlockedTokens()
```

### BeingLocked

```solidity
error BeingLocked()
```

### InvalidStakeToken

```solidity
error InvalidStakeToken()
```

### NotUnlocked

```solidity
error NotUnlocked()
```

### SupplyCapReached

```solidity
error SupplyCapReached()
```

### treasury

```solidity
function treasury() external view returns (address treasury)
```

Name            Description

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| treasury | address | `Treasury` contract address. |

### stakeToken1

```solidity
function stakeToken1() external view returns (address stakeToken1)
```

Name            Description

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| stakeToken1 | address | `StakeToken` contract address #1. |

### stakeToken2

```solidity
function stakeToken2() external view returns (address stakeToken2)
```

Name            Description

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| stakeToken2 | address | `StakeToken` contract address #2. |

### stakeToken3

```solidity
function stakeToken3() external view returns (address stakeToken3)
```

Name            Description

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| stakeToken3 | address | `StakeToken` contract address #3. |

### totalStake

```solidity
function totalStake() external view returns (uint256 totalStake)
```

Name        Description

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| totalStake | uint256 | Total token amount staked in all staking pools. |

### stakeToken1Waves

```solidity
function stakeToken1Waves() external view returns (uint256 wave)
```

Name        Description

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| wave | uint256 | Current wave number for staking pool #1. |

### stakeToken2Waves

```solidity
function stakeToken2Waves() external view returns (uint256 wave)
```

Name        Description

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| wave | uint256 | Current wave number for staking pool #2. |

### stakeToken3Waves

```solidity
function stakeToken3Waves() external view returns (uint256 wave)
```

Name        Description

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| wave | uint256 | Current wave number for staking pool #3. |

### backerRoundContribution

```solidity
function backerRoundContribution() external view returns (uint256 contribution)
```

Name            Description

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| contribution | uint256 | Total liquidity contributed from operating of Backer Round . |

### externalTreasuryContribution

```solidity
function externalTreasuryContribution() external view returns (uint256 contribution)
```

Name            Description

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| contribution | uint256 | Total liquidity contributed from operating of External Treasury. |

### marketMakerContribution

```solidity
function marketMakerContribution() external view returns (uint256 contribution)
```

Name            Description

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| contribution | uint256 | Total liquidity contributed from operating of Market Maker. |

### privateSale1Contribution

```solidity
function privateSale1Contribution() external view returns (uint256 contribution)
```

Name            Description

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| contribution | uint256 | Total liquidity contributed from operating of Private Sale #1. |

### privateSale2Contribution

```solidity
function privateSale2Contribution() external view returns (uint256 contribution)
```

Name            Description

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| contribution | uint256 | Total liquidity contributed from operating of Private Sale #2. |

### publicSaleContribution

```solidity
function publicSaleContribution() external view returns (uint256 contribution)
```

Name            Description

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| contribution | uint256 | Total liquidity contributed from operating of Public Sale. |

### seedRoundContribution

```solidity
function seedRoundContribution() external view returns (uint256 contribution)
```

Name            Description

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| contribution | uint256 | Total liquidity contributed from operating of Seed Round. |

### stakeToken1Contribution

```solidity
function stakeToken1Contribution() external view returns (uint256 contribution)
```

Name            Description

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| contribution | uint256 | Total liquidity contributed from operating of staking pool #1. |

### stakeToken2Contribution

```solidity
function stakeToken2Contribution() external view returns (uint256 contribution)
```

Name            Description

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| contribution | uint256 | Total liquidity contributed from operating of staking pool #2. |

### stakeToken3Contribution

```solidity
function stakeToken3Contribution() external view returns (uint256 contribution)
```

Name            Description

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| contribution | uint256 | Total liquidity contributed from operating of staking pool #3. |

### backerRoundUnlocked

```solidity
function backerRoundUnlocked() external view returns (bool isUnlocked)
```

Name        Description

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| isUnlocked | bool | Whether Backer Round tokens have been unlocked. |

### coreTeamTokensUnlocked

```solidity
function coreTeamTokensUnlocked() external view returns (bool isUnlocked)
```

Name        Description

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| isUnlocked | bool | Whether Core Team tokens have been unlocked. |

### externalTreasuryTokensUnlocked

```solidity
function externalTreasuryTokensUnlocked() external view returns (bool isUnlocked)
```

Name        Description

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| isUnlocked | bool | Whether External Treasury tokens have been unlocked. |

### marketMakerTokensUnlocked

```solidity
function marketMakerTokensUnlocked() external view returns (bool isUnlocked)
```

Name        Description

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| isUnlocked | bool | Whether Market Maker tokens have been unlocked. |

### privateSale1Unlocked

```solidity
function privateSale1Unlocked() external view returns (bool isUnlocked)
```

Name        Description

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| isUnlocked | bool | Whether Private Sale #1 tokens have been unlocked. |

### privateSale2Unlocked

```solidity
function privateSale2Unlocked() external view returns (bool isUnlocked)
```

Name        Description

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| isUnlocked | bool | Whether Private Sale #2 tokens have been unlocked. |

### publicSaleUnlocked

```solidity
function publicSaleUnlocked() external view returns (bool isUnlocked)
```

Name        Description

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| isUnlocked | bool | Whether Public Sale tokens have been unlocked. |

### seedRoundUnlocked

```solidity
function seedRoundUnlocked() external view returns (bool isUnlocked)
```

Name        Description

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| isUnlocked | bool | Whether Seed Round tokens have been unlocked. |

### liquidationUnlockedAt

```solidity
function liquidationUnlockedAt() external view returns (uint256 liquidationUnlockedAt)
```

Name                    Description

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| liquidationUnlockedAt | uint256 | Liquidation unlock timestamp. |

### isStakeRewardingCulminated

```solidity
function isStakeRewardingCulminated(address stakeToken) external view returns (bool isCompleted)
```

Name            Description

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| stakeToken | address | Staking pool contract address. |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| isCompleted | bool | Whether the staking pool has culminated. |

### contributeLiquidityFromBackerRound

```solidity
function contributeLiquidityFromBackerRound(uint256 liquidity) external
```

Contribute liquidity funded from Backer Round to the treasury.

Name        Description

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| liquidity | uint256 | Contributed liquidity |

### contributeLiquidityFromExternalTreasury

```solidity
function contributeLiquidityFromExternalTreasury(uint256 liquidity) external
```

Contribute liquidity funded from External Treasury to the treasury.

Name        Description

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| liquidity | uint256 | Contributed liquidity |

### contributeLiquidityFromMarketMaker

```solidity
function contributeLiquidityFromMarketMaker(uint256 liquidity) external
```

Contribute liquidity funded from Market Maker to the treasury.

Name        Description

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| liquidity | uint256 | Contributed liquidity |

### contributeLiquidityFromPrivateSale1

```solidity
function contributeLiquidityFromPrivateSale1(uint256 liquidity) external
```

Contribute liquidity funded from Private Sale #1 to the treasury.

Name        Description

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| liquidity | uint256 | Contributed liquidity |

### contributeLiquidityFromPrivateSale2

```solidity
function contributeLiquidityFromPrivateSale2(uint256 liquidity) external
```

Contribute liquidity funded from Private Sale #2 to the treasury.

Name        Description

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| liquidity | uint256 | Contributed liquidity |

### contributeLiquidityFromPublicSale

```solidity
function contributeLiquidityFromPublicSale(uint256 liquidity) external
```

Contribute liquidity funded from Public Sale to the treasury.

Name        Description

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| liquidity | uint256 | Contributed liquidity |

### contributeLiquidityFromSeedRound

```solidity
function contributeLiquidityFromSeedRound(uint256 liquidity) external
```

Contribute liquidity funded from Seed Round to the treasury.

Name        Description

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| liquidity | uint256 | Contributed liquidity |

### contributeLiquidityFromStakeToken

```solidity
function contributeLiquidityFromStakeToken(uint256 liquidity) external
```

Contribute liquidity funded from a staking pool to the treasury.

Name        Description

_Permission: Staking pools._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| liquidity | uint256 | Contributed liquidity |

### mintForStake

```solidity
function mintForStake() external returns (uint256 reward)
```

Mint reward tokens for the sending staking pool based on its wave progression.
After all three staking pool have culminated, the staking pool #3 may still fetch new wave with the reward capped
at the lesser between its standard wave reward and the remaining mintable tokens to reach the maximum supply cap.

Name    Description

_Permission: Staking pools._

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| reward | uint256 | Staking reward. |

### liquidate

```solidity
function liquidate(uint256 amount) external returns (uint256 liquidity)
```

Liquidate tokens for proportional liquidity from the treasury.
Liquidate only after liquidation unlock timestamp.

Name        Description

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| amount | uint256 | Liquidated token amount. |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| liquidity | uint256 | Liquidated value. |

