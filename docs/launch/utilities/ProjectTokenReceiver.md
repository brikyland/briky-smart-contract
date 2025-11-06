# Solidity API

## ProjectTokenReceiver

@author Briky Team

 @notice A `ProjectTokenReceiver` contract always accepts ERC-1155 income tokens from the `ProjectToken` contract.

### onERC1155Received

```solidity
function onERC1155Received(address, address, uint256, uint256, bytes) public virtual returns (bytes4)
```

@return Selector of the `onERC1155Received` function if the message sender is the project token contract.

### onERC1155BatchReceived

```solidity
function onERC1155BatchReceived(address, address, uint256[], uint256[], bytes) public virtual returns (bytes4)
```

@return Selector of the `onERC1155Received` function if the message sender is the project token contract.

