// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IERC1155MetadataURIUpgradeable} from "@openzeppelin/contracts-upgradeable/interfaces/IERC1155MetadataURIUpgradeable.sol";

import {IGovernor} from "../../common/interfaces/IGovernor.sol";
import {IProposal} from "../../common/interfaces/IProposal.sol";
import {IRoyaltyRateProposer} from "../../common/interfaces/IRoyaltyRateProposer.sol";
import {IValidation} from "../../common/interfaces/IValidation.sol";

import {IEstate} from "./IEstate.sol";
import {IValidatable} from "../../common/interfaces/IValidatable.sol";

interface IEstateToken is
IEstate,
IProposal,
IValidatable,
IGovernor,
IRoyaltyRateProposer,
IERC1155MetadataURIUpgradeable {
    struct Extraction {
        uint256 estateId;
        uint256 proposalId;
        uint256 value;
        address currency;
        address extractor;
    }

    event CommissionTokenUpdate(address newAddress);

    event BaseURIUpdate(string newValue);

    event RoyaltyRateUpdate(uint256 newValue);

    event TokenizerAuthorization(address indexed account);
    event TokenizerDeauthorization(address indexed account);

    event NewToken(
        uint256 indexed tokenId,
        bytes32 indexed zone,
        uint256 indexed tokenizationId,
        address tokenizer,
        uint40 tokenizeAt,
        uint40 expireAt
    );
    event EstateDeprecation(uint256 indexed estateId);
    event EstateExpirationExtension(uint256 indexed estateId, uint40 expireAt);
    event EstateExtraction(uint256 indexed estateId, uint256 indexed extractionId);

    event NewExtraction(
        uint256 indexed extractionId,
        uint256 indexed estateId,
        uint256 indexed proposalId,
        address extractor,
        uint256 value,
        address currency
    );
    event ExtractionCancellation(uint256 indexed extractionId);

    error Cancelled();
    error Deprecated();
    error InvalidEstateId();
    error InvalidExtractionConclusion();
    error InvalidExtractionId();
    error InvalidTokenizer(address account);
    error UnavailableEstate();

    function decimals() external view returns (uint8 decimals);

    function commissionToken() external view returns (address commissionToken);
    function dividendHub() external view returns (address dividendHub);
    function feeReceiver() external view returns (address feeReceiver);
    function governanceHub() external view returns (address governanceHub);

    function estateNumber() external view returns (uint256 tokenNumber);
    function extractionNumber() external view returns (uint256 extractionNumber);

    function balanceOfAt(address account, uint256 tokenId, uint256 at) external view returns (uint256 balance);
    function totalSupply(uint256 tokenId) external view returns (uint256 totalSupply);

    function getEstate(uint256 estateId) external view returns (Estate memory tokenInfo);

    function tokenizeEstate(
        uint256 totalSupply,
        bytes32 zone,
        uint256 tokenizationId,
        string calldata uri,
        uint40 expireAt,
        address commissionReceiver
    ) external returns (uint256 estateId);

    function deprecateEstate(uint256 estateId) external;
    function extendEstateExpiration(uint256 estateId, uint40 expireAt) external;
    function updateEstateURI(
        uint256 estateId,
        string calldata uri,
        Validation calldata validation
    ) external;

    function requestExtraction(
        uint256 estateId,
        uint256 value,
        address currency,
        bytes32 uuid,
        Validation calldata validation
    ) external returns (uint256 extractionId);

    function concludeExtraction(uint256 extractionId) external returns (bool isSuccessful);
}
