// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

/// contracts/common/interfaces/
import {ICommon} from "../../common/interfaces/ICommon.sol";

/// contracts/liquidity/structs/
import {IDistribution} from "../structs/IDistribution.sol";

/**
 *  @author Briky Team
 *
 *  @notice Interface for contract `Driptributor`.
 *  @notice The `Driptributor` contract facilitates distribution of `PrimaryToken` through a continuous vesting mechanism.
 *  @notice Token allocations vest evenly on a per-second basis after distribution.
 *  @notice When the staking pools are opened, accounts that have unwithdrawn allocation can stake all their remain tokens.
 */
interface IDriptributor is
IDistribution,
ICommon {
    /** ===== EVENT ===== **/
    /* --- Distribution --- */
    /**
     *  @notice Emitted when a new token distribution is created.
     *
     *          Name                Description
     *  @param  distributionId      Distribution identifier.
     *  @param  receiver            Receiver address.
     *  @param  distributeAt        Distribution timestamp.
     *  @param  vestingDuration     Vesting duration.
     *  @param  amount              Distributed amount.
     *  @param  data                Distribution note.
     */
    event NewDistribution(
        uint256 indexed distributionId,
        address indexed receiver,
        uint40 distributeAt,
        uint40 vestingDuration,
        uint256 amount,
        string data
    );


    /**
     *  @notice Emitted when the same receiver of multiple distributions stakes unwithdrawn allocations.
     *
     *          Name                Description
     *  @param  distributionIds     Array of distribution identifiers.
     *  @param  stake1              Staked amount for staking pool #1.
     *  @param  stake2              Staked amount for staking pool #2.
     *  @param  stake3              Staked amount for staking pool #3.
     */
    event Stake(
        uint256[] distributionIds,
        uint256 stake1,
        uint256 stake2,
        uint256 stake3
    );


    /**
     *  @notice Emitted when the receiver of a distribution withdraws vested allocation.
     *
     *          Name                Description
     *  @param  distributionId      Distribution identifier.
     *  @param  amount              Withdrawn amount.
     */
    event Withdrawal(
        uint256 indexed distributionId,
        uint256 amount
    );


    /** ===== ERROR ===== **/
    error AlreadyStaked();
    error NotAssignedStakeTokens();
    error InvalidDistributionId();


    /** ===== FUNCTION ===== **/
    /* --- Dependency --- */
    /**
     *          Name            Description
     *  @return primaryToken    `PrimaryToken` contract address.
     */
    function primaryToken() external view returns (address primaryToken);

    /**
     *          Name            Description
     *  @return stakeToken1     `StakeToken` contract address #1.
     */
    function stakeToken1() external view returns (address stakeToken1);

    /**
     *          Name            Description
     *  @return stakeToken2     `StakeToken` contract address #2.
     */
    function stakeToken2() external view returns (address stakeToken2);

    /**
     *          Name            Description
     *  @return stakeToken3     `StakeToken` contract address #3.
     */
    function stakeToken3() external view returns (address stakeToken3);


    /* --- Query --- */
    /**
     *          Name                Description
     *  @return totalAllocation     Total tokens to distribute.
     */
    function totalAllocation() external view returns (uint256 totalAllocation);


    /**
     *          Name                Description
     *  @return distributedAmount   Total distributed tokens.
     */
    function distributedAmount() external view returns (uint256 distributedAmount);


    /**
     *          Name                Description
     *  @return distributionNumber  Number of distributions.
     */
    function distributionNumber() external view returns (uint256 distributionNumber);


    /**
     *          Name            Description
     *  @param  distributionId  Distribution identifier.
     *  @return distribution    Distribution information.
     */
    function getDistribution(
        uint256 distributionId
    ) external view returns (Distribution memory distribution);


    /* --- Command --- */
    /**
     *  @notice Stake unwithdrawn tokens from multiple distributions to staking pools.
     *  @notice Stake only when staking pools are opened and assigned.
     *
     *          Name                Description
     *  @param  distributionIds     Array of distribution identifiers.
     *  @param  stake1              Staked amount for staking pool #1.
     *  @param  stake2              Staked amount for staking pool #2.
     *  @return stake3              Staked amount for staking pool #3, which also is the remain tokens.
     */
    function stake(
        uint256[] calldata distributionIds,
        uint256 stake1,
        uint256 stake2
    ) external returns (uint256 stake3);

    /**
     *  @notice Withdraw vested tokens from multiple distributions.
     *
     *          Name                Description
     *  @param  distributionIds     Array of distribution identifiers.
     *  @return totalAmount         Total withdrawn amounts.
     */
    function withdraw(
        uint256[] calldata distributionIds
    ) external returns (uint256 totalAmount);
}
