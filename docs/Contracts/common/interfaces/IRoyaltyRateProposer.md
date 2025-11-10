# Solidity API

## IRoyaltyRateProposer

Interface for contract `RoyaltyRateProposer`.
A `RoyaltyRateProposer` contract is an ERC-2981 contract that always announces royalty payment as a predefined
fraction of the price, according to a royalty rate on each token identifier.

### getRoyaltyRate

```solidity
function getRoyaltyRate(uint256 tokenId) external view returns (struct IRate.Rate rate)
```

Name        Description

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| tokenId | uint256 | Token identifier. |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| rate | struct IRate.Rate | Royalty rate of the token identifier. |

