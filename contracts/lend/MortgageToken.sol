// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IERC165Upgradeable} from "@openzeppelin/contracts-upgradeable/interfaces/IERC165Upgradeable.sol";
import {IERC721MetadataUpgradeable} from "@openzeppelin/contracts-upgradeable/interfaces/IERC721MetadataUpgradeable.sol";
import {ReentrancyGuardUpgradeable} from "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
import {ERC721Upgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC721/ERC721Upgradeable.sol";
import {ERC721PausableUpgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC721/extensions/ERC721PausableUpgradeable.sol";
import {ERC165Upgradeable} from "@openzeppelin/contracts-upgradeable/utils/introspection/ERC165Upgradeable.sol";

import {CurrencyHandler} from "../lib/CurrencyHandler.sol";
import {Formula} from "../lib/Formula.sol";

import {IAdmin} from "../common/interfaces/IAdmin.sol";
import {IRoyaltyRateProposer} from "../common/interfaces/IRoyaltyRateProposer.sol";

import {CommonConstant} from "../common/constants/CommonConstant.sol";

import {Administrable} from "../common/utilities/Administrable.sol";
import {Discountable} from "../common/utilities/Discountable.sol";
import {Pausable} from "../common/utilities/Pausable.sol";
import {RoyaltyRateProposer} from "../common/utilities/RoyaltyRateProposer.sol";

import {ICommissionToken} from "../land/interfaces/ICommissionToken.sol";
import {IEstateToken} from "../land/interfaces/IEstateToken.sol";

import {CommissionDispatchable} from "../land/utilities/CommissionDispatchable.sol";
import {EstateTokenReceiver} from "../land/utilities/EstateTokenReceiver.sol";

import {MortgageTokenStorage} from "./storages/MortgageTokenStorage.sol";

contract MortgageToken is
MortgageTokenStorage,
ERC721PausableUpgradeable,
Administrable,
CommissionDispatchable,
EstateTokenReceiver,
Discountable,
Pausable,
RoyaltyRateProposer,
ReentrancyGuardUpgradeable {
    using Formula for uint256;

    string constant private VERSION = "v1.1.1";

    modifier validLoan(uint256 _loanId) {
        if (_loanId == 0 || _loanId > loanNumber) {
            revert InvalidLoanId();
        }
        _;
    }

    receive() external payable {}

    function initialize(
        address _admin,
        address _estateToken,
        address _commissionToken,
        address _feeReceiver,
        string calldata _name,
        string calldata _symbol,
        string calldata _uri,
        uint256 _feeRate,
        uint256 _royaltyRate
    ) external initializer {
        require(_feeRate <= CommonConstant.RATE_MAX_FRACTION);
        require(_royaltyRate <= CommonConstant.RATE_MAX_FRACTION);

        __ERC721_init(_name, _symbol);
        __ERC721Pausable_init();

        __ReentrancyGuard_init();

        __CommissionDispatchable_init(_commissionToken);
        __RoyaltyRateProposer_init(_royaltyRate);

        admin = _admin;
        estateToken = _estateToken;
        feeReceiver = _feeReceiver;

        baseURI = _uri;
        emit BaseURIUpdate(_uri);

        feeRate = _feeRate;
        emit FeeRateUpdate(_feeRate);
    }

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
        emit BatchMetadataUpdate(1, loanNumber);
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
            revert InvalidRate();
        }
        feeRate = _feeRate;
        emit FeeRateUpdate(_feeRate);
    }

    function getFeeRate() external view returns (Rate memory) {
        return Rate(feeRate, CommonConstant.RATE_DECIMALS);
    }

    function getLoan(uint256 _loanId)
    external view validLoan(_loanId) returns (Loan memory) {
        return loans[_loanId];
    }

    function borrow(
        uint256 _estateId,
        uint256 _mortgageAmount,
        uint256 _principal,
        uint256 _repayment,
        address _currency,
        uint40 _duration
    ) external onlyAvailableCurrency(_currency) whenNotPaused returns (uint256) {
        IEstateToken estateTokenContract = IEstateToken(estateToken);
        if (!estateTokenContract.isAvailable(_estateId)) {
            revert InvalidEstateId();
        }
        if (_mortgageAmount > estateTokenContract.balanceOf(msg.sender, _estateId)) {
            revert InvalidMortgageAmount();
        }
        if (_principal == 0) {
            revert InvalidPrincipal();
        }
        if (_repayment < _principal) {
            revert InvalidRepayment();
        }

        uint256 loanId = ++loanNumber;

        loans[loanId] = Loan(
            _estateId,
            _mortgageAmount,
            _principal,
            _repayment,
            _currency,
            _duration,
            LoanState.Pending,
            msg.sender,
            address(0)
        );

        emit NewLoan(
            loanId,
            _estateId,
            msg.sender,
            _mortgageAmount,
            _principal,
            _repayment,
            _currency,
            _duration
        );

        return loanId;
    }

    function cancel(uint256 _loanId) external validLoan(_loanId) {
        Loan storage loan = loans[_loanId];
        if (msg.sender != loan.borrower && !IAdmin(admin).isManager(msg.sender)) {
            revert Unauthorized();
        }
        if (loan.state != LoanState.Pending) {
            revert InvalidCancelling();
        }

        loan.state = LoanState.Cancelled;

        emit LoanCancellation(_loanId);
    }

    function lend(uint256 _loanId) external payable validLoan(_loanId) returns (uint256) {
        return _lend(_loanId);
    }

    function safeLend(uint256 _loanId, uint256 _anchor)
    external payable validLoan(_loanId) returns (uint256) {
        if (_anchor != loans[_loanId].estateId) {
            revert BadAnchor();
        }

        return _lend(_loanId);
    }

    function repay(uint256 _loanId) external payable validLoan(_loanId) {
        _repay(_loanId);
    }

    function safeRepay(uint256 _loanId, uint256 _anchor) external payable validLoan(_loanId) {
        if (_anchor != loans[_loanId].estateId) {
            revert BadAnchor();
        }

        _repay(_loanId);
    }

    function foreclose(uint256 _loanId) external nonReentrant validLoan(_loanId) whenNotPaused {
        Loan storage loan = loans[_loanId];
        if (loan.due > block.timestamp
            || loan.state != LoanState.Supplied) {
            revert InvalidForeclosing();
        }

        address receiver = _ownerOf(_loanId);
        IEstateToken(estateToken).safeTransferFrom(
            address(this),
            receiver,
            loan.estateId,
            loan.mortgageAmount,
            ""
        );

        loan.state = LoanState.Foreclosed;

        _burn(_loanId);

        emit LoanForeclosure(_loanId, receiver);
    }

    function tokenURI(uint256) public view override(
        IERC721MetadataUpgradeable,
        ERC721Upgradeable
    ) returns (string memory) {
        return baseURI;
    }

    function supportsInterface(bytes4 _interfaceId) public view override(
        IERC165Upgradeable,
        EstateTokenReceiver,
        RoyaltyRateProposer,
        ERC721Upgradeable
    ) returns (bool) {
        return super.supportsInterface(_interfaceId);
    }

    function _mint(address _to, uint256 _tokenId) internal override {
        totalSupply++;
        super._mint(_to, _tokenId);
    }

    function _burn(uint256 _tokenId) internal override {
        totalSupply--;
        super._burn(_tokenId);
    }

    function _lend(uint256 _loanId) internal nonReentrant whenNotPaused returns (uint256) {
        Loan storage loan = loans[_loanId];
        address borrower = loan.borrower;

        if (msg.sender == loan.borrower || loan.state != LoanState.Pending) {
            revert InvalidLending();
        }

        uint256 principal = loan.principal;
        uint256 feeAmount = principal.scale(feeRate, CommonConstant.RATE_MAX_FRACTION);

        address currency = loan.currency;
        feeAmount = _applyDiscount(feeAmount, currency);

        uint256 estateId = loan.estateId;
        uint256 commissionAmount = _forwardCommission(
            estateId,
            feeAmount,
            currency
        );

        if (currency == address(0)) {
            CurrencyHandler.receiveNative(principal);
            CurrencyHandler.sendNative(borrower, principal - feeAmount);
            CurrencyHandler.sendNative(feeReceiver, feeAmount - commissionAmount);
        } else {
            CurrencyHandler.forwardERC20(currency, borrower, principal - feeAmount);
            CurrencyHandler.forwardERC20(currency, feeReceiver, feeAmount - commissionAmount);
        }

        IEstateToken(estateToken).safeTransferFrom(
            borrower,
            address(this),
            estateId,
            loan.mortgageAmount,
            ""
        );

        uint40 due = loan.due + uint40(block.timestamp);
        loan.due = due;
        loan.lender = msg.sender;
        loan.state = LoanState.Supplied;

        _mint(msg.sender, _loanId);

        emit NewToken(
            _loanId,
            msg.sender,
            due,
            feeAmount
        );

        return  principal - feeAmount;
    }

    function _repay(uint256 _loanId) internal nonReentrant whenNotPaused {
        Loan storage loan = loans[_loanId];
        if (msg.sender != loan.borrower) {
            revert Unauthorized();
        }

        if (loan.state != LoanState.Supplied) {
            revert InvalidRepaying();
        }

        if (loan.due <= block.timestamp) {
            revert Overdue();
        }

        CurrencyHandler.forwardCurrency(loan.currency, ownerOf(_loanId), loan.repayment);

        IEstateToken(estateToken).safeTransferFrom(
            address(this),
            msg.sender,
            loan.estateId,
            loan.mortgageAmount,
            ""
        );

        loan.state = LoanState.Repaid;

        _burn(_loanId);

        emit LoanRepayment(_loanId);
    }

    function _royaltyReceiver() internal view override returns (address) {
        return feeReceiver;
    }
}
