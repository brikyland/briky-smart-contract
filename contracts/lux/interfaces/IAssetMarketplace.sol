// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

/// contracts/lux/enums/
import {IAssetOffer} from "../structs/IAssetOffer.sol";

/// contracts/common/interfaces/
import {ICommon} from "../../common/interfaces/ICommon.sol";

/**
 *  @author Briky Team
 *
 *  @notice Interface for contract `AssetMarketplace`.
 *  @notice An `AssetMarketplace` contract hosts a marketplace for a specific `IAssetToken`.
 *
 *  @dev    Each unit of asset token is represented in scaled form as `10 ** IAssetToken(collection).decimals()` following the
 *          convention of `IAssetToken`.
 *  @dev    ERC-20 tokens are identified by their contract addresses.
 *          Native coin is represented by the zero address (0x0000000000000000000000000000000000000000).
 */
interface IAssetMarketplace is
IAssetOffer,
ICommon {
    /** ===== EVENT ===== **/
    /* --- Offer --- */
    /**
     *  @notice Emitted when a new offer is listed.
     *
     *          Name                    Description
     *  @param  offerId                 Offer identifier.
     *  @param  tokenId                 Asset identifier.
     *  @param  seller                  Seller address.
     *  @param  sellingAmount           Selling amount.
     *  @param  unitPrice               Sale value of each token unit.
     *  @param  currency                Sale currency address.
     *  @param  isDivisible             Whether the offer can be bought partially.
     *  @param  royaltyDenomination     Royalty charged on each token.
     *  @param  royaltyReceiver         Royalty receiver address.
     */
    event NewOffer(
        uint256 indexed offerId,
        uint256 indexed tokenId,
        address indexed seller,
        uint256 sellingAmount,
        uint256 unitPrice,
        address currency,
        bool isDivisible,
        uint256 royaltyDenomination,
        address royaltyReceiver
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
     *  @notice Emitted when an offer is sold, partially or fully.
     *
     *          Name                Description
     *  @param  offerId             Offer identifier.
     *  @param  buyer               Buyer address.
     *  @param  amount              Sale amount.
     *  @param  value               Sale value.
     *  @param  royalty             Royalty derived from the sale value.
     *  @param  royaltyReceiver     Royalty receiver address.
     */
    event OfferSale(
        uint256 indexed offerId,
        address indexed buyer,
        uint256 amount,
        uint256 value,
        uint256 royalty,
        address royaltyReceiver
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
     *          Name        Description
     *  @return collection  `IAssetToken` contract address.
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
     *  @return offer           Configuration and progress of the offer.
     */
    function getOffer(
        uint256 offerId
    ) external view returns (AssetOffer memory offer);


    /* --- Command --- */
    /**
     *  @notice List a new offer of asset tokens.
     *
     *          Name             Description
     *  @param  tokenId          Asset identifier.
     *  @param  sellingAmount    Selling amount.
     *  @param  unitPrice        Sale value of each token unit.
     *  @param  currency         Sale currency address.
     *  @param  isDivisible      Whether the offer can be sold partially.
     *  @return offerId          New offer identifier.
     *
     *  @dev    Approval must be granted for this contract to transfer asset tokens before listing. An offer can only be
     *          sold while approval remains active.
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
     *  @notice Buy only if the offer is in `Selling` state.
     *
     *          Name            Description
     *  @param  offerId         Offer identifier.
     *  @return value           Sum of sale price and royalty.
     */
    function buy(
        uint256 offerId
    ) external payable returns (uint256 value);

    /**
     *  @notice Buy a part of the offer.
     *  @notice Buy only if the offer is in `Selling` state.
     *
     *          Name            Description
     *  @param  offerId         Offer identifier.
     *  @param  amount          Amount of tokens to be bought.
     *  @return value           Sum of sale price and royalty.
     */
    function buy(
        uint256 offerId,
        uint256 amount
    ) external payable returns (uint256 value);

    /**
     *  @notice Cancel an offer.
     *  @notice Cancel only if the offer is in `Selling` state.
     *  
     *          Name            Description
     *  @param  offerId         Offer identifier.
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
        bytes32 anchor
    ) external payable returns (uint256 value);

    /**
     *  @notice Buy a part of the offer.
     *  @notice Buy only if the offer is in `Selling` state.
     *
     *          Name        Description
     *  @param  offerId     Offer identifier.
     *  @param  amount      Amount of tokens to be bought.
     *  @param  anchor      `tokenId` of the offer.
     *  @return value       Sum of sale price and royalty.
     *
     *  @dev    Anchor enforces consistency between this contract and the client-side.
     */
    function safeBuy(
        uint256 offerId,
        uint256 amount,
        bytes32 anchor
    ) external payable returns (uint256 value);
}
