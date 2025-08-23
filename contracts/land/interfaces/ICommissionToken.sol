// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IERC721MetadataUpgradeable} from "@openzeppelin/contracts-upgradeable/interfaces/IERC721MetadataUpgradeable.sol";
import {IERC4906Upgradeable} from "@openzeppelin/contracts-upgradeable/interfaces/IERC4906Upgradeable.sol";

import {ICommon} from "../../common/interfaces/ICommon.sol";
import {IRoyaltyRateProposer} from "../../common/interfaces/IRoyaltyRateProposer.sol";

import {IBrokerRegistry} from "../structs/IBrokerRegistry.sol";

interface ICommissionToken is
ICommon,
IBrokerRegistry,
IRoyaltyRateProposer,
IERC4906Upgradeable,
IERC721MetadataUpgradeable {
    event BaseURIUpdate(string newValue);
    event RoyaltyRateUpdate(Rate newValue);

    event BrokerRegistryUpdate(
        bytes32 indexed zone,
        address indexed broker,
        Rate commissionRate,
        uint40 expireAt
    );

    event NewToken(
        uint256 indexed tokenId,
        bytes32 indexed zone,
        address indexed broker
    );

    error AlreadyExpired();
    error AlreadyMinted();
    error InvalidBroker();
    error NotExpired();

    function estateToken() external view returns (address estateToken);
    function feeReceiver() external view returns (address feeReceiver);

    function totalSupply() external view returns (uint256 totalSupply);

    function getBrokerRegistry(bytes32 zone, address broker)
    external view returns (BrokerRegistry memory brokerRegistry);

    function isBrokerIn(bytes32 zone, address broker) external view returns (bool isBroker);

    function getCommissionRate(uint256 tokenId) external view returns (Rate memory rate);

    function commissionInfo(uint256 tokenId, uint256 value)
    external view returns (address receiver, uint256 commissionAmount);

    function registerBroker(
        bytes32 zone,
        address broker,
        uint256 commissionRate,
        uint40 duration
    ) external;

    function mint(
        bytes32 zone,
        address broker,
        uint256 tokenId
    ) external;
}
