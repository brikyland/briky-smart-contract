# FixedMath

Math library for unsigned 128.128 fixed-point arithmetic functions.

{% hint style="info" %}
`Fixed` is a type of unsigned 128.128 fixed-point decimal, represented by an unsigned 256-bit value:
-   The upper 128 bits store the integer part
-   The lower 128 bits store the fractional part.
{% endhint %}

## DivisionByZero

```solidity
error DivisionByZero()
```

===== ERROR ===== *

## ONE

```solidity
uint256 ONE
```

Fixed-point representation of 1 is 2**128.

## toFixed

```solidity
function toFixed(uint256 _x) internal pure returns (uint256)
```

Convert an unsigned integer to an unsigned fixed-point decimal.

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _x | uint256 | Unsigned integer. |

### Return Values

Unsigned fixed-point representation of `_x`.

## toUint

```solidity
function toUint(uint256 _x) internal pure returns (uint256)
```

Convert an unsigned fixed-point decimal to an unsigned integer.

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _x | uint256 | Unsigned fixed-point decimal. |

### Return Values

Unsigned integer part of `_x`.

## add

```solidity
function add(uint256 _a, uint256 _b) internal pure returns (uint256)
```

Sum of two unsigned fixed-point decimal.

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _a | uint256 | First unsigned fixed-point term. |
| _b | uint256 | Second unsigned fixed-point term. |

### Return Values

Unsigned fixed-point representation of `_a + _b`.

## sub

```solidity
function sub(uint256 _a, uint256 _b) internal pure returns (uint256)
```

Difference of two unsigned fixed-point decimal.

{% hint style="info" %}
`_a >= b`.
{% endhint %}

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _a | uint256 | Unsigned fixed-point minuend. |
| _b | uint256 | Unsigned fixed-point subtrahend. |

### Return Values

Unsigned fixed-point representation of `_a - _b`.

## mul

```solidity
function mul(uint256 _a, uint256 _b) internal pure returns (uint256)
```

Product of two unsigned fixed-point decimal.

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _a | uint256 | First unsigned fixed-point factor. |
| _b | uint256 | Second unsigned fixed-point factor. |

### Return Values

Unsigned fixed-point representation of `_a * _b`.

## div

```solidity
function div(uint256 _a, uint256 _b) internal pure returns (uint256)
```

Quotient of two unsigned fixed-point decimal.

{% hint style="info" %}
`_b != 0`.
{% endhint %}

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _a | uint256 | Unsigned fixed-point dividend. |
| _b | uint256 | Unsigned fixed-point divisor. |

### Return Values

Unsigned fixed-point representation of `_a / _b`.

