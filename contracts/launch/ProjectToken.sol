// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ReentrancyGuardUpgradeable} from "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";

import {IERC165Upgradeable} from "@openzeppelin/contracts-upgradeable/interfaces/IERC165Upgradeable.sol";
import {IERC1155Upgradeable} from "@openzeppelin/contracts-upgradeable/interfaces/IERC1155Upgradeable.sol";
import {IERC1155MetadataURIUpgradeable} from "@openzeppelin/contracts-upgradeable/interfaces/IERC1155MetadataURIUpgradeable.sol";
import {ERC1155Upgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC1155/ERC1155Upgradeable.sol";
import {ERC1155PausableUpgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC1155/extensions/ERC1155PausableUpgradeable.sol";
import {ERC1155SupplyUpgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC1155/extensions/ERC1155SupplyUpgradeable.sol";
import {ERC1155URIStorageUpgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC1155/extensions/ERC1155URIStorageUpgradeable.sol";
import {ERC165CheckerUpgradeable} from "@openzeppelin/contracts-upgradeable/utils/introspection/ERC165CheckerUpgradeable.sol";

import {IAdmin} from "../common/interfaces/IAdmin.sol";
import {IGovernor} from "../common/interfaces/IGovernor.sol";
import {IRoyaltyRateProposer} from "../common/interfaces/IRoyaltyRateProposer.sol";

import {CommonConstant} from "../common/constants/CommonConstant.sol";

import {Administrable} from "../common/utilities/Administrable.sol";
import {Pausable} from "../common/utilities/Pausable.sol";
import {RoyaltyRateProposer} from "../common/utilities/RoyaltyRateProposer.sol";
import {Snapshotable} from "../common/utilities/Snapshotable.sol";
import {Validatable} from "../common/utilities/Validatable.sol";

import {IEstateToken} from "../land/interfaces/IEstateToken.sol";

import {EstateTokenizer} from "../land/utilities/EstateTokenizer.sol";

import {ProjectTokenConstant} from "./constants/ProjectTokenConstant.sol";

import {IProjectLaunchpad} from "./interfaces/IProjectLaunchpad.sol";
import {IProjectToken} from "./interfaces/IProjectToken.sol";

import {ProjectTokenStorage} from "./storages/ProjectTokenStorage.sol";

abstract contract ProjectToken is
ProjectTokenStorage,
ERC1155PausableUpgradeable,
ERC1155SupplyUpgradeable,
ERC1155URIStorageUpgradeable,
EstateTokenizer,
Pausable,
RoyaltyRateProposer,
Validatable,
ReentrancyGuardUpgradeable {
    using ERC165CheckerUpgradeable for address;

    string constant private VERSION = "v1.1.1";

    modifier validProject(uint256 _projectId) {
        if (!isAvailable(_projectId)) {
            revert InvalidProjectId();
        }
        _;
    }

    modifier onlyLaunchpad(uint256 _projectId) {
        if (msg.sender != projects[_projectId].launchpad) {
            revert Unauthorized();
        }
        _;
    }

    modifier onlyEligibleZone(uint256 _projectId) {
        if (!IAdmin(admin).getZoneEligibility(projects[_projectId].zone, msg.sender)) {
            revert Unauthorized();
        }
        _;
    }

    receive() external payable {}

    function initialize(
        address _admin,
        address _estateToken,
        address _feeReceiver,
        address _validator,
        string calldata _uri,
        uint256 _royaltyRate
    ) external initializer {
        __ERC1155Pausable_init();

        __ReentrancyGuard_init();

        __Validatable_init(_validator);
        __RoyaltyRateProposer_init(_royaltyRate);

        admin = _admin;
        estateToken = _estateToken;
        feeReceiver = _feeReceiver;

        _setBaseURI(_uri);
        emit BaseURIUpdate(_uri);
    }

    function version() external pure returns (string memory) {
        return VERSION;
    }

    function decimals() external pure returns (uint8) {
        return ProjectTokenConstant.PROJECT_TOKEN_DECIMALS;
    }

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
                    revert AuthorizedAccount(_accounts[i]);
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
                    revert NotAuthorizedAccount(_accounts[i]);
                }
                isLaunchpad[_accounts[i]] = false;
                emit LaunchpadDeauthorization(_accounts[i]);
            }
        }
    }

    function getProject(uint256 _projectId) external view returns (Project memory) {
        if (!exists(_projectId)) {
            revert InvalidProjectId();
        }
        return projects[_projectId];
    }

    function isAvailable(uint256 _projectId) public view returns (bool) {
        return projects[_projectId].deprecateAt == CommonConstant.COMMON_INFINITE_TIMESTAMP;
    }

    function launchProject(
        bytes32 _zone,
        uint256 _launchId,
        string calldata _uri
    ) external whenNotPaused returns (uint256) {
        if (!isLaunchpad[msg.sender]) {
            revert Unauthorized();
        }

        if (!IAdmin(admin).isZone(_zone)) {
            revert InvalidInput();
        }

        uint256 projectId = ++projectNumber;
        projects[projectId] = Project(
            _zone,
            0,
            _launchId,
            msg.sender,
            uint40(block.timestamp),
            CommonConstant.COMMON_INFINITE_TIMESTAMP
        );
        _setURI(projectId, _uri);

        emit NewToken(
            projectId,
            _zone,
            _launchId,
            msg.sender
        );

        return projectId;
    }

    function mint(uint256 _projectId, uint256 _amount)
    external validProject(_projectId) onlyLaunchpad(_projectId) whenNotPaused {
        _mint(
            msg.sender,
            _projectId,
            _amount,
            ""
        );
    }

    function deprecateProject(uint256 _projectId)
    external validProject(_projectId) onlyManager onlyEligibleZone(_projectId) whenNotPaused {
        projects[_projectId].deprecateAt = uint40(block.timestamp);
        emit ProjectDeprecation(_projectId);
    }

    function updateProjectURI(
        uint256 _projectId,
        string calldata _uri,
        Validation calldata _validation
    ) external validProject(_projectId) onlyManager onlyEligibleZone(_projectId) whenNotPaused {
        _validate(
            abi.encode(_projectId, _uri),
            _validation
        );

        _setURI(_projectId, _uri);
    }

    function tokenizeProject(uint256 _projectId, address _commissionReceiver)
    external nonReentrant validProject(_projectId) onlyManager onlyEligibleZone(_projectId) whenNotPaused returns (uint256) {
        if (_commissionReceiver == address(0)) {
            revert InvalidCommissionReceiver();
        }

        Project storage project = projects[_projectId];
        bytes32 zone = project.zone;
        if (!IAdmin(admin).getZoneEligibility(zone, msg.sender)) {
            revert Unauthorized();
        }

        if (project.estateId != 0) {
            revert Tokenized();
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
            CommonConstant.COMMON_INFINITE_TIMESTAMP,
            _commissionReceiver
        );
        project.estateId = estateId;

        emit ProjectTokenization(
            _projectId,
            estateId,
            supply,
            _commissionReceiver
        );

        return estateId;
    }

    function withdrawEstateToken(uint256 _projectId)
    external nonReentrant validProject(_projectId) whenNotPaused returns (uint256) {
        Project storage project = projects[_projectId];
        uint256 estateId = project.estateId;
        if (estateId == 0) {
            revert InvalidWithdrawing();
        }
        if (hasWithdrawn[_projectId][msg.sender]) {
            revert AlreadyWithdrawn();
        }

        hasWithdrawn[_projectId][msg.sender] = true;

        uint256 amount = balanceOf(msg.sender, _projectId);
        IEstateToken(estateToken).safeTransferFrom(
            address(this),
            msg.sender,
            estateId,
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

    function isTokenized(uint256 _projectId) public view returns (bool) {
        return projects[_projectId].estateId != 0;
    }

    function allocationOfAt(
        uint256 _tokenizationId,
        address _account,
        uint256 _at
    ) external view validProject(_tokenizationId) returns (uint256) {
        // TODO: implement
        return 0;
    }

    function supportsInterface(bytes4 _interfaceId) public view virtual override(
        IERC165Upgradeable,
        EstateTokenizer,
        RoyaltyRateProposer,
        ERC1155Upgradeable
    ) returns (bool) {
        return _interfaceId == type(IProjectToken).interfaceId
            || super.supportsInterface(_interfaceId);
    }

    function uri(uint256 _tokenId) public view override(
        IERC1155MetadataURIUpgradeable,
        ERC1155Upgradeable,
        ERC1155URIStorageUpgradeable
    ) returns (string memory) {
        return super.uri(_tokenId);
    }

    function _beforeTokenTransfer(
        address _operator,
        address _from,
        address _to,
        uint256[] memory _ids,
        uint256[] memory _amounts,
        bytes memory _data
    ) internal override(
        ERC1155Upgradeable,
        ERC1155PausableUpgradeable,
        ERC1155SupplyUpgradeable
    ) {
        super._beforeTokenTransfer(_operator, _from, _to, _ids, _amounts, _data);
    }

    function _afterTokenTransfer(
        address _operator,
        address _from,
        address _to,
        uint256[] memory _ids,
        uint256[] memory _amounts,
        bytes memory _data
    ) internal override {
        super._afterTokenTransfer(_operator, _from, _to, _ids, _amounts, _data);
        uint256 timestamp = block.timestamp;
        for (uint256 i; i < _ids.length; ++i) {
            uint256 tokenId = _ids[i];
            if (_from != address(0)) {
                balanceSnapshots[tokenId][_from].push(Snapshot(balanceOf(_from, tokenId), timestamp));
            } else {
                totalSupplySnapshots[tokenId].push(Snapshot(totalSupply(tokenId), timestamp));
            }
            if (_to != address(0)) {
                balanceSnapshots[tokenId][_to].push(Snapshot(balanceOf(_to, tokenId), timestamp));
            } else {
                totalSupplySnapshots[tokenId].push(Snapshot(totalSupply(tokenId), timestamp));
            }
        }
    }

    function __royaltyReceiver() external view returns (address) {
        return feeReceiver;
    }
}
