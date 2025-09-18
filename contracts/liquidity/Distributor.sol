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
 *  @notice The `Distributor` contract manages direct token distribution to multiple receivers through
 *          administrative operations, tracking the total amount distributed to each account.
 *
 *  @dev    The contract allows administrators to distribute primary tokens to multiple receivers
 *          in batch operations. Each distribution is tracked per receiver address, maintaining
 *          a cumulative record of all tokens distributed to each account over time.
 *  @dev    Distribution operations require administrative signatures and are subject to available
 *          token balance verification. The contract serves as a simple distribution mechanism
 *          without vesting or staking features.
 *  @dev    ERC-20 tokens are identified by their contract addresses.
 *          Native coin is represented by the zero address (0x0000000000000000000000000000000000000000).
 */
contract Distributor is
DistributorStorage,
ReentrancyGuardUpgradeable {
    /** ===== LIBRARY ===== **/
    using CurrencyHandler for uint256;


    /** ===== CONSTANT ===== **/
    string constant private VERSION = "v1.2.1";


    /** ===== FUNCTION ===== **/
    /* --- Standard --- */
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
     *  @notice Invoked for initialization after deployment, serving as the contract constructor.
     *
     *          Name            Description
     *  @param  _admin          Admin contract address.
     *  @param  _primaryToken   Primary token contract address.
     *  @param  _treasury       Treasury contract address.
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
     *  @param  _amounts        Array of distributed amount, respectively to each receiver.
     *  @param  _note           Note or description for the distribution operation.
     *  @param  _signatures     Array of admin signatures.
     *
     *  @dev    Administrative operator.
     *  @dev    Each distribution is tracked per receiver address, maintaining a cumulative record
     *          of all tokens distributed to each account over time. Distribution operations are
     *          subject to available token balance verification.
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

            CurrencyHandler.sendERC20(primaryTokenAddress, _receivers[i], _amounts[i]);

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
