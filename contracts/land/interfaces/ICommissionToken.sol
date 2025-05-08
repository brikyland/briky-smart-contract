// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IERC2981Upgradeable} from "@openzeppelin/contracts-upgradeable/interfaces/IERC2981Upgradeable.sol";
import {IERC4906Upgradeable} from "@openzeppelin/contracts-upgradeable/interfaces/IERC4906Upgradeable.sol";
import {IERC721MetadataUpgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC721/extensions/IERC721MetadataUpgradeable.sol";

import {ICommon} from "../../common/interfaces/ICommon.sol";

interface ICommissionToken is
ICommon,
IERC4906Upgradeable,
IERC721MetadataUpgradeable,
IERC2981Upgradeable {
    event BaseURIUpdate(string newValue);
    event RoyaltyRateUpdate(uint256 newValue);

    event NewToken(uint256 indexed tokenId, address owner);

    error AlreadyMinted();

    function admin() external view returns (address admin);
    function estateToken() external view returns (address estateToken);
    function feeReceiver() external view returns (address feeReceiver);

    function royaltyRate() external view returns (uint256 royaltyRate);

    function exists(uint256 tokenId) external view returns (bool existence);

    function mint(address account, uint256 tokenId) external;
}
