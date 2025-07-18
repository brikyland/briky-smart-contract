// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IERC721MetadataUpgradeable} from "@openzeppelin/contracts-upgradeable/interfaces/IERC721MetadataUpgradeable.sol";
import {IERC4906Upgradeable} from "@openzeppelin/contracts-upgradeable/interfaces/IERC4906Upgradeable.sol";

import {ICommon} from "../../common/interfaces/ICommon.sol";
import {IRoyaltyRateProposer} from "../../common/interfaces/IRoyaltyRateProposer.sol";

interface IPassportToken is
ICommon,
IRoyaltyRateProposer,
IERC4906Upgradeable,
IERC721MetadataUpgradeable {
    event BaseURIUpdate(string newValue);
    event FeeUpdate(uint256 newValue);

    event NewToken(uint256 indexed tokenId, address indexed owner);

    error AlreadyMinted();

    function tokenNumber() external view returns (uint256 tokenNumber);

    function fee() external view returns (uint256 fee);

    function hasMinted(address account) external view returns (bool hasMinted);

    function mint() external payable returns (uint256 tokenId);
}
