# Solidity API

## PriceWatcherStorage

Storage contract for contract `PriceWatcher`.

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

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |

