# ERC721Marketplace

An `ERC721Marketplace` contract hosts a marketplace for ERC-721 tokens.

{% hint style="info" %}
ERC-20 tokens are identified by their contract addresses.
Native coin is represented by the zero address (0x0000000000000000000000000000000000000000).
{% endhint %}

## validOffer

```solidity
modifier validOffer(uint256 _offerId)
```

Verify a valid offer identifier.

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _offerId | uint256 | Offer identifier. |

## receive

```solidity
receive() external payable
```

Executed on a call to this contract with empty calldata.

## version

```solidity
function version() external pure returns (string)
```

### Return Values

Version of implementation.

## initialize

```solidity
function initialize(address _admin, address _feeReceiver) public virtual
```

Initialize the contract after deployment, serving as the constructor.

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _admin | address | `Admin` contract address. |
| _feeReceiver | address | `FeeReceiver` contract address. |

## registerCollections

```solidity
function registerCollections(address[] _collections, bool _isCollection, bytes[] _signatures) external
```

Register or deregister multiple collections.

{% hint style="info" %}
Administrative operator.
{% endhint %}

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _collections | address[] | Array of contract addresses. |
| _isCollection | bool | Whether the operation is registration or deregistration. |
| _signatures | bytes[] | Array of admin signatures. |

## getOffer

```solidity
function getOffer(uint256 _offerId) external view returns (struct IERC721Offer.ERC721Offer)
```

Get an offer.

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _offerId | uint256 | Offer identifier. |

### Return Values

Configuration and progress of the offer.

## list

```solidity
function list(address _collection, uint256 _tokenId, uint256 _price, address _currency) external returns (uint256)
```

List a new offer of an ERC721 token.

{% hint style="info" %}
The collection must support interface `IERC721Upgradeable`.

{% endhint %}

{% hint style="info" %}
Approval must be granted for this contract to transfer collateral before borrowing. A mortgage can only be
lent while approval remains active.
{% endhint %}

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _collection | address | Token collection contract address. |
| _tokenId | uint256 | Token identifier. |
| _price | uint256 | Sale price. |
| _currency | address | Sale currency address. |

### Return Values

New offer identifier.

## buy

```solidity
function buy(uint256 _offerId) external payable returns (uint256)
```

Buy an offer.

Buy only if the offer is in `Selling` state.

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _offerId | uint256 | Offer identifier. |

### Return Values

Sum of sale price and royalty.

## cancel

```solidity
function cancel(uint256 _offerId) external
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
| _offerId | uint256 | Offer identifier. |

## safeBuy

```solidity
function safeBuy(uint256 _offerId, uint256 _anchor) external payable returns (uint256)
```

Buy an offer.

Buy only if the offer is in `Selling` state.

{% hint style="info" %}
Anchor enforces consistency between this contract and the client-side.
{% endhint %}

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _offerId | uint256 | Offer identifier. |
| _anchor | uint256 | `tokenId` of the offer. |

### Return Values

Sum of sale price and royalty.

## _buy

```solidity
function _buy(uint256 _offerId) internal returns (uint256)
```

Buy an offer.

Buy only if the offer is in `Selling` state.

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _offerId | uint256 | Offer identifier. |

### Return Values

Sum of sale price and royalty.

## _validCollection

```solidity
function _validCollection(address _collection) internal view virtual returns (bool)
```

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _collection | address | Collection contract address. |

### Return Values

Whether the collection is supported by the marketplace.

## _validToken

```solidity
function _validToken(address, uint256) internal view virtual returns (bool)
```

### Return Values

Whether the token is valid for sale.

## _chargeRoyalty

```solidity
function _chargeRoyalty(uint256 _offerId) internal virtual
```

Charge royalty on an offer.

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _offerId | uint256 | Offer identifier. |

