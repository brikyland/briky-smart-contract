// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ReentrancyGuardUpgradeable} from "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
import {ERC165CheckerUpgradeable} from "@openzeppelin/contracts-upgradeable/utils/introspection/ERC165CheckerUpgradeable.sol";

import {CurrencyHandler} from "../common/utilities/CurrencyHandler.sol";
import {Formula} from "../common/utilities/Formula.sol";

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

import {ERC721Marketplace} from "./ERC721Marketplace.sol";

contract MortgageMarketplace is
MortgageMarketplaceStorage,
ERC721Marketplace,
CommissionDispatchable {
    using ERC165CheckerUpgradeable for address;

    string constant private VERSION = "v1.2.1";

    function _validCollection(
        address _collection
    ) internal override view returns (bool) {
        return _collection.supportsInterface(type(IMortgageToken).interfaceId);
    }
    
    function _validToken(
        address _collection,
        uint256 _tokenId
    ) internal override view returns (bool) {
        Mortgage memory mortgage = IMortgageToken(_collection).getMortgage(_tokenId);
        return mortgage.state == MortgageState.Supplied
            && mortgage.due > block.timestamp;
    }
}
