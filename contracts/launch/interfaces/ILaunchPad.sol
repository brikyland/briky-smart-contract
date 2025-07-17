// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IERC1155MetadataURIUpgradeable} from "@openzeppelin/contracts-upgradeable/interfaces/IERC1155MetadataURIUpgradeable.sol";

import {IFund} from "../../common/interfaces/IFund.sol";
import {IRoyaltyRateProposer} from "../../common/interfaces/IRoyaltyRateProposer.sol";
import {IValidatable} from "../../common/interfaces/IValidatable.sol";

import {ICommissionDispatchable} from "../../land/interfaces/ICommissionDispatchable.sol";
import {IEstateTokenizer} from "../../land/interfaces/IEstateTokenizer.sol";
import {IGovernor} from "../../common/interfaces/IGovernor.sol";

import {IProject} from "./IProject.sol";

interface ILaunchPad is
IProject,
IFund,
ICommissionDispatchable,
IValidatable,
IEstateTokenizer,
IGovernor,
IRoyaltyRateProposer,
IERC1155MetadataURIUpgradeable {
    event BaseURIUpdate(string newValue);
    event FeeRateUpdate(uint256 newValue);
    event RoyaltyRateUpdate(uint256 newValue);

    event BaseUnitPriceRangeUpdate(
        uint256 baseMinUnitPrice,
        uint256 baseMaxUnitPrice
    );

    event Whitelist(address indexed account);
    event Unwhitelist(address indexed account);
}
