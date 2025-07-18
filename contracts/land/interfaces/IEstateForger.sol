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

    event SellerRegistration(
        bytes32 indexed zone,
        address indexed account,
        string uri
    );

    event NewRequest(
        uint256 indexed requestId,
        address indexed seller,
        EstateForgerRequestEstateInput estate,
        EstateForgerRequestQuotaInput quota,
        EstateForgerRequestQuote quote,
        EstateForgerRequestAgenda agenda
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
        uint256 indexed privateSaleEndsAt,
        uint256 indexed publicSaleEndsAt
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

    error AlreadyHadDeposit();
    error AlreadyWithdrawn();
    error Cancelled();
    error InvalidCommissionReceiver();
    error InvalidDepositing();
    error InvalidRequestId();
    error InvalidUnitPrice();
    error InvalidWithdrawing();
    error MaxSellingQuantityExceeded();
    error NotEnoughSoldQuantity();
    error NotWhitelistedAccount(address account);
    error StillSelling();
    error Timeout();
    error Tokenized();
    error WhitelistedAccount(address account);

    function feeReceiver() external view returns (address feeReceiver);

    function getFeeRate() external view returns (Rate memory rate);

    function baseMinUnitPrice() external view returns (uint256 baseMinUnitPrice);
    function baseMaxUnitPrice() external view returns (uint256 baseMaxUnitPrice);

    function requestNumber() external view returns (uint256 requestNumber);

    function sellerURIs(bytes32 zone, address account) external view returns (string memory uri);
    function isSellerIn(bytes32 zone, address account) external view returns (bool isActive);

    function deposits(uint256 requestId, address depositor) external view returns (uint256 deposit);
    function hasWithdrawn(uint256 requestId, address account) external view returns (bool hasWithdrawn);

    function getRequest(uint256 requestId) external view returns (EstateForgerRequest memory request);

    function registerSellerIn(
        bytes32 zone,
        address account,
        string calldata uri,
        Validation calldata validation
    ) external;

    function requestTokenizationWithDuration(
        address seller,
        EstateForgerRequestEstateInput calldata estate,
        EstateForgerRequestQuotaInput calldata quota,
        EstateForgerRequestQuoteInput calldata quote,
        uint40 privateSaleDuration,
        uint40 publicSaleDuration,
        Validation calldata validation
    ) external returns (uint256 requestId);
    function requestTokenizationWithTimestamp(
        address seller,
        EstateForgerRequestEstateInput calldata estate,
        EstateForgerRequestQuotaInput calldata quota,
        EstateForgerRequestQuoteInput calldata quote,
        uint40 privateSaleEndsAt,
        uint40 publicSaleEndsAt,
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
    function updateRequestAgenda(
        uint256 requestId,
        uint40 privateSaleEndsAt,
        uint40 publicSaleEndsAt
    ) external;
    function withdrawDeposit(uint256 requestId) external returns (uint256 value);

    function safeDeposit(
        uint256 requestId,
        uint256 quantity,
        bytes32 anchor
    ) external payable returns (uint256 value);
}
