// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ReentrancyGuardUpgradeable} from "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";

import {CurrencyHandler} from "../lib/CurrencyHandler.sol";
import {Formula} from "../lib/Formula.sol";

import {IAdmin} from "../common/interfaces/IAdmin.sol";

import {CommonConstant} from "../common/constants/CommonConstant.sol";

import {ICommissionToken} from "../land/interfaces/ICommissionToken.sol";
import {IEstateToken} from "../land/interfaces/IEstateToken.sol";

import {CommissionDispatchable} from "../land/utilities/CommissionDispatchable.sol";

import {EstateMarketplaceStorage} from "../lux/storages/EstateMarketplaceStorage.sol";

import {AssetMarketplace} from "../lux/AssetMarketplace.sol";

contract EstateMarketplace is
EstateMarketplaceStorage,
AssetMarketplace,
CommissionDispatchable {
    using Formula for uint256;

    string constant private VERSION = "v1.2.1";

    function initialize(
        address _admin,
        address _estateToken,
        address _commissionToken
    ) external initializer {
        super.initialize(_admin, _estateToken);
        
        __CommissionDispatchable_init(_commissionToken);
    }

    function _chargeRoyalty(
        uint256 _offerId,
        uint256 _royalty
    ) internal override {
        Offer storage offer = offers[_offerId];
        address royaltyReceiver = offer.royaltyReceiver;
        address currency = offer.currency;

        uint256 commission = _dispatchCommission(
            _offerId,
            _royalty,
            currency
        );

        CurrencyHandler.sendCurrency(currency, royaltyReceiver, _royalty - commission);
    }
}
