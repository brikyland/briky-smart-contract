// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IERC165Upgradeable} from "@openzeppelin/contracts-upgradeable/interfaces/IERC165Upgradeable.sol";
import {IERC721MetadataUpgradeable} from "@openzeppelin/contracts-upgradeable/interfaces/IERC721MetadataUpgradeable.sol";
import {IERC2981Upgradeable} from "@openzeppelin/contracts-upgradeable/interfaces/IERC2981Upgradeable.sol";
import {IERC4906Upgradeable} from "@openzeppelin/contracts-upgradeable/interfaces/IERC4906Upgradeable.sol";
import {ReentrancyGuardUpgradeable} from "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
import {ERC721Upgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC721/ERC721Upgradeable.sol";
import {ERC721PausableUpgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC721/extensions/ERC721PausableUpgradeable.sol";

import {CurrencyHandler} from "../common/utilities/CurrencyHandler.sol";

import {IAdmin} from "../common/interfaces/IAdmin.sol";

import {CommonConstant} from "../common/constants/CommonConstant.sol";

import {Pausable} from "../common/utilities/Pausable.sol";
import {RoyaltyRateProposer} from "../common/utilities/RoyaltyRateProposer.sol";

import {IPassportToken} from "./interfaces/IPassportToken.sol";

import {PassportTokenStorage} from "./storages/PassportTokenStorage.sol";

contract PassportToken is
PassportTokenStorage,
ERC721PausableUpgradeable,
Pausable,
RoyaltyRateProposer,
ReentrancyGuardUpgradeable {
    string constant private VERSION = "v1.2.1";

    receive() external payable {}

    function initialize(
        address _admin,
        string calldata _name,
        string calldata _symbol,
        string calldata _uri,
        uint256 _fee,
        uint256 _royaltyRate
    ) external initializer {
        __ERC721_init(_name, _symbol);
        __ERC721Pausable_init();

        __ReentrancyGuard_init();

        admin = _admin;

        baseURI = _uri;
        emit BaseURIUpdate(_uri);

        fee = _fee;
        emit FeeUpdate(_fee);

        royaltyRate = _royaltyRate;
        emit RoyaltyRateUpdate(Rate(_royaltyRate, CommonConstant.RATE_DECIMALS));
    }

    function version() external pure returns (string memory) {
        return VERSION;
    }

    /**
     *  @notice Update base URI.
     *
     *          Name            Description
     *  @param  _uri            New base URI.
     *  @param  _signatures     Array of admin signatures.
     * 
     *  @dev    Administrative configurations.
     */
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

    /**
     *  @notice Update minting fee.
     *
     *          Name            Description
     *  @param  _fee            New minting fee.
     *  @param  _signatures     Array of admin signatures.
     * 
     *  @dev    Administrative configurations.
     */
    function updateFee(
        uint256 _fee,
        bytes[] calldata _signatures
    ) external {
        IAdmin(admin).verifyAdminSignatures(
            abi.encode(
                address(this),
                "updateFee",
                _fee
            ),
            _signatures
        );
        fee = _fee;
        emit FeeUpdate(_fee);
    }

    /**
     *  @notice Update royalty rate.
     *
     *          Name            Description
     *  @param  _royaltyRate    New royalty rate.
     *  @param  _signatures     Array of admin signatures.
     * 
     *  @dev    Administrative configurations.
     */
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

    /**
     *  @notice Withdraw cryptocurrency from the contract to a receiver.
     *
     *          Name            Description
     *  @param  _receiver       Receiver address.
     *  @param  _currencies     Array of currency addresses to withdraw.
     *  @param  _values         Array of withdraw values.
     *  @param  _signatures     Array of admin signatures.
     */
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

    function mint() external payable nonReentrant whenNotPaused returns (uint256) {
        if (hasMinted[msg.sender]) {
            revert AlreadyMinted();
        }

        CurrencyHandler.receiveNative(fee);

        unchecked {
            uint256 tokenId = ++tokenNumber;
            hasMinted[msg.sender] = true;
            _mint(msg.sender, tokenId);

            emit NewToken(
                tokenId,
                msg.sender
            );

            return tokenId;
        }
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
        ERC721Upgradeable
    ) returns (bool) {
        return _interfaceId == type(IERC4906Upgradeable).interfaceId
            || _interfaceId == type(IERC2981Upgradeable).interfaceId
            || super.supportsInterface(_interfaceId);
    }

    function _royaltyReceiver() internal view override returns (address) {
        return address(this);
    }
}
