// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ICommon} from "../../common/interfaces/ICommon.sol";

import {IProject} from "../../launch/structs/IProject.sol";

interface IProjectMarketplace is
IProject,
ICommon {
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
        uint256 value
    );

    error InvalidAmount();
    error InvalidBuying();
    error InvalidCancelling();
    error InvalidTokenId();
    error InvalidOfferId();
    error InvalidSellingAmount();
    error InvalidUnitPrice();
    error NotDivisible();
    error NotEnoughTokensToSell();

    function projectToken() external view returns (address projectToken);

    function offerNumber() external view returns (uint256 offerNumber);

    function getOffer(uint256 offerId) external view returns (Offer memory offer);

    function list(
        uint256 tokenId,
        uint256 sellingAmount,
        uint256 unitPrice,
        address currency,
        bool isDivisible
    ) external returns (uint256 offerId);

    function buy(uint256 offerId) external payable returns (uint256 price);
    function buy(uint256 offerId, uint256 amount) external payable returns (uint256 price);
    function cancel(uint256 offerId) external;

    function safeBuy(uint256 offerId, uint256 anchor) external payable returns (uint256 price);
    function safeBuy(
        uint256 offerId,
        uint256 amount,
        uint256 anchor
    ) external payable returns (uint256 price);
}
