// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IERC721MetadataUpgradeable} from "@openzeppelin/contracts-upgradeable/interfaces/IERC721MetadataUpgradeable.sol";
import {IERC4906Upgradeable} from "@openzeppelin/contracts-upgradeable/interfaces/IERC4906Upgradeable.sol";

import {ICommon} from "../../common/interfaces/ICommon.sol";
import {IRoyaltyRateProposer} from "../../common/interfaces/IRoyaltyRateProposer.sol";

interface ICommissionToken is
ICommon,
IRoyaltyRateProposer,
IERC4906Upgradeable,
IERC721MetadataUpgradeable {
    event BaseURIUpdate(string newValue);
    event RoyaltyRateUpdate(Rate newRate);

    event BrokerRegistration(
        bytes32 indexed zone,
        address indexed broker,
        Rate commissionRate
    );
    event BrokerActivation(bytes32 indexed zone, address indexed broker);
    event BrokerDeactivation(bytes32 indexed zone, address indexed broker);

    event NewToken(
        uint256 indexed tokenId,
        bytes32 indexed zone,
        address indexed broker
    );

    error AlreadyMinted();
    error AlreadyRegistered();
    error InvalidBroker();
    error NotActive();

    function estateToken() external view returns (address estateToken);
    function feeReceiver() external view returns (address feeReceiver);

    function totalSupply() external view returns (uint256 totalSupply);

    function getBrokerCommissionRate(bytes32 zone, address broker) external view returns (Rate memory rate);
    function isActiveIn(bytes32 zone, address broker) external view returns (bool isBroker);

    function getCommissionRate(uint256 tokenId) external view returns (Rate memory rate);

    function commissionInfo(uint256 tokenId, uint256 value)
    external view returns (address receiver, uint256 commission);

    function registerBroker(
        bytes32 zone,
        address broker,
        uint256 commissionRate
    ) external;
    function activateBroker(
        bytes32 zone,
        address broker,
        bool isActive
    ) external;

    function mint(
        bytes32 zone,
        address broker,
        uint256 tokenId
    ) external;
}
