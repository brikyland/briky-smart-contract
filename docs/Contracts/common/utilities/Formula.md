# Formula

Utility library for common mathematical calculations.

## scale

```solidity
function scale(uint256 _value, uint256 _numerator, uint256 _denominator) internal pure returns (uint256)
```

Scale a value by a rational multiplier.

{% hint style="info" %}
`_denominator != 0`.
{% endhint %}

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _value | uint256 | Fixed-point or integer value |
| _numerator | uint256 | Scaling multiplier numerator. |
| _denominator | uint256 | Scaling multiplier denominator. |

### Return Values

(Corresponding) fixed-point or integer value of `_value * _numerator / _denominator`.

## scale

```solidity
function scale(uint256 _value, struct IRate.Rate _rate) internal pure returns (uint256)
```

Scale a value by a rate.

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _value | uint256 | Fixed-point or integer value. |
| _rate | struct IRate.Rate | Scaling rate. |

### Return Values

(Corresponding) fixed-point or integer value of `_value * _rate`.

## remain

```solidity
function remain(uint256 _value, uint256 _numerator, uint256 _denominator) internal pure returns (uint256)
```

Remain after scale down a value by a rational multiplier.

{% hint style="info" %}
_numerator <= _denominator.
{% endhint %}

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _value | uint256 | Fixed-point or integer value. |
| _numerator | uint256 | Scaling multiplier numerator. |
| _denominator | uint256 | Scaling multiplier denominator. |

### Return Values

(Corresponding) fixed-point or integer value of `_value - _value * _numerator / _denominator`.

## remain

```solidity
function remain(uint256 _value, struct IRate.Rate _rate) internal pure returns (uint256)
```

Remain after scale down a value by a rate.

{% hint style="info" %}
`_rate <= 1.0`.
{% endhint %}

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _value | uint256 | Fixed-point or integer value. |
| _rate | struct IRate.Rate | Scaling rate. |

### Return Values

(Corresponding) fixed-point or integer value of `_value - _value * _rate`.

