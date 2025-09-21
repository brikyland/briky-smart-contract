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
 *  @notice The `Treasury` contract serves as a stablecoin reserve pool that backs the intrinsic value of `PrimaryToken` and
 *          facilitates token liquidation.
 *  @notice 20% of provided liquidity is allocated into the operation fund for sponsoring administrative expenses.
 *
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
     *  @param  _currency       Currency contract address used by the treasury.
     *  @param  _primaryToken   `PrimaryToken` contract address.
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
     *  @dev    Administrative operator.
     */
    function withdrawOperationFund(
        address _operator,
        uint256 _value,
        bytes[] calldata _signatures
    ) external
    nonReentrant {
        IAdmin(admin).verifyAdminSignatures(
            abi.encode(
                address(this),
                "withdrawOperationFund",
                _operator,
                _value
            ),
            _signatures
        );

        uint256 fund = operationFund;
        if (_value > fund) {
            revert InsufficientFunds();
        }

        operationFund = fund - _value;
        CurrencyHandler.sendERC20(
            currency,
            _operator,
            _value
        );

        emit OperationFundWithdrawal(
            _operator,
            _value
        );
    }


    /* --- Command --- */
    /**
     *  @notice Withdraw liquidity from the treasury.
     *
     *          Name            Description
     *  @param  _withdrawer     Receiver address.
     *  @param  _value          Withdrawn value.
     *
     *  @dev    Permission: PrimaryToken.
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
        CurrencyHandler.sendERC20(
            currency,
            _withdrawer,
            _value
        );

        emit LiquidityWithdrawal(
            _withdrawer,
            _value
        );
    }

    /**
     *  @notice Provide liquidity to the treasury.
     *
     *          Name        Description
     *  @param  _value      Provided value.
     */
    function provideLiquidity(
        uint256 _value
    ) external
    whenNotPaused
    nonReentrant {
        CurrencyHandler.receiveERC20(
            currency,
            _value
        );

        uint256 operationAllocation = _value.scale(TreasuryConstant.OPERATION_FUND_RATE, CommonConstant.RATE_MAX_SUBUNIT);

        operationFund += operationAllocation;
        liquidity += _value - operationAllocation;

        emit LiquidityProvision(
            msg.sender,
            _value,
            operationAllocation
        );
    }
}
