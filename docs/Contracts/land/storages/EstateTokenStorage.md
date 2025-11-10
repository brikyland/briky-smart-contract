# EstateTokenStorage

Storage contract for contract `EstateToken`.

## balanceSnapshots

```solidity
mapping(uint256 => mapping(address => struct ISnapshot.Uint256Snapshot[])) balanceSnapshots
```

{% hint style="info" %}
balanceSnapshots[estateId][account]
{% endhint %}

## custodianURIs

```solidity
mapping(bytes32 => mapping(address => string)) custodianURIs
```

{% hint style="info" %}
custodianURI[zone][account]
{% endhint %}

## estates

```solidity
mapping(uint256 => struct IEstate.Estate) estates
```

{% hint style="info" %}
estates[estateId]
{% endhint %}

## zoneRoyaltyRates

```solidity
mapping(bytes32 => uint256) zoneRoyaltyRates
```

{% hint style="info" %}
zoneRoyaltyRates[zone]
{% endhint %}

## isExtractor

```solidity
mapping(address => bool) isExtractor
```

{% hint style="info" %}
isExtractor[account]
{% endhint %}

## isTokenizer

```solidity
mapping(address => bool) isTokenizer
```

{% hint style="info" %}
isTokenizer[account]
{% endhint %}

## estateNumber

```solidity
uint256 estateNumber
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

## commissionToken

```solidity
address commissionToken
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

