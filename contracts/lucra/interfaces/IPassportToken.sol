// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

/// @openzeppelin/contracts-upgradeable/
import {IERC721MetadataUpgradeable} from "@openzeppelin/contracts-upgradeable/interfaces/IERC721MetadataUpgradeable.sol";
import {IERC4906Upgradeable} from "@openzeppelin/contracts-upgradeable/interfaces/IERC4906Upgradeable.sol";

/// contracts/common/interfaces/
import {ICommon} from "../../common/interfaces/ICommon.sol";
import {IRoyaltyRateProposer} from "../../common/interfaces/IRoyaltyRateProposer.sol";

/**
 *  @author Briky Team
 *
 *  @notice Interface for contract `PassportToken`.
 *  @notice The `PassportToken` contract is an ERC-721 token issued exclusively for airdrop campaigns. It grants its
 *          minter airdrop privileges, and each account may mint only one passport.
 */
interface IPassportToken is
ICommon,
IRoyaltyRateProposer,
IERC4906Upgradeable,
IERC721MetadataUpgradeable {
    /** ===== EVENT ===== **/
    /* --- Configuration --- */
    /**
     *  @notice Emitted when the base URI is updated.
     * 
     *          Name        Description
     *  @param  newValue    New base URI.
     */
    event BaseURIUpdate(
        string newValue
    );

    /**
     *  @notice Emitted when the minting fee is updated.
     * 
     *          Name        Description
     *  @param  newValue    New minting fee.
     */
    event FeeUpdate(
        uint256 newValue
    );

    /**
     *  @notice Emitted when the default royalty rate is updated.
     * 
     *          Name        Description
     *  @param  newRate     New default royalty rate.
     */
    event RoyaltyRateUpdate(
        Rate newRate
    );


    /* --- Passport --- */
    /**
     *  @notice Emitted when a new passport token is minted.
     * 
     *          Name        Description
     *  @param  tokenId     Token identifier.
     *  @param  owner       Owner address.
     */
    event NewToken(
        uint256 indexed tokenId,
        address indexed owner
    );


    /* ===== ERROR ===== **/
    error AlreadyMinted();


    /* ===== FUNCTION ===== **/
    /* --- Query --- */
    /**
     *          Name    Description
     *  @return fee     Minting fee.
     */
    function fee() external view returns (uint256 fee);


    /**
     *          Name            Description
     *  @return tokenNumber     Number of tokens.
     */
    function tokenNumber() external view returns (uint256 tokenNumber);


    /**
     *          Name        Description
     *  @return hasMinted   Whether the account has minted passport.
     */
    function hasMinted(
        address account
    ) external view returns (bool hasMinted);


    /* --- Command --- */
    /**
     *  @notice Mint the passport token to an account.
     *  @notice Mint only once for each account.
     * 
     *          Name        Description
     *  @return tokenId     Minted token identifier.
     */
    function mint() external payable returns (uint256 tokenId);
}
