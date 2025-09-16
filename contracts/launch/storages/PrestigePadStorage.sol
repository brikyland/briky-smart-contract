// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

/// contracts/launch/interfaces/
import {IPrestigePad} from "../interfaces/IPrestigePad.sol";

/**
 *  @author Briky Team
 *
 *  @notice Storage contract for contract `PrestigePad`.
 */
abstract contract PrestigePadStorage is
IPrestigePad {
    /// @dev    contributions[roundId][account]
    mapping(uint256 => mapping(address => uint256)) public contributions;

    /// @dev    withdrawAt[roundId][account]
    mapping(uint256 => mapping(address => uint256)) public withdrawAt;


    /// @dev    launches[launchId]
    mapping(uint256 => PrestigePadLaunch) internal launches;

    /// @dev    rounds[roundId]
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
