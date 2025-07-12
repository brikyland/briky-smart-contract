// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IERC165Upgradeable} from "@openzeppelin/contracts-upgradeable/interfaces/IERC165Upgradeable.sol";
import {IERC721Upgradeable} from "@openzeppelin/contracts-upgradeable/interfaces/IERC721Upgradeable.sol";
import {IERC2981Upgradeable} from "@openzeppelin/contracts-upgradeable/interfaces/IERC2981Upgradeable.sol";
import {ReentrancyGuardUpgradeable} from "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
import {ERC165CheckerUpgradeable} from "@openzeppelin/contracts-upgradeable/utils/introspection/ERC165CheckerUpgradeable.sol";

import {Constant} from "../lib/Constant.sol";
import {CurrencyHandler} from "../lib/CurrencyHandler.sol";
import {Formula} from "../lib/Formula.sol";

import {IAdmin} from "../common/interfaces/IAdmin.sol";

import {Administrable} from "../common/utilities/Administrable.sol";
import {Discountable} from "./utilities/Discountable.sol";
import {Pausable} from "./utilities/Pausable.sol";

import {ERC721MarketplaceStorage} from "./storages/ERC721MarketplaceStorage.sol";

contract ERC721Marketplace is
ERC721MarketplaceStorage,
Administrable,
Discountable,
Pausable,
ReentrancyGuardUpgradeable {
    using ERC165CheckerUpgradeable for address;
    using Formula for uint256;

    string private constant VERSION = "v1.1.1";

    modifier validOffer(uint256 _offerId) {
        if (_offerId == 0 || _offerId > offerNumber) {
            revert InvalidOfferId();
        }
        _;
    }

    receive() external payable {}

    function initialize(
        address _admin,
        address _feeReceiver
    ) external initializer {
        __Pausable_init();
        __ReentrancyGuard_init();

        admin = _admin;
        feeReceiver = _feeReceiver;
    }

    function version() external pure returns (string memory) {
        return VERSION;
    }

    function getOffer(uint256 _offerId)
    external view validOffer(_offerId) returns (Offer memory) {
        return offers[_offerId];
    }

    function list(
        address _collection,
        uint256 _tokenId,
        uint256 _price,
        address _currency
    ) external onlyAvailableCurrency(_currency) whenNotPaused returns (uint256) {
        if (!_collection.supportsInterface(type(IERC721Upgradeable).interfaceId)) {
            revert InvalidCollection();
        }

        if (IERC721Upgradeable(_collection).ownerOf(_tokenId) != msg.sender) {
            revert InvalidTokenId();
        }

        if (_price == 0) {
            revert InvalidPrice();
        }

        uint256 offerId = ++offerNumber;

        offers[offerId] = Offer(
            _collection,
            _tokenId,
            _price,
            _currency,
            OfferState.Selling,
            msg.sender
        );

        emit NewOffer(
            _collection,
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

    function cancel(uint256 _offerId) external validOffer(_offerId) whenNotPaused {
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

        address seller = offer.seller;
        address collection = offer.collection;

        if (msg.sender == seller || offer.state != OfferState.Selling) {
            revert InvalidBuying();
        }

        uint256 tokenId = offer.tokenId;
        uint256 price = offer.price;
        address currency = offer.currency;

        address royaltyReceiver;
        uint256 royaltyAmount;
        if (collection.supportsInterface(type(IERC2981Upgradeable).interfaceId)) {
            (royaltyReceiver, royaltyAmount) = IERC2981Upgradeable(collection)
                .royaltyInfo(tokenId, price);

            if (royaltyReceiver == feeReceiver) {
                royaltyAmount = _applyDiscount(royaltyAmount, currency);
            }
        }

        if (currency == address(0)) {
            CurrencyHandler.receiveNative(price + royaltyAmount);
            CurrencyHandler.sendNative(seller, price);
            if (royaltyReceiver != address(0)) {
                CurrencyHandler.sendNative(royaltyReceiver, royaltyAmount);
            }
        } else {
            CurrencyHandler.forwardERC20(currency, seller, price);
            CurrencyHandler.forwardERC20(
                currency,
                royaltyReceiver,
                royaltyAmount
            );
        }

        offer.state = OfferState.Sold;
        IERC721Upgradeable(collection).safeTransferFrom(
            seller,
            msg.sender,
            tokenId,
            ""
        );

        emit OfferSale(_offerId, msg.sender, royaltyReceiver, royaltyAmount);

        return price + royaltyAmount;
    }
}
