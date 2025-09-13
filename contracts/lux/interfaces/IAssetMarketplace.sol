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
 *  @dev    The asset token must support interface `IAssetToken`.
 *  @dev    TODO: All amounts are expressed in absolute units. Scale these values by `10 ** IAssetToken.decimals()` to obtain
 *          the correct amounts under the `IAssetToken` convention.
 *  @dev    ERC-20 tokens are identified by their contract addresses.
 *          Native coin is represented by the zero address (0x0000000000000000000000000000000000000000).
 */
interface IAssetMarketplace is
IOfferState,
ICommon {
    /** ===== STRUCT ===== **/
    /**
     *  @notice An offer for asset tokens.
     */
    struct Offer {
        /// @notice Token identifier.
        uint256 tokenId;

        /// @notice Amount of tokens to sell.
        uint256 sellingAmount;

        /// @notice Amount of tokens sold.
        uint256 soldAmount;

        /// @notice Selling price per token.
        uint256 unitPrice;

        /// @notice Royalty charged on each token.
        uint256 royaltyDenomination;

        /// @notice Selling currency address.
        address currency;

        /// @notice Whether the offer is sold in parts.
        bool isDivisible;

        /// @notice Current state.
        OfferState state;

        /// @notice Seller address.
        address seller;

        /// @notice Receiver of the royalty.
        address royaltyReceiver;
    }


    /** ===== EVENT ===== **/
    /**
     *  @notice Emitted when a new offer is submitted.
     *
     *          Name                   Description
     *  @param  offerId                Offer identifier.
     *  @param  tokenId                Token identifier.
     *  @param  seller                 Seller address.
     *  @param  sellingAmount          Amount of tokens to sell.
     *  @param  unitPrice              Selling price per token.
     *  @param  royaltyDenomination    Royalty charged on each token.
     *  @param  currency               Selling currency address.
     *  @param  isDivisible            Whether the offer is sold in parts.
     *  @param  royaltyReceiver        Receiver of the royalty.
     */
    event NewOffer(
        uint256 indexed offerId,
        uint256 indexed tokenId,
        address indexed seller,
        uint256 sellingAmount,
        uint256 unitPrice,
        uint256 royaltyDenomination,
        address currency,
        bool isDivisible,
        address royaltyReceiver
    );

    /**
     *  @notice Emitted when an offer is cancelled.
     *
     *          Name        Description
     *  @param  offerId     Offer identifier.
     */
    event OfferCancellation(uint256 indexed offerId);

    /**
     *  @notice Emitted when an offer is sold.
     *
     *          Name        Description
     *  @param  offerId     Offer identifier.
     *  @param  buyer       Buyer address.
     *  @param  amount      Amount of tokens sold.
     *  @param  value       Selling price.
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
    /* --- Query --- */
    /**
     *          Name          Description
     *  @return collection    Asset token address.
     */
    function collection() external view returns (address collection);

    /**
     *          Name           Description
     *  @return offerNumber    Number of offers.
     */
    function offerNumber() external view returns (uint256 offerNumber);

    /**
     *          Name       Description
     *  @param  offerId    Offer identifier.
     *  @return offer      Information and progress of the offer.
     */
    function getOffer(
        uint256 offerId
    ) external view returns (Offer memory offer);


    /* --- Command --- */
    /**
     *          Name             Description
     *  @param  tokenId          Token identifier.
     *  @param  sellingAmount    Amount of tokens to sell.
     *  @param  unitPrice        Selling price per token.
     *  @param  currency         Selling currency address.
     *  @param  isDivisible      Whether the offer is sold in parts.
     *  @return offerId          New offer identifier.
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
     *  @return price      Selling price including royalty.
     * 
     *  @dev    Seller cannot buy their own offer.
     */
    function buy(
        uint256 offerId
    ) external payable returns (uint256 price);

    /**
     *  @notice Buy a part of the offer.
     *
     *          Name       Description
     *  @param  offerId    Offer identifier.
     *  @param  amount     Amount of tokens to buy.
     *  @return price      Selling price including royalty.
     * 
     *  @dev    Seller cannot buy their own offer.
     */
    function buy(
        uint256 offerId,
        uint256 amount
    ) external payable returns (uint256 price);

    /**
     *  @notice Cancel an offer.
     *
     *          Name       Description
     *  @param  offerId    Offer identifier.
     * 
     *  @dev    Permission: managers or offer owner.
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
     *  @param  anchor     Token identifier of the offer.
     *  @return price      Selling price including royalty.
     */
    function safeBuy(
        uint256 offerId,
        uint256 anchor
    ) external payable returns (uint256 price);

    /**
     *  @notice Buy a part of the offer.
     *
     *          Name       Description
     *  @param  offerId    Offer identifier.
     *  @param  amount     Amount of tokens to buy.
     *  @param  anchor     Token identifier of the offer.
     *  @return price      Selling price including royalty.
     */
    function safeBuy(
        uint256 offerId,
        uint256 amount,
        uint256 anchor
    ) external payable returns (uint256 price);
}
