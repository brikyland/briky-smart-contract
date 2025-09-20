// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

/**
 *  @author Briky Team
 *
 *  @notice Interface for struct `AssetCollateral`.
 */
interface IAssetCollateral {
    /** ===== STRUCT ===== **/
    /**
     *  @notice `IAssetToken` collateral.
     */
    struct AssetCollateral {
        /// @notice Asset identifier.
        uint256 tokenId;

        /// @notice Collateral amount.
        uint256 amount;
    }
}
