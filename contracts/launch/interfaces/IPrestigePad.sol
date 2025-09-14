// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import {IFund} from "../../common/structs/IFund.sol";
import {IValidatable} from "../../common/interfaces/IValidatable.sol";

import {IPrestigePadLaunch} from "../structs/IPrestigePadLaunch.sol";
import {IPrestigePadRound} from "../structs/IPrestigePadRound.sol";

import {IProjectLaunchpad} from "./IProjectLaunchpad.sol";

interface IPrestigePad is
IPrestigePadLaunch,
IPrestigePadRound,
IFund,
IValidatable,
IProjectLaunchpad {
    event BaseUnitPriceRangeUpdate(
        uint256 baseMinUnitPrice,
        uint256 baseMaxUnitPrice
    );

    event InitiatorRegistration(bytes32 indexed zone, address indexed account);
    event InitiatorDeregistration(bytes32 indexed zone, address indexed account);

    event NewLaunch(
        uint256 indexed launchId,
        uint256 indexed projectId,
        address indexed initiator,
        string uri,
        uint256 initialQuantity,
        Rate feeRate
    );
    event NewRound(
        uint256 indexed roundId,
        uint256 indexed launchId,
        string uri,
        PrestigePadRoundQuotaInput quota,
        PrestigePadRoundQuoteInput quote
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
        uint256 fee,
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
    event LaunchRoundUpdate(
        uint256 indexed launchId,
        uint256 indexed roundId,
        uint256 index,
        PrestigePadRoundInput round
    );
    event LaunchURIUpdate(
        uint256 indexed launchId,
        string launchURI
    );

    event Contribution(
        uint256 indexed launchId,
        uint256 indexed roundId,
        address indexed contributor,
        uint256 quantity,
        uint256 value
    );
    event ContributionWithdrawal(
        uint256 indexed roundId,
        address indexed contributor,
        uint256 quantity,
        uint256 value
    );

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

    function feeReceiver() external view returns (address feeReceiver);
    function priceWatcher() external view returns (address priceWatcher);
    function reserveVault() external view returns (address reserveVault);

    function baseMinUnitPrice() external view returns (uint256 baseMinUnitPrice);
    function baseMaxUnitPrice() external view returns (uint256 baseMaxUnitPrice);

    function launchNumber() external view returns (uint256 launchNumber);
    function roundNumber() external view returns (uint256 roundNumber);

    function contributions(uint256 roundId, address account) external view returns (uint256 contribution);
    function withdrawAt(uint256 roundId, address account) external view returns (uint256 withdrawAt);

    function getLaunch(uint256 launchId) external view returns (PrestigePadLaunch memory launch);
    function getRound(uint256 roundId) external view returns (PrestigePadRound memory round);

    function initiateLaunch(
        address initiator,
        bytes32 zone,
        string calldata projectURI,
        string calldata launchURI,
        uint256 initialQuantity,
        uint256 feeRate,
        Validation calldata validation
    ) external returns (uint256);

    function updateLaunchURI(
        uint256 launchId,
        string calldata launchURI,
        Validation calldata validation
    ) external;
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

    function contributeCurrentRound(uint256 launchId, uint256 quantity) external payable returns (uint256 value);
    function withdrawContribution(uint256 roundId) external returns (uint256 value);
    
    function safeContributeCurrentRound(
        uint256 launchId,
        uint256 quantity,
        bytes32 anchor
    ) external payable returns (uint256 value);
}
