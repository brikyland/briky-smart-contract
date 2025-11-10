# ERC721MarketplaceStorage

Storage contract for contract `ERC721Marketplace`.

## offers

```solidity
mapping(uint256 => struct IERC721Offer.ERC721Offer) offers
```

{% hint style="info" %}
offers[offerId]
{% endhint %}

## isCollection

```solidity
mapping(address => bool) isCollection
```

{% hint style="info" %}
isCollection[collection]
{% endhint %}

## admin

```solidity
address admin
```

### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |

## feeReceiver

```solidity
address feeReceiver
```

## offerNumber

```solidity
uint256 offerNumber
```

### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |

