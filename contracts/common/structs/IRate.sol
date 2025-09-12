// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 *  @author Briky Team
 *
 *  @notice Interface for struct `Rate`.
 */
interface IRate {
    /** ===== STRUCT ===== **/
    /**
     *  @notice Record of an unsigned decimal rate value.
     */
    struct Rate {
        /// @notice Integer value of the rate scaled with `decimals` digits.
        uint256 value;

        /// @notice Number of fractional digits used to interpret `value`.
        uint8 decimals;
    }


    /** ===== ERROR ===== **/
    error InvalidRate();
}
