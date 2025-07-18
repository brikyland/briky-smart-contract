// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IEstateLiquidatorRequest {
    struct EstateLiquidatorRequest {
        uint256 estateId;
        uint256 proposalId;
        uint256 value;
        address currency;
        address buyer;
    }
}
