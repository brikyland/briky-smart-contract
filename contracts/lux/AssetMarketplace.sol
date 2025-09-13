// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @openzeppelin/contracts-upgradeable/
import {ReentrancyGuardUpgradeable} from "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
import {ERC165CheckerUpgradeable} from "@openzeppelin/contracts-upgradeable/utils/introspection/ERC165CheckerUpgradeable.sol";

/// contracts/common/utilities/
import {CurrencyHandler} from "../common/utilities/CurrencyHandler.sol";
import {Formula} from "../common/utilities/Formula.sol";

/// contracts/common/interfaces/
import {IAdmin} from "../common/interfaces/IAdmin.sol";
import {IAssetToken} from "../common/interfaces/IAssetToken.sol";

/// contracts/common/utilities/
import {Administrable} from "../common/utilities/Administrable.sol";
import {Discountable} from "../common/utilities/Discountable.sol";
import {Pausable} from "../common/utilities/Pausable.sol";

/// contracts/lux/storages/
import {AssetMarketplaceStorage} from "../lux/storages/AssetMarketplaceStorage.sol";

/**
 *  @author Briky Team
 *
 *  @notice Implementation of contract `AssetMarketplace`.
 *  @notice The `AssetMarketplace` contract hosts a marketplace for asset tokens.

 *  @dev    The asset token must support interface `IAssetToken`.
 *  @dev    TODO: All amounts are expressed in absolute units. Scale these values by `10 ** IAssetToken.decimals()` to obtain
 *          the correct amounts under the `IAssetToken` convention.
 *  @dev    ERC-20 tokens are identified by their contract addresses.
 *          Native coin is represented by the zero address (0x0000000000000000000000000000000000000000).
 */
contract AssetMarketplace is
AssetMarketplaceStorage,
Administrable,
Discountable,
Pausable,
ReentrancyGuardUpgradeable {
    /** ===== LIBRARY ===== **/
    using ERC165CheckerUpgradeable for address;
    using Formula for uint256;


    /** ===== CONSTANT ===== **/
    string constant private VERSION = "v1.2.1";


    /** ===== MODIFIER ===== **/
    /**
     *  @notice Verify a valid offer.
     *
     *          Name        Description
     *  @param  _offerId    Offer identifier.
     */
    modifier validOffer(uint256 _offerId) {
        if (_offerId == 0 || _offerId > offerNumber) {
            revert InvalidOfferId();
        }
        _;
    }


    /** ===== FUNCTION ===== **/
    /* --- Special --- */
    /**
     *  @notice Executed on a call to the contract with empty calldata.
     */
    receive() external payable {}

    /**
     *          Name       Description
     *  @return version    Version of implementation.
     */
    function version() external pure returns (string memory) {
        return VERSION;
    }


    /* --- Initializer --- */
    /**
     *  @notice Invoked after deployment for initialization, serving as a constructor.
     */
    function initialize(
        address _admin,
        address _collection
    ) public initializer {
        /// @dev    Inherited initializer.
        __Pausable_init();
        __ReentrancyGuard_init();

        /// @dev    Dependency
        admin = _admin;
        collection = _collection;
    }

    /* --- Query --- */
    /**
     *  @notice Get an offer.
     *
     *          Name        Description
     *  @param  _offerId    Offer identifier.
     * 
     *  @return Information and progress of the offer.
     */
    function getOffer(uint256 _offerId)
    external view validOffer(_offerId) returns (Offer memory) {
        return offers[_offerId];
    }

    /* --- Command --- */
    /**
     *  @notice List a new offer for asset tokens.
     *
     *          Name           Description
     *  @param  _tokenId       Token identifier.
     *  @param  _sellingAmount Amount of tokens to sell.
     *  @param  _unitPrice     Selling price per token.
     *  @param  _currency      Selling currency address.
     *  @param  _isDivisible   Whether the offer is sold in parts.
     * 
     *  @return New offer identifier.
     */
    function list(
        uint256 _tokenId,
        uint256 _sellingAmount,
        uint256 _unitPrice,
        address _currency,
        bool _isDivisible
    ) external onlyAvailableCurrency(_currency) whenNotPaused returns (uint256) {
        IAssetToken assetContract = IAssetToken(collection);
        if (!assetContract.isAvailable(_tokenId)) {
            revert InvalidTokenId();
        }

        if (_unitPrice == 0) {
            revert InvalidUnitPrice();
        }

        if (_sellingAmount == 0
            || _sellingAmount > assetContract.balanceOf(msg.sender, _tokenId)) {
            revert InvalidSellingAmount();
        }

        (
            address royaltyReceiver,
            uint256 royaltyDenomination
        ) = assetContract.royaltyInfo(_tokenId, _unitPrice);
        royaltyDenomination = _applyDiscount(royaltyDenomination, _currency);

        uint256 offerId = ++offerNumber;

        offers[offerId] = Offer(
            _tokenId,
            _sellingAmount,
            0,
            _unitPrice,
            royaltyDenomination,
            _currency,
            _isDivisible,
            OfferState.Selling,
            msg.sender,
            royaltyReceiver
        );

        emit NewOffer(
            offerId,
            _tokenId,
            msg.sender,
            _sellingAmount,
            _unitPrice,
            royaltyDenomination,
            _currency,
            _isDivisible,
            royaltyReceiver
        );

        return offerId;
    }

    /**
     *  @notice Buy an offer.
     *
     *          Name        Description
     *  @param  _offerId    Offer identifier.
     * 
     *  @return Selling price including royalty.
     */
    function buy(
        uint256 _offerId
    ) external payable validOffer(_offerId) returns (uint256) {
        return _buy(_offerId, offers[_offerId].sellingAmount - offers[_offerId].soldAmount);
    }

    /**
     *  @notice Buy a part of the offer.
     *
     *          Name        Description
     *  @param  _offerId    Offer identifier.
     *  @param  _amount     Amount of tokens to buy.
     * 
     *  @return Selling price including royalty.
     */
    function buy(
        uint256 _offerId,
        uint256 _amount
    ) external payable validOffer(_offerId) returns (uint256) {
        if (!offers[_offerId].isDivisible) {
            revert NotDivisible();
        }

        return _buy(_offerId, _amount);
    }

    /**
     *  @notice Cancel an offer.
     *
     *          Name        Description
     *  @param  _offerId    Offer identifier.
     * 
     *  @dev    Permission: managers or offer owner.
     */
    function cancel(
        uint256 _offerId
    ) external nonReentrant validOffer(_offerId) whenNotPaused {
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


    /* --- Safe Command --- */
    /**
     *  @notice Buy an offer.
     *
     *          Name        Description
     *  @param  _offerId    Offer identifier.
     *  @param  _anchor     Token identifier of the offer.
     * 
     *  @return Selling price including royalty.
     */
    function safeBuy(
        uint256 _offerId,
        uint256 _anchor
    ) external payable validOffer(_offerId) returns (uint256) {
        if (_anchor != offers[_offerId].tokenId) {
            revert BadAnchor();
        }

        return _buy(_offerId, offers[_offerId].sellingAmount - offers[_offerId].soldAmount);
    }

    /**
     *  @notice Buy a part of the offer.
     *
     *          Name        Description
     *  @param  _offerId    Offer identifier.
     *  @param  _amount     Amount of tokens to buy.
     *  @param  _anchor     Token identifier of the offer.
     * 
     *  @return Selling price including royalty.
     */
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


    /* --- Helper --- */
    /**
     *  @notice Buy an offer.
     *
     *          Name        Description
     *  @param  _offerId    Offer identifier.
     *  @param  _amount     Amount of tokens to buy.
     * 
     *  @return Selling price including royalty.
     */
    function _buy(
        uint256 _offerId,
        uint256 _amount
    ) internal nonReentrant whenNotPaused returns (uint256) {
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

        IAssetToken assetContract = IAssetToken(collection);
        uint256 tokenId = offer.tokenId;
        uint256 value = offer.unitPrice.scale(_amount, 10 ** assetContract.decimals());
        uint256 royalty = offer.royaltyDenomination.scale(_amount, 10 ** assetContract.decimals());
        
        address currency = offer.currency;

        CurrencyHandler.receiveCurrency(currency, value + royalty);
        CurrencyHandler.sendCurrency(currency, seller, value);

        _chargeRoyalty(_offerId, royalty);

        offer.soldAmount = newSoldAmount;
        if (newSoldAmount == sellingAmount) {
            offer.state = OfferState.Sold;
        }
        assetContract.safeTransferFrom(
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
            value
        );

        return value + royalty;
    }

    /**
     *  @notice Charge royalty.
     *
     *          Name        Description
     *  @param  _offerId    Offer identifier.
     *  @param  _royalty    Royalty.
     */
    function _chargeRoyalty(
        uint256 _offerId,
        uint256 _royalty
    ) internal virtual {
        Offer storage offer = offers[_offerId];
        CurrencyHandler.sendCurrency(
            offer.currency,
            offer.royaltyReceiver,
            _royalty
        );
    }
}
