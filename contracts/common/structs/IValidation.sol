// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

/**
 *  @author Briky Team
 *
 *  @notice Interface for struct `Validation`.
 *
 *  @dev    Implementation involves server-side support.
 */
interface IValidation {
    /** ===== STRUCT ===== **/
    /**
     *  @notice Validation information provided from a trusted validator.
     */
    struct Validation {
        /// @notice Arbitrary number used once to prevent replay.
        uint256 nonce;

        /// @notice Expiration timestamp.
        uint256 expiry;

        /// @notice Signature over the validation data.
        /// @dev    Pseudo code of signature for a set of `data`, `nonce` and `expiry`, applied in a certain contract:
        ///         ```
        ///         signature = ethSign(abi.encodePacked(
        ///             abi.encode(
        ///                 <contractAddress>,
        ///                 data,
        ///                 nonce,
        ///                 expiry
        ///             ),
        ///             nonce
        ///         ));
        ///         ```
        bytes signature;
    }
}
