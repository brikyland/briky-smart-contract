// SPDX-License-Identifier: MIT
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
     *  @notice A launch of `PrestigePad` for capital raise for a project and initial issuance of a new associated
     *          class of `ProjectToken` to contributors as referenced distribution for future benefit returning.
     */
    struct PrestigePadLaunch {
        /// @notice `ProjectToken` identifier to be minted from this launch.
        uint256 projectId;

        /// @notice URI of project metadata.
        string uri;

        /// @notice Index of the current round that is being processed.
        /// @dev    This index represents the sequential order of rounds in the launch, starting from 0.
        uint256 currentIndex;

        /// @notice Round identifiers array.
        uint256[] roundIds;

        /// @notice Fraction of the raised value charged as fee, applied across all rounds.
        Rate feeRate;

        /// @notice Initiator address.
        /// @notice This address belongs to a official disclosed third party organization, registered in the zone to
        ///         raise fund for the project.
        address initiator;

        /// @notice Whether the launch completes capital raising.
        /// @notice The launch can only be finalized after all rounds are confirmed, and no further rounds can be
        ///         created.
        bool isFinalized;
    }
}
