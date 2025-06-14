// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IEstateTokenizer} from "./IEstateTokenizer.sol";

interface IEstateForger is IEstateTokenizer {
    struct Request {
        uint256 estateId;
        bytes32 zone;
        string uri;
        uint256 totalSupply;
        uint256 minSellingAmount;
        uint256 maxSellingAmount;
        uint256 soldAmount;
        uint256 unitPrice;
        address currency;
        uint8 decimals;
        uint40 expireAt;
        uint40 closeAt;
        address seller;
    }

    struct PriceFeed {
        address feed;
        uint40 heartbeat;
    }

    event FeeRateUpdate(uint256 newValue);

    event BaseUnitPriceRangeUpdate(
        uint256 baseMinUnitPrice,
        uint256 baseMaxUnitPrice
    );
    event DefaultRateUpdate(
        address indexed currency,
        uint256 rateValue,
        uint8 rateDecimals
    );
    event PriceFeedUpdate(
        address indexed currency,
        address feed,
        uint40 heartbeat
    );

    event SellerRegistration(address indexed account);
    event SellerUnregistration(address indexed account);

    event NewRequest(
        uint256 indexed requestId,
        address indexed requester,
        bytes32 indexed zone,
        string uri,
        uint256 totalSupply,
        uint256 minSellingAmount,
        uint256 maxSellingAmount,
        uint256 unitPrice,
        address currency,
        uint8 decimals,
        uint40 expireAt,
        uint40 endAt
    );
    event RequestCancellation(uint256 indexed requestId);
    event RequestConfirmation(
        uint256 indexed requestId,
        uint256 indexed estateId,
        uint256 soldAmount,
        uint256 value,
        uint256 feeAmount,
        address commissionReceiver,
        uint256 commissionAmount
    );
    event RequestUpdate(
        uint256 indexed requestId,
        address indexed requester,
        bytes32 indexed zone,
        string uri,
        uint256 totalSupply,
        uint256 minSellingAmount,
        uint256 maxSellingAmount,
        uint256 unitPrice,
        address currency,
        uint8 decimals,
        uint40 expireAt,
        uint40 publicSaleEndAt
    );
    event RequestURIUpdate(
        uint256 indexed requestId,
        string uri
    );

    event Deposit(
        uint256 indexed requestId,
        address indexed depositor,
        uint256 amount,
        uint256 value
    );
    event DepositWithdrawal(
        uint256 indexed requestId,
        address indexed withdrawer,
        uint256 amount,
        uint256 value
    );
    event TokenWithdrawal(
        uint256 indexed requestId,
        address indexed withdrawer,
        uint256 amount
    );

    event UnitPriceValidation(
        uint256 unitPrice,
        address currency,
        uint256 rateValue,
        uint8 rateDecimals
    );

    error AlreadyHadDepositor();
    error AlreadyWithdrawn();
    error Cancelled();
    error FailedOwnershipTransfer();
    error InvalidPriceFeedData();
    error InvalidRequestId();
    error InvalidUnitPrice();
    error InvalidWithdrawing();
    error MaxSellingAmountExceeded();
    error MissingCurrencyRate();
    error NotEnoughSoldAmount();
    error NotRegisteredSeller(address account);
    error RegisteredSeller(address account);
    error SaleEnded();
    error StalePriceFeed();
    error StillSelling();
    error Tokenized();

    function commissionToken() external view returns (address commissionToken);
    function feeReceiver() external view returns (address feeReceiver);

    function getFeeRate() external view returns (Rate memory rate);

    function baseMinUnitPrice() external view returns (uint256 baseMinUnitPrice);
    function baseMaxUnitPrice() external view returns (uint256 baseMaxUnitPrice);

    function requestNumber() external view returns (uint256 requestNumber);

    function isSeller(address account) external view returns (bool isSeller);

    function deposits(uint256 requestId, address depositor) external view returns (uint256 deposit);
    function hasWithdrawn(uint256 requestId, address account) external view returns (bool hasWithdrawn);

    function getDefaultRate(address currency) external view returns (Rate memory rate);
    function getPriceFeed(address currency) external view returns (PriceFeed memory priceFeed);
    function getRequest(uint256 requestId) external view returns (Request memory request);

    function cancel(uint256 requestId) external;
    function confirm(uint256 requestId, address commissionReceiver) external returns (uint256 estateId);
    function deposit(uint256 requestId, uint256 amount) external payable returns (uint256 value);
    function requestTokenization(
        address requester,
        bytes32 zone,
        string calldata uri,
        uint256 totalSupply,
        uint256 minSellingAmount,
        uint256 maxSellingAmount,
        uint256 unitPrice,
        address currency,
        uint8 decimals,
        uint40 expireAt,
        uint40 duration
    ) external returns (uint256 requestId);
    function withdrawDeposit(uint256 requestId) external returns (uint256 value);
    function withdrawToken(uint256 requestId) external returns (uint256 amount);

    function safeConfirm(
        uint256 requestId,
        address commissionReceiver,
        string calldata anchor
    ) external returns (uint256 estateId);
    function safeDeposit(
        uint256 requestId,
        uint256 amount,
        string calldata anchor
    ) external payable returns (uint256 value);
}
