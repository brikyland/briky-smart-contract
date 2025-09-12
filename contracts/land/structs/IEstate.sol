// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 *  @author Briky Team
 *
 *  @notice Interface for struct `Estate`.
 */
interface IEstate {
    /** ===== STRUCT ===== **/

    /**
     *  @notice Estate information that has been tokenized.
     */
    struct Estate {
        /// @notice Management zone.
        bytes32 zone;

        /// @notice Reference identifier from the tokenizer contract.
        uint256 tokenizationId;

        /// @notice Tokenizer contract address.
        address tokenizer;

        /// @notice Tokenization timestamp.
        uint40 tokenizeAt;

        /// @notice When the limited term of estate ownership expires.
        /// @dev    `type(uint40).max` represents unlimited ownership term.
        uint40 expireAt;

        /// @notice When the estate is deprecated by either managers due to force majeure or extraction.
        /// @dev    `type(uint40).max` represents estate availability (not deprecated).
        uint40 deprecateAt;

        /// @notice Custodian address.
        /// @notice This address belongs to an official disclosed third party custodian agent, registered in the zone
        ///         to hold custody of the estate on behalf of holders.
        address custodian;
    }
}
