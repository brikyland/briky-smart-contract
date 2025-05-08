// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

library CurrencyHandler {
    error InsufficientFunds();
    error FailedTransfer();
    error FailedRefund();

    function transferNative(address _receiver, uint256 _value) internal {
        (bool success, ) = _receiver.call{value: _value}("");
        if (!success) {
            revert FailedTransfer();
        }
    }

    function receiveNative(uint256 _value) internal {
        if (_value > msg.value) {
            revert InsufficientFunds();
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
}
