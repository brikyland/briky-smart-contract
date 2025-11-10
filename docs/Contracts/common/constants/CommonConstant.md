# Solidity API

## CommonConstant

Constant library for common usage.

### INFINITE_TIMESTAMP

```solidity
uint40 INFINITE_TIMESTAMP
```

Most timestamps in contracts are of type `uint40` so the maximum value of `uint40` is conventionally defined as
the infinite timestamp.

### RATE_DECIMALS

```solidity
uint8 RATE_DECIMALS
```

Rate denominator is `10 ** RATE_DECIMALS`.

### RATE_MAX_SUBUNIT

```solidity
uint256 RATE_MAX_SUBUNIT
```

A rate representing a fraction of an arbitrary value cannot exceed 1.0.

