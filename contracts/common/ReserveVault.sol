// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IERC20Upgradeable} from "@openzeppelin/contracts-upgradeable/interfaces/IERC20Upgradeable.sol";
import {ReentrancyGuardUpgradeable} from "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
import {SafeERC20Upgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC20/utils/SafeERC20Upgradeable.sol";

import {CurrencyHandler} from "../lib/CurrencyHandler.sol";

import {IAdmin} from "./interfaces/IAdmin.sol";

import {Pausable} from "./utilities/Pausable.sol";

import {ReserveVaultStorage} from "./storages/ReserveVaultStorage.sol";

contract ReserveVault is
ReserveVaultStorage,
Pausable,
ReentrancyGuardUpgradeable {
    using SafeERC20Upgradeable for IERC20Upgradeable;

    string constant private VERSION = "v1.1.1";

    modifier validFund(uint256 _fundId) {
        if (_fundId == 0 || _fundId < fundNumber) {
            revert InvalidFundId();
        }
        _;
    }

    receive() external payable {}

    function initialize(address _admin) external initializer {
        __Pausable_init();
        __ReentrancyGuard_init();

        admin = _admin;
    }

    function version() external pure returns (string memory) {
        return VERSION;
    }

    function authorizeInitiator(
        address[] calldata _accounts,
        bool _isInitiator,
        bytes[] calldata _signatures
    ) external {
        IAdmin(admin).verifyAdminSignatures(
            abi.encode(
                address(this),
                "authorizeInitiator",
                _accounts,
                _isInitiator
            ),
            _signatures
        );

        if (_isInitiator) {
            for (uint256 i = 0; i < _accounts.length; ++i) {
                if (isInitiator[_accounts[i]]) {
                    revert AuthorizedAccount(_accounts[i]);
                }
                isInitiator[_accounts[i]] = true;
                emit InitiatorAuthorization(_accounts[i]);
            }
        } else {
            for (uint256 i = 0; i < _accounts.length; ++i) {
                if (!isInitiator[_accounts[i]]) {
                    revert NotAuthorizedAccount(_accounts[i]);
                }
                isInitiator[_accounts[i]] = false;
                emit InitiatorDeauthorization(_accounts[i]);
            }
        }
    }

    function getFund(uint256 _fundId) external view validFund(_fundId) returns (Fund memory) {
        return funds[_fundId];
    }

    function isFundSufficient(uint256 _fundId) external view validFund(_fundId) returns (bool) {
        return funds[_fundId].isSufficient;
    }

    function initiateFund(
        address _mainCurrency,
        uint256 _mainDenomination,
        address[] calldata _currencies,
        uint256[] calldata _denominations
    ) external whenNotPaused returns (uint256) {
        if (!isInitiator[msg.sender]) {
            revert Unauthorized();
        }

        if (_currencies.length != _denominations.length) {
            revert InvalidInput();
        }

        uint256 fundId = ++fundNumber;
        Fund storage fund = funds[fundId];

        IAdmin adminContract = IAdmin(admin);
        if (_mainDenomination != 0) {
            if (!adminContract.isAvailableCurrency(_mainCurrency)) {
                revert InvalidCurrency();
            }
            fund.currencies.push(_mainCurrency);
            fund.denominations.push(_mainDenomination);
        }

        for (uint256 i = 0; i < _currencies.length; ++i) {
            if (_denominations[i] == 0) {
                revert InvalidDenomination();
            }
            if (!adminContract.isAvailableCurrency(_currencies[i])) {
                revert InvalidCurrency();
            }
            fund.currencies.push(_currencies[i]);
            fund.denominations.push(_denominations[i]);
        }

        fund.initiator = msg.sender;

        emit FundInitiation(
            fundId,
            msg.sender,
            _mainCurrency,
            _mainDenomination,
            _currencies,
            _denominations
        );

        return fundId;
    }

    function provideFund(uint256 _fundId) external payable validFund(_fundId) {
        _provideFund(_fundId);
    }

    function safeProvideFund(uint256 _fundId, uint256 _anchor) external payable validFund(_fundId) {
        if (_anchor != funds[_fundId].supply) {
            revert BadAnchor();
        }

        _provideFund(_fundId);
    }

    function withdrawFund(
        uint256 _fundId,
        address _receiver,
        uint256 _quantity
    ) external validFund(_fundId) {
        _withdrawFund(_fundId, _receiver, _quantity);
    }

    function safeWithdrawFund(
        uint256 _fundId,
        address _receiver,
        uint256 _quantity,
        uint256 _anchor
    ) external validFund(_fundId) {
        if (_anchor != funds[_fundId].supply) {
            revert BadAnchor();
        }

        _withdrawFund(_fundId, _receiver, _quantity);
    }

    function _provideFund(uint256 _fundId) private nonReentrant whenNotPaused {
        Fund storage fund = funds[_fundId];
        if (msg.sender != fund.initiator) {
            revert Unauthorized();
        }
        if (fund.isSufficient == true) {
            revert AlreadyProvided();
        }

        address[] memory currencies = fund.currencies;
        uint256[] memory denominations = fund.denominations;
        uint256 supply = fund.supply;
        for (uint256 i = 0; i < currencies.length; ++i) {
            if (currencies[i] == address(0)) {
                CurrencyHandler.receiveNative(denominations[i] * supply);
            } else {
                IERC20Upgradeable(currencies[i]).safeTransferFrom(msg.sender, address(this), denominations[i] * supply);
            }
        }

        fund.isSufficient = true;

        emit FundProvision(_fundId);
    }

    function _withdrawFund(
        uint256 _fundId,
        address _receiver,
        uint256 _quantity
    ) private nonReentrant whenNotPaused {
        Fund storage fund = funds[_fundId];
        if (msg.sender != fund.initiator) {
            revert Unauthorized();
        }

        if (fund.isSufficient == false || _quantity > fund.supply) {
            revert InsufficientFunds();
        }

        unchecked {
            fund.supply -= _quantity;
        }

        address[] memory currencies = fund.currencies;
        uint256[] memory denominations = fund.denominations;
        for (uint256 i = 0; i < currencies.length; ++i) {
            if (currencies[i] == address(0)) {
                CurrencyHandler.transferNative(_receiver, denominations[i] * _quantity);
            } else {
                IERC20Upgradeable(currencies[i]).safeTransfer(_receiver, denominations[i] * _quantity);
            }
        }

        emit FundWithdrawal(
            _fundId,
            _receiver,
            _quantity
        );
    }
}
