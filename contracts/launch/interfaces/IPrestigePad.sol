// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IFund} from "../../common/structs/IFund.sol";
import {IRate} from "../../common/structs/IRate.sol";
import {IValidatable} from "../../common/interfaces/IValidatable.sol";

import {IPrestigePadLaunch} from "../structs/IPrestigePadLaunch.sol";
import {IPrestigePadRound} from "../structs/IPrestigePadRound.sol";

import {IProjectLaunchpad} from "./IProjectLaunchpad.sol";

interface IPrestigePad is
IPrestigePadLaunch,
IPrestigePadRound,
IFund,
IRate,
IValidatable,
IProjectLaunchpad {
    event FeeRateUpdate(uint256 newValue);

    event BaseUnitPriceRangeUpdate(
        uint256 baseMinUnitPrice,
        uint256 baseMaxUnitPrice
    );

    event Whitelist(address indexed account);
    event Unwhitelist(address indexed account);

    event InitiatorRegistration(bytes32 indexed zone, address indexed account);
    event InitiatorDeregistration(bytes32 indexed zone, address indexed account);

    event NewLaunch(
        uint256 indexed launchId,
        uint256 indexed projectId,
        address indexed initiator,
        string uri,
        uint256 initialQuantity
    );
    event NewRound(
        uint256 indexed roundId,
        uint256 indexed projectId,
        string uri,
        PrestigePadRoundQuotaInput quota,
        PrestigePadRoundQuoteInput quote
    );

    event RoundUpdate(
        uint256 indexed launchId,
        uint256 indexed roundId,
        uint256 index,
        PrestigePadRoundInput round
    );
    event LaunchCurrentRoundCancellation(
        uint256 indexed launchId,
        uint256 indexed roundId
    );
    event LaunchCurrentRoundConfirmation(
        uint256 indexed launchId,
        uint256 indexed roundId,
        uint256 soldQuantity,
        uint256 value,
        uint256 feeAmount,
        uint256 cashbackBaseAmount
    );
    event LaunchFinalization(uint256 launchId);
    event LaunchNextRoundInitiation(
        uint256 indexed launchId,
        uint256 indexed roundId,
        uint256 indexed cashbackFundId,
        uint40 raiseStartsAt,
        uint40 raiseEndsAt
    );

    event Deposit(
        uint256 indexed launchId,
        uint256 indexed roundId,
        address indexed depositor,
        uint256 quantity,
        uint256 value
    );
    event DepositWithdrawal(
        uint256 indexed roundId,
        address indexed depositor,
        uint256 quantity,
        uint256 value
    );

    error AlreadyConfirmed();
    error AlreadyInitiated();
    error AlreadyWithdrawn();
    error InvalidCancelling();
    error InvalidConfirming();
    error InvalidDepositing();
    error InvalidFinalizing();
    error InvalidInitiating();
    error InvalidRemoving();
    error InvalidLaunchId();
    error InvalidRoundId();
    error InvalidUnitPrice();
    error InvalidWithdrawing();
    error MaxSellingQuantityExceeded();
    error NoRoundToInitiate();
    error NotConfirmed();
    error NotEnoughSoldQuantity();
    error NotInitiated();
    error NotRegisteredAccount();
    error NothingToWithdraw();
    error RegisteredAccount();
    error StillRaising();
    error Timeout();

    function feeReceiver() external view returns (address feeReceiver);
    function priceWatcher() external view returns (address priceWatcher);
    function reserveVault() external view returns (address reserveVault);

    function getFeeRate() external view returns (Rate memory rate);

    function baseMinUnitPrice() external view returns (uint256 baseMinUnitPrice);
    function baseMaxUnitPrice() external view returns (uint256 baseMaxUnitPrice);

    function launchNumber() external view returns (uint256 launchNumber);
    function roundNumber() external view returns (uint256 roundNumber);

    function deposits(uint256 roundId, address depositor) external view returns (uint256 deposit);
    function withdrawAt(uint256 roundId, address account) external view returns (uint256 withdrawAt);

    function getLaunch(uint256 launchId) external view returns (PrestigePadLaunch memory launch);
    function getRound(uint256 roundId) external view returns (PrestigePadRound memory round);

    function initiateLaunch(
        address initiator,
        bytes32 zone,
        string calldata projectURI,
        string calldata launchURI,
        uint256 initialQuantity,
        Validation calldata validation
    ) external returns (uint256);

    function updateRound(
        uint256 launchId,
        uint256 index,
        PrestigePadRoundInput calldata round
    ) external returns (uint256 roundId);
    function updateRounds(
        uint256 launchId,
        uint256 removedRoundNumber,
        PrestigePadRoundInput[] calldata addedRounds
    ) external returns (uint256 lastIndex);

    function cancelCurrentRound(uint256 launchId)
    external returns (uint256 index, uint256 roundId);
    function confirmCurrentRound(uint256 launchId)
    external payable returns (uint256 index);
    function raiseNextRound(
        uint256 launchId,
        uint256 cashbackThreshold,
        uint256 cashbackBaseRate,
        address[] calldata cashbackCurrencies,
        uint256[] calldata cashbackDenominations,
        uint40 raiseStartsAt,
        uint40 raiseDuration
    ) external returns (uint256 index);

    function depositCurrentRound(uint256 launchId, uint256 quantity) external payable returns (uint256 value);
    function withdrawDeposit(uint256 roundId) external returns (uint256 value);
    
    function safeDepositCurrentRound(
        uint256 launchId,
        uint256 quantity,
        bytes32 anchor
    ) external payable returns (uint256 value);
}
