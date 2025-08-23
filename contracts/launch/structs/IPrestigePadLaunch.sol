// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IRate} from "../../common/structs/IRate.sol";

interface IPrestigePadLaunch is IRate {
    struct PrestigePadLaunch {
        uint256 projectId;
        string uri;
        uint256 currentIndex;
        uint256[] roundIds;
        Rate feeRate;
        address initiator;
        bool isFinalized;
    }
}
