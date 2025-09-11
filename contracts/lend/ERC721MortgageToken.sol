// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IERC165Upgradeable} from "@openzeppelin/contracts-upgradeable/interfaces/IERC165Upgradeable.sol";
import {IERC721Upgradeable} from "@openzeppelin/contracts-upgradeable/interfaces/IERC721Upgradeable.sol";
import {IERC2981Upgradeable} from "@openzeppelin/contracts-upgradeable/interfaces/IERC2981Upgradeable.sol";
import {ERC165CheckerUpgradeable} from "@openzeppelin/contracts-upgradeable/utils/introspection/ERC165CheckerUpgradeable.sol";

import {CurrencyHandler} from "../lib/CurrencyHandler.sol";

import {CommonConstant} from "../common/constants/CommonConstant.sol";

import {IAdmin} from "../common/interfaces/IAdmin.sol";

import {MortgageToken} from "./utilities/MortgageToken.sol";

import {ERC721MortgageTokenStorage} from "./storages/ERC721MortgageTokenStorage.sol";

contract ERC721MortgageToken is
ERC721MortgageTokenStorage,
MortgageToken {
    using ERC165CheckerUpgradeable for address;

    string constant private VERSION = "v1.2.1";

    function initialize(
        address _admin,
        address _feeReceiver,
        string calldata _name,
        string calldata _symbol,
        string calldata _uri,
        uint256 _feeRate
    ) external initializer {
        __MortgageToken_init(
            _admin,
            _feeReceiver,
            _name,
            _symbol,
            _uri,
            _feeRate
        );
    }

    function registerCollaterals(
        address[] calldata _tokens,
        bool _isCollaterals,
        bytes[] calldata _signatures
    ) external {
        IAdmin(admin).verifyAdminSignatures(
            abi.encode(
                address(this),
                "registerCollaterals",
                _tokens,
                _isCollaterals
            ),
            _signatures
        );

        if (_isCollaterals) {
            for (uint256 i; i < _tokens.length; ++i) {
                if (_tokens[i] == address(this) ||
                    !_tokens[i].supportsInterface(type(IERC721Upgradeable).interfaceId)) {
                    revert InvalidCollateral();
                }
                if (isCollateral[_tokens[i]]) {
                    revert RegisteredCollateral();
                }
                isCollateral[_tokens[i]] = true;
                emit CollateralRegistration(_tokens[i]);
            } 
        } else {
            for (uint256 i; i < _tokens.length; ++i) {
                if (!isCollateral[_tokens[i]]) {
                    revert NotRegisteredCollateral();
                }
                isCollateral[_tokens[i]] = true;
                emit CollateralDeregistration(_tokens[i]);
            } 
        }
    }

    function getCollateral(uint256 _mortgageId) external view validMortgage(_mortgageId) returns (ERC721Collateral memory) {
        return collaterals[_mortgageId];
    }

    function borrow(
        address _token,
        uint256 _tokenId,
        uint256 _principal,
        uint256 _repayment,
        address _currency,
        uint40 _duration
    ) external returns (uint256) {
        if (IERC721Upgradeable(_token).ownerOf(_tokenId) != msg.sender) {
            revert InvalidCollateral();
        }

        uint256 mortgageId = ++mortgageNumber;
        collaterals[mortgageId] = ERC721Collateral(
            _token,
            _tokenId
        );

        return _borrow(
            mortgageId,
            _principal,
            _repayment,
            _currency,
            _duration
        );
    }

    function royaltyInfo(uint256 _tokenId, uint256 _price) external view override returns (address, uint256) {
        _requireMinted(_tokenId);
        ERC721Collateral memory collateral = collaterals[_tokenId];
        if (collateral.token.supportsInterface(type(IERC2981Upgradeable).interfaceId)) {
            ( , uint256 royalty) = IERC2981Upgradeable(collateral.token).royaltyInfo(
                collateral.tokenId,
                _price
            );
            return (feeReceiver, royalty);
        }
        return (address(0), 0);
    }

    function _transferCollateral(
        uint256 _mortgageId,
        address _from,
        address _to
    ) internal override {
        IERC721Upgradeable(collaterals[_mortgageId].token).safeTransferFrom(
            _from,
            _to,
            collaterals[_mortgageId].tokenId,
            ""
        );
    }
}
