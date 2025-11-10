# PrestigePad

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

## validLaunch

```solidity
modifier validLaunch(uint256 _launchId)
```

Verify a valid launch identifier.

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _launchId | uint256 | Launch identifier. |

## validRound

```solidity
modifier validRound(uint256 _roundId)
```

Verify a valid round identifier.

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _roundId | uint256 | Round identifier. |

## onlyInitiator

```solidity
modifier onlyInitiator(uint256 _launchId)
```

Verify the message sender is the initiator of a launch.

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _launchId | uint256 | Launch identifier. |

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
function initialize(address _admin, address _projectToken, address _priceWatcher, address _feeReceiver, address _reserveVault, address _validator, uint256 _baseMinUnitPrice, uint256 _baseMaxUnitPrice) external
```

Initialize the contract after deployment, serving as the constructor.

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _admin | address | `Admin` contract address. |
| _projectToken | address | `ProjectToken` contract address. |
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

## getLaunch

```solidity
function getLaunch(uint256 _launchId) external view returns (struct IPrestigePadLaunch.PrestigePadLaunch)
```

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _launchId | uint256 | Launch identifier. |

### Return Values

Configuration and rounds of the launch.

## getRound

```solidity
function getRound(uint256 _roundId) external view returns (struct IPrestigePadRound.PrestigePadRound)
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
| _roundId | uint256 | Round identifier. |

### Return Values

Configuration and progress of the round.

## isFinalized

```solidity
function isFinalized(uint256 _launchId) external view returns (bool)
```

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _launchId | uint256 | Launch identifier. |

### Return Values

Whether the launch has been finalized.

## allocationOfAt

```solidity
function allocationOfAt(address _account, uint256 _launchId, uint256 _at) external view returns (uint256)
```

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _account | address | Account address. |
| _launchId | uint256 | Launch identifier. |
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

Whether the interface is supported.

## initiateLaunch

```solidity
function initiateLaunch(address _initiator, bytes32 _zone, string _projectURI, string _launchURI, uint256 _initialQuantity, uint256 _feeRate, struct IValidation.Validation _validation) external returns (uint256)
```

Initiate a new launch for an estate project.

{% hint style="info" %}
Permission: Executives active in the zone of the estate.
{% endhint %}

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _initiator | address | Initiator address. |
| _zone | bytes32 | Zone code. |
| _projectURI | string | URI of project metadata. |
| _launchURI | string | URI of launch metadata. |
| _initialQuantity | uint256 | Initial quantity of tokens to be minted for the initiator. |
| _feeRate | uint256 | Fraction of raised value charged as fee, applied for all rounds. |
| _validation | struct IValidation.Validation | Validation package from the validator. |

### Return Values

New launch identifier.

## updateLaunchURI

```solidity
function updateLaunchURI(uint256 _launchId, string _uri, struct IValidation.Validation _validation) external
```

Update the URI of information of a launch.

Update only if the launch is not finalized.

{% hint style="info" %}
Permission: Initiator of the launch.
{% endhint %}

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _launchId | uint256 | Launch identifier. |
| _uri | string | URI of launch metadata. |
| _validation | struct IValidation.Validation | Validation package from the validator. |

## updateRound

```solidity
function updateRound(uint256 _launchId, uint256 _index, struct IPrestigePadRound.PrestigePadRoundInput _round) external returns (uint256)
```

Update a round in a launch.

Update only before the round is scheduled.

{% hint style="info" %}
Permission: Initiator of the launch.
{% endhint %}

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _launchId | uint256 | Launch identifier. |
| _index | uint256 | Index of the round in the launch. |
| _round | struct IPrestigePadRound.PrestigePadRoundInput | New round configuration. |

### Return Values

New round identifier.

## updateRounds

```solidity
function updateRounds(uint256 _launchId, uint256 _removedRoundNumber, struct IPrestigePadRound.PrestigePadRoundInput[] _addedRounds) external returns (uint256)
```

Update multiple rounds in a launch by removing multiple rounds from the end and appending new ones.

Update only with rounds that are not scheduled.

{% hint style="info" %}
Permission: Initiator of the launch.
{% endhint %}

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _launchId | uint256 | Launch identifier. |
| _removedRoundNumber | uint256 | Number of rounds to remove from the end. |
| _addedRounds | struct IPrestigePadRound.PrestigePadRoundInput[] | Array of new rounds. |

### Return Values

Index of the last added round.

## scheduleNextRound

```solidity
function scheduleNextRound(uint256 _launchId, uint256 _cashbackThreshold, uint256 _cashbackBaseRate, address[] _cashbackCurrencies, uint256[] _cashbackDenominations, uint40 _raiseStartsAt, uint40 _raiseDuration) external returns (uint256)
```

Schedule the next round of a launch with cashback configuration.

Schedule only if the previous round has been confirmed.

{% hint style="info" %}
Permission: Initiator of the launch.
{% endhint %}

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _launchId | uint256 | Launch identifier. |
| _cashbackThreshold | uint256 | Minimum contributed quantity of an address to receive cashback. |
| _cashbackBaseRate | uint256 | Fraction of contribution to cashback. |
| _cashbackCurrencies | address[] | Array of extra currency addresses to cashback. |
| _cashbackDenominations | uint256[] | Array of extra currency denominations to cashback, respective to each extra currency. |
| _raiseStartsAt | uint40 | Raise start timestamp. |
| _raiseDuration | uint40 | Raise duration. |

### Return Values

Index of the scheduled round.

## cancelCurrentRound

```solidity
function cancelCurrentRound(uint256 _launchId) external returns (uint256, uint256)
```

ones

Cancel the current round of a launch.

Cancel only before the current round is confirmed.

{% hint style="info" %}
Permission: Initiator of the launch.
{% endhint %}

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _launchId | uint256 | Launch identifier. |

### Return Values

Index of the cancelled round.

New round identifier at the index.

## safeConfirmCurrentRound

```solidity
function safeConfirmCurrentRound(uint256 _launchId, bytes32 _anchor) external payable returns (uint256)
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
| _launchId | uint256 | Launch identifier. |
| _anchor | bytes32 | Keccak256 hash of `uri` of the launch. |

### Return Values

Index of the confirmed round.

## safeFinalize

```solidity
function safeFinalize(uint256 _launchId, bytes32 _anchor) external
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
| _launchId | uint256 | Launch identifier. |
| _anchor | bytes32 | Keccak256 hash of `uri` of the launch. |

## contributeCurrentRound

```solidity
function contributeCurrentRound(uint256 _launchId, uint256 _quantity) external payable returns (uint256)
```

Contribute to the current round of a launch.

Contribute only during raise period.

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _launchId | uint256 | Launch identifier. |
| _quantity | uint256 | Contributed quantity. |

### Return Values

Contributed value.

## safeContributeCurrentRound

```solidity
function safeContributeCurrentRound(uint256 _launchId, uint256 _quantity, bytes32 _anchor) external payable returns (uint256)
```

Contribute to the current round of a launch with anchor verification.

Contribute only during raise period.

{% hint style="info" %}
Anchor enforces consistency between this contract and the client-side.
{% endhint %}

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _launchId | uint256 | Launch identifier. |
| _quantity | uint256 | Contributed quantity. |
| _anchor | bytes32 | Keccak256 hash of `uri` of the launch. |

### Return Values

Contributed value.

## withdrawContribution

```solidity
function withdrawContribution(uint256 _roundId) external returns (uint256)
```

Withdraw contribution of the message sender from a round which can no longer be confirmed.

Withdraw only when the round is cancelled or the raise ends without enough raised quantity or the confirmation
time limit has expired.

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _roundId | uint256 | Round identifier. |

### Return Values

Withdrawn value.

## withdrawProjectToken

```solidity
function withdrawProjectToken(uint256 _launchId, uint256 _index) external returns (uint256)
```

Withdraw the allocation of the message sender from a round of a launch.

Withdraw only after the round is confirmed.

Also receive corresponding cashback.

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _launchId | uint256 | Launch identifier. |
| _index | uint256 | Index of the round in the launch. |

### Return Values

Withdrawn amount.

## _newRound

```solidity
function _newRound(uint256 _launchId, struct IPrestigePadRound.PrestigePadRoundInput _round) internal returns (uint256)
```

Create a new round.

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _launchId | uint256 | Launch identifier. |
| _round | struct IPrestigePadRound.PrestigePadRoundInput | Round input. |

### Return Values

New round identifier.

## _contributeCurrentRound

```solidity
function _contributeCurrentRound(uint256 _launchId, uint256 _quantity) internal returns (uint256)
```

Contribute to the current round of a launch.

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _launchId | uint256 | Launch identifier. |
| _quantity | uint256 | Contributed quantity. |

### Return Values

Contributed value.

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

