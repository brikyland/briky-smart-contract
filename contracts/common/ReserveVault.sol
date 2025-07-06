// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ReentrancyGuardUpgradeable} from "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";

import {CurrencyHandler} from "../lib/CurrencyHandler.sol";

import {IAdmin} from "./interfaces/IAdmin.sol";

import {Pausable} from "./utilities/Pausable.sol";

import {ReserveVaultStorage} from "./storages/ReserveVaultStorage.sol";

contract ReserveVault is
ReserveVaultStorage,
Pausable,
ReentrancyGuardUpgradeable {
    string constant private VERSION = "v1.1.1";

    modifier validFund(uint256 _fundId) {
        if (_fundId == 0 || _fundId > fundNumber) {
            revert InvalidFundId();
        }
        _;
    }

    modifier onlyInitiator(uint256 _fundId) {
        if (msg.sender != funds[_fundId].initiator) {
            revert Unauthorized();
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
            for (uint256 i; i < _accounts.length; ++i) {
                if (isInitiator[_accounts[i]]) {
                    revert AuthorizedAccount(_accounts[i]);
                }
                isInitiator[_accounts[i]] = true;
                emit InitiatorAuthorization(_accounts[i]);
            }
        } else {
            for (uint256 i; i < _accounts.length; ++i) {
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
        address[] calldata _extraCurrencies,
        uint256[] calldata _extraDenominations
    ) external whenNotPaused returns (uint256) {
        if (!isInitiator[msg.sender]) {
            revert Unauthorized();
        }

        if (_extraCurrencies.length != _extraDenominations.length) {
            revert InvalidInput();
        }

        uint256 fundId = ++fundNumber;
        Fund storage fund = funds[fundId];

        IAdmin adminContract = IAdmin(admin);
        if (!adminContract.isAvailableCurrency(_mainCurrency)) {
            revert InvalidCurrency();
        }
        fund.mainCurrency = _mainCurrency;
        fund.mainDenomination = _mainDenomination;

        for (uint256 i; i < _extraCurrencies.length; ++i) {
            if (!adminContract.isAvailableCurrency(_extraCurrencies[i])) {
                revert InvalidCurrency();
            }
            if (_extraDenominations[i] == 0) {
                revert InvalidDenomination();
            }
            fund.extraCurrencies.push(_extraCurrencies[i]);
            fund.extraDenominations.push(_extraDenominations[i]);
        }

        fund.initiator = msg.sender;

        emit FundInitiation(
            fundId,
            msg.sender,
            _mainCurrency,
            _mainDenomination,
            _extraCurrencies,
            _extraDenominations
        );

        return fundId;
    }

    function expandFund(uint256 _fundId, uint256 _quantity)
    external validFund(_fundId) onlyInitiator(_fundId) whenNotPaused {
        if (funds[_fundId].isSufficient) {
            revert AlreadyProvided();
        }

        funds[_fundId].totalQuantity += _quantity;

        emit FundExpansion(_fundId, _quantity);
    }

    function provideFund(uint256 _fundId)
    external payable validFund(_fundId) onlyInitiator(_fundId) nonReentrant whenNotPaused {
        Fund memory fund = funds[_fundId];
        if (fund.isSufficient == true) {
            revert AlreadyProvided();
        }

        uint256 totalNative;
        if (fund.totalQuantity != 0) {
            if (fund.mainDenomination != 0) {
                if (fund.mainCurrency == address(0)) {
                    totalNative += fund.mainDenomination * fund.totalQuantity;
                } else {
                    CurrencyHandler.receiveERC20(
                        fund.mainCurrency,
                        fund.mainDenomination * fund.totalQuantity
                    );
                }
            }

            for (uint256 i; i < fund.extraCurrencies.length; ++i) {
                if (fund.extraCurrencies[i] == address(0)) {
                    totalNative += fund.extraDenominations[i] * fund.totalQuantity;
                } else {
                    CurrencyHandler.receiveERC20(
                        fund.extraCurrencies[i],
                        fund.extraDenominations[i] * fund.totalQuantity
                    );
                }
            }
        }

        CurrencyHandler.receiveNative(totalNative);

        funds[_fundId].isSufficient = true;

        emit FundProvision(_fundId);
    }

    function withdrawFund(
        uint256 _fundId,
        address _receiver,
        uint256 _quantity
    ) external validFund(_fundId) onlyInitiator(_fundId) nonReentrant whenNotPaused {
        Fund memory fund = funds[_fundId];
        if (fund.isSufficient == false || _quantity > fund.totalQuantity) {
            revert InsufficientFunds();
        }

        unchecked {
            funds[_fundId].totalQuantity -= _quantity;
        }

        CurrencyHandler.sendCurrency(
            fund.mainCurrency,
            _receiver,
            fund.mainDenomination * _quantity
        );
        for (uint256 i; i < fund.extraCurrencies.length; ++i) {
            CurrencyHandler.sendCurrency(
                fund.extraCurrencies[i],
                _receiver,
                fund.extraDenominations[i] * _quantity
            );
        }

        emit FundWithdrawal(
            _fundId,
            _receiver,
            _quantity
        );
    }
}
