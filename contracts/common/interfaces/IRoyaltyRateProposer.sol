// SPDX-License-Identifier: UNLICENSED
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
 *  @notice A `RoyaltyRateProposer` contract is an ERC-2981 contract that always announces royalty payment as a predefined
 *          fraction of the price, according to a royalty rate on each token identifier.
 */
interface IRoyaltyRateProposer is
IRate,
ICommon,
IERC2981Upgradeable {
    /** ===== FUNCTION ===== **/
    /* --- Query --- */
    /**
     *          Name        Description
     *  @param  tokenId     Token identifier.
     *  @return rate        Royalty rate of the token identifier.
     */
    function getRoyaltyRate(
        uint256 tokenId
    ) external view returns (Rate memory rate);
}
