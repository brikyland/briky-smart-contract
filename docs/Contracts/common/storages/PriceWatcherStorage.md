# PriceWatcherStorage

Storage contract for contract `PriceWatcher`.

## priceFeeds

```solidity
mapping(address => struct IDataFeed.DataFeed) priceFeeds
```

{% hint style="info" %}
priceFeeds[currency]
{% endhint %}

## defaultRates

```solidity
mapping(address => struct IRate.Rate) defaultRates
```

{% hint style="info" %}
defaultRates[currency]
{% endhint %}

## admin

```solidity
address admin
```

### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |

