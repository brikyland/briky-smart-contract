// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ICommon} from "../../common/interfaces/ICommon.sol";

interface IDriptributor is ICommon {
    struct Distribution {
        uint256 totalAmount;
        uint256 withdrawnAmount;
        address receiver;
        uint40 distributeAt;
        uint40 vestingDuration;
        bool isStaked;
    }

    event NewDistribution(
        uint256 indexed distributionId,
        address indexed receiver,
        uint40 distributeAt,
        uint40 vestingDuration,
        uint256 totalAmount
    );
    event Stake(uint256 indexed distributionId, uint256 amount);
    event Withdrawal(uint256 indexed distributionId, uint256 amount);

    error AlreadyStaked();
    error InvalidDistributionId();

    function admin() external view returns (address admin);
    function primaryToken() external view returns (address primaryToken);
    function stakeToken() external view returns (address stakeToken);

    function distributedAmount() external view returns (uint256 distributedAmount);
    function distributionNumber() external view returns (uint256 distributionNumber);
    function totalAmount() external view returns (uint256 totalAmount);

    function getDistribution(uint256 distributionId) external view returns (Distribution memory distribution);

    function withdraw(uint256[] calldata distributionIds) external;
    function stake(uint256[] calldata distributionIds) external;

}
