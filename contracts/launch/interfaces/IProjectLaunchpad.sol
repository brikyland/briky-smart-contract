// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

/// contracts/common/interfaces/
import {ICommon} from "../../common/interfaces/ICommon.sol";

/// contracts/launch/interfaces/
import {IProjectTokenReceiver} from "./IProjectTokenReceiver.sol";


/**
 *  @author Briky Team
 *
 *  @notice Interface for launchpad contracts of `ProjectToken`.
 * 
 *  @notice An `IProjectLaunchpad` contract facilitates project fundraising through launches comprising multiple investment
 *          rounds, accordingly instructs `EstateToken` to securitize a real estate into a new class of tokens and receive them
 *          for subsequent distribution to contributors.
 */
interface IProjectLaunchpad is
ICommon,
IProjectTokenReceiver {
    /** ===== EVENT ===== **/
    /**
     *  @notice Emitted when an contributor withdraw allocation from a launch.
     *
     *          Name        Description
     *  @param  launchId    Launch identifier.
     *  @param  roundId     Round identifier.
     *  @param  withdrawer  Withdrawer address.
     *  @param  amount      Withdrawn amount.
     */
    event ProjectTokenWithdrawal(
        uint256 indexed launchId,
        uint256 indexed roundId,
        address indexed withdrawer,
        uint256 amount
    );


    /** ===== ERROR ===== **/
    error AlreadyFinalized();
    error NotRegisteredInitiator();


    /** ===== FUNCTION ===== **/
    /* --- Query --- */
    /**
     *          Name            Description
     *  @param  launchId        Launch identifier.
     *  @return isFinalized     Whether the launch has settled.
     */
    function isFinalized(
        uint256 launchId
    ) external view returns (bool isFinalized);

    /**
     *          Name            Description
     *  @param  account         EVM address.
     *  @param  launchId        Launch identifier.
     *  @param  at              Reference timestamp.
     *  @return allocation      Allocation of the account at the reference timestamp.
     */
    function allocationOfAt(
        address account,
        uint256 launchId,
        uint256 at
    ) external view returns (uint256 allocation);

    /* --- Command --- */
    /**
     *  @notice Withdraw the allocation of the message sender from a round of a launch.
     *
     *          Name            Description
     *  @param  launchId        Launch identifier.
     *  @param  index           Index of the round in the launch.
     *  @return amount          Withdrawn amount.
     */
    function withdrawProjectToken(
        uint256 launchId,
        uint256 index
    ) external returns (uint256 amount);
}
