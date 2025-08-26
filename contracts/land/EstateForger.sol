// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ReentrancyGuardUpgradeable} from "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";

import {CurrencyHandler} from "../lib/CurrencyHandler.sol";
import {Formula} from "../lib/Formula.sol";

import {IAdmin} from "../common/interfaces/IAdmin.sol";
import {IPriceWatcher} from "../common/interfaces/IPriceWatcher.sol";
import {IReserveVault} from "../common/interfaces/IReserveVault.sol";

import {CommonConstant} from "../common/constants/CommonConstant.sol";

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

    modifier onlyEligibleZone(uint256 _requestId) {
        if (!IAdmin(admin).getZoneEligibility(requests[_requestId].estate.zone, msg.sender)) {
            revert Unauthorized();
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
        uint256 _baseMaxUnitPrice
    ) external initializer {
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
    }

    function version() external pure returns (string memory) {
        return VERSION;
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
                    revert WhitelistedAccount();
                }
                isWhitelisted[_accounts[i]] = true;
                emit Whitelist(_accounts[i]);
            }
        } else {
            for (uint256 i; i < _accounts.length; ++i) {
                if (!isWhitelisted[_accounts[i]]) {
                    revert NotWhitelistedAccount();
                }
                isWhitelisted[_accounts[i]] = false;
                emit Unwhitelist(_accounts[i]);
            }
        }
    }

    function getRequest(uint256 _requestId)
    external view validRequest(_requestId) returns (EstateForgerRequest memory) {
        return requests[_requestId];
    }

    function requestTokenization(
        address _requester,
        EstateForgerRequestEstateInput calldata _estate,
        EstateForgerRequestQuotaInput calldata _quota,
        EstateForgerRequestQuoteInput calldata _quote,
        EstateForgerRequestAgendaInput calldata _agenda,
        Validation calldata _validation
    ) external nonReentrant onlyExecutive whenNotPaused returns (uint256) {
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

        if (!IEstateToken(estateToken).isCustodianIn(_estate.zone, _requester)) {
            revert NotRegisteredCustodian();
        }

        if (_quota.minSellingQuantity > _quota.maxSellingQuantity
            || _quota.maxSellingQuantity > _quota.totalQuantity
            || _quote.cashbackThreshold > _quota.totalQuantity
            || _quote.cashbackBaseRate > CommonConstant.RATE_MAX_FRACTION
            || _quote.cashbackCurrencies.length != _quote.cashbackDenominations.length
            || _agenda.saleStartsAt <= block.timestamp
            || _agenda.privateSaleDuration + _agenda.publicSaleDuration < EstateForgerConstant.SALE_MINIMUM_DURATION) {
            revert InvalidInput();
        }

        if (!ICommissionToken(commissionToken).isActiveIn(_estate.zone, _quote.broker)) {
            revert InvalidBroker();
        }

        uint256 commissionDenomination = _quote.feeDenomination
            .scale(ICommissionToken(commissionToken).getBrokerCommissionRate(_estate.zone, _quote.broker));

        uint256 cashbackFundId;
        if (_quote.cashbackBaseRate == 0 && _quote.cashbackCurrencies.length == 0) {
            if (_quote.cashbackThreshold != 0) {
                revert InvalidInput();
            }
        } else {
            if (_quote.cashbackThreshold == 0) {
                revert InvalidInput();
            }
            cashbackFundId = IReserveVault(reserveVault).openFund(
                _quote.currency,
                (_quote.feeDenomination - commissionDenomination)
                    .scale(_quote.cashbackBaseRate, CommonConstant.RATE_MAX_FRACTION),
                _quote.cashbackCurrencies,
                _quote.cashbackDenominations
            );
        }

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
                _quote.feeDenomination,
                commissionDenomination,
                _quote.broker
            ),
            EstateForgerRequestAgenda(
                _agenda.saleStartsAt,
                _agenda.saleStartsAt + _agenda.privateSaleDuration,
                _agenda.saleStartsAt + _agenda.privateSaleDuration + _agenda.publicSaleDuration,
                0
            ),
            _requester
        );

        emit NewRequest(
            requestId,
            cashbackFundId,
            _requester,
            _estate,
            _quota,
            _quote,
            _agenda
        );

        return requestId;
    }

    function whitelistFor(
        uint256 _requestId,
        address[] calldata _accounts,
        bool _isWhitelisted
    ) external validRequest(_requestId) onlyExecutive onlyEligibleZone(_requestId) {
        if (_isWhitelisted) {
            for (uint256 i; i < _accounts.length; ++i) {
                if (isWhitelistedFor[_requestId][_accounts[i]]) {
                    revert WhitelistedAccount();
                }
                isWhitelistedFor[_requestId][_accounts[i]] = true;
                emit RequestWhitelist(_requestId, _accounts[i]);
            }
        } else {
            for (uint256 i; i < _accounts.length; ++i) {
                if (!isWhitelistedFor[_requestId][_accounts[i]]) {
                    revert NotWhitelistedAccount();
                }
                isWhitelistedFor[_requestId][_accounts[i]] = false;
                emit RequestUnwhitelist(_requestId, _accounts[i]);
            }
        }
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

        if (requests[_requestId].agenda.confirmAt != 0) {
            revert AlreadyConfirmed();
        }
        if (requests[_requestId].quota.totalQuantity == 0) {
            revert AlreadyCancelled();
        }

        requests[_requestId].estate.uri = _uri;

        emit RequestURIUpdate(_requestId, _uri);
    }

    function updateRequestAgenda(
        uint256 _requestId,
        EstateForgerRequestAgendaInput calldata _agenda
    ) external validRequest(_requestId) onlyExecutive onlyEligibleZone(_requestId) whenNotPaused {
        EstateForgerRequest storage request = requests[_requestId];
        if (request.agenda.confirmAt != 0) {
            revert AlreadyConfirmed();
        }
        if (request.quota.totalQuantity == 0) {
            revert AlreadyCancelled();
        }
        if (request.quota.soldQuantity > 0) {
            revert AlreadyHadDeposit();
        }

        if (_agenda.privateSaleDuration + _agenda.publicSaleDuration < EstateForgerConstant.SALE_MINIMUM_DURATION) {
            revert InvalidInput();
        }

        uint40 saleStartsAt;
        if (_agenda.saleStartsAt != 0) {
            if (request.agenda.saleStartsAt > block.timestamp) {
                if (_agenda.saleStartsAt <= block.timestamp) {
                    revert InvalidTimestamp();
                }
                request.agenda.saleStartsAt = _agenda.saleStartsAt;
                saleStartsAt = _agenda.saleStartsAt;
            } else {
                revert InvalidInput();
            }
        } else {
            saleStartsAt = request.agenda.saleStartsAt;
        }

        request.agenda.privateSaleEndsAt = saleStartsAt + _agenda.privateSaleDuration;
        request.agenda.publicSaleEndsAt = saleStartsAt + _agenda.privateSaleDuration + _agenda.publicSaleDuration;

        emit RequestAgendaUpdate(_requestId, _agenda);
    }

    function cancel(uint256 _requestId)
    external validRequest(_requestId) onlyManager onlyEligibleZone(_requestId) whenNotPaused {
        EstateForgerRequest storage request = requests[_requestId];
        if (request.quota.totalQuantity == 0) {
            revert AlreadyCancelled();
        }
        if (request.agenda.confirmAt != 0) {
            revert AlreadyConfirmed();
        }
        request.quota.totalQuantity = 0;
        emit RequestCancellation(_requestId);
    }

    function confirm(uint256 _requestId)
    external payable validRequest(_requestId) nonReentrant onlyManager onlyEligibleZone(_requestId) whenNotPaused returns (uint256) {
        EstateForgerRequest storage request = requests[_requestId];
        if (block.timestamp < request.agenda.saleStartsAt) {
            revert InvalidConfirming();
        }

        if (request.agenda.confirmAt != 0) {
            revert AlreadyConfirmed();
        }

        uint256 totalQuantity = request.quota.totalQuantity;
        if (totalQuantity == 0) {
            revert AlreadyCancelled();
        }

        uint40 publicSaleEndsAt = request.agenda.publicSaleEndsAt;
        if (publicSaleEndsAt + EstateForgerConstant.SALE_CONFIRMATION_TIME_LIMIT <= block.timestamp) {
            revert Timeout();
        }

        uint256 soldQuantity = request.quota.soldQuantity;
        if (soldQuantity < request.quota.minSellingQuantity) {
            revert NotEnoughSoldQuantity();
        }

        if (publicSaleEndsAt > block.timestamp) {
            request.agenda.publicSaleEndsAt = uint40(block.timestamp);
        }
        request.agenda.confirmAt = uint40(block.timestamp);

        IEstateToken estateTokenContract = IEstateToken(estateToken);
        uint256 unit = 10 ** estateTokenContract.decimals();
        uint256 estateId = estateTokenContract.tokenizeEstate(
            totalQuantity * unit,
            request.estate.zone,
            _requestId,
            request.estate.uri,
            request.estate.expireAt,
            request.requester,
            request.quote.broker
        );
        request.estate.estateId = estateId;

        address requester = request.requester;
        estateTokenContract.safeTransferFrom(
            address(this),
            request.requester,
            estateId,
            (request.quota.totalQuantity - soldQuantity) * unit,
            ""
        );

        address currency = request.quote.currency;
        uint256 value = soldQuantity * request.quote.unitPrice;
        uint256 feeAmount = soldQuantity * request.quote.feeDenomination;
        CurrencyHandler.sendCurrency(currency, requester, value - feeAmount);

        uint256 commissionAmount = soldQuantity * request.quote.commissionDenomination;
        address broker = request.quote.broker;
        CurrencyHandler.sendCurrency(currency,broker, commissionAmount);

        emit CommissionDispatch(
            broker,
            commissionAmount,
            currency
        );
        
        uint256 cashbackBaseAmount = _provideCashbackFund(request.quote.cashbackFundId);
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
            cashbackBaseAmount
        );

        return estateId;
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

    function withdrawDeposit(uint256 _requestId)
    external nonReentrant validRequest(_requestId) whenNotPaused returns (uint256) {
        EstateForgerRequest storage request = requests[_requestId];
        if (request.agenda.confirmAt != 0) {
            revert AlreadyConfirmed();
        }

        if (request.quota.totalQuantity != 0) {
            uint256 publicSaleEndsAt = request.agenda.publicSaleEndsAt;
            if (publicSaleEndsAt > block.timestamp) {
                revert StillSelling();
            }
            if (publicSaleEndsAt + EstateForgerConstant.SALE_CONFIRMATION_TIME_LIMIT > block.timestamp
                && request.quota.soldQuantity >= request.quota.minSellingQuantity) {
                revert InvalidWithdrawing();
            }
        }

        uint256 quantity = deposits[_requestId][msg.sender];
        if (quantity == 0) {
            revert NothingToWithdraw();
        }
        address currency = request.quote.currency;
        uint256 value = quantity * request.quote.unitPrice;

        deposits[_requestId][msg.sender] = 0;

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
            revert NotTokenized();
        }
        if (withdrawAt[_requestId][msg.sender] > 0) {
            revert AlreadyWithdrawn();
        }

        withdrawAt[_requestId][msg.sender] = block.timestamp;

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

        uint256 cashbackFundId = request.quote.cashbackFundId;
        if (cashbackFundId != 0) {
            if (quantity >= request.quote.cashbackThreshold) {
                IReserveVault(reserveVault).withdrawFund(cashbackFundId, msg.sender, quantity);
            }
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
        address _account,
        uint256 _tokenizationId,
        uint256 _at
    ) external view validRequest(_tokenizationId) returns (uint256) {
        if (_at > block.timestamp) {
            revert InvalidTimestamp();
        }
        if (requests[_tokenizationId].estate.estateId == 0) {
            revert NotTokenized();
        }
        uint256 withdrawAt = withdrawAt[_tokenizationId][_account];
        return _at >= requests[_tokenizationId].agenda.confirmAt && (withdrawAt == 0 || _at < withdrawAt)
            ? deposits[_tokenizationId][_account] * 10 ** IEstateToken(estateToken).decimals()
            : 0;
    }

    function _deposit(uint256 _requestId, uint256 _quantity)
    internal nonReentrant whenNotPaused returns (uint256) {
        EstateForgerRequest storage request = requests[_requestId];
        if (request.quota.totalQuantity == 0) {
            revert AlreadyCancelled();
        }
        if (request.agenda.confirmAt != 0) {
            revert AlreadyConfirmed();
        }
        if (request.agenda.saleStartsAt > block.timestamp
            || (request.agenda.privateSaleEndsAt > block.timestamp
                && !isWhitelisted[msg.sender]
                && !isWhitelistedFor[_requestId][msg.sender])
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

        uint256 oldDeposit = deposits[_requestId][msg.sender];
        uint256 newDeposit = oldDeposit + _quantity;
        deposits[_requestId][msg.sender] = newDeposit;

        uint256 cashbackFundId = request.quote.cashbackFundId;
        if (cashbackFundId != 0) {
            uint256 cashbackThreshold = request.quote.cashbackThreshold;

            if (oldDeposit >= cashbackThreshold) {
                IReserveVault(reserveVault).expandFund(
                    cashbackFundId,
                    _quantity
                );
            } else if (newDeposit >= cashbackThreshold) {
                IReserveVault(reserveVault).expandFund(
                    cashbackFundId,
                    newDeposit
                );
            }
        }

        emit Deposit(
            _requestId,
            msg.sender,
            _quantity,
            value
        );

        return value;
    }

    function _provideCashbackFund(uint256 _cashbackFundId) internal returns (uint256) {
        uint256 cashbackBaseAmount;
        if (_cashbackFundId != 0) {
            address reserveVaultAddress = reserveVault;
            Fund memory fund = IReserveVault(reserveVaultAddress).getFund(_cashbackFundId);

            uint256 totalNative;
            if (fund.quantity != 0) {
                for (uint256 i; i < fund.extraCurrencies.length; i++) {
                    if (fund.extraCurrencies[i] == address(0)) {
                        totalNative += fund.extraDenominations[i] * fund.quantity;
                    } else {
                        CurrencyHandler.receiveERC20(fund.extraCurrencies[i], fund.extraDenominations[i] * fund.quantity);
                        CurrencyHandler.allowERC20(fund.extraCurrencies[i], reserveVaultAddress, fund.extraDenominations[i] * fund.quantity);
                    }
                }

                CurrencyHandler.receiveNative(totalNative);

                if (fund.mainDenomination != 0) {
                    cashbackBaseAmount = fund.mainDenomination * fund.quantity;
                    if (fund.mainCurrency == address(0)) {
                        totalNative += cashbackBaseAmount;
                    } else {
                        CurrencyHandler.allowERC20(fund.mainCurrency, reserveVaultAddress, cashbackBaseAmount);
                    }
                }
            }

            IReserveVault(reserveVaultAddress).provideFund{value: totalNative}(_cashbackFundId);
        } else {
            CurrencyHandler.receiveNative(0);
        }
        return cashbackBaseAmount;
    }
}
