# Solidity API

## IValidation

@author Briky Team

 @notice Interface for struct `Validation`.

 @dev    Implementation involves server-side support.

### Validation

@notice Validation information provided from a trusted validator.

```solidity
struct Validation {
  uint256 nonce;
  uint256 expiry;
  bytes signature;
}
```

