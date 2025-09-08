// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IERC165Upgradeable} from "@openzeppelin/contracts-upgradeable/interfaces/IERC165Upgradeable.sol";
import {IERC721Upgradeable} from "@openzeppelin/contracts-upgradeable/interfaces/IERC721Upgradeable.sol";
import {IERC2981Upgradeable} from "@openzeppelin/contracts-upgradeable/interfaces/IERC2981Upgradeable.sol";
import {ERC165CheckerUpgradeable} from "@openzeppelin/contracts-upgradeable/utils/introspection/ERC165CheckerUpgradeable.sol";

import {CurrencyHandler} from "../lib/CurrencyHandler.sol";
import {Formula} from "../lib/Formula.sol";

import {CommonConstant} from "../common/constants/CommonConstant.sol";

import {Discountable} from "../common/utilities/Discountable.sol";

import {IAdmin} from "../common/interfaces/IAdmin.sol";
import {IExclusiveToken} from "../common/interfaces/IExclusiveToken.sol";

import {IRate} from "../common/structs/IRate.sol";

import {MortgageToken} from "./utilities/MortgageToken.sol";

import {ERC721MortgageTokenStorage} from "./storages/ERC721MortgageTokenStorage.sol";

contract ERC721MortgageToken is
ERC721MortgageTokenStorage,
MortgageToken,
Discountable {
    using Formula for uint256;
    using Formula for IRate.Rate;
    using ERC165CheckerUpgradeable for address;

    string constant private VERSION = "v1.1.1";

    function initialize(
        address _admin,
        address _feeReceiver,
        string calldata _name,
        string calldata _symbol,
        string calldata _uri,
        uint256 _feeRate
    ) external initializer {
        require(_feeRate <= CommonConstant.RATE_MAX_FRACTION);

        __ERC721_init(_name, _symbol);
        __ERC721Pausable_init();

        __ReentrancyGuard_init();

        admin = _admin;
        feeReceiver = _feeReceiver;

        baseURI = _uri;
        emit BaseURIUpdate(_uri);

        feeRate = _feeRate;
        emit FeeRateUpdate(Rate(_feeRate, CommonConstant.RATE_DECIMALS));
    }

    function whitelistCollaterals(
        address[] calldata _collaterals,
        bool _isWhitelisted,
        bytes[] calldata _signatures
    ) external {
        IAdmin(admin).verifyAdminSignatures(
            abi.encode(
                address(this),
                "whitelistCollaterals",
                _collaterals,
                _isWhitelisted
            ),
            _signatures
        );

        if (_isWhitelisted) {
            for (uint256 i; i < _collaterals.length; ++i) {
                if (isCollateral[_collaterals[i]]) {
                    revert WhitelistedCollateral();
                }
                isCollateral[_collaterals[i]] = true;
                emit CollateralWhitelist(_collaterals[i]);
            } 
        } else {
            for (uint256 i; i < _collaterals.length; ++i) {
                if (!isCollateral[_collaterals[i]]) {
                    revert NotWhitelistedCollateral();
                }
                isCollateral[_collaterals[i]] = true;
                emit CollateralUnwhitelist(_collaterals[i]);
            } 
        }
    }

    function borrow(
        address _collateral,
        uint256 _tokenId,
        uint256 _principal,
        uint256 _repayment,
        address _currency,
        uint40 _duration
    ) external onlyAvailableCurrency(_currency) whenNotPaused returns (uint256) {
        if (!_collateral.supportsInterface(type(IERC721Upgradeable).interfaceId) 
            || _collateral == address(this)) {
            revert InvalidCollateral();
        }
        
        IERC721Upgradeable collateralContract = IERC721Upgradeable(_collateral);
        if (collateralContract.ownerOf(_tokenId) != msg.sender) {
            revert NotTokenOwner();
        }
        if (_principal == 0) {
            revert InvalidPrincipal();
        }
        if (_repayment < _principal) {
            revert InvalidRepayment();
        }

        uint256 mortgageId = ++mortgageNumber;

        mortgages[mortgageId] = Mortgage(
            _tokenId,
            1,
            _principal,
            _repayment,
            _currency,
            _duration,
            MortgageState.Pending,
            msg.sender,
            address(0)
        );

        emit NewMortgage(
            mortgageId,
            _tokenId,
            msg.sender,
            1,
            _principal,
            _repayment,
            _currency,
            _duration
        );

        return mortgageId;
    }

    function lend(uint256 _mortgageId) external payable validMortgage(_mortgageId) returns (uint256) {
        return _lend(_mortgageId);
    }

    function safeLend(uint256 _mortgageId, uint256 _anchor)
    external payable validMortgage(_mortgageId) returns (uint256) {
        if (_anchor != mortgages[_mortgageId].tokenId) {
            revert BadAnchor();
        }

        return _lend(_mortgageId);
    }

    function royaltyInfo(uint256 _tokenId, uint256 _price) external view override (
        IERC2981Upgradeable
    ) returns (address, uint256) {
        _requireMinted(_tokenId);
        address collateral = collaterals[_tokenId];
        if (collateral.supportsInterface(type(IERC2981Upgradeable).interfaceId)) {
            (address royaltyReceiver, uint256 royaltyAmount) = IERC2981Upgradeable(collateral).royaltyInfo(
                mortgages[_tokenId].tokenId,
                _price
            );
            if (royaltyReceiver == feeReceiver) {
                address currency = mortgages[_tokenId].currency;
                royaltyAmount = _applyDiscount(royaltyAmount, currency);
            }
            return (royaltyReceiver, royaltyAmount);
        }
        return (address(0), 0);
    }

    function supportsInterface(bytes4 _interfaceId) public view override(
        MortgageToken
    ) returns (bool) {
        return super.supportsInterface(_interfaceId);
    }

    function _lend(uint256 _mortgageId) internal nonReentrant whenNotPaused returns (uint256) {
        Mortgage storage mortgage = mortgages[_mortgageId];
        address borrower = mortgage.borrower;

        if (msg.sender == mortgage.borrower || mortgage.state != MortgageState.Pending) {
            revert InvalidLending();
        }

        uint256 principal = mortgage.principal;
        uint256 feeAmount = principal.scale(feeRate, CommonConstant.RATE_MAX_FRACTION);

        address currency = mortgage.currency;
        feeAmount = _applyDiscount(feeAmount, currency);

        if (currency == address(0)) {
            CurrencyHandler.receiveNative(principal);
            CurrencyHandler.sendNative(borrower, principal - feeAmount);
            CurrencyHandler.sendNative(feeReceiver, feeAmount);
        } else {
            CurrencyHandler.forwardERC20(currency, borrower, principal - feeAmount);
            CurrencyHandler.forwardERC20(currency, feeReceiver, feeAmount);
        }

        uint40 due = mortgage.due + uint40(block.timestamp);
        mortgage.due = due;
        mortgage.lender = msg.sender;
        mortgage.state = MortgageState.Supplied;

        _mint(msg.sender, _mortgageId);

        emit NewToken(
            _mortgageId,
            msg.sender,
            due,
            feeAmount
        );

        return principal - feeAmount;
    }

    function transferCollateral(
        uint256 _tokenId,
        address _from,
        address _to,
        uint256
    ) public override {
        address collateral = collaterals[_tokenId];
        IERC721Upgradeable(collateral).safeTransferFrom(
            _from,
            _to,
            _tokenId,
            ""
        );
    }
}
