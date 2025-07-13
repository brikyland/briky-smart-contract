// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IValidation {
    struct Validation {
        uint256 nonce;
        uint256 expiry;
        bytes signature;
    }
}
