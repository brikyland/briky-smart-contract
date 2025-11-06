# Solidity API

## MortgageMarketplace

@author Briky Team

 @notice The `MortgageMarketplace` contract hosts a marketplace for mortgage tokens.

### _validCollection

```solidity
function _validCollection(address _collection) internal view returns (bool)
```

Name            Description
 @param  _collection     Collection contract address.

 @return Whether the collection is supported by the marketplace.

 @dev    The collection must support interface `IMortgageToken`.

### _validToken

```solidity
function _validToken(address _collection, uint256 _tokenId) internal view returns (bool)
```

Name            Description
 @param  _collection     Collection contract address.
 @param  _tokenId        Token identifier.

 @return Whether the mortgage token is valid for sale.

