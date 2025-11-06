# Solidity API

## PriceWatcherStorage

@author Briky Team

 @notice Storage contract for contract `PriceWatcher`.

### priceFeeds

```solidity
mapping(address => struct IDataFeed.DataFeed) priceFeeds
```

_priceFeeds[currency]_

### defaultRates

```solidity
mapping(address => struct IRate.Rate) defaultRates
```

_defaultRates[currency]_

### admin

```solidity
address admin
```

Name        Description
 @return admin       `Admin` contract address.

