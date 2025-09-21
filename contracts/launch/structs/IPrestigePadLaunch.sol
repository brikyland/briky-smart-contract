// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

/// contracts/common/structs/
import {IRate} from "../../common/structs/IRate.sol";

/**
 *  @author Briky Team
 *
 *  @notice Interface for struct `PrestigePadLaunch`.
 */
interface IPrestigePadLaunch is IRate {
    /** ===== STRUCT ===== **/
    /**
     *  @notice A launch of `PrestigePad` for capital raise for a project and initial issuance of a new associated class of
     *          `ProjectToken` to contributors as referenced distribution for future benefit returning.
     */
    struct PrestigePadLaunch {
        /// @notice Project identifier.
        uint256 projectId;

        /// @notice URI of launch information.
        string uri;

        /// @notice Index of the current round that is being processed.
        /// @dev    This index represents the sequential order of rounds in the launch, starting from 0.
        uint256 currentIndex;

        /// @notice Array of round identifiers.
        uint256[] roundIds;

        /// @notice Fraction of raised value charged as fee, applied for all rounds.
        Rate feeRate;

        /// @notice Initiator address.
        /// @notice This address belongs to a official disclosed third party organization, registered in the zone to raise
        ///         fund for the project.
        address initiator;

        /// @notice Whether the launch completes capital raising.
        /// @notice The launch can only be finalized after all rounds are confirmed and no further rounds can be created.
        bool isFinalized;
    }
}
