// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IERC721MetadataUpgradeable} from "@openzeppelin/contracts-upgradeable/interfaces/IERC721MetadataUpgradeable.sol";
import {IERC4906Upgradeable} from "@openzeppelin/contracts-upgradeable/interfaces/IERC4906Upgradeable.sol";

import {IRoyaltyRateProposer} from "../../common/interfaces/IRoyaltyRateProposer.sol";

interface IPassportToken is
IRoyaltyRateProposer,
IERC4906Upgradeable,
IERC721MetadataUpgradeable {
    event BaseURIUpdate(string newValue);
    event FeeUpdate(uint256 newValue);
    event RoyaltyRateUpdate(uint256 newValue);

    event NewToken(uint256 indexed tokenId, address indexed owner);

    error AlreadyMinted();

    function feeReceiver() external view returns (address feeReceiver);

    function tokenNumber() external view returns (uint256 tokenNumber);

    function fee() external view returns (uint256 fee);

    function getRoyaltyRate() external view returns (Rate memory rate);

    function exists(uint256 tokenId) external view returns (bool existence);

    function hasMinted(address account) external view returns (bool hasMinted);

    function mint() external payable returns (uint256 tokenId);
}
