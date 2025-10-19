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
import {Formula} from "../common/utilities/Formula.sol";
import {Pausable} from "../common/utilities/Pausable.sol";
import {RoyaltyRateProposer} from "../common/utilities/RoyaltyRateProposer.sol";

/// contracts/land/interfaces/
import {IEstateToken} from "./interfaces/IEstateToken.sol";

/// contracts/land/storages/
import {CommissionTokenStorage} from "./storages/CommissionTokenStorage.sol";

/**
 *  @author Briky Team
 *
 *  @notice The `CommissionToken` contract is codependent with the `EstateToken` contract. For each newly tokenized estate,
 *          it will issue a unique corresponding token that represents the commission fraction shareable to its owner from
 *          incomes of designated operators involving the estate.
 */
contract CommissionToken is
CommissionTokenStorage,
ERC721PausableUpgradeable,
Administrable,
Pausable,
RoyaltyRateProposer,
ReentrancyGuardUpgradeable {
    /** ===== LIBRARY ===== **/
    using Formula for uint256;


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
     *  @param  _estateToken    `EstateToken` contract address.
     *  @param  _feeReceiver    `FeeReceiver` contract address.
     *  @param  _name           Token name.
     *  @param  _symbol         Token symbol.
     *  @param  _uri            Base URI.
     *  @param  _royaltyRate    Default royalty rate.
     */
    function initialize(
        address _admin,
        address _estateToken,
        address _feeReceiver,
        string calldata _name,
        string calldata _symbol,
        string calldata _uri,
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
        estateToken = _estateToken;
        feeReceiver = _feeReceiver;

        /// Configuration
        baseURI = _uri;
        emit BaseURIUpdate(_uri);

        royaltyRate = _royaltyRate;
        emit RoyaltyRateUpdate(Rate(
            _royaltyRate,
            CommonConstant.RATE_DECIMALS
        ));
    }


    /* --- Administration --- */
    /**
     *  @notice Update the base URI.
     *
     *          Name            Description
     *  @param  _uri            New base URI.
     *  @param  _signatures     Array of admin signatures.
     * 
     *  @dev    Administrative operator.
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
        emit BatchMetadataUpdate(
            1,
            IEstateToken(estateToken).estateNumber()
        );
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


    /* --- Query --- */
    /**
     *          Name        Description
     *  @param  _tokenId    Token identifier.
     *
     *  @return Commission rate of the token identifier.
     */
    function getCommissionRate(
        uint256 _tokenId
    ) public view returns (Rate memory) {
        return commissionRates[_tokenId];
    }


    /**
     *          Name        Description
     *  @param  _zone       Zone code.
     *  @param  _broker     Broker address.
     *
     *  @return Commission rate of the broker in the zone.
     */
    function getBrokerCommissionRate(
        bytes32 _zone,
        address _broker
    ) external view returns (Rate memory) {
        if (!IAdmin(admin).isZone(_zone)) {
            revert InvalidZone();
        }
        if (!isActiveIn[_zone][_broker]) {
            revert NotActive();
        }
        return brokerCommissionRates[_zone][_broker];
    }


    /**
     *          Name        Description
     *  @param  _tokenId    Token identifier.
     *  @param  _value      Value.
     *
     *  @return Commission receiver address.
     *  @return Commission derived from the value.
     */
    function commissionInfo(
        uint256 _tokenId,
        uint256 _value
    ) external view returns (address, uint256) {
        address receiver = _ownerOf(_tokenId);
        return receiver != address(0)
            ? (receiver, _value.scale(getCommissionRate(_tokenId)))
            : (address(0), 0);
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
        return super.tokenURI(_tokenId);
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


    /* --- Command --- */
    /**
     *  @notice Register a broker in a zone.
     *
     *          Name                Description
     *  @param  _zone               Zone code.
     *  @param  _broker             Broker address.
     *  @param  _commissionRate     Commission rate.
     *
     *  @dev    Permission: Managers in the zone.
     */
    function registerBroker(
        bytes32 _zone,
        address _broker,
        uint256 _commissionRate
    ) external
    whenNotPaused
    onlyManager {
        if (!IAdmin(admin).isActiveIn(_zone, msg.sender)) {
            revert Unauthorized();
        }

        if (_commissionRate > CommonConstant.RATE_MAX_SUBUNIT) {
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

    /**
     *  @notice Activate or deactivate a broker in a zone.
     *
     *          Name            Description
     *  @param  _zone           Zone code.
     *  @param  _broker         Broker address.
     *  @param  _isActive       Whether the operation is activating or deactivating.
     *
     *  @dev    Permission: Managers in the zone.
     */
    function activateBroker(
        bytes32 _zone,
        address _broker,
        bool _isActive
    ) external
    whenNotPaused
    onlyManager {
        if (!IAdmin(admin).isActiveIn(_zone, msg.sender)) {
            revert Unauthorized();
        }

        isActiveIn[_zone][_broker] = _isActive;

        if (_isActive) {
            emit BrokerActivation(
                _zone,
                _broker
            );
        } else {
            emit BrokerDeactivation(
                _zone,
                _broker
            );
        }
    }


    /**
     *  @notice Mint a commission token.
     *
     *          Name        Description
     *  @param  _zone       Zone code.
     *  @param  _broker     Associated broker address.
     *  @param  _tokenId    Token identifier to be minted.
     */
    function mint(
        bytes32 _zone,
        address _broker,
        uint256 _tokenId
    ) external
    whenNotPaused {
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

        Rate memory rate = brokerCommissionRates[_zone][_broker];
        commissionRates[_tokenId] = rate;
        _mint(_broker, _tokenId);

        emit NewToken(
            _tokenId,
            _zone,
            _broker,
            rate
        );
    }


    /* --- Helper --- */
    /**
     *  @return Prefix of all token URI.
     */
    function _baseURI() internal override view returns (string memory) {
        return baseURI;
    }

    /**
     *  @notice Mint a token.
     * 
     *          Name            Description
     *  @param  _to             To address.
     *  @param  _tokenId        Token identifier.
     */
    function _mint(address _to, uint256 _tokenId) internal override {
        totalSupply++;
        super._mint(_to, _tokenId);
    }

    /**
     *  @return Default royalty receiver address.
     */
    function _royaltyReceiver() internal view override returns (address) {
        return feeReceiver;
    }
}
