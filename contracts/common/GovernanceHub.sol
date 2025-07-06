// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ReentrancyGuardUpgradeable} from "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";

import {IAdmin} from "./interfaces/IAdmin.sol";
import {IGovernor} from "./interfaces/IGovernor.sol";

import {GovernanceHubStorage} from "./storages/GovernanceHubStorage.sol";

import {Pausable} from "./utilities/Pausable.sol";

abstract contract GovernanceHub is
GovernanceHubStorage,
Pausable,
ReentrancyGuardUpgradeable {
    string constant private VERSION = "v1.1.1";

    modifier validProposal(uint256 _proposalId) {
        if (_proposalId == 0 || _proposalId > proposalNumber) {
            revert InvalidProposalId();
        }
        _;
    }

    receive() external payable {}

    function initialize(
        address _admin,
        uint256 _fee
    ) external initializer {
        __Pausable_init();
        __ReentrancyGuard_init();

        admin = _admin;
        fee = _fee;
    }

    function version() external pure returns (string memory) {
        return VERSION;
    }

    function updateFee(
        uint256 _fee,
        bytes[] calldata _signature
    ) external {
        IAdmin(admin).verifyAdminSignatures(
            abi.encode(
                address(this),
                "updateFee",
                _fee
            ),
            _signature
        );
        fee = _fee;
        emit FeeUpdate(_fee);
    }

    function updateValidator(
        address _validator,
        bytes[] calldata _signature
    ) external {
        IAdmin(admin).verifyAdminSignatures(
            abi.encode(
                address(this),
                "updateValidator",
                _validator
            ),
            _signature
        );
        validator = _validator;
        emit ValidatorUpdate(_validator);
    }

    function getProposal(uint256 _proposalId)
    external view validProposal(_proposalId) returns (Proposal memory) {
        return proposals[_proposalId];
    }
}
