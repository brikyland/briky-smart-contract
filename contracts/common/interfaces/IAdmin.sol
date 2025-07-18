// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ICurrencyRegistry} from "../structs/ICurrencyRegistry.sol";

interface IAdmin is ICurrencyRegistry {
    event AdminSignaturesVerification(
        bytes message,
        uint256 nonce,
        bytes[] signatures
    );

    event Administration1Transfer(address newAdmin1);
    event Administration2Transfer(address newAdmin2);
    event Administration3Transfer(address newAdmin3);
    event Administration4Transfer(address newAdmin4);
    event Administration5Transfer(address newAdmin5);

    event ManagerAuthorization(address indexed account);
    event ManagerDeauthorization(address indexed account);

    event ModeratorAuthorization(address indexed account);
    event ModeratorDeauthorization(address indexed account);

    event GovernorAuthorization(address indexed account);
    event GovernorDeauthorization(address indexed account);

    event ZoneAnnouncement(bytes32 indexed zone);
    event ZoneRenouncement(bytes32 indexed zone);

    event Activation(bytes32 indexed zone, address indexed account);
    event Deactivation(bytes32 indexed zone, address indexed account);

    event CurrencyRegistryUpdate(
        address indexed currency,
        bool isAvailable,
        bool isExclusive
    );

    error Activated(address account);
    error AuthorizedAccount(address account);
    error AuthorizedZone(bytes32 zone);
    error CannotSelfDeauthorizing();
    error FailedVerification();
    error InvalidGovernor();
    error InvalidInput();
    error InvalidSignatureNumber();
    error NotActivated(address account);
    error NotAuthorizedAccount(address account);
    error NotAuthorizedZone(bytes32 zone);
    error Unauthorized();

    function version() external pure returns (string memory version);

    function admin1() external view returns (address admin1);
    function admin2() external view returns (address admin2);
    function admin3() external view returns (address admin3);
    function admin4() external view returns (address admin4);
    function admin5() external view returns (address admin5);
    function nonce() external view returns (uint256 nonce);

    function isExecutive(address account) external view returns (bool isExecutive);
    function isGovernor(address account) external view returns (bool isGovernor);
    function isManager(address account) external view returns (bool isManager);
    function isModerator(address account) external view returns (bool isModerator);
    function isZone(bytes32 value) external view returns (bool isZone);

    function getZoneEligibility(bytes32 zone, address account) external view returns (bool isEligible);
    function isActiveIn(bytes32 zone, address account) external view returns (bool isActive);

    function getCurrencyRegistry(address currency) external view returns (CurrencyRegistry memory currencyRegistry);
    function isAvailableCurrency(address currency) external view returns (bool isAvailable);
    function isExclusiveCurrency(address currency) external view returns (bool isExclusive);

    function verifyAdminSignatures(
        bytes memory message,
        bytes[] calldata _signatures
    ) external;
}
