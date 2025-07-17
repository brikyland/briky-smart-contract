// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IERC165Upgradeable} from "@openzeppelin/contracts-upgradeable/interfaces/IERC165Upgradeable.sol";
import {IERC1155MetadataURIUpgradeable} from "@openzeppelin/contracts-upgradeable/interfaces/IERC1155MetadataURIUpgradeable.sol";
import {ERC1155Upgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC1155/ERC1155Upgradeable.sol";
import {ERC1155PausableUpgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC1155/extensions/ERC1155PausableUpgradeable.sol";
import {ERC1155SupplyUpgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC1155/extensions/ERC1155SupplyUpgradeable.sol";
import {ERC1155URIStorageUpgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC1155/extensions/ERC1155URIStorageUpgradeable.sol";

import {CommonConstant} from "../../common/constants/CommonConstant.sol";

import {Administrable} from "../../common/utilities/Administrable.sol";
import {Discountable} from "../../common/utilities/Discountable.sol";
import {Pausable} from "../../common/utilities/Pausable.sol";
import {RoyaltyRateProposer} from "../../common/utilities/RoyaltyRateProposer.sol";
import {Validatable} from "../../common/utilities/Validatable.sol";

import {EstateTokenizer} from "../../land/utilities/EstateTokenizer.sol";

import {LaunchPadStorage} from "../storages/LaunchPadStorage.sol";

import {ILaunchPad} from "../interfaces/ILaunchPad.sol";

abstract contract LaunchPad is
LaunchPadStorage,
ERC1155PausableUpgradeable,
ERC1155SupplyUpgradeable,
ERC1155URIStorageUpgradeable,
EstateTokenizer,
Discountable,
RoyaltyRateProposer,
Pausable,
Validatable {
    string constant private VERSION = "v1.1.1";

    receive() external payable {}

    function __LaunchPad_init(
        address _admin,
        address _estateToken,
        address _priceWatcher,
        address _feeReceiver,
        address _reserveVault,
        address _validator,
        string calldata _uri,
        uint256 _baseMinUnitPrice,
        uint256 _baseMaxUnitPrice,
        uint256 _royaltyRate
    ) internal onlyInitializing {
        require(_royaltyRate <= CommonConstant.COMMON_RATE_MAX_FRACTION);

        __ERC1155Pausable_init();

        __Validatable_init(_validator);

        admin = _admin;
        estateToken = _estateToken;
        priceWatcher = _priceWatcher;
        feeReceiver = _feeReceiver;
        reserveVault = _reserveVault;

        _setBaseURI(_uri);
        emit BaseURIUpdate(_uri);

        baseMinUnitPrice = _baseMinUnitPrice;
        baseMaxUnitPrice = _baseMaxUnitPrice;
        emit BaseUnitPriceRangeUpdate(_baseMinUnitPrice, _baseMaxUnitPrice);

        royaltyRate = _royaltyRate;
        emit RoyaltyRateUpdate(_royaltyRate);
    }

    function supportsInterface(bytes4 _interfaceId) public view virtual override(
        IERC165Upgradeable,
        EstateTokenizer,
        RoyaltyRateProposer,
        ERC1155Upgradeable
    ) returns (bool) {
        return _interfaceId == type(ILaunchPad).interfaceId
            || super.supportsInterface(_interfaceId);
    }

    function uri(uint256 _tokenId) public view override(
        IERC1155MetadataURIUpgradeable,
        ERC1155Upgradeable,
        ERC1155URIStorageUpgradeable
    ) returns (string memory) {
        return super.uri(_tokenId);
    }

    function _beforeTokenTransfer(
        address _operator,
        address _from,
        address _to,
        uint256[] memory _ids,
        uint256[] memory _amounts,
        bytes memory _data
    ) internal override(
        ERC1155Upgradeable,
        ERC1155PausableUpgradeable,
        ERC1155SupplyUpgradeable
    ) {
        super._beforeTokenTransfer(_operator, _from, _to, _ids, _amounts, _data);
    }

    function _afterTokenTransfer(
        address _operator,
        address _from,
        address _to,
        uint256[] memory _ids,
        uint256[] memory _amounts,
        bytes memory _data
    ) internal override {
        super._afterTokenTransfer(_operator, _from, _to, _ids, _amounts, _data);
        uint256 timestamp = block.timestamp;
        for (uint256 i; i < _ids.length; ++i) {
            uint256 tokenId = _ids[i];
            if (_from != address(0)) {
                balanceSnapshots[tokenId][_from].push(Snapshot(balanceOf(_from, tokenId), timestamp));
            }
            if (_to != address(0)) {
                balanceSnapshots[tokenId][_to].push(Snapshot(balanceOf(_to, tokenId), timestamp));
            }
        }
    }

    function __royaltyReceiver() external view returns (address) {
        return feeReceiver;
    }
}
