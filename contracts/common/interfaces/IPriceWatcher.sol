// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

/// contracts/common/structs/
import {IDataFeed} from "../structs/IDataFeed.sol";
import {IRate} from "../structs/IRate.sol";

/// contracts/common/interfaces/
import {ICommon} from "./ICommon.sol";

/**
 *  @author Briky Team
 *
 *  @notice Interface for contract `PriceWatcher`.
 *  @notice The `PriceWatcher` contract provides conversion rates between cryptocurrencies and USD. The conversion rates are
 *          collected from Price Feed. Tokens that has no Price Feed will be set a default conversion rate.
 *
 *  @dev    Document for Price Feed: https://docs.chain.link/data-feeds/price-feeds
 *  @dev    ERC-20 tokens are identified by their contract addresses.
 *          Native coin is represented by the zero address (0x0000000000000000000000000000000000000000).
 */
interface IPriceWatcher is
IDataFeed,
IRate,
ICommon {
    /** ===== EVENT ===== **/
    /**
     *  @notice Emitted when the default conversion rate of a currency is updated.
     *
     *          Name        Description
     *  @param  currency    Currency address.
     *  @param  rate        New default conversion rate.
     */
    event DefaultRateUpdate(
        address indexed currency,
        Rate rate
    );

    /**
     *  @notice Emitted when Price Feed configuration of a currency is updated.
     *
     *          Name        Description
     *  @param  currency    Currency address.
     *  @param  feed        New Price Feed contract.
     *  @param  heartbeat   New acceptable latency.
     */
    event PriceFeedUpdate(
        address indexed currency,
        address feed,
        uint40 heartbeat
    );


    /** ===== ERROR ===== **/
    error InvalidPriceFeedData();
    error MissingCurrencyRate();
    error StalePriceFeed();


    /** ===== FUNCTION ===== **/
    /* --- Query --- */
    /**
     *          Name        Description
     *  @param  currency    Proposal identifier.
     *  @return rate        Default conversion rate of the currency.
     */
    function getDefaultRate(
        address currency
    ) external view returns (Rate memory rate);

    /**
     *          Name        Description
     *  @param  currency    Proposal identifier.
     *  @return priceFeed   Price Feed configuration of the currency.
     */
    function getPriceFeed(
        address currency
    ) external view returns (DataFeed memory priceFeed);


    /**
     *          Name        Description
     *  @param  currency    Currency address.
     *  @param  price       Price denominated in the currency.
     *  @param  lowerBound  Lower price bound denominated in USD.
     *  @param  upperBound  Upper price bound denominated in USD.
     *  @return isInRange   Whether the price denominated in USD is in range of `[lowerBound, upperBound]`.
     */
    function isPriceInRange(
        address currency,
        uint256 price,
        uint256 lowerBound,
        uint256 upperBound
    ) external view returns (bool isInRange);
}
