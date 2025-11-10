# AssetMarketplaceStorage

Storage contract for contract `AssetMarketplace`.

## offers

```solidity
mapping(uint256 => struct IAssetOffer.AssetOffer) offers
```

{% hint style="info" %}
offers[offerId]
{% endhint %}

## offerNumber

```solidity
uint256 offerNumber
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

## collection

```solidity
address collection
```

{% hint style="info" %}
The asset token must support interface `IAssetToken`.
{% endhint %}

### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |

