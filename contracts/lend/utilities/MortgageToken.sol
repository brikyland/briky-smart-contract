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

import {CommonConstant} from "../../common/constants/CommonConstant.sol";

import {IAdmin} from "../../common/interfaces/IAdmin.sol";
import {IRoyaltyRateProposer} from "../../common/interfaces/IRoyaltyRateProposer.sol";

import {Administrable} from "../../common/utilities/Administrable.sol";
import {Discountable} from "../../common/utilities/Discountable.sol";
import {Pausable} from "../../common/utilities/Pausable.sol";

import {IMortgageToken} from "../interfaces/IMortgageToken.sol";

import {MortgageTokenStorage} from "../storages/MortgageTokenStorage.sol";

abstract contract MortgageToken is
MortgageTokenStorage,
ERC721PausableUpgradeable,
Administrable,
Discountable,
Pausable,
ReentrancyGuardUpgradeable {
    using Formula for uint256;

    string constant private VERSION = "v1.2.1";

    modifier validMortgage(uint256 _mortgageId) {
        if (_mortgageId == 0 || _mortgageId > mortgageNumber) {
            revert InvalidMortgageId();
        }
        _;
    }

    receive() external payable {}

    function __MortgageToken_init(
        address _admin,
        address _feeReceiver,
        string calldata _name,
        string calldata _symbol,
        string calldata _uri,
        uint256 _feeRate
    ) internal onlyInitializing {
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
            revert InvalidRate();
        }
        feeRate = _feeRate;
        emit FeeRateUpdate(Rate(_feeRate, CommonConstant.RATE_DECIMALS));
    }

    function getFeeRate() external view returns (Rate memory) {
        return Rate(feeRate, CommonConstant.RATE_DECIMALS);
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

    function lend(uint256 _mortgageId) external payable validMortgage(_mortgageId) returns (uint256) {
        return _lend(_mortgageId);
    }

    function safeLend(uint256 _mortgageId, uint256 _anchor) external payable validMortgage(_mortgageId) returns (uint256) {
        if (_anchor != mortgages[_mortgageId].principal) {
            revert BadAnchor();
        }

        return _lend(_mortgageId);
    }

    function repay(uint256 _mortgageId) external payable validMortgage(_mortgageId) {
        _repay(_mortgageId);
    }

    function safeRepay(uint256 _mortgageId, uint256 _anchor) external payable validMortgage(_mortgageId) {
        if (_anchor != mortgages[_mortgageId].repayment) {
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

        mortgage.state = MortgageState.Foreclosed;

        _burn(_mortgageId);

        _transferCollateral(
            _mortgageId,
            address(this),
            receiver
        );

        emit MortgageForeclosure(_mortgageId, receiver);
    }

    function tokenURI(uint256 _tokenId) public view override(
        IERC721MetadataUpgradeable,
        ERC721Upgradeable
    ) returns (string memory) {
        return super.tokenURI(_tokenId);
    }

    function supportsInterface(bytes4 _interfaceId) public view virtual override(
        IERC165Upgradeable,
        ERC721Upgradeable
    ) returns (bool) {
        return _interfaceId == type(IMortgageToken).interfaceId || super.supportsInterface(_interfaceId);
    }

    function _baseURI() internal override view returns (string memory) {
        return baseURI;
    }

    function _mint(address _to, uint256 _tokenId) internal override {
        totalSupply++;
        super._mint(_to, _tokenId);
    }

    function _burn(uint256 _tokenId) internal override {
        totalSupply--;
        super._burn(_tokenId);
    }

    function _borrow(
        uint256 _principal,
        uint256 _repayment,
        address _currency,
        uint40 _duration
    ) internal onlyAvailableCurrency(_currency) whenNotPaused returns (uint256) {
        if (_principal == 0) {
            revert InvalidPrincipal();
        }
        if (_repayment < _principal) {
            revert InvalidRepayment();
        }

        uint256 fee = _applyDiscount(
            _principal.scale(feeRate, CommonConstant.RATE_MAX_FRACTION),
            _currency
        );

        uint256 mortgageId = ++mortgageNumber;
        mortgages[mortgageId] = Mortgage(
            _principal,
            _repayment,
            fee,
            _currency,
            _duration,
            MortgageState.Pending,
            msg.sender,
            address(0)
        );

        emit NewMortgage(
            mortgageId,
            msg.sender,
            _principal,
            _repayment,
            fee,
            _currency,
            _duration
        );

        return mortgageId;
    }

    function _lend(uint256 _mortgageId) internal nonReentrant whenNotPaused returns (uint40) {
        Mortgage storage mortgage = mortgages[_mortgageId];

        if (msg.sender == mortgage.borrower || mortgage.state != MortgageState.Pending) {
            revert InvalidLending();
        }

        address currency = mortgage.currency;
        uint256 principal = mortgage.principal;

        CurrencyHandler.receiveCurrency(currency, principal);
        CurrencyHandler.sendCurrency(
            currency,
            mortgage.borrower,
            principal - mortgage.fee
        );

        _chargeFee(_mortgageId);

        uint40 due = mortgage.due + uint40(block.timestamp);
        mortgage.due = due;
        mortgage.lender = msg.sender;
        mortgage.state = MortgageState.Supplied;

        _mint(msg.sender, _mortgageId);

        emit NewToken(
            _mortgageId,
            msg.sender,
            due
        );

        return due;
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

        mortgage.state = MortgageState.Repaid;

        _burn(_mortgageId);

        CurrencyHandler.forwardCurrency(
            mortgage.currency,
            ownerOf(_mortgageId),
            mortgage.repayment
        );

        _transferCollateral(
            _mortgageId,
            address(this),
            msg.sender
        );

        emit MortgageRepayment(_mortgageId);
    }

    function _chargeFee(uint256 _mortgageId) internal virtual {
        CurrencyHandler.sendCurrency(
            mortgages[_mortgageId].currency,
            feeReceiver,
            mortgages[_mortgageId].fee
        );
    }

    function _transferCollateral(
        uint256 _mortgageId,
        address _from,
        address _to
    ) internal virtual;
}
