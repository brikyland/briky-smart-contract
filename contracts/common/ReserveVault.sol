// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

/// @openzeppelin/contracts-upgradeable/
import {ReentrancyGuardUpgradeable} from "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";

/// contracts/common/utilities/
import {CurrencyHandler} from "./utilities/CurrencyHandler.sol";

/// contracts/common/interfaces/
import {IAdmin} from "./interfaces/IAdmin.sol";

/// contracts/common/utilities/
import {Pausable} from "./utilities/Pausable.sol";

/// contracts/common/storages/
import {ReserveVaultStorage} from "./storages/ReserveVaultStorage.sol";

/**
 *  @author Briky Team
 *
 *  @notice Implementation of contract `ReserveVault`.
 *  @notice The `ReserveVault` contracts allows providers to open cryptocurrency reserve fund and withdraw them on demand.
 * 
 *  @dev    The fund is determined by a `quantity` value and denominations for each currency.
 *  @dev    Provision or withdrawal operations must specify a `quantity` to indicate equivalent values, calculated by
 *          multiplying with predefined denomination of each currency.
 *  @dev    The fund need to specify a main currency, other extras are optional.
 */
contract ReserveVault is
ReserveVaultStorage,
Pausable,
ReentrancyGuardUpgradeable {
    /** ===== CONSTANT ===== **/
    string constant private VERSION = "v1.2.1";


    /** ===== MODIFIER ===== **/
    /**
     *  @notice Verify a valid fund.
     *
     *          Name       ßDescription
     *  @param  _fundId    Fund identifier.
     */
    modifier validFund(
        uint256 _fundId
    ) {
        if (_fundId == 0 || _fundId > fundNumber) {
            revert InvalidFundId();
        }
        _;
    }

    /**
     *  @notice Verify the sender is the provider of a fund.
     *
     *          Name       Description
     *  @param  _fundId    Fund identifier.
     */
    modifier onlyProvider(
        uint256 _fundId
    ) {
        if (msg.sender != funds[_fundId].provider) {
            revert Unauthorized();
        }
        _;
    }


    /** ===== FUNCTION ===== **/
    /* --- Standard --- */
    /**
     *  @notice Executed on a call to the contract with empty calldata.
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
     *  @notice Invoked for initialization after deployment, serving as the contract constructor.
     *
     *          Name      Description
     *  @param  _admin    Admin` contract address.
     */
    function initialize(
        address _admin
    ) external
    initializer {
        /// Initializer
        __Pausable_init();
        __ReentrancyGuard_init();

        /// Dependency
        admin = _admin;
    }


    /* --- Administration --- */
    /**
     *  @notice Authorize or deauthorize addresses as providers.
     *
     *          Name           Description
     *  @param  _accounts      Array of EVM addresses.
     *  @param  _isProvider    Whether the operation is authorization or deauthorization.
     *  @param  _signatures    Array of admin signatures.
     * 
     *  @dev    Administrative configuration.
     */
    function authorizeProvider(
        address[] calldata _accounts,
        bool _isProvider,
        bytes[] calldata _signatures
    ) external {
        IAdmin(admin).verifyAdminSignatures(
            abi.encode(
                address(this),
                "authorizeProvider",
                _accounts,
                _isProvider
            ),
            _signatures
        );

        if (_isProvider) {
            for (uint256 i; i < _accounts.length; ++i) {
                if (isProvider[_accounts[i]]) {
                    revert AuthorizedAccount();
                }
                isProvider[_accounts[i]] = true;
                emit ProviderAuthorization(_accounts[i]);
            }
        } else {
            for (uint256 i; i < _accounts.length; ++i) {
                if (!isProvider[_accounts[i]]) {
                    revert NotAuthorizedAccount();
                }
                isProvider[_accounts[i]] = false;
                emit ProviderDeauthorization(_accounts[i]);
            }
        }
    }


    /* --- Query --- */
    /**
     *  @notice Get a fund.
     *
     *          Name       Description
     *  @param  _fundId    Fund identifier.
     * 
     *  @return Fund configuration and reserves.
     */
    function getFund(
        uint256 _fundId
    ) external view
    validFund(_fundId) returns (Fund memory) {
        return funds[_fundId];
    }

    /**
     *  @notice Check if a fund is sufficient.
     *
     *          Name       Description
     *  @param  _fundId    Fund identifier.
     *
     *  @return Whether the fund is provided sufficiently for the current quantity.
     */
    function isFundSufficient(
        uint256 _fundId
    ) external view
    validFund(_fundId) returns (bool) {
        return funds[_fundId].isSufficient;
    }


    /* --- Command --- */
    /**
     *  @notice Open a new fund.
     *
     *          Name                   Description
     *  @param  _mainCurrency          Main currency address.
     *  @param  _mainDenomination      Main currency denomination.
     *  @param  _extraCurrencies       Extra currency addresses.
     *  @param  _extraDenominations    Extra currency denominations.
     *
     *  @return New fund identifier.
     * 
     *  @dev    Permission: Providers.
     */
    function openFund(
        address _mainCurrency,
        uint256 _mainDenomination,
        address[] calldata _extraCurrencies,
        uint256[] calldata _extraDenominations
    ) external
    whenNotPaused
    returns (uint256) {
        if (!isProvider[msg.sender]) {
            revert Unauthorized();
        }

        if (_extraCurrencies.length != _extraDenominations.length) {
            revert InvalidInput();
        }

        uint256 fundId = ++fundNumber;
        Fund storage fund = funds[fundId];

        IAdmin adminContract = IAdmin(admin);
        if (!adminContract.isAvailableCurrency(_mainCurrency)) {
            revert InvalidCurrency();
        }
        fund.mainCurrency = _mainCurrency;
        fund.mainDenomination = _mainDenomination;

        for (uint256 i; i < _extraCurrencies.length; ++i) {
            if (!adminContract.isAvailableCurrency(_extraCurrencies[i])) {
                revert InvalidCurrency();
            }
            if (_extraDenominations[i] == 0) {
                revert InvalidDenomination();
            }
            fund.extraCurrencies.push(_extraCurrencies[i]);
            fund.extraDenominations.push(_extraDenominations[i]);
        }

        fund.provider = msg.sender;

        emit NewFund(
            fundId,
            msg.sender,
            _mainCurrency,
            _mainDenomination,
            _extraCurrencies,
            _extraDenominations
        );

        return fundId;
    }

    /**
     *  @notice Expand a fund.
     *
     *          Name                  Description
     *  @param  _fundId               Fund identifier.
     *  @param  _quantity             Expanded quantity.
     * 
     *  @dev    Permission: Provider of the fund.
     */
    function expandFund(
        uint256 _fundId,
        uint256 _quantity
    ) external
    whenNotPaused
    validFund(_fundId)
    onlyProvider(_fundId) {
        if (funds[_fundId].isSufficient) {
            revert AlreadyProvided();
        }

        funds[_fundId].quantity += _quantity;

        emit FundExpansion(_fundId, _quantity);
    }

    /**
     *  @notice Provide sufficiently to a fund.
     *
     *          Name                 Description
     *  @param  _fundId              Fund identifier.
     * 
     *  @dev    Permission: Provider of the fund.
     */
    function provideFund(
        uint256 _fundId
    ) external payable
    whenNotPaused
    nonReentrant
    validFund(_fundId)
    onlyProvider(_fundId) {
        Fund memory fund = funds[_fundId];
        if (fund.isSufficient == true) {
            revert AlreadyProvided();
        }

        uint256 totalNative;
        if (fund.quantity != 0) {
            if (fund.mainDenomination != 0) {
                if (fund.mainCurrency == address(0)) {
                    totalNative += fund.mainDenomination * fund.quantity;
                } else {
                    CurrencyHandler.receiveERC20(
                        fund.mainCurrency,
                        fund.mainDenomination * fund.quantity
                    );
                }
            }

            for (uint256 i; i < fund.extraCurrencies.length; ++i) {
                if (fund.extraCurrencies[i] == address(0)) {
                    totalNative += fund.extraDenominations[i] * fund.quantity;
                } else {
                    CurrencyHandler.receiveERC20(
                        fund.extraCurrencies[i],
                        fund.extraDenominations[i] * fund.quantity
                    );
                }
            }
        }

        CurrencyHandler.receiveNative(totalNative);

        funds[_fundId].isSufficient = true;

        emit FundProvision(_fundId);
    }

    /**
     *  @notice Withdraw from a fund.
     *
     *          Name                 Description
     *  @param  _fundId              Fund identifier.
     *  @param  _receiver            Receiver address.
     *  @param  _quantity            Withdrawn quantity.
     * 
     *  @dev    Permission: Provider of the fund.
     */
    function withdrawFund(
        uint256 _fundId,
        address _receiver,
        uint256 _quantity
    ) external
    whenNotPaused
    nonReentrant
    validFund(_fundId)
    onlyProvider(_fundId) {
        Fund memory fund = funds[_fundId];
        if (fund.isSufficient == false || _quantity > fund.quantity) {
            revert InsufficientFunds();
        }

        unchecked {
            funds[_fundId].quantity -= _quantity;
        }

        CurrencyHandler.sendCurrency(
            fund.mainCurrency,
            _receiver,
            fund.mainDenomination * _quantity
        );
        for (uint256 i; i < fund.extraCurrencies.length; ++i) {
            CurrencyHandler.sendCurrency(
                fund.extraCurrencies[i],
                _receiver,
                fund.extraDenominations[i] * _quantity
            );
        }

        emit FundWithdrawal(
            _fundId,
            _receiver,
            _quantity
        );
    }
}
