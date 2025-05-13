// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {PausableUpgradeable} from "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";
import {ReentrancyGuardUpgradeable} from "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
import {IERC20Upgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";
import {SafeERC20Upgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC20/utils/SafeERC20Upgradeable.sol";

import {Constant} from "../lib/Constant.sol";
import {CurrencyHandler} from "../lib/CurrencyHandler.sol";
import {MulDiv} from "../lib/MulDiv.sol";

import {IAdmin} from "../common/interfaces/IAdmin.sol";

import {ICommissionToken} from "../land/interfaces/ICommissionToken.sol";

import {IMortgageToken} from "./interfaces/IMortgageToken.sol";

import {MortgageMarketplaceStorage} from "./storages/MortgageMarketplaceStorage.sol";

contract MortgageMarketplace is
MortgageMarketplaceStorage,
PausableUpgradeable,
ReentrancyGuardUpgradeable {
    using SafeERC20Upgradeable for IERC20Upgradeable;

    string constant private VERSION = "v1.1.1";

    receive() external payable {}

    function initialize(
        address _admin,
        address _mortgageToken,
        address _commissionToken,
        uint256 _exclusiveRate,
        uint256 _commissionRate
    ) external initializer {
        require(_exclusiveRate <= Constant.COMMON_PERCENTAGE_DENOMINATOR);
        require(_commissionRate <= Constant.COMMON_PERCENTAGE_DENOMINATOR);

        __Pausable_init();
        __ReentrancyGuard_init();

        admin = _admin;
        mortgageToken = _mortgageToken;
        commissionToken = _commissionToken;

        exclusiveRate = _exclusiveRate;
        commissionRate = _commissionRate;

        emit ExclusiveRateUpdate(_exclusiveRate);
        emit CommissionRateUpdate(_commissionRate);
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

    function updateExclusiveRate(
        uint256 _exclusiveRate,
        bytes[] calldata _signature
    ) external {
        IAdmin(admin).verifyAdminSignatures(
            abi.encode(
                address(this),
                "updateExclusiveRate",
                _exclusiveRate
            ),
            _signature
        );
        if (_exclusiveRate > Constant.COMMON_PERCENTAGE_DENOMINATOR) {
            revert InvalidPercentage();
        }
        exclusiveRate = _exclusiveRate;
        emit ExclusiveRateUpdate(_exclusiveRate);
    }

    function updateCommissionRate(
        uint256 _commissionRate,
        bytes[] calldata _signature
    ) external {
        IAdmin(admin).verifyAdminSignatures(
            abi.encode(
                address(this),
                "updateCommissionRate",
                _commissionRate
            ),
            _signature
        );
        if (_commissionRate > Constant.COMMON_PERCENTAGE_DENOMINATOR) {
            revert InvalidPercentage();
        }
        commissionRate = _commissionRate;
        emit CommissionRateUpdate(_commissionRate);
    }

    function getOffer(uint256 _offerId) external view returns (Offer memory) {
        if (_offerId == 0 || _offerId > offerNumber) {
            revert InvalidOfferId();
        }
        return offers[_offerId];
    }

    function list(
        uint256 _tokenId,
        uint256 _price,
        address _currency
    ) external whenNotPaused returns (uint256) {
        IMortgageToken mortgageTokenContract = IMortgageToken(mortgageToken);
        if (mortgageTokenContract.ownerOf(_tokenId) != msg.sender) {
            revert InvalidTokenId();
        }

        IMortgageToken.Loan memory loan = mortgageTokenContract.getLoan(_tokenId);
        if (loan.state != IMortgageToken.LoanState.Supplied
            || loan.due <= block.timestamp) {
            revert UnavailableLoan();
        }

        if (_price == 0) {
            revert InvalidPrice();
        }

        if (!IAdmin(admin).isAvailableCurrency(_currency)) {
            revert InvalidCurrency();
        }

        uint256 offerId = ++offerNumber;

        offers[offerId] = Offer(
            _tokenId,
            _price,
            _currency,
            OfferState.Selling,
            msg.sender
        );

        emit NewOffer(
            offerId,
            _tokenId,
            msg.sender,
            _price,
            _currency
        );

        return offerId;
    }

    function buy(uint256 _offerId, uint256 _tokenId) external payable nonReentrant whenNotPaused {
        if (_offerId == 0 || _offerId > offerNumber) {
            revert InvalidOfferId();
        }

        IMortgageToken mortgageTokenContract = IMortgageToken(mortgageToken);
        IMortgageToken.Loan memory loan = mortgageTokenContract.getLoan(_tokenId);
        if (loan.state != IMortgageToken.LoanState.Supplied
            || loan.due <= block.timestamp) {
            revert UnavailableLoan();
        }

        Offer storage offer = offers[_offerId];
        address seller = offer.seller;

        if (msg.sender == seller
            || _tokenId != offer.tokenId
            || offer.state != OfferState.Selling) {
            revert InvalidBuying();
        }

        uint256 price = offer.price;
        (address royaltyReceiver, uint256 royaltyAmount) = mortgageTokenContract.royaltyInfo(_tokenId, price);

        address currency = offer.currency;
        if (IAdmin(admin).isExclusiveCurrency(currency)) {
            royaltyAmount = MulDiv.mulDiv(
                royaltyAmount,
                exclusiveRate,
                Constant.COMMON_PERCENTAGE_DENOMINATOR
            );
        }

        ICommissionToken commissionContract = ICommissionToken(commissionToken);
        address commissionReceiver;
        uint256 commissionAmount;
        if (commissionContract.exists(_tokenId)) {
            commissionReceiver = commissionContract.ownerOf(loan.estateId);
            commissionAmount = MulDiv.mulDiv(
                royaltyAmount,
                commissionRate,
                Constant.COMMON_PERCENTAGE_DENOMINATOR
            );
        }

        if (currency == address(0)) {
            uint256 total = price + royaltyAmount;
            CurrencyHandler.receiveNative(total);
            CurrencyHandler.transferNative(seller, price);
            CurrencyHandler.transferNative(royaltyReceiver, royaltyAmount - commissionAmount);
            if (commissionReceiver != address(0)) {
                CurrencyHandler.transferNative(commissionReceiver, commissionAmount);
            }
        } else {
            IERC20Upgradeable currencyContract = IERC20Upgradeable(currency);
            currencyContract.safeTransferFrom(msg.sender, seller, price);
            currencyContract.safeTransferFrom(msg.sender, royaltyReceiver, royaltyAmount - commissionAmount);
            if (commissionReceiver != address(0)) {
                currencyContract.safeTransferFrom(msg.sender, commissionReceiver, commissionAmount);
            }
        }

        offer.state = OfferState.Sold;
        mortgageTokenContract.safeTransferFrom(
            seller,
            msg.sender,
            _tokenId,
            ""
        );

        emit OfferSale(
            _offerId,
            msg.sender,
            royaltyReceiver,
            royaltyAmount,
            commissionReceiver,
            commissionAmount
        );
    }

    function cancel(uint256 _offerId) external nonReentrant whenNotPaused {
        if (_offerId == 0 || _offerId > offerNumber) revert InvalidOfferId();
        Offer storage offer = offers[_offerId];
        if (msg.sender != offer.seller && !IAdmin(admin).isManager(msg.sender)) revert Unauthorized();
        if (offer.state != OfferState.Selling) revert InvalidCancelling();

        offer.state = OfferState.Cancelled;

        emit OfferCancellation(_offerId);
    }
}
