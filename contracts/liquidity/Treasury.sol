// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

/// @openzeppelin/contracts-upgradeable/
import {ReentrancyGuardUpgradeable} from "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";

/// contracts/common/constants/
import {CommonConstant} from "../common/constants/CommonConstant.sol";

/// contracts/common/interfaces/
import {IAdmin} from "../common/interfaces/IAdmin.sol";

/// contracts/common/utilities/
import {CurrencyHandler} from "../common/utilities/CurrencyHandler.sol";
import {Formula} from "../common/utilities/Formula.sol";
import {Pausable} from "../common/utilities/Pausable.sol";

/// contracts/liquidity/constants/
import {TreasuryConstant} from "./constants/TreasuryConstant.sol";

/// contracts/liquidity/storages/
import {TreasuryStorage} from "./storages/TreasuryStorage.sol";

/**
 *  @author Briky Team
 *
 *  @notice The `Treasury` contract serves as the central liquidity pool and operation fund manager for the
 *          ecosystem, handling currency deposits, liquidity provision, and fund withdrawals.
 *
 *  @dev    The contract manages two main pools: liquidity for token liquidation and operation fund for
 *          administrative expenses. When liquidity is provided, a portion is allocated to the operation
 *          fund based on a predefined rate, while the remainder becomes available liquidity.
 *  @dev    Liquidity withdrawal is restricted to the primary token contract for token liquidation operations.
 *          Operation fund withdrawals require administrative signatures and are used for ecosystem operations.
 *  @dev    The treasury integrates with various ecosystem components including primary token liquidation,
 *          staking fee contributions, and auction deposits to maintain ecosystem liquidity.
 *  @dev    ERC-20 tokens are identified by their contract addresses.
 *          Native coin is represented by the zero address (0x0000000000000000000000000000000000000000).
 */
contract Treasury is
TreasuryStorage,
Pausable,
ReentrancyGuardUpgradeable {
    /** ===== LIBRARY ===== **/
    using Formula for uint256;


    /** ===== CONSTANT ===== **/
    string constant private VERSION = "v1.2.1";


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
     *          Name            Description
     *  @param  _admin          Admin contract address.
     *  @param  _currency       Currency contract address used by the treasury.
     *  @param  _primaryToken   Primary token contract address.
     */
    function initialize(
        address _admin,
        address _currency,
        address _primaryToken
    ) external
    initializer {
        /// Initializer
        __Pausable_init();
        __ReentrancyGuard_init();

        /// Dependency
        admin = _admin;
        currency = _currency;
        primaryToken = _primaryToken;
    }


    /* --- Administration --- */

    /**
     *  @notice Withdraw from the operation fund to an operator.
     *
     *          Name            Description
     *  @param  _value          Amount withdrawn from operation fund.
     *  @param  _operator       Operator address that received the funds.
     *  @param  _signatures     Array of admin signatures.
     *
     *  @dev    Administrative operation.
     */
    function withdrawOperationFund(
        uint256 _value,
        address _operator,
        bytes[] calldata _signatures
    ) external
    nonReentrant {
        IAdmin(admin).verifyAdminSignatures(
            abi.encode(
                address(this),
                "withdrawOperationFund",
                _value,
                _operator
            ),
            _signatures
        );

        uint256 fund = operationFund;
        if (_value > fund) {
            revert InsufficientFunds();
        }

        operationFund = fund - _value;
        CurrencyHandler.sendERC20(currency, _operator, _value);

        emit OperationFundWithdrawal(_value, _operator);
    }


    /* --- Command --- */
    /**
     *  @notice Withdraw liquidity from the treasury.
     *
     *          Name            Description
     *  @param  _withdrawer     Address that will receive the withdrawn liquidity.
     *  @param  _value          Amount of liquidity to withdraw.
     *
     *  @dev    Permission: Primary token contract only.
     *  @dev    Used primarily for token liquidation operations.
     */
    function withdrawLiquidity(
        address _withdrawer,
        uint256 _value
    ) external
    whenNotPaused
    nonReentrant {
        if (msg.sender != primaryToken) {
            revert Unauthorized();
        }
        if (_value > liquidity) {
            revert InsufficientFunds();
        }

        liquidity -= _value;
        CurrencyHandler.sendERC20(currency, _withdrawer, _value);

        emit LiquidityWithdrawal(_withdrawer, _value);
    }

    /**
     *  @notice Provide liquidity to the treasury with automatic operation fund allocation.
     *
     *          Name        Description
     *  @param  _value      Amount of currency to provide as liquidity.
     *
     *  @dev    A portion of the provided value is allocated to the operation fund based on a predefined rate.
     *  @dev    The remaining amount becomes available liquidity for ecosystem operations.
     */
    function provideLiquidity(
        uint256 _value
    ) external
    whenNotPaused
    nonReentrant {
        CurrencyHandler.receiveERC20(currency, _value);

        uint256 fee = _value.scale(TreasuryConstant.OPERATION_FUND_RATE, CommonConstant.RATE_MAX_FRACTION);

        operationFund += fee;
        liquidity += _value - fee;

        emit LiquidityProvision(msg.sender, _value, fee);
    }
}
