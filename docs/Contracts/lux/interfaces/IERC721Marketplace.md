# Solidity API

## IERC721Marketplace

Interface for contract `ERC721Marketplace`.
An `ERC721Marketplace` contract hosts a marketplace for ERC-721 tokens.

_ERC-20 tokens are identified by their contract addresses.
Native coin is represented by the zero address (0x0000000000000000000000000000000000000000)._

### CollectionRegistration

```solidity
event CollectionRegistration(address collection)
```

Emitted when a collection is registered.

Name        Description

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| collection | address | Registered collection contract address. |

### CollectionDeregistration

```solidity
event CollectionDeregistration(address collection)
```

Emitted when a collection is deregistered.

Name        Description

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| collection | address | Deregistered collection contract address. |

### NewOffer

```solidity
event NewOffer(address collection, uint256 offerId, uint256 tokenId, address seller, uint256 price, uint256 royalty, address royaltyReceiver, address currency)
```

Emitted when a new offer is listed.

Name                Description

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| collection | address | Token collection contract address. |
| offerId | uint256 | Offer identifier. |
| tokenId | uint256 | Token identifier. |
| seller | address | Seller address. |
| price | uint256 | Sale value. |
| royalty | uint256 | Royalty derived from the sale value. |
| royaltyReceiver | address | Royalty receiver address. |
| currency | address | Sale currency address. |

### OfferCancellation

```solidity
event OfferCancellation(uint256 offerId)
```

Emitted when an offer is cancelled.

Name                Description

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| offerId | uint256 | Offer identifier. |

### OfferSale

```solidity
event OfferSale(uint256 offerId, address buyer, address royaltyReceiver, uint256 royalty)
```

Emitted when an offer is sold.

Name                Description

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| offerId | uint256 | Offer identifier. |
| buyer | address | Buyer address. |
| royaltyReceiver | address | Royalty receiver address. |
| royalty | uint256 | Royalty derived from the sale value of the offer. |

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

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| offerNumber | uint256 | Number of offers. |

### getOffer

```solidity
function getOffer(uint256 offerId) external view returns (struct IERC721Offer.ERC721Offer offer)
```

Name            Description

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| offerId | uint256 | Offer identifier. |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| offer | struct IERC721Offer.ERC721Offer | Configuration and progress of the offer. |

### list

```solidity
function list(address collection, uint256 tokenId, uint256 price, address currency) external returns (uint256 offerId)
```

List a new offer of an ERC721 token.

Name        Description

_Approval must be granted for this contract to transfer collateral before borrowing. A mortgage can only be
lent while approval remains active._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| collection | address | Token collection contract address. |
| tokenId | uint256 | Token identifier. |
| price | uint256 | Sale value. |
| currency | address | Sale currency address. |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| offerId | uint256 | New offer identifier. |

### buy

```solidity
function buy(uint256 offerId) external payable returns (uint256 value)
```

Buy an offer.
Buy only if the offer is in `Selling` state.

Name        Description

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| offerId | uint256 | Offer identifier. |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| value | uint256 | Sum of sale price and royalty. |

### cancel

```solidity
function cancel(uint256 offerId) external
```

Cancel an offer.
Cancel only if the offer is in `Selling` state.

Name        Description

_Permission:
- Seller of the offer.
- Managers: disqualify defected offers only._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| offerId | uint256 | Offer identifier. |

### safeBuy

```solidity
function safeBuy(uint256 offerId, uint256 anchor) external payable returns (uint256 value)
```

Buy an offer.
Buy only if the offer is in `Selling` state.

Name        Description

_Anchor enforces consistency between this contract and the client-side._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| offerId | uint256 | Offer identifier. |
| anchor | uint256 | `tokenId` of the offer. |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| value | uint256 | Sum of sale price and royalty. |

