// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IRate} from "../../common/structs/IRate.sol";

interface IBrokerRegistry is IRate {
    struct BrokerRegistry {
        Rate commissionRate;
        uint40 expireAt;
    }
}
