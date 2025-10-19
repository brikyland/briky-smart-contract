// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

/// contracts/common/utilities/
import {CurrencyHandler} from "../common/utilities/CurrencyHandler.sol";
import {Formula} from "../common/utilities/Formula.sol";

/// contracts/land/utilities/
import {CommissionDispatchable} from "../land/utilities/CommissionDispatchable.sol";

/// contracts/lux/contracts/
import {AssetMarketplace} from "../lux/utilities/AssetMarketplace.sol";

/**
 *  @author Briky Team
 *
 *  @notice The `EstateMarketplace` contract hosts a marketplace for estate tokens.
 * 
 *  @dev    Each unit of asset token is represented in scaled form as `10 ** IAssetToken(collection).decimals()` following the
 *          convention of interface `IAssetToken`.
 *  @dev    ERC-20 tokens are identified by their contract addresses.
 *          Native coin is represented by the zero address (0x0000000000000000000000000000000000000000).
 */
contract EstateMarketplace is
AssetMarketplace,
CommissionDispatchable {
    /** ===== LIBRARY ===== **/
    using Formula for uint256;


    /** ===== CONSTANT ===== **/
    string constant private VERSION = "v1.2.1";


    /** ===== FUNCTION ===== **/
    /* --- Initialization --- */
    /**
     *  @notice Initialize the contract after deployment, serving as the constructor.
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
        /// Initializer
        __AssetMarketplace_init(_admin, _estateToken);
        __CommissionDispatchable_init(_commissionToken);
    }


    /* --- Helper --- */
    /**
     *  @notice Charge royalty on an offer.
     *
     *          Name        Description
     *  @param  _offerId    Offer identifier.
     *  @param  _royalty    Charged royalty.
     */
    function _chargeRoyalty(
        uint256 _offerId,
        uint256 _royalty
    ) internal override {
        AssetOffer storage offer = offers[_offerId];
        address royaltyReceiver = offer.royaltyReceiver;
        address currency = offer.currency;

        /// @dev    Transfer commission derived from the charged royalty to the associated broker.
        uint256 commission = _dispatchCommission(
            offer.tokenId,
            _royalty,
            currency
        );

        CurrencyHandler.sendCurrency(
            currency,
            royaltyReceiver,
            _royalty - commission
        );
    }
}
