// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

/// @openzeppelin/contracts-upgradeable/
import {IERC165Upgradeable} from "@openzeppelin/contracts-upgradeable/interfaces/IERC165Upgradeable.sol";
import {IERC721MetadataUpgradeable} from "@openzeppelin/contracts-upgradeable/interfaces/IERC721MetadataUpgradeable.sol";
import {IERC2981Upgradeable} from "@openzeppelin/contracts-upgradeable/interfaces/IERC2981Upgradeable.sol";
import {IERC4906Upgradeable} from "@openzeppelin/contracts-upgradeable/interfaces/IERC4906Upgradeable.sol";
import {ReentrancyGuardUpgradeable} from "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
import {ERC721Upgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC721/ERC721Upgradeable.sol";
import {ERC721PausableUpgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC721/extensions/ERC721PausableUpgradeable.sol";

/// contracts/common/interfaces/
import {IAdmin} from "../common/interfaces/IAdmin.sol";

/// contracts/common/constants/
import {CommonConstant} from "../common/constants/CommonConstant.sol";

/// contracts/common/utilities/
import {Administrable} from "../common/utilities/Administrable.sol";
import {CurrencyHandler} from "../common/utilities/CurrencyHandler.sol";
import {Pausable} from "../common/utilities/Pausable.sol";
import {RoyaltyRateProposer} from "../common/utilities/RoyaltyRateProposer.sol";

/// contracts/lucra/storages/
import {PromotionTokenStorage} from "./storages/PromotionTokenStorage.sol";

/**
 *  @author Briky Team
 *
 *  @notice Interface for contract `PromotionToken`.
 *  @notice The `PromotionToken` contract is an ERC-721 token issued exclusively for airdrop campaigns. It provides
 *          limited-time content that grants its minter airdrop scores.
 */
contract PromotionToken is
PromotionTokenStorage,
ERC721PausableUpgradeable,
Administrable,
Pausable,
RoyaltyRateProposer,
ReentrancyGuardUpgradeable {
    /** ===== CONSTANT ===== **/
    string constant private VERSION = "v1.2.1";


    /** ===== FUNCTION ===== **/
    /* --- Common --- */
    /**
     *  @notice Executed on a call to this contract with empty calldata.
     */
    receive() external payable {}

    /**
     *  @return Version of implementation.
     */
    function version() external pure returns (string memory) {
        return VERSION;
    }


    /* --- Initialization --- */
    /**
     *  @notice Initialize the contract after deployment, serving as the constructor.
     * 
     *          Name            Description
     *  @param  _admin          `Admin` contract address.
     *  @param  _name           Token name.
     *  @param  _symbol         Token symbol.
     *  @param  _fee            Minting fee.
     *  @param  _royaltyRate    Default royalty rate.
     */
    function initialize(
        address _admin,
        string calldata _name,
        string calldata _symbol,
        uint256 _fee,
        uint256 _royaltyRate
    ) external
    initializer {
        require(_royaltyRate <= CommonConstant.RATE_MAX_SUBUNIT);

        /// Initializer
        __ERC721_init(_name, _symbol);
        __ERC721Pausable_init();
        __ReentrancyGuard_init();

        /// Dependency
        admin = _admin;

        /// Configuration
        fee = _fee;
        emit FeeUpdate(_fee);

        royaltyRate = _royaltyRate;
        emit RoyaltyRateUpdate(Rate(
            _royaltyRate,
            CommonConstant.RATE_DECIMALS
        ));
    }


    /* --- Administration --- */
    /**
     *  @notice Update the minting fee.
     *
     *          Name            Description
     *  @param  _fee            New minting fee.
     *  @param  _signatures     Array of admin signatures.
     * 
     *  @dev    Administrative operator.
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
     *  @notice Update the default royalty rate.
     *
     *          Name            Description
     *  @param  _royaltyRate    New default royalty rate.
     *  @param  _signatures     Array of admin signatures.
     * 
     *  @dev    Administrative operator.
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
        if (_royaltyRate > CommonConstant.RATE_MAX_SUBUNIT) {
            revert InvalidRate();
        }
        royaltyRate = _royaltyRate;
        emit RoyaltyRateUpdate(Rate(
            _royaltyRate,
            CommonConstant.RATE_DECIMALS
        ));
    }

    /**
     *  @notice Withdraw sufficient amounts in multiple cryptocurrencies from this contract to an account.
     *
     *          Name            Description
     *  @param  _receiver       Receiver address.
     *  @param  _currencies     Array of withdrawn currency addresses.
     *  @param  _values         Array of withdraw values, respective to each currency.
     *  @param  _signatures     Array of admin signatures.
     *
     *  @dev    Administrative operator.
     *  @dev    Used to withdraw fee and royalty.
     */
    function withdraw(
        address _receiver,
        address[] calldata _currencies,
        uint256[] calldata _values,
        bytes[] calldata _signatures
    ) external
    nonReentrant {
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
            CurrencyHandler.sendCurrency(
                _currencies[i],
                _receiver,
                _values[i]
            );
        }
    }

    /**
     *  @notice Create new contents.
     *
     *          Name            Description
     *  @param  _uris           Array of content URIs, respective to each content.
     *  @param  _startAts       Array of start timestamps for minting, respective to each content.
     *  @param  _durations      Array of mintable durations, respective to each content.
     *  @param  _signatures     Array of admin signatures.
     * 
     *  @dev    Administrative operator.
     */
    function createContents(
        string[] calldata _uris,
        uint40[] calldata _startAts,
        uint40[] calldata _durations,
        bytes[] calldata _signatures
    ) external {
        IAdmin(admin).verifyAdminSignatures(
            abi.encode(
                address(this),
                "createContents",
                _uris,
                _startAts,
                _durations
            ),
            _signatures
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

    /**
     *  @notice Update URIs of multiple contents.
     *
     *          Name            Description
     *  @param  _contentIds     Array of content identifiers.
     *  @param  _uris           Array of new URIs, respectively for each content.
     *  @param  _signatures     Array of admin signatures.
     * 
     *  @dev    Administrative operator.
     */
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
            emit ContentURIUpdate(
                _contentIds[i],
                _uris[i]
            );
        }
    }

    /**
     *  @notice Cancel multiple contents.
     *
     *          Name            Description
     *  @param  _contentIds     Array of content identifiers.
     *  @param  _signatures     Array of admin signatures.
     * 
     *  @dev    Administrative operator.
     */
    function cancelContents(
        uint256[] calldata _contentIds,
        bytes[] calldata _signatures
    ) external {
        IAdmin(admin).verifyAdminSignatures(
            abi.encode(
                address(this),
                "cancelContents",
                _contentIds
            ),
            _signatures
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


    /* --- Query --- */
    /**
     *          Name            Description
     *  @param  _contentId      Content identifier.
     * 
     *  @return Content information.
     */
    function getContent(
        uint256 _contentId
    ) public view returns (Content memory) {
        if (_contentId == 0 || _contentId > contentNumber) {
            revert InvalidContentId();
        }
        return contents[_contentId];
    }


    /**
     *          Name        Description
     *  @param  _tokenId    Token identifier.
     *
     *  @return Token URI.
     */
    function tokenURI(
        uint256 _tokenId
    ) public view override(
        IERC721MetadataUpgradeable,
        ERC721Upgradeable
    ) returns (string memory) {
        return contents[tokenContents[_tokenId]].uri;
    }


    /**
     *  @return Royalty rate of the token identifier.
     */
    function getRoyaltyRate(
        uint256
    ) external view returns (Rate memory) {
        return Rate(
            royaltyRate,
            CommonConstant.RATE_DECIMALS
        );
    }


    /**
     *          Name            Description
     *  @param  _interfaceId    Interface identifier.
     *
     *  @return Whether this contract implements the interface.
     */
    function supportsInterface(
        bytes4 _interfaceId
    ) public view override(
        IERC165Upgradeable,
        ERC721Upgradeable
    ) returns (bool) {
        return _interfaceId == type(IERC2981Upgradeable).interfaceId
            || _interfaceId == type(IERC4906Upgradeable).interfaceId
            || super.supportsInterface(_interfaceId);
    }


    /**
     *  @notice Mint tokens of a content.
     *
     *          Name            Description
     *  @param  _contentId      Content identifier.
     *  @param  _amount         Number of tokens to mint.
     *
     *  @return First token identifier of the minted tokens.
     *  @return Last token identifier of the minted tokens.
     */
    function mint(
        uint256 _contentId,
        uint256 _amount
    ) external payable
    whenNotPaused
    nonReentrant
    returns (uint256, uint256) {
        if (_amount == 0) {
            revert InvalidInput();
        }

        if (_contentId == 0 || _contentId > contentNumber) {
            revert InvalidContentId();
        }

        Content storage content = contents[_contentId];

        if (content.startAt > block.timestamp) {
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


    /* --- Helper --- */
    /**
     *  @return Default royalty receiver address.
     */
    function _royaltyReceiver() internal view override returns (address) {
        return address(this);
    }
}
