// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ICommon} from "../../common/interfaces/ICommon.sol";

interface ITreasury is ICommon {
    event PrimaryTokenUpdate(address newAddress);

    event OperationFundWithdrawal(uint256 value, address operator);

    event LiquidityProvision(uint256 value, uint256 fee);
    event LiquidityWithdrawal(uint256 value);

    function admin() external view returns (address admin);
    function currency() external view returns (address currency);
    function primaryToken() external view returns (address primaryToken);

    function operationFund() external view returns (uint256 fund);
    function liquidity() external view returns (uint256 liquidity);

    function provideLiquidity(uint256 value) external;
    function withdrawLiquidity(uint256 value) external;
}
