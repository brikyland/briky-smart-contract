// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

library EstateLiquidatorConstant {
    uint256 internal constant UNANIMOUS_GUARD_DURATION = 365 days;
    uint256 internal constant UNANIMOUS_QUORUM_RATE = 1 ether;
    uint256 internal constant MAJORITY_QUORUM_RATE = 0.75 ether;

    uint40 internal constant ADMISSION_DURATION = 30 days;
    uint40 internal constant VOTE_DURATION = 30 days;
}
