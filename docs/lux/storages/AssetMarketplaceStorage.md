# Solidity API

## AssetMarketplaceStorage

@author Briky Team

 @notice Storage contract for contract `AssetMarketplace`.

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
 @return offerNumber     Number of offers.

### admin

```solidity
address admin
```

Name        Description
 @return admin       `Admin` contract address.

### collection

```solidity
address collection
```

Name        Description
 @return collection  `IAssetToken` contract address.

 @dev    The asset token must support interface `IAssetToken`.

