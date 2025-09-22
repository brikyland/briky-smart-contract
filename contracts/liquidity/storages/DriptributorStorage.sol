// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

/// contracts/liquidity/interfaces/
import {IDriptributor} from "../../liquidity/interfaces/IDriptributor.sol";

/**
 *  @author Briky Team
 *
 *  @notice Storage contract for contract `Driptributor`.
 */
abstract contract DriptributorStorage is
IDriptributor {
    /// @dev    distributions[distributionId]
    mapping(uint256 => Distribution) internal distributions;


    uint256 public distributionNumber;

    uint256 public totalAllocation;
    uint256 public distributedAmount;

    address public admin;
    address public primaryToken;
    address public stakeToken1;
    address public stakeToken2;
    address public stakeToken3;

    uint256[50] private __gap;
}
