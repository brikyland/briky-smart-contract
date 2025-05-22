// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

library CurrencyHandler {
    error InsufficientValue();
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

    function isCurrencyPriceWithinRange(
        uint256 _currencyAmount,
        uint256 _currencyBasePrice,
        uint8 _currencyBasePriceDecimals,
        uint256 _baseMinPrice,
        uint256 _baseMaxPrice
    ) internal pure returns (bool) {
        // Condition to check: _baseMinPrice <= basePrice <= _baseMaxPrice
        // With: basePrice = (_currencyAmount / 10 ** 18) * _currencyBasePrice / (10 ** priceDecimals)
        return _currencyAmount * _currencyBasePrice >= _baseMinPrice * 10 ** _currencyBasePriceDecimals * 10 ** 18
            && _currencyAmount * _currencyBasePrice <= _baseMaxPrice * 10 ** _currencyBasePriceDecimals * 10 ** 18;
    }
}
