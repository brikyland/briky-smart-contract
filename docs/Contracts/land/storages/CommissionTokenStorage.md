# CommissionTokenStorage

Storage contract for contract `CommissionToken`.

## brokerCommissionRates

```solidity
mapping(bytes32 => mapping(address => struct IRate.Rate)) brokerCommissionRates
```

{% hint style="info" %}
brokerCommissionRates[zone][account]
{% endhint %}

## isActiveIn

```solidity
mapping(bytes32 => mapping(address => bool)) isActiveIn
```

{% hint style="info" %}
isActiveIn[zone][account]
{% endhint %}

## commissionRates

```solidity
mapping(uint256 => struct IRate.Rate) commissionRates
```

{% hint style="info" %}
commissionRates[tokenId]
{% endhint %}

## baseURI

```solidity
string baseURI
```

## royaltyRate

```solidity
uint256 royaltyRate
```

## totalSupply

```solidity
uint256 totalSupply
```

### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |

## admin

```solidity
address admin
```

### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |

## estateToken

```solidity
address estateToken
```

### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |

## feeReceiver

```solidity
address feeReceiver
```

### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |

