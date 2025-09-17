// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

/// contracts/common/interfaces/
import {ICommon} from "./ICommon.sol";

/**
 *  @author Briky Team
 *
 *  @notice Interface for contract `FeeReceiver`.
 *  @notice The `FeeReceiver` contract passively receives and holds fee from operators within the system until being withdrawn
 *          on demands of admins.
 *
 *  @dev    ERC-20 tokens are identified by their contract addresses.
 *          Native coin is represented by the zero address (0x0000000000000000000000000000000000000000).
 */
interface IFeeReceiver is
ICommon {
    /** ===== EVENT ===== **/
    /**
     *  @notice Emitted when a sufficient amount of cryptocurrency is withdrawn from this contract to an account.
     *
     *          Name        Description
     *  @param  receiver    Receiver address.
     *  @param  currency    Withdrawn currency address.
     *  @param  value       Withdrawn value.
     */
    event Withdrawal(
        address indexed receiver,
        address currency,
        uint256 value
    );
}
