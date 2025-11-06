# Solidity API

## PrestigePad

@author Briky Team

 @notice The `PrestigePad` contract facilitates the launch of real estate project through crowdfunding. Authorized
         initiators

 @dev    Implementation involves server-side support.
 @dev    ERC-20 tokens are identified by their contract addresses.
         Native coin is represented by the zero address (0x0000000000000000000000000000000000000000).
 @dev    Quantities are expressed in absolute units. Scale these values by `10 ** IAssetToken(projectToken).decimals()` to
         obtain the correct amounts under the `IAssetToken` convention.

### validLaunch

```solidity
modifier validLaunch(uint256 _launchId)
```

@notice Verify a valid launch identifier.

         Name        Description
 @param  _launchId   Launch identifier.

### validRound

```solidity
modifier validRound(uint256 _roundId)
```

@notice Verify a valid round identifier.

         Name        Description
 @param  _roundId    Round identifier.

### onlyInitiator

```solidity
modifier onlyInitiator(uint256 _launchId)
```

@notice Verify the message sender is the initiator of a launch.

         Name        Description
 @param  _launchId   Launch identifier.

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
function initialize(address _admin, address _projectToken, address _priceWatcher, address _feeReceiver, address _reserveVault, address _validator, uint256 _baseMinUnitPrice, uint256 _baseMaxUnitPrice) external
```

@notice Initialize the contract after deployment, serving as the constructor.

         Name                Description
 @param  _admin              `Admin` contract address.
 @param  _projectToken       `ProjectToken` contract address.
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

### getLaunch

```solidity
function getLaunch(uint256 _launchId) external view returns (struct IPrestigePadLaunch.PrestigePadLaunch)
```

Name            Description
 @param  _launchId       Launch identifier.

 @return Configuration and rounds of the launch.

### getRound

```solidity
function getRound(uint256 _roundId) external view returns (struct IPrestigePadRound.PrestigePadRound)
```

Name            Description
 @param  _roundId        Round identifier.

 @return Configuration and progress of the round.

 @dev    Phases of a round:
         - Unscheduled: agenda.raiseStartsAt = 0
         - Scheduled: block.timestamp < agenda.raiseStartsAt
         - Raise: agenda.raiseStartsAt <= block.timestamp < agenda.raiseEndsAt
         - Awaiting Confirmation: agenda.raiseEndsAt
                                     <= block.timestamp
                                     < agenda.raiseEndsAt + PrestigePadConstant.RAISE_CONFIRMATION_TIME_LIMIT
         - Confirmed: agenda.confirmedAt > 0
         - Cancelled: quota.totalSupply = 0

### isFinalized

```solidity
function isFinalized(uint256 _launchId) external view returns (bool)
```

Name            Description
 @param  _launchId       Launch identifier.

 @return Whether the launch has been finalized.

### allocationOfAt

```solidity
function allocationOfAt(address _account, uint256 _launchId, uint256 _at) external view returns (uint256)
```

Name            Description
 @param  _account        Account address.
 @param  _launchId       Launch identifier.
 @param  _at             Reference timestamp.

 @return Allocation of the account at the reference timestamp.

### supportsInterface

```solidity
function supportsInterface(bytes4 _interfaceId) public view virtual returns (bool)
```

Name            Description
 @param  _interfaceId    Interface identifier.

 @return Whether the interface is supported.

### initiateLaunch

```solidity
function initiateLaunch(address _initiator, bytes32 _zone, string _projectURI, string _launchURI, uint256 _initialQuantity, uint256 _feeRate, struct IValidation.Validation _validation) external returns (uint256)
```

@notice Initiate a new launch for an estate project.

         Name                Description
 @param  _initiator          Initiator address.
 @param  _zone               Zone code.
 @param  _projectURI         URI of project metadata.
 @param  _launchURI          URI of launch metadata.
 @param  _initialQuantity    Initial quantity of tokens to be minted for the initiator.
 @param  _feeRate            Fraction of raised value charged as fee, applied for all rounds.
 @param  _validation         Validation package from the validator.

 @return New launch identifier.

 @dev    Permission: Executives active in the zone of the estate.

### updateLaunchURI

```solidity
function updateLaunchURI(uint256 _launchId, string _uri, struct IValidation.Validation _validation) external
```

@notice Update the URI of information of a launch.
 @notice Update only if the launch is not finalized.

         Name                    Description
 @param  _launchId               Launch identifier.
 @param  _uri                    URI of launch metadata.
 @param  _validation             Validation package from the validator.

 @dev    Permission: Initiator of the launch.

### updateRound

```solidity
function updateRound(uint256 _launchId, uint256 _index, struct IPrestigePadRound.PrestigePadRoundInput _round) external returns (uint256)
```

@notice Update a round in a launch.
 @notice Update only before the round is scheduled.

         Name            Description
 @param  _launchId       Launch identifier.
 @param  _index          Index of the round in the launch.
 @param  _round          New round configuration.

 @return New round identifier.

 @dev    Permission: Initiator of the launch.

### updateRounds

```solidity
function updateRounds(uint256 _launchId, uint256 _removedRoundNumber, struct IPrestigePadRound.PrestigePadRoundInput[] _addedRounds) external returns (uint256)
```

@notice Update multiple rounds in a launch by removing multiple rounds from the end and appending new ones.
 @notice Update only with rounds that are not scheduled.

         Name                    Description
 @param  _launchId               Launch identifier.
 @param  _removedRoundNumber     Number of rounds to remove from the end.
 @param  _addedRounds            Array of new rounds.

 @return Index of the last added round.

 @dev    Permission: Initiator of the launch.

### scheduleNextRound

```solidity
function scheduleNextRound(uint256 _launchId, uint256 _cashbackThreshold, uint256 _cashbackBaseRate, address[] _cashbackCurrencies, uint256[] _cashbackDenominations, uint40 _raiseStartsAt, uint40 _raiseDuration) external returns (uint256)
```

@notice Schedule the next round of a launch with cashback configuration.
 @notice Schedule only if the previous round has been confirmed.

         Name                        Description
 @param  _launchId                   Launch identifier.
 @param  _cashbackThreshold          Minimum contributed quantity of an address to receive cashback.
 @param  _cashbackBaseRate           Fraction of contribution to cashback.
 @param  _cashbackCurrencies         Array of extra currency addresses to cashback.
 @param  _cashbackDenominations      Array of extra currency denominations to cashback, respective to each extra currency.
 @param  _raiseStartsAt              Raise start timestamp.
 @param  _raiseDuration              Raise duration.

 @return Index of the scheduled round.

 @dev    Permission: Initiator of the launch.

### cancelCurrentRound

```solidity
function cancelCurrentRound(uint256 _launchId) external returns (uint256, uint256)
```

ones
 @notice Cancel the current round of a launch.
 @notice Cancel only before the current round is confirmed.

         Name                        Description
 @param  _launchId                   Launch identifier.

 @return Index of the cancelled round.
 @return New round identifier at the index.

 @dev    Permission: Initiator of the launch.

### safeConfirmCurrentRound

```solidity
function safeConfirmCurrentRound(uint256 _launchId, bytes32 _anchor) external payable returns (uint256)
```

@notice Confirm the current round of a launch and mint tokens to contributors.
 @notice Confirm only if the round has raised at least minimum quantity (even if the sale period has not yet ended) and
         before the confirmation time limit has expired.
 @notice The message sender must provide sufficient extra-currency amounts for the cashback fund.

         Name                        Description
 @param  _launchId                   Launch identifier.
 @param  _anchor                     Keccak256 hash of `uri` of the launch.

 @return Index of the confirmed round.

 @dev    Permission: Initiator of the launch.
 @dev    Anchor enforces consistency between this contract and the client-side.

### safeFinalize

```solidity
function safeFinalize(uint256 _launchId, bytes32 _anchor) external
```

@notice Finalize a launch to finish capital raising.
 @notice Finalize only when all rounds are confirmed.

         Name                        Description
 @param  _launchId                   Launch identifier.
 @param  _anchor                     Keccak256 hash of `uri` of the launch.

 @dev    Permission: Initiator of the launch.
 @dev    The launch can only be finalized after all rounds are confirmed, and no further rounds can be created.
 @dev    Anchor enforces consistency between this contract and the client-side.

### contributeCurrentRound

```solidity
function contributeCurrentRound(uint256 _launchId, uint256 _quantity) external payable returns (uint256)
```

@notice Contribute to the current round of a launch.
 @notice Contribute only during raise period.

         Name        Description
 @param  _launchId   Launch identifier.
 @param  _quantity   Contributed quantity.

 @return Contributed value.

### safeContributeCurrentRound

```solidity
function safeContributeCurrentRound(uint256 _launchId, uint256 _quantity, bytes32 _anchor) external payable returns (uint256)
```

@notice Contribute to the current round of a launch with anchor verification.
 @notice Contribute only during raise period.

         Name        Description
 @param  _launchId   Launch identifier.
 @param  _quantity   Contributed quantity.
 @param  _anchor     Keccak256 hash of `uri` of the launch.

 @return Contributed value.

 @dev    Anchor enforces consistency between this contract and the client-side.

### withdrawContribution

```solidity
function withdrawContribution(uint256 _roundId) external returns (uint256)
```

@notice Withdraw contribution of the message sender from a round which can no longer be confirmed.
 @notice Withdraw only when the round is cancelled or the raise ends without enough raised quantity or the confirmation
         time limit has expired.

         Name        Description
 @param  _roundId    Round identifier.

 @return Withdrawn value.

### withdrawProjectToken

```solidity
function withdrawProjectToken(uint256 _launchId, uint256 _index) external returns (uint256)
```

@notice Withdraw the allocation of the message sender from a round of a launch.
 @notice Withdraw only after the round is confirmed.
 @notice Also receive corresponding cashback.

         Name            Description
 @param  _launchId       Launch identifier.
 @param  _index          Index of the round in the launch.

 @return Withdrawn amount.

### _newRound

```solidity
function _newRound(uint256 _launchId, struct IPrestigePadRound.PrestigePadRoundInput _round) internal returns (uint256)
```

@notice Create a new round.

         Name        Description
 @param  _launchId   Launch identifier.
 @param  _round      Round input.

 @return New round identifier.

### _contributeCurrentRound

```solidity
function _contributeCurrentRound(uint256 _launchId, uint256 _quantity) internal returns (uint256)
```

@notice Contribute to the current round of a launch.

         Name        Description
 @param  _launchId   Launch identifier.
 @param  _quantity   Contributed quantity.

 @return Contributed value.

### _provideCashbackFund

```solidity
function _provideCashbackFund(uint256 _cashbackFundId) internal returns (uint256)
```

@notice Provide cashback fund in the main currency, using a sufficient portion of the tokenization fee and in other
         extras, using amounts forwarded from the message sender.

         Name                Description
 @param  _cashbackFundId     Cashback fund identifier.

 @return Main currency cashback value.

