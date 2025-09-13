// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @openzeppelin/contracts-upgradeable/
import {IERC165Upgradeable} from "@openzeppelin/contracts-upgradeable/interfaces/IERC165Upgradeable.sol";
import {IERC721Upgradeable} from "@openzeppelin/contracts-upgradeable/interfaces/IERC721Upgradeable.sol";
import {IERC2981Upgradeable} from "@openzeppelin/contracts-upgradeable/interfaces/IERC2981Upgradeable.sol";
import {ERC165CheckerUpgradeable} from "@openzeppelin/contracts-upgradeable/utils/introspection/ERC165CheckerUpgradeable.sol";
import {ReentrancyGuardUpgradeable} from "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";

/// contracts/common/utilities/
import {CurrencyHandler} from "../common/utilities/CurrencyHandler.sol";
import {Formula} from "../common/utilities/Formula.sol";

/// contracts/common/interfaces/
import {IAdmin} from "../common/interfaces/IAdmin.sol";

/// contracts/common/utilities/
import {Administrable} from "../common/utilities/Administrable.sol";
import {Discountable} from "../common/utilities/Discountable.sol";
import {Pausable} from "../common/utilities/Pausable.sol";

/// contracts/lux/storages/
import {ERC721MarketplaceStorage} from "../lux/storages/ERC721MarketplaceStorage.sol";

/**
 *  @author Briky Team
 *
 *  @notice Implementation of contract `ERC721Marketplace`.
 *  @notice The `ERC721Marketplace` contract hosts a marketplace for ERC721 tokens.
 * 
 *  @dev    ERC-20 tokens are identified by their contract addresses.
 *          Native coin is represented by the zero address (0x0000000000000000000000000000000000000000).
 */
contract ERC721Marketplace is
ERC721MarketplaceStorage,
Administrable,
Discountable,
Pausable,
ReentrancyGuardUpgradeable {
    /** ===== LIBRARY ===== **/
    using ERC165CheckerUpgradeable for address;
    using Formula for uint256;


    /** ===== CONSTANT ===== **/
    string private constant VERSION = "v1.2.1";


    /** ===== MODIFIER ===== **/
    /**
     *  @notice Verify a valid offer.
     *
     *          Name        Description
     *  @param  _offerId    Offer identifier.
     */
    modifier validOffer(
        uint256 _offerId
    ) {
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
        address _feeReceiver
    ) public initializer {
        /// @dev    Inherited initializer.
        __Pausable_init();
        __ReentrancyGuard_init();

        /// @dev    Dependency
        admin = _admin;
        feeReceiver = _feeReceiver;
    }


    /* --- Administration --- */
    /**
     *  @notice Register or deregister multiple collections.
     *
     *          Name             Description
     *  @param  _collections     Array of contract addresses.
     *  @param  _isCollection    Whether the operation is registration or deregistration.
     *  @param  _signatures      Array of admin signatures.
     * 
     *  @dev    Administrative configuration.
     */
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
                if (!_validCollection(_collections[i])) {
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

    /* --- Query --- */
    /**
     *  @notice Get an offer.
     *
     *          Name        Description
     *  @param  _offerId    Offer identifier.
     * 
     *  @return Information and progress of the offer.
     */
    function getOffer(
        uint256 _offerId
    ) external view validOffer(_offerId) returns (Offer memory) {
        return offers[_offerId];
    }

    /* --- Command --- */
    /**
     *  @notice List a new offer for an ERC721 token.
     *
     *          Name           Description
     *  @param  _collection    Token collection address.
     *  @param  _tokenId       Token identifier.
     *  @param  _price         Selling price.
     *  @param  _currency      Selling currency address.
     * 
     *  @return New offer identifier.
     */
    function list(
        address _collection,
        uint256 _tokenId,
        uint256 _price,
        address _currency
    ) external onlyAvailableCurrency(_currency) whenNotPaused returns (uint256) {
        if (_price == 0) {
            revert InvalidPrice();
        }

        if (!isCollection[_collection]) {
            revert InvalidCollection();
        }
        
        if (IERC721Upgradeable(_collection).ownerOf(_tokenId) != msg.sender
            || _validToken(_collection, _tokenId)) {
            revert InvalidTokenId();
        }

        address royaltyReceiver;
        uint256 royalty;
        if (_collection.supportsInterface(type(IERC2981Upgradeable).interfaceId)) {
            (royaltyReceiver, royalty) = IERC2981Upgradeable(_collection)
                .royaltyInfo(_tokenId, _price);

            if (royaltyReceiver == feeReceiver) {
                royalty = _applyDiscount(royalty, _currency);
            }
        }

        uint256 offerId = ++offerNumber;

        offers[offerId] = Offer(
            _collection,
            _tokenId,
            _price,
            royalty,
            _currency,
            OfferState.Selling,
            msg.sender,
            royaltyReceiver
        );

        emit NewOffer(
            _collection,
            offerId,
            _tokenId,
            msg.sender,
            _price,
            royalty,
            _currency,
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
     *  @return Buying price including royalty.
     */
    function buy(
        uint256 _offerId
    ) external payable validOffer(_offerId) returns (uint256) {
        return _buy(_offerId);
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
    ) external validOffer(_offerId) whenNotPaused {
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
     *  @return Buying price including royalty.
     */
    function safeBuy(
        uint256 _offerId,
        uint256 _anchor
    ) external payable validOffer(_offerId) returns (uint256) {
        if (_anchor != offers[_offerId].tokenId) {
            revert BadAnchor();
        }

        return _buy(_offerId);
    }

    /* --- Helper --- */
    /**
     *  @notice Buy an offer.
     *
     *          Name        Description
     *  @param  _offerId    Offer identifier.
     * 
     *  @return Buying price including royalty.
     */
    function _buy(
        uint256 _offerId
    ) internal nonReentrant whenNotPaused returns (uint256) {
        Offer storage offer = offers[_offerId];

        address collection = offer.collection;
        if (!isCollection[collection]) {
            revert InvalidCollection();
        }        

        address seller = offer.seller;
        if (msg.sender == seller || offer.state != OfferState.Selling) {
            revert InvalidBuying();
        }

        if (!_validToken(collection, offer.tokenId)) {
            revert InvalidTokenId();
        }

        uint256 tokenId = offer.tokenId;
        uint256 price = offer.price;
        address currency = offer.currency;
        address royaltyReceiver = offer.royaltyReceiver;
        uint256 royalty = offer.royalty;

        CurrencyHandler.receiveCurrency(currency, price + royalty);
        CurrencyHandler.sendCurrency(currency, seller, price);

        _chargeRoyalty(_offerId);

        offer.state = OfferState.Sold;
        IERC721Upgradeable(collection).safeTransferFrom(
            seller,
            msg.sender,
            tokenId,
            ""
        );

        emit OfferSale(_offerId, msg.sender, royaltyReceiver, royalty);

        return price + royalty;
    }

    /**
     *          Name           Description
     *  @param  _collection    Collection address.
     * 
     *  @return Whether the collection is accepted by the marketplace.
     */
    function _validCollection(
        address _collection
    ) internal virtual view returns (bool) {
        return _collection != address(this)
            && _collection.supportsInterface(type(IERC721Upgradeable).interfaceId);
    }
    
    /**
     *          Name           Description
     *  @param  _collection    Collection address.
     *  @param  _tokenId       Token identifier.
     * 
     *  @return Whether the token is available for purchase.
     */
    function _validToken(
        address _collection,
        uint256 _tokenId
    ) internal virtual view returns (bool) {
        return true;
    }

    /**
     *  @notice Charge royalty on an offer.
     *
     *          Name        Description
     *  @param  _offerId    Offer identifier.
     */
    function _chargeRoyalty(
        uint256 _offerId
    ) internal virtual {
        Offer storage offer = offers[_offerId];
        CurrencyHandler.sendCurrency(
            offer.currency,
            offer.royaltyReceiver,
            offer.royalty
        );
    }
}
