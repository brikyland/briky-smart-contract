// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import {IERC1155MetadataURIUpgradeable} from "@openzeppelin/contracts-upgradeable/interfaces/IERC1155MetadataURIUpgradeable.sol";

import {IAssetToken} from "../../common/interfaces/IAssetToken.sol";
import {IRoyaltyRateProposer} from "../../common/interfaces/IRoyaltyRateProposer.sol";
import {IValidatable} from "../../common/interfaces/IValidatable.sol";

import {ISnapshot} from "../../common/structs/ISnapshot.sol";
import {IValidation} from "../../common/structs/IValidation.sol";

import {IEstateTokenReceiver} from "../../land/interfaces/IEstateTokenReceiver.sol";
import {IEstateTokenizer} from "../../land/interfaces/IEstateTokenizer.sol";

import {IProject} from "../structs/IProject.sol";

interface IProjectToken is
IProject,
ISnapshot,
IValidatable,
IEstateTokenizer,
IRoyaltyRateProposer,
IAssetToken {
    event BaseURIUpdate(string newValue);

    event ZoneRoyaltyRateUpdate(bytes32 indexed zone, Rate newValue);

    event LaunchpadAuthorization(address indexed account);
    event LaunchpadDeauthorization(address indexed account);

    event InitiatorRegistration(
        bytes32 indexed zone,
        address indexed initiator,
        string uri
    );

    event NewToken(
        uint256 indexed tokenId,
        bytes32 indexed zone,
        uint256 indexed launchId,
        address launchpad,
        address initiator
    );

    event ProjectDeprecation(uint256 indexed projectId);
    event ProjectTokenization(
        uint256 indexed projectId,
        uint256 indexed estateId,
        uint256 totalSupply,
        address custodian,
        address broker
    );

    error InvalidLaunchpad(address account);
    error InvalidProjectId();
    error InvalidTokenizing();
    error InvalidURI();
    error InvalidWithdrawing();
    error NothingToTokenize();

    function decimals() external view returns (uint8 decimals);

    function feeReceiver() external view returns (address feeReceiver);

    function projectNumber() external view returns (uint256 projectNumber);

    function isLaunchpad(address account) external view returns (bool isLaunchpad);

    function getZoneRoyaltyRate(bytes32 zone) external view returns (Rate memory royaltyRate);

    function initiatorURI(bytes32 zone, address account) external view returns (string memory uri);
    function isInitiatorIn(bytes32 zone, address account) external view returns (bool isInitiator);

    function getProject(uint256 projectId) external view returns (Project memory project);
    function zoneOf(uint256 projectId) external view returns (bytes32 zone);

    function registerInitiator(
        bytes32 zone,
        address initiator,
        string calldata uri,
        Validation calldata validation
    ) external;

    function launchProject(
        bytes32 zone,
        uint256 launchId,
        address initiator,
        string calldata uri
    ) external returns (uint256 projectId);
    function mint(uint256 _projectId, uint256 _amount) external;

    function deprecateProject(uint256 _projectId) external;
    function updateProjectURI(
        uint256 _projectId,
        string calldata _uri,
        Validation calldata _validation
    ) external;
    function tokenizeProject(
        uint256 _projectId,
        address _custodian,
        address _broker
    ) external returns (uint256 estateId);
}
