// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IRoyaltyRateProposer} from "../interfaces/IRoyaltyRateProposer.sol";

abstract contract RoyaltyRateProposerStorage is IRoyaltyRateProposer {
    uint256 internal royaltyRate;

    uint256[50] private __gap;
}
