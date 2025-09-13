// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {AggregatorV3Interface} from "@chainlink/contracts/src/v0.8/shared/interfaces/AggregatorV3Interface.sol";

import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";

import {Formula} from "./utilities/Formula.sol";

import {CommonConstant} from "./constants/CommonConstant.sol";

import {IAdmin} from "./interfaces/IAdmin.sol";

import {PriceWatcherStorage} from "./storages/PriceWatcherStorage.sol";

import {Administrable} from "./utilities/Administrable.sol";

contract PriceWatcher is
PriceWatcherStorage,
Initializable,
Administrable {
    using Formula for uint256;

    string constant private VERSION = "v1.2.1";

    receive() external payable {}

    function initialize(address _admin) external initializer {
        admin = _admin;
    }

    function version() external pure returns (string memory) {
        return VERSION;
    }

    /**
     *  @notice Update price feeds.
     *
     *          Name            Description
     *  @param  _currencies     Array of currency addresses.
     *  @param  _feeds          Array of new price feed addresses.
     *  @param  _heartbeats     Array of new heartbeats.
     *  @param  _signatures     Array of admin signatures.
     * 
     *  @dev    Administrative configurations.
     */
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

            priceFeeds[_currencies[i]] = DataFeed(
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

    /**
     *  @notice Update default rates.
     *
     *          Name            Description
     *  @param  _currencies     Array of currency addresses.
     *  @param  _rates          Array of new default rates.
     *  @param  _signatures     Array of admin signatures.
     * 
     *  @dev    Administrative configurations.
     */
    function updateDefaultRates(
        address[] calldata _currencies,
        Rate[] calldata _rates,
        bytes[] calldata _signatures
    ) external {
        IAdmin(admin).verifyAdminSignatures(
            abi.encode(
                address(this),
                "updateDefaultRates",
                _currencies,
                _rates
            ),
            _signatures
        );

        if (_currencies.length != _rates.length) {
            revert InvalidInput();
        }

        for(uint256 i; i < _currencies.length; ++i) {
            if (_rates[i].decimals > CommonConstant.RATE_DECIMALS) {
                revert InvalidInput();
            }
            defaultRates[_currencies[i]] = _rates[i];
            emit DefaultRateUpdate(
                _currencies[i],
                _rates[i]
            );
        }
    }

    function getPriceFeed(address _currency) external view returns (DataFeed memory) {
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
    ) external view onlyAvailableCurrency(_currency) returns (bool) {
        address feed = priceFeeds[_currency].feed;

        Rate memory rate;
        if (feed == address(0)) {
            rate = defaultRates[_currency];
            if (rate.value == 0) {
                revert MissingCurrencyRate();
            }
        } else {
            (
                ,
                int256 answer,
                ,
                uint256 updatedAt,

            ) = AggregatorV3Interface(feed).latestRoundData();

            if (answer <= 0) {
                revert InvalidPriceFeedData();
            }

            if (updatedAt + priceFeeds[_currency].heartbeat <= block.timestamp) {
                revert StalePriceFeed();
            }

            rate = Rate(
                uint256(answer),
                AggregatorV3Interface(feed).decimals()
            );
        }

        uint256 normalizedUnitPrice = _price.scale(rate);
        return _lowerBound <= normalizedUnitPrice && normalizedUnitPrice <= _upperBound;
    }
}
