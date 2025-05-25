// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {PausableUpgradeable} from "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";
import {ReentrancyGuardUpgradeable} from "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
import {IERC20Upgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";
import {SafeERC20Upgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC20/utils/SafeERC20Upgradeable.sol";

import {Constant} from "../lib/Constant.sol";
import {CurrencyHandler} from "../lib/CurrencyHandler.sol";
import {Formula} from "../lib/Formula.sol";

import {IAdmin} from "../common/interfaces/IAdmin.sol";

import {ICommissionToken} from "../land/interfaces/ICommissionToken.sol";

import {IExclusiveToken} from "./interfaces/IExclusiveToken.sol";

import {CommissionMarketplaceStorage} from "./storages/CommissionMarketplaceStorage.sol";

contract CommissionMarketplace is
CommissionMarketplaceStorage,
PausableUpgradeable,
ReentrancyGuardUpgradeable {
    using Formula for uint256;
    using SafeERC20Upgradeable for IERC20Upgradeable;

    string constant private VERSION = "v1.1.1";

    receive() external payable {}

    function initialize(
        address _admin,
        address _commissionToken
    ) external initializer {
        __Pausable_init();
        __ReentrancyGuard_init();

        admin = _admin;
        commissionToken = _commissionToken;
    }

    function version() external pure returns (string memory) {
        return VERSION;
    }

    function pause(bytes[] calldata _signatures) external whenNotPaused {
        IAdmin(admin).verifyAdminSignatures(
            abi.encode(address(this), "pause"),
            _signatures
        );
        _pause();
    }

    function unpause(bytes[] calldata _signatures) external whenPaused {
        IAdmin(admin).verifyAdminSignatures(
            abi.encode(address(this), "unpause"),
            _signatures
        );
        _unpause();
    }

    function getOffer(uint256 _offerId) external view returns (Offer memory) {
        if (_offerId == 0 || _offerId > offerNumber) {
            revert InvalidOfferId();
        }
        return offers[_offerId];
    }

    function list(
        uint256 _tokenId,
        uint256 _price,
        address _currency
    ) external whenNotPaused returns (uint256) {
        ICommissionToken commissionTokenContract = ICommissionToken(commissionToken);
        if (commissionTokenContract.ownerOf(_tokenId) != msg.sender) {
            revert InvalidTokenId();
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

    function buy(uint256 _offerId, uint256 _tokenId) external payable nonReentrant whenNotPaused {
        if (_offerId == 0 || _offerId > offerNumber) {
            revert InvalidOfferId();
        }

        Offer storage offer = offers[_offerId];
        address seller = offer.seller;

        if (msg.sender == seller
            || _tokenId != offer.tokenId
            || offer.state != OfferState.Selling) {
            revert InvalidBuying();
        }

        ICommissionToken commissionTokenContract = ICommissionToken(commissionToken);
        uint256 price = offer.price;
        (address royaltyReceiver, uint256 royaltyAmount) = commissionTokenContract.royaltyInfo(_tokenId, price);

        address currency = offer.currency;
        if (IAdmin(admin).isExclusiveCurrency(currency)) {
            royaltyAmount = royaltyAmount.applyDiscount(IExclusiveToken(currency).exclusiveDiscount());
        }

        if (currency == address(0)) {
            uint256 total = price + royaltyAmount;
            CurrencyHandler.receiveNative(total);
            CurrencyHandler.transferNative(seller, price);
            CurrencyHandler.transferNative(royaltyReceiver, royaltyAmount);
        } else {
            IERC20Upgradeable currencyContract = IERC20Upgradeable(currency);
            currencyContract.safeTransferFrom(msg.sender, seller, price);
            currencyContract.safeTransferFrom(msg.sender, royaltyReceiver, royaltyAmount);
        }

        offer.state = OfferState.Sold;
        commissionTokenContract.safeTransferFrom(
            seller,
            msg.sender,
            _tokenId,
            ""
        );

        emit OfferSale(
            _offerId,
            msg.sender,
            royaltyReceiver,
            royaltyAmount
        );
    }

    function cancel(uint256 _offerId) external nonReentrant whenNotPaused {
        if (_offerId == 0 || _offerId > offerNumber) revert InvalidOfferId();
        Offer storage offer = offers[_offerId];
        if (msg.sender != offer.seller && !IAdmin(admin).isManager(msg.sender)) revert Unauthorized();
        if (offer.state != OfferState.Selling) revert InvalidCancelling();

        offer.state = OfferState.Cancelled;

        emit OfferCancellation(_offerId);
    }
}
