// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @openzeppelin/contracts-upgradeable/
import {IERC2981Upgradeable} from "@openzeppelin/contracts-upgradeable/interfaces/IERC2981Upgradeable.sol";

/// contracts/common/structs/
import {IRate} from "../structs/IRate.sol";

/// contracts/common/interfaces/
import {ICommon} from "./ICommon.sol";

/**
 *  @author Briky Team
 *
 *  @notice Interface for contract `RoyaltyRateProposer`.
 *  @notice A `RoyaltyRateProposer` contract evaluates royalty payment for each asset as a fraction of the price, according to
 *          a royalty rate.
 */
interface IRoyaltyRateProposer is
IRate,
ICommon,
IERC2981Upgradeable {
    /** ===== FUNCTION ===== **/
    /**
     *          Name        Description
     *  @param  tokenId     Asset identifier.
     *  @return rate        Royalty rate of the asset.
     */
    function getRoyaltyRate(
        uint256 tokenId
    ) external view returns (Rate memory rate);
}
