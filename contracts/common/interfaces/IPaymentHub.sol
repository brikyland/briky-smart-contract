// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ICommon} from "./ICommon.sol";

interface IPaymentHub is ICommon {
    struct Payment {
        uint256 tokenId;
        uint256 remainWeight;
        uint256 remainValue;
        address currency;
        uint40 at;
        address governor;
    }

    event NewPayment(
        address indexed governor,
        uint256 indexed tokenId,
        address indexed issuer,
        uint256 totalWeight,
        uint256 value,
        address currency
    );

    event Withdrawal(
        uint256 indexed tokenId,
        address indexed currency,
        address indexed withdrawer,
        uint256 totalValue
    );

    error AlreadyWithdrawn();
    error InvalidGovernor();
    error InvalidPaymentId();
    error InvalidTokenId();
    error InvalidWithdrawing();

    function issuePayment(
        address governor,
        uint256 tokenId,
        uint256 value,
        address currency
    ) external payable returns (uint256 paymentId);

    function withdraw(uint256 tokenId, address currency)
    external payable returns (uint256 totalValue);
}
