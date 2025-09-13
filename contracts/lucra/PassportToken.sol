// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @openzeppelin/contracts-upgradeable/
import {IERC165Upgradeable} from "@openzeppelin/contracts-upgradeable/interfaces/IERC165Upgradeable.sol";
import {IERC721MetadataUpgradeable} from "@openzeppelin/contracts-upgradeable/interfaces/IERC721MetadataUpgradeable.sol";
import {IERC2981Upgradeable} from "@openzeppelin/contracts-upgradeable/interfaces/IERC2981Upgradeable.sol";
import {IERC4906Upgradeable} from "@openzeppelin/contracts-upgradeable/interfaces/IERC4906Upgradeable.sol";
import {ERC721Upgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC721/ERC721Upgradeable.sol";
import {ERC721PausableUpgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC721/extensions/ERC721PausableUpgradeable.sol";
import {ReentrancyGuardUpgradeable} from "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";

/// contracts/common/utilities/
import {CurrencyHandler} from "../common/utilities/CurrencyHandler.sol";

/// contracts/common/interfaces/
import {IAdmin} from "../common/interfaces/IAdmin.sol";

/// contracts/common/constants/
import {CommonConstant} from "../common/constants/CommonConstant.sol";

/// contracts/common/utilities/
import {Pausable} from "../common/utilities/Pausable.sol";
import {RoyaltyRateProposer} from "../common/utilities/RoyaltyRateProposer.sol";

/// contracts/lucra/interfaces/
import {IPassportToken} from "./interfaces/IPassportToken.sol";

/// contracts/lucra/storages/
import {PassportTokenStorage} from "./storages/PassportTokenStorage.sol";

/**
 *  @author Briky Team
 *
 *  @notice Implementation of contract `PassportToken`.
 * 
 *  @dev    The passport token is an ERC-721 token that represents a special pass that multiplies users' total points
 *          during airdrop campaigns.
 *  @dev    The passport token can only be minted once per account.
 *  @dev    Minting fee is charged to protect the system from DoS attacks.
 */
contract PassportToken is
PassportTokenStorage,
ERC721PausableUpgradeable,
Pausable,
RoyaltyRateProposer,
ReentrancyGuardUpgradeable {
    /** ===== CONSTANT ===== **/
    string constant private VERSION = "v1.2.1";


    /** ===== FUNCTION ===== **/
    /* --- Special --- */
    /**
     *  @notice Executed on a call to the contract with empty calldata.
     */
    receive() external payable {}

    /**
     *          Name       Description
     *  @return version    Version of implementation.
     */
    function version() external pure returns (string memory) {
        return VERSION;
    }


    /* --- Initializer --- */
    /**
     *  @notice Invoked after deployment for initialization, serving as a constructor.
     */
    function initialize(
        address _admin,
        string calldata _name,
        string calldata _symbol,
        string calldata _uri,
        uint256 _fee,
        uint256 _royaltyRate
    ) external initializer {
        /// @dev    Inherited initializer.
        __ERC721_init(_name, _symbol);
        __ERC721Pausable_init();

        __ReentrancyGuard_init();

        /// @dev    Dependency
        admin = _admin;

        /// @dev    Configuration
        baseURI = _uri;
        emit BaseURIUpdate(_uri);

        fee = _fee;
        emit FeeUpdate(_fee);

        royaltyRate = _royaltyRate;
        emit RoyaltyRateUpdate(Rate(_royaltyRate, CommonConstant.RATE_DECIMALS));
    }


    /* --- Administration --- */
    /**
     *  @notice Update base URI.
     *
     *          Name            Description
     *  @param  _uri            New base URI.
     *  @param  _signatures     Array of admin signatures.
     * 
     *  @dev    Administrative configuration.
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
     *  @dev    Administrative configuration.
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
     *  @dev    Administrative configuration.
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
     *  @notice Withdraw sufficient amounts in multiple cryptocurrencies from the contract to an address.
     *
     *          Name            Description
     *  @param  _receiver       Receiver address.
     *  @param  _currencies     Array of withdrawn currency addresses.
     *  @param  _values         Array of withdraw values, respectively to each currency.
     *  @param  _signatures     Array of admin signatures.
     *
     *  @dev    Administrative operation.
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


    /* --- Query --- */
    /**
     *          Name            Description
     *  @param  _tokenId        Token identifier.
     * 
     *  @return Token URI.
     */
    function tokenURI(
        uint256 _tokenId
    ) public view override(
        IERC721MetadataUpgradeable,
        ERC721Upgradeable
    ) returns (string memory) {
        return baseURI;
    }

    /**
     *          Name        Description
     *  @param  _tokenId     Token identifier.
     * 
     *  @return rate        Royalty rate of the token.
     */
    function getRoyaltyRate(
        uint256 _tokenId
    ) external view returns (Rate memory) {
        return Rate(royaltyRate, CommonConstant.RATE_DECIMALS);
    }

    /**
     *  @notice Mint the passport token.
     *
     *          Name        Description
     *  @return tokenId     Minted token identifier.
     */
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


    /* --- Interface --- */
    /**
     *          Name            Description
     *  @param  _interfaceId    Interface identifier.
     * 
     *  @return Whether the contract implements the interface.
     */
    function supportsInterface(bytes4 _interfaceId) public view override(
        IERC165Upgradeable,
        ERC721Upgradeable
    ) returns (bool) {
        return _interfaceId == type(IERC4906Upgradeable).interfaceId
            || _interfaceId == type(IERC2981Upgradeable).interfaceId
            || super.supportsInterface(_interfaceId);
    }


    /* --- Helper --- */
    /**
     *          Name       Description
     *  @return address    Royalty receiver address.
     */
    function _royaltyReceiver() internal view override returns (address) {
        return address(this);
    }
}
