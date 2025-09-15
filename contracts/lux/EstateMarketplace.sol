// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

/// contracts/common/utilities/
import {CurrencyHandler} from "../common/utilities/CurrencyHandler.sol";
import {Formula} from "../common/utilities/Formula.sol";

/// contracts/land/utilities/
import {CommissionDispatchable} from "../land/utilities/CommissionDispatchable.sol";

/// contracts/lux/storages/
import {EstateMarketplaceStorage} from "../lux/storages/EstateMarketplaceStorage.sol";

/// contracts/lux/contracts/
import {AssetMarketplace} from "../lux/AssetMarketplace.sol";

/**
 *  @author Briky Team
 *
 *  @notice The `EstateMarketplace` contract hosts a marketplace for estate tokens.
 * 
 *  @dev    Each unit of asset token is scaled by `10 ** IAssetToken(collection).decimals()` following the convention of `IAssetToken`.
 *  @dev    ERC-20 tokens are identified by their contract addresses.
 *          Native coin is represented by the zero address (0x0000000000000000000000000000000000000000).
 */
contract EstateMarketplace is
EstateMarketplaceStorage,
AssetMarketplace,
CommissionDispatchable {
    /** ===== LIBRARY ===== **/
    using Formula for uint256;


    /** ===== CONSTANT ===== **/
    string constant private VERSION = "v1.2.1";


    /** ===== FUNCTION ===== **/
    /* --- Initialization --- */
    /**
     *  @notice Invoked for initialization after deployment, serving as the contract constructor.
     * 
     *          Name                Description
     *  @param  _admin              `Admin` contract address.
     *  @param  _estateToken        `EstateToken` contract address.
     *  @param  _commissionToken    `CommissionToken` contract address.
     */
    function initialize(
        address _admin,
        address _estateToken,
        address _commissionToken
    ) external
    initializer {
        /// Initializer.
        __Pausable_init();
        __ReentrancyGuard_init();

        __CommissionDispatchable_init(_commissionToken);

        /// Dependency.
        __AssetMarketplace_init(_admin, _estateToken);        
    }


    /* --- Helper --- */
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
    ) internal override {
        AssetOffer storage offer = offers[_offerId];
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
