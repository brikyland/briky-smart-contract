# Solidity API

## EstateTokenReceiver

A `EstateTokenReceiver` contract accepts ERC-1155 income tokens from the `EstateToken` contract.

### onERC1155Received

```solidity
function onERC1155Received(address, address, uint256, uint256, bytes) public virtual returns (bytes4)
```

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | bytes4 | Selector of the `onERC1155Received` function if the message sender is the estate token contract. |

### onERC1155BatchReceived

```solidity
function onERC1155BatchReceived(address, address, uint256[], uint256[], bytes) public virtual returns (bytes4)
```

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | bytes4 | Selector of the `onERC1155Received` function if the message sender is the estate token contract. |

