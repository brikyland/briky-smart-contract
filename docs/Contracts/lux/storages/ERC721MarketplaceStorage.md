# Solidity API

## ERC721MarketplaceStorage

Storage contract for contract `ERC721Marketplace`.

### offers

```solidity
mapping(uint256 => struct IERC721Offer.ERC721Offer) offers
```

_offers[offerId]_

### isCollection

```solidity
mapping(address => bool) isCollection
```

_isCollection[collection]_

### admin

```solidity
address admin
```

Name        Description

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |

### feeReceiver

```solidity
address feeReceiver
```

### offerNumber

```solidity
uint256 offerNumber
```

Name            Description

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |

