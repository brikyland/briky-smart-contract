// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

/// contracts/common/structs/
import {IFund} from "../structs/IFund.sol";

/// contracts/common/interfaces/
import {ICommon} from "./ICommon.sol";

/**
 *  @author Briky Team
 *
 *  @notice Interface for contract `ReserveVault`.
 *  @notice The `ReserveVault` contracts allows providers to open cryptocurrency reserve fund and withdraw them on demand.
 *
 *  @dev    The fund is determined by a `quantity` value and denominations for each currency.
 *  @dev    Provision or withdrawal operations must specify a `quantity` to indicate equivalent values, calculated by
 *          multiplying with predefined denomination of each currency.
 *  @dev    The fund need to specify a main currency, other extras are optional.
 */
interface IReserveVault is
IFund,
ICommon {
    /** ===== EVENT ===== **/
    /* --- Provider --- */
    /**
     *  @notice Emitted when an account is authorized as a provider.
     *
     *          Name        Description
     *  @param  account     Authorized address.
     */
    event ProviderAuthorization(
        address indexed account
    );

    /**
     *  @notice Emitted when a provider is deauthorized.
     *
     *          Name        Description
     *  @param  account     Deauthorized address.
     */
    event ProviderDeauthorization(
        address indexed account
    );


    /* --- Fund --- */
    /**
     *  @notice Emitted when a new fund is opened.
     *
     *          Name                Description
     *  @param  fundId              Fund identifier.
     *  @param  provider            Provider address.
     *  @param  mainCurrency        Main currency address.
     *  @param  mainDenomination    Main currency denomination.
     *  @param  extraCurrencies     Array of extra currency addresses.
     *  @param  extraDenominations  Array of extra currency denominations, respective to each extra currency.
     */
    event NewFund(
        uint256 indexed fundId,
        address indexed provider,
        address mainCurrency,
        uint256 mainDenomination,
        address[] extraCurrencies,
        uint256[] extraDenominations
    );


    /**
     *  @notice Emitted when a fund is expanded.
     *
     *          Name                Description
     *  @param  fundId              Fund identifier.
     *  @param  quantity            Expanded quantity.
     */
    event FundExpansion(
        uint256 indexed fundId,
        uint256 quantity
    );

    /**
     *  @notice Emitted when a fund is fully provided.
     *
     *          Name                Description
     *  @param  fundId              Fund identifier.
     */
    event FundProvision(
        uint256 indexed fundId
    );

    /**
     *  @notice Emitted when value is withdrawn from a fund.
     *
     *          Name                Description
     *  @param  fundId              Fund identifier.
     *  @param  receiver            Receiver address.
     *  @param  quantity            Withdrawn quantity.
     */
    event FundWithdrawal(
        uint256 indexed fundId,
        address indexed receiver,
        uint256 quantity
    );


    /** ===== ERROR ===== **/
    error AlreadyProvided();
    error InvalidDenomination();
    error InvalidExpanding();
    error InvalidFundId();


    /** ===== FUNCTION ===== **/
    /* --- Configuration --- */
    /**
     *          Name        Description
     *  @param  account     EVM address.
     *  @return isProvider  Whether the account is an authorized provider.
     */
    function isProvider(
        address account
    ) external view returns (bool isProvider);


    /* --- Query --- */
    /**
     *          Name        Description
     *  @return fundNumber  Number of funds.
     */
    function fundNumber() external view returns (uint256 fundNumber);


    /**
     *          Name            Description
     *  @param  fundId          Fund identifier.
     *  @return fund            Configuration and reserves of the fund.
     */
    function getFund(
        uint256 fundId
    ) external view returns (Fund memory fund);

    /**
     *          Name            Description
     *  @param  fundId          Fund identifier.
     *  @return isSufficient    Whether the fund is provided sufficiently for the current quantity.
     */
    function isFundSufficient(
        uint256 fundId
    ) external view returns (bool isSufficient);


    /* --- Command --- */
    /**
     *  @notice Open a new fund.
     *
     *          Name                Description
     *  @param  mainCurrency        Main currency address.
     *  @param  mainDenomination    Main currency denomination.
     *  @param  extraCurrencies     Array of extra currency addresses.
     *  @param  extraDenominations  Array of extra currency denominations, respective to each extra currency.
     * 
     *  @return fundId              New fund identifier.
     *
     *  @dev    Permission: Providers.
     */
    function openFund(
        address mainCurrency,
        uint256 mainDenomination,
        address[] calldata extraCurrencies,
        uint256[] calldata extraDenominations
    ) external returns (uint256 fundId);

    /**
     *  @notice Expand a fund.
     *
     *          Name                Description
     *  @param  fundId              Fund identifier.
     *  @param  quantity            Expanded quantity.
     *
     *  @dev    Permission: Provider of the fund.
     */
    function expandFund(
        uint256 fundId,
        uint256 quantity
    ) external;

    /**
     *  @notice Provide sufficiently to a fund.
     *
     *          Name                Description
     *  @param  fundId              Fund identifier.
     *
     *  @dev    Permission: Provider of the fund.
     */
    function provideFund(
        uint256 fundId
    ) external payable;
    /**
     *  @notice Withdraw value from a fund to an account.
     *
     *          Name                Description
     *  @param  fundId              Fund identifier.
     *  @param  receiver            Receiver address.
     *  @param  quantity            Withdrawn quantity.
     *
     *  @dev    Permission: Provider of the fund.
     */
    function withdrawFund(
        uint256 fundId,
        address receiver,
        uint256 quantity
    ) external;
}
