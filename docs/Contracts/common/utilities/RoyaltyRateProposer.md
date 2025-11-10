# RoyaltyRateProposer

A `RoyaltyRateProposer` contract is an ERC-2981 contract that always announces royalty payment as a predefined
fraction of the price, according to a royalty rate on each asset.

## royaltyInfo

```solidity
function royaltyInfo(uint256 _tokenId, uint256 _price) external view returns (address receiver, uint256 royalty)
```

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _tokenId | uint256 | Token identifier. |
| _price | uint256 | Reference value. |

### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| receiver | address | Royalty receiver address. |
| royalty | uint256 | Royalty derived from the reference value. |

## _royaltyReceiver

```solidity
function _royaltyReceiver() internal view virtual returns (address royaltyReceiver)
```

### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| royaltyReceiver | address | Default royalty receiver address. |

