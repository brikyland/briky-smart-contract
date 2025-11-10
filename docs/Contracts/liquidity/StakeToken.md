# StakeToken

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

## receive

```solidity
receive() external payable
```

Executed on a call to this contract with empty calldata.

## version

```solidity
function version() external pure returns (string)
```

### Return Values

Version of implementation.

## initialize

```solidity
function initialize(address _admin, address _primaryToken, string _name, string _symbol, uint256 _feeRate) external
```

Initialize the contract after deployment, serving as the constructor.

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _admin | address | `Admin` contract address. |
| _primaryToken | address | `PrimaryToken` contract address. |
| _name | string | Token name. |
| _symbol | string | Token symbol. |
| _feeRate | uint256 | Staking fee rate. |

## initializeRewarding

```solidity
function initializeRewarding(uint256 _initialLastRewardFetch, address _successor, bytes[] _signatures) external
```

Initialize rewarding.

{% hint style="info" %}
Administrative operator.
{% endhint %}

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _initialLastRewardFetch | uint256 | Last reward fetch timestamp. |
| _successor | address | Successor `StakeToken` contract address. |
| _signatures | bytes[] | Array of admin signatures. |

## updateFeeRate

```solidity
function updateFeeRate(uint256 _feeRate, bytes[] _signatures) external
```

Update the staking fee rate.

{% hint style="info" %}
Administrative operator.
{% endhint %}

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _feeRate | uint256 | New staking fee rate. |
| _signatures | bytes[] | Array of admin signatures. |

## getFeeRate

```solidity
function getFeeRate() external view returns (struct IRate.Rate)
```

### Return Values

Staking fee rate.

## totalSupply

```solidity
function totalSupply() public view returns (uint256)
```

### Return Values

Total supply of the token.

## balanceOf

```solidity
function balanceOf(address _account) public view returns (uint256)
```

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _account | address | EVM address. |

### Return Values

Stake of the account.

## exclusiveDiscount

```solidity
function exclusiveDiscount() external view returns (struct IRate.Rate)
```

Exclusive Discount: `15% + primaryDiscount * (globalStake - totalSupply) / (2 * globalStake)`.
Note:   `primaryDiscount` is the exclusive discount of the primary token.
        `globalStake` is the total tokens staked in 3 pools.

### Return Values

Discount rate for exclusive token.

## fetchReward

```solidity
function fetchReward() public
```

Fetch reward tokens from the primary token contract based on the wave progression.

{% hint style="info" %}
Reward fetching may be subject to cooldown periods and wave limitations.
{% endhint %}

## stake

```solidity
function stake(address _account, uint256 _value) external
```

Stake primary tokens into this contract to receive stake tokens with interest accumulation.

Staking fee after culmination: `value / totalSupply * treasuryLiquidity * feeRate`.
Note:   `value` is the staking value that derives fee.
        `treasuryLiquidity` is the liquidity reserved in the treasury.
        `feeRate` is an admin-adjustable subunitary value.

{% hint style="info" %}
The contract secures primary tokens and mints the exact amount of stake tokens to the staker.
{% endhint %}

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _account | address | Staker address. |
| _value | uint256 | Staked value. |

## unstake

```solidity
function unstake(uint256 _value) external
```

Unstake tokens back to primary tokens with accumulated interest.

Unstake only after culmination.

{% hint style="info" %}
The contract returns primary tokens and burns the exact amount of stake tokens to the unstaker.
{% endhint %}

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _value | uint256 | Unstaked value. |

## promote

```solidity
function promote(uint256 _value) external
```

Promote staked tokens to a successor stake token contract for enhanced benefits.

Promote only if the successor address is assigned and before culmination.

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _value | uint256 | Promoted value. |

## _transfer

```solidity
function _transfer(address _from, address _to, uint256 _amount) internal
```

Transfer stake as tokens.

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _from | address | Sender address. |
| _to | address | Receiver address. |
| _amount | uint256 | Transferred amount. |

## _beforeTokenTransfer

```solidity
function _beforeTokenTransfer(address _from, address _to, uint256 _amount) internal
```

Hook to be called before any token transfer.

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _from | address | Sender address. |
| _to | address | Receiver address. |
| _amount | uint256 | Transferred amount. |

## _stakingFee

```solidity
function _stakingFee(uint256 _liquidity, uint256 _value, uint256 _totalSupply, uint256 _feeRate) internal pure returns (uint256)
```

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _liquidity | uint256 | Current liquidity of the treasury. |
| _value | uint256 | Staked value. |
| _totalSupply | uint256 | Total supply of the primary token. |
| _feeRate | uint256 | Staking fee rate. |

### Return Values

fee             Staking fee.

## _newInterestAccumulation

```solidity
function _newInterestAccumulation(uint256 _interestAccumulation, uint256 _reward, uint256 _totalSupply) internal pure returns (uint256)
```

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _interestAccumulation | uint256 | Current interest accumulation rate. |
| _reward | uint256 | Fetched staking reward. |
| _totalSupply | uint256 | Current total stake. |

### Return Values

Updated interest accumulation rate.

## _balanceToWeight

```solidity
function _balanceToWeight(uint256 _balance, uint256 _interestAccumulation) internal pure returns (uint256)
```

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _balance | uint256 | Token balance. |
| _interestAccumulation | uint256 | Current interest accumulation rate. |

### Return Values

Converted weight value.

## _weightToBalance

```solidity
function _weightToBalance(uint256 _weight, uint256 _interestAccumulation) internal pure returns (uint256)
```

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _weight | uint256 | Weight value. |
| _interestAccumulation | uint256 | Current interest accumulation rate. |

### Return Values

Converted token balance.

