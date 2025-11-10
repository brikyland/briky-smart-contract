# AssetMarketplace

An `AssetMarketplace` contract hosts a marketplace for a specific `IAssetToken`.

{% hint style="info" %}
Each unit of asset token is represented in scaled form as `10 ** IAssetToken(collection).decimals()` following the
convention of `IAssetToken`.

{% endhint %}

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

## __AssetMarketplace_init

```solidity
function __AssetMarketplace_init(address _admin, address _collection) internal
```

Initialize "AssetMarketplace".

{% hint style="info" %}
The asset token must support interface `IAssetToken`.
{% endhint %}

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _admin | address | `Admin` contract address. |
| _collection | address | `IAssetToken` contract address. |

## getOffer

```solidity
function getOffer(uint256 _offerId) external view returns (struct IAssetOffer.AssetOffer)
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
function list(uint256 _tokenId, uint256 _sellingAmount, uint256 _unitPrice, address _currency, bool _isDivisible) external returns (uint256)
```

List a new offer of asset tokens.

{% hint style="info" %}
Approval must be granted for this contract to transfer asset tokens before listing. An offer can only be
sold while approval remains active.
{% endhint %}

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _tokenId | uint256 | Asset identifier. |
| _sellingAmount | uint256 | Selling amount. |
| _unitPrice | uint256 | Sale value of each token unit. |
| _currency | address | Sale currency address. |
| _isDivisible | bool | Whether the offer can be sold partially. |

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

## buy

```solidity
function buy(uint256 _offerId, uint256 _amount) external payable returns (uint256)
```

Buy a part of the offer.

Buy only if the offer is in `Selling` state.

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _offerId | uint256 | Offer identifier. |
| _amount | uint256 | Amount of tokens to buy. |

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
function safeBuy(uint256 _offerId, bytes32 _anchor) external payable returns (uint256)
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
| _anchor | bytes32 | Keccak256 hash of token amount, `tokenId` and `unitPrice` of the offer. |

### Return Values

Sum of sale price and royalty.

## safeBuy

```solidity
function safeBuy(uint256 _offerId, uint256 _amount, bytes32 _anchor) external payable returns (uint256)
```

Buy a part of the offer.

Buy only if the offer is in `Selling` state.

{% hint style="info" %}
Anchor enforces consistency between this contract and the client-side.
{% endhint %}

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _offerId | uint256 | Offer identifier. |
| _amount | uint256 | Token amount. |
| _anchor | bytes32 | Keccak256 hash of token amount, `tokenId` and `unitPrice` of the offer. |

### Return Values

Sum of sale price and royalty.

## _buy

```solidity
function _buy(uint256 _offerId, uint256 _amount) internal returns (uint256)
```

Buy an offer.

Buy only if the offer is in `Selling` state.

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _offerId | uint256 | Offer identifier. |
| _amount | uint256 | Amount of tokens to be bought. |

### Return Values

Sum of sale price and royalty.

## _chargeRoyalty

```solidity
function _chargeRoyalty(uint256 _offerId, uint256 _royalty) internal virtual
```

Charge royalty on an offer.

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _offerId | uint256 | Offer identifier. |
| _royalty | uint256 | Charged royalty. |

