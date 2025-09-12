// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// contracts/common/structs/
import {IRate} from "../common/structs/IRate.sol";

/// contracts/lib/external/
import {MulDiv} from "./external/MulDiv.sol";

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
     *  @param  _value          Fixed or integer value
     *  @param  _numerator      Scaling multiplier numerator.
     *  @param  _denominator    Scaling multiplier denominator.
     *
     *  @return (Corresponding) fixed-point or integer value of `_value * _numerator / _denominator`.
     *
     *  @dev    _denominator != 0.
     */
    function scale(uint256 _value, uint256 _numerator, uint256 _denominator) internal pure returns (uint256) {
        return MulDiv.mulDiv(
            _value,
            _numerator,
            _denominator
        );
    }

    /**
     *  @notice Scale a value by a rate.
     *
     *          Name            Description
     *  @param  _value          Fixed or integer value.
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
     *  @param  _value          Fixed or integer value.
     *  @param  _numerator      Scaling multiplier numerator.
     *  @param  _denominator    Scaling multiplier denominator.
     *
     *  @return (Corresponding) fixed-point or integer value of `_value - _value * _numerator / _denominator`.
     *
     *  @dev    _numerator <= _denominator.
     */
    function remain(uint256 _value, uint256 _numerator, uint256 _denominator) internal pure returns (uint256) {
        return _value - scale(_value, _numerator, _denominator);
    }

    /**
     *  @notice Remain after scale down a value by a rate.
     *
     *          Name            Description
     *  @param  _value          Fixed or integer value.
     *  @param  _rate           Scaling rate.
     *
     *  @return (Corresponding) fixed-point or integer value of `_value - _value * _rate`.
     *
     *  @dev    _rate <= 1.
     */
    function remain(uint256 _value, IRate.Rate memory _rate) internal pure returns (uint256) {
        return _value - scale(_value, _rate);
    }
}
