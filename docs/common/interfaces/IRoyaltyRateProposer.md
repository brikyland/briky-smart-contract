# Solidity API

## IRoyaltyRateProposer

@author Briky Team

 @notice Interface for contract `RoyaltyRateProposer`.
 @notice A `RoyaltyRateProposer` contract is an ERC-2981 contract that always announces royalty payment as a predefined
         fraction of the price, according to a royalty rate on each token identifier.

### getRoyaltyRate

```solidity
function getRoyaltyRate(uint256 tokenId) external view returns (struct IRate.Rate rate)
```

Name        Description
 @param  tokenId     Token identifier.
 @return rate        Royalty rate of the token identifier.

