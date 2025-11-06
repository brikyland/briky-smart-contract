# Solidity API

## FixedMath

@author Briky Team

 @notice Math library for unsigned 128.128 fixed-point arithmetic functions.

 @dev    `Fixed` is a type of unsigned 128.128 fixed-point decimal, represented by an unsigned 256-bit value:
         -   The upper 128 bits store the integer part
         -   The lower 128 bits store the fractional part.

### DivisionByZero

```solidity
error DivisionByZero()
```

===== ERROR ===== *

### ONE

```solidity
uint256 ONE
```

Fixed-point representation of 1 is 2**128.

### toFixed

```solidity
function toFixed(uint256 _x) internal pure returns (uint256)
```

@notice Convert an unsigned integer to an unsigned fixed-point decimal.

         Name    Description
 @param  _x      Unsigned integer.

 @return Unsigned fixed-point representation of `_x`.

### toUint

```solidity
function toUint(uint256 _x) internal pure returns (uint256)
```

@notice Convert an unsigned fixed-point decimal to an unsigned integer.

         Name    Description
 @param  _x      Unsigned fixed-point decimal.

 @return Unsigned integer part of `_x`.

### add

```solidity
function add(uint256 _a, uint256 _b) internal pure returns (uint256)
```

@notice Sum of two unsigned fixed-point decimal.

         Name    Description
 @param  _a      First unsigned fixed-point term.
 @param  _b      Second unsigned fixed-point term.

 @return Unsigned fixed-point representation of `_a + _b`.

### sub

```solidity
function sub(uint256 _a, uint256 _b) internal pure returns (uint256)
```

@notice Difference of two unsigned fixed-point decimal.

         Name    Description
 @param  _a      Unsigned fixed-point minuend.
 @param  _b      Unsigned fixed-point subtrahend.

 @return Unsigned fixed-point representation of `_a - _b`.

 @dev    `_a >= b`.

### mul

```solidity
function mul(uint256 _a, uint256 _b) internal pure returns (uint256)
```

@notice Product of two unsigned fixed-point decimal.

         Name    Description
 @param  _a      First unsigned fixed-point factor.
 @param  _b      Second unsigned fixed-point factor.

 @return Unsigned fixed-point representation of `_a * _b`.

### div

```solidity
function div(uint256 _a, uint256 _b) internal pure returns (uint256)
```

@notice Quotient of two unsigned fixed-point decimal.

         Name    Description
 @param  _a      Unsigned fixed-point dividend.
 @param  _b      Unsigned fixed-point divisor.

 @return Unsigned fixed-point representation of `_a / _b`.

 @dev    `_b != 0`.

