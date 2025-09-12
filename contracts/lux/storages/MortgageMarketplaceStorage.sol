// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// contracts/lux/interfaces/
import {IMortgageMarketplace} from "../../lux/interfaces/IMortgageMarketplace.sol";

/**
 *  @author Briky Team
 *
 *  @notice Storage contract for contract `MortgageMarketplace`.
 */
abstract contract MortgageMarketplaceStorage is
IMortgageMarketplace {
    /// @dev    offers[offerId]
    mapping(uint256 => Offer) internal offers;


    /// @dev    isCollection[collection]
    mapping(address => bool) public isCollection;

    uint256 public offerNumber;

    address public admin;

    uint256[50] private __gap;
}
