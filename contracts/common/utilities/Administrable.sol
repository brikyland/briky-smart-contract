// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

/// contracts/common/interfaces/
import {IAdmin} from "../interfaces/IAdmin.sol";
import {ICommon} from "../interfaces/ICommon.sol";

/**
 *  @author Briky Team
 *
 *  @notice Utility contract that provides modifiers to query administrative information from the `Admin` contract.
 *
 *  @dev    ERC-20 tokens are identified by their contract addresses.
 *          Native coin is represented by the zero address (0x0000000000000000000000000000000000000000).
 */
abstract contract Administrable is
ICommon {
    /** ===== MODIFIER ===== **/
    /**
     *  @notice Verify the sender is authorized as a manager.
     */
    modifier onlyManager() {
        if (!IAdmin(this.admin()).isManager(msg.sender)) {
            revert Unauthorized();
        }
        _;
    }

    /**
     *  @notice Verify the sender is authorized as a manager or a moderator.
     */
    modifier onlyExecutive() {
        if (!IAdmin(this.admin()).isExecutive(msg.sender)) {
            revert Unauthorized();
        }
        _;
    }

    /**
     *  @notice Verify an address is authorized as a governor.
     *
     *          Name        Description
     *  @param  _account    EVM address.
     */
    modifier validGovernor(
        address _account
    ) {
        if (!IAdmin(this.admin()).isGovernor(_account)) {
            revert Unauthorized();
        }
        _;
    }

    /**
     *  @notice Verify a currency is interactable within the system.
     *
     *          Name        Description
     *  @param  _currency   Currency address.
     */
    modifier onlyAvailableCurrency(
        address _currency
    ) {
        if (!IAdmin(this.admin()).isAvailableCurrency(_currency)) {
            revert InvalidCurrency();
        }
        _;
    }
}
