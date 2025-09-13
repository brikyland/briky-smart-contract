// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// contracts/lux/enums/
import {IOfferState} from "../enums/IOfferState.sol";

/// contracts/common/interfaces/
import {ICommon} from "../../common/interfaces/ICommon.sol";

/**
 *  @author Briky Team
 *
 *  @notice Interface for contract `AssetMarketplace`.
 *  @notice The `AssetMarketplace` contract hosts a marketplace for a specific asset token.
 *
 *  @dev    Each unit of asset token is scaled by `10 ** IAssetToken(collection).decimals()` following the convention of `IAssetToken`.
 *  @dev    ERC-20 tokens are identified by their contract addresses.
 *          Native coin is represented by the zero address (0x0000000000000000000000000000000000000000).
 */
interface IAssetMarketplace is
IOfferState,
ICommon {
    /** ===== STRUCT ===== **/
    /**
     *  @notice An offer to sell an amount of asset tokens.
     */
    struct Offer {
        /// @notice Asset identifier.
        uint256 tokenId;

        /// @notice Amount of tokens to be sold.
        uint256 sellingAmount;

        /// @notice Amount of tokens that has been bought.
        uint256 soldAmount;

        /// @notice Sale value of each token.
        uint256 unitPrice;

        /// @notice Royalty charged on each token.
        uint256 royaltyDenomination;

        /// @notice Sale currency address.
        address currency;

        /// @notice Whether the offer can be bought partially.
        bool isDivisible;

        /// @notice Current state.
        OfferState state;

        /// @notice Seller address.
        address seller;

        /// @notice Royalty receiver address.
        address royaltyReceiver;
    }


    /** ===== EVENT ===== **/
    /**
     *  @notice Emitted when a new offer is listed.
     *
     *          Name                   Description
     *  @param  offerId                Offer identifier.
     *  @param  tokenId                Asset identifier.
     *  @param  seller                 Seller address.
     *  @param  sellingAmount          Amount of tokens to be sold.
     *  @param  unitPrice              Sale value of each token.
     *  @param  royaltyDenomination    Royalty charged on each token.
     *  @param  royaltyReceiver        Royalty receiver address.
     *  @param  currency               Sale currency address.
     *  @param  isDivisible            Whether the offer can be bought partially.
     */
    event NewOffer(
        uint256 indexed offerId,
        uint256 indexed tokenId,
        address indexed seller,
        uint256 sellingAmount,
        uint256 unitPrice,
        uint256 royaltyDenomination,
        address royaltyReceiver,
        address currency,
        bool isDivisible
    );


    /**
     *  @notice Emitted when an offer is cancelled.
     *
     *          Name        Description
     *  @param  offerId     Offer identifier.
     */
    event OfferCancellation(uint256 indexed offerId);

    /**
     *  @notice Emitted when an offer is sold, partially or fully.
     *
     *          Name        Description
     *  @param  offerId     Offer identifier.
     *  @param  buyer       Buyer address.
     *  @param  amount      Sale amount.
     *  @param  value       Sale price.
     */
    event OfferSale(
        uint256 indexed offerId,
        address indexed buyer,
        uint256 amount,
        uint256 value
    );


    /** ===== ERROR ===== **/
    error InvalidAmount();
    error InvalidBuying();
    error InvalidCancelling();
    error InvalidTokenId();
    error InvalidOfferId();
    error InvalidSellingAmount();
    error InvalidUnitPrice();
    error NotDivisible();
    error NotEnoughTokensToSell();


    /** ===== FUNCTION ===== **/
    /* --- Dependency --- */
    /**
     *          Name            Description
     *  @return collection      Asset token address.
     *
     *  @dev    The asset token must support interface `IAssetToken`.
     */
    function collection() external view returns (address collection);


    /* --- Query --- */
    /**
     *          Name            Description
     *  @return offerNumber     Number of offers.
     */
    function offerNumber() external view returns (uint256 offerNumber);

    /**
     *          Name            Description
     *  @param  offerId         Offer identifier.
     *  @return offer           Information and progress of the offer.
     */
    function getOffer(
        uint256 offerId
    ) external view returns (Offer memory offer);


    /* --- Command --- */
    /**
     *          Name             Description
     *  @param  tokenId          Asset identifier.
     *  @param  sellingAmount    Amount of tokens to be sold.
     *  @param  unitPrice        Sale value of each token.
     *  @param  currency         Sale currency address.
     *  @param  isDivisible      Whether the offer can be sold partially.
     *  @return offerId          New offer identifier.
     *
     *  @dev    Must set approval for the contract to transfer asset tokens of the seller before listing.
     */
    function list(
        uint256 tokenId,
        uint256 sellingAmount,
        uint256 unitPrice,
        address currency,
        bool isDivisible
    ) external returns (uint256 offerId);

    /**
     *  @notice Buy an offer.
     *
     *          Name       Description
     *  @param  offerId    Offer identifier.
     *  @return value      Sum of sale price and royalty.
     */
    function buy(
        uint256 offerId
    ) external payable returns (uint256 value);

    /**
     *  @notice Buy a part of the offer.
     *
     *          Name       Description
     *  @param  offerId    Offer identifier.
     *  @param  amount     Amount of tokens to be bought.
     *  @return value      Sum of sale price and royalty.
     */
    function buy(
        uint256 offerId,
        uint256 amount
    ) external payable returns (uint256 value);

    /**
     *  @notice Cancel an offer.
     *
     *          Name       Description
     *  @param  offerId    Offer identifier.
     * 
     *  @dev    Permission:
     *          - Seller of the offer.
     *          - Managers: disqualify defected offers only.
     */
    function cancel(
        uint256 offerId
    ) external;

    /* --- Safe Command --- */
    /**
     *  @notice Buy an offer.
     *
     *          Name       Description
     *  @param  offerId    Offer identifier.
     *  @param  anchor     `tokenId` of the offer.
     *  @return value      Sum of sale price and royalty.
     *
     *  @dev    Anchor enforces consistency between the contract and the client-side.
     */
    function safeBuy(
        uint256 offerId,
        uint256 anchor
    ) external payable returns (uint256 value);

    /**
     *  @notice Buy a part of the offer.
     *
     *          Name       Description
     *  @param  offerId    Offer identifier.
     *  @param  amount     Amount of tokens to be bought.
     *  @param  anchor     `tokenId` of the offer.
     *  @return value      Sum of sale price and royalty.
     *
     *  @dev    Anchor enforces consistency between the contract and the client-side.
     */
    function safeBuy(
        uint256 offerId,
        uint256 amount,
        uint256 anchor
    ) external payable returns (uint256 value);
}
