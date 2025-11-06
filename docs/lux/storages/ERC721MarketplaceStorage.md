# Solidity API

## ERC721MarketplaceStorage

@author Briky Team

 @notice Storage contract for contract `ERC721Marketplace`.

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
 @return admin       `Admin` contract address.

### feeReceiver

```solidity
address feeReceiver
```

### offerNumber

```solidity
uint256 offerNumber
```

Name            Description
 @return offerNumber     Number of offers.

