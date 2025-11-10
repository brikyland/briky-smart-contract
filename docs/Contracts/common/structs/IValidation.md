# Solidity API

## IValidation

Interface for struct `Validation`.

_Implementation involves server-side support._

### Validation

Validation information provided from a trusted validator.

```solidity
struct Validation {
  uint256 nonce;
  uint256 expiry;
  bytes signature;
}
```

