// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ReentrancyGuardUpgradeable} from "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";

import {Signature} from "./utilities/Signature.sol";
import {CurrencyHandler} from "./utilities/CurrencyHandler.sol";

import {IAdmin} from "./interfaces/IAdmin.sol";

import {FeeReceiverStorage} from "./storages/FeeReceiverStorage.sol";

contract FeeReceiver is
FeeReceiverStorage,
ReentrancyGuardUpgradeable {
    string constant private VERSION = "v1.2.1";

    receive() external payable {}

    function initialize(address _admin) external initializer {
        __ReentrancyGuard_init();

        admin = _admin;
    }

    function version() external pure returns (string memory) {
        return VERSION;
    }

    /**
     *  @notice Withdraw cryptocurrency from the contract.
     *
     *          Name            Description
     *  @param  _receiver       Receiver address.
     *  @param  _currencies     Array of currency addresses to withdraw.
     *  @param  _values         Array of withdraw values.
     *  @param  _signatures     Array of admin signatures.
     * 
     *  @dev    TODO
     */
    function withdraw(
        address _receiver,
        address[] calldata _currencies,
        uint256[] calldata _values,
        bytes[] calldata _signatures
    ) external nonReentrant {
        IAdmin(admin).verifyAdminSignatures(
            abi.encode(
                address(this),
                "withdraw",
                _receiver,
                _currencies,
                _values
            ),
            _signatures
        );

        if (_currencies.length != _values.length) {
            revert InvalidInput();
        }

        for (uint256 i; i < _currencies.length; ++i) {
            CurrencyHandler.sendCurrency(_currencies[i], _receiver, _values[i]);

            emit Withdrawal(_receiver, _currencies[i], _values[i]);
        }

    }
}
