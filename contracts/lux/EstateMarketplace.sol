// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @openzeppelin/contracts-upgradeable/
import {ReentrancyGuardUpgradeable} from "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";

/// contracts/common/utilities/
import {CurrencyHandler} from "../common/utilities/CurrencyHandler.sol";
import {Formula} from "../common/utilities/Formula.sol";

/// contracts/common/interfaces/
import {IAdmin} from "../common/interfaces/IAdmin.sol";

/// contracts/common/constants/
import {CommonConstant} from "../common/constants/CommonConstant.sol";

/// contracts/land/interfaces/
import {ICommissionToken} from "../land/interfaces/ICommissionToken.sol";
import {IEstateToken} from "../land/interfaces/IEstateToken.sol";

/// contracts/land/utilities/
import {CommissionDispatchable} from "../land/utilities/CommissionDispatchable.sol";

/// contracts/lux/storages/
import {EstateMarketplaceStorage} from "../lux/storages/EstateMarketplaceStorage.sol";

/// contracts/lux/contracts/
import {AssetMarketplace} from "../lux/AssetMarketplace.sol";

/**
 *  @author Briky Team
 *
 *  @notice Implementation of contract `EstateMarketplace`.
 *  @notice The `EstateMarketplace` contract hosts a marketplace for estate tokens.
 * 
 *  @dev    TODO: All amounts are expressed in absolute units. Scale these values by `10 ** estateToken.decimals()` to obtain
 *          the correct amounts under the `estateToken` convention.
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
    /* --- Initializer --- */
    /**
     *  @notice Initialize the contract.
     */
    function initialize(
        address _admin,
        address _estateToken,
        address _commissionToken
    ) external initializer {
        /// @dev    Inherited initializer.
        super.initialize(_admin, _estateToken);
        
        __CommissionDispatchable_init(_commissionToken);
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
        Offer storage offer = offers[_offerId];
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
