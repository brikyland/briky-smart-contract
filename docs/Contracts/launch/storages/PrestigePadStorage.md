# PrestigePadStorage

Storage contract for contract `PrestigePad`.

## contributions

```solidity
mapping(uint256 => mapping(address => uint256)) contributions
```

{% hint style="info" %}
contributions[roundId][account]
{% endhint %}

## withdrawAt

```solidity
mapping(uint256 => mapping(address => uint256)) withdrawAt
```

{% hint style="info" %}
withdrawAt[roundId][account]
{% endhint %}

## launches

```solidity
mapping(uint256 => struct IPrestigePadLaunch.PrestigePadLaunch) launches
```

{% hint style="info" %}
launches[launchId]
{% endhint %}

## rounds

```solidity
mapping(uint256 => struct IPrestigePadRound.PrestigePadRound) rounds
```

{% hint style="info" %}
rounds[roundId]
{% endhint %}

## launchNumber

```solidity
uint256 launchNumber
```

### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |

## roundNumber

```solidity
uint256 roundNumber
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

## projectToken

```solidity
address projectToken
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

