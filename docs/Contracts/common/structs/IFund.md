# IFund

Interface for struct `Fund`.

{% hint style="info" %}
ERC-20 tokens are identified by their contract addresses.
Native coin is represented by the zero address (0x0000000000000000000000000000000000000000).
{% endhint %}

## Fund

A package of one or multiple cryptocurrencies to provide and withdraw on demand of provider.

{% hint style="info" %}
The fund is determined by a `quantity` value and denominations for each currency.

{% endhint %}

{% hint style="info" %}
Provision or withdrawal operations must specify a `quantity` to indicate equivalent values, calculated by
multiplying with predefined denomination of each currency.

{% endhint %}

{% hint style="info" %}
The fund need to specify a main currency, other extras are optional.
{% endhint %}

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

