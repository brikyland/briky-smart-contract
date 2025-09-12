// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ICommon} from "../../common/interfaces/ICommon.sol";

interface IERC721Marketplace is ICommon {
    enum OfferState {
        Nil,
        Selling,
        Sold,
        Cancelled
    }

    struct Offer {
        address collection;
        uint256 tokenId;
        uint256 price;
        uint256 royalty;
        address currency;
        OfferState state;
        address seller;
        address royaltyReceiver;
    }

    event CollectionRegistration(address indexed collection);
    event CollectionDeregistration(address indexed collection);
    
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
    event OfferCancellation(uint256 indexed offerId);
    event OfferSale(
        uint256 indexed offerId,
        address indexed buyer,
        address royaltyReceiver,
        uint256 royalty
    );
    
    error NotRegisteredCollection();
    error RegisteredCollection();

    error InvalidBuying();
    error InvalidCancelling();
    error InvalidCollection();
    error InvalidTokenId();
    error InvalidOfferId();
    error InvalidPrice();
    error Overdue();

    function offerNumber() external view returns (uint256 offerNumber);

    function getOffer(uint256 offerId) external view returns (Offer memory offer);

    function list(
        address collection,
        uint256 tokenId,
        uint256 price,
        address currency
    ) external returns (uint256 offerId);

    function buy(uint256 offerId) external payable returns (uint256 price);
    function cancel(uint256 offerId) external;

    function safeBuy(uint256 offerId, uint256 anchor) external payable returns (uint256 price);
}
