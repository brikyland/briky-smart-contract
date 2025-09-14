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
 *  @notice The `Driptributor` contract manages token distribution with vesting schedules, allowing receivers to
 *          withdraw vested tokens gradually or stake them directly into stake token contracts for enhanced benefits.
 *
 *  @dev    The contract creates distributions with specified total amounts, receivers, and vesting durations.
 *          Each distribution has a unique identifier and tracks the withdrawn amount and staking status.
 *          Receivers can withdraw vested tokens based on time progression or stake their entire remaining
 *          allocation across multiple stake token contracts.
 *  @dev    Distributions support flexible staking where receivers can choose how to allocate their tokens
 *          between different stake token contracts, with any remaining amount automatically assigned to
 *          the third stake token contract.
 *  @dev    The contract maintains a total allocation limit to ensure distributed amounts do not exceed
 *          the available token supply. Administrative operations are required to create new distributions.
 *  @dev    ERC-20 tokens are identified by their contract addresses.
 *          Native coin is represented by the zero address (0x0000000000000000000000000000000000000000).
 */
interface IDriptributor is
IDistribution,
ICommon {
    /** ===== EVENT ===== **/
    /* --- Configuration --- */
    /**
     *  @notice Emitted when stake token contract addresses are updated.
     *
     *          Name            Description
     *  @param  newAddress1     New stake token #1 contract address.
     *  @param  newAddress2     New stake token #2 contract address.
     *  @param  newAddress3     New stake token #3 contract address.
     */
    event StakeTokensUpdate(
        address newAddress1,
        address newAddress2,
        address newAddress3
    );

    /* --- Distribution Operations --- */
    /**
     *  @notice Emitted when a new token distribution is created.
     *
     *          Name                Description
     *  @param  distributionId      Unique identifier for the distribution.
     *  @param  receiver            Address designated to receive the distributed tokens.
     *  @param  distributeAt        Timestamp when distribution begins.
     *  @param  vestingDuration     Duration over which tokens are vested.
     *  @param  amount              Total amount of tokens in the distribution.
     *  @param  data                Additional data associated with the distribution.
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
     *  @notice Emitted when a receiver stakes their distribution tokens across stake token contracts.
     *
     *          Name                Description
     *  @param  distributionIds     Array of distribution identifiers being staked.
     *  @param  stake1              Amount staked in stake token #1.
     *  @param  stake2              Amount staked in stake token #2.
     *  @param  stake3              Amount staked in stake token #3 (remaining allocation).
     */
    event Stake(
        uint256[] distributionIds,
        uint256 stake1,
        uint256 stake2,
        uint256 stake3
    );

    /**
     *  @notice Emitted when a receiver withdraws vested tokens from a distribution.
     *
     *          Name                Description
     *  @param  distributionId      Distribution identifier from which tokens were withdrawn.
     *  @param  amount              Amount of tokens withdrawn.
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
     *  @return primaryToken    Primary token contract address.
     */
    function primaryToken() external view returns (address primaryToken);

    /**
     *          Name            Description
     *  @return stakeToken1     Stake token #1 contract address.
     */
    function stakeToken1() external view returns (address stakeToken1);

    /**
     *          Name            Description
     *  @return stakeToken2     Stake token #2 contract address.
     */
    function stakeToken2() external view returns (address stakeToken2);

    /**
     *          Name            Description
     *  @return stakeToken3     Stake token #3 contract address.
     */
    function stakeToken3() external view returns (address stakeToken3);

    /* --- Query --- */
    /**
     *          Name                Description
     *  @return distributedAmount   Total amount of tokens distributed across all distributions.
     */
    function distributedAmount() external view returns (uint256 distributedAmount);

    /**
     *          Name                Description
     *  @return distributionNumber  Current number of distributions created.
     */
    function distributionNumber() external view returns (uint256 distributionNumber);

    /**
     *          Name                Description
     *  @return totalAllocation     Total allocation limit for token distributions.
     */
    function totalAllocation() external view returns (uint256 totalAllocation);

    /**
     *          Name            Description
     *  @param  distributionId  Distribution identifier to query.
     *
     *  @return distribution    Distribution information including total amount, withdrawn amount, receiver address,
     *                          distribution timestamp, vesting duration, and staking status.
     */
    function getDistribution(
        uint256 distributionId
    ) external view returns (Distribution memory distribution);

    /* --- Command --- */
    /**
     *  @notice Stake tokens from multiple distributions across stake token contracts.
     *
     *          Name                Description
     *  @param  distributionIds     Array of distribution identifiers to stake from.
     *  @param  stake1              Amount to stake in stake token #1.
     *  @param  stake2              Amount to stake in stake token #2.
     *
     *  @return stake3              Amount automatically staked in stake token #3 (remaining allocation).
     *
     *  @dev    The remaining allocation after stake1 and stake2 is automatically staked in stake token #3.
     *  @dev    Distributions must not have been previously staked and must belong to the caller.
     *  @dev    Total available amount is the sum of (totalAmount - withdrawnAmount) for all specified distributions.
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
     *  @param  distributionIds     Array of distribution identifiers to withdraw from.
     *
     *  @return totalAmount         Total amount of tokens withdrawn from all distributions.
     *
     *  @dev    Only vested tokens based on time progression can be withdrawn.
     *  @dev    Distributions must not have been staked and must belong to the caller.
     *  @dev    Vesting is calculated based on the time elapsed since distribution start and vesting duration.
     */
    function withdraw(
        uint256[] calldata distributionIds
    ) external returns (uint256 totalAmount);
}
