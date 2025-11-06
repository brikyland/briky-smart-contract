# Solidity API

## IProjectTokenReceiver

@author Briky Team

 @notice Interface for contract `ProjectTokenReceiver`.

 @notice A `ProjectTokenReceiver` contract always accepts ERC-1155 income tokens from the `ProjectToken` contract.

### projectToken

```solidity
function projectToken() external view returns (address projectToken)
```

Name            Description
 @return projectToken    `ProjectToken` contract address.

