# Solidity API

## IMockCommon

### OfferState

```solidity
enum OfferState {
  Nil,
  Selling,
  Sold,
  Cancelled
}
```

### NewOffer

```solidity
event NewOffer(uint256 offerId, uint256 tokenId, address seller, uint256 sellingAmount, uint256 unitPrice, address currency, bool isDivisible)
```

