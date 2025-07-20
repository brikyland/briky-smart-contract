// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IERC721MetadataUpgradeable} from "@openzeppelin/contracts-upgradeable/interfaces/IERC721MetadataUpgradeable.sol";
import {IERC4906Upgradeable} from "@openzeppelin/contracts-upgradeable/interfaces/IERC4906Upgradeable.sol";

import {ICommon} from "../../common/interfaces/ICommon.sol";
import {IRoyaltyRateProposer} from "../../common/interfaces/IRoyaltyRateProposer.sol";

interface ICommissionToken is
ICommon,
IRoyaltyRateProposer,
IERC4906Upgradeable,
IERC721MetadataUpgradeable {
    event BaseURIUpdate(string newValue);
    event CommissionRateUpdate(uint256 newValue);

    event NewToken(uint256 indexed tokenId, address indexed owner);

    error AlreadyMinted();

    function estateToken() external view returns (address estateToken);
    function feeReceiver() external view returns (address feeReceiver);

    function getCommissionRate() external view returns (Rate memory rate);

    function commissionInfo(uint256 tokenId, uint256 value)
    external view returns (address receiver, uint256 commissionAmount);

    function mint(address account, uint256 tokenId) external;
}
