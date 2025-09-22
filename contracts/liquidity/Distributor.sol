// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

/// @openzeppelin/contracts-upgradeable/
import {IERC20Upgradeable} from "@openzeppelin/contracts-upgradeable/interfaces/IERC20Upgradeable.sol";
import {ReentrancyGuardUpgradeable} from "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";

/// contracts/common/interfaces/
import {IAdmin} from "../common/interfaces/IAdmin.sol";

/// contracts/common/utilities/
import {CurrencyHandler} from "../common/utilities/CurrencyHandler.sol";

/// contracts/liquidity/storages/
import {DistributorStorage} from "../liquidity/storages/DistributorStorage.sol";

/**
 *  @author Briky Team
 *
 *  @notice The `Distributor` contract facilitates direct distributions of `PrimaryToken`.
 */
contract Distributor is
DistributorStorage,
ReentrancyGuardUpgradeable {
    /** ===== LIBRARY ===== **/
    using CurrencyHandler for uint256;


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
     *  @param  _primaryToken   `PrimaryToken` contract address.
     *  @param  _treasury       `Treasury` contract address.
     */
    function initialize(
        address _admin,
        address _primaryToken,
        address _treasury
    ) external
    initializer {
        /// Initializer
        __ReentrancyGuard_init();

        /// Dependency
        admin = _admin;
        primaryToken = _primaryToken;
        treasury = _treasury;
    }


    /* --- Command --- */
    /**
     *  @notice Distribute tokens to multiple receivers through administrative operations.
     *
     *          Name            Description
     *  @param  _receivers      Array of receiver addresses.
     *  @param  _amounts        Array of distributed amounts, respective to each receiver address.
     *  @param  _note           Distribution note.
     *  @param  _signatures     Array of admin signatures.
     *
     *  @dev    Administrative operator.
     */
    function distributeToken(
        address[] calldata _receivers,
        uint256[] calldata _amounts,
        string calldata _note,
        bytes[] calldata _signatures
    ) external
    nonReentrant {
        IAdmin(admin).verifyAdminSignatures(
            abi.encode(
                address(this),
                "distributeToken",
                _receivers,
                _amounts,
                _note
            ),
            _signatures
        );
        if (_receivers.length != _amounts.length) {
            revert InvalidInput();
        }

        address primaryTokenAddress = primaryToken;
        for (uint256 i; i < _receivers.length; ++i) {
            if (_amounts[i] > IERC20Upgradeable(primaryTokenAddress).balanceOf(address(this))) {
                revert InsufficientFunds();
            }

            CurrencyHandler.sendERC20(
                primaryTokenAddress,
                _receivers[i],
                _amounts[i]
            );

            unchecked {
                distributedTokens[_receivers[i]] += _amounts[i];
            }

            emit TokenDistribution(
                _receivers[i],
                _amounts[i]
            );
        }
    }
}
