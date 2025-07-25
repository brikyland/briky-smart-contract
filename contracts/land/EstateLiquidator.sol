// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ReentrancyGuardUpgradeable} from "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";

import {CurrencyHandler} from "../lib/CurrencyHandler.sol";
import {Formula} from "../lib/Formula.sol";

import {IAdmin} from "../common/interfaces/IAdmin.sol";
import {IDividendHub} from "../common/interfaces/IDividendHub.sol";
import {IGovernanceHub} from "../common/interfaces/IGovernanceHub.sol";

import {CommonConstant} from "../common/constants/CommonConstant.sol";

import {Administrable} from "../common/utilities/Administrable.sol";
import {Discountable} from "../common/utilities/Discountable.sol";
import {Pausable} from "../common/utilities/Pausable.sol";
import {Validatable} from "../common/utilities/Validatable.sol";

import {EstateLiquidatorConstant} from "./constants/EstateLiquidatorConstant.sol";

import {IEstateToken} from "./interfaces/IEstateToken.sol";

import {EstateLiquidatorStorage} from "./storages/EstateLiquidatorStorage.sol";

import {CommissionDispatchable} from "./utilities/CommissionDispatchable.sol";

import "hardhat/console.sol";

contract EstateLiquidator is
EstateLiquidatorStorage,
Administrable,
CommissionDispatchable,
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

    receive() external payable {}

    function initialize(
        address _admin,
        address _estateToken,
        address _commissionToken,
        address _governanceHub,
        address _dividendHub,
        address _feeReceiver,
        address _validator,
        uint256 _feeRate
    ) external initializer {
        require(_feeRate <= CommonConstant.RATE_MAX_FRACTION);

        __Pausable_init();
        __ReentrancyGuard_init();

        __CommissionDispatchable_init(_commissionToken);
        __Validatable_init(_validator);

        admin = _admin;
        estateToken = _estateToken;
        commissionToken = _commissionToken;
        governanceHub = _governanceHub;
        dividendHub = _dividendHub;
        feeReceiver = _feeReceiver;

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

    function getFeeRate() public view returns (Rate memory) {
        return Rate(feeRate, CommonConstant.RATE_DECIMALS);
    }

    function getRequest(uint256 _requestId)
    external view validRequest(_requestId) returns (EstateLiquidatorRequest memory) {
        return requests[_requestId];
    }

    function requestExtraction(
        uint256 _estateId,
        uint256 _value,
        address _currency,
        bytes32 _uuid,
        Validation calldata _validation
    ) external payable nonReentrant whenNotPaused returns (uint256) {
        IEstateToken estateTokenContract = IEstateToken(estateToken);
        if (!estateTokenContract.isAvailable(_estateId)) {
            revert UnavailableEstate();
        }

        if (_value == 0) {
            revert InvalidInput();
        }

        IGovernanceHub governanceHubContract = IGovernanceHub(governanceHub);
        uint256 fee = governanceHubContract.fee();
        if (_currency == address(0)) {
            CurrencyHandler.receiveNative(_value + fee);
        } else {
            CurrencyHandler.receiveNative(fee);
            CurrencyHandler.receiveERC20(_currency, _value);
        }
        
        uint256 proposalId = governanceHubContract.propose{
            value: governanceHubContract.fee()
        }(
            estateToken,
            _estateId,
            msg.sender,
            _uuid,
            ProposalRule.ApprovalBeyondQuorum,
            estateTokenContract.getEstate(_estateId).tokenizeAt + EstateLiquidatorConstant.UNANIMOUS_GUARD_DURATION > block.timestamp
                ? EstateLiquidatorConstant.UNANIMOUS_QUORUM_RATE
                : EstateLiquidatorConstant.MAJORITY_QUORUM_RATE,
            uint40(EstateLiquidatorConstant.VOTING_DURATION),
            uint40(block.timestamp) + uint40(EstateLiquidatorConstant.ADMISSION_DURATION),
            _validation
        );

        uint256 requestId = ++requestNumber;
        requests[requestId] = EstateLiquidatorRequest(
            _estateId,
            proposalId,
            _value,
            _currency,
            msg.sender
        );

        emit NewRequest(
            requestId,
            _estateId,
            proposalId,
            msg.sender,
            _value,
            _currency
        );

        return requestId;
    }

    function conclude(uint256 _requestId)
    external nonReentrant validRequest(_requestId) whenNotPaused returns (bool) {
        EstateLiquidatorRequest storage request = requests[_requestId];
        uint256 estateId = request.estateId;
        if (estateId == 0) {
            revert AlreadyCancelled();
        }

        IEstateToken estateTokenContract = IEstateToken(estateToken);
        if (estateTokenContract.isAvailable(estateId)) {
            revert UnavailableEstate();
        }

        ProposalState state = IGovernanceHub(governanceHub).getProposalState(request.proposalId);
        if (state == ProposalState.SuccessfulExecuted) {
            estateTokenContract.extractEstate(estateId, _requestId);

            uint256 value = request.value;
            address currency = request.currency;

            uint256 feeAmount = _applyDiscount(
                value.scale(feeRate, CommonConstant.RATE_MAX_FRACTION),
                currency
            );

            uint256 commissionAmount = _dispatchCommission(
                estateId,
                feeAmount,
                currency
            );

            if (currency == address(0)) {
                CurrencyHandler.sendNative(feeReceiver, feeAmount - commissionAmount);
                IDividendHub(dividendHub).issueDividend{value: value - feeAmount}(
                    address(this),
                    estateId,
                    value - feeAmount,
                    currency
                );
            } else {
                address dividendHubAddress = dividendHub;
                CurrencyHandler.sendCurrency(currency, feeReceiver, feeAmount - commissionAmount);
                CurrencyHandler.allowERC20(currency, dividendHubAddress, value - feeAmount);
                IDividendHub(dividendHubAddress).issueDividend(
                    address(this),
                    estateId,
                    value - feeAmount,
                    currency
                );
            }

            emit RequestApproval(_requestId, feeAmount);

            return true;
        }
        if (state == ProposalState.UnsuccessfulExecuted
            || state == ProposalState.Disqualified
            || state == ProposalState.Rejected) {
            request.estateId = 0;

            CurrencyHandler.sendCurrency(
                request.currency,
                request.buyer,
                request.value
            );

            emit RequestDisapproval(_requestId);

            return false;
        }

        revert InvalidConclusion();
    }
}
