# FeeReceiver

The `FeeReceiver` contract passively receives and holds fee from operators within the system until being withdrawn
on demands of admins.

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
function initialize(address _admin) external
```

Initialize the contract after deployment, serving as the constructor.

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _admin | address | `Admin` contract address. |

## withdraw

```solidity
function withdraw(address _receiver, address[] _currencies, uint256[] _values, bytes[] _signatures) external
```

Withdraw sufficient amounts in multiple cryptocurrencies from this contract to an account.

{% hint style="info" %}
Administrative operator.
{% endhint %}

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _receiver | address | Receiver address. |
| _currencies | address[] | Array of withdrawn currency addresses. |
| _values | uint256[] | Array of withdrawn values, respective to each currency. |
| _signatures | bytes[] | Array of admin signatures. |

