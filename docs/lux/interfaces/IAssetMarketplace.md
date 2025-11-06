# Solidity API

## IAssetMarketplace

@author Briky Team

 @notice Interface for contract `AssetMarketplace`.
 @notice An `AssetMarketplace` contract hosts a marketplace for a specific `IAssetToken`.

 @dev    Each unit of asset token is represented in scaled form as `10 ** IAssetToken(collection).decimals()` following the
         convention of `IAssetToken`.
 @dev    ERC-20 tokens are identified by their contract addresses.
         Native coin is represented by the zero address (0x0000000000000000000000000000000000000000).

### NewOffer

```solidity
event NewOffer(uint256 offerId, uint256 tokenId, address seller, uint256 sellingAmount, uint256 unitPrice, address currency, bool isDivisible, uint256 royaltyDenomination, address royaltyReceiver)
```

@notice Emitted when a new offer is listed.

         Name                    Description
 @param  offerId                 Offer identifier.
 @param  tokenId                 Asset identifier.
 @param  seller                  Seller address.
 @param  sellingAmount           Selling amount.
 @param  unitPrice               Sale value of each token unit.
 @param  currency                Sale currency address.
 @param  isDivisible             Whether the offer can be bought partially.
 @param  royaltyDenomination     Royalty charged on each token.
 @param  royaltyReceiver         Royalty receiver address.

### OfferCancellation

```solidity
event OfferCancellation(uint256 offerId)
```

@notice Emitted when an offer is cancelled.

         Name                Description
 @param  offerId             Offer identifier.

### OfferSale

```solidity
event OfferSale(uint256 offerId, address buyer, uint256 amount, uint256 value, uint256 royalty, address royaltyReceiver)
```

@notice Emitted when an offer is sold, partially or fully.

         Name                Description
 @param  offerId             Offer identifier.
 @param  buyer               Buyer address.
 @param  amount              Sale amount.
 @param  value               Sale value.
 @param  royalty             Royalty derived from the sale value.
 @param  royaltyReceiver     Royalty receiver address.

### InvalidAmount

```solidity
error InvalidAmount()
```

===== ERROR ===== *

### InvalidBuying

```solidity
error InvalidBuying()
```

### InvalidCancelling

```solidity
error InvalidCancelling()
```

### InvalidTokenId

```solidity
error InvalidTokenId()
```

### InvalidOfferId

```solidity
error InvalidOfferId()
```

### InvalidSellingAmount

```solidity
error InvalidSellingAmount()
```

### InvalidUnitPrice

```solidity
error InvalidUnitPrice()
```

### NotDivisible

```solidity
error NotDivisible()
```

### NotEnoughTokensToSell

```solidity
error NotEnoughTokensToSell()
```

### collection

```solidity
function collection() external view returns (address collection)
```

Name        Description
 @return collection  `IAssetToken` contract address.

 @dev    The asset token must support interface `IAssetToken`.

### offerNumber

```solidity
function offerNumber() external view returns (uint256 offerNumber)
```

Name            Description
 @return offerNumber     Number of offers.

### getOffer

```solidity
function getOffer(uint256 offerId) external view returns (struct IAssetOffer.AssetOffer offer)
```

Name            Description
 @param  offerId         Offer identifier.
 @return offer           Configuration and progress of the offer.

### list

```solidity
function list(uint256 tokenId, uint256 sellingAmount, uint256 unitPrice, address currency, bool isDivisible) external returns (uint256 offerId)
```

@notice List a new offer of asset tokens.

         Name             Description
 @param  tokenId          Asset identifier.
 @param  sellingAmount    Selling amount.
 @param  unitPrice        Sale value of each token unit.
 @param  currency         Sale currency address.
 @param  isDivisible      Whether the offer can be sold partially.
 @return offerId          New offer identifier.

 @dev    Approval must be granted for this contract to transfer asset tokens before listing. An offer can only be
         sold while approval remains active.

### buy

```solidity
function buy(uint256 offerId) external payable returns (uint256 value)
```

@notice Buy an offer.
 @notice Buy only if the offer is in `Selling` state.

         Name            Description
 @param  offerId         Offer identifier.
 @return value           Sum of sale price and royalty.

### buy

```solidity
function buy(uint256 offerId, uint256 amount) external payable returns (uint256 value)
```

@notice Buy a part of the offer.
 @notice Buy only if the offer is in `Selling` state.

         Name            Description
 @param  offerId         Offer identifier.
 @param  amount          Amount of tokens to be bought.
 @return value           Sum of sale price and royalty.

### cancel

```solidity
function cancel(uint256 offerId) external
```

@notice Cancel an offer.
 @notice Cancel only if the offer is in `Selling` state.
 
         Name            Description
 @param  offerId         Offer identifier.

 @dev    Permission:
         - Seller of the offer.
         - Managers: disqualify defected offers only.

### safeBuy

```solidity
function safeBuy(uint256 offerId, bytes32 anchor) external payable returns (uint256 value)
```

@notice Buy an offer.
 @notice Buy only if the offer is in `Selling` state.

         Name        Description
 @param  offerId     Offer identifier.
 @param  anchor      `tokenId` of the offer.
 @return value       Sum of sale price and royalty.

 @dev    Anchor enforces consistency between this contract and the client-side.

### safeBuy

```solidity
function safeBuy(uint256 offerId, uint256 amount, bytes32 anchor) external payable returns (uint256 value)
```

@notice Buy a part of the offer.
 @notice Buy only if the offer is in `Selling` state.

         Name        Description
 @param  offerId     Offer identifier.
 @param  amount      Amount of tokens to be bought.
 @param  anchor      `tokenId` of the offer.
 @return value       Sum of sale price and royalty.

 @dev    Anchor enforces consistency between this contract and the client-side.

