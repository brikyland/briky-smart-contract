// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

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

import {EstateTokenConstant} from "./constants/EstateTokenConstant.sol";

import {ICommissionToken} from "./interfaces/ICommissionToken.sol";
import {IEstateToken} from "./interfaces/IEstateToken.sol";
import {IEstateTokenizer} from "./interfaces/IEstateTokenizer.sol";

import {EstateTokenStorage} from "./storages/EstateTokenStorage.sol";

contract EstateToken is
EstateTokenStorage,
ERC1155PausableUpgradeable,
ERC1155SupplyUpgradeable,
ERC1155URIStorageUpgradeable,
Administrable,
Pausable,
RoyaltyRateProposer,
Snapshotable,
Validatable {
    using ERC165CheckerUpgradeable for address;

    string constant private VERSION = "v1.1.1";

    modifier validEstate(uint256 _estateId) {
        if (!isAvailable(_estateId)) {
            revert InvalidEstateId();
        }
        _;
    }

    modifier onlyEligibleZone(uint256 _estateId) {
        if (!IAdmin(admin).getZoneEligibility(estates[_estateId].zone, msg.sender)) {
            revert Unauthorized();
        }
        _;
    }

    receive() external payable {}

    function initialize(
        address _admin,
        address _feeReceiver,
        address _validator,
        string calldata _uri,
        uint256 _royaltyRate
    ) external initializer {
        __ERC1155Pausable_init();

        __Validatable_init(_validator);
        __RoyaltyRateProposer_init(_royaltyRate);

        admin = _admin;
        feeReceiver = _feeReceiver;

        _setBaseURI(_uri);
        emit BaseURIUpdate(_uri);
    }

    function version() external pure returns (string memory) {
        return VERSION;
    }

    function decimals() external pure returns (uint8) {
        return EstateTokenConstant.TOKEN_DECIMALS;
    }

    function updateCommissionToken(
        address _commissionToken,
        bytes[] calldata _signatures
    ) external {
        IAdmin(admin).verifyAdminSignatures(
            abi.encode(
                address(this),
                "updateCommissionToken",
                _commissionToken
            ),
            _signatures
        );
        if (_commissionToken == address(0) || commissionToken != address(0)) {
            revert InvalidUpdating();
        }
        commissionToken = _commissionToken;
        emit CommissionTokenUpdate(_commissionToken);
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

    function authorizeTokenizers(
        address[] calldata _accounts,
        bool _isTokenizer,
        bytes[] calldata _signatures
    ) external {
        IAdmin(admin).verifyAdminSignatures(
            abi.encode(
                address(this),
                "authorizeTokenizers",
                _accounts,
                _isTokenizer
            ),
            _signatures
        );

        if (_isTokenizer) {
            for (uint256 i; i < _accounts.length; ++i) {
                if (isTokenizer[_accounts[i]]) {
                    revert AuthorizedAccount();
                }
                if (!_accounts[i].supportsInterface(type(IEstateTokenizer).interfaceId)) {
                    revert InvalidTokenizer(_accounts[i]);
                }
                isTokenizer[_accounts[i]] = true;
                emit TokenizerAuthorization(_accounts[i]);
            }
        } else {
            for (uint256 i; i < _accounts.length; ++i) {
                if (!isTokenizer[_accounts[i]]) {
                    revert NotAuthorizedAccount();
                }
                isTokenizer[_accounts[i]] = false;
                emit TokenizerDeauthorization(_accounts[i]);
            }
        }
    }

    function authorizeExtractors(
        address[] calldata _accounts,
        bool _isExtractor,
        bytes[] calldata _signatures
    ) external {
        IAdmin(admin).verifyAdminSignatures(
            abi.encode(
                address(this),
                "authorizeExtractors",
                _accounts,
                _isExtractor
            ),
            _signatures
        );

        if (_isExtractor) {
            for (uint256 i; i < _accounts.length; ++i) {
                if (isExtractor[_accounts[i]]) {
                    revert AuthorizedAccount();
                }
                isExtractor[_accounts[i]] = true;
                emit ExtractorAuthorization(_accounts[i]);
            }
        } else {
            for (uint256 i; i < _accounts.length; ++i) {
                if (!isExtractor[_accounts[i]]) {
                    revert NotAuthorizedAccount();
                }
                isExtractor[_accounts[i]] = false;
                emit ExtractorDeauthorization(_accounts[i]);
            }
        }
    }

    function registerCustodian(
        bytes32 _zone,
        address _custodian,
        string calldata _uri,
        Validation calldata _validation
    ) external onlyManager {
        if (!IAdmin(admin).getZoneEligibility(_zone, msg.sender)) {
            revert Unauthorized();
        }

        _validate(abi.encode(_uri), _validation);

        if (bytes(_uri).length == 0) {
            revert InvalidURI();
        }

        custodianURI[_zone][_custodian] = _uri;
        emit CustodianRegistration(
            _zone,
            _custodian,
            _uri
        );
    }

    function isCustodianIn(bytes32 _zone, address _account) public view returns (bool) {
        return bytes(custodianURI[_zone][_account]).length!= 0;
    }

    function getEstate(uint256 _estateId) external view returns (Estate memory) {
        if (!exists(_estateId)) {
            revert InvalidEstateId();
        }
        return estates[_estateId];
    }

    function isAvailable(uint256 _estateId) public view returns (bool) {
        return estates[_estateId].deprecateAt == CommonConstant.INFINITE_TIMESTAMP
            && estates[_estateId].expireAt > block.timestamp;
    }

    function isVotePowerAvailable(uint256 _estateId) public view returns (bool) {
        return isAvailable(_estateId);
    }

    function tokenizeEstate(
        uint256 _totalSupply,
        bytes32 _zone,
        uint256 _tokenizationId,
        string calldata _uri,
        uint40 _expireAt,
        address _custodian,
        address _commissionReceiver
    ) external whenNotPaused returns (uint256) {
        if (!isTokenizer[msg.sender]) {
            revert Unauthorized();
        }

        if (!IAdmin(admin).isZone(_zone)) {
            revert InvalidInput();
        }

        if (_expireAt <= block.timestamp) {
            revert InvalidTimestamp();
        }

        if (!isCustodianIn(_zone, _custodian)) {
            revert InvalidCustodian();
        }

        uint256 estateId = ++estateNumber;
        estates[estateId] = Estate(
            _zone,
            _tokenizationId,
            msg.sender,
            uint40(block.timestamp),
            _expireAt,
            CommonConstant.INFINITE_TIMESTAMP,
            _custodian
        );
        _mint(msg.sender, estateId, _totalSupply, "");
        _setURI(estateId, _uri);

        ICommissionToken(commissionToken).mint(
            _commissionReceiver,
            estateId
        );

        emit NewToken(
            estateId,
            _zone,
            _tokenizationId,
            msg.sender,
            _expireAt
        );

        return estateId;
    }

    function deprecateEstate(uint256 _estateId)
    external validEstate(_estateId) onlyManager onlyEligibleZone(_estateId) whenNotPaused {
        estates[_estateId].deprecateAt = uint40(block.timestamp);
        emit EstateDeprecation(_estateId);
    }

    function extendEstateExpiration(uint256 _estateId, uint40 _expireAt)
    external validEstate(_estateId) onlyManager onlyEligibleZone(_estateId) whenNotPaused {
        if (_expireAt <= block.timestamp) {
            revert InvalidTimestamp();
        }
        estates[_estateId].expireAt = _expireAt;
        emit EstateExpirationExtension(_estateId, _expireAt);
    }

    function updateEstateURI(
        uint256 _estateId,
        string calldata _uri,
        Validation calldata _validation
    ) external validEstate(_estateId) onlyManager onlyEligibleZone(_estateId) whenNotPaused {
        _validate(
            abi.encode(_estateId, _uri),
            _validation
        );

        _setURI(_estateId, _uri);
    }

    function updateEstateCustodian(uint256 _estateId, address _custodian)
    external validEstate(_estateId) onlyManager onlyEligibleZone(_estateId) whenNotPaused {
        if (!isCustodianIn(estates[_estateId].zone, _custodian)) {
            revert InvalidCustodian();
        }
        estates[_estateId].custodian = _custodian;
        emit EstateCustodianUpdate(_estateId, _custodian);
    }

    function extractEstate(uint256 _estateId, uint256 _extractionId)
    external validEstate(_estateId) whenNotPaused {
        if (!isExtractor[msg.sender]) {
            revert Unauthorized();
        }
        estates[_estateId].deprecateAt = uint40(block.timestamp);
        emit EstateExtraction(_estateId, _extractionId);
    }

    function zoneOf(uint256 _estateId) external view returns (bytes32) {
        if (!exists(_estateId)) {
            revert InvalidEstateId();
        }
        return estates[_estateId].zone;
    }

    function balanceOf(address _account, uint256 _estateId)
    public view override(IERC1155Upgradeable, ERC1155Upgradeable) returns (uint256) {
        return estates[_estateId].deprecateAt != CommonConstant.INFINITE_TIMESTAMP || estates[_estateId].expireAt <= block.timestamp
            ? 0
            : super.balanceOf(_account, _estateId);
    }

    function balanceOfAt(address _account, uint256 _estateId, uint256 _at) public view returns (uint256) {
        if (!exists(_estateId)) {
            revert InvalidEstateId();
        }
        if (_at > block.timestamp
            || _at > estates[_estateId].deprecateAt
            || _at >= estates[_estateId].expireAt) {
            revert InvalidTimestamp();
        }

        return _snapshotAt(balanceSnapshots[_estateId][_account], _at);
    }

    function voteOfAt(address _account, uint256 _estateId, uint256 _at) external view returns (uint256) {
        if (!exists(_estateId)) {
            revert InvalidEstateId();
        }
        Estate storage estate = estates[_estateId];
        if (_at > block.timestamp
            || _at < estate.tokenizeAt
            || _at > estate.deprecateAt
            || _at >= estate.expireAt) {
            revert InvalidTimestamp();
        }
        if (_account == estate.tokenizer) {
            return 0;
        }

        return _snapshotAt(balanceSnapshots[_estateId][_account], _at)
            + IEstateTokenizer(estate.tokenizer).allocationOfAt(
                _account,
                estate.tokenizationId,
                _at
            );
    }

    function uri(uint256 _estateId) public view override(
        IERC1155MetadataURIUpgradeable,
        ERC1155Upgradeable,
        ERC1155URIStorageUpgradeable
    ) returns (string memory) {
        return super.uri(_estateId);
    }

    function totalSupply(uint256 _estateId)
    public view override(IEstateToken, ERC1155SupplyUpgradeable) returns (uint256) {
        return super.totalSupply(_estateId);
    }

    function totalVoteAt(uint256 _estateId, uint256 _at) external view returns (uint256) {
        if (!exists(_estateId)) {
            revert InvalidEstateId();
        }

        if (_at > block.timestamp
            || _at < estates[_estateId].tokenizeAt
            || _at > estates[_estateId].deprecateAt
            || _at >= estates[_estateId].expireAt) {
            revert InvalidTimestamp();
        }

        return totalSupply(_estateId);
    }

    function supportsInterface(bytes4 _interfaceId) public view override(
        IERC165Upgradeable,
        ERC1155Upgradeable,
        RoyaltyRateProposer
    ) returns (bool) {
        return _interfaceId == type(IGovernor).interfaceId
            || RoyaltyRateProposer.supportsInterface(_interfaceId)
            || ERC1155Upgradeable.supportsInterface(_interfaceId)
            || super.supportsInterface(_interfaceId);
    }

    function _beforeTokenTransfer(
        address _operator,
        address _from,
        address _to,
        uint256[] memory _estateIds,
        uint256[] memory _amounts,
        bytes memory _data
    ) internal override(
        ERC1155Upgradeable,
        ERC1155PausableUpgradeable,
        ERC1155SupplyUpgradeable
    ) {
        super._beforeTokenTransfer(_operator, _from, _to, _estateIds, _amounts, _data);
        for (uint256 i; i < _estateIds.length; ++i) {
            require(
                estates[_estateIds[i]].deprecateAt == CommonConstant.INFINITE_TIMESTAMP
                    && estates[_estateIds[i]].expireAt > block.timestamp,
                "EstateToken: Token is unavailable"
            );
        }
    }

    function _afterTokenTransfer(
        address _operator,
        address _from,
        address _to,
        uint256[] memory _estateIds,
        uint256[] memory _amounts,
        bytes memory _data
    ) internal override {
        super._afterTokenTransfer(_operator, _from, _to, _estateIds, _amounts, _data);
        uint256 timestamp = block.timestamp;
        for (uint256 i; i < _estateIds.length; ++i) {
            uint256 estateId = _estateIds[i];
            if (_from != address(0)) {
                balanceSnapshots[estateId][_from].push(Snapshot(balanceOf(_from, estateId), timestamp));
            }
            if (_to != address(0)) {
                balanceSnapshots[estateId][_to].push(Snapshot(balanceOf(_to, estateId), timestamp));
            }
        }
    }

    function _royaltyReceiver() internal view override returns (address) {
        return feeReceiver;
    }
}
