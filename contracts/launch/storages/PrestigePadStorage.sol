// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IPrestigePad} from "../interfaces/IPrestigePad.sol";

abstract contract PrestigePadStorage is IPrestigePad {
    mapping(bytes32 => mapping(address => string)) public originatorURIs;

    mapping(uint256 => mapping(address => uint256)) public deposits;
    mapping(uint256 => mapping(address => bool)) public hasWithdrawn;

    mapping(address => bool) public isWhitelisted;

    mapping(uint256 => PrestigePadRequest) internal requests;
    mapping(uint256 => PrestigePadRound) internal rounds;

    uint256 public requestNumber;
    uint256 public roundNumber;

    uint256 public baseMinUnitPrice;
    uint256 public baseMaxUnitPrice;

    uint256 internal feeRate;

    address public admin;
    address public projectToken;
    address public feeReceiver;
    address public priceWatcher;
    address public reserveVault;

    uint256[50] private __gap;
}
