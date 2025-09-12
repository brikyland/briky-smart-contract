// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IValidatable} from "../../common/interfaces/IValidatable.sol";

import {IEstateLiquidatorRequest} from "../structs/IEstateLiquidatorRequest.sol";
import {IProposal} from "../../common/structs/IProposal.sol";

import {ICommissionDispatchable} from "./ICommissionDispatchable.sol";

interface IEstateLiquidator is
IEstateLiquidatorRequest,
IProposal,
ICommissionDispatchable,
IValidatable {
    event NewRequest(
        uint256 indexed requestId,
        uint256 indexed estateId,
        uint256 indexed proposalId,
        address buyer,
        uint256 value,
        address currency,
        Rate feeRate
    );
    event RequestApproval(uint256 indexed requestId, uint256 fee);
    event RequestDisapproval(uint256 indexed requestId);

    error AlreadyCancelled();
    error InvalidConclusion();
    error InvalidRequestId();
    error UnavailableEstate();

    function requestExtraction(
        uint256 estateId,
        address buyer,
        uint256 value,
        address currency,
        uint256 feeRate,
        bytes32 uuid,
        Validation calldata validation
    ) external payable returns (uint256 requestId);

    function conclude(
        uint256 requestId
    ) external returns (bool isSuccessful);
}
