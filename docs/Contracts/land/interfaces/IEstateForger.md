# Solidity API

## IEstateForger

Interface for contract `EstateForger`.
The `EstateForger` contract facilitates the tokenization of real estate through community sales. Authorized
custodians select estates and submit tokenization requests. During the sale period, accounts may deposit into these
requests according to the sale configuration. If the deposits of a request reach the liquidation threshold before
the sale concludes, the custodian is granted a limited time window to complete the required administrative
procedures in compliance with local regulations. Tokenization is finalized only if the custodian fulfills these
obligations within the allotted timeframe. In that case, the deposit is transferred to the custodian for
settlement, and depositors may redeem their corresponding portion of a new class of estate token. Otherwise,
depositors are entitled to withdraw their deposits, and the tokenization attempt is deemed unsuccessful.

_Quantities are expressed in absolute units. Scale these values by `10 ** IAssetToken(estateToken).decimals()` to
obtain the correct amounts under the `IAssetToken` convention.
   Implementation involves server-side support.
   ERC-20 tokens are identified by their contract addresses.
Native coin is represented by the zero address (0x0000000000000000000000000000000000000000)._

### BaseUnitPriceRangeUpdate

```solidity
event BaseUnitPriceRangeUpdate(uint256 baseMinUnitPrice, uint256 baseMaxUnitPrice)
```

Emitted when the acceptable range of unit price denominated in USD is updated.

Name                Description

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| baseMinUnitPrice | uint256 | New minimum unit price denominated in USD. |
| baseMaxUnitPrice | uint256 | New maximum unit price denominated in USD. |

### Whitelist

```solidity
event Whitelist(address account)
```

Emitted when an account is whitelisted globally for private sales.

Name       Description

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| account | address | Whitelisted account address. |

### Unwhitelist

```solidity
event Unwhitelist(address account)
```

Emitted when an account is unwhitelisted globally from private sales.

Name       Description

_Not affect whitelist of each request._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| account | address | Unwhitelisted account address. |

### NewRequest

```solidity
event NewRequest(uint256 requestId, uint256 cashbackFundId, address requester, struct IEstateForgerRequest.EstateForgerRequestEstateInput estate, struct IEstateForgerRequest.EstateForgerRequestQuotaInput quota, struct IEstateForgerRequest.EstateForgerRequestQuoteInput quote, struct IEstateForgerRequest.EstateForgerRequestAgendaInput agenda)
```

Emitted when a new tokenization request is submitted.

Name            Description

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| requestId | uint256 | Request identifier. |
| cashbackFundId | uint256 | Cashback fund identifier. |
| requester | address | Requester address. |
| estate | struct IEstateForgerRequest.EstateForgerRequestEstateInput | Initialization input for `EstateForgerRequestEstate` of the request. |
| quota | struct IEstateForgerRequest.EstateForgerRequestQuotaInput | Initialization input for `EstateForgerRequestQuota` of the request. |
| quote | struct IEstateForgerRequest.EstateForgerRequestQuoteInput | Initialization input for `EstateForgerRequestQuote` of the request. |
| agenda | struct IEstateForgerRequest.EstateForgerRequestAgendaInput | Initialization input for `EstateForgerRequestAgenda` of the request. |

### RequestWhitelist

```solidity
event RequestWhitelist(uint256 requestId, address account)
```

Emitted when an account is whitelisted for the private sale of a request.

Name                    Description

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| requestId | uint256 | Request identifier. |
| account | address | Whitelisted account address. |

### RequestUnwhitelist

```solidity
event RequestUnwhitelist(uint256 requestId, address account)
```

Emitted when an account is unwhitelisted from the private sale of a request.

Name                    Description

_Not affect global whitelist._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| requestId | uint256 | Request identifier. |
| account | address | Unwhitelisted account address. |

### RequestCancellation

```solidity
event RequestCancellation(uint256 requestId)
```

Emitted when a request is cancelled.

Name                Description

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| requestId | uint256 | Request identifier. |

### RequestConfirmation

```solidity
event RequestConfirmation(uint256 requestId, uint256 estateId, uint256 soldQuantity, uint256 value, uint256 fee, uint256 cashbackBaseAmount)
```

Emitted when a request is confirmed.

Name                Description

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| requestId | uint256 | Request identifier. |
| estateId | uint256 | Tokenized estate identifier. |
| soldQuantity | uint256 | Total deposited quantity. |
| value | uint256 | Total deposited value. |
| fee | uint256 | Tokenizing fee. |
| cashbackBaseAmount | uint256 | Cashback derived from deposit. |

### RequestAgendaUpdate

```solidity
event RequestAgendaUpdate(uint256 requestId, struct IEstateForgerRequest.EstateForgerRequestAgendaInput agenda)
```

Emitted when the agenda of a request is updated.

Name                Description

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| requestId | uint256 | Request identifier. |
| agenda | struct IEstateForgerRequest.EstateForgerRequestAgendaInput | Initialization input for `EstateForgerRequestAgenda`. |

### RequestEstateURIUpdate

```solidity
event RequestEstateURIUpdate(uint256 requestId, string uri)
```

Emitted when the estate URI of a request is updated.

Name                Description

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| requestId | uint256 | Request identifier. |
| uri | string | URI of estate metadata. |

### Deposit

```solidity
event Deposit(uint256 requestId, address depositor, uint256 quantity, uint256 value)
```

Emitted when a deposition to buy tokens is made.

Name        Description

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| requestId | uint256 | Request identifier. |
| depositor | address | Depositor address. |
| quantity | uint256 | Deposited quantity. |
| value | uint256 | Deposited value. |

### DepositWithdrawal

```solidity
event DepositWithdrawal(uint256 requestId, address depositor, uint256 quantity, uint256 value)
```

Emitted when the sale value of a deposition is withdrawn.

Name        Description

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| requestId | uint256 | Request identifier. |
| depositor | address | Depositor address. |
| quantity | uint256 | Withdrawn quantity. |
| value | uint256 | Withdrawn value. |

### AlreadyCancelled

```solidity
error AlreadyCancelled()
```

===== ERROR ===== *

### AlreadyConfirmed

```solidity
error AlreadyConfirmed()
```

### AlreadyHadDeposit

```solidity
error AlreadyHadDeposit()
```

### AlreadyWithdrawn

```solidity
error AlreadyWithdrawn()
```

### InvalidBroker

```solidity
error InvalidBroker()
```

### InvalidConfirming

```solidity
error InvalidConfirming()
```

### InvalidDepositing

```solidity
error InvalidDepositing()
```

### InvalidRequestId

```solidity
error InvalidRequestId()
```

### InvalidUnitPrice

```solidity
error InvalidUnitPrice()
```

### InvalidWhitelisting

```solidity
error InvalidWhitelisting()
```

### InvalidWithdrawing

```solidity
error InvalidWithdrawing()
```

### MaxSellingQuantityExceeded

```solidity
error MaxSellingQuantityExceeded()
```

### NotEnoughSoldQuantity

```solidity
error NotEnoughSoldQuantity()
```

### NothingToWithdraw

```solidity
error NothingToWithdraw()
```

### NotWhitelistedAccount

```solidity
error NotWhitelistedAccount()
```

### RegisteredAccount

```solidity
error RegisteredAccount()
```

### StillSelling

```solidity
error StillSelling()
```

### Timeout

```solidity
error Timeout()
```

### WhitelistedAccount

```solidity
error WhitelistedAccount()
```

### feeReceiver

```solidity
function feeReceiver() external view returns (address feeReceiver)
```

Name            Description

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| feeReceiver | address | `FeeReceiver` contract address. |

### priceWatcher

```solidity
function priceWatcher() external view returns (address priceWatcher)
```

Name            Description

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| priceWatcher | address | `PriceWatcher` contract address. |

### reserveVault

```solidity
function reserveVault() external view returns (address reserveVault)
```

Name            Description

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| reserveVault | address | `ReserveVault` contract address. |

### baseMinUnitPrice

```solidity
function baseMinUnitPrice() external view returns (uint256 baseMinUnitPrice)
```

Name                Description

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| baseMinUnitPrice | uint256 | Minimum unit price denominated in USD. |

### baseMaxUnitPrice

```solidity
function baseMaxUnitPrice() external view returns (uint256 baseMaxUnitPrice)
```

Name                Description

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| baseMaxUnitPrice | uint256 | Maximum unit price denominated in USD. |

### requestNumber

```solidity
function requestNumber() external view returns (uint256 requestNumber)
```

Name            Description

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| requestNumber | uint256 | Number of requests. |

### getRequest

```solidity
function getRequest(uint256 requestId) external view returns (struct IEstateForgerRequest.EstateForgerRequest request)
```

Name            Description

_Phases of a request:
- Pending: block.timestamp < agenda.saleStartsAt
- Private Sale: agenda.saleStartsAt <= block.timestamp < agenda.privateSaleEndsAt
- Public Sale: agenda.privateSaleEndsAt <= block.timestamp < agenda.publicSaleEndsAt
- Awaiting Confirmation: agenda.publicSaleEndsAt
<= block.timestamp
< agenda.publicSaleEndsAt + EstateForgerConstant.SALE_CONFIRMATION_TIME_LIMIT
- Confirmed: estate.estateId > 0
- Cancelled: quota.totalSupply = 0_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| requestId | uint256 | Request identifier. |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| request | struct IEstateForgerRequest.EstateForgerRequest | Configuration and progress of the request. |

### deposits

```solidity
function deposits(uint256 requestId, address account) external view returns (uint256 quantity)
```

Name            Description

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| requestId | uint256 | Request identifier. |
| account | address | EVM address. |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| quantity | uint256 | Deposited quantity of the account in the request. |

### withdrawAt

```solidity
function withdrawAt(uint256 requestId, address account) external view returns (uint256 withdrawAt)
```

Name            Description

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| requestId | uint256 | Request identifier. |
| account | address | EVM address. |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| withdrawAt | uint256 | Withdrawal timestamp of the account in the request. |

### requestTokenization

```solidity
function requestTokenization(address requester, struct IEstateForgerRequest.EstateForgerRequestEstateInput estate, struct IEstateForgerRequest.EstateForgerRequestQuotaInput quota, struct IEstateForgerRequest.EstateForgerRequestQuoteInput quote, struct IEstateForgerRequest.EstateForgerRequestAgendaInput agenda, struct IValidation.Validation validation) external returns (uint256 requestId)
```

Request a new estate to be tokenized.

Name            Description

_Permission: Executives active in the zone of the estate.
   Total sale duration must be no less than `EstateForgerConstant.SALE_MINIMUM_DURATION`.
   Validation data:
```
data = abi.encode(
requester,
estate.uri
);
```_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| requester | address | Requester address. |
| estate | struct IEstateForgerRequest.EstateForgerRequestEstateInput | Initialization input for `EstateForgerRequestEstate` of the request. |
| quota | struct IEstateForgerRequest.EstateForgerRequestQuotaInput | Initialization input for `EstateForgerRequestQuota` of the request. |
| quote | struct IEstateForgerRequest.EstateForgerRequestQuoteInput | Initialization input for `EstateForgerRequestQuote` of the request. |
| agenda | struct IEstateForgerRequest.EstateForgerRequestAgendaInput | Initialization input for `EstateForgerRequestAgenda` of the request. |
| validation | struct IValidation.Validation | Validation package from the validator. |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| requestId | uint256 | New request identifier. |

### cancel

```solidity
function cancel(uint256 requestId) external
```

Cancel a request.
Cancel only before the request is either confirmed or cancelled.

Name            Description

_Permission: Managers active in the zone of the estate._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| requestId | uint256 | Request identifier. |

### deposit

```solidity
function deposit(uint256 requestId, uint256 quantity) external payable returns (uint256 value)
```

Deposit to a request.
Deposit only during sale period. Only accounts whitelisted globally or specifically for the request can deposit during the private sale.

Name            Description

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| requestId | uint256 | Request identifier. |
| quantity | uint256 | Deposited quantity. |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| value | uint256 | Deposited value. |

### updateRequestEstateURI

```solidity
function updateRequestEstateURI(uint256 requestId, string uri, struct IValidation.Validation validation) external
```

Update the URI of estate metadata of a request.
Update only before the request is either confirmed or cancelled.

Name            Description

_Permission: Executives active in the zone of the estate.
   Validation data:
```
data = abi.encode(
requestId,
uri
);
```_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| requestId | uint256 | Request identifier. |
| uri | string | New URI of estate metadata. |
| validation | struct IValidation.Validation | Validation package from the validator. |

### updateRequestAgenda

```solidity
function updateRequestAgenda(uint256 requestId, struct IEstateForgerRequest.EstateForgerRequestAgendaInput agenda) external
```

Update the agenda of a request.
Update only before any account deposits.

Name            Description

_Permission: Executives active in the zone of the estate.
   Total sale duration must be no less than `EstateForgerConstant.SALE_MINIMUM_DURATION`.
   Can only update `saleStartsAt` before the sale actually starts. If its corresponding input is 0, the timestamp
remains unchanged._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| requestId | uint256 | Request identifier. |
| agenda | struct IEstateForgerRequest.EstateForgerRequestAgendaInput | Initialization input for `EstateForgerRequestAgenda`. |

### whitelistFor

```solidity
function whitelistFor(uint256 requestId, address[] accounts, bool isWhitelisted) external
```

Whitelist or unwhitelist accounts for participation in the private sale of a specific request.
Whitelist only before the private sale ends.

Name            Description

_Permission: Executives active in the zone of the estate._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| requestId | uint256 | Request identifier. |
| accounts | address[] | Array of EVM address. |
| isWhitelisted | bool | Whether the operation is whitelisting or unwhitelisting. |

### withdrawDeposit

```solidity
function withdrawDeposit(uint256 requestId) external returns (uint256 value)
```

Withdraw the deposit of the message sender from a request which can no longer be confirmed.
Withdraw only when the request is cancelled or the sale ends without enough sold quantity or the confirmation
time limit has expired.

Name            Description

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| requestId | uint256 | Request identifier. |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| value | uint256 | Withdrawn value. |

### safeConfirm

```solidity
function safeConfirm(uint256 requestId, bytes32 anchor) external payable returns (uint256 estateId)
```

Confirm a request to be tokenized.
Confirm only if the request has sold at least minimum quantity (even if the sale period has not yet ended) and
before the confirmation time limit has expired.
The message sender must provide sufficient extra-currency amounts for the cashback fund.

Name        Description

_Permission: Managers active in the zone of the estate._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| requestId | uint256 | Request identifier. |
| anchor | bytes32 | Keccak256 hash of `estate.uri` of the request. |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| estateId | uint256 | New estate token identifier. |

### safeDeposit

```solidity
function safeDeposit(uint256 requestId, uint256 quantity, bytes32 anchor) external payable returns (uint256 value)
```

Deposit to a request.
Deposit only during sale period. Only accounts whitelisted globally or specifically for the request can deposit during the private sale.

Name        Description

_Anchor enforces consistency between this contract and the client-side._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| requestId | uint256 | Request identifier. |
| quantity | uint256 | Deposited quantity. |
| anchor | bytes32 | Keccak256 hash of `estate.uri` of the request. |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| value | uint256 | Deposited value. |

