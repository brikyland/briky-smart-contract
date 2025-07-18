// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IValidation} from "../../common/structs/IValidation.sol";

interface IPrestigePadRound is IValidation {
    struct PrestigePadRoundQuota {
        uint256 totalQuantity;
        uint256 minSellingQuantity;
        uint256 maxSellingQuantity;
        uint256 soldQuantity;
    }

    struct PrestigePadRoundQuote {
        uint256 unitPrice;
        address currency;
        uint256 cashbackThreshold;
        uint256 cashbackFundId;
        uint256 feeDenomination;
    }

    struct PrestigePadRoundAgenda {
        uint40 startAt;
        uint40 privateSaleEndsAt;
        uint40 publicSaleEndsAt;
        uint40 confirmAt;
    }

    struct PrestigePadRound {
        string uri;
        PrestigePadRoundQuota quota;
        PrestigePadRoundQuote quote;
        PrestigePadRoundAgenda agenda;
    }

    struct PrestigePadRoundInput {
        string uri;
        uint256 totalQuantity;
        uint256 minSellingQuantity;
        uint256 maxSellingQuantity;
        Validation validation;
    }
}
