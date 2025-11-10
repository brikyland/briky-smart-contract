# IEstateForgerRequest

Interface for struct `EstateForgerRequest`.

{% hint style="info" %}
Implementation involves server-side support.

{% endhint %}

{% hint style="info" %}
ERC-20 tokens are identified by their contract addresses.
Native coin is represented by the zero address (0x0000000000000000000000000000000000000000).

{% endhint %}

{% hint style="info" %}
Quantities are expressed in absolute units. Scale these values by `10 ** IAssetToken(estateToken).decimals()` to
obtain the correct amounts under the `IAssetToken` convention.
{% endhint %}

## EstateForgerRequestEstate

Estate information.

```solidity
struct EstateForgerRequestEstate {
  uint256 estateId;
  bytes32 zone;
  string uri;
  uint40 expireAt;
}
```

## EstateForgerRequestEstateInput

Initialization input for `EstateForgerRequestEstate`.

```solidity
struct EstateForgerRequestEstateInput {
  bytes32 zone;
  string uri;
  uint40 expireAt;
}
```

## EstateForgerRequestQuota

Volume configuration and progress.

```solidity
struct EstateForgerRequestQuota {
  uint256 totalQuantity;
  uint256 minSellingQuantity;
  uint256 maxSellingQuantity;
  uint256 soldQuantity;
}
```

## EstateForgerRequestQuotaInput

Initialization input for `EstateForgerRequestQuota`.

```solidity
struct EstateForgerRequestQuotaInput {
  uint256 totalQuantity;
  uint256 minSellingQuantity;
  uint256 maxSellingQuantity;
}
```

## EstateForgerRequestQuote

Price configuration.

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

## EstateForgerRequestQuoteInput

Initialization input for `EstateForgerRequestQuote`.

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

## EstateForgerRequestAgenda

Timeline configuration and progress.

A sale may consist of at least one of two phases:
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

## EstateForgerRequestAgendaInput

Initialization input for `EstateForgerRequestAgenda`.

```solidity
struct EstateForgerRequestAgendaInput {
  uint40 saleStartsAt;
  uint40 privateSaleDuration;
  uint40 publicSaleDuration;
}
```

## EstateForgerRequest

A request of `EstateForger` for tokenizing a real-world estate into a new class of `EstateToken` through a
deposited-based fixed-price sale.

{% hint style="info" %}
Phases of a request:
- Pending: block.timestamp < agenda.saleStartsAt
- Private Sale: agenda.saleStartsAt <= block.timestamp < agenda.privateSaleEndsAt
- Public Sale: agenda.privateSaleEndsAt <= block.timestamp < agenda.publicSaleEndsAt
- Awaiting Confirmation: agenda.publicSaleEndsAt
                            <= block.timestamp
                            < agenda.publicSaleEndsAt + EstateForgerConstant.SALE_CONFIRMATION_TIME_LIMIT
- Confirmed: estate.estateId > 0
- Cancelled: quota.totalSupply = 0
{% endhint %}

```solidity
struct EstateForgerRequest {
  struct IEstateForgerRequest.EstateForgerRequestEstate estate;
  struct IEstateForgerRequest.EstateForgerRequestQuota quota;
  struct IEstateForgerRequest.EstateForgerRequestQuote quote;
  struct IEstateForgerRequest.EstateForgerRequestAgenda agenda;
  address requester;
}
```

