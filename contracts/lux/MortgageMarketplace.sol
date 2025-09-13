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

/// contracts/common/constants/
import {CommonConstant} from "../common/constants/CommonConstant.sol";

/// contracts/common/utilities/
import {Administrable} from "../common/utilities/Administrable.sol";
import {Discountable} from "../common/utilities/Discountable.sol";
import {Pausable} from "../common/utilities/Pausable.sol";

/// contracts/land/interfaces/
import {ICommissionToken} from "../land/interfaces/ICommissionToken.sol";

/// contracts/land/utilities/
import {CommissionDispatchable} from "../land/utilities/CommissionDispatchable.sol";

/// contracts/lend/interfaces/
import {IEstateMortgageToken} from "../lend/interfaces/IEstateMortgageToken.sol";
import {IMortgageToken} from "../lend/interfaces/IMortgageToken.sol";

/// contracts/lux/storages/
import {MortgageMarketplaceStorage} from "../lux/storages/MortgageMarketplaceStorage.sol";

/// contracts/lux/contracts/
import {ERC721Marketplace} from "./ERC721Marketplace.sol";

/**
 *  @author Briky Team
 *
 *  @notice Implementation of contract `MortgageMarketplace`.
 *  @notice The `MortgageMarketplace` contract hosts a marketplace for mortgage tokens.
 */
contract MortgageMarketplace is
MortgageMarketplaceStorage,
ERC721Marketplace,
CommissionDispatchable {
    /** ===== LIBRARY ===== **/
    using ERC165CheckerUpgradeable for address;


    /** ===== CONSTANT ===== **/
    string constant private VERSION = "v1.2.1";


    /** ===== FUNCTION ===== **/
    /* --- Helper --- */
    /**
     *          Name           Description
     *  @param  _collection    Collection address.
     * 
     *  @return Whether the collection is accepted by the mortgage marketplace.
     */
    function _validCollection(
        address _collection
    ) internal override view returns (bool) {
        return _collection.supportsInterface(type(IMortgageToken).interfaceId);
    }
    
    /**
     *          Name           Description
     *  @param  _collection    Collection address.
     *  @param  _tokenId       Token identifier.
     * 
     *  @return Whether the mortgage token is available for purchase.
     */
    function _validToken(
        address _collection,
        uint256 _tokenId
    ) internal override view returns (bool) {
        Mortgage memory mortgage = IMortgageToken(_collection).getMortgage(_tokenId);
        return mortgage.state == MortgageState.Supplied
            && mortgage.due > block.timestamp;
    }
}
