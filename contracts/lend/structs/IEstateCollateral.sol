// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 *  @author Briky Team
 *
 *  @notice Interface for struct `EstateCollateral`.
 */
interface IEstateCollateral {
    /** ===== STRUCT ===== **/
    /**
     *  @notice An estate token collateral.
     */
    struct EstateCollateral {
        /// @notice Token identifier.
        uint256 estateId;

        /// @notice Amount of tokens.
        uint256 amount;
    }
}
