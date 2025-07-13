// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IFund} from "../../common/interfaces/IFund.sol";
import {IValidatable} from "../../common/interfaces/IValidatable.sol";

import {IEstateTokenizer} from "./IEstateTokenizer.sol";

interface IEstateForger is
IFund,
IValidatable,
IEstateTokenizer {
    struct RequestEstate {
        uint256 estateId;
        bytes32 zone;
        string uri;
        uint40 expireAt;
        address operator;
    }

    struct RequestEstateInput {
        bytes32 zone;
        string uri;
        uint40 expireAt;
        address operator;
    }

    struct RequestQuota {
        uint256 totalQuantity;
        uint256 minSellingQuantity;
        uint256 maxSellingQuantity;
        uint256 soldQuantity;
    }

    struct RequestQuotaInput {
        uint256 totalQuantity;
        uint256 minSellingQuantity;
        uint256 maxSellingQuantity;
    }

    struct RequestQuote {
        uint256 unitPrice;
        address currency;
        uint256 cashbackThreshold;
        uint256 cashbackFundId;
        uint256 feeDenomination;
        uint256 commissionDenomination;
    }

    struct RequestQuoteInput {
        uint256 unitPrice;
        address currency;
        uint256 cashbackThreshold;
        uint256 cashbackBaseRate;
        address[] cashbackCurrencies;
        uint256[] cashbackDenominations;
    }

    struct RequestAgenda {
        uint40 privateSaleEndsAt;
        uint40 publicSaleEndsAt;
    }

    struct Request {
        RequestEstate estate;
        RequestQuota quota;
        RequestQuote quote;
        RequestAgenda agenda;
        address seller;
    }

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
        RequestEstateInput estate,
        RequestQuotaInput quota,
        RequestQuote quote,
        RequestAgenda agenda
    );
    event RequestCancellation(uint256 indexed requestId);
    event RequestConfirmation(
        uint256 indexed requestId,
        uint256 indexed estateId,
        uint256 soldQuantity,
        uint256 value,
        uint256 feeAmount,
        address commissionReceiver,
        uint256 commissionAmount,
        uint256 cashbackBaseAmount
    );

    event RequestSellerUpdate(uint256 indexed requestId, address indexed seller);
    event RequestURIUpdate(uint256 indexed requestId, string uri);

    event RequestAgendaUpdate(uint256 indexed requestId, RequestAgenda agenda);
    event RequestEstateUpdate(uint256 indexed requestId, RequestEstateInput estate);
    event RequestQuotaUpdate(uint256 indexed requestId, RequestQuotaInput quota);
    event RequestQuoteUpdate(uint256 indexed requestId, RequestQuote quote);

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
    event TokenWithdrawal(
        uint256 indexed requestId,
        address indexed depositor,
        uint256 amount
    );

    error Activated(address account);
    error AlreadyHadDeposit();
    error AlreadyWithdrawn();
    error Cancelled();
    error InvalidCommissionReceiver();
    error InvalidDepositing();
    error InvalidOperator();
    error InvalidRequestId();
    error InvalidUnitPrice();
    error InvalidWithdrawing();
    error MaxSellingQuantityExceeded();
    error NotActivated(address account);
    error NotEnoughSoldQuantity();
    error NotWhitelisted(address account);
    error StillSelling();
    error Timeout();
    error Tokenized();
    error Whitelisted(address account);

    function commissionToken() external view returns (address commissionToken);
    function feeReceiver() external view returns (address feeReceiver);

    function getFeeRate() external view returns (Rate memory rate);

    function baseMinUnitPrice() external view returns (uint256 baseMinUnitPrice);
    function baseMaxUnitPrice() external view returns (uint256 baseMaxUnitPrice);

    function requestNumber() external view returns (uint256 requestNumber);

    function sellerURIs(bytes32 zone, address account) external view returns (string memory uri);
    function isSellerIn(bytes32 zone, address account) external view returns (bool isActive);

    function deposits(uint256 requestId, address depositor) external view returns (uint256 deposit);
    function hasWithdrawn(uint256 requestId, address account) external view returns (bool hasWithdrawn);

    function getRequest(uint256 requestId) external view returns (Request memory request);

    function registerSeller(
        bytes32 zone,
        address account,
        string calldata uri,
        Validation calldata validation
    ) external;

    function requestTokenizationWithDuration(
        address seller,
        RequestEstateInput calldata estate,
        RequestQuotaInput calldata quota,
        RequestQuoteInput calldata quote,
        uint40 privateSaleDuration,
        uint40 publicSaleDuration,
        Validation calldata validation
    ) external returns (uint256 requestId);
    function requestTokenizationWithTimestamp(
        address seller,
        RequestEstateInput calldata estate,
        RequestQuotaInput calldata quota,
        RequestQuoteInput calldata quote,
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
    function withdrawToken(uint256 requestId) external returns (uint256 amount);

    function safeDeposit(
        uint256 requestId,
        uint256 quantity,
        bytes32 anchor
    ) external payable returns (uint256 value);
}
