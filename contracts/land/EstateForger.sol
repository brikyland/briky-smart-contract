// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {PausableUpgradeable} from "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";
import {ReentrancyGuardUpgradeable} from "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
import {IERC20Upgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";
import {SafeERC20Upgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC20/utils/SafeERC20Upgradeable.sol";
import {ERC1155HolderUpgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC1155/utils/ERC1155HolderUpgradeable.sol";
import {ERC1155ReceiverUpgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC1155/utils/ERC1155ReceiverUpgradeable.sol";
import {IERC165Upgradeable} from "@openzeppelin/contracts-upgradeable/utils/introspection/IERC165Upgradeable.sol";

import {Constant} from "../lib/Constant.sol";
import {CurrencyHandler} from "../lib/CurrencyHandler.sol";
import {MulDiv} from "../lib/MulDiv.sol";

import {IAdmin} from "../common/interfaces/IAdmin.sol";

import {ICommissionToken} from "./interfaces/ICommissionToken.sol";
import {IEstateToken} from "./interfaces/IEstateToken.sol";

import {EstateForgerStorage} from "./storages/EstateForgerStorage.sol";
import {EstateTokenizer} from "./EstateTokenizer.sol";

contract EstateForger is
EstateForgerStorage,
EstateTokenizer,
PausableUpgradeable,
ReentrancyGuardUpgradeable,
ERC1155HolderUpgradeable {
    using SafeERC20Upgradeable for IERC20Upgradeable;

    string constant private VERSION = "v1.1.1";

    receive() external payable {}

    modifier onlyManager() {
        if (!IAdmin(admin).isManager(msg.sender)) {
            revert Unauthorized();
        }
        _;
    }

    modifier onlyExecutive() {
        if (!IAdmin(admin).isManager(msg.sender)
            && !IAdmin(admin).isModerator(msg.sender)) {
            revert Unauthorized();
        }
        _;
    }

    function initialize(
        address _admin,
        address _estateToken,
        address _commissionToken,
        address _feeReceiver,
        uint256 _feeRate,
        uint256 _exclusiveRate,
        uint256 _commissionRate
    ) external initializer {
        require(_feeRate <= Constant.COMMON_PERCENTAGE_DENOMINATOR);
        require(_exclusiveRate <= Constant.COMMON_PERCENTAGE_DENOMINATOR);
        require(_commissionRate <= Constant.COMMON_PERCENTAGE_DENOMINATOR);

        __Pausable_init();
        __ReentrancyGuard_init();

        admin = _admin;
        estateToken = _estateToken;
        commissionToken = _commissionToken;
        feeReceiver = _feeReceiver;

        feeRate = _feeRate;
        exclusiveRate = _exclusiveRate;
        commissionRate = _commissionRate;

        emit FeeRateUpdate(_feeRate);
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

    function updateFeeRate(
        uint256 _feeRate,
        bytes[] calldata _signatures
    ) external {
        IAdmin(admin).verifyAdminSignatures(
            abi.encode(
                address(this),
                "updateFeeRate",
                _feeRate
            ),
            _signatures
        );
        if (_feeRate > Constant.COMMON_PERCENTAGE_DENOMINATOR) {
            revert InvalidPercentage();
        }
        feeRate = _feeRate;
        emit FeeRateUpdate(_feeRate);
    }

    function updateExclusiveRate(
        uint256 _exclusiveRate,
        bytes[] calldata _signatures
    ) external {
        IAdmin(admin).verifyAdminSignatures(
            abi.encode(
                address(this),
                "updateExclusiveRate",
                _exclusiveRate
            ),
            _signatures
        );
        if (_exclusiveRate > Constant.COMMON_PERCENTAGE_DENOMINATOR) {
            revert InvalidPercentage();
        }
        exclusiveRate = _exclusiveRate;
        emit ExclusiveRateUpdate(_exclusiveRate);
    }

    function updateCommissionRate(
        uint256 _commissionRate,
        bytes[] calldata _signatures
    ) external {
        IAdmin(admin).verifyAdminSignatures(
            abi.encode(
                address(this),
                "updateCommissionRate",
                _commissionRate
            ),
            _signatures
        );
        if (_commissionRate > Constant.COMMON_PERCENTAGE_DENOMINATOR) {
            revert InvalidPercentage();
        }
        commissionRate = _commissionRate;
        emit CommissionRateUpdate(_commissionRate);
    }

    function updateCurrencyUnitPrices(
        address[] calldata _currencies,
        uint256[] calldata _minUnitPrices,
        uint256[] calldata _maxUnitPrices,
        bytes[] calldata _signatures
    ) external {
        IAdmin(admin).verifyAdminSignatures(
            abi.encode(
                address(this),
                "updateCurrencyUnitPrices",
                _currencies,
                _minUnitPrices,
                _maxUnitPrices
            ),
            _signatures
        );

        if (_currencies.length != _minUnitPrices.length
            || _currencies.length != _maxUnitPrices.length) {
            revert InvalidInput();
        }

        for (uint256 i = 0; i < _currencies.length; ++i) {
            if (_minUnitPrices[i] > _maxUnitPrices[i]) {
                revert InvalidInput();
            }
            minUnitPrices[_currencies[i]] = _minUnitPrices[i];
            maxUnitPrices[_currencies[i]] = _maxUnitPrices[i];
            emit CurrencyUnitPriceUpdate(
                _currencies[i],
                _minUnitPrices[i],
                _maxUnitPrices[i]
            );
        }
    }

    function getRequest(uint256 _requestId) external view returns (Request memory) {
        if (_requestId == 0 || _requestId > requestNumber) {
            revert InvalidRequestId();
        }
        return requests[_requestId];
    }

    function requestTokenization(
        address _requester,
        bytes32 _zone,
        string calldata _uri,
        uint256 _totalSupply,
        uint256 _minSellingAmount,
        uint256 _maxSellingAmount,
        uint256 _unitPrice,
        address _currency,
        uint8 _decimals,
        uint40 _expireAt,
        uint40 _duration
    ) external onlyExecutive returns (uint256) {
        if (!IAdmin(admin).getZoneEligibility(_zone, msg.sender)) {
            revert Unauthorized();
        }

        CurrencyRegistry memory currencyRegistry = IAdmin(admin).getCurrencyRegistry(_currency);

        if (_requester == address(0)
            || _minSellingAmount > _maxSellingAmount
            || _maxSellingAmount > _totalSupply
            || _totalSupply > type(uint256).max / 10 ** _decimals
            || !currencyRegistry.isAvailable
            || _unitPrice < minUnitPrices[_currency]
            || _unitPrice > maxUnitPrices[_currency]
            || _decimals > Constant.ESTATE_TOKEN_DECIMALS_LIMIT
            || _expireAt <= block.timestamp) {
            revert InvalidInput();
        }

        uint256 requestId = ++requestNumber;
        requests[requestId] = Request(
            0,
            _zone,
            _uri,
            _totalSupply,
            _minSellingAmount,
            _maxSellingAmount,
            0,
            _unitPrice,
            _currency,
            _decimals,
            _expireAt,
            uint40(block.timestamp) + _duration,
            _requester
        );

        emit NewRequest(
            requestId,
            _requester,
            _zone,
            _uri,
            _totalSupply,
            _minSellingAmount,
            _maxSellingAmount,
            _unitPrice,
            _currency,
            _decimals,
            _expireAt,
            uint40(block.timestamp) + _duration
        );

        return requestId;
    }

    function updateRequest(
        uint256 _requestId,
        address _requester,
        bytes32 _zone,
        string calldata _uri,
        uint256 _totalSupply,
        uint256 _minSellingAmount,
        uint256 _maxSellingAmount,
        uint256 _unitPrice,
        address _currency,
        uint8 _decimals,
        uint40 _expireAt,
        uint40 _closeAt
    ) external onlyExecutive {
        if (_requestId == 0 || _requestId > requestNumber) {
            revert InvalidRequestId();
        }
        Request storage request = requests[_requestId];
        bytes32 zone = request.zone;
        if ((zone != _zone && !IAdmin(admin).getZoneEligibility(_zone, msg.sender))
            || !IAdmin(admin).isActiveIn(zone, msg.sender)) {
            revert Unauthorized();
        }

        if (request.totalSupply == 0) {
            revert Cancelled();
        }
        if (request.estateId != 0) {
            revert Tokenized();
        }
        if (request.soldAmount > 0) {
            revert AlreadyHadDepositor();
        }

        CurrencyRegistry memory currency = IAdmin(admin).getCurrencyRegistry(_currency);

        if (_requester == address(0)
            || _minSellingAmount > _maxSellingAmount
            || _maxSellingAmount > _totalSupply
            || _totalSupply > type(uint256).max / 10 ** _decimals
            || !currency.isAvailable
            || _unitPrice < minUnitPrices[_currency]
            || _unitPrice > maxUnitPrices[_currency]
            || _decimals > Constant.ESTATE_TOKEN_DECIMALS_LIMIT
            || _expireAt <= block.timestamp
            || _closeAt <= block.timestamp) {
            revert InvalidInput();
        }

        requests[_requestId] = Request(
            0,
            zone,
            _uri,
            _totalSupply,
            _minSellingAmount,
            _maxSellingAmount,
            0,
            _unitPrice,
            _currency,
            _decimals,
            _expireAt,
            _closeAt,
            _requester
        );

        emit RequestUpdate(
            _requestId,
            _requester,
            _uri,
            _totalSupply,
            _minSellingAmount,
            _maxSellingAmount,
            _unitPrice,
            _currency,
            _decimals,
            _expireAt,
            _closeAt
        );
    }

    function updateRequestURI(uint256 _requestId, string calldata _uri) external onlyExecutive {
        if (_requestId == 0 || _requestId > requestNumber) {
            revert InvalidRequestId();
        }
        Request storage request = requests[_requestId];
        if (!IAdmin(admin).isActiveIn(request.zone, msg.sender)) {
            revert Unauthorized();
        }

        if (request.totalSupply == 0) {
            revert Cancelled();
        }
        if (request.estateId != 0) {
            revert Tokenized();
        }

        request.uri = _uri;
        emit RequestURIUpdate(_requestId, _uri);
    }

    function deposit(uint256 _requestId, uint256 _amount)
    external payable nonReentrant whenNotPaused {
        if (_requestId == 0 || _requestId > requestNumber) {
            revert InvalidRequestId();
        }
        Request storage request = requests[_requestId];
        if (request.totalSupply == 0) {
            revert Cancelled();
        }
        if (request.estateId != 0) {
            revert Tokenized();
        }
        if (request.closeAt <= block.timestamp) {
            revert SaleEnded();
        }
        uint256 newSoldAmount = request.soldAmount + _amount;
        if (newSoldAmount > request.maxSellingAmount) {
            revert MaxSellingAmountExceeded();
        }
        request.soldAmount = newSoldAmount;

        address currency = request.currency;
        uint256 value = _amount * request.unitPrice;

        if (currency == address(0)) {
            CurrencyHandler.receiveNative(value);
        } else {
            IERC20Upgradeable(currency).safeTransferFrom(msg.sender, address(this), value);
        }

        deposits[_requestId][msg.sender] += _amount;

        emit Deposit(
            _requestId,
            msg.sender,
            _amount,
            value
        );
    }

    function cancelRequest(uint256 _requestId) external onlyManager {
        if (_requestId == 0 || _requestId > requestNumber) {
            revert InvalidRequestId();
        }
        Request storage request = requests[_requestId];
        if (!IAdmin(admin).isActiveIn(request.zone, msg.sender)) {
            revert Unauthorized();
        }
        if (request.totalSupply == 0) {
            revert Cancelled();
        }
        if (request.estateId != 0) {
            revert Tokenized();
        }
        request.totalSupply = 0;
        emit RequestCancellation(_requestId);
    }

    function confirmRequest(
        uint256 _requestId,
        address _commissionReceiver
    ) external nonReentrant onlyManager whenNotPaused returns (uint256) {
        if (_requestId == 0 || _requestId > requestNumber) {
            revert InvalidRequestId();
        }
        Request storage request = requests[_requestId];

        bytes32 zone = request.zone;
        if (!IAdmin(admin).isActiveIn(zone, msg.sender)) {
            revert Unauthorized();
        }

        uint256 totalSupply = request.totalSupply;
        if (totalSupply == 0) {
            revert Cancelled();
        }

        if (request.estateId != 0) {
            revert Tokenized();
        }

        if (request.closeAt + Constant.ESTATE_TOKEN_CONFIRMATION_TIME_LIMIT <= block.timestamp) {
            revert FailedOwnershipTransfer();
        }

        uint256 soldAmount = request.soldAmount;
        if (soldAmount < request.minSellingAmount) {
            revert NotEnoughSoldAmount();
        }

        uint8 decimals = request.decimals;
        uint256 unit = 10 ** decimals;

        IEstateToken estateTokenContract = IEstateToken(estateToken);
        uint256 estateId = estateTokenContract.tokenizeEstate(
            totalSupply * unit,
            zone,
            _requestId,
            request.uri,
            request.expireAt,
            request.decimals,
            _commissionReceiver
        );
        request.estateId = estateId;

        address requester = request.requester;
        unchecked {
            estateTokenContract.safeTransferFrom(
                address(this),
                request.requester,
                estateId,
                (request.totalSupply - soldAmount) * unit,
                ""
            );
        }

        address currency = request.currency;
        uint256 value = soldAmount * request.unitPrice;
        uint256 fee = MulDiv.mulDiv(
            value,
            feeRate,
            Constant.COMMON_PERCENTAGE_DENOMINATOR
        );
        if (IAdmin(admin).isExclusiveCurrency(currency)) {
            fee = MulDiv.mulDiv(
                fee,
                exclusiveRate,
                Constant.COMMON_PERCENTAGE_DENOMINATOR
            );
        }

        uint256 commissionAmount;
        if (_commissionReceiver != address(0)) {
            commissionAmount = MulDiv.mulDiv(
                fee,
                commissionRate,
                Constant.COMMON_PERCENTAGE_DENOMINATOR
            );
        }

        if (currency == address(0)) {
            CurrencyHandler.transferNative(requester, value - fee);
            CurrencyHandler.transferNative(feeReceiver, fee - commissionAmount);
            if (commissionAmount != 0) {
                CurrencyHandler.transferNative(_commissionReceiver, commissionAmount);
            }
        } else {
            IERC20Upgradeable currencyContract = IERC20Upgradeable(currency);
            currencyContract.safeTransfer(requester, value - fee);
            currencyContract.safeTransfer(feeReceiver, fee - commissionAmount);
            if (commissionAmount != 0) {
                currencyContract.safeTransfer(_commissionReceiver, commissionAmount);
            }
        }

        emit RequestConfirmation(
            _requestId,
            estateId,
            soldAmount,
            value,
            fee,
            _commissionReceiver,
            commissionAmount
        );

        return estateId;
    }

    function withdrawDeposit(uint256 _requestId) external nonReentrant whenNotPaused {
        if (_requestId == 0 || _requestId > requestNumber) {
            revert InvalidRequestId();
        }
        Request storage request = requests[_requestId];
        if (request.estateId != 0) {
            revert Tokenized();
        }
        if (request.totalSupply != 0) {
            uint256 closeAt = request.closeAt;
            if (closeAt > block.timestamp) {
                revert StillSelling();
            }
            if (closeAt + Constant.ESTATE_TOKEN_CONFIRMATION_TIME_LIMIT > block.timestamp
                && request.soldAmount >= request.minSellingAmount) {
                revert InvalidWithdrawing();
            }
        }
        if (hasWithdrawn[_requestId][msg.sender]) {
            revert AlreadyWithdrawn();
        }

        address currency = request.currency;
        uint256 amount = deposits[_requestId][msg.sender];
        uint256 value = amount * request.unitPrice;

        hasWithdrawn[_requestId][msg.sender] = true;

        if (currency == address(0)) {
            CurrencyHandler.transferNative(msg.sender, value);
        } else {
            IERC20Upgradeable(currency).safeTransfer(msg.sender, value);
        }

        emit DepositWithdrawal(
            _requestId,
            msg.sender,
            amount,
            value
        );
    }

    function withdrawToken(uint256 _requestId) external whenNotPaused {
        if (_requestId == 0 || _requestId > requestNumber) {
            revert InvalidRequestId();
        }
        Request storage request = requests[_requestId];
        if (request.estateId == 0) {
            revert InvalidWithdrawing();
        }
        if (hasWithdrawn[_requestId][msg.sender]) {
            revert AlreadyWithdrawn();
        }

        hasWithdrawn[_requestId][msg.sender] = true;
        uint256 amount = allocationOf(_requestId, msg.sender);
        IEstateToken(estateToken).safeTransferFrom(
            address(this),
            msg.sender,
            request.estateId,
            amount,
            ""
        );

        emit TokenWithdrawal(
            _requestId,
            msg.sender,
            amount
        );
    }

    function allocationOf(uint256 _requestId, address _account) public view returns (uint256 allocation) {
        if (_requestId == 0 || _requestId > requestNumber) revert InvalidRequestId();
        return deposits[_requestId][_account] * 10 ** requests[_requestId].decimals;
    }

    function supportsInterface(bytes4 _interfaceId) public view override (
        IERC165Upgradeable,
        ERC1155ReceiverUpgradeable,
        EstateTokenizer
    ) returns (bool) {
        return super.supportsInterface(_interfaceId);
    }
}
