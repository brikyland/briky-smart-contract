// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// contracts/lux/enums/
import {IOfferState} from "../enums/IOfferState.sol";

/// contracts/common/interfaces/
import {ICommon} from "../../common/interfaces/ICommon.sol";

/**
 *  @author Briky Team
 *
 *  @notice Interface for contract `ERC721Marketplace`.
 *  @notice The `ERC721Marketplace` contract hosts a marketplace for ERC721 tokens.
 *
 *  @dev    ERC-20 tokens are identified by their contract addresses.
 *          Native coin is represented by the zero address (0x0000000000000000000000000000000000000000).
 */
interface IERC721Marketplace is
IOfferState,
ICommon {
    /** ===== STRUCT ===== **/
    /**
     *  @notice An offer for an ERC721 token.
     */
    struct Offer {
        /// @notice Token collection address.
        /// @dev    The collection must support interface `IERC721Upgradeable`.
        address collection;

        /// @notice Token identifier.
        uint256 tokenId;

        /// @notice Selling price.
        uint256 price;

        /// @notice Royalty charged on the offer.
        uint256 royalty;

        /// @notice Selling currency address.
        address currency;

        /// @notice Current state.
        OfferState state;

        /// @notice Seller address.
        address seller;

        /// @notice Receiver of the royalty.
        address royaltyReceiver;
    }


    /** ===== EVENT ===== **/
    /* --- Configuration --- */
    /**
     *  @notice Emitted when a collection is registered.
     * 
     *          Name        Description
     *  @param  collection  Collection address.
     */
    event CollectionRegistration(
        address indexed collection
    );

    /**
     *  @notice Emitted when a collection is deregistered.
     *
     *          Name        Description
     *  @param  collection  Collection address.
     */
    event CollectionDeregistration(
        address indexed collection
    );
    

    /* --- Offer --- */
    /**
     *  @notice Emitted when a new offer is submitted.
     *
     *          Name               Description
     *  @param  collection         Token collection address.
     *  @param  offerId            Offer identifier.
     *  @param  tokenId            Token identifier.
     *  @param  seller             Seller address.
     *  @param  price              Selling price.
     *  @param  royalty            Royalty charged on the offer.
     *  @param  currency           Selling currency address.
     *  @param  royaltyReceiver    Receiver of the royalty.
     */
    event NewOffer(
        address indexed collection,
        uint256 indexed offerId,
        uint256 indexed tokenId,
        address seller,
        uint256 price,
        uint256 royalty,
        address currency,
        address royaltyReceiver
    );

    /**
     *  @notice Emitted when an offer is cancelled.
     *
     *          Name        Description
     *  @param  offerId     Offer identifier.
     */
    event OfferCancellation(
        uint256 indexed offerId
    );

    /**
     *  @notice Emitted when an offer is sold.
     *
     *          Name               Description
     *  @param  offerId            Offer identifier.
     *  @param  buyer              Buyer address.
     *  @param  royaltyReceiver    Receiver of the royalty.
     *  @param  royalty            Royalty charged on the offer.
     */
    event OfferSale(
        uint256 indexed offerId,
        address indexed buyer,
        address royaltyReceiver,
        uint256 royalty
    );

    /** ===== ERROR ===== **/
    error NotRegisteredCollection();
    error RegisteredCollection();

    error InvalidBuying();
    error InvalidCancelling();
    error InvalidCollection();
    error InvalidTokenId();
    error InvalidOfferId();
    error InvalidPrice();
    error Overdue();

    /** ===== FUNCTION ===== **/
    /* --- Query --- */
    /**
     *          Name            Description
     *  @return offerNumber     Number of offers.
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
     *  @notice List a new offer for an ERC721 token.
     *
     *          Name          Description
     *  @param  collection    Token collection address.
     *  @param  tokenId       Token identifier.
     *  @param  price         Selling price.
     *  @param  currency      Selling currency address.
     *  @return offerId       New offer identifier.
     */
    function list(
        address collection,
        uint256 tokenId,
        uint256 price,
        address currency
    ) external returns (uint256 offerId);

    /**
     *  @notice Buy an offer.
     *
     *          Name        Description
     *  @param  offerId     Offer identifier.
     *  @return price       Buying price including royalty.
     * 
     *  @dev    Seller cannot buy their own offer.
     */
    function buy(
        uint256 offerId
    ) external payable returns (uint256 price);

    /**
     *  @notice Cancel an offer.
     *
     *          Name        Description
     *  @param  offerId     Offer identifier.
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
     *          Name        Description
     *  @param  offerId     Offer identifier.
     *  @param  anchor      Token identifier of the offer.
     *  @return price       Buying price including royalty.
     */
    function safeBuy(
        uint256 offerId,
        uint256 anchor
    ) external payable returns (uint256 price);
}
