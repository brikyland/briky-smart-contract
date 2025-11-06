# Solidity API

## RoyaltyRateProposer

@author Briky Team

 @notice A `RoyaltyRateProposer` contract is an ERC-2981 contract that always announces royalty payment as a predefined
         fraction of the price, according to a royalty rate on each asset.

### royaltyInfo

```solidity
function royaltyInfo(uint256 _tokenId, uint256 _price) external view returns (address receiver, uint256 royalty)
```

Name        Description
 @param  _tokenId    Token identifier.
 @param  _price      Reference value.
 @return receiver    Royalty receiver address.
 @return royalty     Royalty derived from the reference value.

### _royaltyReceiver

```solidity
function _royaltyReceiver() internal view virtual returns (address royaltyReceiver)
```

Name                Description
 @return royaltyReceiver     Default royalty receiver address.

