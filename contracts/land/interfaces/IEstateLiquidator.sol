// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

/// contracts/common/interfaces/
import {IValidatable} from "../../common/interfaces/IValidatable.sol";
import {IProposal} from "../../common/structs/IProposal.sol";

/// contracts/land/structs/
import {IEstateLiquidatorRequest} from "../structs/IEstateLiquidatorRequest.sol";

/// contracts/land/interfaces/
import {ICommissionDispatchable} from "./ICommissionDispatchable.sol";

/**
 *  @author Briky Team
 *
 *  @notice Interface for contract `EstateLiquidator`.
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
interface IEstateLiquidator is
IEstateLiquidatorRequest,
IProposal,
ICommissionDispatchable,
IValidatable {
    /** ===== EVENT ===== **/
    /* --- Request --- */
    /**
     *  @notice Emitted when a new extraction request is submitted.
     *
     *          Name            Description
     *  @param  requestId       Request identifier.
     *  @param  estateId        Estate identifier.
     *  @param  proposalId      Proposal identifier.
     *  @param  buyer           Buyer address.
     *  @param  value           Offered value.
     *  @param  currency        Currency address.
     *  @param  feeRate         Fraction of offered value charged as fee.
     */
    event NewRequest(
        uint256 indexed requestId,
        uint256 indexed estateId,
        uint256 indexed proposalId,
        address buyer,
        uint256 value,
        address currency,
        Rate feeRate
    );

    /**
     *  @notice Emitted when an extraction request is approved and executed.
     *
     *          Name            Description
     *  @param  requestId       Request identifier.
     *  @param  fee             Extracting fee.
     */
    event RequestApproval(
        uint256 indexed requestId,
        uint256 fee
    );

    /**
     *  @notice Emitted when an extraction request is disapproved.
     *
     *          Name            Description
     *  @param  requestId       Request identifier.
     */
    event RequestDisapproval(
        uint256 indexed requestId
    );


    /** ===== ERROR ===== **/
    error AlreadyCancelled();
    error InvalidConclusion();
    error InvalidRequestId();
    error UnavailableEstate();


    /** ===== FUNCTION ===== **/
    /* --- Dependency --- */
    /**
     *          Name            Description
     *  @return dividendHub     `DividendHub` contract address.
     */
    function dividendHub() external view returns (address dividendHub);

    /**
     *          Name            Description
     *  @return estateToken     `EstateToken` contract address.
     */
    function estateToken() external view returns (address estateToken);

    /**
     *          Name            Description
     *  @return feeReceiver     `FeeReceiver` contract address.
     */
    function feeReceiver() external view returns (address feeReceiver);

    /**
     *          Name            Description
     *  @return governanceHub   `GovernanceHub` contract address.
     */
    function governanceHub() external view returns (address governanceHub);


    /* --- Query --- */
    /**
    *          Name             Description
    *  @return requestNumber    Number of requests.
     */
    function requestNumber() external view returns (uint256 requestNumber);

    /**
     *          Name            Description
     *  @param  _requestId      Request identifier.
     *  @return request         Configuration and progress of the extraction request.
     */
    function getRequest(
        uint256 _requestId
    ) external view returns (EstateLiquidatorRequest memory request);


    /* --- Command --- */
    /**
     *  @notice Request an estate to be extracted.
     *  @notice To prevent deceptive manipulation, the approval quorum to liquidate is initially set at 100% during the first
     *          year of estate and reduced to 75% thereafter.
     *  @notice The message sender must provide sufficient liquidation value and proposing fee for `GovernanceHub`.
     *
     *          Name            Description
     *  @param  estateId        Estate identifier.
     *  @param  buyer           Buyer address.
     *  @param  value           Liquidation value.
     *  @param  currency        Liquidation currency address.
     *  @param  feeRate         Fraction of the liquidation value charged as fee.
     *  @param  uuid            Checksum of request context.
     *  @param  validation      Validation package from the validator.
     *  @return requestId       New request identifier.
     *
     *  @dev    Permission: Executives active in the zone of the estate.
     *  @dev    Through the validation mechanism, the server-side determines `uuid` and `admissionExpiry` based on the specific
     *          supported type of proposal and its context. Operators are also required to be pre-registered on the server-side
     *          to ensure proper assignments.
     *  @dev    `uuid`, `admissionExpiry`, and `validation` are used for proposing in `GovernanceHub`.
     *  @dev    Validation data:
     *          ```
     *          data = abi.encode(
     *              estateToken(),
     *              estateId,
     *              address(this),
     *              uuid,
     *              buyer,
     *              ProposalRule.ApprovalBeyondQuorum,
     *              quorumRate,
     *              EstateLiquidatorConstant.VOTE_DURATION,
     *              admissionExpiry
     *          );
     *          ```
     *          Note: `quorumRate` is 100% in the first year of estate after tokenization and 75% thereafter.
     */
    function requestExtraction(
        uint256 estateId,
        address buyer,
        uint256 value,
        address currency,
        uint256 feeRate,
        bytes32 uuid,
        uint40 admissionExpiry,
        Validation calldata validation
    ) external payable returns (uint256 requestId);

    /**
     *  @notice Conclude a request according to the result of the proposal.
     *  @notice The class of estate token to be extract will be deprecated.
     *
     *          Name            Description
     *  @param  requestId       Request identifier.
     *  @return isSuccessful    Whether the extraction has succeeded.
     */
    function conclude(
        uint256 requestId
    ) external returns (bool isSuccessful);
}
