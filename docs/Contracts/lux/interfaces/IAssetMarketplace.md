# IAssetMarketplace

Interface for contract `AssetMarketplace`.

An `AssetMarketplace` contract hosts a marketplace for a specific `IAssetToken`.

{% hint style="info" %}
Each unit of asset token is represented in scaled form as `10 ** IAssetToken(collection).decimals()` following the
convention of `IAssetToken`.

{% endhint %}

{% hint style="info" %}
ERC-20 tokens are identified by their contract addresses.
Native coin is represented by the zero address (0x0000000000000000000000000000000000000000).
{% endhint %}

## NewOffer

```solidity
event NewOffer(uint256 offerId, uint256 tokenId, address seller, uint256 sellingAmount, uint256 unitPrice, address currency, bool isDivisible, uint256 royaltyDenomination, address royaltyReceiver)
```

Emitted when a new offer is listed.

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| offerId | uint256 | Offer identifier. |
| tokenId | uint256 | Asset identifier. |
| seller | address | Seller address. |
| sellingAmount | uint256 | Selling amount. |
| unitPrice | uint256 | Sale value of each token unit. |
| currency | address | Sale currency address. |
| isDivisible | bool | Whether the offer can be bought partially. |
| royaltyDenomination | uint256 | Royalty charged on each token. |
| royaltyReceiver | address | Royalty receiver address. |

## OfferCancellation

```solidity
event OfferCancellation(uint256 offerId)
```

Emitted when an offer is cancelled.

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| offerId | uint256 | Offer identifier. |

## OfferSale

```solidity
event OfferSale(uint256 offerId, address buyer, uint256 amount, uint256 value, uint256 royalty, address royaltyReceiver)
```

Emitted when an offer is sold, partially or fully.

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| offerId | uint256 | Offer identifier. |
| buyer | address | Buyer address. |
| amount | uint256 | Sale amount. |
| value | uint256 | Sale value. |
| royalty | uint256 | Royalty derived from the sale value. |
| royaltyReceiver | address | Royalty receiver address. |

## InvalidAmount

```solidity
error InvalidAmount()
```

===== ERROR ===== *

## InvalidBuying

```solidity
error InvalidBuying()
```

## InvalidCancelling

```solidity
error InvalidCancelling()
```

## InvalidTokenId

```solidity
error InvalidTokenId()
```

## InvalidOfferId

```solidity
error InvalidOfferId()
```

## InvalidSellingAmount

```solidity
error InvalidSellingAmount()
```

## InvalidUnitPrice

```solidity
error InvalidUnitPrice()
```

## NotDivisible

```solidity
error NotDivisible()
```

## NotEnoughTokensToSell

```solidity
error NotEnoughTokensToSell()
```

## collection

```solidity
function collection() external view returns (address collection)
```

{% hint style="info" %}
The asset token must support interface `IAssetToken`.
{% endhint %}

### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| collection | address | `IAssetToken` contract address. |

## offerNumber

```solidity
function offerNumber() external view returns (uint256 offerNumber)
```

### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| offerNumber | uint256 | Number of offers. |

## getOffer

```solidity
function getOffer(uint256 offerId) external view returns (struct IAssetOffer.AssetOffer offer)
```

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| offerId | uint256 | Offer identifier. |

### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| offer | struct IAssetOffer.AssetOffer | Configuration and progress of the offer. |

## list

```solidity
function list(uint256 tokenId, uint256 sellingAmount, uint256 unitPrice, address currency, bool isDivisible) external returns (uint256 offerId)
```

List a new offer of asset tokens.

{% hint style="info" %}
Approval must be granted for this contract to transfer asset tokens before listing. An offer can only be
sold while approval remains active.
{% endhint %}

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| tokenId | uint256 | Asset identifier. |
| sellingAmount | uint256 | Selling amount. |
| unitPrice | uint256 | Sale value of each token unit. |
| currency | address | Sale currency address. |
| isDivisible | bool | Whether the offer can be sold partially. |

### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| offerId | uint256 | New offer identifier. |

## buy

```solidity
function buy(uint256 offerId) external payable returns (uint256 value)
```

Buy an offer.

Buy only if the offer is in `Selling` state.

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| offerId | uint256 | Offer identifier. |

### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| value | uint256 | Sum of sale price and royalty. |

## buy

```solidity
function buy(uint256 offerId, uint256 amount) external payable returns (uint256 value)
```

Buy a part of the offer.

Buy only if the offer is in `Selling` state.

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| offerId | uint256 | Offer identifier. |
| amount | uint256 | Amount of tokens to be bought. |

### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| value | uint256 | Sum of sale price and royalty. |

## cancel

```solidity
function cancel(uint256 offerId) external
```

Cancel an offer.

Cancel only if the offer is in `Selling` state.

{% hint style="info" %}
Permission:
- Seller of the offer.
- Managers: disqualify defected offers only.
{% endhint %}

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| offerId | uint256 | Offer identifier. |

## safeBuy

```solidity
function safeBuy(uint256 offerId, bytes32 anchor) external payable returns (uint256 value)
```

Buy an offer.

Buy only if the offer is in `Selling` state.

{% hint style="info" %}
Anchor enforces consistency between this contract and the client-side.
{% endhint %}

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| offerId | uint256 | Offer identifier. |
| anchor | bytes32 | `tokenId` of the offer. |

### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| value | uint256 | Sum of sale price and royalty. |

## safeBuy

```solidity
function safeBuy(uint256 offerId, uint256 amount, bytes32 anchor) external payable returns (uint256 value)
```

Buy a part of the offer.

Buy only if the offer is in `Selling` state.

{% hint style="info" %}
Anchor enforces consistency between this contract and the client-side.
{% endhint %}

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| offerId | uint256 | Offer identifier. |
| amount | uint256 | Amount of tokens to be bought. |
| anchor | bytes32 | `tokenId` of the offer. |

### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| value | uint256 | Sum of sale price and royalty. |

