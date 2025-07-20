// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ICommon} from "./ICommon.sol";
import {IValidation} from "../structs/IValidation.sol";

interface IValidatable is
ICommon,
IValidation {
    event ValidatorUpdate(address newAddress);

    error ValidationExpired();
    error InvalidNonce();
    error InvalidSignature();

    function validator() external view returns (address validator);

    function isNonceUsed(uint256 nonce) external view returns (bool isUsed);
}
