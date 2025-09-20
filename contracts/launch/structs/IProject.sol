// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

/**
 *  @author Briky Team
 *
 *  @notice Interface for struct `Project`.
 */
interface IProject {
    /** ===== STRUCT ===== **/
    /**
     *  @notice Project information.
     */
    struct Project {
        /// @notice Estate identifier tokenized from the request.
        /// @dev    Remain 0 until tokenization succeeds.
        uint256 estateId;

        /// @notice Zone code.
        bytes32 zone;

        /// @notice Launch identifier from the launchpad contract.
        uint256 launchId;

        /// @notice Launchpad contract address.
        address launchpad;

        /// @notice Tokenization timestamp.
        uint40 tokenizeAt;

        /// @notice When the estate is deprecated due to force majeure.
        /// @dev    `type(uint40).max` represents estate availability (not deprecated).
        uint40 deprecateAt;

        /// @notice Initiator address.
        /// @notice This address belongs to a official disclosed third party organization, registered in the zone to
        ///         raise fund for the project.
        address initiator;
    }
}
