// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

/// contracts/lux/contracts/
import {AssetMarketplace} from "../lux/utilities/AssetMarketplace.sol";

/**
 *  @author Briky Team
 *
 *  @notice The `ProjectMarketplace` contract hosts a marketplace for project tokens.
 * 
 *  @dev    Each unit of asset token is represented in scaled form as `10 ** IAssetToken(collection).decimals()` following the
 *          convention of interface `IAssetToken`.
 *  @dev    ERC-20 tokens are identified by their contract addresses.
 *          Native coin is represented by the zero address (0x0000000000000000000000000000000000000000).
 */
contract ProjectMarketplace is
AssetMarketplace {
    /** ===== FUNCTION ===== **/
    /* --- Initialization --- */
    /**
     *  @notice Initialize the contract after deployment, serving as the constructor.
     * 
     *          Name            Description
     *  @param  _admin          `Admin` contract address.
     *  @param  _projectToken   `ProjectToken` contract address.
     */
    function initialize(
        address _admin,
        address _projectToken
    ) external
    initializer {
        /// Initializer
        __AssetMarketplace_init(_admin, _projectToken);        
    }
}
