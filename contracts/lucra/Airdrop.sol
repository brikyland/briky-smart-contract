// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IERC20Upgradeable} from "@openzeppelin/contracts-upgradeable/interfaces/IERC20Upgradeable.sol";
import {SafeERC20Upgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC20/utils/SafeERC20Upgradeable.sol";
import {CurrencyHandler} from "../lib/CurrencyHandler.sol";

contract Airdrop {
    using SafeERC20Upgradeable for IERC20Upgradeable;

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
        uint256 total = 0;
        for (uint256 i = 0; i < _accounts.length; ++i) {
            require(_accounts[i] != address(0), "invalid address");
            require(_amounts[i] > 0, "invalid amount");
            total += _amounts[i];
        }
        if (currency == address(0)) {
            CurrencyHandler.receiveNative(total);
            for (uint256 i = 0; i < _accounts.length; ++i) {
                CurrencyHandler.transferNative(_accounts[i], _amounts[i]);
            }
        } else {
            IERC20Upgradeable(currency).safeTransferFrom(msg.sender, address(this), total);
            for (uint256 i = 0; i < _accounts.length; ++i) {
                IERC20Upgradeable(currency).safeTransfer(_accounts[i], _amounts[i]);
            }
        }
    }
}
