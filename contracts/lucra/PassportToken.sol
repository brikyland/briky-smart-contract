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

import {IPassportToken} from "./interfaces/IPassportToken.sol";

import {PassportTokenStorage} from "./storages/PassportTokenStorage.sol";

contract PassportToken is
PassportTokenStorage,
ERC721PausableUpgradeable,
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
    public view override(IPassportToken, RoyaltyRateProposer) returns (Rate memory) {
        return Rate(royaltyRate, Constant.COMMON_RATE_DECIMALS);
    }

    function mint() external payable nonReentrant whenNotPaused returns (uint256) {
        if (hasMinted[msg.sender]) {
            revert AlreadyMinted();
        }

        CurrencyHandler.receiveNative(fee);

        uint256 tokenId = ++tokenNumber;
        _mint(msg.sender, tokenId);

        emit NewToken(
            tokenId,
            msg.sender
        );

        return tokenId;
    }

    function exists(uint256 _tokenId) external view returns (bool) {
        return _exists(_tokenId);
    }

    function tokenURI(uint256 _tokenId) public view override(
        IERC721MetadataUpgradeable,
        ERC721Upgradeable
    ) returns (string memory) {
        return super.tokenURI(_tokenId);
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
