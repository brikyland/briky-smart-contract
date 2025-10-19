// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

/// @openzeppelin/contracts-upgradeable/
import {IERC165Upgradeable} from "@openzeppelin/contracts-upgradeable/interfaces/IERC165Upgradeable.sol";
import {IERC1155Upgradeable} from "@openzeppelin/contracts-upgradeable/interfaces/IERC1155Upgradeable.sol";
import {IERC1155MetadataURIUpgradeable} from "@openzeppelin/contracts-upgradeable/interfaces/IERC1155MetadataURIUpgradeable.sol";
import {IERC2981Upgradeable} from "@openzeppelin/contracts-upgradeable/interfaces/IERC2981Upgradeable.sol";
import {ERC1155Upgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC1155/ERC1155Upgradeable.sol";
import {ERC1155PausableUpgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC1155/extensions/ERC1155PausableUpgradeable.sol";
import {ERC1155SupplyUpgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC1155/extensions/ERC1155SupplyUpgradeable.sol";
import {ERC1155URIStorageUpgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC1155/extensions/ERC1155URIStorageUpgradeable.sol";
import {ERC165CheckerUpgradeable} from "@openzeppelin/contracts-upgradeable/utils/introspection/ERC165CheckerUpgradeable.sol";

/// contracts/common/constants/
import {CommonConstant} from "../common/constants/CommonConstant.sol";

/// contracts/common/interfaces/
import {IAdmin} from "../common/interfaces/IAdmin.sol";
import {IAssetToken} from "../common/interfaces/IAssetToken.sol";
import {IGovernor} from "../common/interfaces/IGovernor.sol";

/// contracts/common/utilities/
import {Administrable} from "../common/utilities/Administrable.sol";
import {Pausable} from "../common/utilities/Pausable.sol";
import {RoyaltyRateProposer} from "../common/utilities/RoyaltyRateProposer.sol";
import {SnapshotHandler} from "../common/utilities/SnapshotHandler.sol";
import {Validatable} from "../common/utilities/Validatable.sol";

/// contracts/land/constants/
import {EstateTokenConstant} from "./constants/EstateTokenConstant.sol";

/// contracts/land/interfaces/
import {ICommissionToken} from "./interfaces/ICommissionToken.sol";
import {IEstateToken} from "./interfaces/IEstateToken.sol";
import {IEstateTokenizer} from "./interfaces/IEstateTokenizer.sol";

/// contracts/land/storages/
import {EstateTokenStorage} from "./storages/EstateTokenStorage.sol";

/**
 *  @author Briky Team
 *
 *  @notice The `EstateToken` contract securitizes real-world estates into classes of fungible ERC-1155 tokens, where each
 *          token class represents fractional ownership of a specific tokenized estate. Official disclosed third party
 *          agents are registered as custodians in designated zones to actively provide estates to tokenize and escrows those
 *          assets on behalf of holders after successful tokenization.
 *
 *  @dev    Each unit of estate tokens is represented in scaled form as `10 ** decimals()`.
 *  @dev    Implementation involves server-side support.
 */
contract EstateToken is
EstateTokenStorage,
ERC1155PausableUpgradeable,
ERC1155SupplyUpgradeable,
ERC1155URIStorageUpgradeable,
Administrable,
Pausable,
RoyaltyRateProposer,
Validatable {
    /** ===== LIBRARY ===== **/
    using ERC165CheckerUpgradeable for address;
    using SnapshotHandler for Uint256Snapshot[];


    /** ===== CONSTANT ===== **/
    string constant private VERSION = "v1.2.1";


    /** ===== MODIFIER ===== **/
    /**
     *  @notice Verify a valid estate identifier.
     *
     *          Name        Description
     *  @param  _estateId   Estate identifier.
     */
    modifier validEstate(
        uint256 _estateId
    ) {
        if (!isAvailable(_estateId)) {
            revert InvalidEstateId();
        }
        _;
    }

    /**
     *  @notice Verify the message sender is active in the zone of the estate.
     *
     *          Name        Description
     *  @param  _estateId   Estate identifier.
     */
    modifier onlyActiveInZoneOf(
        uint256 _estateId
    ) {
        if (!IAdmin(admin).isActiveIn(estates[_estateId].zone, msg.sender)) {
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
     *  @param  _feeReceiver    `FeeReceiver` contract address.
     *  @param  _validator      Validator address.
     *  @param  _uri            Base URI.
     */
    function initialize(
        address _admin,
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

        /// Dependency
        admin = _admin;
        feeReceiver = _feeReceiver;

        /// Configuration
        _setBaseURI(_uri);
        emit BaseURIUpdate(_uri);
    }


    /* --- Administration --- */
    /**
     *  @notice Update the commission token contract.
     *
     *          Name                Description
     *  @param  _commissionToken    `CommissionToken` contract address.
     *  @param  _signatures         Array of admin signatures.
     * 
     *  @dev    Administrative operator.
     */
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
    }

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
     *  @notice Authorize or deauthorize contract addresses as tokenizers.
     *
     *          Name            Description
     *  @param  _accounts       Array of contract addresses.
     *  @param  _isTokenizer    This whether the operation is authorizing or deauthorizing.
     *  @param  _signatures     Array of admin signatures.
     * 
     *  @dev    Administrative operator.
     */
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
                    revert InvalidTokenizer();
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

    /**
     *  @notice Authorize or deauthorize contract addresses as extractors.
     *
     *          Name            Description
     *  @param  _accounts       Array of contract addresses.
     *  @param  _isExtractor    This whether the operation is authorizing or deauthorizing.
     *  @param  _signatures     Array of admin signatures.
     * 
     *  @dev    Administrative operator.
     */
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

    /**
     *  @notice Update the royalty rate of a zone.
     *
     *          Name            Description
     *  @param  _zone           Zone code.
     *  @param  _royaltyRate    New royalty rate for the zone.
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

    
    /* --- Query --- */
    /**
     *  @return Token decimals.
     */
    function decimals() external pure returns (uint8) {
        return EstateTokenConstant.TOKEN_DECIMALS;
    }

    /**
     *          Name            Description
     *  @param  _zone           Zone code.
     *
     *  @return Royalty rate of the zone.
     */
    function getZoneRoyaltyRate(
        bytes32 _zone
    ) external view returns (Rate memory) {
        return Rate(zoneRoyaltyRates[_zone], CommonConstant.RATE_DECIMALS);
    }

    /**
     *          Name            Description
     *  @param  _zone           Zone code.
     *  @param  _account        EVM address.
     *
     *  @return Whether the account is a registered custodian in the zone.
     */
    function isCustodianIn(
        bytes32 _zone,
        address _account
    ) public view returns (bool) {
        return bytes(custodianURIs[_zone][_account]).length != 0;
    }

    /**
     *          Name            Description
     *  @param  _account        EVM address.
     *  @param  _tokenId        Estate identifier.
     *  @param  _at             Reference timestamp.
     *
     *  @return Balance of the account in the estate at the reference timestamp.
     */
    function balanceOfAt(
        address _account,
        uint256 _tokenId,
        uint256 _at
    ) public view returns (uint256) {
        if (!exists(_tokenId)) {
            revert InvalidEstateId();
        }
        if (_at > block.timestamp
            || _at > estates[_tokenId].deprecateAt
            || _at >= estates[_tokenId].expireAt) {
            revert InvalidTimestamp();
        }

        return balanceSnapshots[_tokenId][_account].getValueAt(_at);
    }

    /**
     *          Name            Description
     *  @param  _tokenId        Estate identifier.
     *
     *  @return Total supply of the token class.
     */
    function totalSupply(
        uint256 _tokenId
    ) public view override(
        IAssetToken,
        ERC1155SupplyUpgradeable
    ) returns (uint256) {
        return super.totalSupply(_tokenId);
    }

    /**
     *          Name            Description
     *  @param  _estateId       Estate identifier.
     *
     *  @return Estate information.
     */
    function getEstate(
        uint256 _estateId
    ) external view returns (Estate memory) {
        if (_estateId == 0 || _estateId > estateNumber) {
            revert InvalidEstateId();
        }
        return estates[_estateId];
    }

    /**
     *          Name            Description
     *  @param  _estateId       Estate identifier.
     *
     *  @return Representative address of the estate.
     */
    function getRepresentative(
        uint256 _estateId
    ) external view returns (address) {
        if (_estateId == 0 || _estateId > estateNumber) {
            revert InvalidEstateId();
        }
        return estates[_estateId].custodian;
    }

    /**
     *          Name            Description
     *  @param  _estateId       Estate identifier.
     *
     *  @return Whether the estate is available.
     */
    function isAvailable(
        uint256 _estateId
    ) public view returns (bool) {
        /// @dev    Neither deprecated nor expired.
        return estates[_estateId].deprecateAt == CommonConstant.INFINITE_TIMESTAMP
            && estates[_estateId].expireAt > block.timestamp;
    }

    /**
     *          Name            Description
     *  @param  _estateId       Estate identifier.
     *
     *  @return Zone code of the estate.
     */
    function zoneOf(
        uint256 _estateId
    ) external view returns (bytes32) {
        if (!exists(_estateId)) {
            revert InvalidEstateId();
        }
        return estates[_estateId].zone;
    }

    /**
     *          Name            Description
     *  @param  _account        EVM address.
     *  @param  _estateId       Estate identifier.
     *  @param  _at             Reference timestamp.
     *
     *  @return Equity of the account in the estate at the reference timestamp.
     */
    function equityOfAt(
        address _account,
        uint256 _estateId,
        uint256 _at
    ) external view returns (uint256) {
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

        /// @dev    Equity includes unwithdrawn allocation in the tokenizer contract.
        return balanceSnapshots[_estateId][_account].getValueAt(_at)
            + IEstateTokenizer(estate.tokenizer).allocationOfAt(
                _account,
                estate.tokenizationId,
                _at
            );
    }

    /**
     *          Name            Description
     *  @param  _estateId       Estate identifier.
     *
     *  @return URI of estate metadata.
     */
    function uri(
        uint256 _estateId
    ) public view override(
        IERC1155MetadataURIUpgradeable,
        ERC1155Upgradeable,
        ERC1155URIStorageUpgradeable
    ) returns (string memory) {
        return super.uri(_estateId);
    }

    /**
     *          Name            Description
     *  @param  _estateId       Estate identifier.
     *  @param  _at             Reference timestamp.
     *
     *  @return Total equity in the estate at the reference timestamp.
     */
    function totalEquityAt(
        uint256 _estateId,
        uint256 _at
    ) external view returns (uint256) {
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


    /**
     *          Name            Description
     *  @param  _tokenId        Estate identifier.
     *
     *  @return Royalty rate of the token identifier.
     */
    function getRoyaltyRate(
        uint256 _tokenId
    ) external view
    validEstate(_tokenId)
    returns (Rate memory) {
        return Rate(
            zoneRoyaltyRates[estates[_tokenId].zone],
            CommonConstant.RATE_DECIMALS
        );
    }

    /**
     *          Name            Description
     *  @param  _interfaceId    Interface identifier.
     *
     *  @return Whether the interface is supported.
     */
    function supportsInterface(
        bytes4 _interfaceId
    ) public view override(
        IERC165Upgradeable,
        ERC1155Upgradeable
    ) returns (bool) {
        return _interfaceId == type(IGovernor).interfaceId
            || _interfaceId == type(IAssetToken).interfaceId
            || _interfaceId == type(IERC2981Upgradeable).interfaceId
            || super.supportsInterface(_interfaceId);
    }


    /* --- Command --- */
    /**
     *  @notice Register a custodian in a zone.
     *
     *          Name            Description
     *  @param  _zone           Zone code.
     *  @param  _custodian      Custodian address.
     *  @param  _uri            URI of custodian information.
     *  @param  _validation     Validation package from the validator.
     *
     *  @dev    Permissions: Managers active in the zone.
     */
    function registerCustodian(
        bytes32 _zone,
        address _custodian,
        string calldata _uri,
        Validation calldata _validation
    ) external
    whenNotPaused
    onlyManager {
        if (!IAdmin(admin).isActiveIn(_zone, msg.sender)) {
            revert Unauthorized();
        }

        _validate(
            abi.encode(
                _zone,
                _custodian,
                _uri
            ),
            _validation
        );

        if (bytes(_uri).length == 0) {
            revert InvalidURI();
        }

        custodianURIs[_zone][_custodian] = _uri;
        emit CustodianRegistration(
            _zone,
            _custodian,
            _uri
        );
    }


    /**
     *  @notice Tokenize an estate into a new class of token.
     *
     *          Name                Description
     *  @param  _totalSupply        Number of tokens to mint.
     *  @param  _zone               Zone code.
     *  @param  _tokenizationId     Tokenization identifier from the tokenizer contract.
     *  @param  _uri                URI of estate information.
     *  @param  _expireAt           Estate expiration timestamp.
     *  @param  _custodian          Assigned custodian address.
     *  @param  _broker             Associated broker address.
     *
     *  @return New estate identifier.
     *
     *  @dev    Permissions: Tokenizers.
     */
    function tokenizeEstate(
        uint256 _totalSupply,
        bytes32 _zone,
        uint256 _tokenizationId,
        string calldata _uri,
        uint40 _expireAt,
        address _custodian,
        address _broker
    ) external
    whenNotPaused
    returns (uint256) {
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
            _zone,
            _broker,
            estateId
        );

        emit NewToken(
            estateId,
            _zone,
            _tokenizationId,
            msg.sender,
            _custodian,
            _expireAt
        );

        return estateId;
    }


    /**
     *  @notice Extract an estate.
     *
     *          Name                Description
     *  @param  _estateId           Estate identifier.
     *  @param  _extractionId       Extraction identifier.
     *
     *  @dev    Permissions: Extractors.
     */
    function extractEstate(
        uint256 _estateId,
        uint256 _extractionId
    ) external
    whenNotPaused
    validEstate(_estateId) {
        if (!isExtractor[msg.sender]) {
            revert Unauthorized();
        }

        estates[_estateId].deprecateAt = uint40(block.timestamp);
        emit EstateExtraction(
            _estateId,
            _extractionId
        );
    }


    /* --- Safe Command --- */
    /**
     *  @notice Deprecate an estate by managers due to force majeure or extraction.
     *
     *          Name        Description
     *  @param  _estateId   Estate identifier.
     *  @param  _note       Deprecation note.
     *  @param  _anchor     Keccak256 hash of `uri` of the estate.
     *
     *  @dev    Permissions: Managers active in the zone of the estate.
     *  @dev    Anchor enforces consistency between this contract and the client-side.
     */
    function safeDeprecateEstate(
        uint256 _estateId,
        string calldata _note,
        bytes32 _anchor
    ) external
    whenNotPaused
    onlyManager
    validEstate(_estateId)
    onlyActiveInZoneOf(_estateId) {
        if (_anchor != keccak256(bytes(uri(_estateId)))) {
            revert BadAnchor();
        }

        estates[_estateId].deprecateAt = uint40(block.timestamp);
        emit EstateDeprecation(
            _estateId,
            _note
        );
    }

    /**
     *  @notice Extend the expiration of an estate.
     *
     *          Name            Description
     *  @param  _estateId       Estate identifier.
     *  @param  _expireAt       New expiration timestamp.
     *  @param  _anchor         Keccak256 hash of `uri` of the estate.
     *
     *  @dev    Permissions: Managers active in the zone of the estate.
     *  @dev    Anchor enforces consistency between this contract and the client-side.
     */
    function safeExtendEstateExpiration(
        uint256 _estateId,
        uint40 _expireAt,
        bytes32 _anchor
    ) external
    whenNotPaused
    onlyManager
    validEstate(_estateId)
    onlyActiveInZoneOf(_estateId) {
        if (_anchor != keccak256(bytes(uri(_estateId)))) {
            revert BadAnchor();
        }

        if (_expireAt <= block.timestamp) {
            revert InvalidTimestamp();
        }

        estates[_estateId].expireAt = _expireAt;
        emit EstateExpirationExtension(
            _estateId,
            _expireAt
        );
    }

    /**
     *  @notice Update the custodian of an estate.
     *
     *          Name            Description
     *  @param  _estateId       Estate identifier.
     *  @param  _custodian      New custodian address.
     *  @param  _anchor         Keccak256 hash of `uri` of the estate.
     *
     *  @dev    Permissions: Managers active in the zone of the estate.
     *  @dev    Anchor enforces consistency between this contract and the client-side.
     */
    function safeUpdateEstateCustodian(
        uint256 _estateId,
        address _custodian,
        bytes32 _anchor
    ) external
    whenNotPaused
    onlyManager
    validEstate(_estateId)
    onlyActiveInZoneOf(_estateId) {
        if (_anchor != keccak256(bytes(uri(_estateId)))) {
            revert BadAnchor();
        }

        if (!isCustodianIn(estates[_estateId].zone, _custodian)) {
            revert InvalidCustodian();
        }

        estates[_estateId].custodian = _custodian;
        emit EstateCustodianUpdate(
            _estateId,
            _custodian
        );
    }

    /**
     *  @notice Update the URI of metadata of an estate.
     *
     *          Name            Description
     *  @param  _estateId       Estate identifier.
     *  @param  _uri            New URI of estate metadata.
     *  @param  _validation     Validation package from the validator.
     *  @param  _anchor         Keccak256 hash of `uri` of the estate.
     *
     *  @dev    Permissions: Managers active in the zone of the estate.
     *  @dev    Anchor enforces consistency between this contract and the client-side.
     */
    function safeUpdateEstateURI(
        uint256 _estateId,
        string calldata _uri,
        Validation calldata _validation,
        bytes32 _anchor
    ) external
    whenNotPaused
    onlyManager
    validEstate(_estateId)
    onlyActiveInZoneOf(_estateId) {
        if (_anchor != keccak256(bytes(uri(_estateId)))) {
            revert BadAnchor();
        }

        _validate(
            abi.encode(
                _estateId,
                _uri
            ),
            _validation
        );

        _setURI(_estateId, _uri);
    }

    /* --- Helper --- */
    /**
     *  @return Default royalty receiver address.
     */
    function _royaltyReceiver() internal view override returns (address) {
        return feeReceiver;
    }

    /**
     *  @notice Hook to be called before any token transfer.
     *
     *          Name            Description
     *  @param  _operator       Operator address.
     *  @param  _from           Sender address.
     *  @param  _to             Receiver address.
     *  @param  _estateIds      Array of estate identifiers.
     *  @param  _amounts        Array of transferred amounts, respective to each estate identifier.
     *  @param  _data           Additional data.
     */
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
            /// @dev    Check availability.
            require(
                estates[_estateIds[i]].deprecateAt == CommonConstant.INFINITE_TIMESTAMP
                    && estates[_estateIds[i]].expireAt > block.timestamp,
                "EstateToken: Token is unavailable"
            );
        }
    }

    /**
     *  @notice Hook to be called after any token transfer.
     *
     *          Name            Description
     *  @param  _operator       Operator address.
     *  @param  _from           Sender address.
     *  @param  _to             Receiver address.
     *  @param  _estateIds      Array of estate identifiers.
     *  @param  _amounts        Array of transferred amounts, respective to each estate identifier.
     *  @param  _data           Additional data.
     */
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
            /// @dev    Update snapshots.
            if (_from != address(0)) {
                balanceSnapshots[estateId][_from].push(Uint256Snapshot(balanceOf(_from, estateId), timestamp));
            }
            if (_to != address(0)) {
                balanceSnapshots[estateId][_to].push(Uint256Snapshot(balanceOf(_to, estateId), timestamp));
            }
        }
    }
}
