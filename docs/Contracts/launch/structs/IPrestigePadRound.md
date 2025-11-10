# IPrestigePadRound

Interface for struct `PrestigePadRound`.

{% hint style="info" %}
Implementation involves server-side support.

{% endhint %}

{% hint style="info" %}
ERC-20 tokens are identified by their contract addresses.
Native coin is represented by the zero address (0x0000000000000000000000000000000000000000).

{% endhint %}

{% hint style="info" %}
Quantities are expressed in absolute units. Scale these values by `10 ** IAssetToken(projectToken).decimals()` to
obtain the correct amounts under the `IAssetToken` convention.
{% endhint %}

## PrestigePadRoundQuota

Volume configuration and progress.

```solidity
struct PrestigePadRoundQuota {
  uint256 totalQuantity;
  uint256 minRaisingQuantity;
  uint256 maxRaisingQuantity;
  uint256 raisedQuantity;
}
```

## PrestigePadRoundQuotaInput

Initialization input for `PrestigePadRoundQuota`.

```solidity
struct PrestigePadRoundQuotaInput {
  uint256 totalQuantity;
  uint256 minRaisingQuantity;
  uint256 maxRaisingQuantity;
}
```

## PrestigePadRoundQuote

Price configuration.

```solidity
struct PrestigePadRoundQuote {
  uint256 unitPrice;
  address currency;
  uint256 cashbackThreshold;
  uint256 cashbackFundId;
  uint256 feeDenomination;
}
```

## PrestigePadRoundQuoteInput

Initialization input for `PrestigePadRoundQuote`.

```solidity
struct PrestigePadRoundQuoteInput {
  uint256 unitPrice;
  address currency;
}
```

## PrestigePadRoundAgenda

Timeline configuration and progress.

```solidity
struct PrestigePadRoundAgenda {
  uint40 raiseStartsAt;
  uint40 raiseEndsAt;
  uint40 confirmAt;
}
```

## PrestigePadRound

Initialization input for `EstateForgerRequestAgenda`.

```solidity
struct PrestigePadRound {
  string uri;
  struct IPrestigePadRound.PrestigePadRoundQuota quota;
  struct IPrestigePadRound.PrestigePadRoundQuote quote;
  struct IPrestigePadRound.PrestigePadRoundAgenda agenda;
}
```

## PrestigePadRoundInput

A round in a launch of `PrestigePad` operating a phase of capital raising for a estate project that issues
new corresponding project token to be minted for contributors of the round.

{% hint style="info" %}
Phases of a round:
- Unscheduled: agenda.raiseStartsAt = 0
- Scheduled: block.timestamp < agenda.raiseStartsAt
- Raise: agenda.raiseStartsAt <= block.timestamp < agenda.raiseEndsAt
- Awaiting Confirmation: agenda.raiseEndsAt
                            <= block.timestamp
                            < agenda.raiseEndsAt + PrestigePadConstant.RAISE_CONFIRMATION_TIME_LIMIT
- Confirmed: agenda.confirmedAt > 0
- Cancelled: quota.totalSupply = 0
{% endhint %}

```solidity
struct PrestigePadRoundInput {
  string uri;
  struct IPrestigePadRound.PrestigePadRoundQuotaInput quota;
  struct IPrestigePadRound.PrestigePadRoundQuoteInput quote;
  struct IValidation.Validation validation;
}
```

