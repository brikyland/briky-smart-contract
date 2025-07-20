// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IERC1155MetadataURIUpgradeable} from "@openzeppelin/contracts-upgradeable/interfaces/IERC1155MetadataURIUpgradeable.sol";

import {IGovernor} from "../../common/interfaces/IGovernor.sol";
import {IRoyaltyRateProposer} from "../../common/interfaces/IRoyaltyRateProposer.sol";
import {IValidatable} from "../../common/interfaces/IValidatable.sol";

import {ISnapshot} from "../../common/structs/ISnapshot.sol";
import {IValidation} from "../../common/structs/IValidation.sol";

import {IEstateTokenReceiver} from "../../land/interfaces/IEstateTokenReceiver.sol";

import {IProject} from "../structs/IProject.sol";

interface IProjectToken is
IProject,
ISnapshot,
IValidatable,
IEstateTokenReceiver,
IGovernor,
IRoyaltyRateProposer,
IERC1155MetadataURIUpgradeable {
    event BaseURIUpdate(string newValue);

    event LaunchpadAuthorization(address indexed account);
    event LaunchpadDeauthorization(address indexed account);

    event NewToken(
        uint256 indexed tokenId,
        bytes32 indexed zone,
        uint256 indexed launchId,
        address launchpad
    );

    event ProjectDeprecation(uint256 indexed projectId);
    event ProjectTokenization(
        uint256 indexed projectId,
        uint256 indexed estateId,
        uint256 totalSupply,
        address commissionReceiver
    );

    error AlreadyWithdrawn();
    error InvalidCommissionReceiver();
    error InvalidLaunchpad(address account);
    error InvalidProjectId();
    error InvalidTokenizing();
    error InvalidWithdrawing();
    error NothingToTokenize();
    error Tokenized();

    function decimals() external view returns (uint8 decimals);

    function feeReceiver() external view returns (address feeReceiver);

    function projectNumber() external view returns (uint256 projectNumber);

    function isLaunchpad(address account) external view returns (bool isLaunchpad);

    function getProject(uint256 projectId) external view returns (Project memory project);

    function hasWithdrawn(uint256 projectId, address account) external view returns (bool hasWithdrawn);

    function launchProject(
        bytes32 zone,
        uint256 launchId,
        string calldata uri
    ) external returns (uint256 projectId);
    function mint(uint256 _projectId, uint256 _amount) external;

    function deprecateProject(uint256 _projectId) external;
    function updateProjectURI(
        uint256 _projectId,
        string calldata _uri,
        Validation calldata _validation
    ) external;
    function tokenizeProject(uint256 _projectId) external;
}
