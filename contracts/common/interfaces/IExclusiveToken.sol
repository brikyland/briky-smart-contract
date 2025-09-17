// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

/// @openzeppelin/contracts-upgradeable/
import {IERC20MetadataUpgradeable} from "@openzeppelin/contracts-upgradeable/interfaces/IERC20MetadataUpgradeable.sol";
import {IERC20PermitUpgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/IERC20PermitUpgradeable.sol";

/// contracts/common/structs/
import {IRate} from "../structs/IRate.sol";

/**
 *  @author Briky Team
 *
 *  @notice Interface for exclusive ERC-20 tokens of the system.
 *  @notice An `IExclusiveToken` contract provides a discount rate applied when it is used as the currency of fee charged in
 *          operators within the system.
 */
interface IExclusiveToken is
IRate,
IERC20MetadataUpgradeable,
IERC20PermitUpgradeable {
    /** ===== FUNCTION ===== **/
    /* --- Query --- */
    /**
     *          Name    Description
     *  @return rate    Discount rate for exclusive token.
     */
    function exclusiveDiscount() external view returns (Rate memory rate);
}
