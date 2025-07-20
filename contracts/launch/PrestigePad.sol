// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ReentrancyGuardUpgradeable} from "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";

import {IAdmin} from "../common/interfaces/IAdmin.sol";
import {IPriceWatcher} from "../common/interfaces/IPriceWatcher.sol";

import {CommonConstant} from "../common/constants/CommonConstant.sol";

import {Discountable} from "../common/utilities/Discountable.sol";
import {Pausable} from "../common/utilities/Pausable.sol";
import {Validatable} from "../common/utilities/Validatable.sol";

import {IProjectToken} from "./interfaces/IProjectToken.sol";

import {PrestigePadStorage} from "./storages/PrestigePadStorage.sol";

import {ProjectLaunchpad} from "./utilities/ProjectLaunchpad.sol";

contract PrestigePad is
PrestigePadStorage,
ProjectLaunchpad,
Discountable,
Pausable,
Validatable,
ReentrancyGuardUpgradeable {
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

    modifier onlyOriginator(uint256 _requestId) {
        if (msg.sender != requests[_requestId].originator) {
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
        require(_feeRate <= CommonConstant.COMMON_RATE_MAX_FRACTION);

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
        if (_feeRate > CommonConstant.COMMON_RATE_MAX_FRACTION) {
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

    function whitelist(
        address[] calldata _accounts,
        bool _isWhitelisted,
        bytes[] calldata _signatures
    ) external {
        IAdmin(admin).verifyAdminSignatures(
            abi.encode(
                address(this),
                "whitelist",
                _accounts,
                _isWhitelisted
            ),
            _signatures
        );

        if (_isWhitelisted) {
            for (uint256 i; i < _accounts.length; ++i) {
                if (isWhitelisted[_accounts[i]]) {
                    revert WhitelistedAccount(_accounts[i]);
                }
                isWhitelisted[_accounts[i]] = true;
                emit Whitelist(_accounts[i]);
            }
        } else {
            for (uint256 i; i < _accounts.length; ++i) {
                if (!isWhitelisted[_accounts[i]]) {
                    revert NotWhitelistedAccount(_accounts[i]);
                }
                isWhitelisted[_accounts[i]] = false;
                emit Unwhitelist(_accounts[i]);
            }
        }
    }

    function isOriginatorIn(bytes32 _zone, address _seller) public view returns (bool) {
        return bytes(originatorURIs[_zone][_seller]).length != 0;
    }

    function registerOriginatorIn(
        bytes32 _zone,
        address _account,
        string calldata _uri,
        Validation calldata _validation
    ) external onlyManager {
        _validate(
            abi.encode(
                _zone,
                _account,
                _uri
            ),
            _validation
        );

        if (!IAdmin(admin).getZoneEligibility(_zone, msg.sender)) {
            revert Unauthorized();
        }

        originatorURIs[_zone][_account] = _uri;

        emit OriginatorRegistration(
            _zone,
            _account,
            _uri
        );
    }

    function getFeeRate() public view returns (Rate memory) {
        return Rate(feeRate, CommonConstant.COMMON_RATE_DECIMALS);
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
        address _originator,
        bytes32 _zone,
        string calldata _projectURI,
        string calldata _uri,
        uint256 _initialQuantity,
        Validation calldata _validation
    ) external onlyExecutive whenNotPaused returns (uint256) {
        _validate(
            abi.encode(
                _projectURI,
                _uri
            ),
            _validation
        );

        if (!IAdmin(admin).getZoneEligibility(_zone, msg.sender)) {
            revert Unauthorized();
        }

        if (!isOriginatorIn(_zone, _originator)) {
            revert InvalidInput();
        }

        uint256 requestId = ++requestNumber;
        PrestigePadRequest storage request = requests[requestId];
        request.uri = _uri;

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
        round.agenda.startAt = round.agenda.confirmAt = uint40(block.timestamp);

        uint256 initialAmount = _initialQuantity * 10 ** projectTokenContract.decimals();
        projectTokenContract.mint(projectId, initialAmount);
        projectTokenContract.safeTransferFrom(
            address(this),
            _originator,
            projectId,
            initialAmount,
            ""
        );

        emit NewRequest(
            requestId,
            projectId,
            _originator,
            _uri,
            _initialQuantity
        );

        return requestId;
    }

    function updateRequestRounds(
        uint256 _requestId,
        uint256 _removedRoundNumber,
        PrestigePadRoundInput[] calldata _addedRounds
    ) external validRequest(_requestId) onlyOriginator(_requestId) whenNotPaused {
        PrestigePadRequest storage request = requests[_requestId];

        uint256[] storage roundIds = request.roundIds;
        uint256 lastRoundId = request.lastRoundId;
        if (lastRoundId != 0 && rounds[roundIds[lastRoundId]].agenda.confirmAt == 0) {
            revert InvalidUpdating();
        }

        if (roundIds.length - lastRoundId <= _removedRoundNumber) {
            revert InvalidRemoving();
        }

        for (uint256 i; i < _removedRoundNumber; ++i) {
            roundIds.pop();
        }

        uint256 baseMinUnitPriceValue = baseMinUnitPrice;
        uint256 baseMaxUnitPriceValue = baseMaxUnitPrice;
        for (uint256 i; i < _addedRounds.length; ++i) {
            PrestigePadRoundInput calldata input = _addedRounds[i];
            _validate(abi.encode(input.uri), input.validation);

            if (input.minSellingQuantity > input.maxSellingQuantity
                || input.maxSellingQuantity > input.totalQuantity) {
                revert InvalidInput();
            }

            uint256 roundId = ++roundNumber;
            PrestigePadRound storage round = rounds[roundId];
            round.uri = input.uri;
            round.quota.totalQuantity = input.totalQuantity;
            round.quota.minSellingQuantity = input.minSellingQuantity;
            round.quota.maxSellingQuantity = input.maxSellingQuantity;

            emit NewRound(
                roundId,
                _requestId,
                input.uri,
                input.totalQuantity,
                input.minSellingQuantity,
                input.maxSellingQuantity
            );

            roundIds.push(roundId);
        }

        emit RequestRoundsUpdate(
            _requestId,
            _removedRoundNumber,
            _addedRounds.length
        );
    }

    function startNextRoundWithDuration(
        uint256 _requestId,
        uint256 _unitPrice,
        address _currency,
        uint256 _cashbackThreshold,
        uint256 _cashbackBaseRate,
        address[] calldata _cashbackCurrencies,
        uint256[] calldata _cashbackDenominations,
        uint40 _privateSaleDuration,
        uint40 _publicSaleDuration
    ) external {
        // TODO: implement
    }

    function startNextRoundWithTimestamp(
        uint256 _requestId,
        uint256 _unitPrice,
        address _currency,
        uint256 _cashbackThreshold,
        uint256 _cashbackBaseRate,
        address[] calldata _cashbackCurrencies,
        uint256[] calldata _cashbackDenominations,
        uint40 _privateSaleEndsAt,
        uint40 _publicSaleEndsAt
    ) external {
        // TODO: implement
    }

    function cancelCurrentRound(uint256 _requestId) external {
        // TODO: implement
    }

    function confirmCurrentRound(uint256 _requestId) external {
        // TODO: implement
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
}
