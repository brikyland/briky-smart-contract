// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

/// @openzeppelin/contracts-upgradeable/
import {MathUpgradeable} from "@openzeppelin/contracts-upgradeable/utils/math/MathUpgradeable.sol";

/**
 *  @author Briky Team
 *
 *  @notice Math library for unsigned 128.128 fixed-point arithmetic functions.
 *
 *  @dev    `Fixed` is a type of unsigned 128.128 fixed-point decimal, represented by an unsigned 256-bit value:
 *          -   The upper 128 bits store the integer part
 *          -   The lower 128 bits store the fractional part.
 */
library FixedMath {
    /** ===== ERROR ===== **/
    error DivisionByZero();


    /** ===== CONSTANT ===== **/
    /// @notice Fixed-point representation of 1 is 2**128.
    uint256 internal constant ONE = 0x100000000000000000000000000000000;


    /** ===== FUNCTION ===== **/
    /**
     *  @notice Convert an unsigned integer to an unsigned fixed-point decimal.
     *
     *          Name    Description
     *  @param  _x      Unsigned integer.
     *
     *  @return Unsigned fixed-point representation of `_x`.
     */
    function toFixed(
        uint256 _x
    ) internal pure returns (uint256) {
        return _x << 128;
    }

    /**
     *  @notice Convert an unsigned fixed-point decimal to an unsigned integer.
     *
     *          Name    Description
     *  @param  _x      Unsigned fixed-point decimal.
     *
     *  @return Unsigned integer part of `_x`.
     */
    function toUint(
        uint256 _x
    ) internal pure returns (uint256) {
        return _x >> 128;
    }

    /**
     *  @notice Sum of two unsigned fixed-point decimal.
     *
     *          Name    Description
     *  @param  _a      First unsigned fixed-point term.
     *  @param  _b      Second unsigned fixed-point term.
     *
     *  @return Unsigned fixed-point representation of `_a + _b`.
     */
    function add(
        uint256 _a,
        uint256 _b
    ) internal pure returns (uint256) {
        return _a + _b;
    }

    /**
     *  @notice Difference of two unsigned fixed-point decimal.
     *
     *          Name    Description
     *  @param  _a      Unsigned fixed-point minuend.
     *  @param  _b      Unsigned fixed-point subtrahend.
     *
     *  @return Unsigned fixed-point representation of `_a - _b`.
     *
     *  @dev    `_a >= b`.
     */
    function sub(
        uint256 _a,
        uint256 _b
    ) internal pure returns (uint256) {
        return _a - _b;
    }

    /**
     *  @notice Product of two unsigned fixed-point decimal.
     *
     *          Name    Description
     *  @param  _a      First unsigned fixed-point factor.
     *  @param  _b      Second unsigned fixed-point factor.
     *
     *  @return Unsigned fixed-point representation of `_a * _b`.
     */
    function mul(
        uint256 _a,
        uint256 _b
    ) internal pure returns (uint256) {
        return MathUpgradeable.mulDiv(
            _a, _b,
            ONE
        );
    }

    /**
     *  @notice Quotient of two unsigned fixed-point decimal.
     *
     *          Name    Description
     *  @param  _a      Unsigned fixed-point dividend.
     *  @param  _b      Unsigned fixed-point divisor.
     *
     *  @return Unsigned fixed-point representation of `_a / _b`.
     *
     *  @dev    `_b != 0`.
     */
    function div(
        uint256 _a,
        uint256 _b
    ) internal pure returns (uint256) {
        return MathUpgradeable.mulDiv(
            _a, ONE,
            _b
        );
    }
}
