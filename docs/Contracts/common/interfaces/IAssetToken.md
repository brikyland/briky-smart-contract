# IAssetToken

Interface for ERC-1155 tokens that securitizes RWAs.

An `IAssetToken` contract securitizes RWAs and represents share holdings in form of a class of ERC-1155 tokens.

{% hint style="info" %}
Each unit of asset tokens is represented in scaled form as `10 ** decimals()`.
{% endhint %}

## decimals

```solidity
function decimals() external view returns (uint8 decimals)
```

### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| decimals | uint8 | Token decimals. |

## totalSupply

```solidity
function totalSupply(uint256 tokenId) external view returns (uint256 totalSupply)
```

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| tokenId | uint256 | Asset identifier. |

### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| totalSupply | uint256 | Total supply of the token class. |

## balanceOfAt

```solidity
function balanceOfAt(address account, uint256 tokenId, uint256 at) external view returns (uint256 balance)
```

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| account | address | EVM address. |
| tokenId | uint256 | Asset identifier. |
| at | uint256 | Reference timestamp. |

### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| balance | uint256 | Balance of the account in the asset at the reference timestamp. |

