// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import {ReentrancyGuardUpgradeable} from "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";

import {CurrencyHandler} from "./utilities/CurrencyHandler.sol";
import {Formula} from "./utilities/Formula.sol";

import {IAdmin} from "./interfaces/IAdmin.sol";
import {IGovernor} from "./interfaces/IGovernor.sol";

import {DividendHubStorage} from "./storages/DividendHubStorage.sol";

import {Administrable} from "./utilities/Administrable.sol";
import {Pausable} from "./utilities/Pausable.sol";

contract DividendHub is
DividendHubStorage,
Administrable,
Pausable,
ReentrancyGuardUpgradeable {
    using Formula for uint256;

    string constant private VERSION = "v1.2.1";

    modifier validDividend(uint256 _dividendId) {
        if (_dividendId == 0 || _dividendId > dividendNumber) {
            revert InvalidDividendId();
        }
        _;
    }

    /**
     *  @notice Executed on a call to the contract with empty calldata.
     */
    receive() external payable {}

    function initialize(
        address _admin
    ) external initializer {
        __Pausable_init();
        __ReentrancyGuard_init();

        admin = _admin;
    }

    function version() external pure returns (string memory) {
        return VERSION;
    }

    function getDividend(uint256 _dividendId)
    external view validDividend(_dividendId) returns (Dividend memory) {
        return dividends[_dividendId];
    }

    function issueDividend(
        address _governor,
        uint256 _tokenId,
        uint256 _value,
        address _currency,
        string calldata _data
    ) external payable nonReentrant onlyAvailableCurrency(_currency) validGovernor(_governor) whenNotPaused returns (uint256) {
        if (!IGovernor(_governor).isAvailable(_tokenId)) {
            revert InvalidTokenId();
        }

        if (_value == 0) {
            revert InvalidInput();
        }

        CurrencyHandler.receiveCurrency(_currency, _value);

        uint256 totalWeight = IGovernor(_governor).totalEquityAt(_tokenId, block.timestamp);

        uint256 dividendId = ++dividendNumber;
        dividends[dividendId] = Dividend(
            _tokenId,
            totalWeight,
            _value,
            _currency,
            uint40(block.timestamp),
            _governor
        );

        emit NewDividend(
            _governor,
            _tokenId,
            msg.sender,
            totalWeight,
            _value,
            _currency,
            _data
        );

        return dividendId;
    }

    function withdraw(uint256[] calldata _dividendIds)
    external nonReentrant whenNotPaused {
        for (uint256 i; i < _dividendIds.length; ++i) {
            if (_dividendIds[i] == 0 || _dividendIds[i] > dividendNumber) {
                revert InvalidDividendId();
            }
            if (withdrawAt[_dividendIds[i]][msg.sender] > 0) {
                revert AlreadyWithdrawn();
            }

            Dividend storage dividend = dividends[_dividendIds[i]];

            uint256 weight = IGovernor(dividend.governor).equityOfAt(
                msg.sender,
                dividend.tokenId,
                dividend.at
            );
            uint256 remainWeight = dividend.remainWeight;

            if (weight == 0) {
                revert InvalidWithdrawing();
            }

            if (weight > remainWeight) {
                revert InsufficientFunds();
            }

            uint256 value = dividend.remainValue.scale(weight, dividend.remainWeight);

            dividend.remainWeight -= weight;
            dividend.remainValue -= value;
            withdrawAt[_dividendIds[i]][msg.sender] = block.timestamp;

            CurrencyHandler.sendCurrency(dividend.currency, msg.sender, value);

            emit Withdrawal(
                _dividendIds[i],
                msg.sender,
                value
            );
        }
    }
}
