// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

/// contracts/liquidity/interfaces/
import {IAuction} from "../../liquidity/interfaces/IAuction.sol";

/**
 *  @author Briky Team
 *
 *  @notice Storage contract for contract `Auction`.
 */
abstract contract AuctionStorage is
IAuction {
    /// @dev    deposits[account]
    mapping(address => uint256) public deposits;

    /// @dev    withdrawnAmount[account]
    mapping(address => uint256) public withdrawnAmount;


    uint256 public totalToken;
    uint256 public totalDeposit;

    uint256 public endAt;
    uint256 public vestingDuration;

    address public admin;
    address public primaryToken;
    address public stakeToken1;
    address public stakeToken2;
    address public stakeToken3;

    uint256[50] private __gap;
}
