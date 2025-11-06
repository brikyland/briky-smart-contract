# Solidity API

## IPriceWatcher

@author Briky Team

 @notice Interface for contract `PriceWatcher`.
 @notice The `PriceWatcher` contract provides conversion rates between cryptocurrencies and USD. The conversion rates are
         collected from Price Feed. Tokens that has no Price Feed will be set a default conversion rate.

 @dev    Document for Price Feed: https://docs.chain.link/data-feeds/price-feeds
 @dev    ERC-20 tokens are identified by their contract addresses.
         Native coin is represented by the zero address (0x0000000000000000000000000000000000000000).

### DefaultRateUpdate

```solidity
event DefaultRateUpdate(address currency, struct IRate.Rate rate)
```

@notice Emitted when the default conversion rate of a currency is updated.

         Name        Description
 @param  currency    Currency address.
 @param  rate        New default conversion rate.

### PriceFeedUpdate

```solidity
event PriceFeedUpdate(address currency, address feed, uint40 heartbeat)
```

@notice Emitted when Price Feed configuration of a currency is updated.

         Name        Description
 @param  currency    Currency address.
 @param  feed        New Price Feed contract.
 @param  heartbeat   New acceptable latency.

### InvalidPriceFeedData

```solidity
error InvalidPriceFeedData()
```

===== ERROR ===== *

### MissingCurrencyRate

```solidity
error MissingCurrencyRate()
```

### StalePriceFeed

```solidity
error StalePriceFeed()
```

### getDefaultRate

```solidity
function getDefaultRate(address currency) external view returns (struct IRate.Rate rate)
```

Name        Description
 @param  currency    Proposal identifier.
 @return rate        Default conversion rate of the currency.

### getPriceFeed

```solidity
function getPriceFeed(address currency) external view returns (struct IDataFeed.DataFeed priceFeed)
```

Name        Description
 @param  currency    Proposal identifier.
 @return priceFeed   Price Feed configuration of the currency.

### isPriceInRange

```solidity
function isPriceInRange(address currency, uint256 price, uint256 lowerBound, uint256 upperBound) external view returns (bool isInRange)
```

Name        Description
 @param  currency    Currency address.
 @param  price       Price denominated in the currency.
 @param  lowerBound  Lower price bound denominated in USD.
 @param  upperBound  Upper price bound denominated in USD.
 @return isInRange   Whether the price denominated in USD is in range of `[lowerBound, upperBound]`.

