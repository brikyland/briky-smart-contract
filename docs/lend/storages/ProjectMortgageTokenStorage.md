# Solidity API

## ProjectMortgageTokenStorage

@author Briky Team

 @notice Storage contract for contract `ProjectMortgageToken`.

### collaterals

```solidity
mapping(uint256 => struct IAssetCollateral.AssetCollateral) collaterals
```

_collaterals[mortgageId]_

### projectToken

```solidity
address projectToken
```

Name            Description
 @return projectToken    `ProjectToken` contract address.

