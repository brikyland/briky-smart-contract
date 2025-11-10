# Solidity API

## PriceWatcher

The `PriceWatcher` contract provides conversion rates between cryptocurrencies and USD. The conversion rates are
collected from Price Feed. Tokens that has no Price Feed will be set a default conversion rate.

_Document for Price Feed: https://docs.chain.link/data-feeds/price-feeds
   ERC-20 tokens are identified by their contract addresses.
Native coin is represented by the zero address (0x0000000000000000000000000000000000000000)._

### receive

```solidity
receive() external payable
```

Executed on a call to this contract with empty calldata.

### version

```solidity
function version() external pure returns (string)
```

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | string | Version of implementation. |

### initialize

```solidity
function initialize(address _admin) external
```

Initialize the contract after deployment, serving as the constructor.

Name    Description

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _admin | address | `Admin` contract address. |

### updatePriceFeeds

```solidity
function updatePriceFeeds(address[] _currencies, address[] _feeds, uint40[] _heartbeats, bytes[] _signatures) external
```

Update price feeds of multiple currencies.

Name            Description

_Administrative operator.
   Price Feed contracts must support interface `AggregatorV3Interface`._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _currencies | address[] | Array of updated currency addresses. |
| _feeds | address[] | Array of new Price Feed contract addresses, respectively for each currency. |
| _heartbeats | uint40[] | Array of new acceptable latencies, respectively for each currency. |
| _signatures | bytes[] | Array of admin signatures. |

### updateDefaultRates

```solidity
function updateDefaultRates(address[] _currencies, struct IRate.Rate[] _rates, bytes[] _signatures) external
```

Update default conversion rates of multiple currencies.

Name            Description

_Administrative operator._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _currencies | address[] | Array of updated currency addresses. |
| _rates | struct IRate.Rate[] | Array of new default conversion rates, respectively for each currency. |
| _signatures | bytes[] | Array of admin signatures. |

### getPriceFeed

```solidity
function getPriceFeed(address _currency) external view returns (struct IDataFeed.DataFeed)
```

Name            Description

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _currency | address | Currency address. |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | struct IDataFeed.DataFeed | Price Feed configuration of the currency. |

### getDefaultRate

```solidity
function getDefaultRate(address _currency) external view returns (struct IRate.Rate)
```

Name            Description

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _currency | address | Currency address. |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | struct IRate.Rate | Default conversion rate of the currency. |

### isPriceInRange

```solidity
function isPriceInRange(address _currency, uint256 _price, uint256 _lowerBound, uint256 _upperBound) external view returns (bool)
```

Name            Description

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _currency | address | Currency address. |
| _price | uint256 | Price denominated in the currency. |
| _lowerBound | uint256 | Lower price bound denominated in USD. |
| _upperBound | uint256 | Upper price bound denominated in USD. |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | bool | Whether the price denominated in USD is in range of `[lowerBound, upperBound]`. |

