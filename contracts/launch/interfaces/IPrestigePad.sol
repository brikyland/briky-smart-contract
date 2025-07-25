// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IFund} from "../../common/structs/IFund.sol";
import {IRate} from "../../common/structs/IRate.sol";
import {IValidatable} from "../../common/interfaces/IValidatable.sol";

import {IPrestigePadRequest} from "../structs/IPrestigePadRequest.sol";
import {IPrestigePadRound} from "../structs/IPrestigePadRound.sol";

import {IProjectLaunchpad} from "./IProjectLaunchpad.sol";

interface IPrestigePad is
IPrestigePadRequest,
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

    event NewRequest(
        uint256 indexed requestId,
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

    event RequestRoundUpdate(
        uint256 indexed requestId,
        uint256 indexed roundId,
        uint256 index,
        PrestigePadRoundInput round
    );
    event RequestNextRoundInitiation(
        uint256 indexed requestId,
        uint256 indexed roundId,
        uint256 indexed cashbackRoundId,
        uint256 index,
        uint40 raiseStartsAt,
        uint40 raiseEndsAt
    );
    event RequestCurrentRoundCancellation(
        uint256 indexed requestId,
        uint256 indexed roundId
    );

    error AlreadyConfirmed();
    error AlreadyFinalized();
    error AlreadyInitiated();
    error InvalidCancelling();
    error InvalidConfirming();
    error InvalidInitiating();
    error InvalidRemoving();
    error InvalidRequestId();
    error InvalidRoundId();
    error InvalidUnitPrice();
    error NoRoundToInitiate();
    error NotInitiated();
    error NotRegisteredAccount();
    error RegisteredAccount();
    error Timeout();
}
