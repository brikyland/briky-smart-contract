// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ICommon} from "../../common/interfaces/ICommon.sol";

interface IDistributor is ICommon {
    event TokenDistribution(uint256 amount, string data);

    function admin() external view returns (address admin);
    function primaryToken() external view returns (address stakeToken);
    function treasury() external view returns (address treasury);

    function distributedTokens(address account) external view returns (uint256 amount);
}
