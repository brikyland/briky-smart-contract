// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IPrestigePad} from "../interfaces/IPrestigePad.sol";

abstract contract PrestigePadStorage is IPrestigePad {
    mapping(uint256 => mapping(address => uint256)) public deposits;
    mapping(uint256 => mapping(address => uint256)) public withdrawAt;

    mapping(uint256 => PrestigePadLaunch) internal launches;
    mapping(uint256 => PrestigePadRound) internal rounds;

    uint256 public launchNumber;
    uint256 public roundNumber;

    uint256 public baseMinUnitPrice;
    uint256 public baseMaxUnitPrice;

    address public admin;
    address public projectToken;
    address public feeReceiver;
    address public priceWatcher;
    address public reserveVault;

    uint256[50] private __gap;
}
