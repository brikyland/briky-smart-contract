// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

/// @openzeppelin/contracts-upgradeable/
import {IERC721MetadataUpgradeable} from "@openzeppelin/contracts-upgradeable/interfaces/IERC721MetadataUpgradeable.sol";
import {IERC4906Upgradeable} from "@openzeppelin/contracts-upgradeable/interfaces/IERC4906Upgradeable.sol";

/// contracts/common/interfaces/
import {ICommon} from "../../common/interfaces/ICommon.sol";
import {IRoyaltyRateProposer} from "../../common/interfaces/IRoyaltyRateProposer.sol";

/**
 *  @author Briky Team
 *
 *  @notice Interface for contract `CommissionToken`.
 *  @notice The `CommissionToken` contract is codependent with the `EstateToken` contract. For each newly tokenized estate,
 *          it will issue a unique corresponding token that represents the commission fraction shareable to its owner from
 *          incomes of designated operators involving the estate.
 */
interface ICommissionToken is
ICommon,
IRoyaltyRateProposer,
IERC4906Upgradeable,
IERC721MetadataUpgradeable {
    /** ===== EVENT ===== **/
    /* --- Configuration --- */
    /**
     *  @notice Emitted when the base URI is updated.
     *
     *          Name        Description
     *  @param  newValue    New base URI.
     */
    event BaseURIUpdate(
        string newValue
    );

    /**
     *  @notice Emitted when the default royalty rate is updated.
     *
     *          Name        Description
     *  @param  newRate     New default royalty rate.
     */
    event RoyaltyRateUpdate(
        Rate newRate
    );


    /* --- Broker --- */
    /**
     *  @notice Emitted when a broker is registered in a zone.
     *
     *          Name            Description
     *  @param  zone            Zone code.
     *  @param  broker          Broker address.
     *  @param  commissionRate  Commission rate.
     */
    event BrokerRegistration(
        bytes32 indexed zone,
        address indexed broker,
        Rate commissionRate
    );

    /**
     *  @notice Emitted when a broker is activated in a zone.
     * 
     *          Name            Description
     *  @param  zone            Zone code.
     *  @param  broker          Broker address.
     */
    event BrokerActivation(
        bytes32 indexed zone,
        address indexed broker
    );

    /**
     *  @notice Emitted when a broker is deactivated in a zone.
     *
     *          Name            Description
     *  @param  zone            Zone code.
     *  @param  broker          Broker address.
     */
    event BrokerDeactivation(
        bytes32 indexed zone,
        address indexed broker
    );


    /* --- Commission --- */
    /**
     *  @notice Emitted when a new commission token is minted.
     *
     *          Name            Description
     *  @param  tokenId         Token identifier.
     *  @param  zone            Zone code.
     *  @param  broker          Original broker address.
     *  @param  rate            Commission rate.
     */
    event NewToken(
        uint256 indexed tokenId,
        bytes32 indexed zone,
        address indexed broker,
        Rate rate
    );


    /** ===== ERROR ===== **/
    error AlreadyMinted();
    error AlreadyRegistered();
    error InvalidBroker();
    error NotActive();


    /* ===== FUNCTION ===== **/
    /* --- Dependency --- */
    /**
     *          Name            Description
     *  @return estateToken     `EstateToken` contract address.
     */
    function estateToken() external view returns (address estateToken);

    /**
     *          Name            Description
     *  @return feeReceiver     `FeeReceiver` contract address.
     */
    function feeReceiver() external view returns (address feeReceiver);


    /* --- Query --- */
    /**
     *          Name            Description
     *  @return totalSupply     Total supply of the token.
     */
    function totalSupply() external view returns (uint256 totalSupply);


    /**
     *          Name            Description
     *  @param  tokenId         Token identifier.
     *  @return rate            Commission rate of the token identifier.
     */
    function getCommissionRate(
        uint256 tokenId
    ) external view returns (Rate memory rate);


    /**
     *          Name            Description
     *  @param  zone            Zone code.
     *  @param  broker          Broker address.
     *  @return rate            Commission rate of the broker in the zone.
     */
    function getBrokerCommissionRate(
        bytes32 zone,
        address broker
    ) external view returns (Rate memory rate);

    /**
     *          Name            Description
     *  @param  zone            Zone code.
     *  @param  broker          Broker address.
     *  @return isBroker        Whether the broker is eligible in the zone.
     */
    function isActiveIn(
        bytes32 zone,
        address broker
    ) external view returns (bool isBroker);

    /**
     *          Name            Description
     *  @param  tokenId         Token identifier.
     *  @param  value           Value.
     *  @return receiver        Commission receiver address.
     *  @return commission      Commission derived from the value.
     */
    function commissionInfo(
        uint256 tokenId,
        uint256 value
    ) external view returns (
        address receiver,
        uint256 commission
    );


    /**
     *  @notice Register a broker in a zone.
     *
     *          Name            Description
     *  @param  zone            Zone code.
     *  @param  broker          Broker address.
     *  @param  commissionRate  Commission rate.
     *
     *  @dev    Permission: Managers in the zone.
     */
    function registerBroker(
        bytes32 zone,
        address broker,
        uint256 commissionRate
    ) external;

    /**
     *  @notice Activate or deactivate a broker in a zone.
     *
     *          Name            Description
     *  @param  zone            Zone code.
     *  @param  broker          Broker address.
     *  @param  isActive        Whether the operation is activating or deactivating.
     *
     *  @dev    Permission: Managers in the zone.
     */
    function activateBroker(
        bytes32 zone,
        address broker,
        bool isActive
    ) external;

    /**
     *  @notice Mint a commission token.
     *
     *          Name            Description
     *  @param  zone            Zone code.
     *  @param  broker          Broker address.
     *  @param  tokenId         Minted token identifier.
     */
    function mint(
        bytes32 zone,
        address broker,
        uint256 tokenId
    ) external;
}
