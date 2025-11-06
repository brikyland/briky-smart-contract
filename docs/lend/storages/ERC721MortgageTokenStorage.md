# Solidity API

## ERC721MortgageTokenStorage

@author Briky Team

 @notice Storage contract for contract `ERC721MortgageToken`.

### collaterals

```solidity
mapping(uint256 => struct IERC721Collateral.ERC721Collateral) collaterals
```

_collaterals[mortgageId]_

### isCollateral

```solidity
mapping(address => bool) isCollateral
```

_isCollateral[collection]_

