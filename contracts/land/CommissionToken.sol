// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IERC165Upgradeable} from "@openzeppelin/contracts-upgradeable/interfaces/IERC165Upgradeable.sol";
import {IERC2981Upgradeable} from "@openzeppelin/contracts-upgradeable/interfaces/IERC2981Upgradeable.sol";
import {ReentrancyGuardUpgradeable} from "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
import {ERC721Upgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC721/ERC721Upgradeable.sol";
import {ERC721PausableUpgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC721/extensions/ERC721PausableUpgradeable.sol";
import {ERC721URIStorageUpgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC721/extensions/ERC721URIStorageUpgradeable.sol";
import {IERC721MetadataUpgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC721/extensions/IERC721MetadataUpgradeable.sol";

import {Constant} from "../lib/Constant.sol";

import {IAdmin} from "../common/interfaces/IAdmin.sol";
import {IRoyaltyRateToken} from "../common/interfaces/IRoyaltyRateToken.sol";

import {RoyaltyRateToken} from "../common/utilities/RoyaltyRateToken.sol";

import {IEstateToken} from "./interfaces/IEstateToken.sol";

import {CommissionTokenStorage} from "./storages/CommissionTokenStorage.sol";

contract CommissionToken is
CommissionTokenStorage,
ERC721PausableUpgradeable,
ERC721URIStorageUpgradeable,
RoyaltyRateToken,
ReentrancyGuardUpgradeable {
    string constant private VERSION = "v1.1.1";

    receive() external payable {}

    function initialize(
        address _admin,
        address _estateToken,
        address _feeReceiver,
        string calldata _name,
        string calldata _symbol,
        string calldata _uri,
        uint256 _commissionRate,
        uint256 _royaltyRate
    ) external initializer {
        require(_royaltyRate <= Constant.COMMON_RATE_MAX_FRACTION);
        require(_commissionRate <= Constant.COMMON_RATE_MAX_FRACTION);

        __ERC721_init(_name, _symbol);
        __ERC721Pausable_init();
        __ERC721URIStorage_init();

        __ReentrancyGuard_init();

        admin = _admin;
        estateToken = _estateToken;
        feeReceiver = _feeReceiver;

        baseURI = _uri;
        commissionRate = _commissionRate;
        royaltyRate = _royaltyRate;

        emit BaseURIUpdate(_uri);
        emit CommissionRateUpdate(_commissionRate);
        emit RoyaltyRateUpdate(_royaltyRate);
    }

    function version() external pure returns (string memory) {
        return VERSION;
    }

    function pause(bytes[] calldata _signatures) external whenNotPaused {
        IAdmin(admin).verifyAdminSignatures(
            abi.encode(address(this), "pause"),
            _signatures
        );
        _pause();
    }

    function unpause(bytes[] calldata _signatures) external whenPaused {
        IAdmin(admin).verifyAdminSignatures(
            abi.encode(address(this), "unpause"),
            _signatures
        );
        _unpause();
    }

    function updateRoyaltyRate(
        uint256 _royaltyRate,
        bytes[] calldata _signature
    ) external {
        IAdmin(admin).verifyAdminSignatures(
            abi.encode(
                address(this),
                "updateRoyaltyRate",
                _royaltyRate
            ),
            _signature
        );
        if (_royaltyRate > Constant.COMMON_RATE_MAX_FRACTION) {
            revert InvalidRate();
        }
        royaltyRate = _royaltyRate;
        emit RoyaltyRateUpdate(_royaltyRate);
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
        emit BatchMetadataUpdate(1, IEstateToken(estateToken).estateNumber());
    }

    function getCommissionRate() external view returns (Rate memory) {
        return Rate(commissionRate, Constant.COMMON_RATE_DECIMALS);
    }

    function getRoyaltyRate() public view override(
        IRoyaltyRateToken,
        RoyaltyRateToken
    ) returns (Rate memory) {
        return Rate(royaltyRate, Constant.COMMON_RATE_DECIMALS);
    }

    function mint(address _account, uint256 _tokenId) external {
        if (msg.sender != estateToken) {
            revert Unauthorized();
        }
        if (_exists(_tokenId)) {
            revert AlreadyMinted();
        }
        _mint(_account, _tokenId);
        emit NewToken(_tokenId, _account);
    }

    function exists(uint256 _tokenId) external view returns (bool) {
        return _exists(_tokenId);
    }

    function tokenURI(uint256 _tokenId) public view override(
        IERC721MetadataUpgradeable,
        ERC721Upgradeable,
        ERC721URIStorageUpgradeable
    ) returns (string memory) {
        return super.tokenURI(_tokenId);
    }

    function supportsInterface(bytes4 _interfaceId) public view override(
        IERC165Upgradeable,
        ERC721Upgradeable,
        ERC721URIStorageUpgradeable,
        RoyaltyRateToken
    ) returns (bool) {
        return super.supportsInterface(_interfaceId);
    }

    function _baseURI() internal view override returns (string memory) {
        return baseURI;
    }

    function _beforeTokenTransfer(
        address _from,
        address _to,
        uint256 _firstTokenId,
        uint256 _batchSize
    ) internal override(ERC721Upgradeable, ERC721PausableUpgradeable) {
        super._beforeTokenTransfer(_from, _to, _firstTokenId, _batchSize);
    }

    function _burn(uint256 _tokenId) internal
    override(ERC721Upgradeable, ERC721URIStorageUpgradeable) {
        super._burn(_tokenId);
    }

    function _royaltyReceiver() internal view override returns (address) {
        return feeReceiver;
    }
}
