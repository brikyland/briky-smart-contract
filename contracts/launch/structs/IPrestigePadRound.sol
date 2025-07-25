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

    struct PrestigePadRoundQuotaInput {
        uint256 totalQuantity;
        uint256 minSellingQuantity;
        uint256 maxSellingQuantity;
    }

    struct PrestigePadRoundQuote {
        uint256 unitPrice;
        address currency;
        uint256 cashbackThreshold;
        uint256 cashbackFundId;
        uint256 feeDenomination;
    }

    struct PrestigePadRoundQuoteInput {
        uint256 unitPrice;
        address currency;
    }

    struct PrestigePadRoundAgenda {
        uint40 raiseStartsAt;
        uint40 raiseEndsAt;
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
        PrestigePadRoundQuotaInput quota;
        PrestigePadRoundQuoteInput quote;
        Validation validation;
    }
}
