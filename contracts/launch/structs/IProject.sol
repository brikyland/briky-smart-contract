// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 *  @author Briky Team
 *
 *  @notice Interface for struct `Project`.
 */
interface IProject {
    /** ===== STRUCT ===== **/

    /**
     *  @notice Project information that has been tokenized.
     */
    struct Project {
        /// @notice `EstateToken` identifier tokenized from the request.
        /// @dev    Remains 0 until tokenization succeeds.
        uint256 estateId;

        /// @notice Management zone.
        bytes32 zone;

        /// @notice Reference identifier from the launchpad contract.
        uint256 launchId;

        /// @notice Launchpad contract address.
        address launchpad;

        /// @notice Tokenization timestamp.
        uint40 tokenizeAt;

        /// @notice When the estate is deprecated by managers due to force majeure.
        /// @dev    `type(uint40).max` represents estate availability (not deprecated).
        uint40 deprecateAt;

        /// @notice Initiator address.
        /// @notice This address belongs to a official disclosed third party organization, registered in the zone to
        ///         raise fund for the project.
        address initiator;
    }
}
