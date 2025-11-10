# ReserveVault

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

## validFund

```solidity
modifier validFund(uint256 _fundId)
```

Verify a valid fund identifier.

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _fundId | uint256 | Fund identifier. |

## onlyProvider

```solidity
modifier onlyProvider(uint256 _fundId)
```

Verify the message sender is the provider of a fund.

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _fundId | uint256 | Fund identifier. |

## receive

```solidity
receive() external payable
```

Executed on a call to this contract with empty calldata.

## version

```solidity
function version() external pure returns (string)
```

### Return Values

Version of implementation.

## initialize

```solidity
function initialize(address _admin) external
```

Initialize the contract after deployment, serving as the constructor.

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _admin | address | Admin` contract address. |

## authorizeProviders

```solidity
function authorizeProviders(address[] _accounts, bool _isProvider, bytes[] _signatures) external
```

Authorize or deauthorize addresses as providers.

{% hint style="info" %}
Administrative operator.
{% endhint %}

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _accounts | address[] | Array of EVM addresses. |
| _isProvider | bool | Whether the operation is authorizing or deauthorizing. |
| _signatures | bytes[] | Array of admin signatures. |

## getFund

```solidity
function getFund(uint256 _fundId) external view returns (struct IFund.Fund)
```

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _fundId | uint256 | Fund identifier. |

### Return Values

Configuration and reserves of the fund.

## isFundSufficient

```solidity
function isFundSufficient(uint256 _fundId) external view returns (bool)
```

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _fundId | uint256 | Fund identifier. |

### Return Values

Whether the fund is provided sufficiently for the current quantity.

## openFund

```solidity
function openFund(address _mainCurrency, uint256 _mainDenomination, address[] _extraCurrencies, uint256[] _extraDenominations) external returns (uint256)
```

Open a new fund.

{% hint style="info" %}
Permission: Providers.
{% endhint %}

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _mainCurrency | address | Main currency address. |
| _mainDenomination | uint256 | Main currency denomination. |
| _extraCurrencies | address[] | Array of extra currency addresses. |
| _extraDenominations | uint256[] | Array of extra currency denominations, respective to each extra currency. |

### Return Values

New fund identifier.

## expandFund

```solidity
function expandFund(uint256 _fundId, uint256 _quantity) external
```

Expand a fund.

{% hint style="info" %}
Permission: Provider of the fund.
{% endhint %}

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _fundId | uint256 | Fund identifier. |
| _quantity | uint256 | Expanded quantity. |

## provideFund

```solidity
function provideFund(uint256 _fundId) external payable
```

Provide sufficiently to a fund.

{% hint style="info" %}
Permission: Provider of the fund.
{% endhint %}

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _fundId | uint256 | Fund identifier. |

## withdrawFund

```solidity
function withdrawFund(uint256 _fundId, address _receiver, uint256 _quantity) external
```

Withdraw from a fund to an account.

{% hint style="info" %}
Permission: Provider of the fund.
{% endhint %}

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _fundId | uint256 | Fund identifier. |
| _receiver | address | Receiver address. |
| _quantity | uint256 | Withdrawn quantity. |

