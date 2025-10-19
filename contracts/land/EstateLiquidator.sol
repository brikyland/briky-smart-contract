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
 *  @notice The `EstateLiquidator` contract facilitates the extraction of real estate through approved liquidations. Official
 *          disclosed accounts, who is legally qualified to own the estate, can offer to buy the entire asset with a specific
 *          value and the deal is voted to proceed. If the deal is approved, the associated custodian is grant a limited time
 *          window to complete the required administrative procedures in compliance with local regulations. Liquidation is
 *          finalized only if the custodian fulfills these obligations within the allotted timeframe. In that case, the
 *          proceeds are distributed to holders as the ultimate dividend, and then the corresponding class of estate token will
 *          be deprecated permanently.
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
     *  @notice Verify a valid request identifier.
     *
     *          Name        Description
     *  @param  _requestId  Request identifier.
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
    /* --- Common --- */
    /**
     *  @notice Executed on a call to this contract with empty calldata.
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
     *  @notice Initialize the contract after deployment, serving as the constructor.
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
        /// Initializer
        __CommissionDispatchable_init(_commissionToken);
        __Pausable_init();
        __Validatable_init(_validator);
        __ReentrancyGuard_init();

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
     *  @return Configuration and progress of the extraction request.
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
     *  @notice Request an estate to be extracted.
     *  @notice To prevent deceptive manipulation, the approval quorum to liquidate is initially set at 100% during the first
     *          year of estate and reduced to 75% thereafter.
     *  @notice The message sender must provide sufficient liquidation value and proposing fee for `GovernanceHub`.
     *
     *          Name            Description
     *  @param  _estateId       Estate identifier.
     *  @param  _buyer          Buyer address.
     *  @param  _value          Liquidation value.
     *  @param  _currency       Liquidation currency address.
     *  @param  _feeRate        Fraction of the liquidation value charged as fee.
     *  @param  _uuid           Checksum of request context.
     *  @param  _validation     Validation package from the validator.
     *
     *  @return New request identifier.
     *
     *  @dev    Permission: Executives active in the zone of the estate.
     *  @dev    Through the validation mechanism, the server-side determines `uuid` and `admissionExpiry` based on the specific
     *          supported type of proposal and its context. Operators are also required to be pre-registered on the server-side
     *          to ensure proper assignments.
     *  @dev    `uuid`, `admissionExpiry`, and `validation` are used for proposing in `GovernanceHub`.
     */
    function requestExtraction(
        uint256 _estateId,
        address _buyer,
        uint256 _value,
        address _currency,
        uint256 _feeRate,
        bytes32 _uuid,
        uint40 _admissionExpiry,
        Validation calldata _validation
    ) external payable
    whenNotPaused
    nonReentrant
    onlyExecutive
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
        /// @dev    Collect the liquidation value for deposit and the proposing fee for proposal.
        if (_currency == address(0)) {
            CurrencyHandler.receiveNative(_value + fee);
        } else {
            CurrencyHandler.receiveNative(fee);
            CurrencyHandler.receiveERC20(
                _currency,
                _value
            );
        }

        /// @dev    Submit a proposal of liquidation to the governance hub.
        uint256 proposalId = governanceHubContract.propose{
            value: governanceHubContract.fee()
        }(
            estateToken,
            _estateId,
            _buyer,
            _uuid,
            ProposalRule.ApprovalBeyondQuorum,
            estateTokenContract.getEstate(_estateId).tokenizeAt + EstateLiquidatorConstant.UNANIMOUS_GUARD_DURATION
                > block.timestamp
                /// @dev The approval quorum is 100% in the first year.
                ? EstateLiquidatorConstant.UNANIMOUS_QUORUM_RATE
                /// @dev The approval quorum is 75% thereafter.
                : EstateLiquidatorConstant.MAJORITY_QUORUM_RATE,
            uint40(EstateLiquidatorConstant.VOTE_DURATION),
            _admissionExpiry,
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
     *  @notice Conclude a request according to the result of the proposal.
     *  @notice The class of estate token to be extract will be deprecated.
     *
     *          Name            Description
     *  @param  _requestId      Request identifier.
     *
     *  @return Whether the extraction has succeeded.
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

            /// @dev    Distribute the liquidation value minus extracting fee to holders as the ultimate dividend.
            if (currency == address(0)) {
                IDividendHub(dividendHub).issueDividend{value: value - fee}(
                    estateToken,
                    estateId,
                    value - fee,
                    currency,
                    EstateLiquidatorConstant.DIVIDEND_ISSUANCE_DATA
                );
            } else {
                address dividendHubAddress = dividendHub;
                CurrencyHandler.allowERC20(
                    currency,
                    dividendHubAddress,
                    value - fee
                );
                IDividendHub(dividendHubAddress).issueDividend(
                    estateToken,
                    estateId,
                    value - fee,
                    currency,
                    EstateLiquidatorConstant.DIVIDEND_ISSUANCE_DATA
                );
            }

            estateTokenContract.extractEstate(estateId, _requestId);

            /// @dev    The ultimate commission.
            uint256 commission = _dispatchCommission(
                estateId,
                fee,
                currency
            );

            if (currency == address(0)) {
                CurrencyHandler.sendNative(
                    feeReceiver,
                    fee - commission
                );
            } else {
                CurrencyHandler.sendCurrency(
                    currency,
                    feeReceiver,
                    fee - commission
                );
            }

            emit RequestApproval(
                _requestId,
                fee
            );

            return true;
        }
        if (state == ProposalState.UnsuccessfulExecuted
            || state == ProposalState.Disqualified
            || state == ProposalState.Rejected) {
            request.estateId = 0;

            /// @dev    Refund the liquidation value to the buyer.
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
