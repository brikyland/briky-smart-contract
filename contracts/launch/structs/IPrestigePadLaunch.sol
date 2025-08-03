// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IPrestigePadLaunch {
    struct PrestigePadLaunch {
        uint256 projectId;
        string uri;
        uint256 currentIndex;
        uint256[] roundIds;
        address initiator;
        bool isFinalized;
    }
}
