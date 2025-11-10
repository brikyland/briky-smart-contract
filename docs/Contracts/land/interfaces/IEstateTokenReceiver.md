# Solidity API

## IEstateTokenReceiver

Interface for contract `EstateTokenReceiver`.

A `EstateTokenReceiver` contract always accepts ERC-1155 income tokens from the `EstateToken` contract.

### estateToken

```solidity
function estateToken() external view returns (address estateToken)
```

Name            Description

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| estateToken | address | `EstateToken` contract address. |

