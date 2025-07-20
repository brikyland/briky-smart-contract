// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IPriceFeed {
    struct PriceFeed {
        address feed;
        uint40 heartbeat;
    }
}
