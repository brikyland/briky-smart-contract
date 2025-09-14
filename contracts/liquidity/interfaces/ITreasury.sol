// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import {ICommon} from "../../common/interfaces/ICommon.sol";

interface ITreasury is ICommon {
    event PrimaryTokenUpdate(address newAddress);

    event OperationFundWithdrawal(uint256 value, address operator);

    event LiquidityProvision(
        address indexed provider,
        uint256 value,
        uint256 fee
    );
    event LiquidityWithdrawal(
        address indexed withdrawer,
        uint256 value
    );

    function currency() external view returns (address currency);
    function primaryToken() external view returns (address primaryToken);

    function operationFund() external view returns (uint256 fund);
    function liquidity() external view returns (uint256 liquidity);

    function provideLiquidity(uint256 value) external;
    function withdrawLiquidity(address receiver, uint256 value) external;
}
