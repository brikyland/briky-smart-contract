// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IERC1155MetadataURIUpgradeable} from "@openzeppelin/contracts-upgradeable/interfaces/IERC1155MetadataURIUpgradeable.sol";

import {IRoyaltyRateProposer} from "../../common/interfaces/IRoyaltyRateProposer.sol";

import {IEstate} from "./IEstate.sol";

interface IEstateToken is
IEstate,
IRoyaltyRateProposer,
IERC1155MetadataURIUpgradeable {
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
        uint40 expireAt,
        uint8 decimals
    );
    event EstateDeprecation(uint256 indexed estateId);
    event EstateExpirationExtension(uint256 indexed estateId, uint40 expireAt);

    error Deprecated();
    error InvalidEstateId();
    error InvalidTokenizer(address account);

    function commissionToken() external view returns (address commissionToken);
    function feeReceiver() external view returns (address feeReceiver);

    function estateNumber() external view returns (uint256 tokenNumber);

    function balanceOfAt(address account, uint256 tokenId, uint256 at) external view returns (uint256 balance);
    function exists(uint256 tokenId) external view returns (bool existence);
    function totalSupply(uint256 tokenId) external view returns (uint256 totalSupply);

    function getEstate(uint256 estateId) external view returns (Estate memory tokenInfo);
    function isAvailable(uint256 estateId) external view returns (bool isAvailable);

    function tokenizeEstate(
        uint256 totalSupply,
        bytes32 zone,
        uint256 tokenizationId,
        string calldata uri,
        uint40 expireAt,
        uint8 decimals,
        address commissionReceiver
    ) external returns (uint256 estateId);
}
