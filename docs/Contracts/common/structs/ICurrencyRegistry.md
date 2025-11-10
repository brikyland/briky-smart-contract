# Solidity API

## ICurrencyRegistry

Interface for struct `CurrencyRegistry`.

_ERC-20 tokens are identified by their contract addresses.
Native coin is represented by the zero address (0x0000000000000000000000000000000000000000)._

### CurrencyRegistry

Interaction configuration of a cryptocurrency, including both native coin and ERC-20 tokens.

```solidity
struct CurrencyRegistry {
  uint256 minUnitPrice;
  uint256 maxUnitPrice;
  bool isAvailable;
  bool isExclusive;
}
```

