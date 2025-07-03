// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IPriceWatcher} from "../interfaces/IPriceWatcher.sol";

abstract contract PriceWatcherStorage is IPriceWatcher {
    mapping(address => PriceFeed) internal priceFeeds;
    mapping(address => Rate) internal defaultRates;

    address public admin;

    uint256[50] private __gap;
}
