// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IERC165Upgradeable} from "@openzeppelin/contracts-upgradeable/interfaces/IERC165Upgradeable.sol";
import {IERC2981Upgradeable} from "@openzeppelin/contracts-upgradeable/interfaces/IERC2981Upgradeable.sol";
import {ERC165Upgradeable} from "@openzeppelin/contracts-upgradeable/utils/introspection/ERC165Upgradeable.sol";
import {ReentrancyGuardUpgradeable} from "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
import {ERC1155HolderUpgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC1155/utils/ERC1155HolderUpgradeable.sol";
import {ERC1155ReceiverUpgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC1155/utils/ERC1155ReceiverUpgradeable.sol";
import {IERC20Upgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";
import {SafeERC20Upgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC20/utils/SafeERC20Upgradeable.sol";
import {ERC721Upgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC721/ERC721Upgradeable.sol";
import {IERC721MetadataUpgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC721/extensions/IERC721MetadataUpgradeable.sol";
import {ERC721PausableUpgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC721/extensions/ERC721PausableUpgradeable.sol";
import {ERC721URIStorageUpgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC721/extensions/ERC721URIStorageUpgradeable.sol";

import {Constant} from "../lib/Constant.sol";
import {CurrencyHandler} from "../lib/CurrencyHandler.sol";
import {Formula} from "../lib/Formula.sol";

import {IAdmin} from "../common/interfaces/IAdmin.sol";
import {IRoyaltyRateToken} from "../common/interfaces/IRoyaltyRateToken.sol";

import {RoyaltyRateToken} from "../common/utilities/RoyaltyRateToken.sol";

import {ICommissionToken} from "../land/interfaces/ICommissionToken.sol";
import {IEstateToken} from "../land/interfaces/IEstateToken.sol";
import {IExclusiveToken} from "../land/interfaces/IExclusiveToken.sol";

import {MortgageTokenStorage} from "./storages/MortgageTokenStorage.sol";

contract MortgageToken is
MortgageTokenStorage,
ERC721PausableUpgradeable,
ERC721URIStorageUpgradeable,
ERC1155HolderUpgradeable,
RoyaltyRateToken,
ReentrancyGuardUpgradeable {
    using Formula for uint256;
    using SafeERC20Upgradeable for IERC20Upgradeable;

    string constant private VERSION = "v1.1.1";

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
        require(_feeRate <= Constant.COMMON_RATE_MAX_FRACTION);
        require(_royaltyRate <= Constant.COMMON_RATE_MAX_FRACTION);

        __ERC721_init(_name, _symbol);
        __ERC721Pausable_init();
        __ERC721URIStorage_init();
        __ERC1155Holder_init();

        __ReentrancyGuard_init();

        admin = _admin;
        estateToken = _estateToken;
        commissionToken = _commissionToken;
        feeReceiver = _feeReceiver;

        baseURI = _uri;

        feeRate = _feeRate;
        royaltyRate = _royaltyRate;

        emit RoyaltyRateUpdate(_royaltyRate);
        emit FeeRateUpdate(_feeRate);
    }

    function version() external pure returns (string memory) {
        return VERSION;
    }

    function pause(bytes[] calldata _signatures) external whenNotPaused {
        IAdmin(admin).verifyAdminSignatures(
            abi.encode(address(this), "pause"),
            _signatures
        );
        _pause();
    }

    function unpause(bytes[] calldata _signatures) external whenPaused {
        IAdmin(admin).verifyAdminSignatures(
            abi.encode(address(this), "unpause"),
            _signatures
        );
        _unpause();
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

    function updateRoyaltyRate(
        uint256 _royaltyRate,
        bytes[] calldata _signature
    ) external {
        IAdmin(admin).verifyAdminSignatures(
            abi.encode(
                address(this),
                "updateRoyaltyRate",
                _royaltyRate
            ),
            _signature
        );
        if (_royaltyRate > Constant.COMMON_RATE_MAX_FRACTION) {
            revert InvalidRate();
        }
        royaltyRate = _royaltyRate;
        emit RoyaltyRateUpdate(_royaltyRate);
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
        if (_feeRate > Constant.COMMON_RATE_MAX_FRACTION) {
            revert InvalidRate();
        }
        feeRate = _feeRate;
        emit FeeRateUpdate(_feeRate);
    }

    function getFeeRate() external view returns (Rate memory) {
        return Rate(feeRate, Constant.COMMON_RATE_DECIMALS);
    }

    function getRoyaltyRate() public view override(
        IRoyaltyRateToken,
        RoyaltyRateToken
    ) returns (Rate memory) {
        return Rate(royaltyRate, Constant.COMMON_RATE_DECIMALS);
    }

    function getLoan(uint256 _loanId) external view returns (Loan memory) {
        if (_loanId == 0 || _loanId > loanNumber) {
            revert InvalidLoanId();
        }
        return loans[_loanId];
    }

    function borrow(
        uint256 _estateId,
        uint256 _mortgageAmount,
        uint256 _principal,
        uint256 _repayment,
        address _currency,
        uint40 _duration
    ) external whenNotPaused returns (uint256) {
        IEstateToken estateTokenContract = IEstateToken(estateToken);
        if (!estateTokenContract.isAvailable(_estateId)) {
            revert InvalidEstateId();
        }
        if (!IAdmin(admin).isAvailableCurrency(_currency)) {
            revert InvalidCurrency();
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

    function cancel(uint256 _loanId) external {
        if (_loanId == 0 || _loanId > loanNumber) {
            revert InvalidLoanId();
        }
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

    function lend(uint256 _loanId, uint256 _estateId) external payable nonReentrant whenNotPaused {
        if (_loanId == 0 || _loanId > loanNumber) revert InvalidLoanId();
        Loan storage loan = loans[_loanId];
        address borrower = loan.borrower;

        if (msg.sender == loan.borrower
            || _estateId != loan.estateId
            || loan.state != LoanState.Pending) revert InvalidLending();

        address currency = loan.currency;
        uint256 principal = loan.principal;
        uint256 fee = principal.scale(feeRate, Constant.COMMON_RATE_MAX_FRACTION);

        if (IAdmin(admin).isExclusiveCurrency(currency)) {
            fee = fee.applyDiscount(IExclusiveToken(currency).exclusiveDiscount());
        }

        ICommissionToken commissionContract = ICommissionToken(commissionToken);
        address commissionReceiver;
        uint256 commissionAmount;
        if (commissionContract.exists(_estateId)) {
            commissionReceiver = commissionContract.ownerOf(_estateId);
            commissionAmount = fee.scale(commissionContract.getCommissionRate());
        }

        if (currency == address(0)) {
            CurrencyHandler.receiveNative(principal);
            CurrencyHandler.transferNative(borrower, principal - fee);
            CurrencyHandler.transferNative(feeReceiver, fee - commissionAmount);
            if (commissionAmount != 0) {
                CurrencyHandler.transferNative(commissionReceiver, commissionAmount);
            }
        } else {
            IERC20Upgradeable currencyContract = IERC20Upgradeable(currency);
            currencyContract.safeTransferFrom(msg.sender, borrower, principal - fee);
            currencyContract.safeTransferFrom(msg.sender, feeReceiver, fee - commissionAmount);
            if (commissionAmount != 0) {
                currencyContract.safeTransferFrom(msg.sender, commissionReceiver, commissionAmount);
            }
        }

        IEstateToken(estateToken).safeTransferFrom(
            borrower,
            address(this),
            _estateId,
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
            fee,
            commissionReceiver,
            commissionAmount
        );
    }

    function repay(uint256 _loanId) external payable nonReentrant whenNotPaused {
        if (_loanId == 0 || _loanId > loanNumber) revert InvalidLoanId();
        Loan storage loan = loans[_loanId];
        if (loan.state != LoanState.Supplied) revert InvalidRepaying();

        if (loan.due <= block.timestamp) revert Overdue();

        address borrower = loan.borrower;
        address currency = loan.currency;
        if (currency == address(0)) {
            uint256 repayment = loan.repayment;
            CurrencyHandler.receiveNative(repayment);
            CurrencyHandler.transferNative(ownerOf(_loanId), repayment);
        } else {
            IERC20Upgradeable(currency).safeTransferFrom(borrower, ownerOf(_loanId), loan.repayment);
        }

        IEstateToken(estateToken).safeTransferFrom(
            address(this),
            borrower,
            loan.estateId,
            loan.mortgageAmount,
            ""
        );

        loan.state = LoanState.Repaid;

        _burn(_loanId);

        emit LoanRepayment(_loanId);
    }

    function foreclose(uint256 _loanId) external nonReentrant whenNotPaused {
        if (_loanId == 0 || _loanId > loanNumber) revert InvalidLoanId();
        Loan storage loan = loans[_loanId];
        if (loan.due > block.timestamp
            || loan.state != LoanState.Supplied) revert InvalidForeclosing();

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

    function exists(uint256 _loanId) external view returns (bool) {
        return _exists(_loanId);
    }

    function tokenURI(uint256 _tokenId) public view override(
        IERC721MetadataUpgradeable,
        ERC721Upgradeable,
        ERC721URIStorageUpgradeable
    ) returns (string memory) {
        return super.tokenURI(_tokenId);
    }

    function supportsInterface(bytes4 _interfaceId) public view override(
        IERC165Upgradeable,
        ERC1155ReceiverUpgradeable,
        ERC721Upgradeable,
        ERC721URIStorageUpgradeable,
        RoyaltyRateToken
    ) returns (bool) {
        return super.supportsInterface(_interfaceId);
    }

    function _baseURI() internal view override returns (string memory) {
        return baseURI;
    }

    function _beforeTokenTransfer(
        address _from,
        address _to,
        uint256 _firstTokenId,
        uint256 _batchSize
    ) internal override(ERC721Upgradeable, ERC721PausableUpgradeable) {
        super._beforeTokenTransfer(_from, _to, _firstTokenId, _batchSize);
    }

    function _burn(uint256 _tokenId) internal
    override(ERC721Upgradeable, ERC721URIStorageUpgradeable) {
        super._burn(_tokenId);
    }
    function _royaltyReceiver() internal view override returns (address) {
        return feeReceiver;
    }
}
