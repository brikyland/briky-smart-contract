// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IDistribution {
    struct Distribution {
        uint256 totalAmount;
        uint256 withdrawnAmount;
        address receiver;
        uint40 distributeAt;
        uint40 vestingDuration;
        bool isStaked;
    }
}
