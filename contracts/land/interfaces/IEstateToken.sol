// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IERC1155MetadataURIUpgradeable} from "@openzeppelin/contracts-upgradeable/interfaces/IERC1155MetadataURIUpgradeable.sol";

import {IGovernor} from "../../common/interfaces/IGovernor.sol";
import {IRoyaltyRateProposer} from "../../common/interfaces/IRoyaltyRateProposer.sol";
import {IValidatable} from "../../common/interfaces/IValidatable.sol";

import {ISnapshot} from "../../common/structs/ISnapshot.sol";
import {IValidation} from "../../common/structs/IValidation.sol";

import {IEstate} from "../structs/IEstate.sol";

interface IEstateToken is
IEstate,
ISnapshot,
IValidatable,
IRoyaltyRateProposer,
IGovernor,
IERC1155MetadataURIUpgradeable {
    event CommissionTokenUpdate(address newAddress);

    event BaseURIUpdate(string newValue);

    event ZoneRoyaltyRateUpdate(bytes32 indexed zone, Rate newRate);

    event TokenizerAuthorization(address indexed account);
    event TokenizerDeauthorization(address indexed account);

    event ExtractorAuthorization(address indexed account);
    event ExtractorDeauthorization(address indexed account);

    event CustodianRegistration(
        bytes32 indexed zone,
        address indexed custodian,
        string uri
    );

    event NewToken(
        uint256 indexed tokenId,
        bytes32 indexed zone,
        uint256 indexed tokenizationId,
        address tokenizer,
        address custodian,
        uint40 expireAt
    );
    event EstateCustodianUpdate(uint256 indexed estateId, address indexed custodian);
    event EstateDeprecation(uint256 indexed estateId);
    event EstateExpirationExtension(uint256 indexed estateId, uint40 expireAt);
    event EstateExtraction(uint256 indexed estateId, uint256 indexed extractionId);

    error InvalidCustodian();
    error InvalidEstateId();
    error InvalidURI();
    error InvalidTokenizer(address account);

    function decimals() external view returns (uint8 decimals);

    function commissionToken() external view returns (address commissionToken);
    function feeReceiver() external view returns (address feeReceiver);

    function estateNumber() external view returns (uint256 tokenNumber);

    function isTokenizer(address account) external view returns (bool isTokenizer);
    function isExtractor(address account) external view returns (bool isExtractor);

    function getZoneRoyaltyRate(bytes32 _zone) external view returns (Rate memory royaltyRate);

    function custodianURI(bytes32 zone, address account) external view returns (string memory uri);
    function isCustodianIn(bytes32 zone, address account) external view returns (bool isCustodian);

    function balanceOfAt(address account, uint256 tokenId, uint256 at) external view returns (uint256 balance);
    function totalSupply(uint256 tokenId) external view returns (uint256 totalSupply);

    function getEstate(uint256 estateId) external view returns (Estate memory tokenInfo);
    function zoneOf(uint256 estateId) external view returns (bytes32 zone);

    function registerCustodian(
        bytes32 zone,
        address custodian,
        string calldata uri,
        Validation calldata validation
    ) external;

    function tokenizeEstate(
        uint256 totalSupply,
        bytes32 zone,
        uint256 tokenizationId,
        string calldata uri,
        uint40 expireAt,
        address custodian,
        address broker
    ) external returns (uint256 estateId);

    function deprecateEstate(uint256 estateId) external;
    function extendEstateExpiration(uint256 estateId, uint40 expireAt) external;
    function updateEstateCustodian(uint256 estateId, address custodian) external;
    function updateEstateURI(
        uint256 estateId,
        string calldata uri,
        Validation calldata validation
    ) external;
    function extractEstate(uint256 requestId, uint256 extractionId) external;
}
