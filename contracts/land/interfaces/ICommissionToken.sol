// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IERC4906Upgradeable} from "@openzeppelin/contracts-upgradeable/interfaces/IERC4906Upgradeable.sol";
import {IERC721MetadataUpgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC721/extensions/IERC721MetadataUpgradeable.sol";

import {IRoyaltyRateToken} from "../../common/interfaces/IRoyaltyRateToken.sol";

interface ICommissionToken is
IRoyaltyRateToken,
IERC4906Upgradeable,
IERC721MetadataUpgradeable {
    event BaseURIUpdate(string newValue);
    event CommissionRateUpdate(uint256 newValue);
    event RoyaltyRateUpdate(uint256 newValue);

    event NewToken(uint256 indexed tokenId, address owner);

    error AlreadyMinted();

    function admin() external view returns (address admin);
    function estateToken() external view returns (address estateToken);

    function getCommissionRate() external view returns (Rate memory rate);

    function exists(uint256 tokenId) external view returns (bool existence);

    function mint(address account, uint256 tokenId) external;
}
