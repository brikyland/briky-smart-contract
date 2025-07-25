// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IPrestigePadRequest {
    struct PrestigePadRequest {
        uint256 projectId;
        string uri;
        uint256 currentIndex;
        uint256[] roundIds;
        address initiator;
        bool isFinalized;
    }
}
