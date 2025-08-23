// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IERC165Upgradeable} from "@openzeppelin/contracts-upgradeable/interfaces/IERC165Upgradeable.sol";
import {IERC721MetadataUpgradeable} from "@openzeppelin/contracts-upgradeable/interfaces/IERC721MetadataUpgradeable.sol";
import {IERC4906Upgradeable} from "@openzeppelin/contracts-upgradeable/interfaces/IERC4906Upgradeable.sol";
import {ReentrancyGuardUpgradeable} from "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
import {ERC721Upgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC721/ERC721Upgradeable.sol";
import {ERC721PausableUpgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC721/extensions/ERC721PausableUpgradeable.sol";

import {CurrencyHandler} from "../lib/CurrencyHandler.sol";

import {IAdmin} from "../common/interfaces/IAdmin.sol";

import {CommonConstant} from "../common/constants/CommonConstant.sol";

import {Administrable} from "../common/utilities/Administrable.sol";
import {Pausable} from "../common/utilities/Pausable.sol";
import {RoyaltyRateProposer} from "../common/utilities/RoyaltyRateProposer.sol";

import {IPromotionToken} from "./interfaces/IPromotionToken.sol";

import {PromotionTokenStorage} from "./storages/PromotionTokenStorage.sol";

contract PromotionToken is
PromotionTokenStorage,
ERC721PausableUpgradeable,
Administrable,
Pausable,
RoyaltyRateProposer,
ReentrancyGuardUpgradeable {
    string constant private VERSION = "v1.1.1";

    receive() external payable {}

    function initialize(
        address _admin,
        string calldata _name,
        string calldata _symbol,
        uint256 _fee,
        uint256 _royaltyRate
    ) external initializer {
        __ERC721_init(_name, _symbol);
        __ERC721Pausable_init();

        __ReentrancyGuard_init();

        admin = _admin;

        fee = _fee;
        emit FeeUpdate(_fee);

        royaltyRate = _royaltyRate;
        emit RoyaltyRateUpdate(Rate(_royaltyRate, CommonConstant.RATE_DECIMALS));
    }

    function version() external pure returns (string memory) {
        return VERSION;
    }

    function updateFee(
        uint256 _fee,
        bytes[] calldata _signature
    ) external {
        IAdmin(admin).verifyAdminSignatures(
            abi.encode(
                address(this),
                "updateFee",
                _fee
            ),
            _signature
        );
        fee = _fee;
        emit FeeUpdate(_fee);
    }

    function updateRoyaltyRate(
        uint256 _royaltyRate,
        bytes[] calldata _signatures
    ) external {
        IAdmin(this.admin()).verifyAdminSignatures(
            abi.encode(
                address(this),
                "updateRoyaltyRate",
                _royaltyRate
            ),
            _signatures
        );
        if (_royaltyRate > CommonConstant.RATE_MAX_FRACTION) {
            revert InvalidRate();
        }
        royaltyRate = _royaltyRate;
        emit RoyaltyRateUpdate(Rate(_royaltyRate, CommonConstant.RATE_DECIMALS));
    }

    function withdraw(
        address _receiver,
        address[] calldata _currencies,
        uint256[] calldata _values,
        bytes[] calldata _signatures
    ) external nonReentrant {
        IAdmin(admin).verifyAdminSignatures(
            abi.encode(
                address(this),
                "withdraw",
                _receiver,
                _currencies,
                _values
            ),
            _signatures
        );

        if (_currencies.length != _values.length) {
            revert InvalidInput();
        }

        for (uint256 i; i < _currencies.length; ++i) {
            CurrencyHandler.sendCurrency(_currencies[i], _receiver, _values[i]);
        }
    }

    function getContent(uint256 _contentId) public view returns (Content memory) {
        if (_contentId == 0 || _contentId > contentNumber) {
            revert InvalidContentId();
        }
        return contents[_contentId];
    }

    function createContents(
        string[] calldata _uris,
        uint40[] calldata _startAts,
        uint40[] calldata _durations,
        bytes[] calldata _signature
    ) external {
        IAdmin(admin).verifyAdminSignatures(
            abi.encode(
                address(this),
                "createContents",
                _uris,
                _startAts,
                _durations
            ),
            _signature
        );

        if (_uris.length != _startAts.length
            || _uris.length != _durations.length) {
            revert InvalidInput();
        }

        for (uint256 i; i < _uris.length; ++i) {
            uint256 contentId = ++contentNumber;
            if (_startAts[i] <= block.timestamp) {
                revert InvalidTimestamp();
            }
            contents[contentId] = Content(
                _uris[i],
                _startAts[i],
                _startAts[i] + _durations[i]
            );

            emit NewContent(
                contentId,
                _uris[i],
                _startAts[i],
                _durations[i]
            );
        }
    }

    function updateContentURIs(
        uint256[] calldata _contentIds,
        string[] calldata _uris,
        bytes[] calldata _signatures
    ) external {
        IAdmin(admin).verifyAdminSignatures(
            abi.encode(
                address(this),
                "updateContentURIs",
                _contentIds,
                _uris
            ),
            _signatures
        );

        if (_contentIds.length != _uris.length) {
            revert InvalidInput();
        }

        uint256 n = contentNumber;
        for (uint256 i; i < _contentIds.length; ++i) {
            if (_contentIds[i] == 0 || _contentIds[i] > n) {
                revert InvalidContentId();
            }
            Content storage content = contents[_contentIds[i]];
            if (content.startAt <= block.timestamp) {
                revert AlreadyStarted();
            }
            content.uri = _uris[i];
            emit ContentURIUpdate(_contentIds[i], _uris[i]);
        }
    }

    function cancelContents(
        uint256[] calldata _contentIds,
        bytes[] calldata _signature
    ) external {
        IAdmin(admin).verifyAdminSignatures(
            abi.encode(
                address(this),
                "cancelContents",
                _contentIds
            ),
            _signature
        );

        uint256 n = contentNumber;
        for (uint256 i; i < _contentIds.length; ++i) {
            if (_contentIds[i] == 0 || _contentIds[i] > n) {
                revert InvalidContentId();
            }
            Content storage content = contents[_contentIds[i]];
            if (content.startAt <= block.timestamp) {
                revert AlreadyStarted();
            }
            content.endAt = uint40(block.timestamp);
            emit ContentCancellation(_contentIds[i]);
        }
    }

    function mint(uint256 _contentId, uint256 _amount)
    external payable nonReentrant whenNotPaused returns (uint256, uint256) {
        if (_amount == 0) {
            revert InvalidInput();
        }

        if (_contentId == 0 || _contentId > contentNumber) {
            revert InvalidContentId();
        }

        Content storage content = contents[_contentId];

        if (content.startAt > block.timestamp)  {
            revert NotOpened();
        }

        if (content.endAt <= block.timestamp) {
            revert AlreadyEnded();
        }

        CurrencyHandler.receiveNative(fee * _amount);

        uint256 firstTokenId = tokenNumber + 1;
        uint256 lastTokenId = firstTokenId + _amount - 1;
        tokenNumber = lastTokenId;

        unchecked {
            for (uint256 tokenId = firstTokenId; tokenId <= lastTokenId; ++tokenId) {
                tokenContents[tokenId] = _contentId;
                _mint(msg.sender, tokenId);

                emit NewToken(
                    tokenId,
                    _contentId,
                    msg.sender
                );
            }

            mintCounts[msg.sender][_contentId] += _amount;
        }

        return (firstTokenId, lastTokenId);
    }

    function tokenURI(uint256 _tokenId) public view override(
        IERC721MetadataUpgradeable,
        ERC721Upgradeable
    ) returns (string memory) {
        return contents[tokenContents[_tokenId]].uri;
    }

    function getRoyaltyRate(uint256) external view returns (Rate memory) {
        return Rate(royaltyRate, CommonConstant.RATE_DECIMALS);
    }

    function supportsInterface(bytes4 _interfaceId) public view override(
        IERC165Upgradeable,
        RoyaltyRateProposer,
        ERC721Upgradeable
    ) returns (bool) {
        return _interfaceId == type(IERC4906Upgradeable).interfaceId
            || RoyaltyRateProposer.supportsInterface(_interfaceId)
            || super.supportsInterface(_interfaceId);
    }

    function _royaltyReceiver() internal view override returns (address) {
        return address(this);
    }
}
