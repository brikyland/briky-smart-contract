# Solidity API

## IFund

Interface for struct `Fund`.

_ERC-20 tokens are identified by their contract addresses.
Native coin is represented by the zero address (0x0000000000000000000000000000000000000000)._

### Fund

A package of one or multiple cryptocurrencies to provide and withdraw on demand of provider.

_The fund is determined by a `quantity` value and denominations for each currency.
   Provision or withdrawal operations must specify a `quantity` to indicate equivalent values, calculated by
multiplying with predefined denomination of each currency.
   The fund need to specify a main currency, other extras are optional._

```solidity
struct Fund {
  address mainCurrency;
  uint256 mainDenomination;
  address[] extraCurrencies;
  uint256[] extraDenominations;
  uint256 quantity;
  address provider;
  bool isSufficient;
}
```

