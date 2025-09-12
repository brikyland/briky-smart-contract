// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// contracts/common/structs/
import {ICurrencyRegistry} from "../structs/ICurrencyRegistry.sol";

/**
 *  @author Briky Team
 *
 *  @notice Interface for contract `Admin`.
 *  @notice A single `Admin` contract is responsible for governing the entire system with a designated group of administrator
 *          addresses. Any global configurations of contracts within the system must be verified by their signatures. This
 *          contract also maintains authorization registries and common configurations applied across the system.
 *
 *  @dev    ERC-20 tokens are identified by their contract addresses.
 *          Native coin is represented by the zero address (0x0000000000000000000000000000000000000000).
 */
interface IAdmin is
ICurrencyRegistry {
    /** ===== EVENT ===== **/
    /* --- Admin --- */
    /**
     *  @notice Emitted when a message is successfully verified with the current nonce and a set of admin signatures.
     *
     *          Name        Description
     *  @param  message     Message data bytes verified successfully.
     *  @param  nonce       Number used once combined with the message to prevent replay attacks.
     *  @param  message     Array of admin signatures generated from the message and the current nonce of the contract.
     */
    event AdminSignaturesVerification(
        bytes message,
        uint256 nonce,
        bytes[] signatures
    );

    /**
     *  @notice Emitted when admin #1 transfers administratorship to another address.
     *
     *          Name        Description
     *  @param  newAdmin1   New admin #1 address.
     */
    event Administration1Transfer(
        address newAdmin1
    );

    /**
     *  @notice Emitted when admin #2 transfers administratorship to another address.
     *
     *          Name        Description
     *  @param  newAdmin2   New admin #2 address.
     */
    event Administration2Transfer(
        address newAdmin2
    );

    /**
     *  @notice Emitted when admin #3 transfers administratorship to another address.
     *
     *          Name        Description
     *  @param  newAdmin3   New admin #3 address.
     */
    event Administration3Transfer(
        address newAdmin3
    );

    /**
     *  @notice Emitted when admin #4 transfers administratorship to another address.
     *
     *          Name        Description
     *  @param  newAdmin4   New admin #4 address.
     */
    event Administration4Transfer(
        address newAdmin4
    );

    /**
     *  @notice Emitted when admin #5 transfers administratorship to another address.
     *
     *          Name        Description
     *  @param  newAdmin5   New admin #5 address.
     */
    event Administration5Transfer(
        address newAdmin5
    );

    /* --- Zone --- */
    /**
     *  @notice Emitted when a new zone is declared.
     *
     *          Name        Description
     *  @param  zone        Zone code.
     */
    event ZoneDeclaration(
        bytes32 indexed zone
    );

    /**
     *  @notice Emitted when an external owned address is activated in a zone.
     *
     *          Name        Description
     *  @param  zone        Zone code.
     *  @param  account     Activated EOA.
     */
    event Activation(
        bytes32 indexed zone,
        address indexed account
    );

    /**
     *  @notice Emitted when an external owned address is deactivated in a zone.
     *
     *          Name        Description
     *  @param  zone        Zone code.
     *  @param  account     Deactivated EOA.
     */
    event Deactivation(
        bytes32 indexed zone,
        address indexed account
    );

    /* --- Manager --- */
    /**
     *  @notice Emitted when an external owned address is authorized to be manager.
     *
     *          Name        Description
     *  @param  account     Authorized EOA.
     */
    event ManagerAuthorization(
        address indexed account
    );

    /**
     *  @notice Emitted when a manager is deauthorized.
     *
     *          Name        Description
     *  @param  account     Deauthorized EOA.
     */
    event ManagerDeauthorization(
        address indexed account
    );

    /* --- Moderator --- */
    /**
     *  @notice Emitted when an external owned address is authorized to be moderator.
     *
     *          Name        Description
     *  @param  account     Authorized EOA.
     */
    event ModeratorAuthorization(
        address indexed account
    );

    /**
     *  @notice Emitted when a moderator is deauthorized.
     *
     *          Name        Description
     *  @param  account     Deauthorized EOA.
     */
    event ModeratorDeauthorization(
        address indexed account
    );

    /* --- Governor --- */
    /**
     *  @notice Emitted when a contract is authorized to be governor.
     *
     *          Name        Description
     *  @param  account     Authorized contract address.
     */
    event GovernorAuthorization(
        address indexed account
    );

    /**
     *  @notice Emitted when a governor is deauthorized.
     *
     *          Name        Description
     *  @param  account     Deauthorized contract address.
     */
    event GovernorDeauthorization(
        address indexed account
    );

    /* --- Currency --- */
    /**
     *  @notice Emitted when the registry of a currency is updated.
     *
     *          Name            Description
     *  @param  currency        Currency address.
     *  @param  isAvailable     Whether the currency is interactable within the system.
     *  @param  isExclusive     Whether the currency grants exclusive privileges within the system.
     */
    event CurrencyRegistryUpdate(
        address indexed currency,
        bool isAvailable,
        bool isExclusive
    );

    /** ===== ERROR ===== **/
    error ActivatedAccount();
    error AuthorizedAccount();
    error AuthorizedZone();
    error CannotSelfDeauthorizing();
    error FailedVerification();
    error InvalidGovernor();
    error InvalidInput();
    error InvalidSignatureNumber();
    error NotActivatedAccount();
    error NotAuthorizedAccount();
    error NotAuthorizedZone();
    error Unauthorized();

    /** ===== FUNCTION ===== **/
    /* --- Query --- */
    /**
     *          Name        Description
     *  @return version     Version of implementation.
     */
    function version() external pure returns (string memory version);


    /**
     *          Name        Description
     *  @return admin1      Admin #1 address.
     */
    function admin1() external view returns (address admin1);

    /**
     *          Name        Description
     *  @return admin2      Admin #2 address.
     */
    function admin2() external view returns (address admin2);

    /**
     *          Name        Description
     *  @return admin3      Admin #3 address.
     */
    function admin3() external view returns (address admin3);

    /**
     *          Name        Description
     *  @return admin4      Admin #4 address.
     */
    function admin4() external view returns (address admin4);

    /**
     *          Name        Description
     *  @return admin5      Admin #5 address.
     */
    function admin5() external view returns (address admin5);


    /**
     *          Name        Description
     *  @return nonce       Number used once in the next verification to prevent replay attacks.
     */
    function nonce() external view returns (uint256 nonce);


    /**
     *          Name            Description
     *  @param  account         EVM address.
     *  @return isExecutive     Whether the account is authorized to be manager or moderator.
     */
    function isExecutive(
        address account
    ) external view returns (bool isExecutive);

    /**
     *          Name            Description
     *  @param  account         Contract address.
     *  @return isGovernor      Whether the account is authorized to be governor.
     *
     *  @dev    Contract `account` must support `IGovernor` interface.
     */
    function isGovernor(
        address account
    ) external view returns (bool isGovernor);

    /**
     *          Name            Description
     *  @param  account         EVM address.
     *  @return isManager       Whether the account is authorized to be manager.
     */
    function isManager(
        address account
    ) external view returns (bool isManager);

    /**
     *          Name            Description
     *  @param  account         EVM address.
     *  @return isModerator     Whether the account is authorized to be moderator.
     */
    function isModerator(
        address account
    ) external view returns (bool isModerator);

    /**
     *          Name            Description
     *  @param  value           Zone code.
     *  @return isZone          Whether there is a zone declared with code `value`.
     */
    function isZone(
        bytes32 value
    ) external view returns (bool isZone);


    /**
     *          Name                Description
     *  @param  currency            Currency address.
     *  @return currencyRegistry    Interaction configuration of the currency.
     */
    function getCurrencyRegistry(
        address currency
    ) external view returns (CurrencyRegistry memory currencyRegistry);

    /**
     *          Name                Description
     *  @param  currency            Currency address.
     *  @return isAvailable         Whether the currency is interactable within the system.
     *
     *  @dev    Cryptocurrencies require authorization to be interactable to prevent unknown deceptive codes.
     */
    function isAvailableCurrency(
        address currency
    ) external view returns (bool isAvailable);

    /**
     *          Name                Description
     *  @param  currency            Currency address.
     *  @return isExclusive         Whether the currency grants exclusive privileges within the system.
     */
    function isExclusiveCurrency(
        address currency
    ) external view returns (bool isExclusive);


    /**
     *          Name            Description
     *  @param  zone            Zone code.
     *  @param  account         EVM address.
     *  @return isActive        Whether the account is eligible in the zone.
     */
    function isActiveIn(
        bytes32 zone,
        address account
    ) external view returns (bool isActive);

    /* --- Command --- */
    /**
     *  @notice Verify whether message and a set of signatures conform admin addresses and the current nonce of the contract.
     *  @notice After successful verification, the contract nonce is incremented by 1 for the next message.
     *
     *          Name        Description
     *  @param  message     Receiver address.
     *  @param  signatures  Array of admin signatures.
     *
     *  @dev    Only transactions whose original sender is a manager can request verification.
     *  @dev    Pseudo code of signature for `message` and `nonce`:
     *          ```
     *          signature = ethSign(
     *              keccak256(abi.encodePacked(
     *                  message,
     *                  nonce
     *              ))
     *          );
     *          ```
     */
    function verifyAdminSignatures(
        bytes memory message,
        bytes[] calldata signatures
    ) external;
}
