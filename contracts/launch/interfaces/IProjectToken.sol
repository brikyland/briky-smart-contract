// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

/// @openzeppelin/contracts-upgradeable/
import {IERC1155MetadataURIUpgradeable} from "@openzeppelin/contracts-upgradeable/interfaces/IERC1155MetadataURIUpgradeable.sol";

/// contracts/common/interfaces/
import {IAssetToken} from "../../common/interfaces/IAssetToken.sol";
import {IRoyaltyRateProposer} from "../../common/interfaces/IRoyaltyRateProposer.sol";
import {IValidatable} from "../../common/interfaces/IValidatable.sol";

/// contracts/common/structs/
import {ISnapshot} from "../../common/structs/ISnapshot.sol";
import {IValidation} from "../../common/structs/IValidation.sol";

/// contracts/land/interfaces/
import {IEstateTokenReceiver} from "../../land/interfaces/IEstateTokenReceiver.sol";
import {IEstateTokenizer} from "../../land/interfaces/IEstateTokenizer.sol";

/// contracts/launch/structs/
import {IProject} from "../structs/IProject.sol";

/**
 *  @author Briky Team
 *
 *  @notice TODO: The `IProjectToken` interface defines this contract for managing tokenized projects launched through
 *          authorized launchpad contracts within the Briky ecosystem.
 *
 *  @dev    Implementation involves server-side support for validation mechanisms.
 *  @dev    ERC-1155 tokens are used to represent fractional ownership of projects.
 *          Native coin is represented by the zero address (0x0000000000000000000000000000000000000000).
 */
interface IProjectToken is
IProject,
ISnapshot,
IValidatable,
IEstateTokenizer,
IRoyaltyRateProposer,
IAssetToken {
    /** ===== EVENT ===== **/
    /**
     *  @notice Emitted when the base URI is updated.
     *
     *          Name            Description
     *  @param  newValue        New base URI.
     */
    event BaseURIUpdate(
        string newValue
    );

    /**
     *  @notice Emitted when the royalty rate for a zone is updated.
     *
     *          Name            Description
     *  @param  zone            Zone code.
     *  @param  newValue        New royalty rate value.
     */
    event ZoneRoyaltyRateUpdate(
        bytes32 indexed zone,
        Rate newValue
    );

    /**
     *  @notice Emitted when a contract address is authorized as a launchpad.
     *
     *          Name            Description
     *  @param  account         Authorized launchpad contract address.
     */
    event LaunchpadAuthorization(
        address indexed account
    );

    /**
     *  @notice Emitted when a contract is deauthorized as a launchpad.
     *
     *          Name            Description
     *  @param  account         Deauthorized launchpad contract address.
     */
    event LaunchpadDeauthorization(
        address indexed account
    );

    /**
     *  @notice Emitted when an initiator is registered in a zone.
     *
     *          Name            Description
     *  @param  zone            Zone code.
     *  @param  initiator       Initiator address.
     *  @param  uri             Initiator information URI.
     */
    event InitiatorRegistration(
        bytes32 indexed zone,
        address indexed initiator,
        string uri
    );

    /**
     *  @notice Emitted when a new project token is launched.
     *
     *          Name            Description
     *  @param  tokenId         Project token identifier.
     *  @param  zone            Zone code.
     *  @param  launchId        Launch identifier from the launchpad contract.
     *  @param  launchpad       Launchpad contract address.
     *  @param  initiator       Initiator address.
     */
    event NewToken(
        uint256 indexed tokenId,
        bytes32 indexed zone,
        uint256 indexed launchId,
        address launchpad,
        address initiator
    );

    /**
     *  @notice Emitted when a project is deprecated due to force majeure.
     *
     *          Name            Description
     *  @param  projectId       Project identifier.
     */
    event ProjectDeprecation(
        uint256 indexed projectId
    );

    /**
     *  @notice Emitted when a project is tokenized into an estate token.
     *
     *          Name            Description
     *  @param  projectId       Project identifier.
     *  @param  estateId        Estate token identifier created from tokenization.
     *  @param  totalSupply     Total supply of project tokens tokenized.
     *  @param  custodian       Custodian address for the estate.
     *  @param  broker          Broker address for the estate.
     */
    event ProjectTokenization(
        uint256 indexed projectId,
        uint256 indexed estateId,
        uint256 totalSupply,
        address custodian,
        address broker
    );


    /** ===== ERROR ===== **/
    error InvalidLaunchpad(address account);
    error InvalidProjectId();
    error InvalidTokenizing();
    error InvalidURI();
    error InvalidWithdrawing();
    error NothingToTokenize();


    /** ===== FUNCTION ===== **/
    /* --- Query --- */
    /**
     *  @return decimals        Number of decimal places for project tokens.
     */
    function decimals() external view returns (uint8 decimals);

    /**
     *  @return feeReceiver     Address that receives fees and royalties.
     */
    function feeReceiver() external view returns (address feeReceiver);

    /**
     *  @return projectNumber   Total number of projects launched.
     */
    function projectNumber() external view returns (uint256 projectNumber);

    /**
     *          Name            Description
     *  @param  account         Contract address to check.
     *
     *  @return isLaunchpad     Whether the address is an authorized launchpad.
     */
    function isLaunchpad(
        address account
    ) external view returns (bool isLaunchpad);

    /**
     *          Name            Description
     *  @param  zone            Zone code.
     *
     *  @return royaltyRate     Royalty rate configuration for the zone.
     */
    function getZoneRoyaltyRate(
        bytes32 zone
    ) external view returns (Rate memory royaltyRate);

    /**
     *          Name            Description
     *  @param  zone            Zone code.
     *  @param  account         Initiator address.
     *
     *  @return uri             URI containing initiator information.
     */
    function initiatorURI(
        bytes32 zone,
        address account
    ) external view returns (string memory uri);

    /**
     *          Name            Description
     *  @param  zone            Zone code.
     *  @param  account         Address to check.
     *
     *  @return isInitiator     Whether the address is a registered initiator in the zone.
     */
    function isInitiatorIn(
        bytes32 zone,
        address account
    ) external view returns (bool isInitiator);

    /**
     *          Name            Description
     *  @param  projectId       Project identifier.
     *
     *  @return project         Project information.
     */
    function getProject(
        uint256 projectId
    ) external view returns (Project memory project);

    /**
     *          Name            Description
     *  @param  projectId       Project identifier.
     *
     *  @return zone            Zone code of the project.
     */
    function zoneOf(
        uint256 projectId
    ) external view returns (bytes32 zone);


    /* --- Command --- */
    /**
     *  @notice Register an initiator in a zone.
     *
     *          Name            Description
     *  @param  zone            Zone code.
     *  @param  initiator       Initiator address to register.
     *  @param  uri             URI containing initiator information.
     *  @param  validation      Validation package from the validator.
     */
    function registerInitiator(
        bytes32 zone,
        address initiator,
        string calldata uri,
        Validation calldata validation
    ) external;

    /**
     *  @notice TODO: Launch a new project token from an authorized launchpad.
     *
     *          Name            Description
     *  @param  zone            Zone code.
     *  @param  launchId        Launch identifier from the launchpad contract.
     *  @param  initiator       Initiator address for the project.
     *  @param  uri             URI containing project information.
     *
     *  @return projectId       New project identifier.
     */
    function launchProject(
        bytes32 zone,
        uint256 launchId,
        address initiator,
        string calldata uri
    ) external returns (uint256 projectId);

    /**
     *  @notice TODO: Mint project tokens to the launchpad contract.
     *
     *          Name            Description
     *  @param  _projectId      Project identifier.
     *  @param  _amount         Amount of tokens to mint.
     */
    function mint(
        uint256 _projectId,
        uint256 _amount
    ) external;

    /**
     *  @notice TODO: Deprecate a project due to force majeure.
     *
     *          Name            Description
     *  @param  _projectId      Project identifier.
     */
    function deprecateProject(
        uint256 _projectId
    ) external;

    /**
     *  @notice TODO: Update the URI of a project.
     *
     *          Name            Description
     *  @param  _projectId      Project identifier.
     *  @param  _uri            New URI containing project information.
     *  @param  _validation     Validation package from the validator.
     */
    function updateProjectURI(
        uint256 _projectId,
        string calldata _uri,
        Validation calldata _validation
    ) external;

    /**
     *  @notice TODO: Tokenize a project into an estate token after successful fundraising.
     *
     *          Name            Description
     *  @param  _projectId      Project identifier.
     *  @param  _custodian      Custodian address for the estate.
     *  @param  _broker         Broker address for the estate.
     *
     *  @return estateId        Estate token identifier created from tokenization.
     */
    function tokenizeProject(
        uint256 _projectId,
        address _custodian,
        address _broker
    ) external returns (uint256 estateId);
}
