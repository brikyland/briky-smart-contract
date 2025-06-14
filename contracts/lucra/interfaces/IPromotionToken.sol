// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IERC721MetadataUpgradeable} from "@openzeppelin/contracts-upgradeable/interfaces/IERC721MetadataUpgradeable.sol";
import {IERC4906Upgradeable} from "@openzeppelin/contracts-upgradeable/interfaces/IERC4906Upgradeable.sol";

import {IRoyaltyRateProposer} from "../../common/interfaces/IRoyaltyRateProposer.sol";

interface IPromotionToken is
IRoyaltyRateProposer,
IERC4906Upgradeable,
IERC721MetadataUpgradeable {
    struct Content {
        string uri;
        uint40 startAt;
        uint40 endAt;
    }

    event BaseURIUpdate(string newValue);
    event FeeUpdate(uint256 newValue);
    event RoyaltyRateUpdate(uint256 newValue);

    event NewContent(
        uint256 indexed contentId,
        string uri,
        uint40 startAt,
        uint40 duration
    );
    event ContentCancellation(uint256 indexed contentId);

    event NewToken(
        uint256 indexed tokenId,
        uint256 indexed contentId,
        address indexed owner
    );

    error AlreadyMinted();
    error AlreadyLocked();
    error InvalidContentId();
    error NotOpened();

    function feeReceiver() external view returns (address feeReceiver);

    function contentNumber() external view returns (uint256 contentNumber);
    function tokenNumber() external view returns (uint256 tokenNumber);

    function fee() external view returns (uint256 fee);

    function getRoyaltyRate() external view returns (Rate memory rate);

    function getContent(uint256 contentId) external view returns (Content memory content);

    function exists(uint256 tokenId) external view returns (bool existence);

    function hasMinted(address account, uint256 contentId) external view returns (bool hasMinted);

    function mint(uint256 contentId) external payable returns (uint256 tokenId);
}
