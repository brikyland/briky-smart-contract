# IPrestigePad

Interface for contract `PrestigePad`.

The `PrestigePad` contract facilitates the launch of real estate project through crowdfunding. Authorized
initiators

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

## BaseUnitPriceRangeUpdate

```solidity
event BaseUnitPriceRangeUpdate(uint256 baseMinUnitPrice, uint256 baseMaxUnitPrice)
```

Emitted when the acceptable range of unit price denominated in USD is updated.

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| baseMinUnitPrice | uint256 | New minimum unit price denominated in USD. |
| baseMaxUnitPrice | uint256 | New maximum unit price denominated in USD. |

## InitiatorRegistration

```solidity
event InitiatorRegistration(bytes32 zone, address account)
```

Emitted when an initiator is registered in a zone.

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| zone | bytes32 | Zone code. |
| account | address | Initiator address. |

## InitiatorDeregistration

```solidity
event InitiatorDeregistration(bytes32 zone, address account)
```

Emitted when an initiator is deregistered from a zone.

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| zone | bytes32 | Zone code. |
| account | address | Initiator address. |

## NewLaunch

```solidity
event NewLaunch(uint256 launchId, uint256 projectId, address initiator, string uri, uint256 initialQuantity, struct IRate.Rate feeRate)
```

Emitted when a new launch is initiated.

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| launchId | uint256 | Launch identifier. |
| projectId | uint256 | Project identifier. |
| initiator | address | Initiator address. |
| uri | string | URI of launch metadata. |
| initialQuantity | uint256 | Initial quantity of tokens to be minted. |
| feeRate | struct IRate.Rate | Fraction of raised value charged as fee, applied across all rounds. |

## NewRound

```solidity
event NewRound(uint256 roundId, uint256 launchId, string uri, struct IPrestigePadRound.PrestigePadRoundQuotaInput quota, struct IPrestigePadRound.PrestigePadRoundQuoteInput quote)
```

Emitted when a new round is created for a launch.

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| roundId | uint256 | Round identifier. |
| launchId | uint256 | Launch identifier. |
| uri | string | URI of round metadata. |
| quota | struct IPrestigePadRound.PrestigePadRoundQuotaInput | Initialization input for `PrestigePadRoundQuota`. |
| quote | struct IPrestigePadRound.PrestigePadRoundQuoteInput | Initialization input for `PrestigePadRoundQuote`. |

## LaunchRoundAppendage

```solidity
event LaunchRoundAppendage(uint256 launchId, uint256 roundId)
```

Emitted when a round is appended to a launch.

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| launchId | uint256 | Launch identifier. |
| roundId | uint256 | Round identifier. |

## LaunchCurrentRoundCancellation

```solidity
event LaunchCurrentRoundCancellation(uint256 launchId, uint256 roundId)
```

Emitted when the current round of a launch is cancelled.

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| launchId | uint256 | Launch identifier. |
| roundId | uint256 | Round identifier. |

## LaunchCurrentRoundConfirmation

```solidity
event LaunchCurrentRoundConfirmation(uint256 launchId, uint256 roundId, uint256 raisedQuantity, uint256 contribution, uint256 fee, uint256 cashbackBaseAmount)
```

Emitted when the current round of a launch is confirmed.

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| launchId | uint256 | Launch identifier. |
| roundId | uint256 | Round identifier. |
| raisedQuantity | uint256 | Total contributed quantity. |
| contribution | uint256 | Total contributed value. |
| fee | uint256 | Tokenizing fee. |
| cashbackBaseAmount | uint256 | Cashback derived from the contribution. |

## LaunchFinalization

```solidity
event LaunchFinalization(uint256 launchId)
```

Emitted when a launch is finalized.

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| launchId | uint256 | Launch identifier. |

## LaunchRoundsRemoval

```solidity
event LaunchRoundsRemoval(uint256 launchId, uint256 removedRoundNumber, uint256 index)
```

Emitted when a launch gets its rounds removed from an index.

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| launchId | uint256 | Launch identifier. |
| removedRoundNumber | uint256 | Number of removed rounds. |
| index | uint256 | Index of the first removed round. |

## LaunchNextRoundSchedule

```solidity
event LaunchNextRoundSchedule(uint256 launchId, uint256 roundId, uint256 cashbackFundId, uint40 raiseStartsAt, uint40 raiseEndsAt)
```

Emitted when the next round of a launch is scheduled.

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| launchId | uint256 | Launch identifier. |
| roundId | uint256 | Round identifier. |
| cashbackFundId | uint256 | Cashback fund identifier. |
| raiseStartsAt | uint40 | When the raise starts. |
| raiseEndsAt | uint40 | When the raise ends. |

## LaunchRoundUpdate

```solidity
event LaunchRoundUpdate(uint256 launchId, uint256 roundId, uint256 index)
```

Emitted when a round in a launch is updated.

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| launchId | uint256 | Launch identifier. |
| roundId | uint256 | New round identifier. |
| index | uint256 | Index of the round in the launch. |

## LaunchURIUpdate

```solidity
event LaunchURIUpdate(uint256 launchId, string launchURI)
```

Emitted when the URI of a launch is updated.

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| launchId | uint256 | Launch identifier. |
| launchURI | string | New URI of project metadata. |

## Contribution

```solidity
event Contribution(uint256 launchId, uint256 roundId, address contributor, uint256 quantity, uint256 value)
```

Emitted when a contribution is made to a round.

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| launchId | uint256 | Launch identifier. |
| roundId | uint256 | Round identifier. |
| contributor | address | Contributor address. |
| quantity | uint256 | Contributed quantity. |
| value | uint256 | Contributed value. |

## ContributionWithdrawal

```solidity
event ContributionWithdrawal(uint256 roundId, address contributor, uint256 quantity, uint256 value)
```

Emitted when a contribution is withdrawn from a round.

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| roundId | uint256 | Round identifier. |
| contributor | address | Contributor address. |
| quantity | uint256 | Withdrawn quantity. |
| value | uint256 | Withdrawn value. |

## AlreadyConfirmed

```solidity
error AlreadyConfirmed()
```

===== ERROR ===== *

## AlreadyWithdrawn

```solidity
error AlreadyWithdrawn()
```

## InvalidCancelling

```solidity
error InvalidCancelling()
```

## InvalidConfirming

```solidity
error InvalidConfirming()
```

## InvalidContributing

```solidity
error InvalidContributing()
```

## InvalidFinalizing

```solidity
error InvalidFinalizing()
```

## InvalidLaunchId

```solidity
error InvalidLaunchId()
```

## InvalidScheduling

```solidity
error InvalidScheduling()
```

## InvalidRemoving

```solidity
error InvalidRemoving()
```

## InvalidRoundId

```solidity
error InvalidRoundId()
```

## InvalidUnitPrice

```solidity
error InvalidUnitPrice()
```

## InvalidWithdrawing

```solidity
error InvalidWithdrawing()
```

## MaxRaisingQuantityExceeded

```solidity
error MaxRaisingQuantityExceeded()
```

## NoRoundToInitiate

```solidity
error NoRoundToInitiate()
```

## NotConfirmed

```solidity
error NotConfirmed()
```

## NotEnoughSoldQuantity

```solidity
error NotEnoughSoldQuantity()
```

## NotInitiated

```solidity
error NotInitiated()
```

## NotRegisteredAccount

```solidity
error NotRegisteredAccount()
```

## NothingToWithdraw

```solidity
error NothingToWithdraw()
```

## RegisteredAccount

```solidity
error RegisteredAccount()
```

## StillRaising

```solidity
error StillRaising()
```

## Timeout

```solidity
error Timeout()
```

## feeReceiver

```solidity
function feeReceiver() external view returns (address feeReceiver)
```

### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| feeReceiver | address | `FeeReceiver` contract address. |

## priceWatcher

```solidity
function priceWatcher() external view returns (address priceWatcher)
```

### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| priceWatcher | address | `PriceWatcher` contract address. |

## reserveVault

```solidity
function reserveVault() external view returns (address reserveVault)
```

### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| reserveVault | address | `ReserveVault` contract address. |

## baseMinUnitPrice

```solidity
function baseMinUnitPrice() external view returns (uint256 baseMinUnitPrice)
```

### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| baseMinUnitPrice | uint256 | Minimum unit price denominated in USD. |

## baseMaxUnitPrice

```solidity
function baseMaxUnitPrice() external view returns (uint256 baseMaxUnitPrice)
```

### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| baseMaxUnitPrice | uint256 | Maximum unit price denominated in USD. |

## launchNumber

```solidity
function launchNumber() external view returns (uint256 launchNumber)
```

### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| launchNumber | uint256 | Total number of launches created. |

## roundNumber

```solidity
function roundNumber() external view returns (uint256 roundNumber)
```

### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| roundNumber | uint256 | Total number of rounds created. |

## getLaunch

```solidity
function getLaunch(uint256 launchId) external view returns (struct IPrestigePadLaunch.PrestigePadLaunch launch)
```

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| launchId | uint256 | Launch identifier. |

### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| launch | struct IPrestigePadLaunch.PrestigePadLaunch | Configuration and rounds of the launch. |

## getRound

```solidity
function getRound(uint256 roundId) external view returns (struct IPrestigePadRound.PrestigePadRound round)
```

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

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| roundId | uint256 | Round identifier. |

### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| round | struct IPrestigePadRound.PrestigePadRound | Configuration and progress of the round. |

## contributions

```solidity
function contributions(uint256 roundId, address account) external view returns (uint256 quantity)
```

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| roundId | uint256 | Round identifier. |
| account | address | EVM address. |

### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| quantity | uint256 | Contributed quantity of the account in the round. |

## withdrawAt

```solidity
function withdrawAt(uint256 roundId, address account) external view returns (uint256 withdrawAt)
```

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| roundId | uint256 | Round identifier. |
| account | address | EVM address. |

### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| withdrawAt | uint256 | Withdrawal timestamp of the account in the round. |

## initiateLaunch

```solidity
function initiateLaunch(address initiator, bytes32 zone, string projectURI, string launchURI, uint256 initialQuantity, uint256 feeRate, struct IValidation.Validation validation) external returns (uint256 launchId)
```

Initiate a new launch for an estate project.

{% hint style="info" %}
Permission: Executives active in the zone of the estate.
{% endhint %}

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| initiator | address | Initiator address. |
| zone | bytes32 | Zone code. |
| projectURI | string | URI of project metadata. |
| launchURI | string | URI of launch metadata. |
| initialQuantity | uint256 | Initial quantity of tokens to be minted for the initiator. |
| feeRate | uint256 | Fraction of raised value charged as fee, applied for all rounds. |
| validation | struct IValidation.Validation | Validation package from the validator. |

### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| launchId | uint256 | New launch identifier. |

## updateLaunchURI

```solidity
function updateLaunchURI(uint256 launchId, string uri, struct IValidation.Validation validation) external
```

Update the URI of information a launch.

Update only if the launch is not finalized.

{% hint style="info" %}
Permission: Initiator of the launch.

{% endhint %}

{% hint style="info" %}
Validation data:
```
data = abi.encode(
    _launchId,
    _uri
);
{% endhint %}

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| launchId | uint256 | Launch identifier. |
| uri | string | URI of launch metadata. |
| validation | struct IValidation.Validation | Validation package from the validator. |

## updateRound

```solidity
function updateRound(uint256 launchId, uint256 index, struct IPrestigePadRound.PrestigePadRoundInput round) external returns (uint256 roundId)
```

Update a round in a launch.

Update only before the round is scheduled.

{% hint style="info" %}
Permission: Initiator of the launch.

{% endhint %}

{% hint style="info" %}
Validation data:
```
data = abi.encode(
    _launchId,
    _uri
);
{% endhint %}

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| launchId | uint256 | Launch identifier. |
| index | uint256 | Index of the round in the launch. |
| round | struct IPrestigePadRound.PrestigePadRoundInput | New round configuration. |

### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| roundId | uint256 | New round identifier. |

## updateRounds

```solidity
function updateRounds(uint256 launchId, uint256 removedRoundNumber, struct IPrestigePadRound.PrestigePadRoundInput[] addedRounds) external returns (uint256 lastIndex)
```

Update multiple rounds in a launch by removing multiple rounds from the end and appending new ones.

Update only with rounds that are not scheduled.

{% hint style="info" %}
Permission: Initiator of the launch.
{% endhint %}

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| launchId | uint256 | Launch identifier. |
| removedRoundNumber | uint256 | Number of rounds to remove from the end. |
| addedRounds | struct IPrestigePadRound.PrestigePadRoundInput[] | Array of new rounds. |

### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| lastIndex | uint256 | Index of the last added round. |

## cancelCurrentRound

```solidity
function cancelCurrentRound(uint256 launchId) external returns (uint256 index, uint256 roundId)
```

Cancel the current round of a launch.

Cancel only before the current round is confirmed.

{% hint style="info" %}
Permission: Initiator of the launch.
{% endhint %}

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| launchId | uint256 | Launch identifier. |

### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| index | uint256 | Index of the cancelled round. |
| roundId | uint256 | New round identifier at the index. |

## scheduleNextRound

```solidity
function scheduleNextRound(uint256 launchId, uint256 cashbackThreshold, uint256 cashbackBaseRate, address[] cashbackCurrencies, uint256[] cashbackDenominations, uint40 raiseStartsAt, uint40 raiseDuration) external returns (uint256 index)
```

Schedule the next round for a launch with cashback configuration.

Schedule only if the previous round has been confirmed.

{% hint style="info" %}
Permission: Initiator of the launch.
{% endhint %}

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| launchId | uint256 | Launch identifier. |
| cashbackThreshold | uint256 | Minimum contributed quantity of an address to receive cashback. |
| cashbackBaseRate | uint256 | Fraction of contribution to cashback. |
| cashbackCurrencies | address[] | Array of extra currency addresses to cashback. |
| cashbackDenominations | uint256[] | Array of extra currency denominations to cashback, respective to each extra currency. |
| raiseStartsAt | uint40 | Raise start timestamp. |
| raiseDuration | uint40 | Raise duration. |

### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| index | uint256 | Index of the scheduled round. |

## contributeCurrentRound

```solidity
function contributeCurrentRound(uint256 launchId, uint256 quantity) external payable returns (uint256 value)
```

Contribute to the current round of a launch.

Contribute only during raise period.

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| launchId | uint256 | Launch identifier. |
| quantity | uint256 | Contributed quantity. |

### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| value | uint256 | Contributed value. |

## withdrawContribution

```solidity
function withdrawContribution(uint256 roundId) external returns (uint256 value)
```

Withdraw contribution of the message sender from a round which can no longer be confirmed.

Withdraw only when the round is cancelled or the raise ends without enough raised quantity or the confirmation
time limit has expired.

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| roundId | uint256 | Round identifier. |

### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| value | uint256 | Withdrawn value. |

## safeConfirmCurrentRound

```solidity
function safeConfirmCurrentRound(uint256 launchId, bytes32 anchor) external payable returns (uint256 index)
```

Confirm the current round of a launch and mint tokens to contributors.

Confirm only if the round has raised at least minimum quantity (even if the sale period has not yet ended) and
before the confirmation time limit has expired.

The message sender must provide sufficient extra-currency amounts for the cashback fund.

{% hint style="info" %}
Permission: Initiator of the launch.

{% endhint %}

{% hint style="info" %}
Anchor enforces consistency between this contract and the client-side.
{% endhint %}

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| launchId | uint256 | Launch identifier. |
| anchor | bytes32 | Keccak256 hash of `uri` of the launch. |

### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| index | uint256 | Index of the confirmed round. |

## safeContributeCurrentRound

```solidity
function safeContributeCurrentRound(uint256 launchId, uint256 quantity, bytes32 anchor) external payable returns (uint256 value)
```

Contribute to the current round of a launch with anchor verification.

Contribute only during raise period.

{% hint style="info" %}
Anchor enforces consistency between this contract and the client-side.
{% endhint %}

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| launchId | uint256 | Launch identifier. |
| quantity | uint256 | Contributed quantity. |
| anchor | bytes32 | Keccak256 hash of `uri` of the launch. |

### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| value | uint256 | Contributed value. |

## safeFinalize

```solidity
function safeFinalize(uint256 launchId, bytes32 anchor) external
```

Finalize a launch to finish capital raising.

Finalize only when all rounds are confirmed.

{% hint style="info" %}
Permission: Initiator of the launch.

{% endhint %}

{% hint style="info" %}
The launch can only be finalized after all rounds are confirmed, and no further rounds can be created.

{% endhint %}

{% hint style="info" %}
Anchor enforces consistency between this contract and the client-side.
{% endhint %}

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| launchId | uint256 | Launch identifier. |
| anchor | bytes32 | Keccak256 hash of `uri` of the launch. |

