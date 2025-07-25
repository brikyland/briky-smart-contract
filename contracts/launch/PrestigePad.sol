// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ReentrancyGuardUpgradeable} from "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";

import {IAdmin} from "../common/interfaces/IAdmin.sol";
import {IPriceWatcher} from "../common/interfaces/IPriceWatcher.sol";

import {Formula} from "../lib/Formula.sol";

import {CommonConstant} from "../common/constants/CommonConstant.sol";

import {Discountable} from "../common/utilities/Discountable.sol";
import {Pausable} from "../common/utilities/Pausable.sol";
import {Validatable} from "../common/utilities/Validatable.sol";

import {PrestigePadConstant} from "./constants/PrestigePadConstant.sol";

import {IProjectToken} from "./interfaces/IProjectToken.sol";

import {PrestigePadStorage} from "./storages/PrestigePadStorage.sol";

import {ProjectLaunchpad} from "./utilities/ProjectLaunchpad.sol";
import {IReserveVault} from "../common/interfaces/IReserveVault.sol";

contract PrestigePad is
PrestigePadStorage,
ProjectLaunchpad,
Discountable,
Pausable,
Validatable,
ReentrancyGuardUpgradeable {
    using Formula for uint256;

    string constant private VERSION = "v1.1.1";

    modifier validRequest(uint256 _requestId) {
        if (_requestId == 0 || _requestId > requestNumber) {
            revert InvalidRequestId();
        }
        _;
    }

    modifier validRound(uint256 _roundId) {
        if (_roundId == 0 || _roundId > roundNumber) {
            revert InvalidRoundId();
        }
        _;
    }

    modifier onlyInitiator(uint256 _requestId) {
        if (msg.sender != requests[_requestId].initiator) {
            revert Unauthorized();
        }
        _;
    }

    receive() external payable {}

    function initialize(
        address _admin,
        address _projectToken,
        address _priceWatcher,
        address _feeReceiver,
        address _reserveVault,
        address _validator,
        uint256 _baseMinUnitPrice,
        uint256 _baseMaxUnitPrice,
        uint256 _feeRate
    ) external initializer {
        require(_feeRate <= CommonConstant.RATE_MAX_FRACTION);

        __Pausable_init();
        __ReentrancyGuard_init();

        __Validatable_init(_validator);

        admin = _admin;
        projectToken = _projectToken;
        priceWatcher = _priceWatcher;
        feeReceiver = _feeReceiver;
        reserveVault = _reserveVault;

        baseMinUnitPrice = _baseMinUnitPrice;
        baseMaxUnitPrice = _baseMaxUnitPrice;
        emit BaseUnitPriceRangeUpdate(_baseMinUnitPrice, _baseMaxUnitPrice);

        feeRate = _feeRate;
        emit FeeRateUpdate(_feeRate);
    }

    function version() external pure returns (string memory) {
        return VERSION;
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
        if (_feeRate > CommonConstant.RATE_MAX_FRACTION) {
            revert InvalidRate();
        }
        feeRate = _feeRate;
        emit FeeRateUpdate(_feeRate);
    }

    function updateBaseUnitPriceRange(
        uint256 _baseMinUnitPrice,
        uint256 _baseMaxUnitPrice,
        bytes[] calldata _signatures
    ) external {
        IAdmin(admin).verifyAdminSignatures(
            abi.encode(
                address(this),
                "updateBaseUnitPriceRange",
                _baseMinUnitPrice,
                _baseMaxUnitPrice
            ),
            _signatures
        );

        if (_baseMinUnitPrice > _baseMaxUnitPrice) {
            revert InvalidInput();
        }
        baseMinUnitPrice = _baseMinUnitPrice;
        baseMaxUnitPrice = _baseMaxUnitPrice;
        emit BaseUnitPriceRangeUpdate(
            _baseMinUnitPrice,
            _baseMaxUnitPrice
        );
    }

    function registerInitiatorIn(
        bytes32 _zone,
        address _account,
        bool _isInitiator
    ) external onlyManager {
        if (!IAdmin(admin).getZoneEligibility(_zone, msg.sender)) {
            revert Unauthorized();
        }

        if (_isInitiator) {
            if (isInitiatorIn[_zone][_account]) {
                revert RegisteredAccount();
            }
            isInitiatorIn[_zone][_account] = true;
            emit InitiatorRegistration(_zone, _account);
        } else {
            if (!isInitiatorIn[_zone][_account]) {
                revert NotRegisteredAccount();
            }
            isInitiatorIn[_zone][_account] = false;
            emit InitiatorDeregistration(_zone, _account);
        }
    }

    function getFeeRate() public view returns (Rate memory) {
        return Rate(feeRate, CommonConstant.RATE_DECIMALS);
    }

    function getRequest(uint256 _requestId)
    external view validRequest(_requestId) returns (PrestigePadRequest memory) {
        return requests[_requestId];
    }

    function getRound(uint256 _roundId)
    external view validRound(_roundId) returns (PrestigePadRound memory) {
        return rounds[_roundId];
    }

    function requestLaunch(
        address _initiator,
        bytes32 _zone,
        string calldata _projectURI,
        string calldata _requestUri,
        uint256 _initialQuantity,
        Validation calldata _validation
    ) external onlyExecutive whenNotPaused returns (uint256) {
        _validate(
            abi.encode(
                _projectURI,
                _requestUri
            ),
            _validation
        );

        if (!IAdmin(admin).getZoneEligibility(_zone, msg.sender)) {
            revert Unauthorized();
        }

        if (!isInitiatorIn[_zone][_initiator]) {
            revert InvalidInput();
        }

        uint256 requestId = ++requestNumber;
        PrestigePadRequest storage request = requests[requestId];
        request.uri = _requestUri;

        IProjectToken projectTokenContract = IProjectToken(projectToken);
        uint256 projectId = projectTokenContract.launchProject(
            _zone,
            requestId,
            _projectURI
        );
        request.projectId = projectId;

        uint256 roundId = ++roundNumber;
        request.roundIds.push(roundId);

        PrestigePadRound storage round = rounds[roundId];
        round.quota.totalQuantity = _initialQuantity;
        round.agenda.raiseStartsAt = round.agenda.confirmAt = uint40(block.timestamp);

        uint256 initialAmount = _initialQuantity * 10 ** projectTokenContract.decimals();
        projectTokenContract.mint(projectId, initialAmount);
        projectTokenContract.safeTransferFrom(
            address(this),
            _initiator,
            projectId,
            initialAmount,
            ""
        );

        emit NewRequest(
            requestId,
            projectId,
            _initiator,
            _requestUri,
            _initialQuantity
        );

        return requestId;
    }

    function updateRequestRound(
        uint256 _requestId,
        uint256 _index,
        PrestigePadRoundInput calldata _round
    ) external validRequest(_requestId) onlyInitiator(_requestId) whenNotPaused returns (uint256) {
        PrestigePadRequest storage request = requests[_requestId];
        if (request.isFinalized) {
            revert AlreadyFinalized();
        }

        if (rounds[request.roundIds[_index]].agenda.raiseStartsAt != 0) {
            revert AlreadyInitiated();
        }

        uint256 roundId = _newRound(_requestId, _round);
        request.roundIds[_index] = roundId;

        emit RequestRoundUpdate(
            _requestId,
            roundId,
            _index,
            _round
        );

        return roundId;
    }

    function updateRequestRounds(
        uint256 _requestId,
        uint256 _removedRoundNumber,
        PrestigePadRoundInput[] calldata _addedRounds
    ) external validRequest(_requestId) onlyInitiator(_requestId) whenNotPaused returns (uint256) {
        PrestigePadRequest storage request = requests[_requestId];
        if (request.isFinalized) {
            revert AlreadyFinalized();
        }

        uint256[] storage roundIds = request.roundIds;
        uint256 index = roundIds.length;
        if (_removedRoundNumber >= index) {
            revert InvalidRemoving();
        }
        index -= _removedRoundNumber;

        uint256 currentIndex = request.currentIndex;
        if (index <= currentIndex) {
            revert InvalidRemoving();
        }

        for (uint256 i; i < _removedRoundNumber; i++) {
            roundIds.pop();
        }

        for (uint256 i; i < _addedRounds.length; i++) {
            uint256 roundId = _newRound(_requestId, _addedRounds[i]);
            roundIds.push(roundId);

            emit RequestRoundUpdate(
                _requestId,
                roundId,
                index++,
                _addedRounds[i]
            );
        }

        return index;
    }

    function initiateRequestNextRound(
        uint256 _requestId,
        uint256 _cashbackThreshold,
        uint256 _cashbackBaseRate,
        address[] calldata _cashbackCurrencies,
        uint256[] calldata _cashbackDenominations,
        uint40 _raiseStartsAt,
        uint40 _raiseDuration
    ) external nonReentrant validRequest(_requestId) onlyInitiator(_requestId) whenNotPaused returns (uint256) {
        if (_cashbackBaseRate > CommonConstant.RATE_MAX_FRACTION
            || _cashbackCurrencies.length != _cashbackDenominations.length
            || _raiseStartsAt < block.timestamp
            || _raiseDuration < PrestigePadConstant.RAISE_MINIMUM_DURATION) {
            revert InvalidInput();
        }

        PrestigePadRequest storage request = requests[_requestId];
        if (request.isFinalized) {
            revert AlreadyFinalized();
        }

        uint256 currentIndex = request.currentIndex;
        if (rounds[request.roundIds[currentIndex]].agenda.confirmAt == 0) {
            revert InvalidInitiating();
        }

        request.currentIndex = ++currentIndex;
        if (currentIndex == request.roundIds.length) {
            revert NoRoundToInitiate();
        }

        uint256 roundId = request.roundIds[currentIndex];
        PrestigePadRound storage round = rounds[roundId];
        if (_cashbackThreshold > round.quota.totalQuantity) {
            revert InvalidInput();
        }

        uint256 unitPrice = round.quote.unitPrice;
        address currency = round.quote.currency;
        uint256 feeDenomination = _applyDiscount(
            unitPrice.scale(feeRate, CommonConstant.RATE_MAX_FRACTION),
            currency
        );

        uint256 cashbackFundId;
        if (_cashbackBaseRate == 0 && _cashbackCurrencies.length == 0) {
            if (_cashbackThreshold != 0) {
                revert InvalidInput();
            }
            cashbackFundId = IReserveVault(reserveVault).requestFund(
                currency,
                feeDenomination.scale(_cashbackBaseRate, CommonConstant.RATE_MAX_FRACTION),
                _cashbackCurrencies,
                _cashbackDenominations
            );
        }

        round.quote.cashbackThreshold = _cashbackThreshold;
        round.quote.cashbackFundId = cashbackFundId;
        round.quote.feeDenomination = feeDenomination;

        round.agenda.raiseStartsAt = _raiseStartsAt;
        round.agenda.raiseEndsAt = _raiseStartsAt + _raiseDuration;

        emit RequestNextRoundInitiation(
            _requestId,
            roundId,
            cashbackFundId,
            currentIndex,
            _raiseStartsAt,
            _raiseDuration
        );

        return roundId;
    }

    function cancelRequestCurrentRound(uint256 _requestId)
    external validRequest(_requestId) onlyInitiator(_requestId) whenNotPaused {
        PrestigePadRequest storage request = requests[_requestId];
        if (request.isFinalized) {
            revert AlreadyFinalized();
        }

        PrestigePadRound storage round = rounds[request.roundIds[request.currentIndex]];
        if (round.agenda.confirmAt != 0) {
            revert AlreadyConfirmed();
        }

        uint256 roundId = ++roundNumber;
        PrestigePadRound storage newRound = rounds[roundId];
        newRound.uri = round.uri;
        newRound.quota.totalQuantity = round.quota.totalQuantity;
        newRound.quota.minSellingQuantity = round.quota.minSellingQuantity;
        newRound.quota.maxSellingQuantity = round.quota.maxSellingQuantity;
        newRound.quote.unitPrice = round.quote.unitPrice;
        newRound.quote.currency = round.quote.currency;

        round.quota.totalQuantity = 0;

        emit RequestCurrentRoundCancellation(_requestId, roundId);
    }

    function confirmCurrentRound(uint256 _requestId)
    external payable validRequest(_requestId) onlyInitiator(_requestId) whenNotPaused {
        PrestigePadRequest storage request = requests[_requestId];
        if (request.isFinalized) {
            revert AlreadyFinalized();
        }

        PrestigePadRound storage round = rounds[request.roundIds[request.currentIndex]];
        if (round.agenda.raiseStartsAt == 0) {
            revert InvalidConfirming();
        }

        if (round.agenda.raiseEndsAt + PrestigePadConstant.RAISE_CONFIRMATION_TIME_LIMIT <= block.timestamp) {
            revert Timeout();
        }

        // uint256 soldQuantity = request.quota.soldQuantity;

    }

    function deposit(uint256 _requestId, uint256 _quantity) external {
        // TODO: implement
    }

    function safeDeposit(
        uint256 _requestId,
        uint256 _quantity,
        bytes32 _anchor
    ) external {
        // TODO: implement
    }

    function withdrawDeposit(uint256 requestId) external returns (uint256) {
        // TODO: implement
        return 0;
    }

    function withdrawProjectToken(uint256 requestId) external returns (uint256) {
        // TODO: implement
        return 0;
    }

    function isFinalized(uint256 _requestId) external view returns (bool) {
        return requests[_requestId].isFinalized;
    }

    function allocationOfAt(
        uint256 _tokenizationId,
        address _account,
        uint256 _at
    ) external view validRequest(_tokenizationId) returns (uint256) {
        // TODO: implement
        return 0;
    }

    function _newRound(
        uint256 _requestId,
        PrestigePadRoundInput calldata _round
    ) internal returns (uint256) {
        _validate(abi.encode(_round.uri), _round.validation);

        if (!IPriceWatcher(priceWatcher).isPriceInRange(
            _round.quote.currency,
            _round.quote.unitPrice,
            baseMinUnitPrice,
            baseMaxUnitPrice
        )) {
            revert InvalidUnitPrice();
        }

        if (_round.quota.minSellingQuantity > _round.quota.maxSellingQuantity
            || _round.quota.maxSellingQuantity > _round.quota.totalQuantity) {
            revert InvalidInput();
        }

        uint256 roundId = ++roundNumber;

        PrestigePadRound storage round = rounds[roundId];
        round.uri = _round.uri;
        round.quota.totalQuantity = _round.quota.totalQuantity;
        round.quota.minSellingQuantity = _round.quota.minSellingQuantity;
        round.quota.maxSellingQuantity = _round.quota.maxSellingQuantity;
        round.quote.unitPrice = _round.quote.unitPrice;
        round.quote.currency = _round.quote.currency;

        emit NewRound(
            roundId,
            _requestId,
            _round.uri,
            _round.quota,
            _round.quote
        );

        return roundId;
    }
}
