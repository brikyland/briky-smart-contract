// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

/**
 *  @author Briky Team
 *
 *  @notice Interface for struct `Fund`.
 *
 *  @dev    ERC-20 tokens are identified by their contract addresses.
 *          Native coin is represented by the zero address (0x0000000000000000000000000000000000000000).
 */
interface IFund {
    /** ===== STRUCT ===== **/
    /**
     *  @notice A package of one or multiple cryptocurrencies to provide and withdraw on demand of provider.
     *  @dev    The fund is determined by a `quantity` value and denominations for each currency.
     *  @dev    Provision or withdrawal operations must specify a `quantity` to indicate equivalent values, calculated by
     *          multiplying with predefined denomination of each currency.
     *  @dev    The fund need to specify a main currency, other extras are optional.
     */
    struct Fund {
        /// @notice Main currency address.
        address mainCurrency;

        /// @notice Main currency denomination.
        uint256 mainDenomination;

        /// @notice Array of extra currency addresses.
        address[] extraCurrencies;

        /// @notice Array of extra currency denominations, respective to each extra currency.
        /// @dev    Must have same length as `extraCurrencies`.
        uint256[] extraDenominations;

        /// @notice Fund quantity.
        uint256 quantity;

        /// @notice Provider address.
        address provider;

        /// @notice Whether the fund is provided sufficiently for the current quantity.
        bool isSufficient;
    }
}
