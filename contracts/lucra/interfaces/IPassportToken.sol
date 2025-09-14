// SPDX-License-Identifier: MIT
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
 *  @notice The `PassportToken` contract is an ERC-721 token representing a special pass that grant priveleges to owners
 *          during airdrop campaigns.
 * 
 *  @dev    The passport token can only be minted once per account.
 *  @dev    Minting fee is charged to protect the contract from DoS attacks.
 */
interface IPassportToken is
ICommon,
IRoyaltyRateProposer,
IERC4906Upgradeable,
IERC721MetadataUpgradeable {
    /** ===== EVENT ===== **/
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
     *  @notice Emitted when the royalty rate is updated.
     * 
     *          Name       Description
     *  @param  newRate    New royalty rate.
     */
    event RoyaltyRateUpdate(
        Rate newRate
    );

    /**
     *  @notice Emitted when a new token is minted.
     * 
     *          Name       Description
     *  @param  tokenId    Token identifier.
     *  @param  owner      Owner address.
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
     *          Name           Description
     *  @return tokenNumber    Number of tokens minted.
     */
    function tokenNumber() external view returns (uint256 tokenNumber);

    /**
     *          Name    Description
     *  @return fee     Minting fee.
     */
    function fee() external view returns (uint256 fee);

    /**
     *          Name         Description
     *  @return hasMinted    Whether the account has minted the passport token.
     */
    function hasMinted(
        address account
    ) external view returns (bool hasMinted);

    /* --- Command --- */
    /**
     *  @notice Mint the passport token.
     * 
     *          Name       Description
     *  @return tokenId    Minted token identifier.
     * 
     *  @dev    The passport token can only be minted once per account.
     */
    function mint() external payable returns (uint256 tokenId);
}
