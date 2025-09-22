// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

/// contracts/common/utilities/
import {CurrencyHandler} from "./utilities/CurrencyHandler.sol";

/**
 *  @author Briky Team
 *
 *  @notice The `Airdrop` contract facilitates cryptocurrency distribution in the form of an airdrop to multiple addresses.
 *
 *  @dev    ERC-20 tokens are identified by their contract addresses.
 *          Native coin is represented by the zero address (0x0000000000000000000000000000000000000000).
 */
contract Airdrop {
    /* --- Constant --- */
    string constant private VERSION = "v1.2.1";


    /* --- Common --- */
    /**
     *  @notice Executed on a call to this contract with empty calldata.
     */
    receive() external payable {}

    /**
     *  @return Version of implementation.
     */
    function version() external pure returns (string memory) {
        return VERSION;
    }


    /* --- Command --- */
    /**
     *  @notice Execute an airdrop by transferring cryptocurrency to multiple receiver addresses.
     *
     *          Name        Description
     *  @param  _receivers  Array of receiver addresses.
     *  @param  _amounts    Array of airdrop amount, respective to each receiver.
     *  @param  _currency   Airdrop currency.
     */
    function airdrop(
        address[] calldata _receivers,
        uint256[] calldata _amounts,
        address _currency
    ) external payable {
        require(_receivers.length == _amounts.length, "invalid input");
        uint256 total;
        for (uint256 i; i < _receivers.length; ++i) {
            require(_receivers[i] != address(0), "invalid address");
            require(_amounts[i] > 0, "invalid amount");
            total += _amounts[i];
        }

        if (_currency == address(0)) {
            CurrencyHandler.receiveNative(total);
            for (uint256 i; i < _receivers.length; ++i) {
                CurrencyHandler.sendNative(
                    _receivers[i],
                    _amounts[i]
                );
            }
        } else {
            CurrencyHandler.receiveERC20(
                _currency,
                total
            );
            for (uint256 i; i < _receivers.length; ++i) {
                CurrencyHandler.sendERC20(
                    _currency,
                    _receivers[i],
                    _amounts[i]
                );
            }
        }
    }
}
