// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

/// @chainlink/contracts/
import {AggregatorV3Interface} from "@chainlink/contracts/src/v0.8/shared/interfaces/AggregatorV3Interface.sol";

/// @openzeppelin/contracts-upgradeable/
import {ReentrancyGuardUpgradeable} from "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
import {ERC165CheckerUpgradeable} from "@openzeppelin/contracts-upgradeable/utils/introspection/ERC165CheckerUpgradeable.sol";

/// contracts/common/constants/
import {CommonConstant} from "./constants/CommonConstant.sol";

/// contracts/common/interfaces/
import {IAdmin} from "./interfaces/IAdmin.sol";

/// contracts/common/storages/
import {PriceWatcherStorage} from "./storages/PriceWatcherStorage.sol";

/// contracts/common/utilities/
import {Administrable} from "./utilities/Administrable.sol";
import {Formula} from "./utilities/Formula.sol";

/**
 *  @author Briky Team
 *
 *  @notice The `PriceWatcher` contract provides conversion rates between cryptocurrencies and USD. The conversion rates are
 *          collected from Price Feed. Tokens that has no Price Feed will be set a default conversion rate.
 * 
 *  @dev    Document for Price Feed: https://docs.chain.link/data-feeds/price-feeds
 *  @dev    ERC-20 tokens are identified by their contract addresses.
 *          Native coin is represented by the zero address (0x0000000000000000000000000000000000000000).
 */
contract PriceWatcher is
PriceWatcherStorage,
Administrable,
ReentrancyGuardUpgradeable {
    /** ===== LIBRARY ===== **/
    using ERC165CheckerUpgradeable for address;
    using Formula for uint256;


    /** ===== CONSTANT ===== **/
    string constant private VERSION = "v1.2.1";


    /** ===== FUNCTION ===== **/
    /* --- Common --- */
    /**
     *  @notice Executed on a call to this contract with empty calldata.
     */
    receive() external payable {}

    /**
     *  @return Version of implementation.
     */
    function version() external pure returns (string memory) {
        return VERSION;
    }


    /* --- Initialization --- */
    /**
     *  @notice Initialize the contract after deployment, serving as the constructor.
     *
     *          Name    Description
     *  @param  _admin  `Admin` contract address.
     */
    function initialize(
        address _admin
    ) external
    initializer {
        /// Initializer
        __ReentrancyGuard_init();
        
        /// Dependency
        admin = _admin;
    }


    /* --- Administration --- */
    /**
     *  @notice Update price feeds of multiple currencies.
     *
     *          Name            Description
     *  @param  _currencies     Array of updated currency addresses.
     *  @param  _feeds          Array of new Price Feed contract addresses, respectively for each currency.
     *  @param  _heartbeats     Array of new acceptable latencies, respectively for each currency.
     *  @param  _signatures     Array of admin signatures.
     * 
     *  @dev    Administrative operator.
     *  @dev    Price Feed contracts must support interface `AggregatorV3Interface`.
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
            if (_heartbeats[i] == 0) {
                revert InvalidInput();
            }
            if (_feeds[i] != address(0) && !_feeds[i].supportsInterface(type(AggregatorV3Interface).interfaceId)) {
                revert InvalidDataFeed();
            }
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
     *  @notice Update default conversion rates of multiple currencies.
     *
     *          Name            Description
     *  @param  _currencies     Array of updated currency addresses.
     *  @param  _rates          Array of new default conversion rates, respectively for each currency.
     *  @param  _signatures     Array of admin signatures.
     * 
     *  @dev    Administrative operator.
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


    /* --- Query --- */
    /**
     *          Name            Description
     *  @param  _currency       Currency address.
     *
     *  @return Price Feed configuration of the currency.
     */
    function getPriceFeed(
        address _currency
    ) external view returns (DataFeed memory) {
        return priceFeeds[_currency];
    }

    /**
     *          Name            Description
     *  @param  _currency       Currency address.
     *
     *  @return Default conversion rate of the currency.
     */
    function getDefaultRate(
        address _currency
    ) external view returns (Rate memory) {
        return defaultRates[_currency];
    }

    /**
     *          Name            Description
     *  @param  _currency       Currency address.
     *  @param  _price          Price denominated in the currency.
     *  @param  _lowerBound     Lower price bound denominated in USD.
     *  @param  _upperBound     Upper price bound denominated in USD.
     *
     *  @return Whether the price denominated in USD is in range of `[lowerBound, upperBound]`.
     */
    function isPriceInRange(
        address _currency,
        uint256 _price,
        uint256 _lowerBound,
        uint256 _upperBound
    ) external view
    onlyAvailableCurrency(_currency)
    returns (bool) {
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
