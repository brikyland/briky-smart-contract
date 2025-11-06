# Solidity API

## IAssetToken

@author Briky Team

 @notice Interface for ERC-1155 tokens that securitizes RWAs.
 @notice An `IAssetToken` contract securitizes RWAs and represents share holdings in form of a class of ERC-1155 tokens.

 @dev    Each unit of asset tokens is represented in scaled form as `10 ** decimals()`.

### decimals

```solidity
function decimals() external view returns (uint8 decimals)
```

Name            Description
 @return decimals        Token decimals.

### totalSupply

```solidity
function totalSupply(uint256 tokenId) external view returns (uint256 totalSupply)
```

Name            Description
 @param  tokenId         Asset identifier.
 @return totalSupply     Total supply of the token class.

### balanceOfAt

```solidity
function balanceOfAt(address account, uint256 tokenId, uint256 at) external view returns (uint256 balance)
```

Name            Description
 @param  account         EVM address.
 @param  tokenId         Asset identifier.
 @param  at              Reference timestamp.
 @return balance         Balance of the account in the asset at the reference timestamp.

