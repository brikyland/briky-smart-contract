// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import {ICommon} from "../../common/interfaces/ICommon.sol";

interface IDistributor is ICommon {
    event TokenDistribution(address indexed receiver, uint256 amount);

    function primaryToken() external view returns (address stakeToken);
    function treasury() external view returns (address treasury);

    function distributedTokens(address account) external view returns (uint256 totalAmount);
}
