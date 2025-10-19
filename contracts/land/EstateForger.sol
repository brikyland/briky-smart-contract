// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

/// @openzeppelin/contracts-upgradeable/
import {IERC165Upgradeable} from "@openzeppelin/contracts-upgradeable/interfaces/IERC165Upgradeable.sol";
import {ReentrancyGuardUpgradeable} from "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
import {ERC165Upgradeable} from "@openzeppelin/contracts-upgradeable/utils/introspection/ERC165Upgradeable.sol";

/// contracts/common/interfaces/
import {IAdmin} from "../common/interfaces/IAdmin.sol";
import {IPriceWatcher} from "../common/interfaces/IPriceWatcher.sol";
import {IReserveVault} from "../common/interfaces/IReserveVault.sol";

/// contracts/common/constants/
import {CommonConstant} from "../common/constants/CommonConstant.sol";

/// contracts/common/utilities/
import {Administrable} from "../common/utilities/Administrable.sol";
import {CurrencyHandler} from "../common/utilities/CurrencyHandler.sol";
import {Formula} from "../common/utilities/Formula.sol";
import {Pausable} from "../common/utilities/Pausable.sol";
import {Validatable} from "../common/utilities/Validatable.sol";

/// contracts/land/constants/
import {EstateForgerConstant} from "./constants/EstateForgerConstant.sol";

/// contracts/land/interfaces/
import {ICommissionToken} from "./interfaces/ICommissionToken.sol";
import {IEstateToken} from "./interfaces/IEstateToken.sol";
import {IEstateForger} from "./interfaces/IEstateForger.sol";
import {IEstateTokenizer} from "./interfaces/IEstateTokenizer.sol";
import {IEstateTokenReceiver} from "./interfaces/IEstateTokenReceiver.sol";

/// contracts/land/storages/
import {EstateForgerStorage} from "./storages/EstateForgerStorage.sol";

/// contracts/land/utilities/
import {CommissionDispatchable} from "./utilities/CommissionDispatchable.sol";
import {EstateTokenReceiver} from "./utilities/EstateTokenReceiver.sol";

/**
 *  @author Briky Team
 *
 *  @notice The `EstateForger` contract facilitates the tokenization of real estate through community sales. Authorized
 *          custodians select estates and submit tokenization requests. During the sale period, accounts may deposit into these
 *          requests according to the sale configuration. If the deposits of a request reach the liquidation threshold before
 *          the sale concludes, the custodian is granted a limited time window to complete the required administrative
 *          procedures in compliance with local regulations. Tokenization is finalized only if the custodian fulfills these
 *          obligations within the allotted timeframe. In that case, the deposit is transferred to the custodian for
 *          settlement, and depositors may redeem their corresponding portion of a new class of estate token. Otherwise,
 *          depositors are entitled to withdraw their deposits, and the tokenization attempt is deemed unsuccessful.
 *
 *  @dev    Quantities are expressed in absolute units. Scale these values by `10 ** IAssetToken(estateToken).decimals()` to
 *          obtain the correct amounts under the `IAssetToken` convention.
 *  @dev    Implementation involves server-side support.
 *  @dev    ERC-20 tokens are identified by their contract addresses.
 *          Native coin is represented by the zero address (0x0000000000000000000000000000000000000000).

 */
contract EstateForger is
EstateForgerStorage,
ERC165Upgradeable,
CommissionDispatchable,
EstateTokenReceiver,
Administrable,
Pausable,
Validatable,
ReentrancyGuardUpgradeable {
    /** ===== LIBRARY ===== **/
    using Formula for uint256;


    /** ===== CONSTANT ===== **/
    string constant private VERSION = "v1.2.1";


    /** ===== MODIFIER ===== **/
    /**
     *  @notice Verify a valid request identifier.
     *
     *          Name        Description
     *  @param  _requestId  Request identifier.
     */
    modifier validRequest(
        uint256 _requestId
    ) {
        if (_requestId == 0 || _requestId > requestNumber) {
            revert InvalidRequestId();
        }
        _;
    }

    /**
     *  @notice Verify the message sender is active in the zone of the estate of the request.
     *
     *          Name        Description
     *  @param  _requestId  Request identifier.
     */
    modifier onlyActiveInZoneOf(
        uint256 _requestId
    ) {
        if (!IAdmin(admin).isActiveIn(requests[_requestId].estate.zone, msg.sender)) {
            revert Unauthorized();
        }
        _;
    }


    /** ===== FUNCTION ===== **/
    /* --- Common --- */
    /**
     *  @notice Executed on a call to this contract with empty calldata.
     */
    receive() external payable {}

    /**
     *  @return Version of implementation.
     */
    function version() external pure returns (string memory) {
        return VERSION;
    }


    /* --- Initialization --- */
    /**
     *  @notice Initialize the contract after deployment, serving as the constructor.
     *
     *          Name                Description
     *  @param  _admin              `Admin` contract address.
     *  @param  _estateToken        `EstateToken` contract address.
     *  @param  _commissionToken    `CommissionToken` contract address.
     *  @param  _priceWatcher       `PriceWatcher` contract address.
     *  @param  _feeReceiver        `FeeReceiver` contract address.
     *  @param  _reserveVault       `ReserveVault` contract address.
     *  @param  _validator          Validator address.
     *  @param  _baseMinUnitPrice   Minimum unit price denominated in USD.
     *  @param  _baseMaxUnitPrice   Maximum unit price denominated in USD.
     */
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
    ) external
    initializer {
        /// Initializer
        __CommissionDispatchable_init(_commissionToken);
        __Pausable_init();
        __Validatable_init(_validator);
        __ReentrancyGuard_init();

        /// Dependency
        admin = _admin;
        estateToken = _estateToken;
        priceWatcher = _priceWatcher;
        feeReceiver = _feeReceiver;
        reserveVault = _reserveVault;

        /// Configuration
        baseMinUnitPrice = _baseMinUnitPrice;
        baseMaxUnitPrice = _baseMaxUnitPrice;
        emit BaseUnitPriceRangeUpdate(
            _baseMinUnitPrice,
            _baseMaxUnitPrice
        );
    }


    /* --- Administration --- */
    /**
     *  @notice Update the acceptable range of unit price denominated in USD.
     *
     *          Name                Description
     *  @param  _baseMinUnitPrice   New minimum unit price denominated in USD.
     *  @param  _baseMaxUnitPrice   New maximum unit price denominated in USD.
     *  @param  _signatures         Array of admin signatures.
     * 
     *  @dev    Administrative operator.
     */
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

    /**
     *  @notice Whitelist or unwhitelist globally multiple addresses for private sales.
     *
     *          Name                Description
     *  @param  _accounts           Array of EVM addresses.
     *  @param  _isWhitelisted      Whether the operation is whitelisting or unwhitelisting.
     *  @param  _signatures         Array of admin signatures.
     * 
     *  @dev    Administrative operator.
     */
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


    /* --- Query --- */
    /**
     *          Name            Description
     *  @param  _requestId      Request identifier.
     *
     *  @return Configuration and progress of the request.
     *
     *  @dev    Phases of a request:
     *          - Pending: block.timestamp < agenda.saleStartsAt
     *          - Private Sale: agenda.saleStartsAt <= block.timestamp < agenda.privateSaleEndsAt
     *          - Public Sale: agenda.privateSaleEndsAt <= block.timestamp <= agenda.publicSaleEndsAt
     *          - Awaiting Confirmation: agenda.publicSaleEndsAt
     *                                      <= block.timestamp
     *                                      < agenda.publicSaleEndsAt + EstateForgerConstant.SALE_CONFIRMATION_TIME_LIMIT
     *          - Confirmed: estate.estateId > 0
     *          - Cancelled: quota.totalSupply = 0
     */
    function getRequest(
        uint256 _requestId
    ) external view
    validRequest(_requestId)
    returns (EstateForgerRequest memory) {
        return requests[_requestId];
    }

    /**
     *          Name            Description
     *  @param  _requestId      Request identifier.
     *
     *  @return Whether the request has been confirmed and tokenized.
     */
    function isTokenized(
        uint256 _requestId
    ) external view returns (bool) {
        return requests[_requestId].estate.estateId != 0;
    }

    /**
     *          Name            Description
     *  @param  _account        Account address.
     *  @param  _requestId      Request identifier.
     *  @param  _at             Reference timestamp.
     *
     *  @return Allocation of the account at the reference timestamp.
     */
    function allocationOfAt(
        address _account,
        uint256 _requestId,
        uint256 _at
    ) external view
    validRequest(_requestId)
    returns (uint256) {
        if (_at > block.timestamp) {
            revert InvalidTimestamp();
        }
        if (requests[_requestId].estate.estateId == 0) {
            revert NotTokenized();
        }
        uint256 withdrawAt = withdrawAt[_requestId][_account];
        /// @dev    Allocated tokens of the message sender only stays in this contract after the tokenization and before the
        ///         withdrawal.
        return _at >= requests[_requestId].agenda.confirmAt && (withdrawAt == 0 || _at < withdrawAt)
            ? deposits[_requestId][_account] * 10 ** IEstateToken(estateToken).decimals()
            : 0;
    }

    /**
     *          Name                Description
     *  @param  _interfaceId        Interface identifier.
     *
     *  @return Whether this contract supports the interface.
     */
    function supportsInterface(
        bytes4 _interfaceId
    ) public view virtual override(
        IERC165Upgradeable,
        ERC165Upgradeable
    ) returns (bool) {
        return _interfaceId == type(IEstateTokenizer).interfaceId
            || _interfaceId == type(IEstateTokenReceiver).interfaceId
            || super.supportsInterface(_interfaceId);
    }


    /* --- Command --- */
    /**
     *  @notice Request a new estate to be tokenized.
     *
     *          Name            Description
     *  @param  _requester      Requester address.
     *  @param  _estate         Initialization input for `EstateForgerRequestEstate` of the request.
     *  @param  _quota          Initialization input for `EstateForgerRequestQuota` of the request.
     *  @param  _quote          Initialization input for `EstateForgerRequestQuote` of the request.
     *  @param  _agenda         Initialization input for `EstateForgerRequestAgenda` of the request.
     *  @param  _validation     Validation package from the validator.
     *
     *  @return New request identifier.
     *
     *  @dev    Permission: Executives active in the zone of the estate.
     *  @dev    Total sale duration must be no less than `EstateForgerConstant.SALE_MINIMUM_DURATION`.
     */
    function requestTokenization(
        address _requester,
        EstateForgerRequestEstateInput calldata _estate,
        EstateForgerRequestQuotaInput calldata _quota,
        EstateForgerRequestQuoteInput calldata _quote,
        EstateForgerRequestAgendaInput calldata _agenda,
        Validation calldata _validation
    ) external
    whenNotPaused
    nonReentrant
    onlyExecutive
    returns (uint256) {
        _validate(
            abi.encode(
                _requester,
                _estate.uri
            ),
            _validation
        );

        if (!IAdmin(admin).isActiveIn(_estate.zone, msg.sender)) {
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
            || _quote.cashbackBaseRate > CommonConstant.RATE_MAX_SUBUNIT
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
            /// @dev    Open a cashback fund.
            cashbackFundId = IReserveVault(reserveVault).openFund(
                _quote.currency,
                (_quote.feeDenomination - commissionDenomination)
                    .scale(_quote.cashbackBaseRate, CommonConstant.RATE_MAX_SUBUNIT),
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

    /**
     *  @notice Whitelist or unwhitelist accounts for participation in the private sale of a specific request.
     *  @notice Whitelist only before the private sale ends.
     *
     *          Name            Description
     *  @param  _requestId      Request identifier.
     *  @param  _accounts       Array of EVM addresses.
     *  @param  _isWhitelisted  Whether the operation is whitelisting or unwhitelisting.
     *
     *  @dev    Permission: Executives active in the zone of the estate.
     */
    function whitelistFor(
        uint256 _requestId,
        address[] calldata _accounts,
        bool _isWhitelisted
    ) external
    whenNotPaused
    validRequest(_requestId)
    onlyExecutive
    onlyActiveInZoneOf(_requestId) {
        if (block.timestamp >= requests[_requestId].agenda.privateSaleEndsAt) {
            revert InvalidWhitelisting();
        }

        if (_isWhitelisted) {
            for (uint256 i; i < _accounts.length; ++i) {
                if (isWhitelistedFor[_requestId][_accounts[i]]) {
                    revert WhitelistedAccount();
                }
                isWhitelistedFor[_requestId][_accounts[i]] = true;
                emit RequestWhitelist(
                    _requestId,
                    _accounts[i]
                );
            }
        } else {
            for (uint256 i; i < _accounts.length; ++i) {
                if (!isWhitelistedFor[_requestId][_accounts[i]]) {
                    revert NotWhitelistedAccount();
                }
                isWhitelistedFor[_requestId][_accounts[i]] = false;
                emit RequestUnwhitelist(
                    _requestId,
                    _accounts[i]
                );
            }
        }
    }

    /**
     *  @notice Update the URI of estate metadata of a request.
     *  @notice Update only before the request is either confirmed or cancelled.
     *
     *          Name            Description
     *  @param  _requestId      Request identifier.
     *  @param  _uri            New URI of estate metadata.
     *  @param  _validation     Validation package from the validator.
     *
     *  @dev    Permission: Executives active in the zone of the estate.
     */
    function updateRequestEstateURI(
        uint256 _requestId,
        string calldata _uri,
        Validation calldata _validation
    ) external
    whenNotPaused
    validRequest(_requestId)
    onlyExecutive
    onlyActiveInZoneOf(_requestId) {
        _validate(
            abi.encode(
                _requestId,
                _uri
            ),
            _validation
        );

        if (requests[_requestId].agenda.confirmAt != 0) {
            revert AlreadyConfirmed();
        }
        if (requests[_requestId].quota.totalQuantity == 0) {
            revert AlreadyCancelled();
        }

        requests[_requestId].estate.uri = _uri;

        emit RequestEstateURIUpdate(
            _requestId,
            _uri
        );
    }

    /**
     *  @notice Update the agenda of a request.
     *  @notice Update only before any account deposits.
     *
     *          Name            Description
     *  @param  _requestId      Request identifier.
     *  @param  _agenda         Initialization input for `EstateForgerRequestAgenda`.
     *
     *  @dev    Permission: Executives active in the zone of the estate.
     *  @dev    Total sale duration must be no less than `EstateForgerConstant.SALE_MINIMUM_DURATION`.
     *  @dev    Can only update `saleStartsAt` before the sale actually starts. If its corresponding input is 0, the timestamp
     *          remains unchanged.
     */
    function updateRequestAgenda(
        uint256 _requestId,
        EstateForgerRequestAgendaInput calldata _agenda
    ) external
    whenNotPaused
    validRequest(_requestId)
    onlyExecutive
    onlyActiveInZoneOf(_requestId) {
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

        emit RequestAgendaUpdate(
            _requestId,
            _agenda
        );
    }

    /**
     *  @notice Cancel a request.
     *  @notice Cancel only before the request is either confirmed or cancelled.
     *
     *          Name            Description
     *  @param  _requestId      Request identifier.
     *
     *  @dev    Permission: Managers active in the zone of the estate.
     */
    function cancel(
        uint256 _requestId
    ) external
    whenNotPaused
    validRequest(_requestId)
    onlyManager
    onlyActiveInZoneOf(_requestId) {
        EstateForgerRequest storage request = requests[_requestId];
        if (request.quota.totalQuantity == 0) {
            revert AlreadyCancelled();
        }
        if (request.agenda.confirmAt != 0) {
            revert AlreadyConfirmed();
        }

        /// @dev    Cancelled request: quota.totalQuantity = 0.
        request.quota.totalQuantity = 0;
        emit RequestCancellation(_requestId);
    }

    /**
     *  @notice Deposit to purchase tokens in a request.
     *  @notice Deposit only during sale period. Only accounts whitelisted globally or specifically for the request can deposit during the private sale.
     *
     *          Name            Description
     *  @param  _requestId      Request identifier.
     *  @param  _quantity       Deposited quantity.
     *
     *  @return Deposited value.
     */
    function deposit(
        uint256 _requestId,
        uint256 _quantity
    ) external payable
    whenNotPaused
    validRequest(_requestId)
    returns (uint256) {
        return _deposit(_requestId, _quantity);
    }

    /**
     *  @notice Deposit to a request.
     *  @notice Deposit only during sale period. Only accounts whitelisted globally or specifically for the request can deposit during the private sale.
     *
     *          Name            Description
     *  @param  _requestId      Request identifier.
     *  @param  _quantity       Deposited quantity.
     *  @param  _anchor         Keccak256 hash of `estate.uri` of the request.
     *
     *  @return Deposited value.
     *
     *  @dev    Anchor enforces consistency between this contract and the client-side.
     */
    function safeDeposit(
        uint256 _requestId,
        uint256 _quantity,
        bytes32 _anchor
    ) external payable
    whenNotPaused
    validRequest(_requestId)
    returns (uint256) {
        if (_anchor != keccak256(bytes(requests[_requestId].estate.uri))) {
            revert BadAnchor();
        }

        return _deposit(_requestId, _quantity);
    }


    /**
     *  @notice Confirm a request to be tokenized.
     *  @notice Confirm only if the request has sold at least minimum quantity (even if the sale period has not yet ended) and
     *          before the confirmation time limit has expired.
     *  @notice The message sender must provide sufficient extra-currency amounts for the cashback fund.
     *
     *          Name            Description
     *  @param  _requestId      Request identifier.
     *  @param  _anchor         Keccak256 hash of `estate.uri` of the request.
     *
     *  @return New estate token identifier.
     *
     *  @dev    Permission: Managers active in the zone of the estate.
     */
    function safeConfirm(
        uint256 _requestId,
        bytes32 _anchor
    ) external payable
    whenNotPaused
    nonReentrant
    validRequest(_requestId)
    onlyManager
    onlyActiveInZoneOf(_requestId) returns (uint256) {
        EstateForgerRequest storage request = requests[_requestId];
        if (_anchor != keccak256(bytes(request.estate.uri))) {
            revert BadAnchor();
        }

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

        /// @dev    If confirming before the anticipated due, `privateSaleEndsAt` and `publicSaleEndsAt` must be overwritten
        ///         with the current timestamp.
        if (request.agenda.privateSaleEndsAt > block.timestamp) {
            request.agenda.privateSaleEndsAt = uint40(block.timestamp);
        }
        if (publicSaleEndsAt > block.timestamp) {
            request.agenda.publicSaleEndsAt = uint40(block.timestamp);
        }
        /// @dev    Confirmed request:  agenda.confirmAt > 0
        request.agenda.confirmAt = uint40(block.timestamp);

        IEstateToken estateTokenContract = IEstateToken(estateToken);
        /// @dev    Scale with token decimals.
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

        /// @dev    Transfer remain tokens to the requester.
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
        uint256 fee = soldQuantity * request.quote.feeDenomination;
        /// @dev    Transfer total deposit minus fee to the requester.
        CurrencyHandler.sendCurrency(
            currency,
            requester,
            value - fee
        );

        uint256 commission = soldQuantity * request.quote.commissionDenomination;
        address broker = request.quote.broker;
        /// @dev    Transfer commission derived from the tokenization fee to the associated broker.
        CurrencyHandler.sendCurrency(
            currency,
            broker,
            commission
        );

        emit CommissionDispatch(
            broker,
            commission,
            currency
        );

        /// @dev    Provide the cashback fund sufficiently.
        uint256 cashbackBaseAmount = _provideCashbackFund(request.quote.cashbackFundId);

        CurrencyHandler.sendCurrency(
            currency,
            feeReceiver,
            fee - commission - cashbackBaseAmount
        );

        emit RequestConfirmation(
            _requestId,
            estateId,
            soldQuantity,
            value,
            fee,
            cashbackBaseAmount
        );

        return estateId;
    }


    /**
     *  @notice Withdraw the deposit of the message sender from a request which can no longer be confirmed.
     *  @notice Withdraw only if the request is cancelled or the sale ends without enough sold quantity or the confirmation
     *          time limit has expired.
     *
     *          Name            Description
     *  @param  _requestId      Request identifier.
     *
     *  @return Withdrawn value.
     */
    function withdrawDeposit(
        uint256 _requestId
    ) external
    whenNotPaused
    nonReentrant
    validRequest(_requestId)
    returns (uint256) {
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

        CurrencyHandler.sendCurrency(
            currency,
            msg.sender,
            value
        );

        emit DepositWithdrawal(
            _requestId,
            msg.sender,
            quantity,
            value
        );

        return value;
    }

    /**
     *  @notice Withdraw the allocation of the message sender from a tokenization.
     *  @notice Withdraw only after the request is confirmed.
     *  @notice Also receive corresponding cashback.
     *
     *          Name            Description
     *  @param  _requestId      Request identifier.
     *
     *  @return Withdrawn amount.
     */
    function withdrawEstateToken(
        uint256 _requestId
    ) external
    whenNotPaused
    nonReentrant
    validRequest(_requestId)
    returns (uint256) {
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

        /// @dev    Receive cashback.
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


    /* --- Helper --- */
    /**
     *  @notice Deposit to a request.
     *
     *          Name            Description
     *  @param  _requestId      Request identifier.
     *  @param  _quantity       Deposited quantity.
     *
     *  @return Deposited value.
     */
    function _deposit(
        uint256 _requestId,
        uint256 _quantity
    ) internal
    nonReentrant
    returns (uint256) {
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
        CurrencyHandler.receiveCurrency(
            request.quote.currency,
            value
        );

        uint256 oldDeposit = deposits[_requestId][msg.sender];
        uint256 newDeposit = oldDeposit + _quantity;
        deposits[_requestId][msg.sender] = newDeposit;

        uint256 cashbackFundId = request.quote.cashbackFundId;
        if (cashbackFundId != 0) {
            uint256 cashbackThreshold = request.quote.cashbackThreshold;

            /// @dev    Expand the cashback fund if deposited quantity of the message sender meets the cashback threshold.
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

    /**
     *  @notice Provide cashback fund in the main currency, using a sufficient portion of the tokenization fee and in other
     *          extras, using amounts forwarded from the message sender.
     *
     *          Name                Description
     *  @param  _cashbackFundId     Cashback fund identifier.
     *
     *  @return Main currency cashback value.
     */
    function _provideCashbackFund(
        uint256 _cashbackFundId
    ) internal returns (uint256) {
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
                        CurrencyHandler.receiveERC20(
                            fund.extraCurrencies[i],
                            fund.extraDenominations[i] * fund.quantity
                        );
                        CurrencyHandler.allowERC20(
                            fund.extraCurrencies[i],
                            reserveVaultAddress,
                            fund.extraDenominations[i] * fund.quantity
                        );
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
