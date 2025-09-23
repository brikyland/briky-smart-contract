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
 *  @notice Interface for contract `ProjectToken`.
 *  @notice The `ProjectToken` contract securitizes real-world estate projects into classes of fungible ERC-1155 tokens, where
 *          each token class represents fractional credits for contributions to a project. Officially disclosed third-party
 *          organizations are registered as initiators in designated zones to actively initiate a project they're developing
 *          through a launchpad, serving as reference for future investment benefit distributions. Finalized estate projects
 *          that satisfy the required conditions may be tokenized into `EstateToken` at the discretion of the initiator.
 *
 *  @dev    Each unit of estate tokens is represented in scaled form as `10 ** decimals()`.
 *  @dev    Implementation involves server-side support.
 */
interface IProjectToken is
IProject,
ISnapshot,
IValidatable,
IEstateTokenizer,
IRoyaltyRateProposer,
IAssetToken {
    /** ===== EVENT ===== **/
    /* --- Configuration --- */
    /**
     *  @notice Emitted when the base URI is updated.
     *
     *          Name        Description
     *  @param  newValue    New base URI.
     */
    event BaseURIUpdate(
        string newValue
    );

    /**
     *  @notice Emitted when the royalty rate for a zone is updated.
     *
     *          Name        Description
     *  @param  zone        Zone code.
     *  @param  newValue    New royalty rate value.
     */
    event ZoneRoyaltyRateUpdate(
        bytes32 indexed zone,
        Rate newValue
    );


    /* --- Launchpad --- */
    /**
     *  @notice Emitted when a contract address is authorized as a launchpad contract.
     *
     *          Name        Description
     *  @param  account     Authorized contract address.
     */
    event LaunchpadAuthorization(
        address indexed account
    );

    /**
     *  @notice Emitted when a contract is deauthorized as a launchpad contract.
     *
     *          Name        Description
     *  @param  account     Deauthorized contract address.
     */
    event LaunchpadDeauthorization(
        address indexed account
    );


    /* --- Initiator --- */
    /**
     *  @notice Emitted when an initiator is registered in a zone.
     *
     *          Name        Description
     *  @param  zone        Zone code.
     *  @param  initiator   Initiator address.
     *  @param  uri         URI of initiator information.
     */
    event InitiatorRegistration(
        bytes32 indexed zone,
        address indexed initiator,
        string uri
    );


    /* --- Project --- */
    /**
     *  @notice Emitted when a new class of project token is minted.
     *
     *          Name        Description
     *  @param  tokenId     Project identifier.
     *  @param  zone        Zone code.
     *  @param  launchId    Launch identifier from the launchpad contract.
     *  @param  launchpad   Launchpad contract address.
     *  @param  initiator   Initiator address.
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
     *  @param  note            Deprecation note.
     */
    event ProjectDeprecation(
        uint256 indexed projectId,
        string note
    );

    /**
     *  @notice Emitted when a project is tokenized into an estate token.
     *
     *          Name            Description
     *  @param  projectId       Project identifier.
     *  @param  estateId        Estate token identifier.
     *  @param  totalSupply     Total supply.
     *  @param  custodian       Associated custodian address.
     *  @param  broker          Associated broker address.
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
    /* --- Dependency --- */
    /**
     *          Name            Description
     *  @return feeReceiver     `FeeReceiver` contract address.
     */
    function feeReceiver() external view returns (address feeReceiver);


    /* --- Query --- */
    /**
     *          Name            Description
     *  @return projectNumber   Number of projects.
     */
    function projectNumber() external view returns (uint256 projectNumber);


    /**
     *          Name        Description
     *  @param  projectId   Project identifier.
     *  @return project     Project information.
     */
    function getProject(
        uint256 projectId
    ) external view returns (Project memory project);


    /**
     *          Name            Description
     *  @param  zone            Zone code.
     *  @return royaltyRate     Royalty rate of the zone.
     */
    function getZoneRoyaltyRate(
        bytes32 zone
    ) external view returns (Rate memory royaltyRate);

    /**
     *          Name            Description
     *  @param  account         EVM address.
     *  @return isLaunchpad     Whether the account is an authorized launchpad.
     */
    function isLaunchpad(
        address account
    ) external view returns (bool isLaunchpad);


    /**
     *          Name            Description
     *  @param  zone            Zone code.
     *  @param  account         Initiator address.
     *  @return uri             URI of initiator information.
     */
    function initiatorURI(
        bytes32 zone,
        address account
    ) external view returns (string memory uri);

    /**
     *          Name            Description
     *  @param  zone            Zone code.
     *  @param  account         Address to check.
     *  @return isInitiator     Whether the account is a registered initiator in the zone.
     */
    function isInitiatorIn(
        bytes32 zone,
        address account
    ) external view returns (bool isInitiator);


    /* --- Command --- */
    /**
     *  @notice Register an initiator in a zone.
     *
     *          Name        Description
     *  @param  zone        Zone code.
     *  @param  initiator   Initiator address.
     *  @param  uri         URI of initiator information.
     *  @param  validation  Validation package from the validator.
     *
     *  @dev    Permission: Managers active in the zone.
     */
    function registerInitiator(
        bytes32 zone,
        address initiator,
        string calldata uri,
        Validation calldata validation
    ) external;


    /**
     *  @notice Launch a project associated with a new class of token.
     *
     *          Name        Description
     *  @param  zone        Zone code.
     *  @param  launchId    Launch identifier from the launchpad contract.
     *  @param  initiator   Initiator address for the project.
     *  @param  uri         URI of project metadata.
     *  @return projectId   New project identifier.
     *
     *  @dev    Permission: Launchpads.
     */
    function launchProject(
        bytes32 zone,
        uint256 launchId,
        address initiator,
        string calldata uri
    ) external returns (uint256 projectId);

    /**
     *  @notice Mint new tokens for a project.
     *
     *          Name        Description
     *  @param  projectId   Project identifier.
     *  @param  amount      Minted amount.
     *
     *  @dev    Permission: Launchpad of the project.
     */
    function mint(
        uint256 projectId,
        uint256 amount
    ) external;


    /* --- Safe Command --- */
    /**
     *  @notice Deprecate a project due to force majeure.
     *
     *          Name        Description
     *  @param  projectId   Project identifier.
     *  @param  data        Deprecation note.
     *  @param  anchor      Keccak256 hash of `uri` of the estate.
     *
     *  @dev    Permission: Managers active in the zone of the project.
     *  @dev    Anchor enforces consistency between this contract and the client-side.
     */
    function safeDeprecateProject(
        uint256 projectId,
        string calldata data,
        bytes32 anchor
    ) external;

    /**
     *  @notice Tokenize an legitimate estate project into a new class of estate token.
     *  @notice Tokenize only if the project has been finalized.
     *
     *          Name        Description
     *  @param  projectId   Project identifier.
     *  @param  custodian   Assigned custodian address.
     *  @param  broker      Associated broker address.
     *  @param  anchor      Keccak256 hash of `uri` of the project.
     *  @return estateId    Estate identifier tokenized from the project.
     *
     *  @dev    Permission: Managers active in the zone of the project.
     *  @dev    Anchor enforces consistency between this contract and the client-side.
     */
    function safeTokenizeProject(
        uint256 projectId,
        address custodian,
        address broker,
        bytes32 anchor
    ) external returns (uint256 estateId);

    /**
     *  @notice Update the URI of metadata of a project.
     *
     *          Name        Description
     *  @param  projectId   Project identifier.
     *  @param  uri         New URI of project metadata.
     *  @param  validation  Validation package from the validator.
     *  @param  anchor      Keccak256 hash of `uri` of the project.
     *
     *  @dev    Permission: Managers active in the zone of the project.
     *  @dev    Anchor enforces consistency between this contract and the client-side.
     *  @dev    Validation data:
     *          ```
     *          data = abi.encode(
     *              projectId,
     *              uri
     *          );
     *          ```
     */
    function safeUpdateProjectURI(
        uint256 projectId,
        string calldata uri,
        Validation calldata validation,
        bytes32 anchor
    ) external;
}
