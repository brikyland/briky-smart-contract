# Solidity API

## IFund

@author Briky Team

 @notice Interface for struct `Fund`.

 @dev    ERC-20 tokens are identified by their contract addresses.
         Native coin is represented by the zero address (0x0000000000000000000000000000000000000000).

### Fund

@notice A package of one or multiple cryptocurrencies to provide and withdraw on demand of provider.
 @dev    The fund is determined by a `quantity` value and denominations for each currency.
 @dev    Provision or withdrawal operations must specify a `quantity` to indicate equivalent values, calculated by
         multiplying with predefined denomination of each currency.
 @dev    The fund need to specify a main currency, other extras are optional.

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

