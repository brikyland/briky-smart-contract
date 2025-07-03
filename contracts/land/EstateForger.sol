// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ReentrancyGuardUpgradeable} from "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";

import {Constant} from "../lib/Constant.sol";
import {CurrencyHandler} from "../lib/CurrencyHandler.sol";
import {Formula} from "../lib/Formula.sol";

import {IAdmin} from "../common/interfaces/IAdmin.sol";
import {IPriceWatcher} from "../common/interfaces/IPriceWatcher.sol";
import {IReserveVault} from "../common/interfaces/IReserveVault.sol";

import {Pausable} from "../common/utilities/Pausable.sol";

import {ICommissionToken} from "./interfaces/ICommissionToken.sol";
import {IEstateToken} from "./interfaces/IEstateToken.sol";

import {EstateForgerStorage} from "./storages/EstateForgerStorage.sol";

import {Discountable} from "./utilities/Discountable.sol";
import {EstateTokenizer} from "./utilities/EstateTokenizer.sol";

contract EstateForger is
EstateForgerStorage,
EstateTokenizer,
Discountable,
Pausable,
ReentrancyGuardUpgradeable {
    using Formula for uint256;

    string constant private VERSION = "v1.1.1";

    modifier validRequest(uint256 _requestId) {
        if (_requestId == 0 || _requestId > requestNumber) {
            revert InvalidRequestId();
        }
        _;
    }

    modifier onlyUpdatableRequest(uint256 _requestId) {
        if (requests[_requestId].estate.estateId != 0) {
            revert Tokenized();
        }
        if (requests[_requestId].quota.totalQuantity == 0) {
            revert Cancelled();
        }
        if (requests[_requestId].quota.soldQuantity > 0) {
            revert AlreadyHadDeposit();
        }
        _;
    }

    receive() external payable {}

    function initialize(
        address _admin,
        address _estateToken,
        address _commissionToken,
        address _priceWatcher,
        address _feeReceiver,
        address _reserveVault,
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
        priceWatcher = _priceWatcher;
        feeReceiver = _feeReceiver;
        reserveVault = _reserveVault;

        feeRate = _feeRate;

        baseMinUnitPrice = _baseMinUnitPrice;
        baseMaxUnitPrice = _baseMaxUnitPrice;

        emit FeeRateUpdate(_feeRate);
        emit BaseUnitPriceRangeUpdate(_baseMinUnitPrice, _baseMaxUnitPrice);
    }

    function version() external pure returns (string memory) {
        return VERSION;
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

    function whitelist(
        address[] calldata _accounts,
        bool _isWhitelisted,
        bytes[] calldata _signatures
    ) external {
        IAdmin(admin).verifyAdminSignatures(
            abi.encode(
                address(this),
                "whitelist",
                _accounts,
                _isWhitelisted
            ),
            _signatures
        );

        if (_isWhitelisted) {
            for (uint256 i; i < _accounts.length; ++i) {
                if (isWhitelisted[_accounts[i]]) {
                    revert Whitelisted(_accounts[i]);
                }
                isWhitelisted[_accounts[i]] = true;
                emit Whitelist(_accounts[i]);
            }
        } else {
            for (uint256 i; i < _accounts.length; ++i) {
                if (!isWhitelisted[_accounts[i]]) {
                    revert NotWhitelisted(_accounts[i]);
                }
                isWhitelisted[_accounts[i]] = false;
                emit Unwhitelist(_accounts[i]);
            }
        }
    }

    function activateSellerIn(
        bytes32 _zone,
        address[] calldata _accounts,
        bool _isSeller
    ) external onlyManager {
        if (!IAdmin(admin).getZoneEligibility(_zone, msg.sender)) {
            revert Unauthorized();
        }

        if (_isSeller) {
            for (uint256 i; i < _accounts.length; ++i) {
                if (isActiveSellerIn[_zone][_accounts[i]]) {
                    revert Activated(_accounts[i]);
                }
                isActiveSellerIn[_zone][_accounts[i]] = true;
                emit Activation(_zone, _accounts[i]);
            }
        } else {
            for (uint256 i; i < _accounts.length; ++i) {
                if (!isActiveSellerIn[_zone][_accounts[i]]) {
                    revert NotActivated(_accounts[i]);
                }
                isActiveSellerIn[_zone][_accounts[i]] = false;
                emit Deactivation(_zone, _accounts[i]);
            }
        }
    }

    function getFeeRate() external view returns (Rate memory) {
        return Rate(feeRate, Constant.COMMON_RATE_DECIMALS);
    }

    function getRequest(uint256 _requestId) external view validRequest(_requestId) returns (Request memory) {
        return requests[_requestId];
    }

    function requestTokenizationWithDuration(
        address _seller,
        RequestEstateInput calldata _estate,
        RequestQuotaInput calldata _quota,
        RequestQuoteInput calldata _quote,
        uint40 _privateSaleDuration,
        uint40 _publicSaleDuration
    ) external returns (uint256) {
        if (_privateSaleDuration == 0 && _publicSaleDuration == 0) {
            revert InvalidInput();
        }

        return _requestTokenization(
            _seller,
            _estate,
            _quota,
            _quote,
            uint40(block.timestamp) + _privateSaleDuration,
            uint40(block.timestamp) + _privateSaleDuration + _publicSaleDuration
        );
    }

    function requestTokenizationWithTimestamp(
        address _seller,
        RequestEstateInput calldata _estate,
        RequestQuotaInput calldata _quota,
        RequestQuoteInput calldata _quote,
        uint40 _privateSaleEndsAt,
        uint40 _publicSaleEndsAt
    ) external returns (uint256) {
        if (block.timestamp > _privateSaleEndsAt
            || _privateSaleEndsAt > _publicSaleEndsAt
            || _publicSaleEndsAt == block.timestamp) {
            revert InvalidInput();
        }

        return _requestTokenization(
            _seller,
            _estate,
            _quota,
            _quote,
            _privateSaleEndsAt,
            _publicSaleEndsAt
        );
    }

    function updateRequestSeller(
        uint256 _requestId,
        address _seller
    ) external onlyExecutive onlyUpdatableRequest(_requestId) whenNotPaused {
        bytes32 zone = requests[_requestId].estate.zone;
        if (!IAdmin(admin).getZoneEligibility(zone, msg.sender)) {
            revert Unauthorized();
        }
        if (!isActiveSellerIn[zone][_seller]) {
            revert InvalidInput();
        }
        requests[_requestId].seller = _seller;

        emit RequestSellerUpdate(_requestId, _seller);
    }

    function updateRequestURI(uint256 _requestId, string calldata _uri)
    external onlyExecutive onlyUpdatableRequest(_requestId) whenNotPaused {
        if (!IAdmin(admin).getZoneEligibility(requests[_requestId].estate.zone, msg.sender)) {
            revert Unauthorized();
        }

        requests[_requestId].estate.uri = _uri;

        emit RequestURIUpdate(_requestId, _uri);
    }

    function updateRequestEstate(
        uint256 _requestId,
        RequestEstateInput calldata _estate
    ) external onlyExecutive onlyUpdatableRequest(_requestId) whenNotPaused {
        bytes32 zone = requests[_requestId].estate.zone;
        if (!IAdmin(admin).getZoneEligibility(zone, msg.sender)
            || (_estate.zone != zone && IAdmin(admin).getZoneEligibility(_estate.zone, msg.sender))) {
            revert Unauthorized();
        }

        if (_estate.decimals > Constant.ESTATE_TOKEN_MAX_DECIMALS
            || _estate.expireAt <= block.timestamp) {
            revert InvalidInput();
        }

        requests[_requestId].estate = RequestEstate(
            0,
            _estate.zone,
            _estate.uri,
            _estate.decimals,
            _estate.expireAt
        );

        emit RequestEstateUpdate(_requestId, _estate);
    }

    function updateRequestQuota(
        uint256 _requestId,
        RequestQuotaInput calldata _quota
    ) external onlyExecutive onlyUpdatableRequest(_requestId) whenNotPaused {
        if (!IAdmin(admin).getZoneEligibility(requests[_requestId].estate.zone, msg.sender)) {
            revert Unauthorized();
        }

        if (_quota.minSellingQuantity > _quota.maxSellingQuantity
            || _quota.maxSellingQuantity > _quota.totalQuantity
            || _quota.totalQuantity > type(uint256).max / 10 ** requests[_requestId].estate.decimals) {
            revert InvalidInput();
        }

        requests[_requestId].quota = RequestQuota(
            _quota.totalQuantity,
            _quota.minSellingQuantity,
            _quota.maxSellingQuantity,
            0
        );

        emit RequestQuotaUpdate(_requestId, _quota);
    }

    function updateRequestQuote(
        uint256 _requestId,
        RequestQuoteInput calldata _quote
    ) external onlyExecutive onlyUpdatableRequest(_requestId) whenNotPaused {
        if (!IAdmin(admin).getZoneEligibility(requests[_requestId].estate.zone, msg.sender)) {
            revert Unauthorized();
        }

        if (_quote.cashbackThreshold > requests[_requestId].quota.totalQuantity
            || _quote.cashbackBaseRate > Constant.COMMON_RATE_MAX_FRACTION
            || _quote.cashbackCurrencies.length != _quote.cashbackDenominations.length) {
            revert InvalidInput();
        }

        if (!IPriceWatcher(priceWatcher).isPriceInRange(
            _quote.currency,
            _quote.unitPrice,
            baseMinUnitPrice,
            baseMaxUnitPrice
        )) {
            revert InvalidUnitPrice();
        }

        Rate memory commissionRate = ICommissionToken(commissionToken).getCommissionRate();
        uint256 cashbackFundId = IReserveVault(reserveVault).initiateFund(
                _quote.currency,
                _cashbackBaseDenomination(
                _quote.unitPrice,
                commissionRate,
                Rate(_quote.cashbackBaseRate, Constant.COMMON_RATE_DECIMALS)
            ),
            _quote.cashbackCurrencies,
            _quote.cashbackDenominations
        );

        RequestQuote memory quote = RequestQuote(
            _quote.unitPrice,
            _quote.currency,
            _quote.cashbackThreshold,
            cashbackFundId
        );
        requests[_requestId].quote = quote;

        emit RequestQuoteUpdate(_requestId, quote);
    }

    function updateRequestAgenda(
        uint256 _requestId,
        uint40 _privateSaleEndsAt,
        uint40 _publicSaleEndsAt
    ) external onlyExecutive onlyUpdatableRequest(_requestId) whenNotPaused {
        if (!IAdmin(admin).getZoneEligibility(requests[_requestId].estate.zone, msg.sender)) {
            revert Unauthorized();
        }

        if (block.timestamp > _privateSaleEndsAt
            || _privateSaleEndsAt > _publicSaleEndsAt
            || _publicSaleEndsAt == block.timestamp) {
            revert InvalidInput();
        }

        RequestAgenda memory agenda = RequestAgenda(
            _privateSaleEndsAt,
            _publicSaleEndsAt
        );
        requests[_requestId].agenda = agenda;

        emit RequestAgendaUpdate(_requestId, agenda);
    }


    function deposit(uint256 _requestId, uint256 _quantity)
    external payable validRequest(_requestId) returns (uint256) {
        return _deposit(_requestId, _quantity);
    }

    function safeDeposit(
        uint256 _requestId,
        uint256 _quantity,
        bytes32 _anchor
    ) external payable validRequest(_requestId) returns (uint256) {
        if (_anchor != keccak256(bytes(requests[_requestId].estate.uri))) {
            revert BadAnchor();
        }

        return _deposit(_requestId, _quantity);
    }

    function cancel(uint256 _requestId) external onlyManager validRequest(_requestId) whenNotPaused {
        Request storage request = requests[_requestId];
        if (!IAdmin(admin).getZoneEligibility(request.estate.zone, msg.sender)) {
            revert Unauthorized();
        }
        if (request.quota.totalQuantity == 0) {
            revert Cancelled();
        }
        if (request.estate.estateId != 0) {
            revert Tokenized();
        }
        request.quota.totalQuantity = 0;
        emit RequestCancellation(_requestId);
    }

    function confirm(uint256 _requestId, address _commissionReceiver)
    external onlyManager validRequest(_requestId) returns (uint256) {
        return _confirm(_requestId, _commissionReceiver);
    }

    function safeConfirm(
        uint256 _requestId,
        address _commissionReceiver,
        bytes32 _anchor
    ) external onlyManager validRequest(_requestId) returns (uint256) {
        if (_anchor != keccak256(bytes(requests[_requestId].estate.uri))) {
            revert BadAnchor();
        }

        return _confirm(_requestId, _commissionReceiver);
    }

    function withdrawDeposit(uint256 _requestId)
    external nonReentrant validRequest(_requestId) whenNotPaused returns (uint256) {
        Request storage request = requests[_requestId];
        if (request.estate.estateId != 0) {
            revert Tokenized();
        }

        if (request.quota.totalQuantity != 0) {
            uint256 publicSaleEndsAt = request.agenda.publicSaleEndsAt;
            if (publicSaleEndsAt > block.timestamp) {
                revert StillSelling();
            }
            if (publicSaleEndsAt + Constant.ESTATE_TOKEN_CONFIRMATION_TIME_LIMIT > block.timestamp
                && request.quota.soldQuantity >= request.quota.minSellingQuantity) {
                revert InvalidWithdrawing();
            }
        }
        if (hasWithdrawn[_requestId][msg.sender]) {
            revert AlreadyWithdrawn();
        }

        address currency = request.quote.currency;
        uint256 quantity = deposits[_requestId][msg.sender];
        uint256 value = quantity * request.quote.unitPrice;

        hasWithdrawn[_requestId][msg.sender] = true;

        CurrencyHandler.sendCurrency(currency, msg.sender, value);

        emit DepositWithdrawal(
            _requestId,
            msg.sender,
            quantity,
            value
        );

        return value;
    }

    function withdrawToken(uint256 _requestId)
    external nonReentrant validRequest(_requestId) whenNotPaused returns (uint256) {
        Request storage request = requests[_requestId];
        if (request.estate.estateId == 0) {
            revert InvalidWithdrawing();
        }
        if (hasWithdrawn[_requestId][msg.sender]) {
            revert AlreadyWithdrawn();
        }

        hasWithdrawn[_requestId][msg.sender] = true;
        uint256 quantity = deposits[_requestId][msg.sender];
        uint256 amount = quantity * 10 ** request.estate.decimals;
        IEstateToken(estateToken).safeTransferFrom(
            address(this),
            msg.sender,
            request.estate.estateId,
            amount,
            ""
        );

        IReserveVault(reserveVault).withdrawFund(request.quote.cashbackFundId, msg.sender, quantity);

        emit TokenWithdrawal(
            _requestId,
            msg.sender,
            amount
        );

        return amount;
    }

    function allocationOfAt(
        uint256 _tokenizationId,
        address _account,
        uint256 _at
    ) external view validRequest(_tokenizationId) returns (uint256 allocation) {
        return requests[_tokenizationId].estate.estateId != 0
            && _at >= requests[_tokenizationId].agenda.publicSaleEndsAt
            ? deposits[_tokenizationId][_account] * 10 ** requests[_tokenizationId].estate.decimals
            : 0;
    }

    function _cashbackBaseDenomination(
        uint256 _unitPrice,
        Rate memory _commissionRate,
        Rate memory _cashbackBaseRate
    ) private pure returns (uint256) {
        return _unitPrice.remain(_commissionRate).scale(_cashbackBaseRate);
    }

    function _requestTokenization(
        address _seller,
        RequestEstateInput calldata _estate,
        RequestQuotaInput calldata _quota,
        RequestQuoteInput calldata _quote,
        uint40 _privateSaleEndsAt,
        uint40 _publicSaleEndsAt
    ) private onlyExecutive whenNotPaused returns (uint256) {
        if (!IAdmin(admin).getZoneEligibility(_estate.zone, msg.sender)) {
            revert Unauthorized();
        }

        if (!IPriceWatcher(priceWatcher).isPriceInRange(
            _quote.currency,
            _quote.unitPrice,
            baseMinUnitPrice,
            baseMaxUnitPrice
        )) {
            revert InvalidUnitPrice();
        }

        if (!isActiveSellerIn[_estate.zone][_seller]
            || _estate.decimals > Constant.ESTATE_TOKEN_MAX_DECIMALS
            || _estate.expireAt <= block.timestamp
            || _quota.minSellingQuantity > _quota.maxSellingQuantity
            || _quota.maxSellingQuantity > _quota.totalQuantity
            || _quota.totalQuantity > type(uint256).max / 10 ** _estate.decimals
            || _quote.cashbackThreshold > _quota.totalQuantity
            || _quote.cashbackBaseRate > Constant.COMMON_RATE_MAX_FRACTION
            || _quote.cashbackCurrencies.length != _quote.cashbackDenominations.length) {
            revert InvalidInput();
        }

        Rate memory commissionRate = ICommissionToken(commissionToken).getCommissionRate();
        uint256 cashbackFundId = IReserveVault(reserveVault).initiateFund(
            _quote.currency,
            _cashbackBaseDenomination(
                _quote.unitPrice,
                commissionRate,
                Rate(_quote.cashbackBaseRate, Constant.COMMON_RATE_DECIMALS)
            ),
            _quote.cashbackCurrencies,
            _quote.cashbackDenominations
        );

        RequestQuote memory quote = RequestQuote(
            _quote.unitPrice,
            _quote.currency,
            _quote.cashbackThreshold,
            cashbackFundId
        );
        RequestAgenda memory agenda = RequestAgenda(
            _privateSaleEndsAt,
            _publicSaleEndsAt
        );

        uint256 requestId = ++requestNumber;
        requests[requestId] = Request(
            RequestEstate(
                0,
                _estate.zone,
                _estate.uri,
                _estate.decimals,
                _estate.expireAt
            ),
            RequestQuota(
                _quota.totalQuantity,
                _quota.minSellingQuantity,
                _quota.maxSellingQuantity,
                0
            ),
            quote,
            agenda,
            _seller
        );

        emit NewRequest(
            requestId,
            _seller,
            _estate,
            _quota,
            quote,
            agenda
        );

        return requestId;
    }

    function _deposit(uint256 _requestId, uint256 _quantity)
    private nonReentrant whenNotPaused returns (uint256) {
        Request storage request = requests[_requestId];
        if (request.quota.totalQuantity == 0) {
            revert Cancelled();
        }
        if (request.estate.estateId != 0) {
            revert Tokenized();
        }
        if (request.agenda.privateSaleEndsAt > block.timestamp && !isWhitelisted[msg.sender]
            || request.agenda.publicSaleEndsAt <= block.timestamp) {
            revert InvalidDepositing();
        }

        uint256 newSoldQuantity = request.quota.soldQuantity + _quantity;
        if (newSoldQuantity > request.quota.maxSellingQuantity) {
            revert MaxSellingQuantityExceeded();
        }
        request.quota.soldQuantity = newSoldQuantity;

        uint256 value = _quantity * request.quote.unitPrice;
        CurrencyHandler.receiveCurrency(request.quote.currency, value);

        uint256 cashbackThreshold = request.quote.cashbackThreshold;
        uint256 oldDeposit = deposits[_requestId][msg.sender];
        uint256 newDeposit = oldDeposit + _quantity;
        deposits[_requestId][msg.sender] = newDeposit;

        if (oldDeposit >= cashbackThreshold) {
            IReserveVault(reserveVault).expandFund(
                request.quote.cashbackFundId,
                _quantity
            );
        } else if (newDeposit >= cashbackThreshold) {
            IReserveVault(reserveVault).expandFund(
                request.quote.cashbackFundId,
                oldDeposit
            );
        }

        emit Deposit(
            _requestId,
            msg.sender,
            _quantity,
            value
        );

        return value;
    }

    function _confirm(uint256 _requestId, address _commissionReceiver)
    private nonReentrant whenNotPaused returns (uint256) {
        Request storage request = requests[_requestId];

        bytes32 zone = request.estate.zone;
        if (!IAdmin(admin).getZoneEligibility(zone, msg.sender)) {
            revert Unauthorized();
        }

        uint256 totalQuantity = request.quota.totalQuantity;
        if (totalQuantity == 0) {
            revert Cancelled();
        }

        if (request.estate.estateId != 0) {
            revert Tokenized();
        }

        uint40 publicSaleEndsAt = request.agenda.publicSaleEndsAt;
        if (publicSaleEndsAt + Constant.ESTATE_TOKEN_CONFIRMATION_TIME_LIMIT <= block.timestamp) {
            revert TimeOut();
        }

        if (publicSaleEndsAt <= block.timestamp) {
            request.agenda.publicSaleEndsAt = uint40(block.timestamp);
        }

        uint256 soldQuantity = request.quota.soldQuantity;
        if (soldQuantity < request.quota.minSellingQuantity) {
            revert NotEnoughSoldQuantity();
        }

        uint8 decimals = request.estate.decimals;
        uint256 unit = 10 ** decimals;

        IEstateToken estateTokenContract = IEstateToken(estateToken);
        uint256 estateId = estateTokenContract.tokenizeEstate(
            totalQuantity * unit,
            zone,
            _requestId,
            request.estate.uri,
            request.estate.expireAt,
            request.estate.decimals,
            _commissionReceiver
        );
        request.estate.estateId = estateId;

        address seller = request.seller;
        unchecked {
            estateTokenContract.safeTransferFrom(
                address(this),
                request.seller,
                estateId,
                (request.quota.totalQuantity - soldQuantity) * unit,
                ""
            );
        }

        uint256 value = soldQuantity * request.quote.unitPrice;
        uint256 feeAmount = value.scale(feeRate, Constant.COMMON_RATE_MAX_FRACTION);

        address currency = request.quote.currency;
        feeAmount = _applyDiscount(feeAmount, currency);

        ( , uint256 commissionAmount) = ICommissionToken(commissionToken).commissionInfo(estateId, feeAmount);

        CurrencyHandler.sendCurrency(currency, seller, value - feeAmount);
        if (commissionAmount != 0) {
            CurrencyHandler.sendCurrency(currency,_commissionReceiver, commissionAmount);
        }

        uint256 cashbackFundId = request.quote.cashbackFundId;
        address reserveVaultAddress = reserveVault;
        Fund memory fund = IReserveVault(reserveVaultAddress).getFund(cashbackFundId);

        uint256 cashbackBaseAmount;
        if (fund.totalQuantity != 0) {
            uint256 totalNative;
            if (fund.mainDenomination != 0) {
                cashbackBaseAmount = fund.mainDenomination * fund.totalQuantity;
                if (fund.mainDenomination != 0) {
                    totalNative += cashbackBaseAmount;
                } else {
                    CurrencyHandler.receiveERC20(fund.mainCurrency, cashbackBaseAmount);
                    CurrencyHandler.allowERC20(fund.mainCurrency, reserveVaultAddress, cashbackBaseAmount);
                }
            }
            CurrencyHandler.receiveNative(totalNative);
        }

        CurrencyHandler.sendCurrency(
            currency,
            feeReceiver,
            feeAmount - commissionAmount - cashbackBaseAmount
        );

        emit RequestConfirmation(
            _requestId,
            estateId,
            soldQuantity,
            value,
            feeAmount,
            _commissionReceiver,
            commissionAmount,
            cashbackBaseAmount
        );

        return estateId;
    }
}
