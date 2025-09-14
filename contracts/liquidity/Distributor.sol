// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import {IERC20Upgradeable} from "@openzeppelin/contracts-upgradeable/interfaces/IERC20Upgradeable.sol";
import {ReentrancyGuardUpgradeable} from "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";

import {IAdmin} from "../common/interfaces/IAdmin.sol";

import {CurrencyHandler} from "../common/utilities/CurrencyHandler.sol";

import {DistributorStorage} from "../liquidity/storages/DistributorStorage.sol";

contract Distributor is
DistributorStorage,
ReentrancyGuardUpgradeable {
    string constant private VERSION = "v1.2.1";

    /**
     *  @notice Executed on a call to the contract with empty calldata.
     */
    receive() external payable {}

    function initialize(
        address _admin,
        address _primaryToken,
        address _treasury
    ) external initializer {
        __ReentrancyGuard_init();

        admin = _admin;
        primaryToken = _primaryToken;
        treasury = _treasury;
    }

    function version() external pure returns (string memory) {
        return VERSION;
    }

    /**
     *  @notice Distribute tokens to multiple receivers.
     *
     *          Name            Description
     *  @param  _receivers      Array of receiver addresses.
     *  @param  _amounts        Array of distributed amount, respectively to each receiver.
     *  @param  _data           Note.
     *  @param  _signatures     Array of admin signatures.
     * 
     *  @dev    Administrative configuration.
     */
    function distributeToken(
        address[] calldata _receivers,
        uint256[] calldata _amounts,
        string calldata _data,
        bytes[] calldata _signatures
    ) external nonReentrant {
        IAdmin(admin).verifyAdminSignatures(
            abi.encode(
                address(this),
                "distributeToken",
                _receivers,
                _amounts,
                _data
            ),
            _signatures
        );
        if (_receivers.length != _amounts.length) {
            revert InvalidInput();
        }

        address primaryTokenAddress = primaryToken;
        for (uint256 i; i < _receivers.length; ++i) {
            if (_amounts[i] > IERC20Upgradeable(primaryTokenAddress).balanceOf(address(this))) {
                revert InsufficientFunds();
            }

            CurrencyHandler.sendERC20(primaryTokenAddress, _receivers[i], _amounts[i]);

            unchecked {
                distributedTokens[_receivers[i]] += _amounts[i];
            }

            emit TokenDistribution(_receivers[i], _amounts[i]);
        }
    }
}
