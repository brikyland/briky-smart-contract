// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

/// @openzeppelin/contracts-upgradeable/
import {MathUpgradeable} from "@openzeppelin/contracts-upgradeable/utils/math/MathUpgradeable.sol";

/// contracts/common/structs/
import {IRate} from "../structs/IRate.sol";

/**
 *  @author Briky Team
 *
 *  @notice Utility library for common mathematical calculations.
 */
library Formula {
    /** ===== FUNCTION ===== **/
    /**
     *  @notice Scale a value by a rational multiplier.
     *
     *          Name            Description
     *  @param  _value          Fixed-point or integer value
     *  @param  _numerator      Scaling multiplier numerator.
     *  @param  _denominator    Scaling multiplier denominator.
     *
     *  @return (Corresponding) fixed-point or integer value of `_value * _numerator / _denominator`.
     *
     *  @dev    `_denominator != 0`.
     */
    function scale(uint256 _value, uint256 _numerator, uint256 _denominator) internal pure returns (uint256) {
        return MathUpgradeable.mulDiv(
            _value, _numerator,
            _denominator
        );
    }

    /**
     *  @notice Scale a value by a rate.
     *
     *          Name            Description
     *  @param  _value          Fixed-point or integer value.
     *  @param  _rate           Scaling rate.
     *
     *  @return (Corresponding) fixed-point or integer value of `_value * _rate`.
     */
    function scale(uint256 _value, IRate.Rate memory _rate) internal pure returns (uint256) {
        return scale(
            _value,
            _rate.value,
            10 ** _rate.decimals
        );
    }

    /**
     *  @notice Remain after scale down a value by a rational multiplier.
     *
     *          Name            Description
     *  @param  _value          Fixed-point or integer value.
     *  @param  _numerator      Scaling multiplier numerator.
     *  @param  _denominator    Scaling multiplier denominator.
     *
     *  @return (Corresponding) fixed-point or integer value of `_value - _value * _numerator / _denominator`.
     *
     *  @dev    _numerator <= _denominator.
     */
    function remain(
        uint256 _value,
        uint256 _numerator,
        uint256 _denominator
    ) internal pure returns (uint256) {
        return _value - scale(_value, _numerator, _denominator);
    }

    /**
     *  @notice Remain after scale down a value by a rate.
     *
     *          Name            Description
     *  @param  _value          Fixed-point or integer value.
     *  @param  _rate           Scaling rate.
     *
     *  @return (Corresponding) fixed-point or integer value of `_value - _value * _rate`.
     *
     *  @dev    `_rate <= 1.0`.
     */
    function remain(
        uint256 _value,
        IRate.Rate memory _rate
    ) internal pure returns (uint256) {
        return _value - scale(_value, _rate);
    }
}
