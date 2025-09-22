// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

/// contracts/common/structs/
import {IValidation} from "../../common/structs/IValidation.sol";

/**
 *  @author Briky Team
 *
 *  @notice Interface for struct `PrestigePadRound`.
 *
 *  @dev    Implementation involves server-side support.
 *  @dev    ERC-20 tokens are identified by their contract addresses.
 *          Native coin is represented by the zero address (0x0000000000000000000000000000000000000000).
 *  @dev    Quantities are expressed in absolute units. Scale these values by `10 ** IAssetToken(projectToken).decimals()` to
 *          obtain the correct amounts under the `IAssetToken` convention.
 */
interface IPrestigePadRound is IValidation {
    /** ===== STRUCT ===== **/
    /**
     *  @notice Volume configuration and progress.
     */
    struct PrestigePadRoundQuota {
        /// @notice Total quantity of tokens to be minted from the round.
        uint256 totalQuantity;

        /// @notice Minimum quantity must be raise to meet the capital expectation.
        uint256 minRaisingQuantity;

        /// @notice Maximum quantity that the requester is willing to raise.
        uint256 maxRaisingQuantity;

        /// @notice Total contributed quantity.
        /// @notice The remaining quantity (if any) will be transferred to the initiator after confirmation.
        uint256 raisedQuantity;
    }

    /**
     *  @notice Initialization input for `PrestigePadRoundQuota`.
     */
    struct PrestigePadRoundQuotaInput {
        /// @notice Total quantity of tokens to be minted from the round.
        uint256 totalQuantity;

        /// @notice Minimum quantity must be raise to meet the capital expectation.
        /// @dev    `minRaisingQuantity <= maxRaisingQuantity`.
        uint256 minRaisingQuantity;

        /// @notice Maximum quantity that the requester is willing to raise.
        /// @dev    `maxRaisingQuantity <= totalQuantity`.
        uint256 maxRaisingQuantity;
    }

    /**
     *  @notice Price configuration.
     */
    struct PrestigePadRoundQuote {
        /// @notice Value of each token unit.
        uint256 unitPrice;

        /// @notice Contribution currency address.
        address currency;

        /// @notice Minimum contributed quantity of an account to receive cashback.
        uint256 cashbackThreshold;

        /// @notice Cashback fund identifier.
        /// @dev    Using `IFund.Fund` whose `mainCurrency` is set to `currency`.
        uint256 cashbackFundId;

        /// @notice Fee charged on each token.
        /// @dev    `feeDenomination <= unitPrice`.
        uint256 feeDenomination;
    }

    /**
     *  @notice Initialization input for `PrestigePadRoundQuote`.
     */
    struct PrestigePadRoundQuoteInput {
        /// @notice Value of each token unit.
        uint256 unitPrice;

        /// @notice Contribution currency address.
        address currency;
    }

    /**
     *  @notice Timeline configuration and progress.
     */
    struct PrestigePadRoundAgenda {
        /// @notice When the raise starts.
        uint40 raiseStartsAt;

        /// @notice When the raise ends.
        /// @dev    `raiseEndsAt >= raiseStartsAt`.
        uint40 raiseEndsAt;

        /// @notice When the round is confirmed to mint.
        uint40 confirmAt;
    }

    /**
     *  @notice Initialization input for `EstateForgerRequestAgenda`.
     */
    struct PrestigePadRound {
        /// @notice URI of round metadata.
        string uri;

        /// @notice Volume configuration and progress.
        PrestigePadRoundQuota quota;

        /// @notice Price configuration.
        PrestigePadRoundQuote quote;

        /// @notice Timeline configuration and progress.
        PrestigePadRoundAgenda agenda;
    }

    /**
     *  @notice A round in a launch of `PrestigePad` operating a phase of capital raising for a estate project that issues
     *          new corresponding project token to be minted for contributors of the round.
     *
     *  @dev    Phases of a round:
     *          - Unscheduled: agenda.raiseStartsAt = 0
     *          - Scheduled: block.timestamp < agenda.raiseStartsAt
     *          - Raise: agenda.raiseStartsAt <= block.timestamp < agenda.raiseEndsAt
     *          - Awaiting Confirmation: agenda.raiseEndsAt
     *                                      <= block.timestamp
     *                                      < agenda.raiseEndsAt + PrestigePadConstant.RAISE_CONFIRMATION_TIME_LIMIT
     *          - Confirmed: agenda.confirmedAt > 0
     *          - Cancelled: quota.totalSupply = 0
     */
    struct PrestigePadRoundInput {
        /// @notice URI of round metadata.
        string uri;

        /// @notice Volume configuration and progress.
        PrestigePadRoundQuotaInput quota;

        /// @notice Price configuration.
        PrestigePadRoundQuoteInput quote;

        /// @notice Validation package from the validator.
        Validation validation;
    }
}
