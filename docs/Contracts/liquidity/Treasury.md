# Treasury

The `Treasury` contract serves as a stablecoin reserve pool that backs the intrinsic value of `PrimaryToken` and
facilitates token liquidation.

20% of provided liquidity is allocated into the operation fund for sponsoring administrative expenses.

{% hint style="info" %}
ERC-20 tokens are identified by their contract addresses.
Native coin is represented by the zero address (0x0000000000000000000000000000000000000000).
{% endhint %}

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
function initialize(address _admin, address _currency, address _primaryToken) external
```

Initialize the contract after deployment, serving as the constructor.

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _admin | address | `Admin` contract address. |
| _currency | address | Currency contract address used by the treasury. |
| _primaryToken | address | `PrimaryToken` contract address. |

## withdrawOperationFund

```solidity
function withdrawOperationFund(address _operator, uint256 _value, bytes[] _signatures) external
```

Withdraw from the operation fund to an operator.

{% hint style="info" %}
Administrative operator.
{% endhint %}

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _operator | address | Operator address that received the funds. |
| _value | uint256 | Amount withdrawn from operation fund. |
| _signatures | bytes[] | Array of admin signatures. |

## withdrawLiquidity

```solidity
function withdrawLiquidity(address _withdrawer, uint256 _value) external
```

Withdraw liquidity from the treasury.

{% hint style="info" %}
Permission: PrimaryToken.
{% endhint %}

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _withdrawer | address | Receiver address. |
| _value | uint256 | Withdrawn value. |

## provideLiquidity

```solidity
function provideLiquidity(uint256 _value) external
```

Provide liquidity to the treasury.

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _value | uint256 | Provided value. |

