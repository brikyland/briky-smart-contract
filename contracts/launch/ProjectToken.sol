// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

/// @openzeppelin/contracts-upgradeable/
import {IERC165Upgradeable} from "@openzeppelin/contracts-upgradeable/interfaces/IERC165Upgradeable.sol";
import {IERC1155Upgradeable} from "@openzeppelin/contracts-upgradeable/interfaces/IERC1155Upgradeable.sol";
import {IERC1155MetadataURIUpgradeable} from "@openzeppelin/contracts-upgradeable/interfaces/IERC1155MetadataURIUpgradeable.sol";
import {IERC1155ReceiverUpgradeable} from "@openzeppelin/contracts-upgradeable/interfaces/IERC1155ReceiverUpgradeable.sol";
import {IERC2981Upgradeable} from "@openzeppelin/contracts-upgradeable/interfaces/IERC2981Upgradeable.sol";
import {ReentrancyGuardUpgradeable} from "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
import {ERC1155Upgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC1155/ERC1155Upgradeable.sol";
import {ERC1155PausableUpgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC1155/extensions/ERC1155PausableUpgradeable.sol";
import {ERC1155SupplyUpgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC1155/extensions/ERC1155SupplyUpgradeable.sol";
import {ERC1155URIStorageUpgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC1155/extensions/ERC1155URIStorageUpgradeable.sol";
import {ERC165CheckerUpgradeable} from "@openzeppelin/contracts-upgradeable/utils/introspection/ERC165CheckerUpgradeable.sol";

import {CommonConstant} from "../common/constants/CommonConstant.sol";

/// contracts/common/interfaces/
import {IAdmin} from "../common/interfaces/IAdmin.sol";
import {IAssetToken} from "../common/interfaces/IAssetToken.sol";
import {IEstateTokenizer} from "../land/interfaces/IEstateTokenizer.sol";
import {IGovernor} from "../common/interfaces/IGovernor.sol";

/// contracts/common/utilities/
import {Administrable} from "../common/utilities/Administrable.sol";
import {Pausable} from "../common/utilities/Pausable.sol";
import {RoyaltyRateProposer} from "../common/utilities/RoyaltyRateProposer.sol";
import {SnapshotHandler} from "../common/utilities/SnapshotHandler.sol";
import {Validatable} from "../common/utilities/Validatable.sol";

/// contracts/land/interfaces/
import {IEstateToken} from "../land/interfaces/IEstateToken.sol";

/// contracts/land/utilities/
import {EstateTokenReceiver} from "../land/utilities/EstateTokenReceiver.sol";

/// contracts/launch/constants/
import {ProjectTokenConstant} from "./constants/ProjectTokenConstant.sol";

/// contracts/launch/interfaces/
import {IProjectLaunchpad} from "./interfaces/IProjectLaunchpad.sol";
import {IProjectToken} from "./interfaces/IProjectToken.sol";

/// contracts/launch/storages/
import {ProjectTokenStorage} from "./storages/ProjectTokenStorage.sol";

/// contracts/launch/utilities/
import {ProjectTokenReceiver} from "./utilities/ProjectTokenReceiver.sol";

/**
 *  @author Briky Team
 *
 *  @notice The `ProjectToken` contract securitizes real-world estate projects into classes of fungible ERC-1155 tokens, where
 *          each token class represents fractional credits for contributions to a project. Officially disclosed third-party
 *          organizations are registered as initiators in designated zones to actively initiate a project they're developing
 *          through a launchpad, serving as reference for future investment benefit distributions. Finalized estate projects
 *          that satisfy the required conditions may be tokenized into `EstateToken` at the discretion of the initiator.
 *
 *  @dev    Each unit of estate tokens is represented in scaled form as `10 ** decimals()`.
 *  @dev    Implementation involves server-side support.
 */
contract ProjectToken is
ProjectTokenStorage,
ERC1155PausableUpgradeable,
ERC1155SupplyUpgradeable,
ERC1155URIStorageUpgradeable,
EstateTokenReceiver,
ProjectTokenReceiver,
Administrable,
Pausable,
RoyaltyRateProposer,
Validatable,
ReentrancyGuardUpgradeable {
    /** ===== LIBRARY ===== **/
    using ERC165CheckerUpgradeable for address;
    using SnapshotHandler for Uint256Snapshot[];


    /** ===== CONSTANT ===== **/
    string constant private VERSION = "v1.2.1";


    /** ===== MODIFIER ===== **/
    /**
     *  @notice Verify a valid project identifier.
     *
     *          Name        Description
     *  @param  _projectId  Project identifier.
     */
    modifier validProject(
        uint256 _projectId
    ) {
        if (projects[_projectId].deprecateAt != CommonConstant.INFINITE_TIMESTAMP) {
            revert InvalidProjectId();
        }
        _;
    }

    /**
     *  @notice Verify the message sender is the launchpad of a project.
     *
     *          Name        Description
     *  @param  _projectId  Project identifier.
     */
    modifier onlyLaunchpad(
        uint256 _projectId
    ) {
        if (msg.sender != projects[_projectId].launchpad) {
            revert Unauthorized();
        }
        _;
    }

    /**
     *  @notice Verify the message sender is active in the zone of a project.
     *
     *          Name        Description
     *  @param  _projectId  Project identifier.
     */
    modifier onlyActiveInZoneOf(
        uint256 _projectId
    ) {
        if (!IAdmin(admin).isActiveIn(projects[_projectId].zone, msg.sender)) {
            revert Unauthorized();
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
     *          Name            Description
     *  @param  _admin          `Admin` contract address.
     *  @param  _estateToken    `EstateToken` contract address.
     *  @param  _feeReceiver    `FeeReceiver` contract address.
     *  @param  _validator      Validator address.
     *  @param  _uri            Base URI for project metadata.
     */
    function initialize(
        address _admin,
        address _estateToken,
        address _feeReceiver,
        address _validator,
        string calldata _uri
    ) external
    initializer {
        /// Initializer
        __ERC1155_init("");
        __ERC1155Pausable_init();
        __ERC1155URIStorage_init();
        __Validatable_init(_validator);
        __ReentrancyGuard_init();

        /// Dependency
        admin = _admin;
        estateToken = _estateToken;
        feeReceiver = _feeReceiver;

        /// Configuration
        _setBaseURI(_uri);
        emit BaseURIUpdate(_uri);
    }


    /* --- Administration --- */
    /**
     *  @notice Update the base URI.
     *
     *          Name            Description
     *  @param  _uri            New base URI.
     *  @param  _signatures     Array of admin signatures.
     * 
     *  @dev    Administrative operator.
     */
    function updateBaseURI(
        string calldata _uri,
        bytes[] calldata _signatures
    ) external {
        IAdmin(admin).verifyAdminSignatures(
            abi.encode(
                address(this),
                "updateBaseURI",
                _uri
            ),
            _signatures
        );
        _setBaseURI(_uri);
        emit BaseURIUpdate(_uri);
    }

    /**
     *  @notice Update the royalty rate of a zone.
     *
     *          Name            Description
     *  @param  _zone           Zone code.
     *  @param  _royaltyRate    New default royalty rate.
     *  @param  _signatures     Array of admin signatures.
     *
     *  @dev    Administrative operator.
     */
    function updateZoneRoyaltyRate(
        bytes32 _zone,
        uint256 _royaltyRate,
        bytes[] calldata _signatures
    ) external {
        IAdmin(this.admin()).verifyAdminSignatures(
            abi.encode(
                address(this),
                "updateZoneRoyaltyRate",
                _zone,
                _royaltyRate
            ),
            _signatures
        );
        if (!IAdmin(admin).isZone(_zone)) {
            revert InvalidZone();
        }

        if (_royaltyRate > CommonConstant.RATE_MAX_SUBUNIT) {
            revert InvalidRate();
        }
        zoneRoyaltyRates[_zone] = _royaltyRate;
        emit ZoneRoyaltyRateUpdate(
            _zone,
            Rate(_royaltyRate, CommonConstant.RATE_DECIMALS)
        );
    }

    /**
     *  @notice Authorize or deauthorize contract addresses as launchpads.
     *
     *          Name            Description
     *  @param  _accounts       Array of contract addresses.
     *  @param  _isLaunchpad    Whether the operation is authorizing or deauthorizing.
     *  @param  _signatures     Array of admin signatures.
     * 
     *  @dev    Administrative operator.
     */
    function authorizeLaunchpads(
        address[] calldata _accounts,
        bool _isLaunchpad,
        bytes[] calldata _signatures
    ) external {
        IAdmin(admin).verifyAdminSignatures(
            abi.encode(
                address(this),
                "authorizeLaunchpads",
                _accounts,
                _isLaunchpad
            ),
            _signatures
        );

        if (_isLaunchpad) {
            for (uint256 i; i < _accounts.length; ++i) {
                if (isLaunchpad[_accounts[i]]) {
                    revert AuthorizedAccount();
                }
                if (!_accounts[i].supportsInterface(type(IProjectLaunchpad).interfaceId)) {
                    revert InvalidLaunchpad(_accounts[i]);
                }
                isLaunchpad[_accounts[i]] = true;
                emit LaunchpadAuthorization(_accounts[i]);
            }
        } else {
            for (uint256 i; i < _accounts.length; ++i) {
                if (!isLaunchpad[_accounts[i]]) {
                    revert NotAuthorizedAccount();
                }
                isLaunchpad[_accounts[i]] = false;
                emit LaunchpadDeauthorization(_accounts[i]);
            }
        }
    }


    /* --- Query --- */
    /**
     *  @return decimals        Token decimals.
     */
    function decimals() external pure returns (uint8) {
        return ProjectTokenConstant.TOKEN_DECIMALS;
    }


    /**
     *  @return projectToken    Address of this contract.
     */
    function projectToken() external view returns (address) {
        return address(this);
    }


    /**
     *          Name            Description
     *  @param  zone            Zone code.
     *
     *  @return royaltyRate     Royalty rate of the zone.
     */
    function getZoneRoyaltyRate(
        bytes32 zone
    ) external view returns (Rate memory) {
        return Rate(zoneRoyaltyRates[zone], CommonConstant.RATE_DECIMALS);
    }

    /**
     *          Name            Description
     *  @param  zone            Zone code.
     *  @param  account         EVM address.
     *
     *  @return isInitiator     Whether the account is a registered initiator in the zone.
     */
    function isInitiatorIn(
        bytes32 zone,
        address account
    ) public view returns (bool) {
        return bytes(initiatorURI[zone][account]).length != 0;
    }

    /**
     *          Name            Description
     *  @param  _projectId      Project identifier.
     *
     *  @return project         Project information.
     */
    function getProject(
        uint256 _projectId
    ) external view returns (Project memory) {
        if (_projectId == 0 || _projectId > projectNumber) {
            revert InvalidProjectId();
        }
        return projects[_projectId];
    }

    /**
     *          Name            Description
     *  @param  _projectId      Project identifier.
     *
     *  @return representative  Representative address of the project.
     */
    function getRepresentative(
        uint256 _projectId
    ) external view returns (address) {
        if (_projectId == 0 || _projectId > projectNumber) {
            revert InvalidProjectId();
        }
        return projects[_projectId].initiator;
    }

    /**
     *          Name            Description
     *  @param  _projectId      Project identifier.
     *
     *  @return isAvailable     Whether the project is available.
     */
    function isAvailable(
        uint256 _projectId
    ) public view returns (bool) {
        return projects[_projectId].deprecateAt == CommonConstant.INFINITE_TIMESTAMP
            && projects[_projectId].estateId == 0;
    }

    /**
     *          Name            Description
     *  @param  _projectId      Project identifier.
     *
     *  @return zone            Zone code of the project.
     */
    function zoneOf(
        uint256 _projectId
    ) public view returns (bytes32) {
        if (_projectId == 0 || _projectId > projectNumber) {
            revert InvalidProjectId();
        }
        return projects[_projectId].zone;
    }

    /**
     *          Name            Description
     *  @param  _account        Account address.
     *  @param  _projectId      Project identifier.
     *
     *  @return balance         Token balance of the account.
     */
    function balanceOf(
        address _account,
        uint256 _projectId
    ) public view override(
        IERC1155Upgradeable,
        ERC1155Upgradeable
    ) returns (uint256) {
        return projects[_projectId].deprecateAt != CommonConstant.INFINITE_TIMESTAMP
            ? 0
            : super.balanceOf(_account, _projectId);
    }

    /**
     *          Name            Description
     *  @param  _account        Account address.
     *  @param  _projectId      Project identifier.
     *  @param  _at             Reference timestamp.
     *
     *  @return balance         Balance of the account in the project at the reference timestamp.
     */
    function balanceOfAt(
        address _account,
        uint256 _projectId,
        uint256 _at
    ) public view returns (uint256) {
        if (_projectId == 0 || _projectId > projectNumber) {
            revert InvalidProjectId();
        }
        if (_at > block.timestamp || _at > projects[_projectId].deprecateAt) {
            revert InvalidTimestamp();
        }

        return balanceSnapshots[_projectId][_account].getValueAt(_at);
    }

    /**
     *          Name                Description
     *  @param  _account            Account address.
     *  @param  _tokenizationId     Tokenization identifier.
     *  @param  _at                 Reference timestamp.
     *
     *  @return Allocation of the account at the reference timestamp.
     */
    function allocationOfAt(
        address _account,
        uint256 _tokenizationId,
        uint256 _at
    ) external view
    validProject(_tokenizationId)
    returns (uint256) {
        if (_at > block.timestamp) {
            revert InvalidTimestamp();
        }
        Project storage project = projects[_tokenizationId];
        if (project.estateId == 0) {
            revert NotTokenized();
        }
        return _at >= project.tokenizeAt
            ? IProjectLaunchpad(project.launchpad).allocationOfAt(_account, project.launchId, _at)
              + balanceOfAt(_account, _tokenizationId, _at)
            : 0;
    }

    /**
     *          Name            Description
     *  @param  _account        Account address.
     *  @param  _projectId      Project identifier.
     *  @param  _at             Reference timestamp.
     *
     *  @return Equity of the account in the project at the reference timestamp.
     */
    function equityOfAt(
        address _account,
        uint256 _projectId,
        uint256 _at
    ) external view returns (uint256) {
        if (_projectId == 0 || _projectId > projectNumber) {
            revert InvalidProjectId();
        }
        Project storage project = projects[_projectId];
        if (_at > block.timestamp || _at > project.deprecateAt) {
            revert InvalidTimestamp();
        }
        if (_account == project.launchpad) {
            return 0;
        }

        return balanceSnapshots[_projectId][_account].getValueAt(_at)
            + IProjectLaunchpad(project.launchpad).allocationOfAt(
                _account,
                project.launchId,
                _at
            );
    }

    /**
     *          Name            Description
     *  @param  _projectId      Project identifier.
     *
     *  @return URI of project metadata.
     */
    function uri(
        uint256 _projectId
    ) public view override(
        IERC1155MetadataURIUpgradeable,
        ERC1155Upgradeable,
        ERC1155URIStorageUpgradeable
    ) returns (string memory) {
        return super.uri(_projectId);
    }

    /**
     *          Name            Description
     *  @param  _projectId      Project identifier.
     *
     *  @return Total supply of the token class.
     */
    function totalSupply(
        uint256 _projectId
    ) public view override(
        ERC1155SupplyUpgradeable,
        IAssetToken
    ) returns (uint256) {
        return super.totalSupply(_projectId);
    }

    /**
     *          Name            Description
     *  @param  _projectId      Project identifier.
     *  @param  _at             Reference timestamp.
     *
     *  @return Total equity in the project at the reference timestamp.
     */
    function totalEquityAt(
        uint256 _projectId,
        uint256 _at
    ) external view returns (uint256) {
        if (_projectId == 0 || _projectId > projectNumber) {
            revert InvalidProjectId();
        }

        if (_at > block.timestamp
            || _at < projects[_projectId].tokenizeAt
            || _at > projects[_projectId].deprecateAt) {
            revert InvalidTimestamp();
        }

        return totalSupplySnapshots[_projectId].getValueAt(_at);
    }

    /**
     *          Name            Description
     *  @param  _tokenId        Token identifier.
     *
     *  @return Royalty rate of the token identifier.
     */
    function getRoyaltyRate(
        uint256 _tokenId
    ) validProject(_tokenId) external view returns (Rate memory) {
        return Rate(
            zoneRoyaltyRates[projects[_tokenId].zone],
            CommonConstant.RATE_DECIMALS
        );
    }

    /**
     *          Name            Description
     *  @param  _projectId      Project identifier.
     *
     *  @return Whether the project tokens is converted to estate tokens.
     */
    function isTokenized(
        uint256 _projectId
    ) public view returns (bool) {
        return projects[_projectId].estateId != 0;
    }


    /**
     *          Name            Description
     *  @param  _interfaceId    Interface identifier.
     *
     *  @return Whether this contract supports the interface.
     */
    function supportsInterface(
        bytes4 _interfaceId
    ) public view virtual override(
        IERC165Upgradeable,
        ERC1155Upgradeable
    ) returns (bool) {
        return _interfaceId == type(IAssetToken).interfaceId
            || _interfaceId == type(IGovernor).interfaceId
            || _interfaceId == type(IEstateTokenizer).interfaceId
            || _interfaceId == type(IERC2981Upgradeable).interfaceId
            || _interfaceId == type(IERC1155MetadataURIUpgradeable).interfaceId
            || super.supportsInterface(_interfaceId);
    }

    /**
     *          Name        Description
     *  @param  _operator   Operator address.
     *  @param  _from       Sender address.
     *  @param  _id         Token identifier.
     *  @param  _value      Token amount.
     *  @param  _data       Additional data.
     *
     *  @return Selector of the `onERC1155Received` function if the message sender is either the estate token contract or the
     *          project token contract.
     */
    function onERC1155Received(
        address _operator,
        address _from,
        uint256 _id,
        uint256 _value,
        bytes calldata _data
    ) public virtual override(
        IERC1155ReceiverUpgradeable,
        EstateTokenReceiver,
        ProjectTokenReceiver
    ) returns (bytes4) {
        return EstateTokenReceiver.onERC1155Received(
            _operator,
            _from,
            _id,
            _value,
            _data
        ) == this.onERC1155Received.selector
        || ProjectTokenReceiver.onERC1155Received(
            _operator,
            _from,
            _id,
            _value,
            _data
        ) == this.onERC1155Received.selector
            ? this.onERC1155Received.selector
            : bytes4(0);
    }

    /**
     *          Name        Description
     *  @param  _operator   Operator address.
     *  @param  _from       Sender address.
     *  @param  _ids        List of token identifiers.
     *  @param  _values     List of token amounts, respective to each token identifier.
     *  @param  _data       Additional data.
     *
     *  @return Selector of the `onERC1155Received` function if the message sender is either the estate token contract or the
     *          project token contract.
     */
    function onERC1155BatchReceived(
        address _operator,
        address _from,
        uint256[] calldata _ids,
        uint256[] calldata _values,
        bytes calldata _data
    ) public virtual override(
        IERC1155ReceiverUpgradeable,
        EstateTokenReceiver,
        ProjectTokenReceiver
    ) returns (bytes4) {
        return EstateTokenReceiver.onERC1155BatchReceived(
            _operator,
            _from,
            _ids,
            _values,
            _data
        ) == this.onERC1155BatchReceived.selector
        || ProjectTokenReceiver.onERC1155BatchReceived(
            _operator,
            _from,
            _ids,
            _values,
            _data
        ) == this.onERC1155BatchReceived.selector
            ? this.onERC1155BatchReceived.selector
            : bytes4(0);
    }


    /* --- Command --- */
    /**
     *  @notice Register an initiator in a zone.
     *
     *          Name            Description
     *  @param  _zone           Zone code.
     *  @param  _initiator      Initiator address.
     *  @param  _uri            URI of initiator information.
     *  @param  _validation     Validation package from the validator.
     *
     *  @dev    Permission: Managers active in the zone.
     */
    function registerInitiator(
        bytes32 _zone,
        address _initiator,
        string calldata _uri,
        Validation calldata _validation
    ) external
    onlyManager {
        if (!IAdmin(admin).isActiveIn(_zone, msg.sender)) {
            revert Unauthorized();
        }

        _validate(
            abi.encode(
                    _initiator,
                _uri
            ),
            _validation
        );

        if (bytes(_uri).length == 0) {
            revert InvalidURI();
        }

        initiatorURI[_zone][_initiator] = _uri;
        emit InitiatorRegistration(
            _zone,
            _initiator,
            _uri
        );
    }

    /**
     *  @notice Launch a project associated with a new class of token.
     *
     *          Name            Description
     *  @param  _zone           Zone code.
     *  @param  _launchId       Launch identifier from the launchpad contract.
     *  @param  _initiator      Initiator address.
     *  @param  _uri            URI of project metadata.
     *
     *  @return New project identifier.
     *
     *  @dev    Permission: Launchpads.
     */
    function launchProject(
        bytes32 _zone,
        uint256 _launchId,
        address _initiator,
        string calldata _uri
    ) external
    whenNotPaused
    returns (uint256) {
        if (!isLaunchpad[msg.sender]) {
            revert Unauthorized();
        }

        if (!IAdmin(admin).isZone(_zone)) {
            revert InvalidInput();
        }

        uint256 projectId = ++projectNumber;
        projects[projectId] = Project(
            0,
            _zone,
            _launchId,
            msg.sender,
            uint40(block.timestamp),
            CommonConstant.INFINITE_TIMESTAMP,
            _initiator
        );
        _setURI(projectId, _uri);

        emit NewToken(
            projectId,
            _zone,
            _launchId,
            msg.sender,
            _initiator
        );

        return projectId;
    }

    /**
     *  @notice Mint new tokens for a project to the launchpad contract.
     *
     *          Name            Description
     *  @param  _projectId      Project identifier.
     *  @param  _amount         Minted amount.
     *
     *  @dev    Permission: Launchpad of the project.
     */
    function mint(
        uint256 _projectId,
        uint256 _amount
    ) external
    whenNotPaused
    validProject(_projectId)
    onlyLaunchpad(_projectId) {
        _mint(
            msg.sender,
            _projectId,
            _amount,
            ""
        );
    }

    /**
     *  @notice Withdraw the allocation of the message sender from a tokenization.
     *  @notice Withdraw only if the project has been tokenized.
     * 
     *          Name            Description
     *  @param  _projectId      Project identifier.
     *
     *  @return amount          Amount of estate tokens withdrawn.
     */
    function withdrawEstateToken(
        uint256 _projectId
    ) external
    whenNotPaused
    nonReentrant
    validProject(_projectId)
    returns (uint256) {
        Project storage project = projects[_projectId];
        uint256 estateId = project.estateId;
        if (estateId == 0) {
            revert InvalidWithdrawing();
        }

        uint256 amount = balanceOf(msg.sender, _projectId);

        IEstateToken(estateToken).safeTransferFrom(
            address(this),
            msg.sender,
            estateId,
            amount,
            ""
        );
        safeTransferFrom(
            msg.sender,
            address(this),
            _projectId,
            amount,
            ""
        );

        emit EstateTokenWithdrawal(
            _projectId,
            msg.sender,
            amount
        );

        return amount;
    }


    /**
     *  @notice Deprecate a project due to force majeure.
     *
     *          Name            Description
     *  @param  _projectId      Project identifier.
     *  @param  _data           Deprecation note.
     *  @param  _anchor         Keccak256 hash of `uri` of the estate.
     *
     *  @dev    Permission: Managers active in the zone of the project.
     *  @dev    Anchor enforces consistency between this contract and the client-side.
     */
    function safeDeprecateProject(
        uint256 _projectId,
        string calldata _data,
        bytes32 _anchor
    ) external
    whenNotPaused
    validProject(_projectId)
    onlyManager
    onlyActiveInZoneOf(_projectId) {
        if (_anchor != keccak256(bytes(uri(_projectId)))) {
            revert BadAnchor();
        }

        projects[_projectId].deprecateAt = uint40(block.timestamp);
        emit ProjectDeprecation(
            _projectId,
            _data
        );
    }

    /**
     *  @notice Update the URI of metadata of a project.
     *
     *          Name            Description
     *  @param  _projectId      Project identifier.
     *  @param  _uri            New URI of project metadata.
     *  @param  _validation     Validation package from the validator.
     *  @param  _anchor         Keccak256 hash of `uri` of the project.
     *
     *  @dev    Permission: Managers active in the zone of the project.
     *  @dev    Anchor enforces consistency between this contract and the client-side.
     */
    function safeUpdateProjectURI(
        uint256 _projectId,
        string calldata _uri,
        Validation calldata _validation,
        bytes32 _anchor
    ) external
    whenNotPaused
    validProject(_projectId)
    onlyManager
    onlyActiveInZoneOf(_projectId) {
        if (_anchor != keccak256(bytes(uri(_projectId)))) {
            revert BadAnchor();
        }

        _validate(
            abi.encode(
                _projectId,
                _uri
            ),
            _validation
        );

        _setURI(_projectId, _uri);
    }

    /**
     *  @notice Tokenize an legitimate estate project into a new class of estate token.
     *  @notice Tokenize only if the project has been finalized.
     *
     *          Name            Description
     *  @param  _projectId      Project identifier.
     *  @param  _custodian      Assigned custodian address.
     *  @param  _broker         Associated broker address.
     *  @param  _anchor         Keccak256 hash of `uri` of the project.
     *
     *  @return Estate identifier tokenized from the project.
     *
     *  @dev    Permission: Managers active in the zone of the project.
     *  @dev    Anchor enforces consistency between this contract and the client-side.
     */
    function safeTokenizeProject(
        uint256 _projectId,
        address _custodian,
        address _broker,
        bytes32 _anchor
    ) external
    whenNotPaused
    nonReentrant
    validProject(_projectId)
    onlyManager
    onlyActiveInZoneOf(_projectId)
    returns (uint256) {
        if (_anchor != keccak256(bytes(uri(_projectId)))) {
            revert BadAnchor();
        }

        Project storage project = projects[_projectId];
        bytes32 zone = project.zone;

        if (project.estateId != 0) {
            revert AlreadyTokenized();
        }

        uint256 supply = totalSupply(_projectId);
        if (supply == 0) {
            revert NothingToTokenize();
        }

        address launchpad = project.launchpad;
        if (!IProjectLaunchpad(launchpad).isFinalized(project.launchId)) {
            revert InvalidTokenizing();
        }

        uint256 estateId = IEstateToken(estateToken).tokenizeEstate(
            supply,
            zone,
            _projectId,
            uri(_projectId),
            CommonConstant.INFINITE_TIMESTAMP,
            _custodian,
            _broker
        );
        project.estateId = estateId;
        project.tokenizeAt = uint40(block.timestamp);

        emit ProjectTokenization(
            _projectId,
            estateId,
            supply,
            _custodian,
            _broker
        );

        return estateId;
    }


    /* --- Helper --- */
    /**
     *  @notice Hook to be called before any token transfer.
     *
     *          Name            Description
     *  @param  _operator       Operator address.
     *  @param  _from           Sender address.
     *  @param  _to             Receiver address.
     *  @param  _projectIds     Array of project identifiers.
     *  @param  _amounts        Array of transferred amounts, respective to each estate identifier.
     *  @param  _data           Additional data.
     */
    function _beforeTokenTransfer(
        address _operator,
        address _from,
        address _to,
        uint256[] memory _projectIds,
        uint256[] memory _amounts,
        bytes memory _data
    ) internal override(
        ERC1155Upgradeable,
        ERC1155PausableUpgradeable,
        ERC1155SupplyUpgradeable
    ) {
        super._beforeTokenTransfer(_operator, _from, _to, _projectIds, _amounts, _data);
    }

    /**
     *  @notice Hook to be called after any token transfer.
     *
     *          Name            Description
     *  @param  _operator       Operator address.
     *  @param  _from           Sender address.
     *  @param  _to             Receiver address.
     *  @param  _projectIds     Array of project identifiers.
     *  @param  _amounts        Array of transferred amounts, respective to each estate identifier.
     *  @param  _data           Additional data.
     */
    function _afterTokenTransfer(
        address _operator,
        address _from,
        address _to,
        uint256[] memory _projectIds,
        uint256[] memory _amounts,
        bytes memory _data
    ) internal override {
        super._afterTokenTransfer(_operator, _from, _to, _projectIds, _amounts, _data);
        uint256 timestamp = block.timestamp;
        for (uint256 i; i < _projectIds.length; ++i) {
            uint256 projectId = _projectIds[i];
            /// @dev    Update snapshots.
            if (_from != address(0)) {
                balanceSnapshots[projectId][_from].push(Uint256Snapshot(balanceOf(_from, projectId), timestamp));
            } else {
                totalSupplySnapshots[projectId].push(Uint256Snapshot(totalSupply(projectId), timestamp));
            }
            if (_to != address(0)) {
                balanceSnapshots[projectId][_to].push(Uint256Snapshot(balanceOf(_to, projectId), timestamp));
            } else {
                totalSupplySnapshots[projectId].push(Uint256Snapshot(totalSupply(projectId), timestamp));
            }
        }
    }

    /**
     *  @return Default royalty receiver address.
     */
    function _royaltyReceiver() internal view override returns (address) {
        return feeReceiver;
    }
}
