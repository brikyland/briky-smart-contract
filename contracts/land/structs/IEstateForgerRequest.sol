// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

/// contracts/common/structs/
import {IValidation} from "../../common/structs/IValidation.sol";

/**
 *  @author Briky Team
 *
 *  @notice Interface for struct `EstateForgerRequest`.
 *
 *  @dev    Implementation involves server-side support.
 *  @dev    ERC-20 tokens are identified by their contract addresses.
 *          Native coin is represented by the zero address (0x0000000000000000000000000000000000000000).
 *  @dev    Quantities are expressed in absolute units. Scale these values by `10 ** IAssetToken(estateToken).decimals()` to
 *          obtain the correct amounts under the `IAssetToken` convention.
 */
interface IEstateForgerRequest is IValidation {
    /** ===== STRUCT ===== **/
    /**
     *  @notice Estate information.
     */
    struct EstateForgerRequestEstate {
        /// @notice Estate identifier tokenized from the request.
        /// @dev    Remain 0 until tokenization succeeds.
        uint256 estateId;

        /// @notice Zone code.
        bytes32 zone;

        /// @notice URI of estate metadata.
        string uri;

        /// @notice When the limited term of estate ownership has expired.
        /// @dev    `type(uint40).max` represents unlimited ownership term.
        uint40 expireAt;
    }

    /**
     *  @notice Initialization input for `EstateForgerRequestEstate`.
     */
    struct EstateForgerRequestEstateInput {
        /// @notice Zone code.
        bytes32 zone;

        /// @notice URI of estate metadata.
        string uri;

        /// @notice When the limited term of estate ownership has expired.
        /// @dev    `type(uint40).max` represents unlimited ownership term.
        uint40 expireAt;
    }

    /**
     *  @notice Volume configuration and progress.
     */
    struct EstateForgerRequestQuota {
        /// @notice Total quantity of tokens to be minted from the request.
        uint256 totalQuantity;

        /// @notice Minimum quantity must be sold to meet the liquidation expectation.
        uint256 minSellingQuantity;

        /// @notice Maximum quantity that the requester is willing to sell.
        uint256 maxSellingQuantity;

        /// @notice Total deposited quantity.
        /// @notice The remaining quantity (if any) will be transferred to the requester after confirmation.
        uint256 soldQuantity;
    }

    /**
     *  @notice Initialization input for `EstateForgerRequestQuota`.
     */
    struct EstateForgerRequestQuotaInput {
        /// @notice Total quantity of tokens to be minted from the request.
        uint256 totalQuantity;

        /// @notice Minimum quantity must be sold to meet the liquidation expectation.
        /// @dev    `minSellingQuantity <= maxSellingQuantity`.
        uint256 minSellingQuantity;

        /// @notice Maximum quantity that the requester is willing to sell.
        /// @dev    `maxSellingQuantity <= totalQuantity`.
        uint256 maxSellingQuantity;
    }

    /**
     *  @notice Price configuration.
     */
    struct EstateForgerRequestQuote {
        /// @notice Value of each token unit.
        uint256 unitPrice;

        /// @notice Deposit currency address.
        address currency;

        /// @notice Minimum deposited quantity of an account to receive cashback.
        uint256 cashbackThreshold;

        /// @notice Cashback fund identifier.
        /// @dev    Using `IFund.Fund` whose `mainCurrency` is set to `currency`.
        uint256 cashbackFundId;

        /// @notice Fee charged on each token.
        /// @dev    `feeDenomination <= unitPrice`.
        uint256 feeDenomination;

        /// @notice Commission shared from the fee transferred to associated broker.
        /// @dev    `commissionDenomination <= feeDenomination`.
        uint256 commissionDenomination;

        /// @notice Associated broker address.
        address broker;
    }

    /**
     *  @notice Initialization input for `EstateForgerRequestQuote`.
     */
    struct EstateForgerRequestQuoteInput {
        /// @notice Value of each token unit.
        uint256 unitPrice;

        /// @notice Deposit currency address.
        address currency;

        /// @notice Minimum deposited quantity of an account to receive cashback.
        uint256 cashbackThreshold;

        /// @notice Fraction of deposit to cashback.
        uint256 cashbackBaseRate;

        /// @notice Array of extra currency addresses to cashback.
        address[] cashbackCurrencies;

        /// @notice Array of extra currency denominations, respective to each extra currency.
        /// @dev    Must have same length as `cashbackCurrencies`.
        uint256[] cashbackDenominations;

        /// @notice Fee charged on each token.
        /// @dev    `feeDenomination <= unitPrice`.
        uint256 feeDenomination;

        /// @notice Associated broker address.
        address broker;
    }

    /**
     *  @notice Timeline configuration and progress.
     *  @notice A sale may consist of at least one of two phases:
     *          -   Private sale: Only whitelisted addresses can deposit.
     *          -   Public sale: Every address can deposit.
     */
    struct EstateForgerRequestAgenda {
        /// @notice When the sale starts with the private sale.
        uint40 saleStartsAt;

        /// @notice When the private sale ends and the public sale starts
        /// @dev    If `saleStartsAt` is equal to `privateSaleEndsAt`, the private sale is not proceeded.
        /// @dev    `privateSaleEndsAt >= saleStartsAt`.
        uint40 privateSaleEndsAt;

        /// @notice When the public sale ends.
        /// @dev    If `privateSaleEndsAt` is equal to `publicSaleEndsAt), the public sale is not proceeded.
        /// @dev    `publicSaleEndsAt >= privateSaleEndsAt`.
        uint40 publicSaleEndsAt;

        /// @notice When the request is confirmed to mint.
        uint40 confirmAt;
    }

    /**
     *  @notice Initialization input for `EstateForgerRequestAgenda`.
     */
    struct EstateForgerRequestAgendaInput {
        /// @notice When the sale starts with the private sale.
        uint40 saleStartsAt;

        /// @notice Private sale duration.
        uint40 privateSaleDuration;

        /// @notice Public sale duration.
        uint40 publicSaleDuration;
    }

    /**
     *  @notice A request of `EstateForger` for tokenizing a real-world estate into a new class of `EstateToken` through a
     *          deposited-based fixed-price sale.
     *
     *  @dev    Phases of a request:
     *          - Pending: block.timestamp < agenda.saleStartsAt
     *          - Private Sale: agenda.saleStartsAt <= block.timestamp < agenda.privateSaleEndsAt
     *          - Public Sale: agenda.privateSaleEndsAt <= block.timestamp < agenda.publicSaleEndsAt
     *          - Awaiting Confirmation: agenda.publicSaleEndsAt
     *                                      <= block.timestamp
     *                                      < agenda.publicSaleEndsAt + EstateForgerConstant.SALE_CONFIRMATION_TIME_LIMIT
     *          - Confirmed: estate.estateId > 0
     *          - Cancelled: quota.totalSupply = 0
     */
    struct EstateForgerRequest {
        /// @notice Estate information.
        EstateForgerRequestEstate estate;

        /// @notice Volume configuration and progress.
        EstateForgerRequestQuota quota;

        /// @notice Price configuration.
        EstateForgerRequestQuote quote;

        /// @notice Timeline configuration and progress.
        EstateForgerRequestAgenda agenda;

        /// @notice Requester address.
        /// @notice This address belongs to an official disclosed third party custodian agent, registered in the zone to
        ///         tokenize the estate and later initially hold custody of the estate on behalf of holders.
        address requester;
    }
}
