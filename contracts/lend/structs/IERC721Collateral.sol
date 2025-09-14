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
     *  @notice A ERC-721 token collateral.
     */
    struct ERC721Collateral {
        /// @notice Token collection contract address.
        /// @dev    The collection must support interface `IERC721Upgradeable`.
        address token;

        /// @notice Token identifier.
        uint256 tokenId;
    }
}
