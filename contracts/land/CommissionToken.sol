// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IERC165Upgradeable} from "@openzeppelin/contracts-upgradeable/interfaces/IERC165Upgradeable.sol";
import {IERC721MetadataUpgradeable} from "@openzeppelin/contracts-upgradeable/interfaces/IERC721MetadataUpgradeable.sol";
import {IERC4906Upgradeable} from "@openzeppelin/contracts-upgradeable/interfaces/IERC4906Upgradeable.sol";
import {ReentrancyGuardUpgradeable} from "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
import {ERC721Upgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC721/ERC721Upgradeable.sol";
import {ERC721PausableUpgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC721/extensions/ERC721PausableUpgradeable.sol";

import {Formula} from "../lib/Formula.sol";

import {IAdmin} from "../common/interfaces/IAdmin.sol";
import {IRoyaltyRateProposer} from "../common/interfaces/IRoyaltyRateProposer.sol";

import {CommonConstant} from "../common/constants/CommonConstant.sol";

import {Administrable} from "../common/utilities/Administrable.sol";
import {Pausable} from "../common/utilities/Pausable.sol";
import {RoyaltyRateProposer} from "../common/utilities/RoyaltyRateProposer.sol";

import {IEstateToken} from "./interfaces/IEstateToken.sol";

import {CommissionTokenStorage} from "./storages/CommissionTokenStorage.sol";

contract CommissionToken is
CommissionTokenStorage,
ERC721PausableUpgradeable,
Administrable,
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
        uint256 _royaltyRate
    ) external initializer {
        require(_royaltyRate <= CommonConstant.RATE_MAX_FRACTION);
        
        __ERC721_init(_name, _symbol);
        __ERC721Pausable_init();

        __ReentrancyGuard_init();

        admin = _admin;
        estateToken = _estateToken;
        feeReceiver = _feeReceiver;

        baseURI = _uri;
        emit BaseURIUpdate(_uri);

        royaltyRate = _royaltyRate;
        emit RoyaltyRateUpdate(Rate(_royaltyRate, CommonConstant.RATE_DECIMALS));
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

    function getBrokerCommissionRate(bytes32 _zone, address _broker) external view returns (Rate memory) {
        if (!IAdmin(admin).isZone(_zone)) {
            revert InvalidZone();
        }
        if (!isActiveIn[_zone][_broker]) {
            revert NotActive();
        }
        return brokerCommissionRates[_zone][_broker];
    }

    function getCommissionRate(uint256 _tokenId) public view returns (Rate memory) {
        return commissionRates[_tokenId];
    }

    function commissionInfo(uint256 _tokenId, uint256 _value) external view returns (address, uint256) {
        address receiver = _ownerOf(_tokenId);
        return receiver != address(0)
            ? (receiver, _value.scale(getCommissionRate(_tokenId)))
            : (address(0), 0);
    }

    function registerBroker(
        bytes32 _zone,
        address _broker,
        uint256 _commissionRate
    ) external onlyManager {
        if (!IAdmin(admin).getZoneEligibility(_zone, msg.sender)) {
            revert Unauthorized();
        }

        if (_commissionRate > CommonConstant.RATE_MAX_FRACTION) {
            revert InvalidRate();
        }

        Rate memory rate = Rate(_commissionRate, CommonConstant.RATE_DECIMALS);

        if (brokerCommissionRates[_zone][_broker].value != 0) {
            revert AlreadyRegistered();
        }
        isActiveIn[_zone][_broker] = true;
        brokerCommissionRates[_zone][_broker] = rate;

        emit BrokerRegistration(
            _zone,
            _broker,
            rate
        );
    }

    function activateBroker(
        bytes32 _zone,
        address _broker,
        bool _isActive
    ) external onlyManager {
        if (!IAdmin(admin).getZoneEligibility(_zone, msg.sender)) {
            revert Unauthorized();
        }

        isActiveIn[_zone][_broker] = _isActive;

        if (_isActive) {
            emit BrokerActivation(_zone, _broker);
        } else {
            emit BrokerDeactivation(_zone, _broker);
        }
    }

    function mint(
        bytes32 _zone,
        address _broker,
        uint256 _tokenId
    ) external {
        address estateTokenAddress = estateToken;
        if (msg.sender != estateTokenAddress) {
            revert Unauthorized();
        }
        if (_exists(_tokenId)) {
            revert AlreadyMinted();
        }

        if (!IAdmin(admin).isZone(_zone)) {
            revert InvalidZone();
        }

        if (!isActiveIn[_zone][_broker]) {
            revert InvalidBroker();
        }

        commissionRates[_tokenId] = brokerCommissionRates[_zone][_broker];
        _mint(_broker, _tokenId);

        emit NewToken(
            _tokenId,
            _zone,
            _broker
        );
    }

    function tokenURI(uint256) public view override(
        IERC721MetadataUpgradeable,
        ERC721Upgradeable
    ) returns (string memory) {
        return baseURI;
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
            || super.supportsInterface(_interfaceId);
    }

    function _mint(address _to, uint256 _tokenId) internal override {
        totalSupply++;
        super._mint(_to, _tokenId);
    }

    function _royaltyReceiver() internal view override returns (address) {
        return feeReceiver;
    }
}
