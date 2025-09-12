// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IERC1155MetadataURIUpgradeable} from "@openzeppelin/contracts-upgradeable/interfaces/IERC1155MetadataURIUpgradeable.sol";
import {IERC2981Upgradeable} from "@openzeppelin/contracts-upgradeable/interfaces/IERC2981Upgradeable.sol";

import {IGovernor} from "./IGovernor.sol";

interface IAssetToken is
IGovernor,
IERC2981Upgradeable,
IERC1155MetadataURIUpgradeable {
    function decimals() external view returns (uint8 decimals);

    function balanceOfAt(
        address account,
        uint256 tokenId,
        uint256 at
    ) external view returns (uint256 balance);

    function totalSupply(
        uint256 tokenId
    ) external view returns (uint256 totalSupply);
}
