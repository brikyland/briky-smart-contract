# Solidity API

## IValidatable

@author Briky Team

 @notice Interface for contract `Validatable`.
 @notice A `Validatable` contract relies on a trusted validator to verify data that is difficult to process on-chain.

 @dev    Implementation involves server-side support.

### ValidatorUpdate

```solidity
event ValidatorUpdate(address newAddress)
```

@notice Emitted when the validator is updated.

         Name        Description
 @param  newAddress  New validator address.

### ValidationExpired

```solidity
error ValidationExpired()
```

===== ERROR ===== *

### InvalidNonce

```solidity
error InvalidNonce()
```

### InvalidSignature

```solidity
error InvalidSignature()
```

### validator

```solidity
function validator() external view returns (address validator)
```

Name        Description
 @return validator   Validator address.

### isNonceUsed

```solidity
function isNonceUsed(uint256 nonce) external view returns (bool isUsed)
```

Name        Description
 @param  nonce       Number used once combined with the message to prevent replay attacks.
 @param  isUsed      Whether the nonce has already been used.

