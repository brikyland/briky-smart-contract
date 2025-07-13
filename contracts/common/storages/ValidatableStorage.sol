// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IValidatable} from "../interfaces/IValidatable.sol";

abstract contract ValidatableStorage is IValidatable {
    mapping(uint256 => bool) public isNonceUsed;

    address public validator;

    uint256[50] private __gap;
}
