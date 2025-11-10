# Solidity API

## ProjectMarketplace

The `ProjectMarketplace` contract hosts a marketplace for project tokens.

_Each unit of asset token is represented in scaled form as `10 ** IAssetToken(collection).decimals()` following the
convention of interface `IAssetToken`.
   ERC-20 tokens are identified by their contract addresses.
Native coin is represented by the zero address (0x0000000000000000000000000000000000000000)._

### initialize

```solidity
function initialize(address _admin, address _projectToken) external
```

Initialize the contract after deployment, serving as the constructor.

Name            Description

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _admin | address | `Admin` contract address. |
| _projectToken | address | `ProjectToken` contract address. |

