# Solidity API

## IEstateForger

@author Briky Team

 @notice Interface for contract `EstateForger`.
 @notice The `EstateForger` contract facilitates the tokenization of real estate through community sales. Authorized
         custodians select estates and submit tokenization requests. During the sale period, accounts may deposit into these
         requests according to the sale configuration. If the deposits of a request reach the liquidation threshold before
         the sale concludes, the custodian is granted a limited time window to complete the required administrative
         procedures in compliance with local regulations. Tokenization is finalized only if the custodian fulfills these
         obligations within the allotted timeframe. In that case, the deposit is transferred to the custodian for
         settlement, and depositors may redeem their corresponding portion of a new class of estate token. Otherwise,
         depositors are entitled to withdraw their deposits, and the tokenization attempt is deemed unsuccessful.

 @dev    Quantities are expressed in absolute units. Scale these values by `10 ** IAssetToken(estateToken).decimals()` to
         obtain the correct amounts under the `IAssetToken` convention.
 @dev    Implementation involves server-side support.
 @dev    ERC-20 tokens are identified by their contract addresses.
         Native coin is represented by the zero address (0x0000000000000000000000000000000000000000).

### BaseUnitPriceRangeUpdate

```solidity
event BaseUnitPriceRangeUpdate(uint256 baseMinUnitPrice, uint256 baseMaxUnitPrice)
```

@notice Emitted when the acceptable range of unit price denominated in USD is updated.

         Name                Description
 @param  baseMinUnitPrice    New minimum unit price denominated in USD.
 @param  baseMaxUnitPrice    New maximum unit price denominated in USD.

### Whitelist

```solidity
event Whitelist(address account)
```

@notice Emitted when an account is whitelisted globally for private sales.

         Name       Description
 @param  account    Whitelisted account address.

### Unwhitelist

```solidity
event Unwhitelist(address account)
```

@notice Emitted when an account is unwhitelisted globally from private sales.

         Name       Description
 @param  account    Unwhitelisted account address.

 @dev    Not affect whitelist of each request.

### NewRequest

```solidity
event NewRequest(uint256 requestId, uint256 cashbackFundId, address requester, struct IEstateForgerRequest.EstateForgerRequestEstateInput estate, struct IEstateForgerRequest.EstateForgerRequestQuotaInput quota, struct IEstateForgerRequest.EstateForgerRequestQuoteInput quote, struct IEstateForgerRequest.EstateForgerRequestAgendaInput agenda)
```

@notice Emitted when a new tokenization request is submitted.

         Name            Description
 @param  requestId       Request identifier.
 @param  cashbackFundId  Cashback fund identifier.
 @param  requester       Requester address.
 @param  estate          Initialization input for `EstateForgerRequestEstate` of the request.
 @param  quota           Initialization input for `EstateForgerRequestQuota` of the request.
 @param  quote           Initialization input for `EstateForgerRequestQuote` of the request.
 @param  agenda          Initialization input for `EstateForgerRequestAgenda` of the request.

### RequestWhitelist

```solidity
event RequestWhitelist(uint256 requestId, address account)
```

@notice Emitted when an account is whitelisted for the private sale of a request.

         Name                    Description
 @param  requestId               Request identifier.
 @param  account                 Whitelisted account address.

### RequestUnwhitelist

```solidity
event RequestUnwhitelist(uint256 requestId, address account)
```

@notice Emitted when an account is unwhitelisted from the private sale of a request.

         Name                    Description
 @param  requestId               Request identifier.
 @param  account                 Unwhitelisted account address.

 @dev    Not affect global whitelist.

### RequestCancellation

```solidity
event RequestCancellation(uint256 requestId)
```

@notice Emitted when a request is cancelled.

         Name                Description
 @param  requestId           Request identifier.

### RequestConfirmation

```solidity
event RequestConfirmation(uint256 requestId, uint256 estateId, uint256 soldQuantity, uint256 value, uint256 fee, uint256 cashbackBaseAmount)
```

@notice Emitted when a request is confirmed.

         Name                Description
 @param  requestId           Request identifier.
 @param  estateId            Tokenized estate identifier.
 @param  soldQuantity        Total deposited quantity.
 @param  value               Total deposited value.
 @param  fee                 Tokenizing fee.
 @param  cashbackBaseAmount  Cashback derived from deposit.

### RequestAgendaUpdate

```solidity
event RequestAgendaUpdate(uint256 requestId, struct IEstateForgerRequest.EstateForgerRequestAgendaInput agenda)
```

@notice Emitted when the agenda of a request is updated.

         Name                Description
 @param  requestId           Request identifier.
 @param  agenda              Initialization input for `EstateForgerRequestAgenda`.

### RequestEstateURIUpdate

```solidity
event RequestEstateURIUpdate(uint256 requestId, string uri)
```

@notice Emitted when the estate URI of a request is updated.

         Name                Description
 @param  requestId           Request identifier.
 @param  uri                 URI of estate metadata.

### Deposit

```solidity
event Deposit(uint256 requestId, address depositor, uint256 quantity, uint256 value)
```

@notice Emitted when a deposition to buy tokens is made.

         Name        Description
 @param  requestId   Request identifier.
 @param  depositor   Depositor address.
 @param  quantity    Deposited quantity.
 @param  value       Deposited value.

### DepositWithdrawal

```solidity
event DepositWithdrawal(uint256 requestId, address depositor, uint256 quantity, uint256 value)
```

@notice Emitted when the sale value of a deposition is withdrawn.

         Name        Description
 @param  requestId   Request identifier.
 @param  depositor   Depositor address.
 @param  quantity    Withdrawn quantity.
 @param  value       Withdrawn value.

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
 @return feeReceiver     `FeeReceiver` contract address.

### priceWatcher

```solidity
function priceWatcher() external view returns (address priceWatcher)
```

Name            Description
 @return priceWatcher    `PriceWatcher` contract address.

### reserveVault

```solidity
function reserveVault() external view returns (address reserveVault)
```

Name            Description
 @return reserveVault    `ReserveVault` contract address.

### baseMinUnitPrice

```solidity
function baseMinUnitPrice() external view returns (uint256 baseMinUnitPrice)
```

Name                Description
 @return baseMinUnitPrice    Minimum unit price denominated in USD.

### baseMaxUnitPrice

```solidity
function baseMaxUnitPrice() external view returns (uint256 baseMaxUnitPrice)
```

Name                Description
 @return baseMaxUnitPrice    Maximum unit price denominated in USD.

### requestNumber

```solidity
function requestNumber() external view returns (uint256 requestNumber)
```

Name            Description
 @return requestNumber   Number of requests.

### getRequest

```solidity
function getRequest(uint256 requestId) external view returns (struct IEstateForgerRequest.EstateForgerRequest request)
```

Name            Description
 @param  requestId       Request identifier.

 @return request         Configuration and progress of the request.

 @dev    Phases of a request:
         - Pending: block.timestamp < agenda.saleStartsAt
         - Private Sale: agenda.saleStartsAt <= block.timestamp < agenda.privateSaleEndsAt
         - Public Sale: agenda.privateSaleEndsAt <= block.timestamp < agenda.publicSaleEndsAt
         - Awaiting Confirmation: agenda.publicSaleEndsAt
                                     <= block.timestamp
                                     < agenda.publicSaleEndsAt + EstateForgerConstant.SALE_CONFIRMATION_TIME_LIMIT
         - Confirmed: estate.estateId > 0
         - Cancelled: quota.totalSupply = 0

### deposits

```solidity
function deposits(uint256 requestId, address account) external view returns (uint256 quantity)
```

Name            Description
 @param  requestId       Request identifier.
 @param  account         EVM address.
 @return quantity        Deposited quantity of the account in the request.

### withdrawAt

```solidity
function withdrawAt(uint256 requestId, address account) external view returns (uint256 withdrawAt)
```

Name            Description
 @param  requestId       Request identifier.
 @param  account         EVM address.
 @return withdrawAt      Withdrawal timestamp of the account in the request.

### requestTokenization

```solidity
function requestTokenization(address requester, struct IEstateForgerRequest.EstateForgerRequestEstateInput estate, struct IEstateForgerRequest.EstateForgerRequestQuotaInput quota, struct IEstateForgerRequest.EstateForgerRequestQuoteInput quote, struct IEstateForgerRequest.EstateForgerRequestAgendaInput agenda, struct IValidation.Validation validation) external returns (uint256 requestId)
```

@notice Request a new estate to be tokenized.

         Name            Description
 @param  requester       Requester address.
 @param  estate          Initialization input for `EstateForgerRequestEstate` of the request.
 @param  quota           Initialization input for `EstateForgerRequestQuota` of the request.
 @param  quote           Initialization input for `EstateForgerRequestQuote` of the request.
 @param  agenda          Initialization input for `EstateForgerRequestAgenda` of the request.
 @param  validation      Validation package from the validator.
 @return requestId       New request identifier.

 @dev    Permission: Executives active in the zone of the estate.
 @dev    Total sale duration must be no less than `EstateForgerConstant.SALE_MINIMUM_DURATION`.
 @dev    Validation data:
         ```
         data = abi.encode(
             requester,
             estate.uri
         );
         ```

### cancel

```solidity
function cancel(uint256 requestId) external
```

@notice Cancel a request.
 @notice Cancel only before the request is either confirmed or cancelled.

         Name            Description
 @param  requestId       Request identifier.

 @dev    Permission: Managers active in the zone of the estate.

### deposit

```solidity
function deposit(uint256 requestId, uint256 quantity) external payable returns (uint256 value)
```

@notice Deposit to a request.
 @notice Deposit only during sale period. Only accounts whitelisted globally or specifically for the request can deposit during the private sale.

         Name            Description
 @param  requestId       Request identifier.
 @param  quantity        Deposited quantity.
 @return value           Deposited value.

### updateRequestEstateURI

```solidity
function updateRequestEstateURI(uint256 requestId, string uri, struct IValidation.Validation validation) external
```

@notice Update the URI of estate metadata of a request.
 @notice Update only before the request is either confirmed or cancelled.

         Name            Description
 @param  requestId       Request identifier.
 @param  uri             New URI of estate metadata.
 @param  validation      Validation package from the validator.

 @dev    Permission: Executives active in the zone of the estate.
 @dev    Validation data:
         ```
         data = abi.encode(
             requestId,
             uri
         );
         ```

### updateRequestAgenda

```solidity
function updateRequestAgenda(uint256 requestId, struct IEstateForgerRequest.EstateForgerRequestAgendaInput agenda) external
```

@notice Update the agenda of a request.
 @notice Update only before any account deposits.

         Name            Description
 @param  requestId       Request identifier.
 @param  agenda         Initialization input for `EstateForgerRequestAgenda`.

 @dev    Permission: Executives active in the zone of the estate.
 @dev    Total sale duration must be no less than `EstateForgerConstant.SALE_MINIMUM_DURATION`.
 @dev    Can only update `saleStartsAt` before the sale actually starts. If its corresponding input is 0, the timestamp
         remains unchanged.

### whitelistFor

```solidity
function whitelistFor(uint256 requestId, address[] accounts, bool isWhitelisted) external
```

@notice Whitelist or unwhitelist accounts for participation in the private sale of a specific request.
 @notice Whitelist only before the private sale ends.

         Name            Description
 @param  requestId       Request identifier.
 @param  accounts        Array of EVM address.
 @param  isWhitelisted   Whether the operation is whitelisting or unwhitelisting.

 @dev    Permission: Executives active in the zone of the estate.

### withdrawDeposit

```solidity
function withdrawDeposit(uint256 requestId) external returns (uint256 value)
```

@notice Withdraw the deposit of the message sender from a request which can no longer be confirmed.
 @notice Withdraw only when the request is cancelled or the sale ends without enough sold quantity or the confirmation
         time limit has expired.

         Name            Description
 @param  requestId       Request identifier.
 @return value           Withdrawn value.

### safeConfirm

```solidity
function safeConfirm(uint256 requestId, bytes32 anchor) external payable returns (uint256 estateId)
```

@notice Confirm a request to be tokenized.
 @notice Confirm only if the request has sold at least minimum quantity (even if the sale period has not yet ended) and
         before the confirmation time limit has expired.
 @notice The message sender must provide sufficient extra-currency amounts for the cashback fund.

         Name        Description
 @param  requestId   Request identifier.
 @param  anchor      Keccak256 hash of `estate.uri` of the request.
 @return estateId    New estate token identifier.

 @dev    Permission: Managers active in the zone of the estate.

### safeDeposit

```solidity
function safeDeposit(uint256 requestId, uint256 quantity, bytes32 anchor) external payable returns (uint256 value)
```

@notice Deposit to a request.
 @notice Deposit only during sale period. Only accounts whitelisted globally or specifically for the request can deposit during the private sale.

         Name        Description
 @param  requestId   Request identifier.
 @param  quantity    Deposited quantity.
 @param  anchor      Keccak256 hash of `estate.uri` of the request.
 @return value       Deposited value.

 @dev    Anchor enforces consistency between this contract and the client-side.

