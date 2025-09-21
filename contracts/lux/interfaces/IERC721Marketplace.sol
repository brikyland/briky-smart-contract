// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

/// contracts/lux/structs/
import {IERC721Offer} from "../structs/IERC721Offer.sol";

/// contracts/common/interfaces/
import {ICommon} from "../../common/interfaces/ICommon.sol";

/**
 *  @author Briky Team
 *
 *  @notice Interface for contract `ERC721Marketplace`.
 *  @notice An `ERC721Marketplace` contract hosts a marketplace for ERC-721 tokens.
 *
 *  @dev    ERC-20 tokens are identified by their contract addresses.
 *          Native coin is represented by the zero address (0x0000000000000000000000000000000000000000).
 */
interface IERC721Marketplace is
IERC721Offer,
ICommon {
    /** ===== EVENT ===== **/
    /* --- Configuration --- */
    /**
     *  @notice Emitted when a collection is registered.
     * 
     *          Name        Description
     *  @param  collection  Registered collection contract address.
     */
    event CollectionRegistration(
        address indexed collection
    );

    /**
     *  @notice Emitted when a collection is deregistered.
     *
     *          Name        Description
     *  @param  collection  Deregistered collection contract address.
     */
    event CollectionDeregistration(
        address indexed collection
    );
    

    /* --- Offer --- */
    /**
     *  @notice Emitted when a new offer is listed.
     *
     *          Name                Description
     *  @param  collection          Token collection contract address.
     *  @param  offerId             Offer identifier.
     *  @param  tokenId             Token identifier.
     *  @param  seller              Seller address.
     *  @param  price               Sale value.
     *  @param  royalty             Royalty derived from the sale value.
     *  @param  royaltyReceiver     Royalty receiver address.
     *  @param  currency            Sale currency address.
     */
    event NewOffer(
        address indexed collection,
        uint256 indexed offerId,
        uint256 indexed tokenId,
        address seller,
        uint256 price,
        uint256 royalty,
        address royaltyReceiver,
        address currency
    );

    /**
     *  @notice Emitted when an offer is cancelled.
     *
     *          Name                Description
     *  @param  offerId             Offer identifier.
     */
    event OfferCancellation(
        uint256 indexed offerId
    );

    /**
     *  @notice Emitted when an offer is sold.
     *
     *          Name                Description
         *  @param  offerId         Offer identifier.
     *  @param  buyer               Buyer address.
     *  @param  royaltyReceiver     Royalty receiver address.
     *  @param  royalty             Royalty derived from the sale value of the offer.
     */
    event OfferSale(
        uint256 indexed offerId,
        address indexed buyer,
        address royaltyReceiver,
        uint256 royalty
    );

    /** ===== ERROR ===== **/
    error InvalidBuying();
    error InvalidCancelling();
    error InvalidCollection();
    error InvalidTokenId();
    error InvalidOfferId();
    error InvalidPrice();
    error NotRegisteredCollection();
    error RegisteredCollection();


    /** ===== FUNCTION ===== **/
    /* --- Query --- */
    /**
     *          Name            Description
     *  @return offerNumber     Number of offers.
     */
    function offerNumber() external view returns (uint256 offerNumber);

    /**
     *          Name            Description
     *  @param  offerId         Offer identifier.
     *  @return offer           Configuration and progress of the offer.
     */
    function getOffer(
        uint256 offerId
    ) external view returns (ERC721Offer memory offer);


    /* --- Command --- */
    /**
     *  @notice List a new offer of an ERC721 token.
     *
     *          Name        Description
     *  @param  collection  Token collection contract address.
     *  @param  tokenId     Token identifier.
     *  @param  price       Sale value.
     *  @param  currency    Sale currency address.
     *  @return offerId     New offer identifier.
     * 
     *  @dev    Approval must be granted for this contract to transfer collateral before borrowing. A mortgage can only be
     *          lent while approval remains active.
     */
    function list(
        address collection,
        uint256 tokenId,
        uint256 price,
        address currency
    ) external returns (uint256 offerId);

    /**
     *  @notice Buy an offer.
     *  @notice Buy only if the offer is in `Selling` state.
     *
     *          Name        Description
     *  @param  offerId     Offer identifier.
     *  @return value       Sum of sale price and royalty.
     */
    function buy(
        uint256 offerId
    ) external payable returns (uint256 value);

    /**
     *  @notice Cancel an offer.
     *  @notice Cancel only if the offer is in `Selling` state.
     *
     *          Name        Description
     *  @param  offerId     Offer identifier.
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
     *  @notice Buy only if the offer is in `Selling` state.
     *
     *          Name        Description
     *  @param  offerId     Offer identifier.
     *  @param  anchor      `tokenId` of the offer.
     *  @return value       Sum of sale price and royalty.
     * 
     *  @dev    Anchor enforces consistency between this contract and the client-side.
     */
    function safeBuy(
        uint256 offerId,
        uint256 anchor
    ) external payable returns (uint256 value);
}
