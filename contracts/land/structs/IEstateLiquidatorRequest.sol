// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IRate} from "../../common/structs/IRate.sol";

interface IEstateLiquidatorRequest is IRate {
    struct EstateLiquidatorRequest {
        uint256 estateId;
        uint256 proposalId;
        uint256 value;
        address currency;
        Rate feeRate;
        address buyer;
    }
}
