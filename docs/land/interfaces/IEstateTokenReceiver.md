# Solidity API

## IEstateTokenReceiver

@author Briky Team

 @notice Interface for contract `EstateTokenReceiver`.

 @notice A `EstateTokenReceiver` contract always accepts ERC-1155 income tokens from the `EstateToken` contract.

### estateToken

```solidity
function estateToken() external view returns (address estateToken)
```

Name            Description
 @return estateToken     `EstateToken` contract address.

