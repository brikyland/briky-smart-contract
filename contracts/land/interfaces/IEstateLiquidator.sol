// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IValidatable} from "../../common/interfaces/IValidatable.sol";
import {IProposal} from "../../common/interfaces/IProposal.sol";

interface IEstateLiquidator is
IProposal,
IValidatable {
    struct Request {
        uint256 estateId;
        uint256 proposalId;
        uint256 value;
        address currency;
        address buyer;
    }

    event FeeRateUpdate(uint256 newValue);

    event NewRequest(
        uint256 indexed requestId,
        uint256 indexed estateId,
        uint256 indexed proposalId,
        address buyer,
        uint256 value,
        address currency
    );
    event RequestApproval(uint256 indexed requestId, uint256 fee);
    event RequestDisapproval(uint256 indexed requestId);

    error Cancelled();
    error InvalidRequestId();
    error InvalidRequestConclusion();
    error UnavailableEstate();

    function requestExtraction(
        uint256 estateId,
        uint256 value,
        address currency,
        bytes32 uuid,
        Validation calldata validation
    ) external payable returns (uint256 requestId);

    function conclude(uint256 requestId) external returns (bool isSuccessful);
}
