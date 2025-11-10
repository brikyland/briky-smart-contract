# ITreasury

The `Treasury` contract serves as a stablecoin reserve pool that backs the intrinsic value of `PrimaryToken` and
facilitates token liquidation.

20% of provided liquidity is allocated into the operation fund for sponsoring administrative expenses.

{% hint style="info" %}
ERC-20 tokens are identified by their contract addresses.
Native coin is represented by the zero address (0x0000000000000000000000000000000000000000).
{% endhint %}

## LiquidityProvision

```solidity
event LiquidityProvision(address provider, uint256 value, uint256 operationContribution)
```

Emitted when liquidity is provided to the treasury.

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| provider | address | Provider address. |
| value | uint256 | Provided value. |
| operationContribution | uint256 | Contribution for the operation fund. |

## LiquidityWithdrawal

```solidity
event LiquidityWithdrawal(address receiver, uint256 value)
```

Emitted when liquidity is withdrawn from the treasury.

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| receiver | address | Receiver address. |
| value | uint256 | Withdrawn value. |

## OperationFundWithdrawal

```solidity
event OperationFundWithdrawal(address operator, uint256 value)
```

Emitted when the operation fund is withdrawn to an operator.

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| operator | address | Operator address. |
| value | uint256 | Withdrawn value. |

## currency

```solidity
function currency() external view returns (address currency)
```

ERC-20 stablecoin.

### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| currency | address | Liquidity currency address. |

## primaryToken

```solidity
function primaryToken() external view returns (address primaryToken)
```

### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| primaryToken | address | `PrimaryToken` contract address. |

## operationFund

```solidity
function operationFund() external view returns (uint256 fund)
```

### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| fund | uint256 | Reserved operation fund. |

## liquidity

```solidity
function liquidity() external view returns (uint256 liquidity)
```

### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| liquidity | uint256 | Reserved liquidity. |

## provideLiquidity

```solidity
function provideLiquidity(uint256 value) external
```

Provide liquidity to the treasury.

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| value | uint256 | Provided value. |

## withdrawLiquidity

```solidity
function withdrawLiquidity(address receiver, uint256 value) external
```

Withdraw liquidity from the treasury.

{% hint style="info" %}
Permission: PrimaryToken.
{% endhint %}

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| receiver | address | Receiver address. |
| value | uint256 | Withdrawn value. |

