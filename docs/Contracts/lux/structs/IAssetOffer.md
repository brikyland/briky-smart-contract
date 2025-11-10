# Solidity API

## IAssetOffer

Interface for struct `AssetOffer`.

_ERC-20 tokens are identified by their contract addresses.
Native coin is represented by the zero address (0x0000000000000000000000000000000000000000)._

### AssetOffer

An offer to sell an amount of `IAssetToken`.

```solidity
struct AssetOffer {
  uint256 tokenId;
  uint256 sellingAmount;
  uint256 soldAmount;
  uint256 unitPrice;
  uint256 royaltyDenomination;
  address currency;
  bool isDivisible;
  enum IOfferState.OfferState state;
  address seller;
  address royaltyReceiver;
}
```

