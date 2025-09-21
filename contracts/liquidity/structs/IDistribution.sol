// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

/**
 *  @author Briky Team
 *
 *  @notice Interface for struct `Distribution`.
 */
interface IDistribution {
    /** ===== STRUCT ===== **/
    /**
     *  @notice Distribution of token that vests evenly on a per-second basis.
     */
    struct Distribution {
        /// @notice Total distributed tokens.
        uint256 totalAmount;

        /// @notice Withdrawn tokens.
        uint256 withdrawnAmount;

        /// @notice Receiver address.
        address receiver;

        /// @notice Distribution timestamp.
        uint40 distributeAt;

        /// @notice Vesting duration.
        uint40 vestingDuration;

        /// @notice Whether unwithdrawn tokens are staked.
        bool isStaked;
    }
}
