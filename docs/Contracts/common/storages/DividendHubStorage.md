# DividendHubStorage

Storage contract for contract `DividendHub`.

## withdrawAt

```solidity
mapping(uint256 => mapping(address => uint256)) withdrawAt
```

{% hint style="info" %}
withdrawAt[dividendId][account]
{% endhint %}

## dividends

```solidity
mapping(uint256 => struct IDividend.Dividend) dividends
```

{% hint style="info" %}
dividends[dividendId]
{% endhint %}

## dividendNumber

```solidity
uint256 dividendNumber
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

