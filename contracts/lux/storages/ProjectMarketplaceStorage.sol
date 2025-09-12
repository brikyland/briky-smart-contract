// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// contracts/lux/interfaces/
import {IProjectMarketplace} from "../../lux/interfaces/IProjectMarketplace.sol";

/**
 *  @author Briky Team
 *
 *  @notice Storage contract for contract `ProjectMarketplace`.
 */
abstract contract ProjectMarketplaceStorage is
IProjectMarketplace {
    /// @dev    offers[offerId]
    mapping(uint256 => Offer) internal offers;

    uint256 public offerNumber;

    address public admin;
    address public projectToken;

    uint256[50] private __gap;
}
