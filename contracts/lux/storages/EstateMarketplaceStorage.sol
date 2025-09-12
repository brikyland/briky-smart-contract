// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// contracts/lux/interfaces/
import {IEstateMarketplace} from "../../lux/interfaces/IEstateMarketplace.sol";

/**
 *  @author Briky Team
 *
 *  @notice Storage contract for contract `EstateMarketplace`.
 */
abstract contract EstateMarketplaceStorage is
IEstateMarketplace {
    /// @dev    offers[offerId]
    mapping(uint256 => Offer) internal offers;

    uint256 public offerNumber;

    address public admin;
    address public estateToken;

    uint256[50] private __gap;
}
