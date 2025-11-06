# Solidity API

## PriceWatcher

@author Briky Team

 @notice The `PriceWatcher` contract provides conversion rates between cryptocurrencies and USD. The conversion rates are
         collected from Price Feed. Tokens that has no Price Feed will be set a default conversion rate.

 @dev    Document for Price Feed: https://docs.chain.link/data-feeds/price-feeds
 @dev    ERC-20 tokens are identified by their contract addresses.
         Native coin is represented by the zero address (0x0000000000000000000000000000000000000000).

### receive

```solidity
receive() external payable
```

@notice Executed on a call to this contract with empty calldata.

### version

```solidity
function version() external pure returns (string)
```

@return Version of implementation.

### initialize

```solidity
function initialize(address _admin) external
```

@notice Initialize the contract after deployment, serving as the constructor.

         Name    Description
 @param  _admin  `Admin` contract address.

### updatePriceFeeds

```solidity
function updatePriceFeeds(address[] _currencies, address[] _feeds, uint40[] _heartbeats, bytes[] _signatures) external
```

@notice Update price feeds of multiple currencies.

         Name            Description
 @param  _currencies     Array of updated currency addresses.
 @param  _feeds          Array of new Price Feed contract addresses, respectively for each currency.
 @param  _heartbeats     Array of new acceptable latencies, respectively for each currency.
 @param  _signatures     Array of admin signatures.

 @dev    Administrative operator.
 @dev    Price Feed contracts must support interface `AggregatorV3Interface`.

### updateDefaultRates

```solidity
function updateDefaultRates(address[] _currencies, struct IRate.Rate[] _rates, bytes[] _signatures) external
```

@notice Update default conversion rates of multiple currencies.

         Name            Description
 @param  _currencies     Array of updated currency addresses.
 @param  _rates          Array of new default conversion rates, respectively for each currency.
 @param  _signatures     Array of admin signatures.

 @dev    Administrative operator.

### getPriceFeed

```solidity
function getPriceFeed(address _currency) external view returns (struct IDataFeed.DataFeed)
```

Name            Description
 @param  _currency       Currency address.

 @return Price Feed configuration of the currency.

### getDefaultRate

```solidity
function getDefaultRate(address _currency) external view returns (struct IRate.Rate)
```

Name            Description
 @param  _currency       Currency address.

 @return Default conversion rate of the currency.

### isPriceInRange

```solidity
function isPriceInRange(address _currency, uint256 _price, uint256 _lowerBound, uint256 _upperBound) external view returns (bool)
```

Name            Description
 @param  _currency       Currency address.
 @param  _price          Price denominated in the currency.
 @param  _lowerBound     Lower price bound denominated in USD.
 @param  _upperBound     Upper price bound denominated in USD.

 @return Whether the price denominated in USD is in range of `[lowerBound, upperBound]`.

