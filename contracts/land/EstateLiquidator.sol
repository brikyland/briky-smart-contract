// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

/// @openzeppelin/contracts-upgradeable/
import {ReentrancyGuardUpgradeable} from "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";

/// contracts/common/constants/
import {CommonConstant} from "../common/constants/CommonConstant.sol";

/// contracts/common/interfaces/
import {IAdmin} from "../common/interfaces/IAdmin.sol";
import {IDividendHub} from "../common/interfaces/IDividendHub.sol";
import {IGovernanceHub} from "../common/interfaces/IGovernanceHub.sol";

/// contracts/common/utilities/
import {Administrable} from "../common/utilities/Administrable.sol";
import {CurrencyHandler} from "../common/utilities/CurrencyHandler.sol";
import {Discountable} from "../common/utilities/Discountable.sol";
import {Formula} from "../common/utilities/Formula.sol";
import {Pausable} from "../common/utilities/Pausable.sol";
import {Validatable} from "../common/utilities/Validatable.sol";

/// contracts/land/constants/
import {EstateLiquidatorConstant} from "./constants/EstateLiquidatorConstant.sol";

/// contracts/land/interfaces/
import {IEstateToken} from "./interfaces/IEstateToken.sol";

/// contracts/land/storages/
import {EstateLiquidatorStorage} from "./storages/EstateLiquidatorStorage.sol";

/// contracts/land/utilities/
import {CommissionDispatchable} from "./utilities/CommissionDispatchable.sol";

/**
 *  @author Briky Team
 *
 *  @notice TODO: The `EstateLiquidator` contract facilitates the extraction of estates from `EstateToken`.
 *
 *  @dev    Implementation involves server-side support.
 *  @dev    ERC-20 tokens are identified by their contract addresses.
 *          Native coin is represented by the zero address (0x0000000000000000000000000000000000000000).
 */
contract EstateLiquidator is
EstateLiquidatorStorage,
Administrable,
CommissionDispatchable,
Discountable,
Pausable,
Validatable,
ReentrancyGuardUpgradeable {
    /** ===== LIBRARY ===== **/
    using Formula for uint256;


    /** ===== CONSTANT ===== **/
    string constant private VERSION = "v1.2.1";


    /** ===== MODIFIER ===== **/
    /**
     *  @notice Verify a valid extraction request.
     *
     *          Name            Description
     *  @param  _requestId      Request identifier.
     */
    modifier validRequest(
        uint256 _requestId
    ) {
        if (_requestId == 0 || _requestId > requestNumber) {
            revert InvalidRequestId();
        }
        _;
    }


    /** ===== FUNCTION ===== **/
    /* --- Standard --- */
    /**
     *  @notice Executed on a call to the contract with empty calldata.
     */
    receive() external payable {}

    /**
     *  @return Version of implementation.
     */
    function version() external pure returns (string memory) {
        return VERSION;
    }


    /* --- Initialization --- */
    /**
     *  @notice Invoked for initialization after deployment, serving as the contract constructor.
     *
     *          Name                Description
     *  @param  _admin              `Admin` contract address.
     *  @param  _estateToken        `EstateToken` contract address.
     *  @param  _commissionToken    `CommissionToken` contract address.
     *  @param  _governanceHub      `GovernanceHub` contract address.
     *  @param  _dividendHub        `DividendHub` contract address.
     *  @param  _feeReceiver        `FeeReceiver` contract address.
     *  @param  _validator          Validator address.
     */
    function initialize(
        address _admin,
        address _estateToken,
        address _commissionToken,
        address _governanceHub,
        address _dividendHub,
        address _feeReceiver,
        address _validator
    ) external
    initializer {
        /// Initializer.
        __Pausable_init();
        __ReentrancyGuard_init();

        __CommissionDispatchable_init(_commissionToken);
        __Validatable_init(_validator);

        /// Dependency.
        admin = _admin;
        estateToken = _estateToken;
        governanceHub = _governanceHub;
        dividendHub = _dividendHub;
        feeReceiver = _feeReceiver;
    }


    /* --- Query --- */
    /**
     *          Name            Description
     *  @param  _requestId      Request identifier.
     *
     *  @return Information and progress of the extraction request.
     */
    function getRequest(
        uint256 _requestId
    ) external view
    validRequest(_requestId)
    returns (EstateLiquidatorRequest memory) {
        return requests[_requestId];
    }

    /* --- Command --- */
    /**
     *  @notice TODO: Create estate extraction request by submitting a proposal to `GovernanceHub`
     *
     *          Name            Description
     *  @param  _estateId       Estate identifier to be extracted.
     *  @param  _buyer          Buyer address.
     *  @param  _value          Sale value.
     *  @param  _currency       Sale currency address.
     *  @param  _feeRate        Fraction of the sold value charged as fee.
     *  @param  _uuid           Checksum of request context.
     *  @param  _validation     Validation package from the validator.
     *
     *  @return New request identifier.
     *
     *  @dev    Permission: Managers active in the zone of the estate.
     */
    function requestExtraction(
        uint256 _estateId,
        address _buyer,
        uint256 _value,
        address _currency,
        uint256 _feeRate,
        bytes32 _uuid,
        Validation calldata _validation
    ) external
    payable
    whenNotPaused
    nonReentrant
    onlyManager
    returns (uint256) {
        IEstateToken estateTokenContract = IEstateToken(estateToken);
        if (!IAdmin(admin).isActiveIn(estateTokenContract.zoneOf(_estateId), msg.sender)) {
            revert Unauthorized();
        }

        if (!estateTokenContract.isAvailable(_estateId)) {
            revert UnavailableEstate();
        }
        if (!IAdmin(admin).isAvailableCurrency(_currency)) {
            revert InvalidCurrency();
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
            _buyer,
            _uuid,
            ProposalRule.ApprovalBeyondQuorum,
            estateTokenContract.getEstate(_estateId).tokenizeAt + EstateLiquidatorConstant.UNANIMOUS_GUARD_DURATION > block.timestamp
                ? EstateLiquidatorConstant.UNANIMOUS_QUORUM_RATE
                : EstateLiquidatorConstant.MAJORITY_QUORUM_RATE,
            uint40(EstateLiquidatorConstant.VOTE_DURATION),
            uint40(block.timestamp) + uint40(EstateLiquidatorConstant.ADMISSION_DURATION),
            _validation
        );

        Rate memory rate = Rate(_feeRate, CommonConstant.RATE_DECIMALS);

        uint256 requestId = ++requestNumber;
        requests[requestId] = EstateLiquidatorRequest(
            _estateId,
            proposalId,
            _value,
            _currency,
            rate,
            _buyer
        );

        emit NewRequest(
            requestId,
            _estateId,
            proposalId,
            _buyer,
            _value,
            _currency,
            rate
        );

        return requestId;
    }

    /**
     *  @notice TODO: Conclude an extraction request
     *
     *          Name            Description
     *  @param  _requestId      Request identifier.
     *
     *  @return Whether the extraction was successful.
     */
    function conclude(uint256 _requestId)
    external
    whenNotPaused
    nonReentrant
    validRequest(_requestId)
    returns (bool) {
        EstateLiquidatorRequest storage request = requests[_requestId];
        uint256 estateId = request.estateId;
        if (estateId == 0) {
            revert AlreadyCancelled();
        }

        IEstateToken estateTokenContract = IEstateToken(estateToken);
        if (!estateTokenContract.isAvailable(estateId)) {
            revert UnavailableEstate();
        }

        ProposalState state = IGovernanceHub(governanceHub).getProposalState(request.proposalId);
        if (state == ProposalState.SuccessfulExecuted) {
            uint256 value = request.value;
            address currency = request.currency;

            uint256 fee = _applyDiscount(
                value.scale(request.feeRate),
                currency
            );

            if (currency == address(0)) {
                IDividendHub(dividendHub).issueDividend{value: value - fee}(
                    estateToken,
                    estateId,
                    value - fee,
                    currency,
                    "Extraction"
                );
            } else {
                address dividendHubAddress = dividendHub;
                CurrencyHandler.allowERC20(currency, dividendHubAddress, value - fee);
                IDividendHub(dividendHubAddress).issueDividend(
                    estateToken,
                    estateId,
                    value - fee,
                    currency,
                    "Extraction"
                );
            }

            estateTokenContract.extractEstate(estateId, _requestId);

            uint256 commission = _dispatchCommission(
                estateId,
                fee,
                currency
            );

            if (currency == address(0)) {
                CurrencyHandler.sendNative(feeReceiver, fee - commission);
            } else {
                CurrencyHandler.sendCurrency(currency, feeReceiver, fee - commission);
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

        revert InvalidConclusion();
    }
}
