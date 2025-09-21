// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

/// @openzeppelin/contracts-upgradeable/
import {IERC721MetadataUpgradeable} from "@openzeppelin/contracts-upgradeable/interfaces/IERC721MetadataUpgradeable.sol";
import {IERC4906Upgradeable} from "@openzeppelin/contracts-upgradeable/interfaces/IERC4906Upgradeable.sol";

/// contracts/common/interfaces/
import {ICommon} from "../../common/interfaces/ICommon.sol";
import {IRoyaltyRateProposer} from "../../common/interfaces/IRoyaltyRateProposer.sol";

/// contracts/lucra/structs/
import {IContent} from "../structs/IContent.sol";

/**
 *  @author Briky Team
 *
 *  @notice Interface for contract `PromotionToken`.
 *  @notice The `PromotionToken` contract is an ERC-721 token issued exclusively for airdrop campaigns. It provides
 *          limited-time content that grants its minter airdrop scores.
 */
interface IPromotionToken is
IContent,
ICommon,
IRoyaltyRateProposer,
IERC4906Upgradeable,
IERC721MetadataUpgradeable {
    /** ===== EVENT ===== **/
    /* --- Configuration --- */
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


    /* --- Content --- */
    /**
     *  @notice Emitted when a new content is created.
     * 
     *          Name            Description
     *  @param  contentId       Content identifier.
     *  @param  uri             URI of content metadata.
     *  @param  startAt         Start timestamp for minting.
     *  @param  duration        Mintable duration.
     */
    event NewContent(
        uint256 indexed contentId,
        string uri,
        uint40 startAt,
        uint40 duration
    );

    /**
     *  @notice Emitted when a content is cancelled.
     * 
     *          Name            Description
     *  @param  contentId       Content identifier.
     */
    event ContentCancellation(
        uint256 indexed contentId
    );

    /**
     *  @notice Emitted when the URI of a content is updated.
     * 
     *          Name            Description
     *  @param  contentId       Content identifier.
     *  @param  uri             URI of content metadata.
     */
    event ContentURIUpdate(
        uint256 indexed contentId,
        string uri
    );

    /**
     *  @notice Emitted when a new promotion token is minted.
     * 
     *          Name            Description
     *  @param  tokenId         Token identifier.
     *  @param  contentId       Content identifier associated with the token.
     *  @param  owner           Owner address.
     */
    event NewToken(
        uint256 indexed tokenId,
        uint256 indexed contentId,
        address indexed owner
    );


    /* ===== ERROR ===== **/
    error AlreadyEnded();
    error AlreadyStarted();
    error InvalidContentId();
    error NotOpened();


    /* ===== FUNCTION ===== **/
    /* --- Query --- */
    /**
     *          Name            Description
     *  @return contentNumber   Number of contents.
     */
    function contentNumber() external view returns (uint256 contentNumber);

    /**
     *          Name            Description
     *  @return tokenNumber     Number of tokens.
     */
    function tokenNumber() external view returns (uint256 tokenNumber);

    /**
     *          Name            Description
     *  @return fee             Minting fee.
     */
    function fee() external view returns (uint256 fee);

    /**
     *          Name            Description
     *  @param  contentId       Content identifier.
     *  @return content         Content information.
     */
    function getContent(
        uint256 contentId
    ) external view returns (Content memory content);

    /**
     *          Name            Description
     *  @param  account         EVM address.
     *  @param  contentId       Content identifier.
     *  @return count           Number of tokens of the content minted by the account.
     */
    function mintCounts(
        address account,
        uint256 contentId
    ) external view returns (uint256 count);


    /* --- Command --- */
    /**
     *  @notice Mint tokens of a content.
     * 
     *          Name            Description
     *  @param  contentId       Content identifier.
     *  @param  amount          Number of tokens to mint.
     *  @return firstTokenId    First token identifier of minted tokens.
     *  @return lastTokenId     Last token identifier of minted tokens.
     */
    function mint(
        uint256 contentId,
        uint256 amount
    ) external payable returns (
        uint256 firstTokenId,
        uint256 lastTokenId
    );
}
