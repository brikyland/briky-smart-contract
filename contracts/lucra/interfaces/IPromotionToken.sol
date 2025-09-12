// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IERC721MetadataUpgradeable} from "@openzeppelin/contracts-upgradeable/interfaces/IERC721MetadataUpgradeable.sol";
import {IERC4906Upgradeable} from "@openzeppelin/contracts-upgradeable/interfaces/IERC4906Upgradeable.sol";

import {ICommon} from "../../common/interfaces/ICommon.sol";
import {IRoyaltyRateProposer} from "../../common/interfaces/IRoyaltyRateProposer.sol";

import {IContent} from "../structs/IContent.sol";

interface IPromotionToken is
IContent,
ICommon,
IRoyaltyRateProposer,
IERC4906Upgradeable,
IERC721MetadataUpgradeable {
    event FeeUpdate(uint256 newValue);
    event RoyaltyRateUpdate(Rate newRate);

    event NewContent(
        uint256 indexed contentId,
        string uri,
        uint40 startAt,
        uint40 duration
    );
    event ContentCancellation(uint256 indexed contentId);
    event ContentURIUpdate(uint256 indexed contentId, string uri);

    event NewToken(
        uint256 indexed tokenId,
        uint256 indexed contentId,
        address indexed owner
    );

    error AlreadyEnded();
    error AlreadyStarted();
    error InvalidContentId();
    error NotOpened();

    function contentNumber() external view returns (uint256 contentNumber);
    function tokenNumber() external view returns (uint256 tokenNumber);

    function fee() external view returns (uint256 fee);

    function getContent(uint256 contentId) external view returns (Content memory content);

    function mintCounts(address account, uint256 contentId) external view returns (uint256 count);

    function mint(uint256 contentId, uint256 amount) external payable returns (uint256 firstTokenId, uint256 lastTokenId);
}
