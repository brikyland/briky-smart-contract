// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface IMockCommon {
    enum OfferState {
        Nil,
        Selling,
        Sold,
        Cancelled
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
}
