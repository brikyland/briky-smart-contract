# IERC721Offer

Interface for struct `ERC721Offer`.

{% hint style="info" %}
ERC-20 tokens are identified by their contract addresses.
Native coin is represented by the zero address (0x0000000000000000000000000000000000000000).
{% endhint %}

## ERC721Offer

An offer to sell an ERC-721 token.

```solidity
struct ERC721Offer {
  address collection;
  uint256 tokenId;
  uint256 price;
  uint256 royalty;
  address currency;
  enum IOfferState.OfferState state;
  address seller;
  address royaltyReceiver;
}
```

