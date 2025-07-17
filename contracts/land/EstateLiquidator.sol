// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ReentrancyGuardUpgradeable} from "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";

import {CurrencyHandler} from "../lib/CurrencyHandler.sol";
import {Formula} from "../lib/Formula.sol";

import {CommonConstant} from "../common/constants/CommonConstant.sol";

import {IAdmin} from "../common/interfaces/IAdmin.sol";
import {IDividendHub} from "../common/interfaces/IDividendHub.sol";
import {IGovernanceHub} from "../common/interfaces/IGovernanceHub.sol";

import {Administrable} from "../common/utilities/Administrable.sol";
import {Discountable} from "../common/utilities/Discountable.sol";
import {Pausable} from "../common/utilities/Pausable.sol";
import {Validatable} from "../common/utilities/Validatable.sol";

import {IEstateToken} from "./interfaces/IEstateToken.sol";

import {EstateLiquidatorStorage} from "./storages/EstateLiquidatorStorage.sol";
import {EstateLiquidatorConstant} from "./constants/EstateLiquidatorConstant.sol";

contract EstateLiquidator is
EstateLiquidatorStorage,
Validatable,
Discountable,
Administrable,
Pausable,
ReentrancyGuardUpgradeable {
    using Formula for uint256;

    string constant private VERSION = "";

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
        address _validator,
        uint256 _feeRate
    ) external initializer {
        __Pausable_init();
        __ReentrancyGuard_init();

        __Validatable_init(_validator);

        admin = _admin;
        estateToken = _estateToken;

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

    function getFeeRate() public view returns (Rate memory) {
        return Rate(feeRate, CommonConstant.COMMON_RATE_DECIMALS);
    }

    function getRequest(uint256 _requestId)
    external view validRequest(_requestId) returns (Request memory) {
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
        if (estateTokenContract.isAvailable(_estateId)) {
            revert UnavailableEstate();
        }

        if (_value == 0) {
            revert InvalidInput();
        }

        CurrencyHandler.receiveCurrency(_currency, _value);
        IGovernanceHub governanceHubContract = IGovernanceHub(governanceHub);
        uint256 proposalId = governanceHubContract.propose{
            value: governanceHubContract.fee()
        }(
            address(this),
            _estateId,
            msg.sender,
            _uuid,
            ProposalRule.ApprovalBeyondQuorum,
            estateTokenContract.totalSupply(_estateId).scale(
                estateTokenContract.getEstate(_estateId).tokenizeAt + EstateLiquidatorConstant.ESTATE_LIQUIDATOR_UNANIMOUS_GUARD_DURATION > block.timestamp
                    ? EstateLiquidatorConstant.ESTATE_LIQUIDATOR_UNANIMOUS_QUORUM_RATE
                    : EstateLiquidatorConstant.ESTATE_LIQUIDATOR_MAJORITY_QUORUM_RATE,
                CommonConstant.COMMON_RATE_MAX_FRACTION
            ),
            EstateLiquidatorConstant.ESTATE_LIQUIDATOR_VOTING_DURATION,
            uint40(block.timestamp) + EstateLiquidatorConstant.ESTATE_LIQUIDATOR_ADMISSION_DURATION,
            _validation
        );

        uint256 requestId = ++requestNumber;
        requests[requestId] = Request(
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
        Request storage request = requests[_requestId];
        uint256 estateId = request.estateId;
        if (estateId == 0) {
            revert Cancelled();
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

            uint256 fee = _applyDiscount(
                value.scale(feeRate, CommonConstant.COMMON_RATE_MAX_FRACTION),
                currency
            );

            if (currency == address(0)) {
                CurrencyHandler.sendNative(feeReceiver, fee);
                IDividendHub(dividendHub).issueDividend{value: value - fee}(
                    address(this),
                    estateId,
                    value - fee,
                    currency
                );
            } else {
                address dividendHubAddress = dividendHub;
                CurrencyHandler.sendCurrency(currency, feeReceiver, fee);
                CurrencyHandler.allowERC20(currency, dividendHubAddress, value - fee);
                IDividendHub(dividendHubAddress).issueDividend(
                    address(this),
                    estateId,
                    value - fee,
                    currency
                );
            }

            emit RequestApproval(_requestId, fee);

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

        revert InvalidRequestConclusion();
    }
}
