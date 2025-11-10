# Solidity API

## Validatable

A `Validatable` contract relies on a trusted validator to verify data that is difficult to process on-chain.

_Implementation involves server-side support._

### __Validatable_init

```solidity
function __Validatable_init(address _validator) internal
```

Initialize `Validatable`.

Name        Description

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _validator | address | Validator address. |

### updateValidator

```solidity
function updateValidator(address _validator, bytes[] _signatures) external
```

Update the validator.

Name            Description

_Administrative operator._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _validator | address | New validator address. |
| _signatures | bytes[] | Array of admin signatures. |

### _validate

```solidity
function _validate(bytes _data, struct IValidation.Validation _validation) internal
```

Validate a data.

Name            Description

_Revert on validation failure._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _data | bytes | Validated data. |
| _validation | struct IValidation.Validation | Validation package from the validator. |

