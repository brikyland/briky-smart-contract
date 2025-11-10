# Solidity API

## MortgageMarketplace

The `MortgageMarketplace` contract hosts a marketplace for mortgage tokens.

### _validCollection

```solidity
function _validCollection(address _collection) internal view returns (bool)
```

Name            Description

_The collection must support interface `IMortgageToken`._

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
function _validToken(address _collection, uint256 _tokenId) internal view returns (bool)
```

Name            Description

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _collection | address | Collection contract address. |
| _tokenId | uint256 | Token identifier. |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | bool | Whether the mortgage token is valid for sale. |

