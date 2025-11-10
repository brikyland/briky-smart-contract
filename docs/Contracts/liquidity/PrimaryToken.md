# Solidity API

## PrimaryToken

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
function initialize(address _admin, string _name, string _symbol, uint256 _liquidationUnlockedAt) external
```

Initialize the contract after deployment, serving as the constructor.

Name                        Description

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _admin | address | `Admin` contract address. |
| _name | string | Token name. |
| _symbol | string | Token symbol. |
| _liquidationUnlockedAt | uint256 | Liquidation unlock timestamp. |

### updateTreasury

```solidity
function updateTreasury(address _treasury, bytes[] _signatures) external
```

Update the treasury contract.

Name            Description

_Administrative operator._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _treasury | address | `Treasury` contract address. |
| _signatures | bytes[] | Array of admin signatures. |

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

### unlockForBackerRound

```solidity
function unlockForBackerRound(address _distributor, bytes[] _signatures) external
```

Unlock token allocation of the Backer Round to a distributor.

Name            Description

_Administrative operator._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _distributor | address | Distributor address. |
| _signatures | bytes[] | Array of admin signatures. |

### unlockForSeedRound

```solidity
function unlockForSeedRound(address _distributor, bytes[] _signatures) external
```

Unlock token allocation of the Seed Round to a distributor.

Name            Description

_Administrative operator._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _distributor | address | Distributor address. |
| _signatures | bytes[] | Array of admin signatures. |

### unlockForPrivateSale1

```solidity
function unlockForPrivateSale1(address _distributor, bytes[] _signatures) external
```

Unlock token allocation of the Private Sale #1 to a distributor.

Name            Description

_Administrative operator._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _distributor | address | Distributor address. |
| _signatures | bytes[] | Array of admin signatures. |

### unlockForPrivateSale2

```solidity
function unlockForPrivateSale2(address _distributor, bytes[] _signatures) external
```

Unlock token allocation of the Private Sale #2 to a distributor.

Name            Description

_Administrative operator._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _distributor | address | Distributor address. |
| _signatures | bytes[] | Array of admin signatures. |

### unlockForPublicSale

```solidity
function unlockForPublicSale(address _distributor, bytes[] _signatures) external
```

Unlock token allocation of the Public Sale to a distributor.

Name            Description

_Administrative operator._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _distributor | address | Distributor address. |
| _signatures | bytes[] | Array of admin signatures. |

### unlockForCoreTeam

```solidity
function unlockForCoreTeam(address _distributor, bytes[] _signatures) external
```

Unlock token allocation of the Core Team to a distributor.

Name            Description

_Administrative operator._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _distributor | address | Distributor address. |
| _signatures | bytes[] | Array of admin signatures. |

### unlockForMarketMaker

```solidity
function unlockForMarketMaker(address _distributor, bytes[] _signatures) external
```

Unlock token allocation of the Market Maker to a distributor.

Name            Description

_Administrative operator._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _distributor | address | Distributor address. |
| _signatures | bytes[] | Array of admin signatures. |

### unlockForExternalTreasury

```solidity
function unlockForExternalTreasury(address _distributor, bytes[] _signatures) external
```

Unlock token allocation of the External Treasury to a distributor.

Name            Description

_Administrative operator._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _distributor | address | Distributor address. |
| _signatures | bytes[] | Array of admin signatures. |

### totalStake

```solidity
function totalStake() public view returns (uint256)
```

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint256 | Total token amount staked in all staking pools. |

### isStakeRewardingCulminated

```solidity
function isStakeRewardingCulminated(address _stakeToken) external view returns (bool)
```

Name            Description

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _stakeToken | address | Staking pool contract address. |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | bool | Whether the staking pool has culminated. |

### contributeLiquidityFromBackerRound

```solidity
function contributeLiquidityFromBackerRound(uint256 _liquidity) external
```

Contribute liquidity funded from Backer Round to the treasury.

Name          Description

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _liquidity | uint256 | Contributed liquidity. |

### contributeLiquidityFromSeedRound

```solidity
function contributeLiquidityFromSeedRound(uint256 _liquidity) external
```

Contribute liquidity funded from Seed Round to the treasury.

Name          Description

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _liquidity | uint256 | Contributed liquidity. |

### contributeLiquidityFromPrivateSale1

```solidity
function contributeLiquidityFromPrivateSale1(uint256 _liquidity) external
```

Contribute liquidity funded from Private Sale #1 to the treasury.

Name          Description

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _liquidity | uint256 | Contributed liquidity. |

### contributeLiquidityFromPrivateSale2

```solidity
function contributeLiquidityFromPrivateSale2(uint256 _liquidity) external
```

Contribute liquidity funded from Private Sale #2 to the treasury.

Name          Description

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _liquidity | uint256 | Contributed liquidity. |

### contributeLiquidityFromPublicSale

```solidity
function contributeLiquidityFromPublicSale(uint256 _liquidity) external
```

Contribute liquidity funded from Public Sale to the treasury.

Name          Description

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _liquidity | uint256 | Contributed liquidity. |

### contributeLiquidityFromMarketMaker

```solidity
function contributeLiquidityFromMarketMaker(uint256 _liquidity) external
```

Contribute liquidity funded from Market Maker to the treasury.

Name          Description

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _liquidity | uint256 | Contributed liquidity. |

### contributeLiquidityFromExternalTreasury

```solidity
function contributeLiquidityFromExternalTreasury(uint256 _liquidity) external
```

Contribute liquidity funded from External Treasury to the treasury.

Name          Description

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _liquidity | uint256 | Contributed liquidity. |

### contributeLiquidityFromStakeToken

```solidity
function contributeLiquidityFromStakeToken(uint256 _liquidity) external
```

Contribute liquidity funded from a staking pool to the treasury.

Name          Description

_Permission: Staking pools._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _liquidity | uint256 | Contributed liquidity. |

### mintForStake

```solidity
function mintForStake() external returns (uint256)
```

Mint reward tokens for the sending staking pool based on its wave progression.
After all three staking pool have culminated, the staking pool #3 may still fetch new wave with the reward capped
at the lesser between its standard wave reward and the remaining mintable tokens to reach the maximum supply cap.

_Permission: Staking pools._

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint256 | Staking reward. |

### liquidate

```solidity
function liquidate(uint256 _amount) external returns (uint256)
```

Liquidate tokens for proportional liquidity from the treasury.
Liquidate only after liquidation unlock timestamp.

Name        Description

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _amount | uint256 | Liquidated token amount. |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint256 | Liquidated value. |

### exclusiveDiscount

```solidity
function exclusiveDiscount() external view returns (struct IRate.Rate)
```

Exclusive Discount: `15% * (1 + globalStake/totalSupply)`.
Note:   `globalStake` is the total tokens staked in 3 pools.

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | struct IRate.Rate | Discount rate for exclusive token. |

### _contributeLiquidity

```solidity
function _contributeLiquidity(uint256 _liquidity) internal
```

Contribute liquidity to the treasury.

Name            Description

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _liquidity | uint256 | Contributed liquidity. |

### _mint

```solidity
function _mint(address _account, uint256 _amount) internal
```

Mint new tokens to an account.

Name            Description

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _account | address | Receiver address. |
| _amount | uint256 | Minted amount. |

### _beforeTokenTransfer

```solidity
function _beforeTokenTransfer(address _from, address _to, uint256 _amount) internal
```

Hook to be called before any token transfer.

Name            Description

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _from | address | Sender address. |
| _to | address | Receiver address. |
| _amount | uint256 | Transferred amount. |

