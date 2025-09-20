// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

/// @openzeppelin/contracts-upgradeable/
import {ReentrancyGuardUpgradeable} from "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";

/// contracts/common/utilities/
import {CurrencyHandler} from "./utilities/CurrencyHandler.sol";

/// contracts/common/interfaces/
import {IAdmin} from "./interfaces/IAdmin.sol";

/// contracts/common/storages/
import {FeeReceiverStorage} from "./storages/FeeReceiverStorage.sol";

/**
 *  @author Briky Team
 *
 *  @notice The `FeeReceiver` contract passively receives and holds fee from operators within the system until being withdrawn
 *          on demands of admins.
 * 
 *  @dev    ERC-20 tokens are identified by their contract addresses.
 *          Native coin is represented by the zero address (0x0000000000000000000000000000000000000000).
 */
contract FeeReceiver is
FeeReceiverStorage,
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
     *          Name    Description
     *  @param  _admin  `Admin` contract address.
     */
    function initialize(
        address _admin
    ) external
    initializer {
        /// Initializer
        __ReentrancyGuard_init();

        /// Dependency
        admin = _admin;
    }


    /* --- Administration --- */
    /**
     *  @notice Withdraw sufficient amounts in multiple cryptocurrencies from this contract to an account.
     *
     *          Name            Description
     *  @param  _receiver       Receiver address.
     *  @param  _currencies     Array of withdrawn currency addresses.
     *  @param  _values         Array of withdrawn values, respective to each currency.
     *  @param  _signatures     Array of admin signatures.
     * 
     *  @dev    Administrative operator.
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

            emit Withdrawal(
                _receiver,
                _currencies[i],
                _values[i]
            );
        }
    }
}
