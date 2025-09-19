// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import {IFund} from "../../common/structs/IFund.sol";
import {IValidatable} from "../../common/interfaces/IValidatable.sol";

import {IPrestigePadLaunch} from "../structs/IPrestigePadLaunch.sol";
import {IPrestigePadRound} from "../structs/IPrestigePadRound.sol";

import {IProjectLaunchpad} from "./IProjectLaunchpad.sol";

/**
 *  @author Briky Team
 *
 *  @notice Interface for contract `PrestigePad`.
 *  @notice The `PrestigePad` contract facilitates the launch of real estate project through crowdfunding. Authorized
 *          initiators
 *
 *  @dev    Implementation involves server-side support.
 *  @dev    ERC-20 tokens are identified by their contract addresses.
 *          Native coin is represented by the zero address (0x0000000000000000000000000000000000000000).
 *  @dev    Quantities are expressed in absolute units. Scale these values by `10 ** ProjectToken.decimals()` to obtain
 *          the correct amounts under the `ProjectToken` convention.
 */
interface IPrestigePad is
IPrestigePadLaunch,
IPrestigePadRound,
IFund,
IValidatable,
IProjectLaunchpad {
    /** ===== EVENT ===== **/
    /**
     *  @notice Emitted when the acceptable range of unit price denominated in USD is updated.
     *
     *          Name                 Description
     *  @param  baseMinUnitPrice     New minimum unit price denominated in USD.
     *  @param  baseMaxUnitPrice     New maximum unit price denominated in USD.
     */
    event BaseUnitPriceRangeUpdate(
        uint256 baseMinUnitPrice,
        uint256 baseMaxUnitPrice
    );

    /**
     *  @notice Emitted when an initiator is registered in a zone.
     *
     *          Name        Description
     *  @param  zone        Zone code.
     *  @param  account     Initiator address.
     */
    event InitiatorRegistration(
        bytes32 indexed zone,
        address indexed account
    );

    /**
     *  @notice Emitted when an initiator is deregistered from a zone.
     *
     *          Name        Description
     *  @param  zone        Zone code.
     *  @param  account     Initiator address.
     */
    event InitiatorDeregistration(
        bytes32 indexed zone,
        address indexed account
    );

    /**
     *  @notice Emitted when a new launch is initiated.
     *
     *          Name                Description
     *  @param  launchId            Launch identifier.
     *  @param  projectId           Project identifier.
     *  @param  initiator           Initiator address.
     *  @param  uri                 URI of launch metadata.
     *  @param  initialQuantity     Initial quantity of tokens to be minted.
     *  @param  feeRate             Fraction of the raised value charged as fee, applied across all rounds.
     */
    event NewLaunch(
        uint256 indexed launchId,
        uint256 indexed projectId,
        address indexed initiator,
        string uri,
        uint256 initialQuantity,
        Rate feeRate
    );

    /**
     *  @notice Emitted when a new round is created for a launch.
     *
     *          Name        Description
     *  @param  roundId     Round identifier.
     *  @param  launchId    Launch identifier.
     *  @param  uri         URI of round metadata.
     *  @param  quota       Initialization input for `PrestigePadRoundQuota`.
     *  @param  quote       Initialization input for `PrestigePadRoundQuote`.
     */
    event NewRound(
        uint256 indexed roundId,
        uint256 indexed launchId,
        string uri,
        PrestigePadRoundQuotaInput quota,
        PrestigePadRoundQuoteInput quote
    );

    /**
     *  @notice Emitted when the current round of a launch is cancelled.
     *
     *          Name        Description
     *  @param  launchId    Launch identifier.
     *  @param  roundId     Round identifier.
     */
    event LaunchCurrentRoundCancellation(
        uint256 indexed launchId,
        uint256 indexed roundId
    );

    /**
     *  @notice Emitted when the current round of a launch is confirmed.
     *
     *          Name                    Description
     *  @param  launchId                Launch identifier.
     *  @param  roundId                 Round identifier.
     *  @param  raisedQuantity          Total raised quantity.
     *  @param  contribution            Total contribution.
     *  @param  fee                     Fee charged on the sale value.
     *  @param  cashbackBaseAmount      Main currency cashback amount.
     */
    event LaunchCurrentRoundConfirmation(
        uint256 indexed launchId,
        uint256 indexed roundId,
        uint256 raisedQuantity,
        uint256 contribution,
        uint256 fee,
        uint256 cashbackBaseAmount
    );

    /**
     *  @notice Emitted when a launch is finalized.
     *
     *          Name        Description
     *  @param  launchId    Launch identifier.
     */
    event LaunchFinalization(uint256 launchId);

    /**
     *  @notice Emitted when the next round of a launch is initiated.
     *
     *          Name                Description
     *  @param  launchId            Launch identifier.
     *  @param  roundId             Round identifier.
     *  @param  cashbackFundId      Fund identifier for cashback.
     *  @param  raiseStartsAt       When the raise starts.
     *  @param  raiseEndsAt         When the raise ends.
     */
    event LaunchNextRoundInitiation(
        uint256 indexed launchId,
        uint256 indexed roundId,
        uint256 indexed cashbackFundId,
        uint40 raiseStartsAt,
        uint40 raiseEndsAt
    );

    /**
     *  @notice Emitted when a round in a launch is updated.
     *
     *          Name        Description
     *  @param  launchId    Launch identifier.
     *  @param  roundId     Round identifier.
     *  @param  index       Index of the round in the launch.
     *  @param  round       Updated round configuration.
     */
    event LaunchRoundUpdate(
        uint256 indexed launchId,
        uint256 indexed roundId,
        uint256 index,
        PrestigePadRoundInput round
    );

    event LaunchRoundTokenWithdrawal(
        uint256 indexed roundId,
        uint256 indexed withdrawer,
        uint256 amount
    );

    /**
     *  @notice Emitted when the URI of a launch is updated.
     *
     *          Name        Description
     *  @param  launchId    Launch identifier.
     *  @param  launchURI   New URI of project metadata.
     */
    event LaunchURIUpdate(
        uint256 indexed launchId,
        string launchURI
    );

    /**
     *  @notice Emitted when a contribution is made to a round.
     *
     *          Name            Description
     *  @param  launchId        Launch identifier.
     *  @param  roundId         Round identifier.
     *  @param  contributor     Contributor address.
     *  @param  quantity        Contributed quantity of tokens.
     *  @param  value           Contributed value.
     */
    event Contribution(
        uint256 indexed launchId,
        uint256 indexed roundId,
        address indexed contributor,
        uint256 quantity,
        uint256 value
    );

    /**
     *  @notice Emitted when a contribution is withdrawn from a round.
     *
     *          Name            Description
     *  @param  roundId         Round identifier.
     *  @param  contributor     Contributor address.
     *  @param  quantity        Withdrawn quantity of tokens.
     *  @param  value           Withdrawn value.
     */
    event ContributionWithdrawal(
        uint256 indexed roundId,
        address indexed contributor,
        uint256 quantity,
        uint256 value
    );


    /** ===== ERROR ===== **/
    error AlreadyConfirmed();
    error AlreadyInitiated();
    error AlreadyWithdrawn();
    error InvalidCancelling();
    error InvalidConfirming();
    error InvalidContributing();
    error InvalidFinalizing();
    error InvalidInitiating();
    error InvalidRemoving();
    error InvalidLaunchId();
    error InvalidRoundId();
    error InvalidUnitPrice();
    error InvalidWithdrawing();
    error MaxRaisingQuantityExceeded();
    error NoRoundToInitiate();
    error NotConfirmed();
    error NotEnoughSoldQuantity();
    error NotInitiated();
    error NotRegisteredAccount();
    error NothingToWithdraw();
    error RegisteredAccount();
    error StillRaising();
    error Timeout();

    /** ===== FUNCTION ===== **/
    /* --- Query --- */
    /**
     *  @return feeReceiver Fee receiver contract address.
     */
    function feeReceiver() external view returns (address feeReceiver);

    /**
     *  @return priceWatcher Price watcher contract address.
     */
    function priceWatcher() external view returns (address priceWatcher);

    /**
     *  @return reserveVault Reserve vault contract address.
     */
    function reserveVault() external view returns (address reserveVault);

    /**
     *  @return baseMinUnitPrice Minimum unit price denominated in USD.
     */
    function baseMinUnitPrice() external view returns (uint256 baseMinUnitPrice);

    /**
     *  @return baseMaxUnitPrice Maximum unit price denominated in USD.
     */
    function baseMaxUnitPrice() external view returns (uint256 baseMaxUnitPrice);

    /**
     *  @return launchNumber Total number of launches created.
     */
    function launchNumber() external view returns (uint256 launchNumber);

    /**
     *  @return roundNumber Total number of rounds created.
     */
    function roundNumber() external view returns (uint256 roundNumber);

    /**
     *          Name        Description
     *  @param  roundId     Round identifier.
     *  @param  account     Contributor address.
     *
     *  @return contribution Contribution amount of the account in the round.
     */
    function contributions(
        uint256 roundId,
        address account
    ) external view returns (uint256 contribution);

    /**
     *          Name        Description
     *  @param  roundId     Round identifier.
     *  @param  account     Contributor address.
     *
     *  @return withdrawAt Timestamp when the account withdrew from the round.
     */
    function withdrawAt(
        uint256 roundId,
        address account
    ) external view returns (uint256 withdrawAt);

    /**
     *          Name        Description
     *  @param  launchId    Launch identifier.
     *
     *  @return launch Configuration and progress of the launch.
     */
    function getLaunch(
        uint256 launchId
    ) external view returns (PrestigePadLaunch memory launch);

    /**
     *          Name        Description
     *  @param  roundId     Round identifier.
     *
     *  @return round Configuration and progress of the round.
     */
    function getRound(
        uint256 roundId
    ) external view returns (PrestigePadRound memory round);


    /* --- Command --- */
    /**
     *  @notice Initiate a new launch for an estate project.
     *
     *          Name                Description
     *  @param  initiator           Initiator address.
     *  @param  zone                Zone code.
     *  @param  projectURI          URI of project metadata.
     *  @param  launchURI           URI of launch metadata.
     *  @param  initialQuantity     Initial quantity of tokens to be minted.
     *  @param  feeRate             Fraction of the raised value charged as fee.
     *  @param  validation          Validation package from the validator.
     *
     *  @return New launch identifier.
     *
     *  @dev    Permission: Executives active in the zone of the estate.
     */
    function initiateLaunch(
        address initiator,
        bytes32 zone,
        string calldata projectURI,
        string calldata launchURI,
        uint256 initialQuantity,
        uint256 feeRate,
        Validation calldata validation
    ) external returns (uint256);


    /**
     *  @notice Update the URI of information a launch.
     *
     *          Name                    Description
     *  @param  launchId                Launch identifier.
     *  @param  launchURI               New URI of launch information.
     *  @param  validation              Validation package from the validator.
     *
     *  @dev    Permission: Initiator of the launch.
     */
    function updateLaunchURI(
        uint256 launchId,
        string calldata launchURI,
        Validation calldata validation
    ) external;

    /**
     *  @notice Update a specific round in a launch.
     *
     *          Name                    Description
     *  @param  launchId                Launch identifier.
     *  @param  index                   Index of the round.
     *  @param  round                   New round configuration.
     *  @return roundId                 New round identifier.
     *
     *  @dev    Permission: Initiator of the launch.
     */
    function updateRound(
        uint256 launchId,
        uint256 index,
        PrestigePadRoundInput calldata round
    ) external returns (uint256 roundId);

    /**
     *  @notice Update multiple rounds in a launch by removing existing rounds and adding new ones.
     *
     *          Name                    Description
     *  @param  launchId                Launch identifier.
     *  @param  removedRoundNumber      Number of rounds to remove from the end.
     *  @param  addedRounds             Array of new rounds to add.
     *  @return lastIndex               Index of the last added round.
     *
     *  @dev    Permission: Initiator of the launch.
     */
    function updateRounds(
        uint256 launchId,
        uint256 removedRoundNumber,
        PrestigePadRoundInput[] calldata addedRounds
    ) external returns (uint256 lastIndex);

    /**
     *  @notice Cancel the current round of a launch.
     *
     *          Name                    Description
     *  @param  launchId                Launch identifier.
     *  @return index                   Index of the cancelled round.
     *  @return roundId                 Round identifier of the cancelled round.
     *
     *  @dev    Permission: Initiator of the launch.
     */
    function cancelCurrentRound(
        uint256 launchId
    ) external returns (uint256 index, uint256 roundId);

    /**
     *  @notice Confirm the current round of a launch and mint tokens to contributors.
     *
     *          Name                    Description
     *  @param  launchId                Launch identifier.
     *
     *  @return index Index of the confirmed round.
     *
     *  @dev    Permission: Initiator of the launch.
     *  @dev    Fee is charged in native coin.
     */
    function confirmCurrentRound(
        uint256 launchId
    ) external payable returns (uint256 index);

    /**
     *  @notice Initiate the next round for a launch with cashback configuration.
     *
     *          Name                    Description
     *  @param  launchId                Launch identifier.
     *  @param  cashbackThreshold       Minimum contributed quantity of an address to receive cashback.
     *  @param  cashbackBaseRate        Base rate for cashback calculations.
     *  @param  cashbackCurrencies      Array of currencies for cashback.
     *  @param  cashbackDenominations   Array of denominations for each currency.
     *  @param  raiseStartsAt           When the raise starts.
     *  @param  raiseDuration           Duration of the raising period.
     *
     *  @return index Index of the initiated round.
     *
     *  @dev    Permission: Initiator of the launch.
     */
    function raiseNextRound(
        uint256 launchId,
        uint256 cashbackThreshold,
        uint256 cashbackBaseRate,
        address[] calldata cashbackCurrencies,
        uint256[] calldata cashbackDenominations,
        uint40 raiseStartsAt,
        uint40 raiseDuration
    ) external returns (uint256 index);

    /**
     *  @notice Contribute to the current round of a launch.
     *
     *          Name                    Description
     *  @param  launchId                Launch identifier.
     *  @param  quantity                Quantity of tokens to contribute for.
     *
     *  @return value Value of the contribution.
     *
     *  @dev    Contribution currency is determined by the round configuration.
     */
    function contributeCurrentRound(
        uint256 launchId,
        uint256 quantity
    ) external payable returns (uint256 value);

    /**
     *  @notice Withdraw contribution from a cancelled round.
     *
     *          Name                    Description
     *  @param  roundId                 Round identifier.
     *  @return value                   Value of the withdrawn contribution.
     */
    function withdrawContribution(
        uint256 roundId
    ) external returns (uint256 value);

    /**
     *  @notice Contribute to the current round of a launch with anchor verification.
     *
     *          Name                    Description
     *  @param  launchId                Launch identifier.
     *  @param  quantity                Quantity of tokens to contribute for.
     *  @param  anchor                  Launch identifier for verification consistency.
     *
     *  @return value Value of the contribution.
     *
     *  @dev    Anchor enforces consistency between this contract and the client-side.
     *  @dev    Contribution currency is determined by the round configuration.
     */
    function safeContributeCurrentRound(
        uint256 launchId,
        uint256 quantity,
        bytes32 anchor
    ) external payable returns (uint256 value);

    /**
     *  @notice Finalize a launch to complete capital raising.
     *
     *          Name                    Description
     *  @param  launchId                Launch identifier.
     *
     *  @dev    Permission: Initiator of the launch.
     *  @dev    The launch can only be finalized after all rounds are confirmed, and no further rounds can be created.
     */
    function finalize(
        uint256 launchId
    ) external;
}
