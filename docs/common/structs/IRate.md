# Solidity API

## IRate

@author Briky Team

 @notice Interface for struct `Rate`.

### InvalidRate

```solidity
error InvalidRate()
```

===== ERROR ===== *

### Rate

@notice Representation of an unsigned rational rate.

```solidity
struct Rate {
  uint256 value;
  uint8 decimals;
}
```

