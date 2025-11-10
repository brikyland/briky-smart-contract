# IReserveVault

Interface for contract `ReserveVault`.

The `ReserveVault` contracts allows providers to open cryptocurrency reserve fund and withdraw them on demand.

{% hint style="info" %}
The fund is determined by a `quantity` value and denominations for each currency.

{% endhint %}

{% hint style="info" %}
Provision or withdrawal operations must specify a `quantity` to indicate equivalent values, calculated by
multiplying with predefined denomination of each currency.

{% endhint %}

{% hint style="info" %}
The fund need to specify a main currency, other extras are optional.
{% endhint %}

## ProviderAuthorization

```solidity
event ProviderAuthorization(address account)
```

Emitted when an account is authorized as a provider.

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| account | address | Authorized address. |

## ProviderDeauthorization

```solidity
event ProviderDeauthorization(address account)
```

Emitted when a provider is deauthorized.

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| account | address | Deauthorized address. |

## NewFund

```solidity
event NewFund(uint256 fundId, address provider, address mainCurrency, uint256 mainDenomination, address[] extraCurrencies, uint256[] extraDenominations)
```

Emitted when a new fund is opened.

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| fundId | uint256 | Fund identifier. |
| provider | address | Provider address. |
| mainCurrency | address | Main currency address. |
| mainDenomination | uint256 | Main currency denomination. |
| extraCurrencies | address[] | Array of extra currency addresses. |
| extraDenominations | uint256[] | Array of extra currency denominations, respective to each extra currency. |

## FundExpansion

```solidity
event FundExpansion(uint256 fundId, uint256 quantity)
```

Emitted when a fund is expanded.

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| fundId | uint256 | Fund identifier. |
| quantity | uint256 | Expanded quantity. |

## FundProvision

```solidity
event FundProvision(uint256 fundId)
```

Emitted when a fund is fully provided.

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| fundId | uint256 | Fund identifier. |

## FundWithdrawal

```solidity
event FundWithdrawal(uint256 fundId, address receiver, uint256 quantity)
```

Emitted when value is withdrawn from a fund.

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| fundId | uint256 | Fund identifier. |
| receiver | address | Receiver address. |
| quantity | uint256 | Withdrawn quantity. |

## AlreadyProvided

```solidity
error AlreadyProvided()
```

===== ERROR ===== *

## InvalidDenomination

```solidity
error InvalidDenomination()
```

## InvalidExpanding

```solidity
error InvalidExpanding()
```

## InvalidFundId

```solidity
error InvalidFundId()
```

## isProvider

```solidity
function isProvider(address account) external view returns (bool isProvider)
```

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| account | address | EVM address. |

### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| isProvider | bool | Whether the account is an authorized provider. |

## fundNumber

```solidity
function fundNumber() external view returns (uint256 fundNumber)
```

### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| fundNumber | uint256 | Number of funds. |

## getFund

```solidity
function getFund(uint256 fundId) external view returns (struct IFund.Fund fund)
```

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| fundId | uint256 | Fund identifier. |

### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| fund | struct IFund.Fund | Configuration and reserves of the fund. |

## isFundSufficient

```solidity
function isFundSufficient(uint256 fundId) external view returns (bool isSufficient)
```

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| fundId | uint256 | Fund identifier. |

### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| isSufficient | bool | Whether the fund is provided sufficiently for the current quantity. |

## openFund

```solidity
function openFund(address mainCurrency, uint256 mainDenomination, address[] extraCurrencies, uint256[] extraDenominations) external returns (uint256 fundId)
```

Open a new fund.

{% hint style="info" %}
Permission: Providers.
{% endhint %}

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| mainCurrency | address | Main currency address. |
| mainDenomination | uint256 | Main currency denomination. |
| extraCurrencies | address[] | Array of extra currency addresses. |
| extraDenominations | uint256[] | Array of extra currency denominations, respective to each extra currency. |

### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| fundId | uint256 | New fund identifier. |

## expandFund

```solidity
function expandFund(uint256 fundId, uint256 quantity) external
```

Expand a fund.

{% hint style="info" %}
Permission: Provider of the fund.
{% endhint %}

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| fundId | uint256 | Fund identifier. |
| quantity | uint256 | Expanded quantity. |

## provideFund

```solidity
function provideFund(uint256 fundId) external payable
```

Provide sufficiently to a fund.

{% hint style="info" %}
Permission: Provider of the fund.
{% endhint %}

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| fundId | uint256 | Fund identifier. |

## withdrawFund

```solidity
function withdrawFund(uint256 fundId, address receiver, uint256 quantity) external
```

Withdraw value from a fund to an account.

{% hint style="info" %}
Permission: Provider of the fund.
{% endhint %}

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| fundId | uint256 | Fund identifier. |
| receiver | address | Receiver address. |
| quantity | uint256 | Withdrawn quantity. |

