// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ReentrancyGuardUpgradeable} from "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";

import {CurrencyHandler} from "../lib/CurrencyHandler.sol";
import {Formula} from "../lib/Formula.sol";

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

    string constant private VERSION = "v1.1.1";

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

        uint256 feeAmount = _value.scale(TreasuryConstant.TREASURY_OPERATION_FUND_RATE, CommonConstant.COMMON_RATE_MAX_FRACTION);

        operationFund += feeAmount;
        liquidity += _value - feeAmount;

        emit LiquidityProvision(msg.sender, _value, feeAmount);
    }
}
