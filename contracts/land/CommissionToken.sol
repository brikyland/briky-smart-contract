// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IERC165Upgradeable} from "@openzeppelin/contracts-upgradeable/interfaces/IERC165Upgradeable.sol";
import {IERC721MetadataUpgradeable} from "@openzeppelin/contracts-upgradeable/interfaces/IERC721MetadataUpgradeable.sol";
import {IERC4906Upgradeable} from "@openzeppelin/contracts-upgradeable/interfaces/IERC4906Upgradeable.sol";
import {ReentrancyGuardUpgradeable} from "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
import {ERC721Upgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC721/ERC721Upgradeable.sol";
import {ERC721PausableUpgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC721/extensions/ERC721PausableUpgradeable.sol";

import {Formula} from "../lib/Formula.sol";

import {CommonConstant} from "../common/constants/CommonConstant.sol";

import {IAdmin} from "../common/interfaces/IAdmin.sol";
import {IRoyaltyRateProposer} from "../common/interfaces/IRoyaltyRateProposer.sol";

import {Pausable} from "../common/utilities/Pausable.sol";
import {RoyaltyRateProposer} from "../common/utilities/RoyaltyRateProposer.sol";

import {IEstateToken} from "./interfaces/IEstateToken.sol";

import {CommissionTokenStorage} from "./storages/CommissionTokenStorage.sol";

contract CommissionToken is
CommissionTokenStorage,
ERC721PausableUpgradeable,
Pausable,
RoyaltyRateProposer,
ReentrancyGuardUpgradeable {
    using Formula for uint256;

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
        require(_commissionRate <= CommonConstant.COMMON_RATE_MAX_FRACTION);
        require(_royaltyRate <= CommonConstant.COMMON_RATE_MAX_FRACTION);

        __ERC721_init(_name, _symbol);
        __ERC721Pausable_init();

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
        if (_royaltyRate > CommonConstant.COMMON_RATE_MAX_FRACTION) {
            revert InvalidRate();
        }
        royaltyRate = _royaltyRate;
        emit RoyaltyRateUpdate(_royaltyRate);
    }

    function getCommissionRate() public view returns (Rate memory) {
        return Rate(commissionRate, CommonConstant.COMMON_RATE_DECIMALS);
    }

    function getRoyaltyRate()
    public view override(IRoyaltyRateProposer, RoyaltyRateProposer) returns (Rate memory) {
        return Rate(royaltyRate, CommonConstant.COMMON_RATE_DECIMALS);
    }

    function commissionInfo(uint256 _tokenId, uint256 _value) external view returns (address, uint256) {
        address receiver = _ownerOf(_tokenId);
        return receiver != address(0)
            ? (receiver, _value.scale(getCommissionRate()))
            : (address(0), 0);
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

    function tokenURI(uint256) public view override(
        IERC721MetadataUpgradeable,
        ERC721Upgradeable
    ) returns (string memory) {
        return baseURI;
    }

    function supportsInterface(bytes4 _interfaceId) public view override(
        IERC165Upgradeable,
        RoyaltyRateProposer,
        ERC721Upgradeable
    ) returns (bool) {
        return _interfaceId == type(IERC4906Upgradeable).interfaceId
            || super.supportsInterface(_interfaceId);
    }

    function _royaltyReceiver() internal view override returns (address) {
        return feeReceiver;
    }
}
