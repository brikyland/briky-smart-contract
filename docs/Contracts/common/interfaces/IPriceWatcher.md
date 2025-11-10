# IPriceWatcher

Interface for contract `PriceWatcher`.

The `PriceWatcher` contract provides conversion rates between cryptocurrencies and USD. The conversion rates are
collected from Price Feed. Tokens that has no Price Feed will be set a default conversion rate.

{% hint style="info" %}
Document for Price Feed: https://docs.chain.link/data-feeds/price-feeds

{% endhint %}

{% hint style="info" %}
ERC-20 tokens are identified by their contract addresses.
Native coin is represented by the zero address (0x0000000000000000000000000000000000000000).
{% endhint %}

## DefaultRateUpdate

```solidity
event DefaultRateUpdate(address currency, struct IRate.Rate rate)
```

Emitted when the default conversion rate of a currency is updated.

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| currency | address | Currency address. |
| rate | struct IRate.Rate | New default conversion rate. |

## PriceFeedUpdate

```solidity
event PriceFeedUpdate(address currency, address feed, uint40 heartbeat)
```

Emitted when Price Feed configuration of a currency is updated.

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| currency | address | Currency address. |
| feed | address | New Price Feed contract. |
| heartbeat | uint40 | New acceptable latency. |

## InvalidPriceFeedData

```solidity
error InvalidPriceFeedData()
```

===== ERROR ===== *

## MissingCurrencyRate

```solidity
error MissingCurrencyRate()
```

## StalePriceFeed

```solidity
error StalePriceFeed()
```

## getDefaultRate

```solidity
function getDefaultRate(address currency) external view returns (struct IRate.Rate rate)
```

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| currency | address | Proposal identifier. |

### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| rate | struct IRate.Rate | Default conversion rate of the currency. |

## getPriceFeed

```solidity
function getPriceFeed(address currency) external view returns (struct IDataFeed.DataFeed priceFeed)
```

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| currency | address | Proposal identifier. |

### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| priceFeed | struct IDataFeed.DataFeed | Price Feed configuration of the currency. |

## isPriceInRange

```solidity
function isPriceInRange(address currency, uint256 price, uint256 lowerBound, uint256 upperBound) external view returns (bool isInRange)
```

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| currency | address | Currency address. |
| price | uint256 | Price denominated in the currency. |
| lowerBound | uint256 | Lower price bound denominated in USD. |
| upperBound | uint256 | Upper price bound denominated in USD. |

### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| isInRange | bool | Whether the price denominated in USD is in range of `[lowerBound, upperBound]`. |

