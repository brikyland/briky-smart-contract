// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

/**
 *  @author Briky Team
 *
 *  @notice Interface for struct `Rate`.
 */
interface IRate {
    /** ===== ERROR ===== **/
    error InvalidRate();

 
    /** ===== STRUCT ===== **/
    /**
     *  @notice Representation of an unsigned rational rate.
     */
    struct Rate {
        /// @notice Integer value of the rate scaled with `decimals` digits.
        /// @dev    Rate numerator in fraction is `value`.
        uint256 value;

        /// @notice Number of fractional digits used to interpret `value`.
        /// @dev    Rate denominator in fraction is `10 ** decimals`.
        uint8 decimals;
    }
}
