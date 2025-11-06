# Solidity API

## EstateForger

@author Briky Team

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

### validRequest

```solidity
modifier validRequest(uint256 _requestId)
```

@notice Verify a valid request identifier.

         Name        Description
 @param  _requestId  Request identifier.

### onlyActiveInZoneOf

```solidity
modifier onlyActiveInZoneOf(uint256 _requestId)
```

@notice Verify the message sender is active in the zone of the estate of the request.

         Name        Description
 @param  _requestId  Request identifier.

### receive

```solidity
receive() external payable
```

@notice Executed on a call to this contract with empty calldata.

### version

```solidity
function version() external pure returns (string)
```

@return Version of implementation.

### initialize

```solidity
function initialize(address _admin, address _estateToken, address _commissionToken, address _priceWatcher, address _feeReceiver, address _reserveVault, address _validator, uint256 _baseMinUnitPrice, uint256 _baseMaxUnitPrice) external
```

@notice Initialize the contract after deployment, serving as the constructor.

         Name                Description
 @param  _admin              `Admin` contract address.
 @param  _estateToken        `EstateToken` contract address.
 @param  _commissionToken    `CommissionToken` contract address.
 @param  _priceWatcher       `PriceWatcher` contract address.
 @param  _feeReceiver        `FeeReceiver` contract address.
 @param  _reserveVault       `ReserveVault` contract address.
 @param  _validator          Validator address.
 @param  _baseMinUnitPrice   Minimum unit price denominated in USD.
 @param  _baseMaxUnitPrice   Maximum unit price denominated in USD.

### updateBaseUnitPriceRange

```solidity
function updateBaseUnitPriceRange(uint256 _baseMinUnitPrice, uint256 _baseMaxUnitPrice, bytes[] _signatures) external
```

@notice Update the acceptable range of unit price denominated in USD.

         Name                Description
 @param  _baseMinUnitPrice   New minimum unit price denominated in USD.
 @param  _baseMaxUnitPrice   New maximum unit price denominated in USD.
 @param  _signatures         Array of admin signatures.

 @dev    Administrative operator.

### whitelist

```solidity
function whitelist(address[] _accounts, bool _isWhitelisted, bytes[] _signatures) external
```

@notice Whitelist or unwhitelist globally multiple addresses for private sales.

         Name                Description
 @param  _accounts           Array of EVM addresses.
 @param  _isWhitelisted      Whether the operation is whitelisting or unwhitelisting.
 @param  _signatures         Array of admin signatures.

 @dev    Administrative operator.

### getRequest

```solidity
function getRequest(uint256 _requestId) external view returns (struct IEstateForgerRequest.EstateForgerRequest)
```

Name            Description
 @param  _requestId      Request identifier.

 @return Configuration and progress of the request.

 @dev    Phases of a request:
         - Pending: block.timestamp < agenda.saleStartsAt
         - Private Sale: agenda.saleStartsAt <= block.timestamp < agenda.privateSaleEndsAt
         - Public Sale: agenda.privateSaleEndsAt <= block.timestamp <= agenda.publicSaleEndsAt
         - Awaiting Confirmation: agenda.publicSaleEndsAt
                                     <= block.timestamp
                                     < agenda.publicSaleEndsAt + EstateForgerConstant.SALE_CONFIRMATION_TIME_LIMIT
         - Confirmed: estate.estateId > 0
         - Cancelled: quota.totalSupply = 0

### isTokenized

```solidity
function isTokenized(uint256 _requestId) external view returns (bool)
```

Name            Description
 @param  _requestId      Request identifier.

 @return Whether the request has been confirmed and tokenized.

### allocationOfAt

```solidity
function allocationOfAt(address _account, uint256 _requestId, uint256 _at) external view returns (uint256)
```

Name            Description
 @param  _account        Account address.
 @param  _requestId      Request identifier.
 @param  _at             Reference timestamp.

 @return Allocation of the account at the reference timestamp.

### supportsInterface

```solidity
function supportsInterface(bytes4 _interfaceId) public view virtual returns (bool)
```

Name                Description
 @param  _interfaceId        Interface identifier.

 @return Whether this contract supports the interface.

### requestTokenization

```solidity
function requestTokenization(address _requester, struct IEstateForgerRequest.EstateForgerRequestEstateInput _estate, struct IEstateForgerRequest.EstateForgerRequestQuotaInput _quota, struct IEstateForgerRequest.EstateForgerRequestQuoteInput _quote, struct IEstateForgerRequest.EstateForgerRequestAgendaInput _agenda, struct IValidation.Validation _validation) external returns (uint256)
```

@notice Request a new estate to be tokenized.

         Name            Description
 @param  _requester      Requester address.
 @param  _estate         Initialization input for `EstateForgerRequestEstate` of the request.
 @param  _quota          Initialization input for `EstateForgerRequestQuota` of the request.
 @param  _quote          Initialization input for `EstateForgerRequestQuote` of the request.
 @param  _agenda         Initialization input for `EstateForgerRequestAgenda` of the request.
 @param  _validation     Validation package from the validator.

 @return New request identifier.

 @dev    Permission: Executives active in the zone of the estate.
 @dev    Total sale duration must be no less than `EstateForgerConstant.SALE_MINIMUM_DURATION`.

### whitelistFor

```solidity
function whitelistFor(uint256 _requestId, address[] _accounts, bool _isWhitelisted) external
```

@notice Whitelist or unwhitelist accounts for participation in the private sale of a specific request.
 @notice Whitelist only before the private sale ends.

         Name            Description
 @param  _requestId      Request identifier.
 @param  _accounts       Array of EVM addresses.
 @param  _isWhitelisted  Whether the operation is whitelisting or unwhitelisting.

 @dev    Permission: Executives active in the zone of the estate.

### updateRequestEstateURI

```solidity
function updateRequestEstateURI(uint256 _requestId, string _uri, struct IValidation.Validation _validation) external
```

@notice Update the URI of estate metadata of a request.
 @notice Update only before the request is either confirmed or cancelled.

         Name            Description
 @param  _requestId      Request identifier.
 @param  _uri            New URI of estate metadata.
 @param  _validation     Validation package from the validator.

 @dev    Permission: Executives active in the zone of the estate.

### updateRequestAgenda

```solidity
function updateRequestAgenda(uint256 _requestId, struct IEstateForgerRequest.EstateForgerRequestAgendaInput _agenda) external
```

@notice Update the agenda of a request.
 @notice Update only before any account deposits.

         Name            Description
 @param  _requestId      Request identifier.
 @param  _agenda         Initialization input for `EstateForgerRequestAgenda`.

 @dev    Permission: Executives active in the zone of the estate.
 @dev    Total sale duration must be no less than `EstateForgerConstant.SALE_MINIMUM_DURATION`.
 @dev    Can only update `saleStartsAt` before the sale actually starts. If its corresponding input is 0, the timestamp
         remains unchanged.

### cancel

```solidity
function cancel(uint256 _requestId) external
```

@notice Cancel a request.
 @notice Cancel only before the request is either confirmed or cancelled.

         Name            Description
 @param  _requestId      Request identifier.

 @dev    Permission: Managers active in the zone of the estate.

### deposit

```solidity
function deposit(uint256 _requestId, uint256 _quantity) external payable returns (uint256)
```

@notice Deposit to purchase tokens in a request.
 @notice Deposit only during sale period. Only accounts whitelisted globally or specifically for the request can deposit during the private sale.

         Name            Description
 @param  _requestId      Request identifier.
 @param  _quantity       Deposited quantity.

 @return Deposited value.

### safeDeposit

```solidity
function safeDeposit(uint256 _requestId, uint256 _quantity, bytes32 _anchor) external payable returns (uint256)
```

@notice Deposit to a request.
 @notice Deposit only during sale period. Only accounts whitelisted globally or specifically for the request can deposit during the private sale.

         Name            Description
 @param  _requestId      Request identifier.
 @param  _quantity       Deposited quantity.
 @param  _anchor         Keccak256 hash of `estate.uri` of the request.

 @return Deposited value.

 @dev    Anchor enforces consistency between this contract and the client-side.

### safeConfirm

```solidity
function safeConfirm(uint256 _requestId, bytes32 _anchor) external payable returns (uint256)
```

@notice Confirm a request to be tokenized.
 @notice Confirm only if the request has sold at least minimum quantity (even if the sale period has not yet ended) and
         before the confirmation time limit has expired.
 @notice The message sender must provide sufficient extra-currency amounts for the cashback fund.

         Name            Description
 @param  _requestId      Request identifier.
 @param  _anchor         Keccak256 hash of `estate.uri` of the request.

 @return New estate token identifier.

 @dev    Permission: Managers active in the zone of the estate.

### withdrawDeposit

```solidity
function withdrawDeposit(uint256 _requestId) external returns (uint256)
```

@notice Withdraw the deposit of the message sender from a request which can no longer be confirmed.
 @notice Withdraw only if the request is cancelled or the sale ends without enough sold quantity or the confirmation
         time limit has expired.

         Name            Description
 @param  _requestId      Request identifier.

 @return Withdrawn value.

### withdrawEstateToken

```solidity
function withdrawEstateToken(uint256 _requestId) external returns (uint256)
```

@notice Withdraw the allocation of the message sender from a tokenization.
 @notice Withdraw only after the request is confirmed.
 @notice Also receive corresponding cashback.

         Name            Description
 @param  _requestId      Request identifier.

 @return Withdrawn amount.

### _deposit

```solidity
function _deposit(uint256 _requestId, uint256 _quantity) internal returns (uint256)
```

@notice Deposit to a request.

         Name            Description
 @param  _requestId      Request identifier.
 @param  _quantity       Deposited quantity.

 @return Deposited value.

### _provideCashbackFund

```solidity
function _provideCashbackFund(uint256 _cashbackFundId) internal returns (uint256)
```

@notice Provide cashback fund in the main currency, using a sufficient portion of the tokenization fee and in other
         extras, using amounts forwarded from the message sender.

         Name                Description
 @param  _cashbackFundId     Cashback fund identifier.

 @return Main currency cashback value.

