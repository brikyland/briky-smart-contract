// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";

import {Constant} from "../lib/Constant.sol";
import {Signature} from "../lib/Signature.sol";

import {AdminStorage} from "./storages/AdminStorage.sol";

import {AggregatorV3Interface} from "@chainlink/contracts/src/v0.8/shared/interfaces/AggregatorV3Interface.sol";

contract Admin is
AdminStorage,
Initializable {
    string constant private VERSION = "v1.1.1";

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
        uint256 counter = 0;

        if (Signature.verify(admin1, _message, currentNonce, _signatures[0])) counter++;
        if (Signature.verify(admin2, _message, currentNonce, _signatures[1])) counter++;
        if (Signature.verify(admin3, _message, currentNonce, _signatures[2])) counter++;
        if (Signature.verify(admin4, _message, currentNonce, _signatures[3])) counter++;
        if (Signature.verify(admin5, _message, currentNonce, _signatures[4])) counter++;

        if (counter < Constant.ADMIN_SIGNATURE_VERIFICATION_QUORUM) {
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
            for (uint256 i = 0; i < _accounts.length; ++i) {
                if (isManager[_accounts[i]]) {
                    revert AuthorizedAccount(_accounts[i]);
                }
                isManager[_accounts[i]] = true;
                emit ManagerAuthorization(_accounts[i]);
            }
        } else {
            for (uint256 i = 0; i < _accounts.length; ++i) {
                if (!isManager[_accounts[i]]) {
                    revert NotAuthorizedAccount(_accounts[i]);
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
            for (uint256 i = 0; i < _accounts.length; ++i) {
                if (isModerator[_accounts[i]]) {
                    revert AuthorizedAccount(_accounts[i]);
                }
                isModerator[_accounts[i]] = true;
                emit ModeratorAuthorization(_accounts[i]);
            }
        } else {
            for (uint256 i = 0; i < _accounts.length; ++i) {
                if (!isModerator[_accounts[i]]) {
                    revert NotAuthorizedAccount(_accounts[i]);
                }
                isModerator[_accounts[i]] = false;
                emit ModeratorDeauthorization(_accounts[i]);
            }
        }
    }

    function declareZones(
        bytes32[] calldata _zones,
        bool _isZone,
        bytes[] calldata _signatures
    ) external {
        verifyAdminSignatures(
            abi.encode(
                address(this),
                "declareZones",
                _zones,
                _isZone
            ),
            _signatures
        );

        if (_isZone) {
            for (uint256 i = 0; i < _zones.length; ++i) {
                if (isZone[_zones[i]]) {
                    revert AuthorizedZone(_zones[i]);
                }
                isZone[_zones[i]] = true;
                emit ZoneAnnouncement(_zones[i]);
            }
        } else {
            for (uint256 i = 0; i < _zones.length; ++i) {
                if (!isZone[_zones[i]]) {
                    revert NotAuthorizedZone(_zones[i]);
                }
                isZone[_zones[i]] = false;
                emit ZoneRenouncement(_zones[i]);
            }
        }
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

        if (_isActive) {
            for (uint256 i = 0; i < _accounts.length; ++i) {
                if (isActiveIn[_zone][_accounts[i]]) {
                    revert Activated(_accounts[i]);
                }
                isActiveIn[_zone][_accounts[i]] = true;
                emit ZoneActivation(_zone, _accounts[i]);
            }
        } else {
            for (uint256 i = 0; i < _accounts.length; ++i) {
                if (!isActiveIn[_zone][_accounts[i]]) revert NotActivated(_accounts[i]);
                isActiveIn[_zone][_accounts[i]] = false;
                emit ZoneDeactivation(_zone, _accounts[i]);
            }
        }
    }

    function getCurrencyRegistry(address _currency) external view returns (CurrencyRegistry memory) {
        return currencyRegistries[_currency];
    }

    function getZoneEligibility(bytes32 _zone, address _account) external view returns (bool) {
        return isZone[_zone] && isActiveIn[_zone][_account];
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
            || _currencies.length != _isExclusive.length) revert InvalidInput();

        for (uint256 i = 0; i < _currencies.length; ++i) {
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
    
    function updatePriceFeeds(
        address[] calldata _currencies,
        address[] calldata _feed,
        uint40[] calldata _heartbeats,
        bytes[] calldata _signatures
    ) external {
        verifyAdminSignatures(
            abi.encode(
                address(this),
                "updatePriceFeeds",
                _currencies,
                _feed,
                _heartbeats                           
            ),
            _signatures
        );

        if (_currencies.length != _feed.length) {
            revert InvalidInput();
        }

        for(uint256 i = 0; i < _currencies.length; ++i) {
            currencyPriceFeeds[_currencies[i]] = PriceFeedInfo(
                _feed[i],
                _heartbeats[i]
            );
            emit CurrencyPriceFeedUpdate(
                _currencies[i],
                _feed[i],
                _heartbeats[i]
            );
        }
    }

    function getCurrencyBasePrice(address _currency) external view returns (CurrencyBasePrice memory) {
        PriceFeedInfo memory info = currencyPriceFeeds[_currency];

        if (info.feed == address(0)) {
            revert InvalidInput();
        }

        (, int256 currencyBasePrice, , uint256 updatedAt, ) = AggregatorV3Interface(info.feed).latestRoundData();
        
        if (currencyBasePrice <= 0) {
            revert InvalidCurrencyBasePrice(_currency);
        }

        if (block.timestamp - updatedAt > info.heartbeat) {
            revert StalePriceFeed(_currency);
        }

        uint8 currencyBasePriceDecimals = AggregatorV3Interface(info.feed).decimals();

        return CurrencyBasePrice(uint256(currencyBasePrice), currencyBasePriceDecimals);
    }
}
