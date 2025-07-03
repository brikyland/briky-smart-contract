// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ReentrancyGuardUpgradeable} from "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";

import {Constant} from "../lib/Constant.sol";
import {CurrencyHandler} from "../lib/CurrencyHandler.sol";
import {Formula} from "../lib/Formula.sol";

import {IAdmin} from "../common/interfaces/IAdmin.sol";

import {Pausable} from "../common/utilities/Pausable.sol";

import {ICommissionToken} from "./interfaces/ICommissionToken.sol";
import {IEstateToken} from "./interfaces/IEstateToken.sol";

import {EstateMarketplaceStorage} from "./storages/EstateMarketplaceStorage.sol";

import {Discountable} from "./utilities/Discountable.sol";

contract EstateMarketplace is
EstateMarketplaceStorage,
Discountable,
Pausable,
ReentrancyGuardUpgradeable {
    using Formula for uint256;

    string constant private VERSION = "v1.1.1";

    modifier validOffer(uint256 _offerId) {
        if (_offerId == 0 || _offerId > offerNumber) {
            revert InvalidOfferId();
        }
        _;
    }

    receive() external payable {}

    function initialize(
        address _admin,
        address _estateToken,
        address _commissionToken
    ) external initializer {
        __Pausable_init();
        __ReentrancyGuard_init();

        admin = _admin;
        estateToken = _estateToken;
        commissionToken = _commissionToken;
    }

    function version() external pure returns (string memory) {
        return VERSION;
    }

    function getOffer(uint256 _offerId) external view validOffer(_offerId) returns (Offer memory) {
        return offers[_offerId];
    }

    function list(
        uint256 _tokenId,
        uint256 _sellingAmount,
        uint256 _unitPrice,
        address _currency,
        bool _isDivisible
    ) external whenNotPaused returns (uint256) {
        IEstateToken estateTokenContract = IEstateToken(estateToken);
        if (!estateTokenContract.isAvailable(_tokenId)) {
            revert InvalidTokenId();
        }

        if (_unitPrice == 0) {
            revert InvalidUnitPrice();
        }

        if (!IAdmin(admin).isAvailableCurrency(_currency)) {
            revert InvalidCurrency();
        }

        if (_sellingAmount == 0
            || _sellingAmount > estateTokenContract.balanceOf(msg.sender, _tokenId)) {
            revert InvalidSellingAmount();
        }

        uint256 offerId = ++offerNumber;

        offers[offerId] = Offer(
            _tokenId,
            _sellingAmount,
            0,
            _unitPrice,
            _currency,
            _isDivisible,
            OfferState.Selling,
            msg.sender
        );

        emit NewOffer(
            offerId,
            _tokenId,
            msg.sender,
            _sellingAmount,
            _unitPrice,
            _currency,
            _isDivisible
        );

        return offerId;
    }

    function buy(uint256 _offerId) external payable validOffer(_offerId) returns (uint256) {
        return _buy(_offerId, offers[_offerId].sellingAmount - offers[_offerId].soldAmount);
    }

    function buy(uint256 _offerId, uint256 _amount) external payable validOffer(_offerId) returns (uint256) {
        if (!offers[_offerId].isDivisible) {
            revert NotDivisible();
        }

        return _buy(_offerId, _amount);
    }

    function safeBuy(uint256 _offerId, uint256 _anchor) external payable validOffer(_offerId) returns (uint256) {
        if (_anchor != offers[_offerId].tokenId) {
            revert BadAnchor();
        }

        return _buy(_offerId, offers[_offerId].sellingAmount - offers[_offerId].soldAmount);
    }

    function safeBuy(
        uint256 _offerId,
        uint256 _amount,
        uint256 _anchor
    ) external payable validOffer(_offerId) returns (uint256) {
        if (_anchor != offers[_offerId].tokenId) {
            revert BadAnchor();
        }

        if (!offers[_offerId].isDivisible) {
            revert NotDivisible();
        }

        return _buy(_offerId, _amount);
    }

    function cancel(uint256 _offerId) external nonReentrant validOffer(_offerId) whenNotPaused {
        Offer storage offer = offers[_offerId];
        if (msg.sender != offer.seller && !IAdmin(admin).isManager(msg.sender)) {
            revert Unauthorized();
        }
        if (offer.state != OfferState.Selling) {
            revert InvalidCancelling();
        }

        offer.state = OfferState.Cancelled;

        emit OfferCancellation(_offerId);
    }

    function _buy(uint256 _offerId, uint256 _amount)
    private nonReentrant whenNotPaused returns (uint256) {
        if (_amount == 0) {
            revert InvalidAmount();
        }

        Offer storage offer = offers[_offerId];
        if (msg.sender == offer.seller
            || offer.state != OfferState.Selling) {
            revert InvalidBuying();
        }

        address seller = offer.seller;
        uint256 sellingAmount = offer.sellingAmount;
        uint256 newSoldAmount = offer.soldAmount + _amount;
        if (newSoldAmount > sellingAmount) {
            revert NotEnoughTokensToSell();
        }

        IEstateToken estateTokenContract = IEstateToken(estateToken);
        uint256 tokenId = offer.tokenId;
        uint256 value = offer.unitPrice.scale(Rate(_amount, estateTokenContract.getEstate(tokenId).decimals));
        (
            address royaltyReceiver,
            uint256 royaltyAmount
        ) = estateTokenContract.royaltyInfo(tokenId, value);

        address currency = offer.currency;
        royaltyAmount = _applyDiscount(royaltyAmount, currency);

        (
            address commissionReceiver,
            uint256 commissionAmount
        ) = ICommissionToken(commissionToken).commissionInfo(tokenId, royaltyAmount);

        if (currency == address(0)) {
            CurrencyHandler.receiveNative(value + royaltyAmount);
            CurrencyHandler.sendNative(seller, value);
            CurrencyHandler.sendNative(royaltyReceiver, royaltyAmount - commissionAmount);
            if (commissionAmount != 0) {
                CurrencyHandler.sendNative(commissionReceiver, commissionAmount);
            }
        } else {
            CurrencyHandler.forwardERC20(currency, seller, value);
            CurrencyHandler.forwardERC20(currency, royaltyReceiver, royaltyAmount - commissionAmount);
            if (commissionAmount != 0) {
                CurrencyHandler.forwardERC20(currency, commissionReceiver, commissionAmount);
            }
        }

        offer.soldAmount = newSoldAmount;
        if (newSoldAmount == sellingAmount) {
            offer.state = OfferState.Sold;
        }
        estateTokenContract.safeTransferFrom(
            seller,
            msg.sender,
            tokenId,
            _amount,
            ""
        );

        emit OfferSale(
            _offerId,
            msg.sender,
            _amount,
            value,
            royaltyReceiver,
            royaltyAmount,
            commissionReceiver,
            commissionAmount
        );

        return value + royaltyAmount;
    }
}
