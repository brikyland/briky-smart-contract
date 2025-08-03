// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IEstateForgerRequest {
    struct EstateForgerRequestEstate {
        uint256 estateId;
        bytes32 zone;
        string uri;
        uint40 expireAt;
    }

    struct EstateForgerRequestEstateInput {
        bytes32 zone;
        string uri;
        uint40 expireAt;
    }

    struct EstateForgerRequestQuota {
        uint256 totalQuantity;
        uint256 minSellingQuantity;
        uint256 maxSellingQuantity;
        uint256 soldQuantity;
    }

    struct EstateForgerRequestQuotaInput {
        uint256 totalQuantity;
        uint256 minSellingQuantity;
        uint256 maxSellingQuantity;
    }

    struct EstateForgerRequestQuote {
        uint256 unitPrice;
        address currency;
        uint256 cashbackThreshold;
        uint256 cashbackFundId;
        uint256 feeDenomination;
        uint256 commissionDenomination;
    }

    struct EstateForgerRequestQuoteInput {
        uint256 unitPrice;
        address currency;
        uint256 cashbackThreshold;
        uint256 cashbackBaseRate;
        address[] cashbackCurrencies;
        uint256[] cashbackDenominations;
    }

    struct EstateForgerRequestAgenda {
        uint40 saleStartsAt;
        uint40 privateSaleEndsAt;
        uint40 publicSaleEndsAt;
        uint40 confirmAt;
    }

    struct EstateForgerRequestAgendaInput {
        uint40 saleStartsAt;
        uint40 privateSaleDuration;
        uint40 publicSaleDuration;
    }

    struct EstateForgerRequest {
        EstateForgerRequestEstate estate;
        EstateForgerRequestQuota quota;
        EstateForgerRequestQuote quote;
        EstateForgerRequestAgenda agenda;
        address requester;
    }
}
