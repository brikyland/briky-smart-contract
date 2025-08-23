// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IPriceFeed} from "../structs/IPriceFeed.sol";
import {IRate} from "../structs/IRate.sol";

import {ICommon} from "./ICommon.sol";

interface IPriceWatcher is
IPriceFeed,
IRate,
ICommon {
    event DefaultRateUpdate(
        address indexed currency,
        Rate rate
    );
    event PriceFeedUpdate(
        address indexed currency,
        address feed,
        uint40 heartbeat
    );

    error InvalidPriceFeedData();
    error MissingCurrencyRate();
    error StalePriceFeed();

    function getDefaultRate(address currency) external view returns (Rate memory rate);
    function getPriceFeed(address currency) external view returns (PriceFeed memory priceFeed);

    function isPriceInRange(
        address currency,
        uint256 price,
        uint256 lowerBound,
        uint256 upperBound
    ) external view returns (bool isInRange);
}
