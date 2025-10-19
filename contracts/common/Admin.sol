// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

/// @openzeppelin/contracts-upgradeable/
import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import {ERC165CheckerUpgradeable} from "@openzeppelin/contracts-upgradeable/utils/introspection/ERC165CheckerUpgradeable.sol";

/// contracts/common/constants/
import {AdminConstant} from "./constants/AdminConstant.sol";

/// contracts/common/interfaces/
import {IGovernor} from "./interfaces/IGovernor.sol";

/// contracts/common/storages/
import {AdminStorage} from "./storages/AdminStorage.sol";

/// contracts/common/utilities/
import {Signature} from "./utilities/Signature.sol";

/**
 *  @author Briky Team
 *
 *  @notice A single `Admin` contract is responsible for governing the entire system with a designated group of administrator
 *          addresses. Any global configurations of contracts within the system must be verified by their signatures. This
 *          contract also maintains authorization registries and common configurations applied across the system.
 *
 *  @dev    ERC-20 tokens are identified by their contract addresses.
 *          Native coin is represented by the zero address (0x0000000000000000000000000000000000000000).
 */
contract Admin is
AdminStorage,
Initializable {
    /** ===== LIBRARY ===== **/
    using ERC165CheckerUpgradeable for address;


    /** ===== CONSTANT ===== **/
    string constant private VERSION = "v1.2.1";


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
     *  @param  _admin1     Admin #1 address.
     *  @param  _admin2     Admin #2 address.
     *  @param  _admin3     Admin #3 address.
     *  @param  _admin4     Admin #4 address.
     *  @param  _admin5     Admin #5 address.
     */
    function initialize(
        address _admin1,
        address _admin2,
        address _admin3,
        address _admin4,
        address _admin5
    ) external
    initializer {
        /// Configuration
        admin1 = _admin1;
        admin2 = _admin2;
        admin3 = _admin3;
        admin4 = _admin4;
        admin5 = _admin5;

        /// Authorization
        isManager[msg.sender] = true;
        isManager[admin1] = true;
        isManager[admin2] = true;
        isManager[admin3] = true;
        isManager[admin4] = true;
        isManager[admin5] = true;
    }


    /* --- Administration --- */
    /**
     *  @notice Verify a message and a set of signatures conform admin addresses and the current nonce of this contract.
     *  @notice After successful verification, the nonce is incremented by 1 for the next message.
     *
     *          Name            Description
     *  @param  _message        Message bytes to verify.
     *  @param  _signatures     Array of admin signatures.
     *
     *  @dev    Only transactions whose original sender is a manager can request verification.
     *  @dev    Pseudo code of signature for `_message` and `nonce`:
     *          ```
     *          signature = ethSign(
     *              keccak256(abi.encodePacked(
     *                  _message,
     *                  nonce
     *              ))
     *          );
     *          ```
     */
    function verifyAdminSignatures(
        bytes memory _message,
        bytes[] calldata _signatures
    ) public {
        if (!isManager[tx.origin]) {
            revert Unauthorized();
        }
        if (_signatures.length != 5) {
            revert InvalidSignatureNumber();
        }

        uint256 currentNonce = nonce++;
        uint256 counter;

        if (Signature.verify(admin1, _message, currentNonce, _signatures[0])) counter++;
        if (Signature.verify(admin2, _message, currentNonce, _signatures[1])) counter++;
        if (Signature.verify(admin3, _message, currentNonce, _signatures[2])) counter++;
        if (Signature.verify(admin4, _message, currentNonce, _signatures[3])) counter++;
        if (Signature.verify(admin5, _message, currentNonce, _signatures[4])) counter++;

        if (counter < AdminConstant.SIGNATURE_VERIFICATION_QUORUM) {
            revert FailedVerification();
        }

        emit AdminSignaturesVerification(
            _message,
            currentNonce,
            _signatures
        );
    }

    /**
     *  @notice Transfer admin #1 role to another address.
     *
     *          Name           Description
     *  @param  _admin1        New admin #1 address.
     *  @param  _signatures    Array of admin signatures.
     * 
     *  @dev    Administrative operator.
     */
    function transferAdministration1(
        address _admin1,
        bytes[] calldata _signatures
    ) external {
        verifyAdminSignatures(
            abi.encode(
                address(this),
                "transferAdministration1",
                _admin1
            ),
            _signatures
        );

        admin1 = _admin1;
        emit Administration1Transfer(_admin1);
    }

    /**
     *  @notice Transfer admin #2 role to another address.
     *
     *          Name           Description
     *  @param  _admin2        New admin #2 address.
     *  @param  _signatures    Array of admin signatures.
     * 
     *  @dev    Administrative operator.
     */
    function transferAdministration2(
        address _admin2,
        bytes[] calldata _signatures
    ) external {
        verifyAdminSignatures(
            abi.encode(
                address(this),
                "transferAdministration2",
                _admin2
            ),
            _signatures
        );

        admin2 = _admin2;
        emit Administration2Transfer(_admin2);
    }

    /**
     *  @notice Transfer admin #3 role to another address.
     *
     *          Name           Description
     *  @param  _admin3        New admin #3 address.
     *  @param  _signatures    Array of admin signatures.
     * 
     *  @dev    Administrative operator.
     */
    function transferAdministration3(
        address _admin3,
        bytes[] calldata _signatures
    ) external {
        verifyAdminSignatures(
            abi.encode(
                address(this),
                "transferAdministration3",
                _admin3
            ),
            _signatures
        );

        admin3 = _admin3;
        emit Administration3Transfer(_admin3);
    }

    /**
     *  @notice Transfer admin #4 role to another address.
     *
     *          Name           Description
     *  @param  _admin4        New admin #4 address.
     *  @param  _signatures    Array of admin signatures.
     * 
     *  @dev    Administrative operator.
     */
    function transferAdministration4(
        address _admin4,
        bytes[] calldata _signatures
    ) external {
        verifyAdminSignatures(
            abi.encode(
                address(this),
                "transferAdministration4",
                _admin4
            ),
            _signatures
        );

        admin4 = _admin4;
        emit Administration4Transfer(_admin4);
    }

    /**
     *  @notice Transfer admin #5 role to another address.
     *
     *          Name           Description
     *  @param  _admin5        New admin #5 address.
     *  @param  _signatures    Array of admin signatures.
     * 
     *  @dev    Administrative operator.
     */
    function transferAdministration5(
        address _admin5,
        bytes[] calldata _signatures
    ) external {
        verifyAdminSignatures(
            abi.encode(
                address(this),
                "transferAdministration5",
                _admin5
            ),
            _signatures
        );

        admin5 = _admin5;
        emit Administration5Transfer(_admin5);
    }


    /**
     *  @notice Authorize or deauthorize addresses as managers.
     *
     *          Name           Description
     *  @param  _accounts      Array of EVM addresses.
     *  @param  _isManager     This whether the operation is authorizing or deauthorizing.
     *  @param  _signatures    Array of admin signatures.
     * 
     *  @dev    Administrative operator.
     */
    function authorizeManagers(
        address[] calldata _accounts,
        bool _isManager,
        bytes[] calldata _signatures
    ) external {
        verifyAdminSignatures(
            abi.encode(
                address(this),
                "authorizeManagers",
                _accounts,
                _isManager
            ),
            _signatures
        );

        if (_isManager) {
            for (uint256 i; i < _accounts.length; ++i) {
                if (isManager[_accounts[i]]) {
                    revert AuthorizedAccount();
                }
                isManager[_accounts[i]] = true;
                emit ManagerAuthorization(_accounts[i]);
            }
        } else {
            for (uint256 i; i < _accounts.length; ++i) {
                if (!isManager[_accounts[i]]) {
                    revert NotAuthorizedAccount();
                }
                if (_accounts[i] == tx.origin) {
                    revert CannotSelfDeauthorizing();
                }
                isManager[_accounts[i]] = false;
                emit ManagerDeauthorization(_accounts[i]);
            }
        }
    }

    /**
     *  @notice Authorize or deauthorize addresses as moderators.
     *
     *          Name           Description
     *  @param  _accounts      Array of EVM addresses.
     *  @param  _isModerator   This whether the operation is authorizing or deauthorizing.
     *  @param  _signatures    Array of admin signatures.
     * 
     *  @dev    Administrative operator.
     */
    function authorizeModerators(
        address[] calldata _accounts,
        bool _isModerator,
        bytes[] calldata _signatures
    ) external {
        verifyAdminSignatures(
            abi.encode(
                address(this),
                "authorizeModerators",
                _accounts,
                _isModerator
            ),
            _signatures
        );

        if (_isModerator) {
            for (uint256 i; i < _accounts.length; ++i) {
                if (isModerator[_accounts[i]]) {
                    revert AuthorizedAccount();
                }
                isModerator[_accounts[i]] = true;
                emit ModeratorAuthorization(_accounts[i]);
            }
        } else {
            for (uint256 i; i < _accounts.length; ++i) {
                if (!isModerator[_accounts[i]]) {
                    revert NotAuthorizedAccount();
                }
                isModerator[_accounts[i]] = false;
                emit ModeratorDeauthorization(_accounts[i]);
            }
        }
    }

    /**
     *  @notice Authorize or deauthorize contract addresses as governors.
     *
     *          Name           Description
     *  @param  _accounts      Array of contract addresses.
     *  @param  _isGovernor    This whether the operation is authorizing or deauthorizing.
     *  @param  _signatures    Array of admin signatures.
     * 
     *  @dev    Administrative operator.
     */
    function authorizeGovernors(
        address[] calldata _accounts,
        bool _isGovernor,
        bytes[] calldata _signatures
    ) external {
        verifyAdminSignatures(
            abi.encode(
                address(this),
                "authorizeGovernors",
                _accounts,
                _isGovernor
            ),
            _signatures
        );

        if (_isGovernor) {
            for (uint256 i; i < _accounts.length; ++i) {
                if (isGovernor[_accounts[i]]) {
                    revert AuthorizedAccount();
                }
                if (!_accounts[i].supportsInterface(type(IGovernor).interfaceId)) {
                    revert InvalidGovernor();
                }
                isGovernor[_accounts[i]] = true;
                emit GovernorAuthorization(_accounts[i]);
            }
        } else {
            for (uint256 i; i < _accounts.length; ++i) {
                if (!isGovernor[_accounts[i]]) {
                    revert NotAuthorizedAccount();
                }
                isGovernor[_accounts[i]] = false;
                emit GovernorDeauthorization(_accounts[i]);
            }
        }
    }


    /**
     *  @notice Declare a new zone.
     *
     *          Name           Description
     *  @param  _zone          Zone code.
     *  @param  _signatures    Array of admin signatures.
     * 
     *  @dev    Administrative operator.
     */
    function declareZone(
        bytes32 _zone,
        bytes[] calldata _signatures
    ) external {
        verifyAdminSignatures(
            abi.encode(
                address(this),
                "declareZone",
                _zone
            ),
            _signatures
        );

        if (isZone[_zone]) {
            revert AuthorizedZone();
        }
        isZone[_zone] = true;
        emit ZoneDeclaration(_zone);
    }

    /**
     *  @notice Activate or deactivate addresses in a zone.
     *
     *          Name           Description
     *  @param  _zone          Zone code.
     *  @param  _accounts      Array of EVM addresses.
     *  @param  _isActive      Whether the operation is activating or deactivating.
     *  @param  _signatures    Array of admin signatures.
     * 
     *  @dev    Administrative operator.
     */
    function activateIn(
        bytes32 _zone,
        address[] calldata _accounts,
        bool _isActive,
        bytes[] calldata _signatures
    ) external {
        verifyAdminSignatures(
            abi.encode(
                address(this),
                "activateIn",
                _zone,
                _accounts,
                _isActive
            ),
            _signatures
        );

        if (!isZone[_zone]) {
            revert InvalidInput();
        }

        if (_isActive) {
            for (uint256 i; i < _accounts.length; ++i) {
                if (isActiveIn[_zone][_accounts[i]]) {
                    revert ActivatedAccount();
                }
                isActiveIn[_zone][_accounts[i]] = true;
                emit Activation(
                    _zone,
                    _accounts[i]
                );
            }
        } else {
            for (uint256 i; i < _accounts.length; ++i) {
                if (!isActiveIn[_zone][_accounts[i]]) {
                    revert NotActivatedAccount();
                }
                isActiveIn[_zone][_accounts[i]] = false;
                emit Deactivation(
                    _zone,
                    _accounts[i]
                );
            }
        }
    }


    /**
     *  @notice Update the registries of multiple currencies.
     *
     *          Name            Description
     *  @param  _currencies     Array of updated currency addresses.
     *  @param  _isAvailable    Whether the currency is interactable within the system, respectively for each currency.
     *  @param  _isExclusive    Whether the currency grants exclusive privileges within the system, respectively for each currency.
     *  @param  _signatures     Array of admin signatures.
     *
     *  @dev    Administrative operator.
     */
    function updateCurrencyRegistries(
        address[] calldata _currencies,
        bool[] calldata _isAvailable,
        bool[] calldata _isExclusive,
        bytes[] calldata _signatures
    ) external {
        verifyAdminSignatures(
            abi.encode(
                address(this),
                "updateCurrencyRegistries",
                _currencies,
                _isAvailable,
                _isExclusive
            ),
            _signatures
        );

        if (_currencies.length != _isAvailable.length
            || _currencies.length != _isExclusive.length) {
            revert InvalidInput();
        }

        for (uint256 i; i < _currencies.length; ++i) {
            currencyRegistries[_currencies[i]] = CurrencyRegistry(
                0,
                0,
                _isAvailable[i],
                _isExclusive[i]
            );
            emit CurrencyRegistryUpdate(
                _currencies[i],
                _isAvailable[i],
                _isExclusive[i]
            );
        }
    }


    /* --- Query --- */
    /**
     *          Name        Description
     *  @param  _account    EVM address.
     *
     *  @return Whether the account is an authorized manager or an authorized moderator.
     */
    function isExecutive(
        address _account
    ) external view returns (bool) {
        return isModerator[_account] || isManager[_account];
    }


    /**
     *          Name        Description
     *  @param  _currency   Currency address.
     *
     *  @return Interaction configuration of the currency.
     */
    function getCurrencyRegistry(
        address _currency
    ) external view returns (CurrencyRegistry memory) {
        return currencyRegistries[_currency];
    }

    /**
     *          Name        Description
     *  @param  _currency   Currency address.
     *
     *  @return Whether the currency is interactable within the system.
     *
     *  @dev    Cryptocurrencies require authorization to be interactable to prevent unknown deceptive codes.
     */
    function isAvailableCurrency(
        address _currency
    ) external view returns (bool) {
        return currencyRegistries[_currency].isAvailable;
    }

    /**
     *          Name        Description
     *  @param  _currency   Currency address.
     *
     *  @return Whether the currency grants exclusive privileges within the system.
     */
    function isExclusiveCurrency(
        address _currency
    ) external view returns (bool) {
        return currencyRegistries[_currency].isExclusive;
    }
}
