// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ICommon} from "../../common/interfaces/ICommon.sol";
import {IERC20MetadataUpgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/IERC20MetadataUpgradeable.sol";

interface IExclusiveToken is
ICommon,
IERC20MetadataUpgradeable {
    function exclusiveDiscount() external view returns (Rate memory rate);
}
