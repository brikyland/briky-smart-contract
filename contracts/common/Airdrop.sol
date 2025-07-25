// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {CurrencyHandler} from "../lib/CurrencyHandler.sol";

contract Airdrop {
    string constant private VERSION = "v1.1.1";

    receive() external payable {}

    function version() external pure returns (string memory) {
        return VERSION;
    }

    function airdrop(
        address[] calldata _accounts,
        uint256[] calldata _amounts,
        address currency
    ) external payable {
        require(_accounts.length == _amounts.length, "invalid input");
        uint256 total;
        for (uint256 i; i < _accounts.length; i++) {
            require(_accounts[i] != address(0), "invalid address");
            require(_amounts[i] > 0, "invalid amount");
            total += _amounts[i];
        }

        if (currency == address(0)) {
            CurrencyHandler.receiveNative(total);
            for (uint256 i; i < _accounts.length; i++) {
                CurrencyHandler.sendNative(_accounts[i], _amounts[i]);
            }
        } else {
            CurrencyHandler.receiveERC20(currency, total);
            for (uint256 i; i < _accounts.length; i++) {
                CurrencyHandler.sendERC20(currency, _accounts[i], _amounts[i]);
            }
        }
    }
}
