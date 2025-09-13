// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ReentrancyGuardUpgradeable} from "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";

import {CurrencyHandler} from "../common/utilities/CurrencyHandler.sol";
import {Formula} from "../common/utilities/Formula.sol";

import {IAdmin} from "../common/interfaces/IAdmin.sol";

import {CommonConstant} from "../common/constants/CommonConstant.sol";

import {Pausable} from "../common/utilities/Pausable.sol";

import {TreasuryConstant} from "./constants/TreasuryConstant.sol";

import {TreasuryStorage} from "./storages/TreasuryStorage.sol";

contract Treasury is
TreasuryStorage,
Pausable,
ReentrancyGuardUpgradeable {
    using Formula for uint256;

    string constant private VERSION = "v1.2.1";

    /**
     *  @notice Executed on a call to the contract with empty calldata.
     */
    receive() external payable {}

    function initialize(
        address _admin,
        address _currency,
        address _primaryToken
    ) external initializer {
        __Pausable_init();
        __ReentrancyGuard_init();

        admin = _admin;
        currency = _currency;
        primaryToken = _primaryToken;
    }

    function version() external pure returns (string memory) {
        return VERSION;
    }

    /**
     *  @notice Withdraw from the operation fund to an operator.
     *
     *          Name            Description
     *  @param  _value          Amount to withdraw.
     *  @param  _operator       Operator address.
     *  @param  _signatures     Array of admin signatures.
     */
    function withdrawOperationFund(
        uint256 _value,
        address _operator,
        bytes[] calldata _signatures
    ) external nonReentrant {
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

    function withdrawLiquidity(address _withdrawer, uint256 _value) external nonReentrant whenNotPaused {
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

    function provideLiquidity(uint256 _value) external nonReentrant whenNotPaused {
        CurrencyHandler.receiveERC20(currency, _value);

        uint256 fee = _value.scale(TreasuryConstant.OPERATION_FUND_RATE, CommonConstant.RATE_MAX_FRACTION);

        operationFund += fee;
        liquidity += _value - fee;

        emit LiquidityProvision(msg.sender, _value, fee);
    }
}
