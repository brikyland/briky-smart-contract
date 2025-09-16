// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

/// contracts/lux/interfaces/
import {IAssetMarketplace} from "../../lux/interfaces/IAssetMarketplace.sol";

/**
 *  @author Briky Team
 *
 *  @notice Storage contract for contract `AssetMarketplace`.
 */
abstract contract AssetMarketplaceStorage is
IAssetMarketplace {
    /// @dev    offers[offerId]
    mapping(uint256 => AssetOffer) internal offers;

    uint256 public offerNumber;

    address public admin;
    address public collection;

    uint256[50] private __gap;
}
