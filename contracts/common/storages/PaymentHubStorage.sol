// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IPaymentHub} from "../interfaces/IPaymentHub.sol";

abstract contract PaymentHubStorage is IPaymentHub {
    mapping(uint256 => mapping(address => bool)) public hasWithdrawn;

    mapping(uint256 => Payment) internal payments;

    uint256 public paymentNumber;

    address public admin;

    uint256[50] private __gap;
}
