// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

/// contracts/common/structs/
import {IRate} from "../../common/structs/IRate.sol";

/**
 *  @author Briky Team
 *
 *  @notice Interface for struct `EstateLiquidatorRequest`.
 *
 *  @dev    ERC-20 tokens are identified by their contract addresses.
 *          Native coin is represented by the zero address (0x0000000000000000000000000000000000000000).
 */
interface IEstateLiquidatorRequest is IRate {
    /** ===== STRUCT ===== **/
    /**
     *  @notice A request for `EstateLiquidator` to extract an estate from `EstateToken` by selling the asset to a legitimate
     *          estate buyer.
     *  @notice Proceeds from the sale will be shared among holders proportionally to their balances.
     */
    struct EstateLiquidatorRequest {
        /// @notice Estate identifier.
        uint256 estateId;

        /// @notice Proposal identifier for holders to vote on the deal.
        uint256 proposalId;

        /// @notice Sale value.
        uint256 value;

        /// @notice Sale currency address.
        address currency;

        /// @notice Fraction of the liquidation value charged as fee.
        Rate feeRate;

        /// @notice Buyer address.
        address buyer;
    }
}
