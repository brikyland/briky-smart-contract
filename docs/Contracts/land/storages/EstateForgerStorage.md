# EstateForgerStorage

Storage contract for contract `EstateForger`.

## deposits

```solidity
mapping(uint256 => mapping(address => uint256)) deposits
```

{% hint style="info" %}
deposits[requestId][account]
{% endhint %}

## withdrawAt

```solidity
mapping(uint256 => mapping(address => uint256)) withdrawAt
```

{% hint style="info" %}
withdrawAt[requestId][account]
{% endhint %}

## isWhitelistedFor

```solidity
mapping(uint256 => mapping(address => bool)) isWhitelistedFor
```

{% hint style="info" %}
isWhitelistedFor[requestId][account]
{% endhint %}

## requests

```solidity
mapping(uint256 => struct IEstateForgerRequest.EstateForgerRequest) requests
```

{% hint style="info" %}
requests[requestId]
{% endhint %}

## isWhitelisted

```solidity
mapping(address => bool) isWhitelisted
```

{% hint style="info" %}
isWhitelisted[account]
{% endhint %}

## requestNumber

```solidity
uint256 requestNumber
```

### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |

## baseMinUnitPrice

```solidity
uint256 baseMinUnitPrice
```

### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |

## baseMaxUnitPrice

```solidity
uint256 baseMaxUnitPrice
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

## priceWatcher

```solidity
address priceWatcher
```

### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |

## reserveVault

```solidity
address reserveVault
```

### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |

