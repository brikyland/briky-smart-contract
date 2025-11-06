# Solidity API

## IPrestigePad

@author Briky Team

 @notice Interface for contract `PrestigePad`.
 @notice The `PrestigePad` contract facilitates the launch of real estate project through crowdfunding. Authorized
         initiators

 @dev    Implementation involves server-side support.
 @dev    ERC-20 tokens are identified by their contract addresses.
         Native coin is represented by the zero address (0x0000000000000000000000000000000000000000).
 @dev    Quantities are expressed in absolute units. Scale these values by `10 ** IAssetToken(projectToken).decimals()` to
         obtain the correct amounts under the `IAssetToken` convention.

### BaseUnitPriceRangeUpdate

```solidity
event BaseUnitPriceRangeUpdate(uint256 baseMinUnitPrice, uint256 baseMaxUnitPrice)
```

@notice Emitted when the acceptable range of unit price denominated in USD is updated.

         Name                 Description
 @param  baseMinUnitPrice     New minimum unit price denominated in USD.
 @param  baseMaxUnitPrice     New maximum unit price denominated in USD.

### InitiatorRegistration

```solidity
event InitiatorRegistration(bytes32 zone, address account)
```

@notice Emitted when an initiator is registered in a zone.

         Name        Description
 @param  zone        Zone code.
 @param  account     Initiator address.

### InitiatorDeregistration

```solidity
event InitiatorDeregistration(bytes32 zone, address account)
```

@notice Emitted when an initiator is deregistered from a zone.

         Name        Description
 @param  zone        Zone code.
 @param  account     Initiator address.

### NewLaunch

```solidity
event NewLaunch(uint256 launchId, uint256 projectId, address initiator, string uri, uint256 initialQuantity, struct IRate.Rate feeRate)
```

@notice Emitted when a new launch is initiated.

         Name                Description
 @param  launchId            Launch identifier.
 @param  projectId           Project identifier.
 @param  initiator           Initiator address.
 @param  uri                 URI of launch metadata.
 @param  initialQuantity     Initial quantity of tokens to be minted.
 @param  feeRate             Fraction of raised value charged as fee, applied across all rounds.

### NewRound

```solidity
event NewRound(uint256 roundId, uint256 launchId, string uri, struct IPrestigePadRound.PrestigePadRoundQuotaInput quota, struct IPrestigePadRound.PrestigePadRoundQuoteInput quote)
```

@notice Emitted when a new round is created for a launch.

         Name                Description
 @param  roundId             Round identifier.
 @param  launchId            Launch identifier.
 @param  uri                 URI of round metadata.
 @param  quota               Initialization input for `PrestigePadRoundQuota`.
 @param  quote               Initialization input for `PrestigePadRoundQuote`.

### LaunchRoundAppendage

```solidity
event LaunchRoundAppendage(uint256 launchId, uint256 roundId)
```

@notice Emitted when a round is appended to a launch.

         Name                Description
 @param  launchId            Launch identifier.
 @param  roundId             Round identifier.

### LaunchCurrentRoundCancellation

```solidity
event LaunchCurrentRoundCancellation(uint256 launchId, uint256 roundId)
```

@notice Emitted when the current round of a launch is cancelled.

         Name                Description
 @param  launchId            Launch identifier.
 @param  roundId             Round identifier.

### LaunchCurrentRoundConfirmation

```solidity
event LaunchCurrentRoundConfirmation(uint256 launchId, uint256 roundId, uint256 raisedQuantity, uint256 contribution, uint256 fee, uint256 cashbackBaseAmount)
```

@notice Emitted when the current round of a launch is confirmed.

         Name                Description
 @param  launchId            Launch identifier.
 @param  roundId             Round identifier.
 @param  raisedQuantity      Total contributed quantity.
 @param  contribution        Total contributed value.
 @param  fee                 Tokenizing fee.
 @param  cashbackBaseAmount  Cashback derived from the contribution.

### LaunchFinalization

```solidity
event LaunchFinalization(uint256 launchId)
```

@notice Emitted when a launch is finalized.

         Name                    Description
 @param  launchId                Launch identifier.

### LaunchRoundsRemoval

```solidity
event LaunchRoundsRemoval(uint256 launchId, uint256 removedRoundNumber, uint256 index)
```

@notice Emitted when a launch gets its rounds removed from an index.

         Name                    Description
 @param  launchId                Launch identifier.
 @param  removedRoundNumber      Number of removed rounds.
 @param  index                   Index of the first removed round.

### LaunchNextRoundSchedule

```solidity
event LaunchNextRoundSchedule(uint256 launchId, uint256 roundId, uint256 cashbackFundId, uint40 raiseStartsAt, uint40 raiseEndsAt)
```

@notice Emitted when the next round of a launch is scheduled.

         Name                    Description
 @param  launchId                Launch identifier.
 @param  roundId                 Round identifier.
 @param  cashbackFundId          Cashback fund identifier.
 @param  raiseStartsAt           When the raise starts.
 @param  raiseEndsAt             When the raise ends.

### LaunchRoundUpdate

```solidity
event LaunchRoundUpdate(uint256 launchId, uint256 roundId, uint256 index)
```

@notice Emitted when a round in a launch is updated.

         Name                    Description
 @param  launchId                Launch identifier.
 @param  roundId                 New round identifier.
 @param  index                   Index of the round in the launch.

### LaunchURIUpdate

```solidity
event LaunchURIUpdate(uint256 launchId, string launchURI)
```

@notice Emitted when the URI of a launch is updated.

         Name                    Description
 @param  launchId                Launch identifier.
 @param  launchURI               New URI of project metadata.

### Contribution

```solidity
event Contribution(uint256 launchId, uint256 roundId, address contributor, uint256 quantity, uint256 value)
```

@notice Emitted when a contribution is made to a round.

         Name            Description
 @param  launchId        Launch identifier.
 @param  roundId         Round identifier.
 @param  contributor     Contributor address.
 @param  quantity        Contributed quantity.
 @param  value           Contributed value.

### ContributionWithdrawal

```solidity
event ContributionWithdrawal(uint256 roundId, address contributor, uint256 quantity, uint256 value)
```

@notice Emitted when a contribution is withdrawn from a round.

         Name            Description
 @param  roundId         Round identifier.
 @param  contributor     Contributor address.
 @param  quantity        Withdrawn quantity.
 @param  value           Withdrawn value.

### AlreadyConfirmed

```solidity
error AlreadyConfirmed()
```

===== ERROR ===== *

### AlreadyWithdrawn

```solidity
error AlreadyWithdrawn()
```

### InvalidCancelling

```solidity
error InvalidCancelling()
```

### InvalidConfirming

```solidity
error InvalidConfirming()
```

### InvalidContributing

```solidity
error InvalidContributing()
```

### InvalidFinalizing

```solidity
error InvalidFinalizing()
```

### InvalidLaunchId

```solidity
error InvalidLaunchId()
```

### InvalidScheduling

```solidity
error InvalidScheduling()
```

### InvalidRemoving

```solidity
error InvalidRemoving()
```

### InvalidRoundId

```solidity
error InvalidRoundId()
```

### InvalidUnitPrice

```solidity
error InvalidUnitPrice()
```

### InvalidWithdrawing

```solidity
error InvalidWithdrawing()
```

### MaxRaisingQuantityExceeded

```solidity
error MaxRaisingQuantityExceeded()
```

### NoRoundToInitiate

```solidity
error NoRoundToInitiate()
```

### NotConfirmed

```solidity
error NotConfirmed()
```

### NotEnoughSoldQuantity

```solidity
error NotEnoughSoldQuantity()
```

### NotInitiated

```solidity
error NotInitiated()
```

### NotRegisteredAccount

```solidity
error NotRegisteredAccount()
```

### NothingToWithdraw

```solidity
error NothingToWithdraw()
```

### RegisteredAccount

```solidity
error RegisteredAccount()
```

### StillRaising

```solidity
error StillRaising()
```

### Timeout

```solidity
error Timeout()
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

### launchNumber

```solidity
function launchNumber() external view returns (uint256 launchNumber)
```

Name            Description
 @return launchNumber    Total number of launches created.

### roundNumber

```solidity
function roundNumber() external view returns (uint256 roundNumber)
```

Name            Description
 @return roundNumber     Total number of rounds created.

### getLaunch

```solidity
function getLaunch(uint256 launchId) external view returns (struct IPrestigePadLaunch.PrestigePadLaunch launch)
```

Name        Description
 @param  launchId    Launch identifier.
 @return launch      Configuration and rounds of the launch.

### getRound

```solidity
function getRound(uint256 roundId) external view returns (struct IPrestigePadRound.PrestigePadRound round)
```

Name        Description
 @param  roundId     Round identifier.
 @return round       Configuration and progress of the round.

 @dev    Phases of a round:
         - Unscheduled: agenda.raiseStartsAt = 0
         - Scheduled: block.timestamp < agenda.raiseStartsAt
         - Raise: agenda.raiseStartsAt <= block.timestamp < agenda.raiseEndsAt
         - Awaiting Confirmation: agenda.raiseEndsAt
                                     <= block.timestamp
                                     < agenda.raiseEndsAt + PrestigePadConstant.RAISE_CONFIRMATION_TIME_LIMIT
         - Confirmed: agenda.confirmedAt > 0
         - Cancelled: quota.totalSupply = 0

### contributions

```solidity
function contributions(uint256 roundId, address account) external view returns (uint256 quantity)
```

Name            Description
 @param  roundId         Round identifier.
 @param  account         EVM address.
 @return quantity        Contributed quantity of the account in the round.

### withdrawAt

```solidity
function withdrawAt(uint256 roundId, address account) external view returns (uint256 withdrawAt)
```

Name            Description
 @param  roundId         Round identifier.
 @param  account         EVM address.
 @return withdrawAt      Withdrawal timestamp of the account in the round.

### initiateLaunch

```solidity
function initiateLaunch(address initiator, bytes32 zone, string projectURI, string launchURI, uint256 initialQuantity, uint256 feeRate, struct IValidation.Validation validation) external returns (uint256 launchId)
```

@notice Initiate a new launch for an estate project.

         Name                Description
 @param  initiator           Initiator address.
 @param  zone                Zone code.
 @param  projectURI          URI of project metadata.
 @param  launchURI           URI of launch metadata.
 @param  initialQuantity     Initial quantity of tokens to be minted for the initiator.
 @param  feeRate             Fraction of raised value charged as fee, applied for all rounds.
 @param  validation          Validation package from the validator.
 @return launchId            New launch identifier.

 @dev    Permission: Executives active in the zone of the estate.

### updateLaunchURI

```solidity
function updateLaunchURI(uint256 launchId, string uri, struct IValidation.Validation validation) external
```

@notice Update the URI of information a launch.
 @notice Update only if the launch is not finalized.

         Name                    Description
 @param  launchId                Launch identifier.
 @param  uri                     URI of launch metadata.
 @param  validation              Validation package from the validator.

 @dev    Permission: Initiator of the launch.
 @dev    Validation data:
         ```
         data = abi.encode(
             _launchId,
             _uri
         );

### updateRound

```solidity
function updateRound(uint256 launchId, uint256 index, struct IPrestigePadRound.PrestigePadRoundInput round) external returns (uint256 roundId)
```

@notice Update a round in a launch.
 @notice Update only before the round is scheduled.

         Name                    Description
 @param  launchId                Launch identifier.
 @param  index                   Index of the round in the launch.
 @param  round                   New round configuration.
 @return roundId                 New round identifier.

 @dev    Permission: Initiator of the launch.
 @dev    Validation data:
         ```
         data = abi.encode(
             _launchId,
             _uri
         );

### updateRounds

```solidity
function updateRounds(uint256 launchId, uint256 removedRoundNumber, struct IPrestigePadRound.PrestigePadRoundInput[] addedRounds) external returns (uint256 lastIndex)
```

@notice Update multiple rounds in a launch by removing multiple rounds from the end and appending new ones.
 @notice Update only with rounds that are not scheduled.

         Name                    Description
 @param  launchId                Launch identifier.
 @param  removedRoundNumber      Number of rounds to remove from the end.
 @param  addedRounds             Array of new rounds.
 @return lastIndex               Index of the last added round.

 @dev    Permission: Initiator of the launch.

### cancelCurrentRound

```solidity
function cancelCurrentRound(uint256 launchId) external returns (uint256 index, uint256 roundId)
```

@notice Cancel the current round of a launch.
 @notice Cancel only before the current round is confirmed.

         Name                    Description
 @param  launchId                Launch identifier.
 @return index                   Index of the cancelled round.
 @return roundId                 New round identifier at the index.

 @dev    Permission: Initiator of the launch.

### scheduleNextRound

```solidity
function scheduleNextRound(uint256 launchId, uint256 cashbackThreshold, uint256 cashbackBaseRate, address[] cashbackCurrencies, uint256[] cashbackDenominations, uint40 raiseStartsAt, uint40 raiseDuration) external returns (uint256 index)
```

@notice Schedule the next round for a launch with cashback configuration.
 @notice Schedule only if the previous round has been confirmed.

         Name                    Description
 @param  launchId                Launch identifier.
 @param  cashbackThreshold       Minimum contributed quantity of an address to receive cashback.
 @param  cashbackBaseRate        Fraction of contribution to cashback.
 @param  cashbackCurrencies      Array of extra currency addresses to cashback.
 @param  cashbackDenominations   Array of extra currency denominations to cashback, respective to each extra currency.
 @param  raiseStartsAt           Raise start timestamp.
 @param  raiseDuration           Raise duration.
 @return index                   Index of the scheduled round.

 @dev    Permission: Initiator of the launch.

### contributeCurrentRound

```solidity
function contributeCurrentRound(uint256 launchId, uint256 quantity) external payable returns (uint256 value)
```

@notice Contribute to the current round of a launch.
 @notice Contribute only during raise period.

         Name        Description
 @param  launchId    Launch identifier.
 @param  quantity    Contributed quantity.
 @return value       Contributed value.

### withdrawContribution

```solidity
function withdrawContribution(uint256 roundId) external returns (uint256 value)
```

@notice Withdraw contribution of the message sender from a round which can no longer be confirmed.
 @notice Withdraw only when the round is cancelled or the raise ends without enough raised quantity or the confirmation
         time limit has expired.

         Name        Description
 @param  roundId     Round identifier.
 @return value       Withdrawn value.

### safeConfirmCurrentRound

```solidity
function safeConfirmCurrentRound(uint256 launchId, bytes32 anchor) external payable returns (uint256 index)
```

@notice Confirm the current round of a launch and mint tokens to contributors.
 @notice Confirm only if the round has raised at least minimum quantity (even if the sale period has not yet ended) and
         before the confirmation time limit has expired.
 @notice The message sender must provide sufficient extra-currency amounts for the cashback fund.

         Name        Description
 @param  launchId    Launch identifier.
 @param  anchor      Keccak256 hash of `uri` of the launch.
 @return index       Index of the confirmed round.

 @dev    Permission: Initiator of the launch.
 @dev    Anchor enforces consistency between this contract and the client-side.

### safeContributeCurrentRound

```solidity
function safeContributeCurrentRound(uint256 launchId, uint256 quantity, bytes32 anchor) external payable returns (uint256 value)
```

@notice Contribute to the current round of a launch with anchor verification.
 @notice Contribute only during raise period.

         Name        Description
 @param  launchId    Launch identifier.
 @param  quantity    Contributed quantity.
 @param  anchor      Keccak256 hash of `uri` of the launch.
 @return value       Contributed value.

 @dev    Anchor enforces consistency between this contract and the client-side.

### safeFinalize

```solidity
function safeFinalize(uint256 launchId, bytes32 anchor) external
```

@notice Finalize a launch to finish capital raising.
 @notice Finalize only when all rounds are confirmed.

         Name        Description
 @param  launchId    Launch identifier.
 @param  anchor      Keccak256 hash of `uri` of the launch.

 @dev    Permission: Initiator of the launch.
 @dev    The launch can only be finalized after all rounds are confirmed, and no further rounds can be created.
 @dev    Anchor enforces consistency between this contract and the client-side.

