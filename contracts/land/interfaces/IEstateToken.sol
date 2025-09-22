// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

/// @openzeppelin/contracts-upgradeable
import {IERC1155MetadataURIUpgradeable} from "@openzeppelin/contracts-upgradeable/interfaces/IERC1155MetadataURIUpgradeable.sol";

/// contracts/common/interfaces/
import {IAssetToken} from "../../common/interfaces/IAssetToken.sol";
import {IRoyaltyRateProposer} from "../../common/interfaces/IRoyaltyRateProposer.sol";
import {IValidatable} from "../../common/interfaces/IValidatable.sol";

/// contracts/common/structs/
import {ISnapshot} from "../../common/structs/ISnapshot.sol";
import {IValidation} from "../../common/structs/IValidation.sol";

/// contracts/land/structs/
import {IEstate} from "../structs/IEstate.sol";

/**
 *  @author Briky Team
 *
 *  @notice Interface for contract `EstateToken`.
 *  @notice The `EstateToken` contract securitizes real-world estates into classes of fungible ERC-1155 tokens, where each
 *          token class represents fractional ownership of a specific tokenized estate. Official disclosed third party
 *          agents are registered as custodians in designated zones to actively provide estates to tokenize and escrows those
 *          assets on behalf of holders after successful tokenization.
 *
 *  @dev    Each unit of estate tokens is represented in scaled form as `10 ** decimals()`.
 *  @dev    Implementation involves server-side support.
 */
interface IEstateToken is
IEstate,
ISnapshot,
IValidatable,
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
     *  @notice Emitted when the royalty rate of a zone is updated.
     *
     *          Name        Description
     *  @param  zone        Zone code.
     *  @param  newRate     New royalty rate of the zone.
     */
    event ZoneRoyaltyRateUpdate(
        bytes32 indexed zone,
        Rate newRate
    );


    /* --- Tokenizer --- */
    /**
     *  @notice Emitted when a contract is authorized as a tokenizer contract.
     *
     *          Name        Description
     *  @param  account     Authorized contract address.
     */
    event TokenizerAuthorization(
        address indexed account
    );

    /**
     *  @notice Emitted when a contract is deauthorized as a tokenizer contract.
     *
     *          Name        Description
     *  @param  account     Deauthorized contract address.
     */
    event TokenizerDeauthorization(
        address indexed account
    );


    /* --- Extractor --- */
    /**
     *  @notice Emitted when a contract is authorized as an extractor contract.
     *
     *          Name        Description
     *  @param  account     Authorized contract address.
     */
    event ExtractorAuthorization(
        address indexed account
    );

    /**
     *  @notice Emitted when a contract is deauthorized as an extractor contract.
     *
     *          Name        Description
     *  @param  account     Deauthorized contract address.
     */
    event ExtractorDeauthorization(
        address indexed account
    );


    /* --- Custodian --- */
    /**
     *  @notice Emitted when a custodian is registered in a zone.
     *
     *          Name        Description
     *  @param  zone        Zone code.
     *  @param  custodian   Custodian address.
     *  @param  uri         URI of custodian information.
     */
    event CustodianRegistration(
        bytes32 indexed zone,
        address indexed custodian,
        string uri
    );


    /* --- Estate --- */
    /**
     *  @notice Emitted when a new class of estate token is minted.
     *
     *          Name            Description
     *  @param  tokenId         Estate identifier.
     *  @param  zone            Zone code.
     *  @param  tokenizationId  Tokenization request identifier from the tokenizer contract.
     *  @param  tokenizer       Tokenizer contract address.
     *  @param  custodian       Custodian address.
     *  @param  expireAt        Estate expiration timestamp.
     */
    event NewToken(
        uint256 indexed tokenId,
        bytes32 indexed zone,
        uint256 indexed tokenizationId,
        address tokenizer,
        address custodian,
        uint40 expireAt
    );

    /**
     *  @notice Emitted when the custodian of an estate is updated.
     *
     *          Name            Description
     *  @param  estateId        Estate identifier.
     *  @param  custodian       New custodian address.
     */
    event EstateCustodianUpdate(
        uint256 indexed estateId,
        address indexed custodian
    );

    /**
     *  @notice Emitted when an estate is deprecated due to force majeure or extraction.
     *
     *          Name            Description
     *  @param  estateId        Estate identifier.
     *  @param  note            Deprecation note.
     */
    event EstateDeprecation(
        uint256 indexed estateId,
        string note
    );

    /**
     *  @notice Emitted when expiration of an estate is extended.
     *
     *          Name            Description
     *  @param  estateId        Estate identifier.
     *  @param  expireAt        New expiration timestamp.
     */
    event EstateExpirationExtension(
        uint256 indexed estateId,
        uint40 expireAt
    );

    /**
     *  @notice Emitted when an estate is extracted.
     *
     *          Name            Description
     *  @param  estateId        Estate identifier.
     *  @param  extractionId    Extraction identifier.
     */
    event EstateExtraction(
        uint256 indexed estateId,
        uint256 indexed extractionId
    );


    /** ===== ERROR ===== **/
    error InvalidCustodian();
    error InvalidEstateId();
    error InvalidURI();
    error InvalidTokenizer();


    /** ===== FUNCTION ===== **/
    /* --- Dependency --- */
    /**
     *          Name                Description
     *  @return commissionToken     `CommissionToken` contract address.
     */
    function commissionToken() external view returns (address commissionToken);

    /**
     *          Name                Description
     *  @return feeReceiver         `FeeReceiver` contract address.
     */
    function feeReceiver() external view returns (address feeReceiver);


    /* --- Query --- */
    /**
     *          Name            Description
     *  @return estateNumber    Number of estates.
     */
    function estateNumber() external view returns (uint256 estateNumber);

    /**
     *          Name            Description
     *  @param  estateId        Estate identifier.
     *  @return estate          Estate information.
     */
    function getEstate(
        uint256 estateId
    ) external view returns (Estate memory estate);


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
     *  @return isExtractor     Whether the account is an authorized extractor contract.
     */
    function isExtractor(
        address account
    ) external view returns (bool isExtractor);

    /**
     *          Name            Description
     *  @param  account         EVM address.
     *  @return isTokenizer     Whether the account is an authorized tokenizer contract.
     */
    function isTokenizer(
        address account
    ) external view returns (bool isTokenizer);


    /**
     *          Name            Description
     *  @param  zone            Zone code.
     *  @param  account         EVM address.
     *  @return uri             URI of custodian information.
     */
    function custodianURIs(
        bytes32 zone,
        address account
    ) external view returns (string memory uri);

    /**
     *          Name            Description
     *  @param  zone            Zone code.
     *  @param  account         EVM address.
     *  @return isCustodian     Whether the account is a registered custodian in the zone.
     */
    function isCustodianIn(
        bytes32 zone,
        address account
    ) external view returns (bool isCustodian);


    /* --- Command --- */
    /**
     *  @notice Register a custodian in a zone.
     *
     *          Name            Description
     *  @param  zone            Zone code.
     *  @param  custodian       Custodian address.
     *  @param  uri             URI of custodian information.
     *  @param  validation      Validation package from the validator.
     *
     *  @dev    Permission: Managers active in the zone.
     *  @dev    Validation data:
     *          ```
     *          data = abi.encode(
     *              zone,
     *              custodian,
     *              uri
     *          );
     *          ```
     */
    function registerCustodian(
        bytes32 zone,
        address custodian,
        string calldata uri,
        Validation calldata validation
    ) external;


    /**
     *  @notice Tokenize an estate into a new class of token.
     *
     *          Name                Description
     *  @param  totalSupply         Number of tokens to mint.
     *  @param  zone                Zone code.
     *  @param  tokenizationId      Tokenization identifier from the tokenizer contract.
     *  @param  uri                 URI of estate metadata.
     *  @param  expireAt            Estate expiration timestamp.
     *  @param  custodian           Assigned custodian address.
     *  @param  broker              Associated broker address.
     *  @return estateId            New estate identifier.
     *
     *  @dev    Permission: Tokenizers.
     */
    function tokenizeEstate(
        uint256 totalSupply,
        bytes32 zone,
        uint256 tokenizationId,
        string calldata uri,
        uint40 expireAt,
        address custodian,
        address broker
    ) external returns (uint256 estateId);

    /**
     *  @notice Extract an estate.
     *
     *          Name            Description
     *  @param  estateId        Estate identifier.
     *  @param  extractionId    Extraction identifier.
     *
     *  @dev    Permission: Extractors.
     */
    function extractEstate(
        uint256 estateId,
        uint256 extractionId
    ) external;


    /* --- Safe Command --- */
    /**
     *  @notice Deprecate an estate by managers due to force majeure or extraction.
     *
     *          Name        Description
     *  @param  estateId    Estate identifier.
     *  @param  note        Deprecation note.
     *  @param  anchor      Keccak256 hash of `uri` of the estate.
     *
     *  @dev    Permission: Managers active in the zone of the estate.
     *  @dev    Anchor enforces consistency between this contract and the client-side.
     */
    function safeDeprecateEstate(
        uint256 estateId,
        string calldata note,
        bytes32 anchor
    ) external;

    /**
     *  @notice Extend the expiration of an estate.
     *
     *          Name        Description
     *  @param  estateId    Estate identifier.
     *  @param  expireAt    New expiration timestamp.
     *  @param  anchor      Keccak256 hash of `uri` of the estate.
     *
     *  @dev    Permission: Managers active in the zone of the estate.
     *  @dev    Anchor enforces consistency between this contract and the client-side.
     */
    function safeExtendEstateExpiration(
        uint256 estateId,
        uint40 expireAt,
        bytes32 anchor
    ) external;

    /**
     *  @notice Update the custodian of an estate.
     *
     *          Name        Description
     *  @param  estateId    Estate identifier.
     *  @param  custodian   New custodian address.
     *  @param  anchor      Keccak256 hash of `uri` of the estate.
     *
     *  @dev    Permission: Managers active in the zone of the estate.
     *  @dev    Anchor enforces consistency between this contract and the client-side.
     */
    function safeUpdateEstateCustodian(
        uint256 estateId,
        address custodian,
        bytes32 anchor
    ) external;

    /**
     *  @notice Update the URI of metadata of an estate.
     *
     *          Name        Description
     *  @param  estateId    Estate identifier.
     *  @param  uri         New URI of estate metadata.
     *  @param  validation  Validation package from the validator.
     *  @param  anchor      Keccak256 hash of `uri` of the estate.
     *
     *  @dev    Permission: Managers active in the zone of the estate.
     *  @dev    Validation data:
     *          ```
     *          data = abi.encode(
     *              estateId,
     *              uri
     *          );
     *          ```
     *  @dev    Anchor enforces consistency between this contract and the client-side.
     */
    function safeUpdateEstateURI(
        uint256 estateId,
        string calldata uri,
        Validation calldata validation,
        bytes32 anchor
    ) external;
}
