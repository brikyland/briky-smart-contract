// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ICommon} from "../../common/interfaces/ICommon.sol";

import {IProjectTokenReceiver} from "./IProjectTokenReceiver.sol";

interface IProjectLaunchpad is
ICommon,
IProjectTokenReceiver {
    event ProjectTokenWithdrawal(
        uint256 indexed launchId,
        uint256 indexed roundId,
        address indexed withdrawer,
        uint256 amount
    );

    error AlreadyFinalized();
    error NotRegisteredInitiator();

    function isFinalized(uint256 launchId) external view returns (bool isFinalized);

    function allocationOfAt(
        address account,
        uint256 launchId,
        uint256 at
    ) external view returns (uint256 allocation);

    function withdrawProjectToken(uint256 launchId, uint256 index) external returns (uint256 amount);
}
