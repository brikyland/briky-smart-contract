// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import {IValidatable} from "../../common/interfaces/IValidatable.sol";

import {IEstateLiquidatorRequest} from "../structs/IEstateLiquidatorRequest.sol";
import {IProposal} from "../../common/structs/IProposal.sol";

import {ICommissionDispatchable} from "./ICommissionDispatchable.sol";

/**
 *  @author Briky Team
 *
 *  @notice Interface for contract `EstateLiquidator`.
 * 
 *  @notice TODO: The `EstateLiquidator` contract facilitates the extraction of estates from `EstateToken`.
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
    /**
     *  @notice Emitted when a new extraction request is submitted.
     *
     *          Name            Description
     *  @param  requestId       Request identifier.
     *  @param  estateId        Estate identifier.
     *  @param  proposalId      Proposal identifier.
     *  @param  buyer           Buyer address.
     *  @param  value           Sale value.
     *  @param  currency        Sale currency address.
     *  @param  feeRate         Extraction fee.
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
     *  @param  fee             Extraction fee.
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
    /* --- Command --- */
    /**
     *  @notice TODO: Create estate extraction request by submitting a proposal to `GovernanceHub`.
     *
     *          Name            Description
     *  @param  estateId        Estate identifier.
     *  @param  buyer           Buyer address.
     *  @param  value           Sale value.
     *  @param  currency        Sale currency address.
     *  @param  feeRate         Fraction of the sold value charged as fee.
     *  @param  uuid            Checksum of request context.
     *  @param  validation      Validation package from the validator.
     *  @return requestId       New request identifier.
     *
     *  @dev    Validation data:
     *          ```
     *          data = abi.encode(
     *              TODO:
     *          );
     *          ```
     */
    function requestExtraction(
        uint256 estateId,
        address buyer,
        uint256 value,
        address currency,
        uint256 feeRate,
        bytes32 uuid,
        Validation calldata validation
    ) external payable returns (uint256 requestId);

    /**
     *  @notice TODO: Conclude an extraction request
     *
     *          Name            Description
     *  @param  requestId       Request identifier.
     *  @return isSuccessful    Whether the extraction was successful.
     */
    function conclude(
        uint256 requestId
    ) external returns (bool isSuccessful);
}
