# Solidity API

## IReserveVault

Interface for contract `ReserveVault`.
The `ReserveVault` contracts allows providers to open cryptocurrency reserve fund and withdraw them on demand.

_The fund is determined by a `quantity` value and denominations for each currency.
   Provision or withdrawal operations must specify a `quantity` to indicate equivalent values, calculated by
multiplying with predefined denomination of each currency.
   The fund need to specify a main currency, other extras are optional._

### ProviderAuthorization

```solidity
event ProviderAuthorization(address account)
```

Emitted when an account is authorized as a provider.

Name        Description

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| account | address | Authorized address. |

### ProviderDeauthorization

```solidity
event ProviderDeauthorization(address account)
```

Emitted when a provider is deauthorized.

Name        Description

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| account | address | Deauthorized address. |

### NewFund

```solidity
event NewFund(uint256 fundId, address provider, address mainCurrency, uint256 mainDenomination, address[] extraCurrencies, uint256[] extraDenominations)
```

Emitted when a new fund is opened.

Name                Description

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| fundId | uint256 | Fund identifier. |
| provider | address | Provider address. |
| mainCurrency | address | Main currency address. |
| mainDenomination | uint256 | Main currency denomination. |
| extraCurrencies | address[] | Array of extra currency addresses. |
| extraDenominations | uint256[] | Array of extra currency denominations, respective to each extra currency. |

### FundExpansion

```solidity
event FundExpansion(uint256 fundId, uint256 quantity)
```

Emitted when a fund is expanded.

Name                Description

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| fundId | uint256 | Fund identifier. |
| quantity | uint256 | Expanded quantity. |

### FundProvision

```solidity
event FundProvision(uint256 fundId)
```

Emitted when a fund is fully provided.

Name                Description

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| fundId | uint256 | Fund identifier. |

### FundWithdrawal

```solidity
event FundWithdrawal(uint256 fundId, address receiver, uint256 quantity)
```

Emitted when value is withdrawn from a fund.

Name                Description

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| fundId | uint256 | Fund identifier. |
| receiver | address | Receiver address. |
| quantity | uint256 | Withdrawn quantity. |

### AlreadyProvided

```solidity
error AlreadyProvided()
```

===== ERROR ===== *

### InvalidDenomination

```solidity
error InvalidDenomination()
```

### InvalidExpanding

```solidity
error InvalidExpanding()
```

### InvalidFundId

```solidity
error InvalidFundId()
```

### isProvider

```solidity
function isProvider(address account) external view returns (bool isProvider)
```

Name        Description

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| account | address | EVM address. |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| isProvider | bool | Whether the account is an authorized provider. |

### fundNumber

```solidity
function fundNumber() external view returns (uint256 fundNumber)
```

Name        Description

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| fundNumber | uint256 | Number of funds. |

### getFund

```solidity
function getFund(uint256 fundId) external view returns (struct IFund.Fund fund)
```

Name            Description

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| fundId | uint256 | Fund identifier. |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| fund | struct IFund.Fund | Configuration and reserves of the fund. |

### isFundSufficient

```solidity
function isFundSufficient(uint256 fundId) external view returns (bool isSufficient)
```

Name            Description

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| fundId | uint256 | Fund identifier. |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| isSufficient | bool | Whether the fund is provided sufficiently for the current quantity. |

### openFund

```solidity
function openFund(address mainCurrency, uint256 mainDenomination, address[] extraCurrencies, uint256[] extraDenominations) external returns (uint256 fundId)
```

Open a new fund.

Name                Description

_Permission: Providers._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| mainCurrency | address | Main currency address. |
| mainDenomination | uint256 | Main currency denomination. |
| extraCurrencies | address[] | Array of extra currency addresses. |
| extraDenominations | uint256[] | Array of extra currency denominations, respective to each extra currency. |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| fundId | uint256 | New fund identifier. |

### expandFund

```solidity
function expandFund(uint256 fundId, uint256 quantity) external
```

Expand a fund.

Name                Description

_Permission: Provider of the fund._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| fundId | uint256 | Fund identifier. |
| quantity | uint256 | Expanded quantity. |

### provideFund

```solidity
function provideFund(uint256 fundId) external payable
```

Provide sufficiently to a fund.

Name                Description

_Permission: Provider of the fund._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| fundId | uint256 | Fund identifier. |

### withdrawFund

```solidity
function withdrawFund(uint256 fundId, address receiver, uint256 quantity) external
```

Withdraw value from a fund to an account.

Name                Description

_Permission: Provider of the fund._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| fundId | uint256 | Fund identifier. |
| receiver | address | Receiver address. |
| quantity | uint256 | Withdrawn quantity. |

