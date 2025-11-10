# EstateForger

The `EstateForger` contract facilitates the tokenization of real estate through community sales. Authorized
custodians select estates and submit tokenization requests. During the sale period, accounts may deposit into these
requests according to the sale configuration. If the deposits of a request reach the liquidation threshold before
the sale concludes, the custodian is granted a limited time window to complete the required administrative
procedures in compliance with local regulations. Tokenization is finalized only if the custodian fulfills these
obligations within the allotted timeframe. In that case, the deposit is transferred to the custodian for
settlement, and depositors may redeem their corresponding portion of a new class of estate token. Otherwise,
depositors are entitled to withdraw their deposits, and the tokenization attempt is deemed unsuccessful.

{% hint style="info" %}
Quantities are expressed in absolute units. Scale these values by `10 ** IAssetToken(estateToken).decimals()` to
obtain the correct amounts under the `IAssetToken` convention.

{% endhint %}

{% hint style="info" %}
Implementation involves server-side support.

{% endhint %}

{% hint style="info" %}
ERC-20 tokens are identified by their contract addresses.
Native coin is represented by the zero address (0x0000000000000000000000000000000000000000).
{% endhint %}

## validRequest

```solidity
modifier validRequest(uint256 _requestId)
```

Verify a valid request identifier.

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _requestId | uint256 | Request identifier. |

## onlyActiveInZoneOf

```solidity
modifier onlyActiveInZoneOf(uint256 _requestId)
```

Verify the message sender is active in the zone of the estate of the request.

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _requestId | uint256 | Request identifier. |

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
function initialize(address _admin, address _estateToken, address _commissionToken, address _priceWatcher, address _feeReceiver, address _reserveVault, address _validator, uint256 _baseMinUnitPrice, uint256 _baseMaxUnitPrice) external
```

Initialize the contract after deployment, serving as the constructor.

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _admin | address | `Admin` contract address. |
| _estateToken | address | `EstateToken` contract address. |
| _commissionToken | address | `CommissionToken` contract address. |
| _priceWatcher | address | `PriceWatcher` contract address. |
| _feeReceiver | address | `FeeReceiver` contract address. |
| _reserveVault | address | `ReserveVault` contract address. |
| _validator | address | Validator address. |
| _baseMinUnitPrice | uint256 | Minimum unit price denominated in USD. |
| _baseMaxUnitPrice | uint256 | Maximum unit price denominated in USD. |

## updateBaseUnitPriceRange

```solidity
function updateBaseUnitPriceRange(uint256 _baseMinUnitPrice, uint256 _baseMaxUnitPrice, bytes[] _signatures) external
```

Update the acceptable range of unit price denominated in USD.

{% hint style="info" %}
Administrative operator.
{% endhint %}

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _baseMinUnitPrice | uint256 | New minimum unit price denominated in USD. |
| _baseMaxUnitPrice | uint256 | New maximum unit price denominated in USD. |
| _signatures | bytes[] | Array of admin signatures. |

## whitelist

```solidity
function whitelist(address[] _accounts, bool _isWhitelisted, bytes[] _signatures) external
```

Whitelist or unwhitelist globally multiple addresses for private sales.

{% hint style="info" %}
Administrative operator.
{% endhint %}

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _accounts | address[] | Array of EVM addresses. |
| _isWhitelisted | bool | Whether the operation is whitelisting or unwhitelisting. |
| _signatures | bytes[] | Array of admin signatures. |

## getRequest

```solidity
function getRequest(uint256 _requestId) external view returns (struct IEstateForgerRequest.EstateForgerRequest)
```

{% hint style="info" %}
Phases of a request:
- Pending: block.timestamp < agenda.saleStartsAt
- Private Sale: agenda.saleStartsAt <= block.timestamp < agenda.privateSaleEndsAt
- Public Sale: agenda.privateSaleEndsAt <= block.timestamp <= agenda.publicSaleEndsAt
- Awaiting Confirmation: agenda.publicSaleEndsAt
                            <= block.timestamp
                            < agenda.publicSaleEndsAt + EstateForgerConstant.SALE_CONFIRMATION_TIME_LIMIT
- Confirmed: estate.estateId > 0
- Cancelled: quota.totalSupply = 0
{% endhint %}

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _requestId | uint256 | Request identifier. |

### Return Values

Configuration and progress of the request.

## isTokenized

```solidity
function isTokenized(uint256 _requestId) external view returns (bool)
```

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _requestId | uint256 | Request identifier. |

### Return Values

Whether the request has been confirmed and tokenized.

## allocationOfAt

```solidity
function allocationOfAt(address _account, uint256 _requestId, uint256 _at) external view returns (uint256)
```

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _account | address | Account address. |
| _requestId | uint256 | Request identifier. |
| _at | uint256 | Reference timestamp. |

### Return Values

Allocation of the account at the reference timestamp.

## supportsInterface

```solidity
function supportsInterface(bytes4 _interfaceId) public view virtual returns (bool)
```

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _interfaceId | bytes4 | Interface identifier. |

### Return Values

Whether this contract supports the interface.

## requestTokenization

```solidity
function requestTokenization(address _requester, struct IEstateForgerRequest.EstateForgerRequestEstateInput _estate, struct IEstateForgerRequest.EstateForgerRequestQuotaInput _quota, struct IEstateForgerRequest.EstateForgerRequestQuoteInput _quote, struct IEstateForgerRequest.EstateForgerRequestAgendaInput _agenda, struct IValidation.Validation _validation) external returns (uint256)
```

Request a new estate to be tokenized.

{% hint style="info" %}
Permission: Executives active in the zone of the estate.

{% endhint %}

{% hint style="info" %}
Total sale duration must be no less than `EstateForgerConstant.SALE_MINIMUM_DURATION`.
{% endhint %}

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _requester | address | Requester address. |
| _estate | struct IEstateForgerRequest.EstateForgerRequestEstateInput | Initialization input for `EstateForgerRequestEstate` of the request. |
| _quota | struct IEstateForgerRequest.EstateForgerRequestQuotaInput | Initialization input for `EstateForgerRequestQuota` of the request. |
| _quote | struct IEstateForgerRequest.EstateForgerRequestQuoteInput | Initialization input for `EstateForgerRequestQuote` of the request. |
| _agenda | struct IEstateForgerRequest.EstateForgerRequestAgendaInput | Initialization input for `EstateForgerRequestAgenda` of the request. |
| _validation | struct IValidation.Validation | Validation package from the validator. |

### Return Values

New request identifier.

## whitelistFor

```solidity
function whitelistFor(uint256 _requestId, address[] _accounts, bool _isWhitelisted) external
```

Whitelist or unwhitelist accounts for participation in the private sale of a specific request.

Whitelist only before the private sale ends.

{% hint style="info" %}
Permission: Executives active in the zone of the estate.
{% endhint %}

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _requestId | uint256 | Request identifier. |
| _accounts | address[] | Array of EVM addresses. |
| _isWhitelisted | bool | Whether the operation is whitelisting or unwhitelisting. |

## updateRequestEstateURI

```solidity
function updateRequestEstateURI(uint256 _requestId, string _uri, struct IValidation.Validation _validation) external
```

Update the URI of estate metadata of a request.

Update only before the request is either confirmed or cancelled.

{% hint style="info" %}
Permission: Executives active in the zone of the estate.
{% endhint %}

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _requestId | uint256 | Request identifier. |
| _uri | string | New URI of estate metadata. |
| _validation | struct IValidation.Validation | Validation package from the validator. |

## updateRequestAgenda

```solidity
function updateRequestAgenda(uint256 _requestId, struct IEstateForgerRequest.EstateForgerRequestAgendaInput _agenda) external
```

Update the agenda of a request.

Update only before any account deposits.

{% hint style="info" %}
Permission: Executives active in the zone of the estate.

{% endhint %}

{% hint style="info" %}
Total sale duration must be no less than `EstateForgerConstant.SALE_MINIMUM_DURATION`.

{% endhint %}

{% hint style="info" %}
Can only update `saleStartsAt` before the sale actually starts. If its corresponding input is 0, the timestamp
remains unchanged.
{% endhint %}

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _requestId | uint256 | Request identifier. |
| _agenda | struct IEstateForgerRequest.EstateForgerRequestAgendaInput | Initialization input for `EstateForgerRequestAgenda`. |

## cancel

```solidity
function cancel(uint256 _requestId) external
```

Cancel a request.

Cancel only before the request is either confirmed or cancelled.

{% hint style="info" %}
Permission: Managers active in the zone of the estate.
{% endhint %}

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _requestId | uint256 | Request identifier. |

## deposit

```solidity
function deposit(uint256 _requestId, uint256 _quantity) external payable returns (uint256)
```

Deposit to purchase tokens in a request.

Deposit only during sale period. Only accounts whitelisted globally or specifically for the request can deposit during the private sale.

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _requestId | uint256 | Request identifier. |
| _quantity | uint256 | Deposited quantity. |

### Return Values

Deposited value.

## safeDeposit

```solidity
function safeDeposit(uint256 _requestId, uint256 _quantity, bytes32 _anchor) external payable returns (uint256)
```

Deposit to a request.

Deposit only during sale period. Only accounts whitelisted globally or specifically for the request can deposit during the private sale.

{% hint style="info" %}
Anchor enforces consistency between this contract and the client-side.
{% endhint %}

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _requestId | uint256 | Request identifier. |
| _quantity | uint256 | Deposited quantity. |
| _anchor | bytes32 | Keccak256 hash of `estate.uri` of the request. |

### Return Values

Deposited value.

## safeConfirm

```solidity
function safeConfirm(uint256 _requestId, bytes32 _anchor) external payable returns (uint256)
```

Confirm a request to be tokenized.

Confirm only if the request has sold at least minimum quantity (even if the sale period has not yet ended) and
before the confirmation time limit has expired.

The message sender must provide sufficient extra-currency amounts for the cashback fund.

{% hint style="info" %}
Permission: Managers active in the zone of the estate.
{% endhint %}

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _requestId | uint256 | Request identifier. |
| _anchor | bytes32 | Keccak256 hash of `estate.uri` of the request. |

### Return Values

New estate token identifier.

## withdrawDeposit

```solidity
function withdrawDeposit(uint256 _requestId) external returns (uint256)
```

Withdraw the deposit of the message sender from a request which can no longer be confirmed.

Withdraw only if the request is cancelled or the sale ends without enough sold quantity or the confirmation
time limit has expired.

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _requestId | uint256 | Request identifier. |

### Return Values

Withdrawn value.

## withdrawEstateToken

```solidity
function withdrawEstateToken(uint256 _requestId) external returns (uint256)
```

Withdraw the allocation of the message sender from a tokenization.

Withdraw only after the request is confirmed.

Also receive corresponding cashback.

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _requestId | uint256 | Request identifier. |

### Return Values

Withdrawn amount.

## _deposit

```solidity
function _deposit(uint256 _requestId, uint256 _quantity) internal returns (uint256)
```

Deposit to a request.

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _requestId | uint256 | Request identifier. |
| _quantity | uint256 | Deposited quantity. |

### Return Values

Deposited value.

## _provideCashbackFund

```solidity
function _provideCashbackFund(uint256 _cashbackFundId) internal returns (uint256)
```

Provide cashback fund in the main currency, using a sufficient portion of the tokenization fee and in other
extras, using amounts forwarded from the message sender.

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _cashbackFundId | uint256 | Cashback fund identifier. |

### Return Values

Main currency cashback value.

