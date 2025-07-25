// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IERC20Upgradeable} from "@openzeppelin/contracts-upgradeable/interfaces/IERC20Upgradeable.sol";
import {ReentrancyGuardUpgradeable} from "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";

import {IAdmin} from "../common/interfaces/IAdmin.sol";

import {CurrencyHandler} from "../lib/CurrencyHandler.sol";

import {DistributorStorage} from "../liquidity/storages/DistributorStorage.sol";

contract Distributor is
DistributorStorage,
ReentrancyGuardUpgradeable {
    string constant private VERSION = "v1.1.1";

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
        for (uint256 i; i < _receivers.length; i++) {
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
