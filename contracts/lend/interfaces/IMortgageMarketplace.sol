// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ICommon} from "../../common/interfaces/ICommon.sol";

interface IMortgageMarketplace is ICommon {
    enum OfferState {
        Nil,
        Selling,
        Sold,
        Cancelled
    }

    struct Offer {
        uint256 tokenId;
        uint256 price;
        address currency;
        OfferState state;
        address seller;
    }
    event NewOffer(
        uint256 indexed offerId,
        uint256 indexed tokenId,
        address indexed seller,
        uint256 price,
        address currency
    );
    event OfferCancellation(uint256 indexed offerId);
    event OfferSale(
        uint256 indexed offerId,
        address indexed buyer,
        address royaltyReceiver,
        uint256 royaltyAmount,
        address commissionReceiver,
        uint256 commissionAmount
    );

    error InvalidBuying();
    error InvalidCancelling();
    error InvalidTokenId();
    error InvalidOfferId();
    error InvalidPrice();
    error UnavailableLoan();

    function commissionToken() external view returns (address commissionToken);
    function mortgageToken() external view returns (address mortgageToken);

    function offerNumber() external view returns (uint256 offerNumber);

    function getOffer(uint256 offerId) external view returns (Offer memory offer);

    function list(
        uint256 tokenId,
        uint256 price,
        address currency
    ) external returns (uint256 offerId);
    function buy(uint256 offerId, uint256 tokenId) external payable;
    function cancel(uint256 offerId) external;
}
