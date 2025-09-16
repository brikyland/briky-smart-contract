// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

/**
 *  @author Briky Team
 *
 *  @notice Interface for struct `CurrencyRegistry`.
 *
 *  @dev    ERC-20 tokens are identified by their contract addresses.
 *          Native coin is represented by the zero address (0x0000000000000000000000000000000000000000).
 */
interface ICurrencyRegistry {
    /** ===== STRUCT ===== **/
    /**
     *  @notice Interaction configuration of a cryptocurrency, including both native coin and ERC-20 tokens.
     */
    struct CurrencyRegistry {
        /// @dev    DEPRECATED!
        uint256 minUnitPrice;

        /// @dev    DEPRECATED!
        uint256 maxUnitPrice;

        /// @notice Whether the currency is interactable within the system.
        /// @dev    Cryptocurrencies require authorization to be interactable to prevent unknown deceptive codes.
        bool isAvailable;

        /// @notice Whether the currency grants exclusive privileges within the system.
        bool isExclusive;
    }
}
