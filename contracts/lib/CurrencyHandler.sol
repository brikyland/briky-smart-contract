// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IERC20Upgradeable} from "@openzeppelin/contracts-upgradeable/interfaces/IERC20Upgradeable.sol";
import {SafeERC20Upgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC20/utils/SafeERC20Upgradeable.sol";

library CurrencyHandler {
    using SafeERC20Upgradeable for IERC20Upgradeable;

    error InsufficientValue();
    error FailedTransfer();
    error FailedRefund();

    function sendNative(address _receiver, uint256 _value) internal {
        (bool success, ) = _receiver.call{value: _value}("");
        if (!success) {
            revert FailedTransfer();
        }
    }

    function receiveNative(uint256 _value) internal {
        if (_value > msg.value) {
            revert InsufficientValue();
        }
        if (_value < msg.value) {
            unchecked {
                (bool success, ) = msg.sender.call{value: msg.value - _value}("");
                if (!success) {
                    revert FailedRefund();
                }
            }
        }
    }
    
    function forwardNative(address _receiver, uint256 _value) internal {
        receiveNative(_value);
        sendNative(_receiver, _value);
    }

    function sendERC20(address _currency, address _receiver, uint256 _value) internal {
        IERC20Upgradeable(_currency).safeTransfer(_receiver, _value);
    }

    function receiveERC20(address _currency, uint256 _value) internal {
        IERC20Upgradeable(_currency).safeTransferFrom(msg.sender, address(this), _value);
    }

    function forwardERC20(address _currency, address _receiver, uint256 _value) internal {
        IERC20Upgradeable(_currency).safeTransferFrom(msg.sender, _receiver, _value);
    }

    function allowERC20(address _currency, address _spender, uint256 _value) internal {
        IERC20Upgradeable(_currency).safeApprove(_spender, _value);
    }
    
    function sendCurrency(address _currency, address _receiver, uint256 _value) internal {
        if (_currency == address(0)) {
            sendNative(_receiver, _value);
        } else {
            sendERC20(_currency, _receiver, _value);
        }
    }

    function receiveCurrency(address _currency, uint256 _value) internal {
        if (_currency == address(0)) {
            receiveNative(_value);
        } else {
            receiveERC20(_currency, _value);
        }
    }

    function forwardCurrency(address _currency, address _receiver, uint256 _value) internal {
        if (_currency == address(0)) {
            forwardNative(_receiver, _value);
        } else {
            forwardERC20(_currency, _receiver, _value);
        }
    }
}
