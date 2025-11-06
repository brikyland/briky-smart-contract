# Solidity API

## IERC721Marketplace

@author Briky Team

 @notice Interface for contract `ERC721Marketplace`.
 @notice An `ERC721Marketplace` contract hosts a marketplace for ERC-721 tokens.

 @dev    ERC-20 tokens are identified by their contract addresses.
         Native coin is represented by the zero address (0x0000000000000000000000000000000000000000).

### CollectionRegistration

```solidity
event CollectionRegistration(address collection)
```

@notice Emitted when a collection is registered.

         Name        Description
 @param  collection  Registered collection contract address.

### CollectionDeregistration

```solidity
event CollectionDeregistration(address collection)
```

@notice Emitted when a collection is deregistered.

         Name        Description
 @param  collection  Deregistered collection contract address.

### NewOffer

```solidity
event NewOffer(address collection, uint256 offerId, uint256 tokenId, address seller, uint256 price, uint256 royalty, address royaltyReceiver, address currency)
```

@notice Emitted when a new offer is listed.

         Name                Description
 @param  collection          Token collection contract address.
 @param  offerId             Offer identifier.
 @param  tokenId             Token identifier.
 @param  seller              Seller address.
 @param  price               Sale value.
 @param  royalty             Royalty derived from the sale value.
 @param  royaltyReceiver     Royalty receiver address.
 @param  currency            Sale currency address.

### OfferCancellation

```solidity
event OfferCancellation(uint256 offerId)
```

@notice Emitted when an offer is cancelled.

         Name                Description
 @param  offerId             Offer identifier.

### OfferSale

```solidity
event OfferSale(uint256 offerId, address buyer, address royaltyReceiver, uint256 royalty)
```

@notice Emitted when an offer is sold.

         Name                Description
 @param  offerId         Offer identifier.
 @param  buyer               Buyer address.
 @param  royaltyReceiver     Royalty receiver address.
 @param  royalty             Royalty derived from the sale value of the offer.

### InvalidBuying

```solidity
error InvalidBuying()
```

===== ERROR ===== *

### InvalidCancelling

```solidity
error InvalidCancelling()
```

### InvalidCollection

```solidity
error InvalidCollection()
```

### InvalidTokenId

```solidity
error InvalidTokenId()
```

### InvalidOfferId

```solidity
error InvalidOfferId()
```

### InvalidPrice

```solidity
error InvalidPrice()
```

### NotRegisteredCollection

```solidity
error NotRegisteredCollection()
```

### RegisteredCollection

```solidity
error RegisteredCollection()
```

### offerNumber

```solidity
function offerNumber() external view returns (uint256 offerNumber)
```

Name            Description
 @return offerNumber     Number of offers.

### getOffer

```solidity
function getOffer(uint256 offerId) external view returns (struct IERC721Offer.ERC721Offer offer)
```

Name            Description
 @param  offerId         Offer identifier.
 @return offer           Configuration and progress of the offer.

### list

```solidity
function list(address collection, uint256 tokenId, uint256 price, address currency) external returns (uint256 offerId)
```

@notice List a new offer of an ERC721 token.

         Name        Description
 @param  collection  Token collection contract address.
 @param  tokenId     Token identifier.
 @param  price       Sale value.
 @param  currency    Sale currency address.
 @return offerId     New offer identifier.

 @dev    Approval must be granted for this contract to transfer collateral before borrowing. A mortgage can only be
         lent while approval remains active.

### buy

```solidity
function buy(uint256 offerId) external payable returns (uint256 value)
```

@notice Buy an offer.
 @notice Buy only if the offer is in `Selling` state.

         Name        Description
 @param  offerId     Offer identifier.
 @return value       Sum of sale price and royalty.

### cancel

```solidity
function cancel(uint256 offerId) external
```

@notice Cancel an offer.
 @notice Cancel only if the offer is in `Selling` state.

         Name        Description
 @param  offerId     Offer identifier.

 @dev    Permission:
         - Seller of the offer.
         - Managers: disqualify defected offers only.

### safeBuy

```solidity
function safeBuy(uint256 offerId, uint256 anchor) external payable returns (uint256 value)
```

@notice Buy an offer.
 @notice Buy only if the offer is in `Selling` state.

         Name        Description
 @param  offerId     Offer identifier.
 @param  anchor      `tokenId` of the offer.
 @return value       Sum of sale price and royalty.

 @dev    Anchor enforces consistency between this contract and the client-side.

