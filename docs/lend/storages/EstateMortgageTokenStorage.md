# Solidity API

## EstateMortgageTokenStorage

@author Briky Team

 @notice Storage contract for contract `EstateMortgageToken`.

### collaterals

```solidity
mapping(uint256 => struct IAssetCollateral.AssetCollateral) collaterals
```

_collaterals[mortgageId]_

### estateToken

```solidity
address estateToken
```

Name            Description
 @return estateToken     `EstateToken` contract address.

