// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IERC165Upgradeable} from "@openzeppelin/contracts-upgradeable/interfaces/IERC165Upgradeable.sol";
import {IERC721MetadataUpgradeable} from "@openzeppelin/contracts-upgradeable/interfaces/IERC721MetadataUpgradeable.sol";
import {IERC4906Upgradeable} from "@openzeppelin/contracts-upgradeable/interfaces/IERC4906Upgradeable.sol";
import {ReentrancyGuardUpgradeable} from "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
import {ERC721Upgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC721/ERC721Upgradeable.sol";
import {ERC721PausableUpgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC721/extensions/ERC721PausableUpgradeable.sol";

import {Constant} from "../lib/Constant.sol";
import {CurrencyHandler} from "../lib/CurrencyHandler.sol";

import {IAdmin} from "../common/interfaces/IAdmin.sol";

import {Pausable} from "../common/utilities/Pausable.sol";

import {RoyaltyRateProposer} from "../common/utilities/RoyaltyRateProposer.sol";

import {IPromotionToken} from "./interfaces/IPromotionToken.sol";

import {PromotionTokenStorage} from "./storages/PromotionTokenStorage.sol";

contract PromotionToken is
PromotionTokenStorage,
ERC721PausableUpgradeable,
Pausable,
RoyaltyRateProposer,
ReentrancyGuardUpgradeable {
    string constant private VERSION = "v1.1.1";

    modifier onlyManager() {
        if (!IAdmin(this.admin()).isManager(msg.sender)) {
            revert Unauthorized();
        }
        _;
    }

    receive() external payable {}

    function initialize(
        address _admin,
        address _feeReceiver,
        string calldata _name,
        string calldata _symbol,
        string calldata _uri,
        uint256 _fee,
        uint256 _royaltyRate
    ) external initializer {
        require(_royaltyRate <= Constant.COMMON_RATE_MAX_FRACTION);

        __ERC721_init(_name, _symbol);
        __ERC721Pausable_init();

        __ReentrancyGuard_init();

        admin = _admin;
        feeReceiver = _feeReceiver;

        baseURI = _uri;
        fee = _fee;
        royaltyRate = _royaltyRate;

        emit BaseURIUpdate(_uri);
        emit FeeUpdate(_fee);
        emit RoyaltyRateUpdate(_royaltyRate);
    }

    function version() external pure returns (string memory) {
        return VERSION;
    }

    function updateBaseURI(
        string calldata _uri,
        bytes[] calldata _signatures
    ) external {
        IAdmin(admin).verifyAdminSignatures(
            abi.encode(
                address(this),
                "updateBaseURI",
                _uri
            ),
            _signatures
        );
        baseURI = _uri;

        emit BaseURIUpdate(_uri);
        emit BatchMetadataUpdate(1, tokenNumber);
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

    function getRoyaltyRate()
    public view override(IPromotionToken, RoyaltyRateProposer) returns (Rate memory) {
        return Rate(royaltyRate, Constant.COMMON_RATE_DECIMALS);
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

        for (uint256 i = 0; i < _uris.length; ++i) {
            uint256 contentId = ++contentNumber;
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

        for (uint256 i = 0; i < _contentIds.length; ++i) {
            Content memory content = getContent(_contentIds[i]);
            if (content.endAt < block.timestamp) {
                revert AlreadyLocked();
            }
            contents[_contentIds[i]].endAt = uint40(block.timestamp);
            emit ContentCancellation(_contentIds[i]);
        }
    }

    function mint(uint256 _contentId, uint256 _amount)
    external payable nonReentrant whenNotPaused returns (uint256, uint256) {
        if (_amount == 0) {
            revert InvalidInput();
        }

        Content memory content = getContent(_contentId);

        if (block.timestamp < content.startAt) {
            revert NotOpened();
        }

        if (block.timestamp >= content.endAt) {
            revert AlreadyLocked();
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
        }

        return (firstTokenId, lastTokenId);
    }

    function exists(uint256 _tokenId) external view returns (bool) {
        return _exists(_tokenId);
    }

    function tokenURI(uint256 _tokenId) public view override(
        IERC721MetadataUpgradeable,
        ERC721Upgradeable
    ) returns (string memory) {
        return string.concat(baseURI, contents[tokenContents[_tokenId]].uri);
    }

    function supportsInterface(bytes4 _interfaceId) public view override(
        IERC165Upgradeable,
        RoyaltyRateProposer,
        ERC721Upgradeable
    ) returns (bool) {
        return _interfaceId == type(IERC4906Upgradeable).interfaceId
            || super.supportsInterface(_interfaceId);
    }

    function _baseURI() internal view override returns (string memory) {
        return baseURI;
    }

    function _royaltyReceiver() internal view override returns (address) {
        return feeReceiver;
    }
}
