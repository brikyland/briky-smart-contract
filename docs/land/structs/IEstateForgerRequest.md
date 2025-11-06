# Solidity API

## IEstateForgerRequest

@author Briky Team

 @notice Interface for struct `EstateForgerRequest`.

 @dev    Implementation involves server-side support.
 @dev    ERC-20 tokens are identified by their contract addresses.
         Native coin is represented by the zero address (0x0000000000000000000000000000000000000000).
 @dev    Quantities are expressed in absolute units. Scale these values by `10 ** IAssetToken(estateToken).decimals()` to
         obtain the correct amounts under the `IAssetToken` convention.

### EstateForgerRequestEstate

@notice Estate information.

```solidity
struct EstateForgerRequestEstate {
  uint256 estateId;
  bytes32 zone;
  string uri;
  uint40 expireAt;
}
```

### EstateForgerRequestEstateInput

@notice Initialization input for `EstateForgerRequestEstate`.

```solidity
struct EstateForgerRequestEstateInput {
  bytes32 zone;
  string uri;
  uint40 expireAt;
}
```

### EstateForgerRequestQuota

@notice Volume configuration and progress.

```solidity
struct EstateForgerRequestQuota {
  uint256 totalQuantity;
  uint256 minSellingQuantity;
  uint256 maxSellingQuantity;
  uint256 soldQuantity;
}
```

### EstateForgerRequestQuotaInput

@notice Initialization input for `EstateForgerRequestQuota`.

```solidity
struct EstateForgerRequestQuotaInput {
  uint256 totalQuantity;
  uint256 minSellingQuantity;
  uint256 maxSellingQuantity;
}
```

### EstateForgerRequestQuote

@notice Price configuration.

```solidity
struct EstateForgerRequestQuote {
  uint256 unitPrice;
  address currency;
  uint256 cashbackThreshold;
  uint256 cashbackFundId;
  uint256 feeDenomination;
  uint256 commissionDenomination;
  address broker;
}
```

### EstateForgerRequestQuoteInput

@notice Initialization input for `EstateForgerRequestQuote`.

```solidity
struct EstateForgerRequestQuoteInput {
  uint256 unitPrice;
  address currency;
  uint256 cashbackThreshold;
  uint256 cashbackBaseRate;
  address[] cashbackCurrencies;
  uint256[] cashbackDenominations;
  uint256 feeDenomination;
  address broker;
}
```

### EstateForgerRequestAgenda

@notice Timeline configuration and progress.
 @notice A sale may consist of at least one of two phases:
         -   Private sale: Only whitelisted addresses can deposit.
         -   Public sale: Every address can deposit.

```solidity
struct EstateForgerRequestAgenda {
  uint40 saleStartsAt;
  uint40 privateSaleEndsAt;
  uint40 publicSaleEndsAt;
  uint40 confirmAt;
}
```

### EstateForgerRequestAgendaInput

@notice Initialization input for `EstateForgerRequestAgenda`.

```solidity
struct EstateForgerRequestAgendaInput {
  uint40 saleStartsAt;
  uint40 privateSaleDuration;
  uint40 publicSaleDuration;
}
```

### EstateForgerRequest

@notice A request of `EstateForger` for tokenizing a real-world estate into a new class of `EstateToken` through a
         deposited-based fixed-price sale.

 @dev    Phases of a request:
         - Pending: block.timestamp < agenda.saleStartsAt
         - Private Sale: agenda.saleStartsAt <= block.timestamp < agenda.privateSaleEndsAt
         - Public Sale: agenda.privateSaleEndsAt <= block.timestamp < agenda.publicSaleEndsAt
         - Awaiting Confirmation: agenda.publicSaleEndsAt
                                     <= block.timestamp
                                     < agenda.publicSaleEndsAt + EstateForgerConstant.SALE_CONFIRMATION_TIME_LIMIT
         - Confirmed: estate.estateId > 0
         - Cancelled: quota.totalSupply = 0

```solidity
struct EstateForgerRequest {
  struct IEstateForgerRequest.EstateForgerRequestEstate estate;
  struct IEstateForgerRequest.EstateForgerRequestQuota quota;
  struct IEstateForgerRequest.EstateForgerRequestQuote quote;
  struct IEstateForgerRequest.EstateForgerRequestAgenda agenda;
  address requester;
}
```

