// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IValidatable} from "../../common/interfaces/IValidatable.sol";

import {IFund} from "../../common/structs/IFund.sol";
import {IRate} from "../../common/structs/IRate.sol";

import {IEstateForgerRequest} from "../structs/IEstateForgerRequest.sol";

import {ICommissionDispatchable} from "./ICommissionDispatchable.sol";
import {IEstateTokenizer} from "./IEstateTokenizer.sol";

interface IEstateForger is
IEstateForgerRequest,
IFund,
IRate,
ICommissionDispatchable,
IValidatable,
IEstateTokenizer {
    event FeeRateUpdate(uint256 newValue);

    event BaseUnitPriceRangeUpdate(
        uint256 baseMinUnitPrice,
        uint256 baseMaxUnitPrice
    );

    event Whitelist(address indexed account);
    event Unwhitelist(address indexed account);

    event SellerRegistration(bytes32 indexed zone, address indexed account);
    event SellerDeregistration(bytes32 indexed zone, address indexed account);

    event NewRequest(
        uint256 indexed requestId,
        uint256 indexed cashbackFundId,
        address indexed seller,
        EstateForgerRequestEstateInput estate,
        EstateForgerRequestQuotaInput quota,
        EstateForgerRequestQuoteInput quote,
        EstateForgerRequestAgendaInput agenda
    );
    event RequestCancellation(uint256 indexed requestId);
    event RequestConfirmation(
        uint256 indexed requestId,
        uint256 indexed estateId,
        uint256 soldQuantity,
        uint256 value,
        uint256 feeAmount,
        address commissionReceiver,
        uint256 cashbackBaseAmount
    );

    event RequestAgendaUpdate(
        uint256 indexed requestId,
        EstateForgerRequestAgendaInput agenda
    );
    event RequestURIUpdate(uint256 indexed requestId, string uri);

    event Deposit(
        uint256 indexed requestId,
        address indexed depositor,
        uint256 quantity,
        uint256 value
    );
    event DepositWithdrawal(
        uint256 indexed requestId,
        address indexed depositor,
        uint256 quantity,
        uint256 value
    );

    error AlreadyCancelled();
    error AlreadyHadDeposit();
    error AlreadyTokenized();
    error AlreadyWithdrawn();
    error InvalidCommissionReceiver();
    error InvalidDepositing();
    error InvalidRequestId();
    error InvalidUnitPrice();
    error InvalidWithdrawing();
    error MaxSellingQuantityExceeded();
    error NotEnoughSoldQuantity();
    error NothingToWithdraw();
    error NotRegisteredAccount();
    error NotWhitelistedAccount();
    error RegisteredAccount();
    error StillSelling();
    error Timeout();
    error WhitelistedAccount();

    function feeReceiver() external view returns (address feeReceiver);

    function getFeeRate() external view returns (Rate memory rate);

    function baseMinUnitPrice() external view returns (uint256 baseMinUnitPrice);
    function baseMaxUnitPrice() external view returns (uint256 baseMaxUnitPrice);

    function requestNumber() external view returns (uint256 requestNumber);

    function isSellerIn(bytes32 zone, address account) external view returns (bool isActive);

    function deposits(uint256 requestId, address depositor) external view returns (uint256 deposit);
    function withdrawAt(uint256 requestId, address account) external view returns (uint256 withdrawAt);

    function getRequest(uint256 requestId) external view returns (EstateForgerRequest memory request);

    function registerSellerIn(bytes32 zone, address account) external;

    function requestTokenization(
        address seller,
        EstateForgerRequestEstateInput calldata estate,
        EstateForgerRequestQuotaInput calldata quota,
        EstateForgerRequestQuoteInput calldata quote,
        EstateForgerRequestAgendaInput calldata agenda,
        Validation calldata validation
    ) external returns (uint256 requestId);

    function cancel(uint256 requestId) external;
    function confirm(uint256 requestId, address commissionReceiver) external payable returns (uint256 estateId);
    function deposit(uint256 requestId, uint256 quantity) external payable returns (uint256 value);
    function updateRequestURI(
        uint256 requestId,
        string calldata uri,
        Validation calldata validation
    ) external;
    function updateRequestAgenda(uint256 requestId, EstateForgerRequestAgendaInput calldata agenda) external;
    function withdrawDeposit(uint256 requestId) external returns (uint256 value);

    function safeDeposit(
        uint256 requestId,
        uint256 quantity,
        bytes32 anchor
    ) external payable returns (uint256 value);
}
