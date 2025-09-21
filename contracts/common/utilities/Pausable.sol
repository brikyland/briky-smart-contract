// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

/// @openzeppelin/contracts-upgradeable/
import {PausableUpgradeable} from "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";

/// contracts/common/interfaces/
import {IAdmin} from "../interfaces/IAdmin.sol";
import {ICommon} from "../interfaces/ICommon.sol";

/**
 *  @author Briky Team
 *
 *  @notice A `Pausable` contract applies pausing mechanism on its methods and can be paused by admins for maintenance or
 *          damage control on attacks.
 */
abstract contract Pausable is
ICommon,
PausableUpgradeable {
    /** ===== FUNCTION ===== **/
    /* --- Administration --- */
    /**
     *  @notice Pause contract.
     *  @notice For maintenance only.
     *
     *          Name            Description
     *  @param  _signatures     Array of admin signatures.
     *
     *  @dev    Administrative operator.
     */
    function pause(
        bytes[] calldata _signatures
    ) external
    whenNotPaused {
        IAdmin(this.admin()).verifyAdminSignatures(
            abi.encode(address(this), "pause"),
            _signatures
        );

        _pause();
    }

    /**
     *  @notice Unpause contract.
     *  @notice After maintenance completes.
     *
     *          Name            Description
     *  @param  _signatures     Array of admin signatures.
     *
     *  @dev    Administrative operator.
     */
    function unpause(
        bytes[] calldata _signatures
    ) external
    whenPaused {
        IAdmin(this.admin()).verifyAdminSignatures(
            abi.encode(address(this), "unpause"),
            _signatures
        );

        _unpause();
    }
}
