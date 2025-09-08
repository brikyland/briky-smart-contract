// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IERC165Upgradeable} from "@openzeppelin/contracts-upgradeable/interfaces/IERC165Upgradeable.sol";
import {IERC721MetadataUpgradeable} from "@openzeppelin/contracts-upgradeable/interfaces/IERC721MetadataUpgradeable.sol";
import {ReentrancyGuardUpgradeable} from "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
import {ERC721Upgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC721/ERC721Upgradeable.sol";
import {ERC721PausableUpgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC721/extensions/ERC721PausableUpgradeable.sol";
import {ERC165Upgradeable} from "@openzeppelin/contracts-upgradeable/utils/introspection/ERC165Upgradeable.sol";

import {CurrencyHandler} from "../../lib/CurrencyHandler.sol";
import {Formula} from "../../lib/Formula.sol";

import {IAdmin} from "../../common/interfaces/IAdmin.sol";
import {IRoyaltyRateProposer} from "../../common/interfaces/IRoyaltyRateProposer.sol";

import {CommonConstant} from "../../common/constants/CommonConstant.sol";

import {Administrable} from "../../common/utilities/Administrable.sol";
import {Pausable} from "../../common/utilities/Pausable.sol";
import {RoyaltyRateProposer} from "../../common/utilities/RoyaltyRateProposer.sol";

import {IRate} from "../../common/structs/IRate.sol";

import {IMortgageToken} from "../interfaces/IMortgageToken.sol";
import {MortgageTokenStorage} from "../storages/MortgageTokenStorage.sol";

abstract contract MortgageToken is
MortgageTokenStorage,
ERC721PausableUpgradeable,
Administrable,
Pausable,
ReentrancyGuardUpgradeable {
    using Formula for uint256;

    string constant private VERSION = "v1.1.1";

    modifier validMortgage(uint256 _mortgageId) {
        if (_mortgageId == 0 || _mortgageId > mortgageNumber) {
            revert InvalidMortgageId();
        }
        _;
    }

    receive() external payable {}

    function version() external pure returns (string memory) {
        return VERSION;
    }

    function updateBaseURI(
        string calldata _uri,
        bytes[] calldata _signatures
    ) external {
        IAdmin(admin).verifyAdminSignatures(
            abi.encode(
                address(this),
                "updateBaseURI",
                _uri
            ),
            _signatures
        );
        baseURI = _uri;

        emit BaseURIUpdate(_uri);
        emit BatchMetadataUpdate(1, mortgageNumber);
    }

    function updateFeeRate(
        uint256 _feeRate,
        bytes[] calldata _signature
    ) external {
        IAdmin(admin).verifyAdminSignatures(
            abi.encode(
                address(this),
                "updateFeeRate",
                _feeRate
            ),
            _signature
        );
        if (_feeRate > CommonConstant.RATE_MAX_FRACTION) {
            revert IRate.InvalidRate();
        }
        feeRate = _feeRate;
        emit FeeRateUpdate(IRate.Rate(_feeRate, CommonConstant.RATE_DECIMALS));
    }

    function getFeeRate() external view returns (IRate.Rate memory) {
        return IRate.Rate(feeRate, CommonConstant.RATE_DECIMALS);
    }

    function getMortgage(uint256 _mortgageId)
    external view validMortgage(_mortgageId) returns (Mortgage memory) {
        return mortgages[_mortgageId];
    }

    function cancel(uint256 _mortgageId) external validMortgage(_mortgageId) {
        Mortgage storage mortgage = mortgages[_mortgageId];
        if (msg.sender != mortgage.borrower && !IAdmin(admin).isManager(msg.sender)) {
            revert Unauthorized();
        }
        if (mortgage.state != MortgageState.Pending) {
            revert InvalidCancelling();
        }

        mortgage.state = MortgageState.Cancelled;

        emit MortgageCancellation(_mortgageId);
    }

    function repay(uint256 _mortgageId) external payable validMortgage(_mortgageId) {
        _repay(_mortgageId);
    }

    function safeRepay(uint256 _mortgageId, uint256 _anchor) external payable validMortgage(_mortgageId) {
        if (_anchor != mortgages[_mortgageId].tokenId) {
            revert BadAnchor();
        }

        _repay(_mortgageId);
    }

    function foreclose(uint256 _mortgageId) external nonReentrant validMortgage(_mortgageId) whenNotPaused {
        Mortgage storage mortgage = mortgages[_mortgageId];
        if (mortgage.due > block.timestamp
            || mortgage.state != MortgageState.Supplied) {
            revert InvalidForeclosing();
        }

        address receiver = _ownerOf(_mortgageId);
        transferCollateral(
            mortgage.tokenId,
            address(this),
            receiver,
            mortgage.amount
        );

        mortgage.state = MortgageState.Foreclosed;

        _burn(_mortgageId);

        emit MortgageForeclosure(_mortgageId, receiver);
    }

    function tokenURI(uint256) public view override(
        IERC721MetadataUpgradeable,
        ERC721Upgradeable
    ) returns (string memory) {
        return baseURI;
    }

    function supportsInterface(bytes4 _interfaceId) public view virtual override(
        IERC165Upgradeable,
        ERC721Upgradeable
    ) returns (bool) {
        return _interfaceId == type(IMortgageToken).interfaceId || super.supportsInterface(_interfaceId);
    }

    function _mint(address _to, uint256 _tokenId) internal override {
        totalSupply++;
        super._mint(_to, _tokenId);
    }

    function _burn(uint256 _tokenId) internal override {
        totalSupply--;
        super._burn(_tokenId);
    }

    function _repay(uint256 _mortgageId) internal nonReentrant whenNotPaused {
        Mortgage storage mortgage = mortgages[_mortgageId];
        if (msg.sender != mortgage.borrower) {
            revert Unauthorized();
        }

        if (mortgage.state != MortgageState.Supplied) {
            revert InvalidRepaying();
        }

        if (mortgage.due <= block.timestamp) {
            revert Overdue();
        }

        CurrencyHandler.forwardCurrency(mortgage.currency, ownerOf(_mortgageId), mortgage.repayment);

        transferCollateral(
            mortgage.tokenId,
            address(this),
            msg.sender,
            mortgage.amount
        );

        mortgage.state = MortgageState.Repaid;

        _burn(_mortgageId);

        emit MortgageRepayment(_mortgageId);
    }

    function transferCollateral(
        uint256 _tokenId,
        address _from,
        address _to,
        uint256 _amount
    ) public virtual;
}
