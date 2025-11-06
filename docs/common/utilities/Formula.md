# Solidity API

## Formula

@author Briky Team

 @notice Utility library for common mathematical calculations.

### scale

```solidity
function scale(uint256 _value, uint256 _numerator, uint256 _denominator) internal pure returns (uint256)
```

@notice Scale a value by a rational multiplier.

         Name            Description
 @param  _value          Fixed-point or integer value
 @param  _numerator      Scaling multiplier numerator.
 @param  _denominator    Scaling multiplier denominator.

 @return (Corresponding) fixed-point or integer value of `_value * _numerator / _denominator`.

 @dev    `_denominator != 0`.

### scale

```solidity
function scale(uint256 _value, struct IRate.Rate _rate) internal pure returns (uint256)
```

@notice Scale a value by a rate.

         Name            Description
 @param  _value          Fixed-point or integer value.
 @param  _rate           Scaling rate.

 @return (Corresponding) fixed-point or integer value of `_value * _rate`.

### remain

```solidity
function remain(uint256 _value, uint256 _numerator, uint256 _denominator) internal pure returns (uint256)
```

@notice Remain after scale down a value by a rational multiplier.

         Name            Description
 @param  _value          Fixed-point or integer value.
 @param  _numerator      Scaling multiplier numerator.
 @param  _denominator    Scaling multiplier denominator.

 @return (Corresponding) fixed-point or integer value of `_value - _value * _numerator / _denominator`.

 @dev    _numerator <= _denominator.

### remain

```solidity
function remain(uint256 _value, struct IRate.Rate _rate) internal pure returns (uint256)
```

@notice Remain after scale down a value by a rate.

         Name            Description
 @param  _value          Fixed-point or integer value.
 @param  _rate           Scaling rate.

 @return (Corresponding) fixed-point or integer value of `_value - _value * _rate`.

 @dev    `_rate <= 1.0`.

