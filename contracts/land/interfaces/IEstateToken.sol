// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import {IERC1155MetadataURIUpgradeable} from "@openzeppelin/contracts-upgradeable/interfaces/IERC1155MetadataURIUpgradeable.sol";

import {IAssetToken} from "../../common/interfaces/IAssetToken.sol";
import {IRoyaltyRateProposer} from "../../common/interfaces/IRoyaltyRateProposer.sol";
import {IValidatable} from "../../common/interfaces/IValidatable.sol";

import {ISnapshot} from "../../common/structs/ISnapshot.sol";
import {IValidation} from "../../common/structs/IValidation.sol";

import {IEstate} from "../structs/IEstate.sol";

/**
 *  @author Briky Team
 *
 *  @notice Interface for contract `EstateToken`.
 *  @notice The `EstateToken` contract securitizes real-world estate assets into fungible ERC-1155 tokens, where each
 *          token class represents fractional ownership of a specific tokenized estate.
 *
 *  @dev    Estate information that has been tokenized includes management zones, custodian arrangements, and ownership
 *          terms. Custodian addresses belong to official disclosed third party custodian agents, registered in the zone
 *          to hold custody of the estate on behalf of holders.
 * 
 *  @dev    Implementation involves server-side support.
 *  @dev    ERC-20 tokens are identified by their contract addresses.
 *          Native coin is represented by the zero address (0x0000000000000000000000000000000000000000).
 *  @dev    Quantities are expressed in absolute units. Scale these values by `10 ** EstateToken.decimals()` to obtain
 *          the correct amounts under the `EstateToken` convention.
 */
interface IEstateToken is
IEstate,
ISnapshot,
IValidatable,
IRoyaltyRateProposer,
IAssetToken {
    /** ===== EVENT ===== **/
    /**
     *  @notice Emitted when the commission token address is updated.
     *
     *          Name            Description
     *  @param  newAddress      New commission token address.
     */
    event CommissionTokenUpdate(
        address newAddress
    );

    /**
     *  @notice Emitted when base URI is updated.
     *
     *          Name            Description
     *  @param  newValue        New base URI value.
     */
    event BaseURIUpdate(
        string newValue
    );

    /**
     *  @notice Emitted when zone royalty rate is updated.
     *
     *          Name            Description
     *  @param  zone            Zone code.
     *  @param  newRate         New royalty rate for the zone.
     */
    event ZoneRoyaltyRateUpdate(
        bytes32 indexed zone,
        Rate newRate
    );

    /**
     *  @notice Emitted when a tokenizer is authorized.
     *
     *          Name            Description
     *  @param  account         Tokenizer address.
     */
    event TokenizerAuthorization(address indexed account);

    /**
     *  @notice Emitted when a tokenizer is deauthorized.
     *
     *          Name            Description
     *  @param  account         Tokenizer address.
     */
    event TokenizerDeauthorization(address indexed account);

    /**
     *  @notice Emitted when an extractor is authorized.
     *
     *          Name            Description
     *  @param  account         Extractor address.
     */
    event ExtractorAuthorization(address indexed account);

    /**
     *  @notice Emitted when an extractor is deauthorized.
     *
     *          Name            Description
     *  @param  account         Extractor address.
     */
    event ExtractorDeauthorization(address indexed account);

    /**
     *  @notice Emitted when a custodian is registered in a zone.
     *
     *          Name            Description
     *  @param  zone            Zone code.
     *  @param  custodian       Custodian address.
     *  @param  uri             URI of custodian information.
     */
    event CustodianRegistration(
        bytes32 indexed zone,
        address indexed custodian,
        string uri
    );

    /**
     *  @notice Emitted when a new estate token is minted.
     *
     *          Name                Description
     *  @param  tokenId             Estate identifier.
     *  @param  zone                Zone code.
     *  @param  tokenizationId      Tokenization request identifier.
     *  @param  tokenizer           Tokenizer contract address.
     *  @param  custodian           Custodian address.
     *  @param  expireAt            Estate expiration timestamp.
     */
    event NewToken(
        uint256 indexed tokenId,
        bytes32 indexed zone,
        uint256 indexed tokenizationId,
        address tokenizer,
        address custodian,
        uint40 expireAt
    );

    /* --- Estate Management --- */
    /**
     *  @notice Emitted when an estate custodian is updated.
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
     *  @notice Emitted when an estate is deprecated by managers due to force majeure or extraction.
     *
     *          Name            Description
     *  @param  estateId        Estate identifier.
     */
    event EstateDeprecation(
        uint256 indexed estateId
    );

    /**
     *  @notice Emitted when an estate expiration is extended.
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
    error InvalidTokenizer(address account);


    /** ===== FUNCTION ===== **/
    /* --- Query --- */
    /**
     *          Name            Description
     *  @return decimals        Token decimals.
     */
    function decimals() external view returns (uint8 decimals);

    /**
     *          Name                Description
     *  @return commissionToken     Commission token contract address.
     */
    function commissionToken() external view returns (address commissionToken);

    /**
     *          Name            Description
     *  @return feeReceiver     Fee receiver address.
     */
    function feeReceiver() external view returns (address feeReceiver);

    /**
     *          Name            Description
     *  @return tokenNumber     Number of estate tokens minted.
     */
    function estateNumber() external view returns (uint256 tokenNumber);

    /**
     *          Name            Description
     *  @param  account         EVM address.
     *  @return isTokenizer     Whether the account is an authorized tokenizer.
     */
    function isTokenizer(
        address account
    ) external view returns (bool isTokenizer);

    /**
     *          Name            Description
     *  @param  account         EVM address.
     *  @return isExtractor     Whether the account is an authorized extractor.
     */
    function isExtractor(
        address account
    ) external view returns (bool isExtractor);

    /**
     *          Name            Description
     *  @param  _zone           Zone code.
     *  @return royaltyRate     Royalty rate of the zone.
     */
    function getZoneRoyaltyRate(
        bytes32 _zone
    ) external view returns (Rate memory royaltyRate);

    /**
     *          Name            Description
     *  @param  zone            Zone code.
     *  @param  account         EVM address.
     *  @return uri             URI of custodian information.
     */
    function custodianURI(
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

    /**
     *          Name            Description
     *  @param  account         EVM address.
     *  @param  tokenId         Estate identifier.
     *  @param  at              Reference timestamp.
     *  @return balance         Balance of the account in the estate at the reference timestamp.
     */
    function balanceOfAt(
        address account,
        uint256 tokenId,
        uint256 at
    ) external view returns (uint256 balance);

    /**
     *          Name            Description
     *  @param  tokenId         Estate identifier.
     *  @return totalSupply     Total supply.
     */
    function totalSupply(
        uint256 tokenId
    ) external view returns (uint256 totalSupply);

    /**
     *          Name            Description
     *  @param  estateId        Estate identifier.
     *  @return tokenInfo       Estate information.
     */
    function getEstate(
        uint256 estateId
    ) external view returns (Estate memory tokenInfo);


    /* --- Command --- */
    /**
     *  @notice TODO: Register a custodian in a zone
     *
     *          Name            Description
     *  @param  zone            Zone code.
     *  @param  custodian       Custodian address.
     *  @param  uri             URI of custodian information.
     *  @param  validation      Validation package from the validator.
     *
     *  @dev    Validation data:
     *          ```
     *          data = abi.encode(
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
     *  @notice TODO: Tokenize an estate
     *
     *          Name                Description
     *  @param  totalSupply         Number of tokens to mint.
     *  @param  zone                Zone code.
     *  @param  tokenizationId      Tokenization request identifier.
     *  @param  uri                 URI of estate metadata.
     *  @param  expireAt            Estate expiration timestamp.
     *  @param  custodian           Custodian address.
     *  @param  broker              Broker address to mint commission tokens.
     *  @return estateId            New estate identifier.
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
     *  @notice TODO: Deprecate an estate by managers due to force majeure or extraction.
     *
     *          Name            Description
     *  @param  estateId        Estate identifier.
     */
    function deprecateEstate(
        uint256 estateId
    ) external;

    /**
     *  @notice TODO: Extend the expiration of estate.
     *
     *          Name            Description
     *  @param  estateId        Estate identifier.
     *  @param  expireAt        New expiration timestamp.
     */
    function extendEstateExpiration(
        uint256 estateId,
        uint40 expireAt
    ) external;

    /**
     *  @notice TODO: Update the custodian of an estate.
     *
     *          Name            Description
     *  @param  estateId        Estate identifier.
     *  @param  custodian       New custodian address.
     */
    function updateEstateCustodian(
        uint256 estateId,
        address custodian
    ) external;

    /**
     *  @notice TODO: Update the metadata URI of an estate.
     *
     *          Name            Description
     *  @param  estateId        Estate identifier.
     *  @param  uri             New estate metadata URI.
     *  @param  validation      Validation package from the validator.
     *
     *  @dev    Validation data:
     *          ```
     *          data = abi.encode(
     *              estateId,
     *              uri
     *          );
     *          ```
     */
    function updateEstateURI(
        uint256 estateId,
        string calldata uri,
        Validation calldata validation
    ) external;

    /**
     *  @notice TODO: Mark an estate as extracted.
     *
     *          Name            Description
     *  @param  requestId       Tokenization request identifier.
     *  @param  extractionId    Extraction identifier.
     */
    function extractEstate(
        uint256 requestId,
        uint256 extractionId
    ) external;
}
