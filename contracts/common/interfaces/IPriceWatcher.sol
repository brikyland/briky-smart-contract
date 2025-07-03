// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ICommon} from "./ICommon.sol";

interface IPriceWatcher is ICommon{
    struct PriceFeed {
        address feed;
        uint40 heartbeat;
    }

    event DefaultRateUpdate(
        address indexed currency,
        uint256 rateValue,
        uint8 rateDecimals
    );
    event PriceFeedUpdate(
        address indexed currency,
        address feed,
        uint40 heartbeat
    );

    event UnitPriceValidation(
        uint256 unitPrice,
        address currency,
        uint256 rateValue,
        uint8 rateDecimals
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
