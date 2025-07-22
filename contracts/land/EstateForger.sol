// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ReentrancyGuardUpgradeable} from "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";

import {CurrencyHandler} from "../lib/CurrencyHandler.sol";
import {Formula} from "../lib/Formula.sol";

import {IAdmin} from "../common/interfaces/IAdmin.sol";
import {IPriceWatcher} from "../common/interfaces/IPriceWatcher.sol";
import {IReserveVault} from "../common/interfaces/IReserveVault.sol";

import {CommonConstant} from "../common/constants/CommonConstant.sol";

import {Discountable} from "../common/utilities/Discountable.sol";
import {Pausable} from "../common/utilities/Pausable.sol";
import {Validatable} from "../common/utilities/Validatable.sol";

import {EstateForgerConstant} from "./constants/EstateForgerConstant.sol";

import {ICommissionToken} from "./interfaces/ICommissionToken.sol";
import {IEstateToken} from "./interfaces/IEstateToken.sol";

import {EstateForgerStorage} from "./storages/EstateForgerStorage.sol";

import {CommissionDispatchable} from "./utilities/CommissionDispatchable.sol";
import {EstateTokenizer} from "./utilities/EstateTokenizer.sol";

contract EstateForger is
EstateForgerStorage,
EstateTokenizer,
CommissionDispatchable,
Discountable,
Pausable,
Validatable,
ReentrancyGuardUpgradeable {
    using Formula for uint256;

    string constant private VERSION = "v1.1.1";

    modifier validRequest(uint256 _requestId) {
        if (_requestId == 0 || _requestId > requestNumber) {
            revert InvalidRequestId();
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
        address _validator,
        uint256 _baseMinUnitPrice,
        uint256 _baseMaxUnitPrice,
        uint256 _feeRate
    ) external initializer {
        require(_feeRate <= CommonConstant.COMMON_RATE_MAX_FRACTION);

        __Pausable_init();
        __ReentrancyGuard_init();

        __CommissionDispatchable_init(_commissionToken);
        __Validatable_init(_validator);

        admin = _admin;
        estateToken = _estateToken;
        priceWatcher = _priceWatcher;
        feeReceiver = _feeReceiver;
        reserveVault = _reserveVault;

        baseMinUnitPrice = _baseMinUnitPrice;
        baseMaxUnitPrice = _baseMaxUnitPrice;
        emit BaseUnitPriceRangeUpdate(_baseMinUnitPrice, _baseMaxUnitPrice);

        feeRate = _feeRate;
        emit FeeRateUpdate(_feeRate);
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
        if (_feeRate > CommonConstant.COMMON_RATE_MAX_FRACTION) {
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
                    revert WhitelistedAccount(_accounts[i]);
                }
                isWhitelisted[_accounts[i]] = true;
                emit Whitelist(_accounts[i]);
            }
        } else {
            for (uint256 i; i < _accounts.length; ++i) {
                if (!isWhitelisted[_accounts[i]]) {
                    revert NotWhitelistedAccount(_accounts[i]);
                }
                isWhitelisted[_accounts[i]] = false;
                emit Unwhitelist(_accounts[i]);
            }
        }
    }

    function isSellerIn(bytes32 _zone, address _seller) public view returns (bool) {
        return bytes(sellerURIs[_zone][_seller]).length != 0;
    }

    function registerSellerIn(
        bytes32 _zone,
        address _account,
        string calldata _uri,
        Validation calldata _validation
    ) external onlyManager {
        _validate(
            abi.encode(
                _zone,
                _account,
                _uri
            ),
            _validation
        );

        if (!IAdmin(admin).getZoneEligibility(_zone, msg.sender)) {
            revert Unauthorized();
        }

        sellerURIs[_zone][_account] = _uri;

        emit SellerRegistration(
            _zone,
            _account,
            _uri
        );
    }

    function getFeeRate() public view returns (Rate memory) {
        return Rate(feeRate, CommonConstant.COMMON_RATE_DECIMALS);
    }

    function getRequest(uint256 _requestId)
    external view validRequest(_requestId) returns (EstateForgerRequest memory) {
        return requests[_requestId];
    }

    function requestTokenization(
        address _seller,
        EstateForgerRequestEstateInput calldata _estate,
        EstateForgerRequestQuotaInput calldata _quota,
        EstateForgerRequestQuoteInput calldata _quote,
        EstateForgerRequestAgendaInput calldata _agenda,
        Validation calldata _validation
    ) external returns (uint256) {
        _validate(abi.encode(_estate.uri), _validation);

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

        if (_estate.expireAt <= block.timestamp) {
            revert InvalidTimestamp();
        }

        if (!isSellerIn(_estate.zone, _seller)
            || _quota.minSellingQuantity > _quota.maxSellingQuantity
            || _quota.maxSellingQuantity > _quota.totalQuantity
            || _quote.cashbackThreshold > _quota.totalQuantity
            || _quote.cashbackBaseRate > CommonConstant.COMMON_RATE_MAX_FRACTION
            || _quote.cashbackCurrencies.length != _quote.cashbackDenominations.length
            || _agenda.saleStartsAt <= block.timestamp
            || _agenda.privateSaleDuration + _agenda.publicSaleDuration < EstateForgerConstant.ESTATE_FORGER_MINIMUM_SALE_DURATION) {
            revert InvalidInput();
        }

        uint256 feeDenomination = _getFeeDenomination(_quote.unitPrice, _quote.currency);
        uint256 commissionDenomination = _getCommissionDenomination(feeDenomination);
        uint256 cashbackFundId = IReserveVault(reserveVault).initiateFund(
            _quote.currency,
            _getCashbackBaseDenomination(
                feeDenomination,
                commissionDenomination,
                _quote.cashbackBaseRate
            ),
            _quote.cashbackCurrencies,
            _quote.cashbackDenominations
        );

        uint256 requestId = ++requestNumber;
        requests[requestId] = EstateForgerRequest(
            EstateForgerRequestEstate(
                0,
                _estate.zone,
                _estate.uri,
                _estate.expireAt
            ),
            EstateForgerRequestQuota(
                _quota.totalQuantity,
                _quota.minSellingQuantity,
                _quota.maxSellingQuantity,
                0
            ),
            EstateForgerRequestQuote(
                _quote.unitPrice,
                _quote.currency,
                _quote.cashbackThreshold,
                cashbackFundId,
                feeDenomination,
                commissionDenomination
            ),
            EstateForgerRequestAgenda(
                _agenda.saleStartsAt,
                _agenda.saleStartsAt + _agenda.privateSaleDuration,
                _agenda.saleStartsAt + _agenda.privateSaleDuration + _agenda.publicSaleDuration
            ),
            _seller
        );

        emit NewRequest(
            requestId,
            cashbackFundId,
            _seller,
            _estate,
            _quota,
            _quote,
            _agenda
        );

        return requestId;
    }

    function updateRequestURI(
        uint256 _requestId,
        string calldata _uri,
        Validation calldata _validation
    ) external validRequest(_requestId) onlyExecutive whenNotPaused {
        _validate(abi.encode(_uri), _validation);

        if (!IAdmin(admin).getZoneEligibility(requests[_requestId].estate.zone, msg.sender)) {
            revert Unauthorized();
        }

        if (requests[_requestId].estate.estateId != 0) {
            revert Tokenized();
        }
        if (requests[_requestId].quota.totalQuantity == 0) {
            revert Cancelled();
        }

        requests[_requestId].estate.uri = _uri;

        emit RequestURIUpdate(_requestId, _uri);
    }

    function updateRequestAgenda(
        uint256 _requestId,
        EstateForgerRequestAgendaInput calldata _agenda
    ) external validRequest(_requestId) onlyExecutive whenNotPaused {
        EstateForgerRequest storage request = requests[_requestId];

        if (!IAdmin(admin).getZoneEligibility(request.estate.zone, msg.sender)) {
            revert Unauthorized();
        }

        if (request.estate.estateId != 0) {
            revert Tokenized();
        }
        if (request.quota.totalQuantity == 0) {
            revert Cancelled();
        }
        if (request.quota.soldQuantity > 0) {
            revert AlreadyHadDeposit();
        }

        if (_agenda.privateSaleDuration + _agenda.publicSaleDuration < EstateForgerConstant.ESTATE_FORGER_MINIMUM_SALE_DURATION) {
            revert InvalidInput();
        }

        if (request.agenda.saleStartsAt > block.timestamp) {
            request.agenda.saleStartsAt = _agenda.saleStartsAt;
        }

        request.agenda.privateSaleEndsAt = _agenda.saleStartsAt + _agenda.privateSaleDuration;
        request.agenda.publicSaleEndsAt = _agenda.saleStartsAt + _agenda.privateSaleDuration + _agenda.publicSaleDuration;

        emit RequestAgendaUpdate(_requestId, _agenda);
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

    function cancel(uint256 _requestId) external validRequest(_requestId) onlyManager whenNotPaused {
        EstateForgerRequest storage request = requests[_requestId];
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
    external payable validRequest(_requestId) nonReentrant whenNotPaused returns (uint256) {
        if (_commissionReceiver == address(0)) {
            revert InvalidCommissionReceiver();
        }

        EstateForgerRequest storage request = requests[_requestId];
        bytes32 zone = request.estate.zone;
        if (!IAdmin(admin).getZoneEligibility(zone, msg.sender)) {
            revert Unauthorized();
        }

        if (request.estate.estateId != 0) {
            revert Tokenized();
        }

        uint256 totalQuantity = request.quota.totalQuantity;
        if (totalQuantity == 0) {
            revert Cancelled();
        }

        uint40 publicSaleEndsAt = request.agenda.publicSaleEndsAt;
        if (publicSaleEndsAt + EstateForgerConstant.ESTATE_FORGER_CONFIRMATION_TIME_LIMIT <= block.timestamp) {
            revert Timeout();
        }

        if (publicSaleEndsAt <= block.timestamp) {
            request.agenda.publicSaleEndsAt = uint40(block.timestamp);
        }

        uint256 soldQuantity = request.quota.soldQuantity;
        if (soldQuantity < request.quota.minSellingQuantity) {
            revert NotEnoughSoldQuantity();
        }

        IEstateToken estateTokenContract = IEstateToken(estateToken);
        uint256 unit = 10 ** estateTokenContract.decimals();
        uint256 estateId = estateTokenContract.tokenizeEstate(
            totalQuantity * unit,
            zone,
            _requestId,
            request.estate.uri,
            request.estate.expireAt,
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

        address currency = request.quote.currency;
        uint256 value = soldQuantity * request.quote.unitPrice;
        uint256 feeAmount = soldQuantity * request.quote.feeDenomination;
        CurrencyHandler.sendCurrency(currency, seller, value - feeAmount);

        uint256 commissionAmount = soldQuantity * request.quote.commissionDenomination;
        CurrencyHandler.sendCurrency(currency,_commissionReceiver, commissionAmount);

        emit CommissionDispatch(
            _commissionReceiver,
            commissionAmount,
            currency
        );

        uint256 cashbackFundId = request.quote.cashbackFundId;
        address reserveVaultAddress = reserveVault;
        Fund memory fund = IReserveVault(reserveVaultAddress).getFund(cashbackFundId);

        uint256 totalNative;
        uint256 cashbackBaseAmount;
        if (fund.totalQuantity != 0) {
            for (uint256 i; i < fund.extraCurrencies.length; ++i) {
                if (fund.extraCurrencies[i] == address(0)) {
                    totalNative += fund.extraDenominations[i] * fund.totalQuantity;
                } else {
                    CurrencyHandler.receiveERC20(fund.extraCurrencies[i], fund.extraDenominations[i] * fund.totalQuantity);
                    CurrencyHandler.allowERC20(fund.extraCurrencies[i], reserveVaultAddress, fund.extraDenominations[i] * fund.totalQuantity);
                }
            }
            CurrencyHandler.receiveNative(totalNative);

            if (fund.mainDenomination != 0) {
                cashbackBaseAmount = fund.mainDenomination * fund.totalQuantity;
                if (fund.mainCurrency == address(0)) {
                    totalNative += cashbackBaseAmount;
                } else {
                    CurrencyHandler.allowERC20(fund.mainCurrency, reserveVaultAddress, cashbackBaseAmount);
                }
            }
        }

        IReserveVault(reserveVaultAddress).provideFund{value: totalNative}(cashbackFundId);

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
            cashbackBaseAmount
        );

        return estateId;
    }

    function withdrawDeposit(uint256 _requestId)
    external nonReentrant validRequest(_requestId) whenNotPaused returns (uint256) {
        EstateForgerRequest storage request = requests[_requestId];
        if (request.estate.estateId != 0) {
            revert Tokenized();
        }

        if (request.quota.totalQuantity != 0) {
            uint256 publicSaleEndsAt = request.agenda.publicSaleEndsAt;
            if (publicSaleEndsAt > block.timestamp) {
                revert StillSelling();
            }
            if (publicSaleEndsAt + EstateForgerConstant.ESTATE_FORGER_CONFIRMATION_TIME_LIMIT > block.timestamp
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

    function withdrawEstateToken(uint256 _requestId)
    external nonReentrant validRequest(_requestId) whenNotPaused returns (uint256) {
        EstateForgerRequest storage request = requests[_requestId];
        uint256 estateId = request.estate.estateId;
        if (estateId == 0) {
            revert InvalidWithdrawing();
        }
        if (hasWithdrawn[_requestId][msg.sender]) {
            revert AlreadyWithdrawn();
        }

        hasWithdrawn[_requestId][msg.sender] = true;


        IEstateToken estateTokenContract = IEstateToken(estateToken);
        uint256 unit = 10 ** estateTokenContract.decimals();
        uint256 quantity = deposits[_requestId][msg.sender];
        uint256 amount = quantity * unit;

        estateTokenContract.safeTransferFrom(
            address(this),
            msg.sender,
            estateId,
            amount,
            ""
        );

        if (quantity >= request.quote.cashbackThreshold) {
            IReserveVault(reserveVault).withdrawFund(request.quote.cashbackFundId, msg.sender, quantity);
        }

        emit EstateTokenWithdrawal(
            _requestId,
            msg.sender,
            amount
        );

        return amount;
    }

    function isTokenized(uint256 _tokenizationId) external view returns (bool) {
        return requests[_tokenizationId].estate.estateId != 0;
    }

    function allocationOfAt(
        uint256 _tokenizationId,
        address _account,
        uint256 _at
    ) external view validRequest(_tokenizationId) returns (uint256) {
        // TODO: check
        return requests[_tokenizationId].estate.estateId != 0
            && _at >= requests[_tokenizationId].agenda.publicSaleEndsAt
            ? deposits[_tokenizationId][_account] * 10 ** IEstateToken(estateToken).decimals()
            : 0;
    }

    function _getFeeDenomination(uint256 _unitPrice, address _currency) internal view returns (uint256) {
        return _applyDiscount(
            _unitPrice.scale(feeRate, CommonConstant.COMMON_RATE_MAX_FRACTION),
            _currency
        );
    }

    function _getCommissionDenomination(uint256 _feeDenomination) internal view returns (uint256) {
        return _feeDenomination
            .scale(ICommissionToken(commissionToken).getCommissionRate());
    }

    function _getCashbackBaseDenomination(
        uint256 _feeDenomination,
        uint256 _commissionDenomination,
        uint256 _cashbackBaseRate
    ) private pure returns (uint256) {
        return (_feeDenomination - _commissionDenomination)
            .scale(_cashbackBaseRate, CommonConstant.COMMON_RATE_MAX_FRACTION);
    }

    function _deposit(uint256 _requestId, uint256 _quantity)
    internal nonReentrant whenNotPaused returns (uint256) {
        EstateForgerRequest storage request = requests[_requestId];
        if (request.quota.totalQuantity == 0) {
            revert Cancelled();
        }
        if (request.estate.estateId != 0) {
            revert Tokenized();
        }
        if (request.agenda.saleStartsAt > block.timestamp
            || request.agenda.privateSaleEndsAt > block.timestamp && !isWhitelisted[msg.sender]
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
                newDeposit
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
}
