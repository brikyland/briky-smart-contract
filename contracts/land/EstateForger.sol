// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {AggregatorV3Interface} from "@chainlink/contracts/src/v0.8/shared/interfaces/AggregatorV3Interface.sol";
import {PausableUpgradeable} from "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";
import {ReentrancyGuardUpgradeable} from "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
import {IERC20Upgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";
import {SafeERC20Upgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC20/utils/SafeERC20Upgradeable.sol";
import {ERC1155HolderUpgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC1155/utils/ERC1155HolderUpgradeable.sol";
import {ERC1155ReceiverUpgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC1155/utils/ERC1155ReceiverUpgradeable.sol";
import {IERC165Upgradeable} from "@openzeppelin/contracts-upgradeable/utils/introspection/IERC165Upgradeable.sol";

import {Constant} from "../lib/Constant.sol";
import {CurrencyHandler} from "../lib/CurrencyHandler.sol";
import {Formula} from "../lib/Formula.sol";

import {IAdmin} from "../common/interfaces/IAdmin.sol";

import {ICommissionToken} from "./interfaces/ICommissionToken.sol";
import {IEstateToken} from "./interfaces/IEstateToken.sol";

import {EstateForgerStorage} from "./storages/EstateForgerStorage.sol";

import {EstateTokenizer} from "./utilities/EstateTokenizer.sol";
import {IExclusiveToken} from "./interfaces/IExclusiveToken.sol";

contract EstateForger is
EstateForgerStorage,
EstateTokenizer,
ERC1155HolderUpgradeable,
PausableUpgradeable,
ReentrancyGuardUpgradeable {
    using Formula for uint256;
    using SafeERC20Upgradeable for IERC20Upgradeable;

    string constant private VERSION = "v1.1.1";

    receive() external payable {}

    modifier onlyManager() {
        if (!IAdmin(admin).isManager(msg.sender)) {
            revert Unauthorized();
        }
        _;
    }

    modifier onlyExecutive() {
        if (!IAdmin(admin).isExecutive(msg.sender)) {
            revert Unauthorized();
        }
        _;
    }

    function initialize(
        address _admin,
        address _estateToken,
        address _commissionToken,
        address _feeReceiver,
        uint256 _feeRate,
        uint256 _baseMinUnitPrice,
        uint256 _baseMaxUnitPrice
    ) external initializer {
        require(_feeRate <= Constant.COMMON_RATE_MAX_FRACTION);

        __Pausable_init();
        __ReentrancyGuard_init();

        admin = _admin;
        estateToken = _estateToken;
        commissionToken = _commissionToken;
        feeReceiver = _feeReceiver;

        feeRate = _feeRate;

        baseMinUnitPrice = _baseMinUnitPrice;
        baseMaxUnitPrice = _baseMaxUnitPrice;

        emit FeeRateUpdate(_feeRate);
        emit BaseUnitPriceRangeUpdate(_baseMinUnitPrice, _baseMaxUnitPrice);
    }

    function version() external pure returns (string memory) {
        return VERSION;
    }

    function pause(bytes[] calldata _signatures) external whenNotPaused {
        IAdmin(admin).verifyAdminSignatures(
            abi.encode(address(this), "pause"),
            _signatures
        );
        _pause();
    }

    function unpause(bytes[] calldata _signatures) external whenPaused {
        IAdmin(admin).verifyAdminSignatures(
            abi.encode(address(this), "unpause"),
            _signatures
        );
        _unpause();
    }

    function updateFeeRate(
        uint256 _feeRate,
        bytes[] calldata _signatures
    ) external {
        IAdmin(admin).verifyAdminSignatures(
            abi.encode(
                address(this),
                "updateFeeRate",
                _feeRate
            ),
            _signatures
        );
        if (_feeRate > Constant.COMMON_RATE_MAX_FRACTION) {
            revert InvalidRate();
        }
        feeRate = _feeRate;
        emit FeeRateUpdate(_feeRate);
    }

    function updateBaseUnitPriceRange(
        uint256 _baseMinUnitPrice,
        uint256 _baseMaxUnitPrice,
        bytes[] calldata _signatures
    ) external {
        IAdmin(admin).verifyAdminSignatures(
            abi.encode(
                address(this),
                "updateBaseUnitPriceRange",
                _baseMinUnitPrice,
                _baseMaxUnitPrice
            ),
            _signatures
        );

        if (_baseMinUnitPrice > _baseMaxUnitPrice) {
            revert InvalidInput();
        }
        baseMinUnitPrice = _baseMinUnitPrice;
        baseMaxUnitPrice = _baseMaxUnitPrice;
        emit BaseUnitPriceRangeUpdate(
            _baseMinUnitPrice,
            _baseMaxUnitPrice
        );
    }
    
    function updatePriceFeeds(
        address[] calldata _currencies,
        address[] calldata _feeds,
        uint40[] calldata _heartbeats,
        bytes[] calldata _signatures
    ) external {
        IAdmin(admin).verifyAdminSignatures(
            abi.encode(
                address(this),
                "updatePriceFeeds",
                _currencies,
                _feeds,
                _heartbeats                           
            ),
            _signatures
        );

        if (_currencies.length != _feeds.length
            || _currencies.length != _heartbeats.length) {
            revert InvalidInput();
        }

        for(uint256 i = 0; i < _currencies.length; ++i) {
            if (_heartbeats[i] == 0) revert InvalidInput();

            priceFeeds[_currencies[i]] = PriceFeed(
                _feeds[i],
                _heartbeats[i]
            );
            emit PriceFeedUpdate(
                _currencies[i],
                _feeds[i],
                _heartbeats[i]
            );
        }
    }

    function updateDefaultRates(
        address[] calldata _currencies,
        uint256[] calldata _values,
        uint8[] calldata _decimals,
        bytes[] calldata _signatures
    ) external {
        IAdmin(admin).verifyAdminSignatures(
            abi.encode(
                address(this),
                "updateDefaultRates",
                _currencies,
                _values,
                _decimals
            ),
            _signatures
        );

        if (_currencies.length != _values.length
            || _currencies.length != _decimals.length) {
            revert InvalidInput();
        }

        for(uint256 i = 0; i < _currencies.length; ++i) {
            if (_decimals[i] > Constant.ESTATE_TOKEN_MAX_DECIMALS) revert InvalidInput();

            defaultRates[_currencies[i]] = Rate(_values[i], _decimals[i]);
            emit DefaultRateUpdate(
                _currencies[i],
                _values[i],
                _decimals[i]
            );
        }
    }

    function getPriceFeed(address _currency) external view returns (PriceFeed memory) {
        return priceFeeds[_currency];
    }

    function getDefaultRate(address _currency) external view returns (Rate memory) {
        return defaultRates[_currency];
    }

    function getFeeRate() external view returns (Rate memory) {
        return Rate(feeRate, Constant.COMMON_RATE_DECIMALS);
    }

    function getRequest(uint256 _requestId) external view returns (Request memory) {
        if (_requestId == 0 || _requestId > requestNumber) {
            revert InvalidRequestId();
        }
        return requests[_requestId];
    }

    function requestTokenization(
        address _requester,
        bytes32 _zone,
        string calldata _uri,
        uint256 _totalSupply,
        uint256 _minSellingAmount,
        uint256 _maxSellingAmount,
        uint256 _unitPrice,
        address _currency,
        uint8 _decimals,
        uint40 _expireAt,
        uint40 _duration
    ) external onlyExecutive returns (uint256) {
        if (!IAdmin(admin).getZoneEligibility(_zone, msg.sender)) {
            revert Unauthorized();
        }

        _validateUnitPrice(_unitPrice, _currency);

        if (_requester == address(0)
            || _minSellingAmount > _maxSellingAmount
            || _maxSellingAmount > _totalSupply
            || _totalSupply > type(uint256).max / 10 ** _decimals
            || _decimals > Constant.ESTATE_TOKEN_MAX_DECIMALS
            || _expireAt <= block.timestamp) {
            revert InvalidInput();
        }

        uint256 requestId = ++requestNumber;
        requests[requestId] = Request(
            0,
            _zone,
            _uri,
            _totalSupply,
            _minSellingAmount,
            _maxSellingAmount,
            0,
            _unitPrice,
            _currency,
            _decimals,
            _expireAt,
            uint40(block.timestamp) + _duration,
            _requester
        );

        emit NewRequest(
            requestId,
            _requester,
            _zone,
            _uri,
            _totalSupply,
            _minSellingAmount,
            _maxSellingAmount,
            _unitPrice,
            _currency,
            _decimals,
            _expireAt,
            uint40(block.timestamp) + _duration
        );

        return requestId;
    }

    function updateRequest(
        uint256 _requestId,
        address _requester,
        bytes32 _zone,
        string calldata _uri,
        uint256 _totalSupply,
        uint256 _minSellingAmount,
        uint256 _maxSellingAmount,
        uint256 _unitPrice,
        address _currency,
        uint8 _decimals,
        uint40 _expireAt,
        uint40 _closeAt
    ) external onlyExecutive {
        if (_requestId == 0 || _requestId > requestNumber) {
            revert InvalidRequestId();
        }
        Request storage request = requests[_requestId];
        bytes32 zone = request.zone;
        if ((zone != _zone && !IAdmin(admin).getZoneEligibility(_zone, msg.sender))
            || !IAdmin(admin).isActiveIn(zone, msg.sender)) {
            revert Unauthorized();
        }

        if (request.totalSupply == 0) {
            revert Cancelled();
        }
        if (request.estateId != 0) {
            revert Tokenized();
        }
        if (request.soldAmount > 0) {
            revert AlreadyHadDepositor();
        }

        _validateUnitPrice(_unitPrice, _currency);

        if (_requester == address(0)
            || _minSellingAmount > _maxSellingAmount
            || _maxSellingAmount > _totalSupply
            || _totalSupply > type(uint256).max / 10 ** _decimals
            || _decimals > Constant.ESTATE_TOKEN_MAX_DECIMALS
            || _expireAt <= block.timestamp
            || _closeAt <= block.timestamp) {
            revert InvalidInput();
        }

        requests[_requestId] = Request(
            0,
            _zone,
            _uri,
            _totalSupply,
            _minSellingAmount,
            _maxSellingAmount,
            0,
            _unitPrice,
            _currency,
            _decimals,
            _expireAt,
            _closeAt,
            _requester
        );

        emit RequestUpdate(
            _requestId,
            _requester,
            _zone,
            _uri,
            _totalSupply,
            _minSellingAmount,
            _maxSellingAmount,
            _unitPrice,
            _currency,
            _decimals,
            _expireAt,
            _closeAt
        );
    }

    function updateRequestURI(uint256 _requestId, string calldata _uri) external onlyExecutive {
        if (_requestId == 0 || _requestId > requestNumber) {
            revert InvalidRequestId();
        }
        Request storage request = requests[_requestId];
        if (!IAdmin(admin).isActiveIn(request.zone, msg.sender)) {
            revert Unauthorized();
        }

        if (request.totalSupply == 0) {
            revert Cancelled();
        }
        if (request.estateId != 0) {
            revert Tokenized();
        }

        request.uri = _uri;
        emit RequestURIUpdate(_requestId, _uri);
    }

    function deposit(uint256 _requestId, uint256 _amount)
    external payable nonReentrant whenNotPaused {
        if (_requestId == 0 || _requestId > requestNumber) {
            revert InvalidRequestId();
        }
        Request storage request = requests[_requestId];
        if (request.totalSupply == 0) {
            revert Cancelled();
        }
        if (request.estateId != 0) {
            revert Tokenized();
        }
        if (request.closeAt <= block.timestamp) {
            revert SaleEnded();
        }
        uint256 newSoldAmount = request.soldAmount + _amount;
        if (newSoldAmount > request.maxSellingAmount) {
            revert MaxSellingAmountExceeded();
        }
        request.soldAmount = newSoldAmount;

        address currency = request.currency;
        uint256 value = _amount * request.unitPrice;

        if (currency == address(0)) {
            CurrencyHandler.receiveNative(value);
        } else {
            IERC20Upgradeable(currency).safeTransferFrom(msg.sender, address(this), value);
        }

        deposits[_requestId][msg.sender] += _amount;

        emit Deposit(
            _requestId,
            msg.sender,
            _amount,
            value
        );
    }

    function cancelRequest(uint256 _requestId) external onlyManager {
        if (_requestId == 0 || _requestId > requestNumber) {
            revert InvalidRequestId();
        }
        Request storage request = requests[_requestId];
        if (!IAdmin(admin).isActiveIn(request.zone, msg.sender)) {
            revert Unauthorized();
        }
        if (request.totalSupply == 0) {
            revert Cancelled();
        }
        if (request.estateId != 0) {
            revert Tokenized();
        }
        request.totalSupply = 0;
        emit RequestCancellation(_requestId);
    }

    function confirmRequest(
        uint256 _requestId,
        address _commissionReceiver
    ) external nonReentrant onlyManager whenNotPaused returns (uint256) {
        if (_requestId == 0 || _requestId > requestNumber) {
            revert InvalidRequestId();
        }
        Request storage request = requests[_requestId];

        bytes32 zone = request.zone;
        if (!IAdmin(admin).isActiveIn(zone, msg.sender)) {
            revert Unauthorized();
        }

        uint256 totalSupply = request.totalSupply;
        if (totalSupply == 0) {
            revert Cancelled();
        }

        if (request.estateId != 0) {
            revert Tokenized();
        }

        uint40 closeAt = request.closeAt;
        if (closeAt + Constant.ESTATE_TOKEN_CONFIRMATION_TIME_LIMIT <= block.timestamp) {
            revert FailedOwnershipTransfer();
        }

        if (closeAt < block.timestamp) request.closeAt = uint40(block.timestamp);

        uint256 soldAmount = request.soldAmount;
        if (soldAmount < request.minSellingAmount) {
            revert NotEnoughSoldAmount();
        }

        uint8 decimals = request.decimals;
        uint256 unit = 10 ** decimals;

        IEstateToken estateTokenContract = IEstateToken(estateToken);
        uint256 estateId = estateTokenContract.tokenizeEstate(
            totalSupply * unit,
            zone,
            _requestId,
            request.uri,
            request.expireAt,
            request.decimals,
            _commissionReceiver
        );
        request.estateId = estateId;

        address requester = request.requester;
        unchecked {
            estateTokenContract.safeTransferFrom(
                address(this),
                request.requester,
                estateId,
                (request.totalSupply - soldAmount) * unit,
                ""
            );
        }

        address currency = request.currency;
        uint256 value = soldAmount * request.unitPrice;
        uint256 fee = value.scale(feeRate, Constant.COMMON_RATE_MAX_FRACTION);
        if (IAdmin(admin).isExclusiveCurrency(currency)) {
            fee = fee.applyDiscount(IExclusiveToken(currency).exclusiveDiscount());
        }

        uint256 commissionAmount;
        if (_commissionReceiver != address(0)) {
            commissionAmount = fee.scale(ICommissionToken(commissionToken).getCommissionRate());
        }

        if (currency == address(0)) {
            CurrencyHandler.transferNative(requester, value - fee);
            CurrencyHandler.transferNative(feeReceiver, fee - commissionAmount);
            if (commissionAmount != 0) {
                CurrencyHandler.transferNative(_commissionReceiver, commissionAmount);
            }
        } else {
            IERC20Upgradeable currencyContract = IERC20Upgradeable(currency);
            currencyContract.safeTransfer(requester, value - fee);
            currencyContract.safeTransfer(feeReceiver, fee - commissionAmount);
            if (commissionAmount != 0) {
                currencyContract.safeTransfer(_commissionReceiver, commissionAmount);
            }
        }

        emit RequestConfirmation(
            _requestId,
            estateId,
            soldAmount,
            value,
            fee,
            _commissionReceiver,
            commissionAmount
        );

        return estateId;
    }

    function withdrawDeposit(uint256 _requestId) external nonReentrant whenNotPaused {
        if (_requestId == 0 || _requestId > requestNumber) {
            revert InvalidRequestId();
        }
        Request storage request = requests[_requestId];
        if (request.estateId != 0) {
            revert Tokenized();
        }
        if (request.totalSupply != 0) {
            uint256 closeAt = request.closeAt;
            if (closeAt > block.timestamp) {
                revert StillSelling();
            }
            if (closeAt + Constant.ESTATE_TOKEN_CONFIRMATION_TIME_LIMIT > block.timestamp
                && request.soldAmount >= request.minSellingAmount) {
                revert InvalidWithdrawing();
            }
        }
        if (hasWithdrawn[_requestId][msg.sender]) {
            revert AlreadyWithdrawn();
        }

        address currency = request.currency;
        uint256 amount = deposits[_requestId][msg.sender];
        uint256 value = amount * request.unitPrice;

        hasWithdrawn[_requestId][msg.sender] = true;

        if (currency == address(0)) {
            CurrencyHandler.transferNative(msg.sender, value);
        } else {
            IERC20Upgradeable(currency).safeTransfer(msg.sender, value);
        }

        emit DepositWithdrawal(
            _requestId,
            msg.sender,
            amount,
            value
        );
    }

    function withdrawToken(uint256 _requestId) external whenNotPaused {
        if (_requestId == 0 || _requestId > requestNumber) {
            revert InvalidRequestId();
        }
        Request storage request = requests[_requestId];
        if (request.estateId == 0) {
            revert InvalidWithdrawing();
        }
        if (hasWithdrawn[_requestId][msg.sender]) {
            revert AlreadyWithdrawn();
        }

        hasWithdrawn[_requestId][msg.sender] = true;
        uint256 amount = deposits[_requestId][msg.sender] * 10 ** request.decimals;
        IEstateToken(estateToken).safeTransferFrom(
            address(this),
            msg.sender,
            request.estateId,
            amount,
            ""
        );

        emit TokenWithdrawal(
            _requestId,
            msg.sender,
            amount
        );
    }

    function allocationOfAt(
        uint256 _requestId,
        address _account,
        uint256 _at
    ) external view returns (uint256 allocation) {
        if (_requestId == 0 || _requestId > requestNumber) revert InvalidRequestId();
        return _at >= requests[_requestId].closeAt
            ? deposits[_requestId][_account] * 10 ** requests[_requestId].decimals
            : 0;
    }

    function supportsInterface(bytes4 _interfaceId) public view override(
        IERC165Upgradeable,
        ERC1155ReceiverUpgradeable,
        EstateTokenizer
    ) returns (bool) {
        return super.supportsInterface(_interfaceId);
    }

    function _validateUnitPrice(uint256 _unitPrice, address _currency) private {
        if (!IAdmin(admin).isAvailableCurrency(_currency)) {
            revert InvalidCurrency();
        }

        PriceFeed memory priceFeed = priceFeeds[_currency];

        Rate memory rate;
        if (priceFeed.feed == address(0)) {
            rate = defaultRates[_currency];
            if (rate.value == 0)revert MissingCurrencyRate();
        } else {
            (
                ,
                int256 answer,
                ,
                uint256 updatedAt,

            ) = AggregatorV3Interface(priceFeed.feed).latestRoundData();

            if (answer <= 0) {
                revert InvalidPriceFeedData();
            }

            if (block.timestamp - updatedAt > priceFeed.heartbeat) {
                revert StalePriceFeed();
            }

            rate = Rate(
                uint256(answer),
                AggregatorV3Interface(priceFeed.feed).decimals()
            );
        }

        uint256 normalizedUnitPrice = _unitPrice.scale(rate);

        if (baseMinUnitPrice > normalizedUnitPrice || normalizedUnitPrice > baseMaxUnitPrice) {
            revert InvalidUnitPrice();
        }

        emit UnitPriceValidation(
            _unitPrice,
            _currency,
            rate.value,
            rate.decimals
        );
    }
}
