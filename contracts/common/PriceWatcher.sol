// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {AggregatorV3Interface} from "@chainlink/contracts/src/v0.8/shared/interfaces/AggregatorV3Interface.sol";

import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";

import {Constant} from "../lib/Constant.sol";
import {Formula} from "../lib/Formula.sol";

import {IAdmin} from "../common/interfaces/IAdmin.sol";

import {PriceWatcherStorage} from "./storages/PriceWatcherStorage.sol";

contract PriceWatcher is
PriceWatcherStorage,
Initializable {
    using Formula for uint256;

    string constant private VERSION = "v1.1.1";

    receive() external payable {}

    function initialize(address _admin) external initializer {
        admin = _admin;
    }

    function version() external pure returns (string memory) {
        return VERSION;
    }

    function updatePriceFeeds(
        address[] calldata _currencies,
        address[] calldata _feeds,
        uint40[] calldata _heartbeats,
        bytes[] calldata _signatures
    ) external {
        IAdmin(admin).verifyAdminSignatures(
            abi.encode(
                address(this),
                "updatePriceFeeds",
                _currencies,
                _feeds,
                _heartbeats
            ),
            _signatures
        );

        if (_currencies.length != _feeds.length
            || _currencies.length != _heartbeats.length) {
            revert InvalidInput();
        }

        for(uint256 i; i < _currencies.length; ++i) {
            if (_heartbeats[i] == 0) revert InvalidInput();

            priceFeeds[_currencies[i]] = PriceFeed(
                _feeds[i],
                _heartbeats[i]
            );
            emit PriceFeedUpdate(
                _currencies[i],
                _feeds[i],
                _heartbeats[i]
            );
        }
    }

    function updateDefaultRates(
        address[] calldata _currencies,
        uint256[] calldata _values,
        uint8[] calldata _decimals,
        bytes[] calldata _signatures
    ) external {
        IAdmin(admin).verifyAdminSignatures(
            abi.encode(
                address(this),
                "updateDefaultRates",
                _currencies,
                _values,
                _decimals
            ),
            _signatures
        );

        if (_currencies.length != _values.length
            || _currencies.length != _decimals.length) {
            revert InvalidInput();
        }

        for(uint256 i; i < _currencies.length; ++i) {
            if (_decimals[i] > Constant.ESTATE_TOKEN_MAX_DECIMALS) {
                revert InvalidInput();
            }

            defaultRates[_currencies[i]] = Rate(_values[i], _decimals[i]);
            emit DefaultRateUpdate(
                _currencies[i],
                _values[i],
                _decimals[i]
            );
        }
    }

    function getPriceFeed(address _currency) external view returns (PriceFeed memory) {
        return priceFeeds[_currency];
    }

    function getDefaultRate(address _currency) external view returns (Rate memory) {
        return defaultRates[_currency];
    }

    function isPriceInRange(
        address _currency,
        uint256 _price,
        uint256 _lowerBound,
        uint256 _upperBound
    ) external view returns (bool) {
        if (!IAdmin(admin).isAvailableCurrency(_currency)) {
            revert InvalidCurrency();
        }

        PriceFeed memory priceFeed = priceFeeds[_currency];

        Rate memory rate;
        if (priceFeed.feed == address(0)) {
            rate = defaultRates[_currency];
            if (rate.value == 0)revert MissingCurrencyRate();
        } else {
            (
                ,
                int256 answer,
                ,
                uint256 updatedAt,

            ) = AggregatorV3Interface(priceFeed.feed).latestRoundData();

            if (answer <= 0) {
                revert InvalidPriceFeedData();
            }

            if (updatedAt + priceFeed.heartbeat <= block.timestamp) {
                revert StalePriceFeed();
            }

            rate = Rate(
                uint256(answer),
                AggregatorV3Interface(priceFeed.feed).decimals()
            );
        }

        uint256 normalizedUnitPrice = _price.scale(rate);
        return _lowerBound <= normalizedUnitPrice && normalizedUnitPrice <= _upperBound;
    }
}
