// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IERC165Upgradeable} from "@openzeppelin/contracts-upgradeable/interfaces/IERC165Upgradeable.sol";
import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import {ERC165CheckerUpgradeable} from "@openzeppelin/contracts-upgradeable/utils/introspection/ERC165CheckerUpgradeable.sol";

import {Signature} from "./utilities/Signature.sol";

import {IGovernor} from "./interfaces/IGovernor.sol";

import {AdminConstant} from "./constants/AdminConstant.sol";

import {AdminStorage} from "./storages/AdminStorage.sol";

contract Admin is
AdminStorage,
Initializable {
    using ERC165CheckerUpgradeable for address;

    string constant private VERSION = "v1.2.1";

    receive() external payable {}

    function initialize(
        address _admin1,
        address _admin2,
        address _admin3,
        address _admin4,
        address _admin5
    ) external initializer {
        admin1 = _admin1;
        admin2 = _admin2;
        admin3 = _admin3;
        admin4 = _admin4;
        admin5 = _admin5;

        isManager[msg.sender] = true;
        isManager[admin1] = true;
        isManager[admin2] = true;
        isManager[admin3] = true;
        isManager[admin4] = true;
        isManager[admin5] = true;
    }

    function version() external pure returns (string memory) {
        return VERSION;
    }

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

    function authorizeGovernor(
        address[] calldata _accounts,
        bool _isGovernor,
        bytes[] calldata _signatures
    ) external {
        verifyAdminSignatures(
            abi.encode(
                address(this),
                "authorizeGovernor",
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
                emit Activation(_zone, _accounts[i]);
            }
        } else {
            for (uint256 i; i < _accounts.length; ++i) {
                if (!isActiveIn[_zone][_accounts[i]]) {
                    revert NotActivatedAccount();
                }
                isActiveIn[_zone][_accounts[i]] = false;
                emit Deactivation(_zone, _accounts[i]);
            }
        }
    }

    function isExecutive(address _account) external view returns (bool) {
        return isModerator[_account] || isManager[_account];
    }

    function getCurrencyRegistry(address _currency) external view returns (CurrencyRegistry memory) {
        return currencyRegistries[_currency];
    }

    function isAvailableCurrency(address _currency) external view returns (bool) {
        return currencyRegistries[_currency].isAvailable;
    }

    function isExclusiveCurrency(address _currency) external view returns (bool) {
        return currencyRegistries[_currency].isExclusive;
    }

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
}
