// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

/// @openzeppelin/contracts-upgradeable/
import {ERC165CheckerUpgradeable} from "@openzeppelin/contracts-upgradeable/utils/introspection/ERC165CheckerUpgradeable.sol";

/// contracts/land/utilities/
import {CommissionDispatchable} from "../land/utilities/CommissionDispatchable.sol";

/// contracts/lend/interfaces/
import {IMortgageToken} from "../lend/interfaces/IMortgageToken.sol";

/// contracts/lend/structs/
import {IMortgage} from "../lend/structs/IMortgage.sol";

/// contracts/lux/contracts/
import {ERC721Marketplace} from "./ERC721Marketplace.sol";

/**
 *  @author Briky Team
 *
 *  @notice The `MortgageMarketplace` contract hosts a marketplace for mortgage tokens.
 */
contract MortgageMarketplace is
IMortgage,
ERC721Marketplace {
    /** ===== LIBRARY ===== **/
    using ERC165CheckerUpgradeable for address;


    /** ===== CONSTANT ===== **/
    string constant private VERSION = "v1.2.1";


    /** ===== FUNCTION ===== **/
    /* --- Helper --- */
    /**
     *          Name            Description
     *  @param  _collection     Collection contract address.
     * 
     *  @return Whether the collection is supported by the marketplace.
     * 
     *  @dev    The collection must support interface `IMortgageToken`.
     */
    function _validCollection(
        address _collection
    ) internal override view returns (bool) {
        return _collection.supportsInterface(type(IMortgageToken).interfaceId);
    }
    
    /**
     *          Name            Description
     *  @param  _collection     Collection contract address.
     *  @param  _tokenId        Token identifier.
     * 
     *  @return Whether the mortgage token is valid for sale.
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
