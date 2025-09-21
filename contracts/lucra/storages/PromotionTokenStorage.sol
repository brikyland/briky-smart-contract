// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

/// contracts/lucra/interfaces/
import {IPromotionToken} from "../interfaces/IPromotionToken.sol";

/**
 *  @author Briky Team
 *
 *  @notice Storage contract for contract `PromotionToken`.
 */
abstract contract PromotionTokenStorage is
IPromotionToken {
    /// @dev    mintCounts[account][contentId]
    mapping(address => mapping(uint256 => uint256)) public mintCounts;


    /// @dev    contents[contentId]
    mapping(uint256 => Content) internal contents;


    /// @dev    tokenContents[tokenId]
    mapping(uint256 => uint256) internal tokenContents;


    uint256 public contentNumber;
    uint256 public tokenNumber;

    uint256 public fee;

    uint256 internal royaltyRate;

    address public admin;

    uint256[50] private __gap;
}
