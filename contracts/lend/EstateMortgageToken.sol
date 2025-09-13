// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IERC165Upgradeable} from "@openzeppelin/contracts-upgradeable/interfaces/IERC165Upgradeable.sol";
import {IERC2981Upgradeable} from "@openzeppelin/contracts-upgradeable/interfaces/IERC2981Upgradeable.sol";

import {CurrencyHandler} from "../common/utilities/CurrencyHandler.sol";

import {CommonConstant} from "../common/constants/CommonConstant.sol";

import {ICommissionToken} from "../land/interfaces/ICommissionToken.sol";
import {IEstateToken} from "../land/interfaces/IEstateToken.sol";
import {IEstateTokenReceiver} from "../land/interfaces/IEstateTokenReceiver.sol";

import {CommissionDispatchable} from "../land/utilities/CommissionDispatchable.sol";

import {IEstateMortgageToken} from "./interfaces/IEstateMortgageToken.sol";
import {IMortgageToken} from "./interfaces/IMortgageToken.sol";

import {MortgageToken} from "./utilities/MortgageToken.sol";

import {EstateMortgageTokenStorage} from "./storages/EstateMortgageTokenStorage.sol";
import {EstateTokenReceiver} from "../land/utilities/EstateTokenReceiver.sol";

contract EstateMortgageToken is
EstateMortgageTokenStorage,
MortgageToken,
EstateTokenReceiver,
CommissionDispatchable {
    string constant private VERSION = "v1.2.1";

    function initialize(
        address _admin,
        address _estateToken,
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

        __CommissionDispatchable_init(IEstateToken(_estateToken).commissionToken());

        estateToken = _estateToken;
    }

    function getCollateral(uint256 _mortgageId) external view validMortgage(_mortgageId) returns (EstateCollateral memory) {
        return collaterals[_mortgageId];
    }

    function borrow(
        uint256 _estateId,
        uint256 _amount,
        uint256 _principal,
        uint256 _repayment,
        address _currency,
        uint40 _duration
    ) external onlyAvailableCurrency(_currency) whenNotPaused returns (uint256) {
        IEstateToken estateTokenContract = IEstateToken(estateToken);
        if (!estateTokenContract.isAvailable(_estateId)) {
            revert InvalidTokenId();
        }
        if (_amount == 0) {
            revert InvalidInput();
        }
        if (_amount > estateTokenContract.balanceOf(msg.sender, _estateId)) {
            revert InvalidCollateral();
        }

        uint256 mortgageId = _borrow(
            _principal,
            _repayment,
            _currency,
            _duration
        );
        
        collaterals[mortgageId] = EstateCollateral(
            _estateId,
            _amount
        );

        _transferCollateral(
            mortgageId,
            msg.sender,
            address(this)
        );

        return mortgageId;
    }

    function supportsInterface(bytes4 _interfaceId) public view override(
        IERC165Upgradeable,
        MortgageToken
    ) returns (bool) {
        return _interfaceId == type(IEstateMortgageToken).interfaceId
            || _interfaceId == type(IMortgageToken).interfaceId
            || _interfaceId == type(IEstateTokenReceiver).interfaceId
            || _interfaceId == type(IERC2981Upgradeable).interfaceId
            || super.supportsInterface(_interfaceId);
    }

    function royaltyInfo(uint256 _tokenId, uint256 _price) external view override returns (address, uint256) {
        _requireMinted(_tokenId);
        ( , uint256 royalty) = IEstateToken(estateToken).royaltyInfo(collaterals[_tokenId].estateId, _price);
        return (feeReceiver, royalty);
    }

    function _transferCollateral(
        uint256 _mortgageId,
        address _from,
        address _to
    ) internal override {
        IEstateToken(estateToken).safeTransferFrom(
            _from,
            _to,
            collaterals[_mortgageId].estateId,
            collaterals[_mortgageId].amount,
            ""
        );
    }

    function _chargeFee(uint256 _mortgageId) internal override {
        address currency = mortgages[_mortgageId].currency;
        uint256 fee = mortgages[_mortgageId].fee;
        uint256 commission = _dispatchCommission(
            collaterals[_mortgageId].estateId,
            fee,
            currency
        );
        CurrencyHandler.sendCurrency(
            currency,
            feeReceiver,
            fee - commission
        );
    }
}
