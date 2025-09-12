// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ReentrancyGuardUpgradeable} from "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
import {ERC165CheckerUpgradeable} from "@openzeppelin/contracts-upgradeable/utils/introspection/ERC165CheckerUpgradeable.sol";

import {CurrencyHandler} from "../lib/CurrencyHandler.sol";
import {Formula} from "../lib/Formula.sol";

import {IAdmin} from "../common/interfaces/IAdmin.sol";

import {CommonConstant} from "../common/constants/CommonConstant.sol";

import {Administrable} from "../common/utilities/Administrable.sol";
import {Discountable} from "../common/utilities/Discountable.sol";
import {Pausable} from "../common/utilities/Pausable.sol";

import {ICommissionToken} from "../land/interfaces/ICommissionToken.sol";

import {CommissionDispatchable} from "../land/utilities/CommissionDispatchable.sol";

import {IEstateMortgageToken} from "../lend/interfaces/IEstateMortgageToken.sol";
import {IMortgageToken} from "../lend/interfaces/IMortgageToken.sol";

import {MortgageMarketplaceStorage} from "../lux/storages/MortgageMarketplaceStorage.sol";

contract MortgageMarketplace is
MortgageMarketplaceStorage,
Administrable,
CommissionDispatchable,
Discountable,
Pausable,
ReentrancyGuardUpgradeable {
    using Formula for uint256;
    using ERC165CheckerUpgradeable for address;

    string constant private VERSION = "v1.2.1";

    modifier validOffer(uint256 _offerId) {
        if (_offerId == 0 || _offerId > offerNumber) {
            revert InvalidOfferId();
        }
        _;
    }

    receive() external payable {}

    function initialize(
        address _admin,
        address _commissionToken
    ) external initializer {
        __Pausable_init();
        __ReentrancyGuard_init();

        __CommissionDispatchable_init(_commissionToken);

        admin = _admin;
    }

    function version() external pure returns (string memory) {
        return VERSION;
    }

    function getOffer(uint256 _offerId)
    external view validOffer(_offerId) returns (Offer memory) {
        return offers[_offerId];
    }

    function registerCollections(
        address[] calldata _collections,
        bool _isCollection,
        bytes[] calldata _signatures
    ) external {
        IAdmin(admin).verifyAdminSignatures(
            abi.encode(
                address(this),
                "registerCollections",
                _collections,
                _isCollection
            ),
            _signatures
        );

        if (_isCollection) {
            for (uint256 i; i < _collections.length; ++i) {
                if (_collections[i].supportsInterface(type(IMortgageToken).interfaceId)) {
                    revert InvalidCollection();
                }
                if (isCollection[_collections[i]]) {
                    revert RegisteredCollection();
                }
                isCollection[_collections[i]] = true;
                emit CollectionRegistration(_collections[i]);
            }
        } else {
            for (uint256 i; i < _collections.length; ++i) {
                if (!isCollection[_collections[i]]) {
                    revert NotRegisteredCollection();
                }
                isCollection[_collections[i]] = true;
                emit CollectionDeregistration(_collections[i]);
            }
        }
    }

    function list(
        address _collection,
        uint256 _tokenId,
        uint256 _price,
        address _currency
    ) external onlyAvailableCurrency(_currency) whenNotPaused returns (uint256) {
        if (!isCollection[_collection]) {
            revert InvalidCollection();
        }

        IMortgageToken mortgageTokenContract = IMortgageToken(_collection);
        if (mortgageTokenContract.ownerOf(_tokenId) != msg.sender) {
            revert InvalidTokenId();
        }

        Mortgage memory mortgage = mortgageTokenContract.getMortgage(_tokenId);
        if (mortgage.state != MortgageState.Supplied
            || mortgage.due <= block.timestamp) {
            revert UnavailableMortgage();
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

    function _buy(uint256 _offerId) internal nonReentrant whenNotPaused returns (uint256) {
        Offer storage offer = offers[_offerId];

        address collection = offer.collection;

        IMortgageToken mortgageTokenContract = IMortgageToken(collection);
        uint256 tokenId = offer.tokenId;
        Mortgage memory mortgage = mortgageTokenContract.getMortgage(tokenId);
        if (mortgage.state != MortgageState.Supplied
            || mortgage.due <= block.timestamp) {
            revert UnavailableMortgage();
        }

        address seller = offer.seller;
        if (msg.sender == seller || offer.state != OfferState.Selling) {
            revert InvalidBuying();
        }

        uint256 price = offer.price;
        (
            address royaltyReceiver,
            uint256 royalty
        ) = mortgageTokenContract.royaltyInfo(tokenId, price);

        address currency = offer.currency;
        royalty = _applyDiscount(royalty, currency);

        CurrencyHandler.receiveCurrency(currency, price + royalty);

        uint256 commission;
        if (collection.supportsInterface(type(IEstateMortgageToken).interfaceId)) {
            commission = _dispatchCommission(
                offer.tokenId,
                royalty,
                currency
            );
        }

        CurrencyHandler.sendCurrency(currency, seller, price);
        CurrencyHandler.sendCurrency(currency, royaltyReceiver, royalty - commission);

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
            royalty
        );

        return price + royalty;
    }

}
