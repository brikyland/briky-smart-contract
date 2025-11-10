# Validatable

A `Validatable` contract relies on a trusted validator to verify data that is difficult to process on-chain.

{% hint style="info" %}
Implementation involves server-side support.
{% endhint %}

## __Validatable_init

```solidity
function __Validatable_init(address _validator) internal
```

Initialize `Validatable`.

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _validator | address | Validator address. |

## updateValidator

```solidity
function updateValidator(address _validator, bytes[] _signatures) external
```

Update the validator.

{% hint style="info" %}
Administrative operator.
{% endhint %}

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _validator | address | New validator address. |
| _signatures | bytes[] | Array of admin signatures. |

## _validate

```solidity
function _validate(bytes _data, struct IValidation.Validation _validation) internal
```

Validate a data.

{% hint style="info" %}
Revert on validation failure.
{% endhint %}

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _data | bytes | Validated data. |
| _validation | struct IValidation.Validation | Validation package from the validator. |

