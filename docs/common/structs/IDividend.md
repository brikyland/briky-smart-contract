# Solidity API

## IDividend

@author Briky Team

 @notice Interface for struct `Dividend`.

 @dev    ERC-20 tokens are identified by their contract addresses.
         Native coin is represented by the zero address (0x0000000000000000000000000000000000000000).

### Dividend

@notice A package of a certain cryptocurrency submitted to distribute among holders of an asset.

```solidity
struct Dividend {
  uint256 tokenId;
  uint256 remainWeight;
  uint256 remainValue;
  address currency;
  uint40 at;
  address governor;
}
```

