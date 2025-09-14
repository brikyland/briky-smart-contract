// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

/// contracts/common/interfaces/
import {ICommon} from "../../common/interfaces/ICommon.sol";
import {IExclusiveToken} from "../../common/interfaces/IExclusiveToken.sol";

/**
 *  @author Briky Team
 *
 *  @notice Interface for contract `StakeToken`.
 *  @notice The `StakeToken` contract is an exclusive ERC-20 token that allows holders to stake primary tokens
 *          to earn rewards and participate in the ecosystem with enhanced benefits and discounts.
 *
 *  @dev    The contract manages staking of primary tokens with interest accumulation and reward distribution.
 *          Staked tokens earn rewards through periodic reward fetching from the primary token contract based
 *          on wave progression. Each stake token has different reward rates and culminating conditions.
 *  @dev    The token supports promotion functionality allowing holders to migrate their stake to successor
 *          stake token contracts for enhanced benefits. Unstaking is only available after reward distribution
 *          has been completed for the specific stake token.
 *  @dev    Staking fees may apply after reward distribution culmination to contribute liquidity to the treasury.
 *          The exclusive discount rate is calculated based on the stake proportion relative to global stakes.
 *  @dev    ERC-20 tokens are identified by their contract addresses.
 *          Native coin is represented by the zero address (0x0000000000000000000000000000000000000000).
 */
interface IStakeToken is
ICommon,
IExclusiveToken {
    /** ===== EVENT ===== **/
    /* --- Configuration --- */
    /**
     *  @notice Emitted when staking fee rate is updated.
     *
     *          Name        Description
     *  @param  newRate     New fee rate.
     */
    event FeeRateUpdate(
        Rate newRate
    );

    /* --- Staking Operations --- */
    /**
     *  @notice Emitted when rewards are fetched from the primary token contract.
     *
     *          Name        Description
     *  @param  value       Amount of reward tokens fetched.
     */
    event RewardFetch(
        uint256 value
    );

    /**
     *  @notice Emitted when a holder promotes their stake to a successor stake token contract.
     *
     *          Name        Description
     *  @param  account     Holder address who performed the promotion.
     *  @param  value       Amount of tokens promoted to successor contract.
     */
    event Promotion(
        address indexed account,
        uint256 value
    );

    /**
     *  @notice Emitted when primary tokens are staked into the contract.
     *
     *          Name        Description
     *  @param  account     Account address receiving the stake tokens.
     *  @param  value       Amount of primary tokens staked.
     */
    event Stake(
        address indexed account,
        uint256 value
    );

    /**
     *  @notice Emitted when stake tokens are unstaked back to primary tokens.
     *
     *          Name        Description
     *  @param  account     Account address that unstaked tokens.
     *  @param  value       Amount of primary tokens unstaked.
     */
    event Unstake(
        address indexed account,
        uint256 value
    );


    /** ===== ERROR ===== **/
    error AlreadyStartedRewarding();
    error InvalidPromoting();
    error NoStakeholder();
    error NoSuccessor();
    error NotStartedRewarding();
    error NotCompletedRewarding();
    error OnCoolDown();


    /** ===== FUNCTION ===== **/
    /* --- Dependency --- */
    /**
     *          Name            Description
     *  @return primaryToken    Primary token contract address.
     */
    function primaryToken() external view returns (address primaryToken);

    /* --- Query --- */
    /**
     *          Name        Description
     *  @return timestamp   Timestamp of the last reward fetch operation.
     */
    function lastRewardFetch() external view returns (uint256 timestamp);

    /**
     *          Name    Description
     *  @return rate    Current fee rate.
     */
    function getFeeRate() external view returns (Rate memory rate);


    /* --- Command --- */
    /**
     *  @notice Fetch reward tokens from the primary token contract based on wave progression.
     *
     *  @dev    Rewards are distributed to stakeholders based on their proportional stake weight.
     *  @dev    Reward fetching may be subject to cooldown periods and wave limitations.
     */
    function fetchReward() external;

    /**
     *  @notice Promote staked tokens to a successor stake token contract for enhanced benefits.
     *
     *          Name        Description
     *  @param  value       Amount of tokens to promote to successor contract.
     *
     *  @dev    Promotion is only available before reward distribution culmination.
     *  @dev    A successor contract must be assigned for promotion to be possible.
     */
    function promote(
        uint256 value
    ) external;

    /**
     *  @notice Stake primary tokens into the contract to receive stake tokens with interest accumulation.
     *
     *          Name        Description
     *  @param  account     Account address that will receive the stake tokens.
     *  @param  value       Amount of primary tokens to stake.
     *
     *  @dev    Staking fees may apply after reward distribution culmination.
     *  @dev    Staked tokens earn interest through reward distribution waves.
     */
    function stake(
        address account,
        uint256 value
    ) external;

    /**
     *  @notice Unstake tokens back to primary tokens with accumulated interest.
     *
     *          Name        Description
     *  @param  value       Amount of stake tokens to unstake.
     *
     *  @dev    Unstaking is only available after reward distribution has been completed.
     *  @dev    The returned amount includes accumulated interest from rewards.
     */
    function unstake(
        uint256 value
    ) external;
}
