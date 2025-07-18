// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IERC20MetadataUpgradeable} from "@openzeppelin/contracts-upgradeable/interfaces/IERC20MetadataUpgradeable.sol";
import {IERC20PermitUpgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/IERC20PermitUpgradeable.sol";

import {IRate} from "../structs/IRate.sol";

interface IExclusiveToken is
IRate,
IERC20MetadataUpgradeable,
IERC20PermitUpgradeable {
    function exclusiveDiscount() external view returns (Rate memory rate);
}
