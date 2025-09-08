// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IERC165Upgradeable} from "@openzeppelin/contracts-upgradeable/interfaces/IERC165Upgradeable.sol";

import {CurrencyHandler} from "../lib/CurrencyHandler.sol";
import {Formula} from "../lib/Formula.sol";

import {CommonConstant} from "../common/constants/CommonConstant.sol";

import {Discountable} from "../common/utilities/Discountable.sol";
import {RoyaltyRateProposer} from "../common/utilities/RoyaltyRateProposer.sol";

import {IProjectToken} from "../launch/interfaces/IProjectToken.sol";

import {ProjectTokenReceiver} from "../launch/utilities/ProjectTokenReceiver.sol";

import {MortgageToken} from "./utilities/MortgageToken.sol";

import {ProjectMortgageTokenStorage} from "./storages/ProjectMortgageTokenStorage.sol";

contract ProjectMortgageToken is
ProjectMortgageTokenStorage,
ProjectTokenReceiver,
MortgageToken,
RoyaltyRateProposer,
Discountable {
    using Formula for uint256;

    string constant private VERSION = "v1.1.1";

    function initialize(
        address _admin,
        address _projectToken,
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
        projectToken = _projectToken;
        feeReceiver = _feeReceiver;

        baseURI = _uri;
        emit BaseURIUpdate(_uri);

        feeRate = _feeRate;
        emit FeeRateUpdate(Rate(_feeRate, CommonConstant.RATE_DECIMALS));
    }

    function borrow(
        uint256 _tokenId,
        uint256 _amount,
        uint256 _principal,
        uint256 _repayment,
        address _currency,
        uint40 _duration
    ) external onlyAvailableCurrency(_currency) whenNotPaused returns (uint256) {
        IProjectToken projectTokenContract = IProjectToken(projectToken);
        if (!projectTokenContract.isAvailable(_tokenId)) {
            revert InvalidTokenId();
        }
        if (_amount > projectTokenContract.balanceOf(msg.sender, _tokenId)) {
            revert InvalidAmount();
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
            _amount,
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
            _amount,
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

    function getRoyaltyRate(uint256 _tokenId) external view returns (Rate memory) {
        _requireMinted(_tokenId);
        return IProjectToken(projectToken).getRoyaltyRate(mortgages[_tokenId].tokenId);
    }

    function supportsInterface(bytes4 _interfaceId) public view override(
        IERC165Upgradeable,
        RoyaltyRateProposer,
        ProjectTokenReceiver,
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
        uint256 _amount
    ) public override {
        IProjectToken(projectToken).safeTransferFrom(
            _from,
            _to,
            _tokenId,
            _amount,
            ""
        );
    }

    function _royaltyReceiver() internal view override returns (address) {
        return feeReceiver;
    }
}
