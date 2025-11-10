# IDividend

Interface for struct `Dividend`.

{% hint style="info" %}
ERC-20 tokens are identified by their contract addresses.
Native coin is represented by the zero address (0x0000000000000000000000000000000000000000).
{% endhint %}

## Dividend

A package of a certain cryptocurrency submitted to distribute among holders of an asset.

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

