// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

/// contracts/common/interfaces/
import {ICommon} from "../../common/interfaces/ICommon.sol";
import {IExclusiveToken} from "../../common/interfaces/IExclusiveToken.sol";

/**
 *  @author Briky Team
 *
 *  @notice Interface for contract `StakeToken`.
 *  @notice A `StakeToken` contract is an ERC-20 token representing a staking pool of `PrimaryToken` that accrues periodic
 *          rewards. For each staked primary token, an equivalent amount of derived stake token is minted as a placeholder
 *          balance, which increases as rewards are earned. Transferring stake tokens also transfers the underlying staked
 *          value of primary token. After culmination of the pool, unstaking allows stakers to redeem the exact amount of
 *          primary tokens.
 *  @notice There are 3 staking pools with different configurations:
 *          -   Staking pool #1: Culminates in wave  750, 2,000,000 tokens each wave.
 *          -   Staking pool #2: Culminates in wave 1500, 3,000,000 tokens each wave.
 *          -   Staking pool #3: Culminates in wave 2250, 4,000,000 tokens each wave.
 *  @notice Each rewarding wave has 1-day cooldown and the reward is distributed among stakers in proportion to their balances.
 *  @notice After all three staking pool have culminated, the staking pool #3 may still fetch new wave with the reward capped
 *          at the lesser between its standard wave reward and the remaining mintable tokens to reach the maximum supply cap.
 *  @notice Before a staking pool culminates, unstaking is prohibited, but stakers may promote their position into
 *          higher-number staking pool. After culmination, unstaking is permitted while new staking incurs a fee that is
 *          contributed to the treasury liquidity.
 *  @notice Exclusive Discount: `15% + primaryDiscount * (globalStake - totalSupply) / (2 * globalStake)`.
 *          Note:   `primaryDiscount` is the exclusive discount of the primary token.
 *                  `globalStake` is the total tokens staked in 3 pools.
 *
 *  @dev    Staking fee after culmination: `value / totalSupply * treasuryLiquidity * feeRate`.
 *          Note:   `value` is the staking value that derives fee.
 *                  `treasuryLiquidity` is the liquidity reserved in the treasury.
 *                  `feeRate` is an admin-adjustable subunitary value.
 *
 *  @dev    ERC-20 tokens are identified by their contract addresses.
 *          Native coin is represented by the zero address (0x0000000000000000000000000000000000000000).
 */
interface IStakeToken is
ICommon,
IExclusiveToken {
    /** ===== EVENT ===== **/
    /* --- Configuration --- */
    /**
     *  @notice Emitted when the staking fee rate is updated.
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
     *  @notice Emitted when primary tokens are staked into this contract.
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
    error NoStake();
    error NoSuccessor();
    error NotStartedRewarding();
    error NotCulminated();
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
     *  @return rate    Current staking fee rate.
     */
    function getFeeRate() external view returns (Rate memory rate);


    /* --- Command --- */
    /**
     *  @notice Fetch reward tokens from the primary token contract based on wave progression.
     *
     *  @dev    Rewards are distributed to stakers based on their proportional stake weight.
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
     *  @notice Stake primary tokens into this contract to receive stake tokens with interest accumulation.
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
