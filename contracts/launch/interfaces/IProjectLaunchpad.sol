// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ICommon} from "../../common/interfaces/ICommon.sol";

import {IProjectTokenReceiver} from "./IProjectTokenReceiver.sol";

interface IProjectLaunchpad is
ICommon,
IProjectTokenReceiver {
    event ProjectTokenWithdrawal(
        uint256 indexed launchId,
        address indexed withdrawer,
        uint256 amount
    );

    function isFinalized(uint256 _launchId) external view returns (bool isFinalized);

    function allocationOfAt(
        uint256 launchId,
        address account,
        uint256 at
    ) external view returns (uint256 allocation);

    function withdrawProjectToken(uint256 tokenizationId) external returns (uint256 amount);
}
