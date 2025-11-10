# Solidity API

## IRate

Interface for struct `Rate`.

### InvalidRate

```solidity
error InvalidRate()
```

===== ERROR ===== *

### Rate

Representation of an unsigned rational rate.

```solidity
struct Rate {
  uint256 value;
  uint8 decimals;
}
```

