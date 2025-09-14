// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 *  @author Briky Team
 *
 *  @notice Interface for struct `ProjectCollateral`.
 */
interface IProjectCollateral {
    /** ===== STRUCT ===== **/
    /**
     *  @notice A project token collateral.
     */
    struct ProjectCollateral {
        /// @notice Token identifier.
        uint256 projectId;

        /// @notice Amount of tokens.
        uint256 amount;
    }
}
