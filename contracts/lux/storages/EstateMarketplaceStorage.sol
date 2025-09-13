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
    uint256[50] private __gap;
}
