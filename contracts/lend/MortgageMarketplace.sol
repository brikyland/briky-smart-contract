// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ReentrancyGuardUpgradeable} from "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";

import {Constant} from "../lib/Constant.sol";
import {CurrencyHandler} from "../lib/CurrencyHandler.sol";
import {Formula} from "../lib/Formula.sol";

import {IAdmin} from "../common/interfaces/IAdmin.sol";

import {Pausable} from "../common/utilities/Pausable.sol";

import {ICommissionToken} from "../land/interfaces/ICommissionToken.sol";

import {Discountable} from "../land/utilities/Discountable.sol";

import {IMortgageToken} from "./interfaces/IMortgageToken.sol";

import {MortgageMarketplaceStorage} from "./storages/MortgageMarketplaceStorage.sol";

contract MortgageMarketplace is
MortgageMarketplaceStorage,
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
        address _mortgageToken,
        address _commissionToken
    ) external initializer {
        __Pausable_init();
        __ReentrancyGuard_init();

        admin = _admin;
        mortgageToken = _mortgageToken;
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
        uint256 _price,
        address _currency
    ) external whenNotPaused returns (uint256) {
        IMortgageToken mortgageTokenContract = IMortgageToken(mortgageToken);
        if (mortgageTokenContract.ownerOf(_tokenId) != msg.sender) {
            revert InvalidTokenId();
        }

        Loan memory loan = mortgageTokenContract.getLoan(_tokenId);
        if (loan.state != LoanState.Supplied
            || loan.due <= block.timestamp) {
            revert UnavailableLoan();
        }

        if (_price == 0) {
            revert InvalidPrice();
        }

        if (!IAdmin(admin).isAvailableCurrency(_currency)) {
            revert InvalidCurrency();
        }

        uint256 offerId = ++offerNumber;

        offers[offerId] = Offer(
            _tokenId,
            _price,
            _currency,
            OfferState.Selling,
            msg.sender
        );

        emit NewOffer(
            offerId,
            _tokenId,
            msg.sender,
            _price,
            _currency
        );

        return offerId;
    }

    function buy(uint256 _offerId) external payable validOffer(_offerId) returns (uint256) {
        return _buy(_offerId);
    }

    function safeBuy(uint256 _offerId, uint256 _anchor) external payable validOffer(_offerId) returns (uint256) {
        if (_anchor != offers[_offerId].tokenId) {
            revert BadAnchor();
        }

        return _buy(_offerId);
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

    function _buy(uint256 _offerId) private nonReentrant whenNotPaused returns (uint256) {
        Offer storage offer = offers[_offerId];

        IMortgageToken mortgageTokenContract = IMortgageToken(mortgageToken);
        uint256 tokenId = offer.tokenId;
        Loan memory loan = mortgageTokenContract.getLoan(tokenId);
        if (loan.state != LoanState.Supplied
            || loan.due <= block.timestamp) {
            revert UnavailableLoan();
        }

        address seller = offer.seller;
        if (msg.sender == seller || offer.state != OfferState.Selling) {
            revert InvalidBuying();
        }

        uint256 price = offer.price;
        (
            address royaltyReceiver,
            uint256 royaltyAmount
        ) = mortgageTokenContract.royaltyInfo(tokenId, price);

        address currency = offer.currency;
        royaltyAmount = _applyDiscount(royaltyAmount, currency);

        (
            address commissionReceiver,
            uint256 commissionAmount
        ) = ICommissionToken(commissionToken).commissionInfo(loan.estateId, royaltyAmount);

        if (currency == address(0)) {
            CurrencyHandler.receiveNative(price + royaltyAmount);
            CurrencyHandler.sendNative(seller, price);
            CurrencyHandler.sendNative(royaltyReceiver, royaltyAmount - commissionAmount);
            CurrencyHandler.sendNative(commissionReceiver, commissionAmount);
        } else {
            CurrencyHandler.forwardERC20(currency, seller, price);
            CurrencyHandler.forwardERC20(currency, royaltyReceiver, royaltyAmount - commissionAmount);
            CurrencyHandler.forwardERC20(currency, commissionReceiver, commissionAmount);
        }

        offer.state = OfferState.Sold;
        mortgageTokenContract.safeTransferFrom(
            seller,
            msg.sender,
            tokenId,
            ""
        );

        emit OfferSale(
            _offerId,
            msg.sender,
            royaltyReceiver,
            royaltyAmount,
            commissionReceiver,
            commissionAmount
        );

        return price + royaltyAmount;
    }

}
