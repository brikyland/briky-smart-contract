// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

/**
 *  @author Briky Team
 *
 *  @notice Interface for struct `Dividend`.
 *
 *  @dev    ERC-20 tokens are identified by their contract addresses.
 *          Native coin is represented by the zero address (0x0000000000000000000000000000000000000000).
 */
interface IDividend {
    /** ===== STRUCT ===== **/
    /**
     *  @notice A package of a certain cryptocurrency submitted to distribute among holders of an asset.
     */
    struct Dividend {
        /// @notice Asset identifier from the governor contract.
        uint256 tokenId;

        /// @notice Unwithdrawn weight.
        uint256 remainWeight;

        /// @notice Unwithdrawn value.
        uint256 remainValue;

        /// @notice Dividend currency address.
        address currency;

        /// @notice Issuance timestamp.
        uint40 at;

        /// @notice Governor contract address.
        /// @dev    This contract must support interface `IGovernor`.
        address governor;
    }
}
