// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

library EstateLiquidatorConstant {
    uint256 internal constant ESTATE_LIQUIDATOR_UNANIMOUS_GUARD_DURATION = 365 days;
    uint256 internal constant ESTATE_LIQUIDATOR_UNANIMOUS_QUORUM_RATE = 1 ether;
    uint256 internal constant ESTATE_LIQUIDATOR_MAJORITY_QUORUM_RATE = 0.75 ether;
    uint40 internal constant ESTATE_LIQUIDATOR_VOTING_DURATION = 30 days;
    uint40 internal constant ESTATE_LIQUIDATOR_ADMISSION_DURATION = 30 days;
}
