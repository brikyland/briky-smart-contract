// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

/// @openzeppelin/contracts-upgradeable/
import {IERC721Upgradeable} from "@openzeppelin/contracts-upgradeable/interfaces/IERC721Upgradeable.sol";
import {IERC2981Upgradeable} from "@openzeppelin/contracts-upgradeable/interfaces/IERC2981Upgradeable.sol";
import {ReentrancyGuardUpgradeable} from "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
import {ERC165CheckerUpgradeable} from "@openzeppelin/contracts-upgradeable/utils/introspection/ERC165CheckerUpgradeable.sol";

/// contracts/common/interfaces/
import {IAdmin} from "../common/interfaces/IAdmin.sol";

/// contracts/common/utilities/
import {Administrable} from "../common/utilities/Administrable.sol";
import {CurrencyHandler} from "../common/utilities/CurrencyHandler.sol";
import {Discountable} from "../common/utilities/Discountable.sol";
import {Formula} from "../common/utilities/Formula.sol";
import {Pausable} from "../common/utilities/Pausable.sol";

/// contracts/lux/storages/
import {ERC721MarketplaceStorage} from "../lux/storages/ERC721MarketplaceStorage.sol";

/**
 *  @author Briky Team
 *
 *  @notice An `ERC721Marketplace` contract hosts a marketplace for ERC-721 tokens.
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
     *  @notice Verify a valid offer identifier.
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
    /* --- Common --- */
    /**
     *  @notice Executed on a call to this contract with empty calldata.
     */
    receive() external payable {}

    /**
     *  @return Version of implementation.
     */
    function version() external pure returns (string memory) {
        return VERSION;
    }


    /* --- Initialization --- */
    /**
     *  @notice Initialize the contract after deployment, serving as the constructor.
     * 
     *          Name            Description
     *  @param  _admin          `Admin` contract address.
     *  @param  _feeReceiver    `FeeReceiver` contract address.
     */
    function initialize(
        address _admin,
        address _feeReceiver
    ) public virtual
    initializer {
        /// Initializer
        __Pausable_init();
        __ReentrancyGuard_init();

        /// Dependency
        admin = _admin;
        feeReceiver = _feeReceiver;
    }


    /* --- Administration --- */
    /**
     *  @notice Register or deregister multiple collections.
     *
     *          Name            Description
     *  @param  _collections    Array of contract addresses.
     *  @param  _isCollection   Whether the operation is registration or deregistration.
     *  @param  _signatures     Array of admin signatures.
     * 
     *  @dev    Administrative operator.
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
                isCollection[_collections[i]] = false;
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
     *  @return Configuration and progress of the offer.
     */
    function getOffer(
        uint256 _offerId
    ) external view
    validOffer(_offerId)
    returns (ERC721Offer memory) {
        return offers[_offerId];
    }

    /* --- Command --- */
    /**
     *  @notice List a new offer of an ERC721 token.
     *
     *          Name            Description
     *  @param  _collection     Token collection contract address.
     *  @param  _tokenId        Token identifier.
     *  @param  _price          Sale price.
     *  @param  _currency       Sale currency address.
     * 
     *  @return New offer identifier.
     * 
     *  @dev    The collection must support interface `IERC721Upgradeable`.
     *  @dev    Approval must be granted for this contract to transfer collateral before borrowing. A mortgage can only be
     *          lent while approval remains active.     
     */
    function list(
        address _collection,
        uint256 _tokenId,
        uint256 _price,
        address _currency
    ) external
    whenNotPaused
    nonReentrant
    onlyAvailableCurrency(_currency)
    returns (uint256) {
        if (_price == 0) {
            revert InvalidPrice();
        }

        if (!isCollection[_collection]) {
            revert InvalidCollection();
        }
        
        if (IERC721Upgradeable(_collection).ownerOf(_tokenId) != msg.sender
            || !_validToken(_collection, _tokenId)) {
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

        offers[offerId] = ERC721Offer(
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
            royaltyReceiver,
            _currency
        );

        return offerId;
    }

    /**
     *  @notice Buy an offer.
     *  @notice Buy only if the offer is in `Selling` state.
     *
     *          Name            Description
     *  @param  _offerId        Offer identifier.
     * 
     *  @return Sum of sale price and royalty.
     */
    function buy(
        uint256 _offerId
    ) external payable
    whenNotPaused
    validOffer(_offerId)
    returns (uint256) {
        return _buy(_offerId);
    }

    /**
     *  @notice Cancel an offer.
     *  @notice Cancel only if the offer is in `Selling` state.
     *
     *          Name            Description
     *  @param  _offerId        Offer identifier.
     * 
     *  @dev    Permission:
     *          - Seller of the offer.
     *          - Managers: disqualify defected offers only.
     */
    function cancel(
        uint256 _offerId
    ) external
    whenNotPaused
    nonReentrant
    validOffer(_offerId) {
        ERC721Offer storage offer = offers[_offerId];
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
     *  @notice Buy only if the offer is in `Selling` state.
     *
     *          Name        Description
     *  @param  _offerId    Offer identifier.
     *  @param  _anchor     `tokenId` of the offer.
     * 
     *  @return Sum of sale price and royalty.
     * 
     *  @dev    Anchor enforces consistency between this contract and the client-side.
     */
    function safeBuy(
        uint256 _offerId,
        uint256 _anchor
    ) external payable
    whenNotPaused
    validOffer(_offerId)
    returns (uint256) {
        if (_anchor != offers[_offerId].tokenId) {
            revert BadAnchor();
        }

        return _buy(_offerId);
    }


    /* --- Helper --- */
    /**
     *  @notice Buy an offer.
     *  @notice Buy only if the offer is in `Selling` state.
     *
     *          Name        Description
     *  @param  _offerId    Offer identifier.
     *
     *  @return Sum of sale price and royalty.
     */
    function _buy(
        uint256 _offerId
    ) internal
    nonReentrant
    whenNotPaused
    returns (uint256) {
        ERC721Offer storage offer = offers[_offerId];

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

        CurrencyHandler.receiveCurrency(
            currency,
            price + royalty
        );
        CurrencyHandler.sendCurrency(
            currency,
            seller,
            price
        );

        _chargeRoyalty(_offerId);

        offer.state = OfferState.Sold;
        IERC721Upgradeable(collection).safeTransferFrom(
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

    /**
     *          Name            Description
     *  @param  _collection     Collection contract address.
     * 
     *  @return Whether the collection is supported by the marketplace.
     */
    function _validCollection(
        address _collection
    ) internal virtual view returns (bool) {
        return _collection != address(this)
            && _collection.supportsInterface(type(IERC721Upgradeable).interfaceId);
    }
    
    /**
     *  @return Whether the token is valid for sale.
     */
    function _validToken(
        address,
        uint256
    ) internal virtual view returns (bool) {
        return true;
    }

    /**
     *  @notice Charge royalty on an offer.
     *
     *          Name            Description
     *  @param  _offerId        Offer identifier.
     */
    function _chargeRoyalty(
        uint256 _offerId
    ) internal virtual {
        ERC721Offer storage offer = offers[_offerId];
        CurrencyHandler.sendCurrency(
            offer.currency,
            offer.royaltyReceiver,
            offer.royalty
        );
    }
}
