// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IERC165Upgradeable} from "@openzeppelin/contracts-upgradeable/interfaces/IERC165Upgradeable.sol";

import {CurrencyHandler} from "../lib/CurrencyHandler.sol";

import {CommonConstant} from "../common/constants/CommonConstant.sol";

import {ICommissionToken} from "../land/interfaces/ICommissionToken.sol";

import {IProjectToken} from "../launch/interfaces/IProjectToken.sol";

import {ProjectTokenReceiver} from "../launch/utilities/ProjectTokenReceiver.sol";

import {ProjectMortgageTokenStorage} from "./storages/ProjectMortgageTokenStorage.sol";

import {MortgageToken} from "./utilities/MortgageToken.sol";

contract ProjectMortgageToken is
ProjectMortgageTokenStorage,
MortgageToken,
ProjectTokenReceiver {
    string constant private VERSION = "v1.2.1";

    function initialize(
        address _admin,
        address _projectToken,
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

        projectToken = _projectToken;
    }

    function getCollateral(uint256 _mortgageId) external view validMortgage(_mortgageId) returns (ProjectCollateral memory) {
        return collaterals[_mortgageId];
    }

    function borrow(
        uint256 _projectId,
        uint256 _amount,
        uint256 _principal,
        uint256 _repayment,
        address _currency,
        uint40 _duration
    ) external onlyAvailableCurrency(_currency) whenNotPaused returns (uint256) {
        IProjectToken projectTokenContract = IProjectToken(projectToken);
        if (!projectTokenContract.isAvailable(_projectId)) {
            revert InvalidTokenId();
        }
        if (_amount > projectTokenContract.balanceOf(msg.sender, _projectId)) {
            revert InvalidCollateral();
        }
        return _borrow(
            _principal,
            _repayment,
            _currency,
            _duration
        );
    }

    function supportsInterface(bytes4 _interfaceId) public view override(
    IERC165Upgradeable,
    ProjectTokenReceiver,
    MortgageToken
    ) returns (bool) {
        return super.supportsInterface(_interfaceId);
    }

    function royaltyInfo(uint256 _tokenId, uint256 _price) external view override returns (address, uint256) {
        _requireMinted(_tokenId);
        ( , uint256 royalty) = IProjectToken(projectToken).royaltyInfo(collaterals[_tokenId].projectId, _price);
        return (feeReceiver, royalty);
    }

    function _transferCollateral(
        uint256 _mortgageId,
        address _from,
        address _to
    ) internal override {
        IProjectToken(projectToken).safeTransferFrom(
            _from,
            _to,
            collaterals[_mortgageId].projectId,
            collaterals[_mortgageId].amount,
            ""
        );
    }
}
