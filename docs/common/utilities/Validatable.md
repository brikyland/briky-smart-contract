# Solidity API

## Validatable

@author Briky Team

 @notice A `Validatable` contract relies on a trusted validator to verify data that is difficult to process on-chain.

 @dev    Implementation involves server-side support.

### __Validatable_init

```solidity
function __Validatable_init(address _validator) internal
```

@notice Initialize `Validatable`.

         Name        Description
 @param  _validator  Validator address.

### updateValidator

```solidity
function updateValidator(address _validator, bytes[] _signatures) external
```

@notice Update the validator.

         Name            Description
 @param  _validator      New validator address.
 @param  _signatures     Array of admin signatures.

 @dev    Administrative operator.

### _validate

```solidity
function _validate(bytes _data, struct IValidation.Validation _validation) internal
```

@notice Validate a data.

         Name            Description
 @param  _data           Validated data.
 @param  _validation     Validation package from the validator.

 @dev    Revert on validation failure.

