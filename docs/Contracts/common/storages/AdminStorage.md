# AdminStorage

Storage contract for contract `Admin`.

## isManager

```solidity
mapping(address => bool) isManager
```

{% hint style="info" %}
isManager[account]
{% endhint %}

## nonce

```solidity
uint256 nonce
```

### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |

## admin1

```solidity
address admin1
```

### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |

## admin2

```solidity
address admin2
```

### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |

## admin3

```solidity
address admin3
```

### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |

## admin4

```solidity
address admin4
```

### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |

## admin5

```solidity
address admin5
```

### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |

## isModerator

```solidity
mapping(address => bool) isModerator
```

{% hint style="info" %}
isModerator[account]
{% endhint %}

## currencyRegistries

```solidity
mapping(address => struct ICurrencyRegistry.CurrencyRegistry) currencyRegistries
```

{% hint style="info" %}
currencyRegistries[currency]
{% endhint %}

## isZone

```solidity
mapping(bytes32 => bool) isZone
```

{% hint style="info" %}
isZone[zone]
{% endhint %}

## isActiveIn

```solidity
mapping(bytes32 => mapping(address => bool)) isActiveIn
```

{% hint style="info" %}
isActiveIn[zone][account]
{% endhint %}

## isGovernor

```solidity
mapping(address => bool) isGovernor
```

{% hint style="info" %}
isGovernor[account]
{% endhint %}

