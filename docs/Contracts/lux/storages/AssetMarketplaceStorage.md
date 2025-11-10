# Solidity API

## AssetMarketplaceStorage

Storage contract for contract `AssetMarketplace`.

### offers

```solidity
mapping(uint256 => struct IAssetOffer.AssetOffer) offers
```

_offers[offerId]_

### offerNumber

```solidity
uint256 offerNumber
```

Name            Description

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |

### admin

```solidity
address admin
```

Name        Description

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |

### collection

```solidity
address collection
```

Name        Description

_The asset token must support interface `IAssetToken`._

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |

