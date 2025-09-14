// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

/// contracts/common/interfaces/
import {IValidatable} from "../../common/interfaces/IValidatable.sol";

/// contracts/common/structs/
import {IFund} from "../../common/structs/IFund.sol";
import {IRate} from "../../common/structs/IRate.sol";

/// contracts/land/structs/
import {IEstateForgerRequest} from "../structs/IEstateForgerRequest.sol";

/// contracts/land/interfaces/
import {ICommissionDispatchable} from "./ICommissionDispatchable.sol";
import {IEstateTokenizer} from "./IEstateTokenizer.sol";

/**
 *  @author Briky Team
 *
 *  @notice Interface for contract `EstateForger`.
 * 
 *  @notice TODO:
 */
interface IEstateForger is
IEstateForgerRequest,
IFund,
IRate,
ICommissionDispatchable,
IValidatable,
IEstateTokenizer {
    /** ===== EVENT ===== **/
    /**
     *  @notice Emitted when the acceptable range of unit price denominated in USD is updated.
     *
     *          Name                Description
     *  @param  baseMinUnitPrice    New minimum unit price denominated in USD.
     *  @param  baseMaxUnitPrice    New maximum unit price denominated in USD.
     */
    event BaseUnitPriceRangeUpdate(
        uint256 baseMinUnitPrice,
        uint256 baseMaxUnitPrice
    );

    /**
     *  @notice Emitted when an account is whitelisted to participate in the private sale.
     *
     *          Name       Description
     *  @param  account    Whitelisted account address.
     */
    event Whitelist(
        address indexed account
    );

    /**
     *  @notice Emitted when an account is unwhitelisted to participate in the private sale.
     *
     *          Name       Description
     *  @param  account    Unwhitelisted account address.
     */
    event Unwhitelist(
        address indexed account
    );

    /**
     *  @notice Emitted when a tokenization request is created.
     *
     *          Name                Description
     *  @param  requestId           Request identifier.
     *  @param  cashbackFundId      Cashback fund identifier.
     *  @param  seller              Seller address.
     *  @param  estate              Initialization input for `EstateForgerRequestEstate`.
     *  @param  quota               Initialization input for `EstateForgerRequestQuota`.
     *  @param  quote               Initialization input for `EstateForgerRequestQuote`.
     *  @param  agenda              Initialization input for `EstateForgerRequestAgenda`.
     */
    event NewRequest(
        uint256 indexed requestId,
        uint256 indexed cashbackFundId,
        address indexed seller,
        EstateForgerRequestEstateInput estate,
        EstateForgerRequestQuotaInput quota,
        EstateForgerRequestQuoteInput quote,
        EstateForgerRequestAgendaInput agenda
    );

    /**
     *  @notice Emitted when an account is whitelisted to participate in the private sale of a specific request.
     *
     *          Name                Description
     *  @param  requestId           Request identifier.
     *  @param  account             Whitelisted account address.
     */
    event RequestWhitelist(
        uint256 indexed requestId,
        address indexed account
    );

    /**
     *  @notice Emitted when an account is unwhitelisted to participate in the private sale of a specific request.
     *
     *          Name               Description
     *  @param  requestId          Request identifier.
     *  @param  account            Unwhitelisted account address.
     */
    event RequestUnwhitelist(
        uint256 indexed requestId,
        address indexed account
    );

    /**
     *  @notice Emitted when a request is cancelled.
     *
     *          Name               Description
     *  @param  requestId          Request identifier.
     */
    event RequestCancellation(uint256 indexed requestId);

    /**
     *  @notice Emitted when a request is confirmed.
     *
     *          Name               Description
     *  @param  requestId          Request identifier.
     *  @param  estateId           Estate identifier.
     *  @param  soldQuantity       Sold quantity.
     *  @param  value              Value.
     *  @param  fee                Fee.
     *  @param  cashbackBaseAmount Cashback base amount.
     */
    event RequestConfirmation(
        uint256 indexed requestId,
        uint256 indexed estateId,
        uint256 soldQuantity,
        uint256 value,
        uint256 fee,
        uint256 cashbackBaseAmount
    );


    /**
     *  @notice Emitted when the agenda of a request is updated.
     *
     *          Name               Description
     *  @param  requestId          Request identifier.
     *  @param  agenda             Initialization input for `EstateForgerRequestAgenda`.
     */
    event RequestAgendaUpdate(
        uint256 indexed requestId,
        EstateForgerRequestAgendaInput agenda
    );

    /**
     *  @notice Emitted when the URI of a request is updated.
     *
     *          Name               Description
     *  @param  requestId          Request identifier.
     *  @param  uri                URI.
     */
    event RequestURIUpdate(
        uint256 indexed requestId,
        string uri
    );

    /**
     *  @notice Emitted when a deposition to buy tokens is made.
     *
     *          Name               Description
     *  @param  requestId          Request identifier.
     *  @param  depositor          Depositor address.
     *  @param  quantity           Number of tokens purchased.
     *  @param  value              Sale value.
     */
    event Deposit(
        uint256 indexed requestId,
        address indexed depositor,
        uint256 quantity,
        uint256 value
    );

    /**
     *  @notice Emitted when the sale value of a deposition is withdrawn.
     *
     *          Name               Description
     *  @param  requestId          Request identifier.
     *  @param  depositor          Depositor address.
     *  @param  quantity           Number of tokens purchased.
     *  @param  value              Sale value.
     */
    event DepositWithdrawal(
        uint256 indexed requestId,
        address indexed depositor,
        uint256 quantity,
        uint256 value
    );


    /** ===== ERROR ===== **/
    error AlreadyCancelled();
    error AlreadyConfirmed();
    error AlreadyHadDeposit();
    error AlreadyWithdrawn();
    error InvalidBroker();
    error InvalidConfirming();
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


    /** ===== FUNCTION ===== **/
    /* --- Dependency --- */
    /**
     *          Name            Description
     *  @return feeReceiver     Fee receiver contract address.
     */
    function feeReceiver() external view returns (address feeReceiver);

    /**
     *          Name            Description
     *  @return priceWatcher    Price watcher contract address.
     */
    function priceWatcher() external view returns (address priceWatcher);

    /**
     *          Name            Description
     *  @return reserveVault    Reserve vault contract address.
     */
    function reserveVault() external view returns (address reserveVault);

    /* --- Query --- */
    /**
     *          Name                Description
     *  @return baseMinUnitPrice    Minimum unit price denominated in USD.
     */
    function baseMinUnitPrice() external view returns (uint256 baseMinUnitPrice);

    /**
     *          Name                Description
     *  @return baseMaxUnitPrice    Maximum unit price denominated in USD.
     */
    function baseMaxUnitPrice() external view returns (uint256 baseMaxUnitPrice);


    /**
     *          Name             Description
     *  @return requestNumber    Number of requests.
     */
    function requestNumber() external view returns (uint256 requestNumber);

    /**
     *          Name             Description
     *  @param  requestId        Request identifier.
     *  @param  depositor        Depositor address.
     * 
     *  @return deposit          Total deposited value.
     */
    function deposits(
        uint256 requestId,
        address depositor
    ) external view returns (uint256 deposit);

    /**
     *          Name             Description
     *  @param  requestId        Request identifier.
     *  @param  account          Account address.
     * 
     *  @return withdrawAt       Withdrawal timestamp.
     */
    function withdrawAt(
        uint256 requestId,
        address account
    ) external view returns (uint256 withdrawAt);

    /**
     *          Name             Description
     *  @return request          Information of the request.
     */
    function getRequest(
        uint256 requestId
    ) external view returns (EstateForgerRequest memory request);


    /* --- Command --- */
    /**
     *  @notice TODO: Request tokenization.
     * 
     *          Name             Description
     *  @param  requester        Requester address.
     *  @param  estate           Initialization input for `EstateForgerRequestEstate`.
     *  @param  quota            Initialization input for `EstateForgerRequestQuota`.
     *  @param  quote            Initialization input for `EstateForgerRequestQuote`.
     *  @param  agenda           Initialization input for `EstateForgerRequestAgenda`.
     *  @param  validation       Validation package from the validator.
     * 
     *  @return requestId        New request identifier.
     */
    function requestTokenization(
        address requester,
        EstateForgerRequestEstateInput calldata estate,
        EstateForgerRequestQuotaInput calldata quota,
        EstateForgerRequestQuoteInput calldata quote,
        EstateForgerRequestAgendaInput calldata agenda,
        Validation calldata validation
    ) external returns (uint256 requestId);

    /**
     *  @notice TODO: Cancel a tokenization request.
     * 
     *          Name             Description
     *  @param  requestId        Request identifier.
     */
    function cancel(
        uint256 requestId
    ) external;

    /**
     *  @notice TODO: Confirm a tokenization request.
     * 
     *          Name             Description
     *  @param  requestId        Request identifier.
     * 
     *  @return estateId         New estate identifier.
     */
    function confirm(
        uint256 requestId
    ) external payable returns (uint256 estateId);

    /**
     *  @notice TODO: Deposit to buy tokens.
     * 
     *          Name             Description
     *  @param  requestId        Request identifier.
     *  @param  quantity         Number of tokens purchased.
     * 
     *  @return value            Sale value.
     */
    function deposit(
        uint256 requestId,
        uint256 quantity
    ) external payable returns (uint256 value);

    /**
     *  @notice Update the metadata URI of a tokenization request.
     * 
     *          Name             Description
     *  @param  requestId        Request identifier.
     *  @param  uri              Metadata URI.
     *  @param  validation       Validation package from the validator.
     * 
     *  @dev    TODO:
     */
    function updateRequestURI(
        uint256 requestId,
        string calldata uri,
        Validation calldata validation
    ) external;

    /**
     *  @notice Update the agenda of a tokenization request.
     * 
     *          Name             Description
     *  @param  requestId        Request identifier.
     *  @param  agenda           Initialization input for `EstateForgerRequestAgenda`.
     */
    function updateRequestAgenda(
        uint256 requestId,
        EstateForgerRequestAgendaInput calldata agenda
    ) external;

    /**
     *  @notice Withdraw all deposited value of a tokenization request.
     * 
     *          Name             Description
     *  @param  requestId        Request identifier.
     * 
     *  @return value            Sale value.
     */
    function withdrawDeposit(
        uint256 requestId
    ) external returns (uint256 value);

    /**
     *  @notice Whitelist accounts for a tokenization request.
     * 
     *          Name             Description
     *  @param  requestId        Request identifier.
     *  @param  accounts         Accounts to whitelist.
     *  @param  isWhitelisted    Whether to whitelist the accounts.
     */
    function whitelistFor(
        uint256 requestId,
        address[] calldata accounts,
        bool isWhitelisted
    ) external;


    /* --- Safeguard --- */
    /**
     *  @notice TODO: Safe deposit to buy tokens.
     * 
     *          Name             Description
     *  @param  requestId        Request identifier.
     *  @param  quantity         Number of tokens purchased.
     *  @param  anchor           `estate.uri` of the request.
     * 
     *  @return value            Sale value.
     * 
     *  @dev    Anchor enforces consistency between the contract and the client-side.
     */
    function safeDeposit(
        uint256 requestId,
        uint256 quantity,
        bytes32 anchor
    ) external payable returns (uint256 value);
}
