// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

/// contracts/common/interfaces/
import {ICommon} from "../../common/interfaces/ICommon.sol";

/// contracts/launch/interfaces/
import {IProjectTokenReceiver} from "./IProjectTokenReceiver.sol";


/**
 *  @author Briky Team
 *
 *  @notice Interface for contract `ProjectLaunchpad`.
 * 
 *  @notice TODO:
 */
interface IProjectLaunchpad is
ICommon,
IProjectTokenReceiver {
    /** ===== EVENT ===== **/
    /**
     *  @notice Emitted when a project token is withdrawn.
     *
     *          Name            Description
     *  @param  launchId        Launch identifier.
     *  @param  roundId         Round identifier.
     *  @param  withdrawer      Withdrawer address.
     *  @param  amount          Withdrawn amount.
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
     * 
     *  @return isFinalized     Whether the launch is finalized.
     */
    function isFinalized(
        uint256 launchId
    ) external view returns (bool isFinalized);

    /**
     *  @notice TODO: Check the allocation of a launch at a specific timestamp.
     *
     *          Name            Description
     *  @param  account         Account address.
     *  @param  launchId        Launch identifier.
     *  @param  at              Reference timestamp.
     *
     *  @return allocation      Allocation of the account at the reference timestamp.
     */
    function allocationOfAt(
        address account,
        uint256 launchId,
        uint256 at
    ) external view returns (uint256 allocation);

    /**
     *  @notice TODO: Withdraw the project tokens from a round of a launch.
     *
     *          Name            Description
     *  @param  launchId        Launch identifier.
     *  @param  index           Index of the round to withdraw from.
     *
     *  @return amount          Project tokens amount.
     */
    function withdrawProjectToken(
        uint256 launchId,
        uint256 index
    ) external returns (uint256 amount);
}
