// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

/// @openzeppelin/contracts-upgradeable/
import {IERC20Upgradeable} from "@openzeppelin/contracts-upgradeable/interfaces/IERC20Upgradeable.sol";
import {SafeERC20Upgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC20/utils/SafeERC20Upgradeable.sol";

/**
 *  @author Briky Team
 *
 *  @notice Utility library for interacting with cryptocurrencies, compatible with both native coin and ERC-20 tokens.
 *
 *  @dev    ERC-20 tokens are identified by their contract addresses.
 *          Native coin is represented by the zero address (0x0000000000000000000000000000000000000000).
 */
library CurrencyHandler {
    /** ===== LIBRARY ===== **/
    using SafeERC20Upgradeable for IERC20Upgradeable;


    /** ===== ERROR ===== **/
    error InsufficientValue();
    error FailedTransfer();
    error FailedRefund();


    /** ===== FUNCTION ===== **/
    /* --- Native Coin --- */
    /**
     *  @notice Transfer an amount of native coin from this contract to a receiver.
     *
     *          Name        Description
     *  @param  _receiver   Receiver address.
     *  @param  _value      Amount of native coin.
     */
    function sendNative(
        address _receiver,
        uint256 _value
    ) internal {
        (bool success, ) = _receiver.call{value: _value}("");
        if (!success) {
            revert FailedTransfer();
        }
    }

    /**
     *  @notice Transfer an amount of native coin from the message sender to this contract.
     *
     *          Name        Description
     *  @param  _value      Amount of native coin.
     */
    function receiveNative(
        uint256 _value
    ) internal {
        if (_value > msg.value) {
            revert InsufficientValue();
        }
        if (_value < msg.value) {
            /// Refund the excess
            unchecked {
                (bool success, ) = msg.sender.call{value: msg.value - _value}("");
                if (!success) {
                    revert FailedRefund();
                }
            }
        }
    }

    /**
     *  @notice Transfer an amount of native coin from the message sender to a receiver.
     *
     *          Name        Description
     *  @param  _receiver   Receiver address.
     *  @param  _value      Amount of native coin.
     */
    function forwardNative(
        address _receiver,
        uint256 _value
    ) internal {
        receiveNative(_value);
        sendNative(
            _receiver,
            _value
        );
    }

    /* --- ERC-20 Token --- */
    /**
     *  @notice Transfer an amount of ERC-20 token from this contract to a receiver.
     *
     *          Name        Description
     *  @param  _currency   Token address.
     *  @param  _receiver   Receiver address.
     *  @param  _value      Amount of ERC-20 token.
     */
    function sendERC20(
        address _currency,
        address _receiver,
        uint256 _value
    ) internal {
        IERC20Upgradeable(_currency).safeTransfer(_receiver, _value);
    }

    /**
     *  @notice Transfer an amount of ERC-20 token from the message sender to this contract.
     *
     *          Name        Description
     *  @param  _currency   Token address.
     *  @param  _value      Amount of ERC-20 token.
     */
    function receiveERC20(
        address _currency,
        uint256 _value
    ) internal {
        IERC20Upgradeable(_currency).safeTransferFrom(
            msg.sender,
            address(this),
            _value
        );
    }

    /**
     *  @notice Transfer an amount of ERC-20 token from the message sender to a receiver.
     *
     *          Name        Description
     *  @param  _currency   Token address.
     *  @param  _receiver   Receiver address.
     *  @param  _value      Amount of ERC-20 token.
     */
    function forwardERC20(
        address _currency,
        address _receiver,
        uint256 _value
    ) internal {
        IERC20Upgradeable(_currency).safeTransferFrom(
            msg.sender,
            _receiver,
            _value
        );
    }

    /**
     *  @notice Approve a new amount of ERC-20 token for a spender.
     *
     *          Name        Description
     *  @param  _currency   Token address.
     *  @param  _spender    Spender address.
     *  @param  _value      Amount of ERC-20 token.
     */
    function allowERC20(
        address _currency,
        address _spender,
        uint256 _value
    ) internal {
        IERC20Upgradeable(_currency).safeIncreaseAllowance(_spender, _value);
    }

    /* --- General Cryptocurrency --- */
    /**
     *  @notice Transfer an amount of either ERC-20 token or native coin from this contract to a receiver.
     *
     *          Name        Description
     *  @param  _currency   Token address or zero address.
     *  @param  _receiver   Receiver address.
     *  @param  _value      Amount of ERC-20 token or native coin.
     */
    function sendCurrency(
        address _currency,
        address _receiver,
        uint256 _value
    ) internal {
        if (_currency == address(0)) {
            sendNative(
                _receiver,
                _value
            );
        } else {
            sendERC20(
                _currency,
                _receiver,
                _value
            );
        }
    }

    /**
     *  @notice Transfer an amount of either ERC-20 token or native coin from the message sender to this contract.
     *
     *          Name        Description
     *  @param  _currency   Token address or zero address.
     *  @param  _value      Amount of ERC-20 token or native coin.
     */
    function receiveCurrency(
        address _currency,
        uint256 _value
    ) internal {
        if (_currency == address(0)) {
            receiveNative(_value);
        } else {
            receiveERC20(
                _currency,
                _value
            );
        }
    }

    /**
     *  @notice Transfer an amount of either ERC-20 token or native coin from the message sender to a receiver.
     *
     *          Name        Description
     *  @param  _currency   Token address or zero address.
     *  @param  _receiver   Receiver address.
     *  @param  _value      Amount of ERC-20 token or native coin.
     */
    function forwardCurrency(
        address _currency,
        address _receiver,
        uint256 _value
    ) internal {
        if (_currency == address(0)) {
            forwardNative(
                _receiver,
                _value
            );
        } else {
            forwardERC20(
                _currency,
                _receiver,
                _value
            );
        }
    }
}
