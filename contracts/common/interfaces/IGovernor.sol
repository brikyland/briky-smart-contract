// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

/// @openzeppelin/contracts-upgradeable/
import {IERC1155Upgradeable} from "@openzeppelin/contracts-upgradeable/interfaces/IERC1155Upgradeable.sol";

/**
 *  @author Briky Team
 *
 *  @notice Interface for ERC-1155 tokens that governs RWAs.
 *  @notice A `Governor` contract digitizes shared holdings and supports querying holder equity for governance decisions or
 *          dividend distributions. Each asset must have a representative address entitled to perform restricted functions
 *          that involve the real condition of the asset on the behalf of holders.
 */
interface IGovernor is
IERC1155Upgradeable {
    /** ===== FUNCTION ===== **/
    /* --- Query --- */
    /**
     *          Name            Description
     *  @param  tokenId         Asset identifier.
     *  @return isAvailable     Whether the asset is available.
     */
    function isAvailable(
        uint256 tokenId
    ) external view returns (bool isAvailable);

    /**
     *          Name            Description
     *  @param  tokenId         Asset identifier.
     *  @return representative  Representative address of the asset.
     */
    function getRepresentative(
        uint256 tokenId
    ) external view returns (address representative);

    /**
     *          Name            Description
     *  @param  tokenId         Asset identifier.
     *  @return zone            Zone code of the asset.
     */
    function zoneOf(
        uint256 tokenId
    ) external view returns (bytes32 zone);


    /**
     *          Name            Description
     *  @param  tokenId         Asset identifier.
     *  @param  at              Reference timestamp.
     *  @return totalEquity     Total equity in the asset at the reference timestamp.
     */
    function totalEquityAt(
        uint256 tokenId,
        uint256 at
    ) external view returns (uint256 totalEquity);

    /**
     *          Name            Description
     *  @param  account         EVM address.
     *  @param  tokenId         Asset identifier.
     *  @param  at              Reference timestamp.
     *  @return equity          Equity of the account in the asset at the reference timestamp.
     */
    function equityOfAt(
        address account,
        uint256 tokenId,
        uint256 at
    ) external view returns (uint256 equity);
}
