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
        uint40 privateSaleEndsAt;
        uint40 publicSaleEndsAt;
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

    event Whitelist(address indexed account);
    event Unwhitelist(address indexed account);

    event Activation(bytes32 indexed zone, address indexed account);
    event Deactivation(bytes32 indexed zone, address indexed account);

    event NewRequest(
        uint256 indexed requestId,
        address indexed seller,
        bytes32 indexed zone,
        string uri,
        uint256 totalSupply,
        uint256 minSellingAmount,
        uint256 maxSellingAmount,
        uint256 unitPrice,
        address currency,
        uint8 decimals,
        uint40 expireAt,
        uint40 privateSaleEndsAt,
        uint40 publicSaleEndsAt
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
        address indexed seller,
        bytes32 indexed zone,
        string uri,
        uint256 totalSupply,
        uint256 minSellingAmount,
        uint256 maxSellingAmount,
        uint256 unitPrice,
        address currency,
        uint8 decimals,
        uint40 expireAt,
        uint40 privateSaleEndsAt,
        uint40 publicSaleEndsAt
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

    error Activated(address account);
    error AlreadyHadDepositor();
    error AlreadyWithdrawn();
    error Cancelled();
    error FailedOwnershipTransfer();
    error InvalidDepositing();
    error InvalidPriceFeedData();
    error InvalidRequestId();
    error InvalidUnitPrice();
    error InvalidWithdrawing();
    error MaxSellingAmountExceeded();
    error MissingCurrencyRate();
    error NotActivated(address account);
    error NotEnoughSoldAmount();
    error NotRegisteredSeller(address account);
    error NotWhitelisted(address account);
    error RegisteredSeller(address account);
    error StalePriceFeed();
    error StillSelling();
    error Tokenized();
    error Whitelisted(address account);

    function commissionToken() external view returns (address commissionToken);
    function feeReceiver() external view returns (address feeReceiver);

    function getFeeRate() external view returns (Rate memory rate);

    function baseMinUnitPrice() external view returns (uint256 baseMinUnitPrice);
    function baseMaxUnitPrice() external view returns (uint256 baseMaxUnitPrice);

    function requestNumber() external view returns (uint256 requestNumber);

    function deposits(uint256 requestId, address depositor) external view returns (uint256 deposit);
    function hasWithdrawn(uint256 requestId, address account) external view returns (bool hasWithdrawn);

    function isActiveSellerIn(bytes32 zone, address account) external view returns (bool isActive);

    function getDefaultRate(address currency) external view returns (Rate memory rate);
    function getPriceFeed(address currency) external view returns (PriceFeed memory priceFeed);
    function getRequest(uint256 requestId) external view returns (Request memory request);

    function cancel(uint256 requestId) external;
    function confirm(uint256 requestId, address commissionReceiver) external returns (uint256 estateId);
    function deposit(uint256 requestId, uint256 amount) external payable returns (uint256 value);
    function requestTokenizationWithDuration(
        address seller,
        bytes32 zone,
        string calldata uri,
        uint256 totalSupply,
        uint256 minSellingAmount,
        uint256 maxSellingAmount,
        uint256 unitPrice,
        address currency,
        uint8 decimals,
        uint40 expireAt,
        uint40 privateSaleDuration,
        uint40 publicSaleDuration
    ) external returns (uint256 requestId);
    function requestTokenizationWithTimestamp(
        address seller,
        bytes32 zone,
        string calldata uri,
        uint256 totalSupply,
        uint256 minSellingAmount,
        uint256 maxSellingAmount,
        uint256 unitPrice,
        address currency,
        uint8 decimals,
        uint40 expireAt,
        uint40 privateSaleEndsAt,
        uint40 publicSaleEndsAt
    ) external returns (uint256 requestId);
    function updateRequest(
        uint256 requestId,
        address seller,
        bytes32 zone,
        string calldata uri,
        uint256 totalSupply,
        uint256 minSellingAmount,
        uint256 maxSellingAmount,
        uint256 unitPrice,
        address currency,
        uint8 decimals,
        uint40 expireAt,
        uint40 privateSaleEndsAt,
        uint40 publicSaleEndsAt
    ) external;
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
