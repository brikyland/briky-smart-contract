// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

/// contracts/common/interfaces/
import {IPriceWatcher} from "../interfaces/IPriceWatcher.sol";

/**
 *  @author Briky Team
 *
 *  @notice Storage contract for contract `PriceWatcher`.
 */
abstract contract PriceWatcherStorage is
IPriceWatcher {
    /// @dev    priceFeeds[currency]
    mapping(address => DataFeed) internal priceFeeds;

    /// @dev    defaultRates[currency]
    mapping(address => Rate) internal defaultRates;


    address public admin;

    uint256[50] private __gap;
}
