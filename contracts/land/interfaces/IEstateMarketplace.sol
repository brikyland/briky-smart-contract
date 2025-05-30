// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ICommon} from "../../common/interfaces/ICommon.sol";

interface IEstateMarketplace is ICommon {
    enum OfferState {
        Nil,
        Selling,
        Sold,
        Cancelled
    }

    struct Offer {
        uint256 tokenId;
        uint256 sellingAmount;
        uint256 soldAmount;
        uint256 unitPrice;
        address currency;
        bool isDivisible;
        OfferState state;
        address seller;
    }

    event NewOffer(
        uint256 indexed offerId,
        uint256 indexed tokenId,
        address indexed seller,
        uint256 sellingAmount,
        uint256 unitPrice,
        address currency,
        bool isDivisible
    );
    event OfferCancellation(uint256 indexed offerId);
    event OfferSale(
        uint256 indexed offerId,
        address indexed buyer,
        uint256 amount,
        uint256 value,
        address royaltyReceiver,
        uint256 royaltyAmount,
        address commissionReceiver,
        uint256 commissionAmount
    );

    error InvalidAmount();
    error InvalidBuying();
    error InvalidCancelling();
    error InvalidTokenId();
    error InvalidOfferId();
    error InvalidSellingAmount();
    error InvalidUnitPrice();
    error NotEnoughTokensToSell();

    function commissionToken() external view returns (address commissionToken);
    function estateToken() external view returns (address estateToken);

    function offerNumber() external view returns (uint256 offerNumber);

    function getOffer(uint256 offerId) external view returns (Offer memory offer);

    function list(
        uint256 tokenId,
        uint256 sellingAmount,
        uint256 unitPrice,
        address currency,
        bool isDivisible
    ) external returns (uint256 offerId);
    function buy(uint256 offerId, uint256 tokenId) external payable;
    function buy(uint256 offerId, uint256 tokenId, uint256 amount) external payable;
    function cancel(uint256 offerId) external;
}
