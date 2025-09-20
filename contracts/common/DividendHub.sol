// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

/// @openzeppelin/contracts-upgradeable/
import {ReentrancyGuardUpgradeable} from "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";

/// contracts/common/interfaces/
import {IGovernor} from "./interfaces/IGovernor.sol";

/// contracts/common/storages/
import {DividendHubStorage} from "./storages/DividendHubStorage.sol";

/// contracts/common/utilities/
import {Administrable} from "./utilities/Administrable.sol";
import {CurrencyHandler} from "./utilities/CurrencyHandler.sol";
import {Formula} from "./utilities/Formula.sol";
import {Pausable} from "./utilities/Pausable.sol";


/**
 *  @author Briky Team
 *
 *  @notice The `DividendHub` contract collects incomes associated to assets from governor contracts and distribute them
 *          among asset holders.
 * 
 *  @dev    ERC-20 tokens are identified by their contract addresses.
 *          Native coin is represented by the zero address (0x0000000000000000000000000000000000000000).
 */
contract DividendHub is
DividendHubStorage,
Administrable,
Pausable,
ReentrancyGuardUpgradeable {
    /** ===== LIBRARY ===== **/
    using Formula for uint256;


    /** ===== CONSTANT ===== **/
    string constant private VERSION = "v1.2.1";


    /** ===== MODIFIER ===== **/
    /**
     *  @notice Verify a valid dividend identifier.
     *
     *          Name            Description
     *  @param  _dividendId     Dividend identifier.
     */
    modifier validDividend(
        uint256 _dividendId
    ) {
        if (_dividendId == 0 || _dividendId > dividendNumber) {
            revert InvalidDividendId();
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
     *          Name            Description
     *  @param  _admin          `Admin` contract address.
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


    /* --- Query --- */
    /**
     *          Name            Description
     *  @param  _dividendId     Dividend identifier.
     * 
     *  @return Configuration and progress of the dividend package.
     */
    function getDividend(
        uint256 _dividendId
    ) external view
    validDividend(_dividendId)
    returns (Dividend memory) {
        return dividends[_dividendId];
    }


    /* --- Command --- */
    /**
     *  @notice Issue a new dividend package for an asset from a governor contract.
     *
     *          Name        Description
     *  @param  _governor   Governor contract address.
     *  @param  _tokenId    Asset identifier from the governor contract.
     *  @param  _value      Total dividend value.
     *  @param  _currency   Dividend currency address.
     *  @param  _note       Issuance note.
     *  @return dividendId  New dividend identifier.
     */
    function issueDividend(
        address _governor,
        uint256 _tokenId,
        uint256 _value,
        address _currency,
        string calldata _note
    ) external payable
    whenNotPaused
    nonReentrant
    onlyAvailableCurrency(_currency)
    validGovernor(_governor)
    returns (uint256) {
        if (!IGovernor(_governor).isAvailable(_tokenId)) {
            revert InvalidTokenId();
        }

        if (_value == 0) {
            revert InvalidInput();
        }

        CurrencyHandler.receiveCurrency(
            _currency,
            _value
        );

        uint256 totalWeight = IGovernor(_governor).totalEquityAt(_tokenId, block.timestamp);

        uint256 dividendId = ++dividendNumber;
        dividends[dividendId] = Dividend(
            _tokenId,
            totalWeight,
            _value,
            _currency,
            uint40(block.timestamp),
            _governor
        );

        emit NewDividend(
            _governor,
            _tokenId,
            msg.sender,
            totalWeight,
            _value,
            _currency,
            _note
        );

        return dividendId;
    }


    /**
     *  @notice Withdraw entitled portions of the message sender from multiple dividend packages.
     *
     *          Name            Description
     *  @param  _dividendIds    Array of dividend identifiers to withdraw.
     */
    function withdraw(
        uint256[] calldata _dividendIds
    ) external
    whenNotPaused 
    nonReentrant {
        for (uint256 i; i < _dividendIds.length; ++i) {
            if (_dividendIds[i] == 0 || _dividendIds[i] > dividendNumber) {
                revert InvalidDividendId();
            }
            if (withdrawAt[_dividendIds[i]][msg.sender] > 0) {
                revert AlreadyWithdrawn();
            }

            Dividend storage dividend = dividends[_dividendIds[i]];

            uint256 weight = IGovernor(dividend.governor).equityOfAt(
                msg.sender,
                dividend.tokenId,
                dividend.at
            );
            uint256 remainWeight = dividend.remainWeight;

            if (weight == 0) {
                revert InvalidWithdrawing();
            }

            if (weight > remainWeight) {
                revert InsufficientFunds();
            }

            uint256 value = dividend.remainValue.scale(weight, dividend.remainWeight);

            dividend.remainWeight -= weight;
            dividend.remainValue -= value;
            withdrawAt[_dividendIds[i]][msg.sender] = block.timestamp;

            CurrencyHandler.sendCurrency(
                dividend.currency,
                msg.sender,
                value
            );

            emit Withdrawal(
                _dividendIds[i],
                msg.sender,
                value
            );
        }
    }
}
