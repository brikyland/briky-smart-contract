// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {PausableUpgradeable} from "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";
import {ReentrancyGuardUpgradeable} from "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
import {IERC20Upgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";
import {SafeERC20Upgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC20/utils/SafeERC20Upgradeable.sol";

import {Constant} from "../lib/Constant.sol";
import {Formula} from "../lib/Formula.sol";

import {IAdmin} from "../common/interfaces/IAdmin.sol";

import {TreasuryStorage} from "./storages/TreasuryStorage.sol";

contract Treasury is
TreasuryStorage,
PausableUpgradeable,
ReentrancyGuardUpgradeable {
    using Formula for uint256;
    using SafeERC20Upgradeable for IERC20Upgradeable;

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

    function pause(bytes[] calldata _signatures) external whenNotPaused {
        IAdmin(admin).verifyAdminSignatures(
            abi.encode(address(this), "pause"),
            _signatures
        );
        _pause();
    }

    function unpause(bytes[] calldata _signatures) external whenPaused {
        IAdmin(admin).verifyAdminSignatures(
            abi.encode(address(this), "unpause"),
            _signatures
        );
        _unpause();
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
        IERC20Upgradeable(currency).safeTransfer(_operator, _value);

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
        IERC20Upgradeable(currency).safeTransfer(_withdrawer, _value);

        emit LiquidityWithdrawal(_withdrawer, _value);
    }

    function provideLiquidity(uint256 _value) external nonReentrant whenNotPaused {
        IERC20Upgradeable(currency).safeTransferFrom(msg.sender, address(this), _value);

        uint256 feeAmount = _value.scale(Constant.TREASURY_OPERATION_FUND_RATE, Constant.COMMON_RATE_MAX_FRACTION);

        operationFund += feeAmount;
        liquidity += _value - feeAmount;

        emit LiquidityProvision(msg.sender, _value, feeAmount);
    }
}
