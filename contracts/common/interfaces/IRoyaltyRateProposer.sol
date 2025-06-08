// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IERC165Upgradeable} from "@openzeppelin/contracts-upgradeable/interfaces/IERC165Upgradeable.sol";
import {IERC2981Upgradeable} from "@openzeppelin/contracts-upgradeable/interfaces/IERC2981Upgradeable.sol";

import {ICommon} from "./ICommon.sol";

interface IRoyaltyRateProposer is
ICommon,
IERC165Upgradeable,
IERC2981Upgradeable {
    function getRoyaltyRate() external view returns (Rate memory rate);
}
