// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

/// contracts/common/interfaces/
import {IAdmin} from "../interfaces/IAdmin.sol";
import {ICommon} from "../interfaces/ICommon.sol";

/**
 *  @author Briky Team
 *
 *  @notice A `Administrable` contract need to query administrative information from the `Admin` contract for its operations.
 *
 *  @dev    ERC-20 tokens are identified by their contract addresses.
 *          Native coin is represented by the zero address (0x0000000000000000000000000000000000000000).
 */
abstract contract Administrable is
ICommon {
    /** ===== MODIFIER ===== **/
    /**
     *  @notice Verify the message sender is an authorized manager.
     */
    modifier onlyManager() {
        if (!IAdmin(this.admin()).isManager(msg.sender)) {
            revert Unauthorized();
        }
        _;
    }

    /**
     *  @notice Verify the message sender is an authorized manager or an authorized moderator.
     */
    modifier onlyExecutive() {
        if (!IAdmin(this.admin()).isExecutive(msg.sender)) {
            revert Unauthorized();
        }
        _;
    }

    /**
     *  @notice Verify an account is an authorized governor contract.
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
