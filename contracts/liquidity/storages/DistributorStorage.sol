// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

/// contracts/liquidity/interfaces/
import {IDistributor} from "../../liquidity/interfaces/IDistributor.sol";

/**
 *  @author Briky Team
 *
 *  @notice Storage contract for contract `Distributor`.
 */
abstract contract DistributorStorage is
IDistributor {
    address public admin;
    address public primaryToken;
    address public treasury;

    /// @dev    distributedTokens[account]
    mapping(address => uint256) public distributedTokens;


    uint256[50] private __gap;
}
