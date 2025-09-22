// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

/**
 *  @author Briky Team
 *
 *  @notice Interface for struct `ERC721Collateral`.
 */
interface IERC721Collateral {
    /** ===== STRUCT ===== **/
    /**
     *  @notice ERC-721 collateral.
     */
    struct ERC721Collateral {
        /// @notice ERC-721 contract address.
        /// @dev    The collection must support interface `IERC721Upgradeable`.
        address collection;

        /// @notice Token identifier.
        uint256 tokenId;
    }
}
