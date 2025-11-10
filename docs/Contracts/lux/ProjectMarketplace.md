# ProjectMarketplace

The `ProjectMarketplace` contract hosts a marketplace for project tokens.

{% hint style="info" %}
Each unit of asset token is represented in scaled form as `10 ** IAssetToken(collection).decimals()` following the
convention of interface `IAssetToken`.

{% endhint %}

{% hint style="info" %}
ERC-20 tokens are identified by their contract addresses.
Native coin is represented by the zero address (0x0000000000000000000000000000000000000000).
{% endhint %}

## initialize

```solidity
function initialize(address _admin, address _projectToken) external
```

Initialize the contract after deployment, serving as the constructor.

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _admin | address | `Admin` contract address. |
| _projectToken | address | `ProjectToken` contract address. |

