// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

/// contracts/common/interfaces/
import {ICommon} from "../../common/interfaces/ICommon.sol";

/**
 *  @author Briky Team
 *
 *  @notice Interface for contract `Distributor`.
 *  @notice The `Distributor` contract manages direct token distribution to multiple receivers through
 *          administrative operations, tracking the total amount distributed to each account.
 *
 *  @dev    The contract allows administrators to distribute primary tokens to multiple receivers
 *          in batch operations. Each distribution is tracked per receiver address, maintaining
 *          a cumulative record of all tokens distributed to each account over time.
 *  @dev    Distribution operations require administrative signatures and are subject to available
 *          token balance verification. The contract serves as a simple distribution mechanism
 *          without vesting or staking features.
 *  @dev    ERC-20 tokens are identified by their contract addresses.
 *          Native coin is represented by the zero address (0x0000000000000000000000000000000000000000).
 */
interface IDistributor is ICommon {
    /** ===== EVENT ===== **/
    /* --- Distribution Operations --- */
    /**
     *  @notice Emitted when tokens are distributed to a receiver.
     *
     *          Name        Description
     *  @param  receiver    Address that received the distributed tokens.
     *  @param  amount      Amount of tokens distributed.
     */
    event TokenDistribution(
        address indexed receiver,
        uint256 amount
    );


    /** ===== FUNCTION ===== **/
    /* --- Dependency --- */
    /**
     *          Name            Description
     *  @return stakeToken      Primary token contract address.
     */
    function primaryToken() external view returns (address stakeToken);

    /**
     *          Name        Description
     *  @return treasury    Treasury contract address.
     */
    function treasury() external view returns (address treasury);


    /* --- Query --- */
    /**
     *          Name            Description
     *  @param  account         Account address to query.
     *
     *  @return totalAmount     Total amount of tokens distributed to the account.
     */
    function distributedTokens(
        address account
    ) external view returns (uint256 totalAmount);
}
