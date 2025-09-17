// SPDX-License-Identifier: UNLICENSED
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
    uint256[50] private __gap;
}
