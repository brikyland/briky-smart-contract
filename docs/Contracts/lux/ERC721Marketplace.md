# Solidity API

## ERC721Marketplace

An `ERC721Marketplace` contract hosts a marketplace for ERC-721 tokens.

_ERC-20 tokens are identified by their contract addresses.
Native coin is represented by the zero address (0x0000000000000000000000000000000000000000)._

### validOffer

```solidity
modifier validOffer(uint256 _offerId)
```

Verify a valid offer identifier.

Name        Description

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _offerId | uint256 | Offer identifier. |

### receive

```solidity
receive() external payable
```

Executed on a call to this contract with empty calldata.

### version

```solidity
function version() external pure returns (string)
```

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | string | Version of implementation. |

### initialize

```solidity
function initialize(address _admin, address _feeReceiver) public virtual
```

Initialize the contract after deployment, serving as the constructor.

Name            Description

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _admin | address | `Admin` contract address. |
| _feeReceiver | address | `FeeReceiver` contract address. |

### registerCollections

```solidity
function registerCollections(address[] _collections, bool _isCollection, bytes[] _signatures) external
```

Register or deregister multiple collections.

Name            Description

_Administrative operator._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _collections | address[] | Array of contract addresses. |
| _isCollection | bool | Whether the operation is registration or deregistration. |
| _signatures | bytes[] | Array of admin signatures. |

### getOffer

```solidity
function getOffer(uint256 _offerId) external view returns (struct IERC721Offer.ERC721Offer)
```

Get an offer.

Name        Description

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _offerId | uint256 | Offer identifier. |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | struct IERC721Offer.ERC721Offer | Configuration and progress of the offer. |

### list

```solidity
function list(address _collection, uint256 _tokenId, uint256 _price, address _currency) external returns (uint256)
```

List a new offer of an ERC721 token.

Name            Description

_The collection must support interface `IERC721Upgradeable`.
   Approval must be granted for this contract to transfer collateral before borrowing. A mortgage can only be
lent while approval remains active._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _collection | address | Token collection contract address. |
| _tokenId | uint256 | Token identifier. |
| _price | uint256 | Sale price. |
| _currency | address | Sale currency address. |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint256 | New offer identifier. |

### buy

```solidity
function buy(uint256 _offerId) external payable returns (uint256)
```

Buy an offer.
Buy only if the offer is in `Selling` state.

Name            Description

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _offerId | uint256 | Offer identifier. |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint256 | Sum of sale price and royalty. |

### cancel

```solidity
function cancel(uint256 _offerId) external
```

Cancel an offer.
Cancel only if the offer is in `Selling` state.

Name            Description

_Permission:
- Seller of the offer.
- Managers: disqualify defected offers only._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _offerId | uint256 | Offer identifier. |

### safeBuy

```solidity
function safeBuy(uint256 _offerId, uint256 _anchor) external payable returns (uint256)
```

Buy an offer.
Buy only if the offer is in `Selling` state.

Name        Description

_Anchor enforces consistency between this contract and the client-side._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _offerId | uint256 | Offer identifier. |
| _anchor | uint256 | `tokenId` of the offer. |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint256 | Sum of sale price and royalty. |

### _buy

```solidity
function _buy(uint256 _offerId) internal returns (uint256)
```

Buy an offer.
Buy only if the offer is in `Selling` state.

Name        Description

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _offerId | uint256 | Offer identifier. |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint256 | Sum of sale price and royalty. |

### _validCollection

```solidity
function _validCollection(address _collection) internal view virtual returns (bool)
```

Name            Description

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _collection | address | Collection contract address. |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | bool | Whether the collection is supported by the marketplace. |

### _validToken

```solidity
function _validToken(address, uint256) internal view virtual returns (bool)
```

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | bool | Whether the token is valid for sale. |

### _chargeRoyalty

```solidity
function _chargeRoyalty(uint256 _offerId) internal virtual
```

Charge royalty on an offer.

Name            Description

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _offerId | uint256 | Offer identifier. |

