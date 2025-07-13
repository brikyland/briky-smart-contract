// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ReentrancyGuardUpgradeable} from "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";

import {CurrencyHandler} from "../lib/CurrencyHandler.sol";
import {Formula} from "../lib/Formula.sol";

import {IAdmin} from "./interfaces/IAdmin.sol";
import {IGovernor} from "./interfaces/IGovernor.sol";

import {Administrable} from "./utilities/Administrable.sol";
import {Pausable} from "./utilities/Pausable.sol";

import {PaymentHubStorage} from "./storages/PaymentHubStorage.sol";

contract PaymentHub is
PaymentHubStorage,
Administrable,
Pausable,
ReentrancyGuardUpgradeable {
    using Formula for uint256;

    string constant private VERSION = "v1.1.1";

    modifier validPayment(uint256 _paymentId) {
        if (_paymentId == 0 || _paymentId > paymentNumber) {
            revert InvalidPaymentId();
        }
        _;
    }

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

    function getPayment(uint256 _paymentId)
    external view validPayment(_paymentId) returns (Payment memory) {
        return payments[_paymentId];
    }

    function issuePayment(
        address _governor,
        uint256 _tokenId,
        uint256 _value,
        address _currency
    ) external payable nonReentrant onlyAvailableCurrency(_currency) whenNotPaused returns (uint256) {
        IAdmin adminContract = IAdmin(admin);
        if (!adminContract.isGovernor(_governor)) {
            revert InvalidGovernor();
        }
        if (!IGovernor(_governor).isAvailable(_tokenId)) {
            revert InvalidTokenId();
        }

        if (_value == 0) {
            revert InvalidInput();
        }

        CurrencyHandler.receiveCurrency(_currency, _value);

        uint256 totalWeight = IGovernor(_governor).totalVoteAt(_tokenId, block.timestamp);

        uint256 paymentId = ++paymentNumber;
        payments[paymentId] = Payment(
            _tokenId,
            totalWeight,
            _value,
            _currency,
            uint40(block.timestamp),
            _governor
        );

        emit NewPayment(
            _governor,
            _tokenId,
            msg.sender,
            totalWeight,
            _value,
            _currency
        );

        return paymentId;
    }

    function withdraw(uint256[] calldata _paymentIds)
    external nonReentrant whenNotPaused {
        for (uint256 i = 0; i < _paymentIds.length; ++i) {
            if (_paymentIds[i] == 0 || _paymentIds[i] > paymentNumber) {
                revert InvalidPaymentId();
            }
            if (hasWithdrawn[_paymentIds[i]][msg.sender]) {
                revert AlreadyWithdrawn();
            }

            Payment storage payment = payments[_paymentIds[i]];

            uint256 weight = IGovernor(payment.governor).voteOfAt(
                msg.sender,
                payment.tokenId,
                payment.at
            );
            uint256 remainWeight = payment.remainWeight;

            if (weight == 0) {
                revert InvalidWithdrawing();
            }

            if (weight > remainWeight) {
                revert InsufficientFunds();
            }

            uint256 value = payment.remainValue.scale(weight, payment.remainWeight);

            payment.remainWeight -= weight;
            payment.remainValue -= value;
            hasWithdrawn[_paymentIds[i]][msg.sender] = true;

            CurrencyHandler.sendCurrency(payment.currency, msg.sender, value);

            emit Withdrawal(
                _paymentIds[i],
                msg.sender,
                value
            );
        }
    }
}
