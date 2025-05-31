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

    event StakeTokensUpdate(
        address newAddress1,
        address newAddress2,
        address newAddress3
    );

    event NewDistribution(
        uint256 indexed distributionId,
        address indexed receiver,
        uint40 distributeAt,
        uint40 vestingDuration,
        uint256 amount,
        string data
    );
    event Stake(
        uint256[] distributionIds,
        uint256 stake1,
        uint256 stake2,
        uint256 stake3
    );
    event Withdrawal(uint256 indexed distributionId, uint256 amount);

    error AlreadyStaked();
    error NotAssignedStakeTokens();
    error InvalidDistributionId();

    function primaryToken() external view returns (address primaryToken);
    function stakeToken1() external view returns (address stakeToken1);
    function stakeToken2() external view returns (address stakeToken2);
    function stakeToken3() external view returns (address stakeToken3);

    function distributedAmount() external view returns (uint256 distributedAmount);
    function distributionNumber() external view returns (uint256 distributionNumber);

    function getDistribution(uint256 distributionId) external view returns (Distribution memory distribution);

    function stake(
        uint256[] calldata distributionIds,
        uint256 stake1,
        uint256 stake2
    ) external;
    function withdraw(uint256[] calldata distributionIds) external;
}
