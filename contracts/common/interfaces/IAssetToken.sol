// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

/// @openzeppelin/contracts-upgradeable/
import {IERC1155MetadataURIUpgradeable} from "@openzeppelin/contracts-upgradeable/interfaces/IERC1155MetadataURIUpgradeable.sol";
import {IERC2981Upgradeable} from "@openzeppelin/contracts-upgradeable/interfaces/IERC2981Upgradeable.sol";

/// contracts/common/interfaces/
import {IGovernor} from "./IGovernor.sol";

/**
 *  @author Briky Team
 *
 *  @notice Interface for an ERC-1155 contract that securitizes RWAs.
 *  @notice An asset token securitizes RWAs and represents share holdings in form of a class of ERC-1155 tokens.
 *  @notice Each unit of asset tokens is represented in scaled form by `10 ** decimals`.
 */
interface IAssetToken is
IGovernor,
IERC1155MetadataURIUpgradeable,
IERC2981Upgradeable {
    /** ===== FUNCTION ===== **/
    /* --- Query --- */
    /**
     *          Name            Description
     *  @return decimals        Token decimals.
     */
    function decimals() external view returns (uint8 decimals);

    /**
     *          Name            Description
     *  @param  account         EVM address.
     *  @param  tokenId         Asset identifier.
     *  @param  at              Reference timestamp.
     *  @return balance         Balance of the account in the asset at the reference timestamp.
     */
    function balanceOfAt(
        address account,
        uint256 tokenId,
        uint256 at
    ) external view returns (uint256 balance);

    /**
     *          Name            Description
     *  @param  tokenId         Asset identifier.
     *  @return totalSupply     Total supply of the account at the reference timestamp.
     */
    function totalSupply(
        uint256 tokenId
    ) external view returns (uint256 totalSupply);
}
